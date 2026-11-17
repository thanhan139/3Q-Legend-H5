begin;

-- Private VIP accounting. No browser role can read other users, write payments or publish rewards.
create table public.vip_verified_payments (
  provider text not null check(length(provider) between 1 and 80),
  transaction_id text not null check(length(transaction_id) between 1 and 200),
  uid uuid not null references public.profiles(uid) on delete cascade,
  amount_vnd bigint not null check(amount_vnd > 0),
  base_knb bigint not null check(base_knb > 0 and base_knb <= 9007199254740991 / 10),
  bonus_knb bigint not null default 0 check(bonus_knb between 0 and 9007199254740991),
  status text not null check(status in ('paid','refunded')),
  verification_reference text not null check(length(verification_reference) between 1 and 300),
  verified_at timestamptz not null default now(),
  primary key(provider, transaction_id), check(amount_vnd = base_knb * 10)
);
create index vip_paid_uid on public.vip_verified_payments(uid) where status='paid';

create table public.vip_reward_catalog (
  kind text not null check(kind in ('level','daily','weekly')),
  tier integer not null check(tier between 0 and 18),
  rewards jsonb not null check(jsonb_typeof(rewards)='object' and rewards <> '{}'::jsonb),
  approved boolean not null default false,
  primary key(kind,tier)
);
-- Deliberately empty: JSON gift amounts/discounts are proposals, not approved live rewards.
create table public.vip_reward_claims (
  uid uuid not null references public.profiles(uid) on delete cascade,
  kind text not null check(kind in ('level','daily','weekly')),
  tier integer not null check(tier between 0 and 18), period text not null,
  request_id uuid not null, claimed_at timestamptz not null default now(),
  primary key(uid,kind,tier,period), unique(uid,request_id)
);
-- Upgrading midway through a day/week never allows a second periodic reward.
create unique index vip_one_periodic_gift on public.vip_reward_claims(uid,kind,period) where kind in ('daily','weekly');
alter table public.vip_verified_payments enable row level security;
alter table public.vip_reward_catalog enable row level security;
alter table public.vip_reward_claims enable row level security;
revoke all on public.vip_verified_payments,public.vip_reward_catalog,public.vip_reward_claims from public,anon,authenticated;
grant select,insert,update on public.vip_verified_payments,public.vip_reward_catalog,public.vip_reward_claims to service_role;

create function public.game_vip_level(p_total bigint) returns integer
language sql immutable security invoker set search_path='' as $$
 select coalesce(max(ordinality)-1,0)::integer from unnest(array[
  0,1000,10000,50000,150000,300000,500000,1000000,1500000,2000000,3000000,
  4000000,5500000,7000000,8500000,10000000,15000000,25000000,50000000]::bigint[])
  with ordinality as t(threshold,ordinality) where threshold <= p_total;
$$;
create function public.game_vip_period(p_kind text) returns text
language sql stable security invoker set search_path='' as $$
 select case p_kind when 'level' then 'once' when 'daily' then to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD')
  when 'weekly' then to_char(now() at time zone 'Asia/Ho_Chi_Minh','IYYY-"W"IW') end;
$$;
create function public.game_vip_snapshot(p_uid uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with total as (select coalesce(sum(base_knb),0)::bigint as paid from public.vip_verified_payments where uid=p_uid and status='paid')
 select jsonb_build_object('paidBaseKnbTotal',paid,'offers',coalesce((
  select jsonb_agg(jsonb_build_object('kind',r.kind,'tier',r.tier,'period',public.game_vip_period(r.kind),'rewards',r.rewards,
   'claimed',exists(select 1 from public.vip_reward_claims c where c.uid=p_uid and c.kind=r.kind
    and c.period=public.game_vip_period(r.kind) and (r.kind<>'level' or c.tier=r.tier))) order by r.tier,r.kind)
  from public.vip_reward_catalog r where r.approved and (r.kind='level' or r.tier=public.game_vip_level(paid))), '[]'::jsonb)) from total;
$$;

create or replace function public.game_load_online(p_uid uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('state',s.state,'revision',s.revision,'tutorial',coalesce(t.state,
  '{"tutorialVersion":0,"tutorialStep":"done","tutorialCompleted":true,"tutorialSkipped":false}'::jsonb),
  'vip',public.game_vip_snapshot(p_uid)) from public.player_saves s left join public.player_tutorials t using(uid) where s.uid=p_uid;
$$;
create or replace function public.game_commit_online(p_uid uuid,p_request_id uuid,p_expected_revision bigint,
 p_command jsonb,p_state jsonb,p_receipt jsonb,p_tutorial jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare replayed boolean; result jsonb; snapshot jsonb;
begin
 perform 1 from public.player_saves where uid=p_uid for update;
 replayed := exists(select 1 from public.economy_ledger where uid=p_uid and request_id=p_request_id);
 result := public.game_commit(p_uid,p_request_id,p_expected_revision,p_command,p_state,p_receipt);
 if result->>'status'='ok' and not replayed and p_tutorial is not null then
  insert into public.player_tutorials(uid,state) values(p_uid,p_tutorial) on conflict(uid) do update set state=excluded.state;
 end if;
 snapshot := public.game_load_online(p_uid);
 return result || jsonb_build_object('tutorial',snapshot->'tutorial','vip',snapshot->'vip');
end; $$;

-- Called ONLY by a trusted gateway adapter AFTER external signature/settlement verification.
-- No gateway or browser payment action is installed by this migration. This records VIP accounting,
-- not spendable currency fulfillment. Bonus KNB never contributes to paidBaseKnbTotal.
create function public.game_record_vip_payment(p_uid uuid,p_provider text,p_transaction_id text,p_amount_vnd bigint,
 p_base_knb bigint,p_bonus_knb bigint,p_status text,p_verification_reference text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old public.vip_verified_payments; changed boolean := false;
begin
 perform 1 from public.player_saves where uid=p_uid for update;
 if not found then raise exception 'missing player'; end if;
 if p_status is null or p_amount_vnd is null or p_base_knb is null or p_bonus_knb is null
  or p_status not in ('paid','refunded') or p_amount_vnd <= 0 or p_base_knb <= 0 or p_amount_vnd::numeric <> p_base_knb::numeric*10
  or p_bonus_knb < 0 or p_verification_reference is null or length(p_verification_reference) not between 1 and 300 then raise exception 'invalid verified payment'; end if;
 select * into old from public.vip_verified_payments where provider=p_provider and transaction_id=p_transaction_id for update;
 if not found then
  if p_status<>'paid' then raise exception 'unknown refund'; end if;
  insert into public.vip_verified_payments(provider,transaction_id,uid,amount_vnd,base_knb,bonus_knb,status,verification_reference)
   values(p_provider,p_transaction_id,p_uid,p_amount_vnd,p_base_knb,p_bonus_knb,p_status,p_verification_reference) on conflict do nothing;
  changed := found;
  select * into old from public.vip_verified_payments where provider=p_provider and transaction_id=p_transaction_id for update;
 end if;
 if old.uid is distinct from p_uid or old.base_knb is distinct from p_base_knb or old.amount_vnd is distinct from p_amount_vnd
  or old.bonus_knb is distinct from p_bonus_knb then raise exception 'transaction identity mismatch'; end if;
 if p_status='refunded' and old.status='paid' then
  update public.vip_verified_payments set status='refunded',verification_reference=p_verification_reference where provider=p_provider and transaction_id=p_transaction_id;
  changed := true;
 end if;
 -- Refunded transactions are terminal: replaying an older paid event cannot reinstate VIP.
 if (select coalesce(sum(base_knb),0) from public.vip_verified_payments where uid=p_uid and status='paid')>9007199254740991 then raise exception 'VIP total overflow'; end if;
 if changed then update public.player_saves set revision=revision+1,updated_at=now() where uid=p_uid; end if;
 return public.game_vip_snapshot(p_uid);
end; $$;

create function public.game_claim_vip(p_uid uuid,p_request_id uuid,p_expected_revision bigint,p_tier integer,p_kind text,p_period text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.player_saves; state jsonb; rewards jsonb; vip jsonb; level integer; command jsonb; result jsonb;
 k text; v jsonb; amount bigint; current_amount bigint; path text[];
begin
 select * into s from public.player_saves where uid=p_uid for update;
 if not found then return jsonb_build_object('status','missing'); end if;
 command := jsonb_build_object('type','vipClaim','tier',p_tier,'kind',p_kind,'period',p_period);
 if exists(select 1 from public.economy_ledger where uid=p_uid and request_id=p_request_id) then
  return public.game_commit_online(p_uid,p_request_id,p_expected_revision,command,s.state,null,null);
 end if;
 if s.revision<>p_expected_revision then
  return jsonb_build_object('status','conflict','save',s.state,'revision',s.revision::text) ||
   jsonb_build_object('tutorial',(public.game_load_online(p_uid))->'tutorial','vip',public.game_vip_snapshot(p_uid));
 end if;
 vip := public.game_vip_snapshot(p_uid); level := public.game_vip_level((vip->>'paidBaseKnbTotal')::bigint);
 if p_tier not between 0 and 18 or p_kind not in ('level','daily','weekly') or p_tier>level or p_period is distinct from public.game_vip_period(p_kind)
  or (p_kind<>'level' and p_tier<>level) then return jsonb_build_object('status','rejected'); end if;
 select r.rewards into rewards from public.vip_reward_catalog r where r.kind=p_kind and r.tier=p_tier and r.approved;
 if not found or exists(select 1 from public.vip_reward_claims where uid=p_uid and kind=p_kind and period=p_period
  and (p_kind<>'level' or tier=p_tier)) then return jsonb_build_object('status','rejected'); end if;
 state := s.state;
 for k,v in select * from jsonb_each(rewards) loop
  if jsonb_typeof(v)<>'number' or v::text !~ '^[0-9]+$' or v::numeric<=0 or v::numeric>9007199254740991 then return jsonb_build_object('status','rejected'); end if;
  amount := (v::text)::bigint;
  path := case k when 'golden_key' then array['goldKeys'] when 'hero_exp' then array['trainingExp']
   when 'legacy_gem' then array['gems'] when 'gold' then array['coins'] when 'copper' then array['copper']
   when 'enhancement_stone' then array['forge','stones'] when 'forge_shard' then array['forge','shards'] else null end;
  if path is null then return jsonb_build_object('status','rejected'); end if;
  if cardinality(path)=2 and not state ? 'forge' then return jsonb_build_object('status','rejected'); end if;
  current_amount := coalesce((state #>> path)::bigint,0);
  if current_amount::numeric+amount>9007199254740991 then return jsonb_build_object('status','rejected'); end if;
  state := jsonb_set(state,path,to_jsonb(current_amount+amount),true);
 end loop;
 result := public.game_commit_online(p_uid,p_request_id,p_expected_revision,command,state,jsonb_build_object('rewards',rewards),null);
 if result->>'status'='ok' then
  insert into public.vip_reward_claims(uid,kind,tier,period,request_id) values(p_uid,p_kind,p_tier,p_period,p_request_id);
 end if;
 return result || jsonb_build_object('vip',public.game_vip_snapshot(p_uid));
end; $$;

revoke execute on function public.game_vip_level(bigint),public.game_vip_period(text),public.game_vip_snapshot(uuid),
 public.game_record_vip_payment(uuid,text,text,bigint,bigint,bigint,text,text),public.game_claim_vip(uuid,uuid,bigint,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.game_vip_level(bigint),public.game_vip_period(text),public.game_vip_snapshot(uuid),
 public.game_record_vip_payment(uuid,text,text,bigint,bigint,bigint,text,text),public.game_claim_vip(uuid,uuid,bigint,integer,text,text) to service_role;
-- Existing online wrappers retain service-role-only grants. No SaveV2 backfill or player reset.
commit;
