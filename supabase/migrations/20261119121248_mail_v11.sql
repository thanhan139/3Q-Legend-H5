-- V1.1 stores broadcast content once and materializes recipient state on interaction.
alter table public.mail_messages add column sender_uid uuid references public.profiles(uid) on delete set null,
  add column target_uid uuid references public.profiles(uid) on delete set null,
  add column send_request uuid, add column reply_to uuid references public.mail_messages(id),
  add column sender_hidden_at timestamptz, add column broadcast boolean not null default false,
  add column source_key text unique,
  add constraint mail_player_request unique(sender_uid,send_request);
alter table public.mail_messages drop constraint mail_messages_category_check,
  add check (category in ('admin','system','event','personal')),
  drop constraint mail_messages_rewards_check;

create function public.mail_reward_payload_valid(p_rewards jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select case when jsonb_typeof(p_rewards) = 'object' then
    not exists(select 1 from jsonb_each(p_rewards) a
      where key not in ('copper','coins','golden_key','jewelry_essence','enhancement_stone','forge_shard','hero_exp')
        or jsonb_typeof(value) <> 'number' or value::text !~ '^[1-9][0-9]{0,8}$'
        or case when value::text ~ '^[1-9][0-9]{0,8}$' then case key when 'golden_key' then value::text::numeric > 99999
          when 'jewelry_essence' then value::text::numeric > 999999 else false end else false end)
    else false end;
$$;
alter table public.mail_messages add check (public.mail_reward_payload_valid(rewards)),
  add check (sender_uid is null or (category='personal' and rewards='{}'::jsonb and send_request is not null)),
  add check (not broadcast or category in ('admin','system'));
create index mail_broadcast_published on public.mail_messages(created_at desc) where broadcast;
create index mail_sent_by_uid on public.mail_messages(sender_uid,created_at desc) where sender_uid is not null;
create index mail_character_name on public.player_saves(lower(state->>'playerName'));

create table public.mail_blocks (
  owner_uid uuid not null references public.profiles(uid) on delete cascade,
  blocked_uid uuid not null references public.profiles(uid) on delete cascade,
  created_at timestamptz not null default now(), primary key(owner_uid,blocked_uid), check(owner_uid<>blocked_uid)
);
create table public.mail_reports (
  reporter_uid uuid not null references public.profiles(uid) on delete cascade,
  mail_id uuid not null references public.mail_messages(id),
  reason text not null check(reason in ('harassment','spam','impersonation','other')),
  created_at timestamptz not null default now(), primary key(reporter_uid,mail_id)
);
create table public.mail_roles (
  uid uuid not null references public.profiles(uid) on delete cascade,
  role text not null check(role in ('author','approver')), primary key(uid,role)
);
create table public.mail_admin_drafts (
  id uuid primary key default gen_random_uuid(), author_uid uuid not null references public.profiles(uid),
  request_id uuid not null, payload jsonb not null, created_at timestamptz not null default now(),
  approver_uid uuid references public.profiles(uid), approved_at timestamptz,
  mail_id uuid references public.mail_messages(id), unique(author_uid,request_id)
);
alter table public.mail_blocks enable row level security;
alter table public.mail_reports enable row level security;
alter table public.mail_roles enable row level security;
alter table public.mail_admin_drafts enable row level security;
create policy mail_own_inbox on public.mail_inbox for select to authenticated using ((select auth.uid())=uid);
create policy mail_own_blocks on public.mail_blocks for select to authenticated using ((select auth.uid())=owner_uid);
create policy mail_own_reports on public.mail_reports for select to authenticated using ((select auth.uid())=reporter_uid);
revoke all on public.mail_blocks,public.mail_reports,public.mail_roles,public.mail_admin_drafts from public,anon,authenticated;
grant select,insert on public.mail_blocks,public.mail_reports to service_role;
grant select on public.mail_roles to service_role;
grant select,insert,update on public.mail_admin_drafts to service_role;
grant update(sender_hidden_at) on public.mail_messages to service_role;

-- Fail closed on markup, links used in messages, control characters and bidi overrides.
create function public.mail_plain_text(p_text text,p_limit integer) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select coalesce(char_length(btrim(p_text)) between 1 and p_limit
    and p_text !~ '[<>]' and p_text !~* '(https?://|javascript:|data:text/html|www\.)'
    and regexp_replace(p_text,E'[\\n\\r\\t]','','g') !~ '[[:cntrl:]]'
    and p_text !~ U&'[\202A-\202E\2066-\2069]',false);
$$;

create function public.mail_incoming(p_uid uuid,p_at timestamptz)
returns table(mail_id uuid,read_at timestamptz,claimed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select m.id,i.read_at,i.claimed_at from public.mail_inbox i join public.mail_messages m on m.id=i.mail_id
    where i.uid=p_uid and i.deleted_at is null and not m.broadcast and m.created_at<=p_at
  union all
  select m.id,i.read_at,i.claimed_at from public.profiles p join public.mail_messages m
    on m.broadcast and m.created_at between p.created_at and p_at
    left join public.mail_inbox i on i.uid=p_uid and i.mail_id=m.id
    where p.uid=p_uid and i.deleted_at is null;
$$;

create function public.mail_publish(p_category text,p_payload jsonb,p_source text default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  recipients uuid[]; target uuid; message_id uuid;
  all_server boolean := coalesce(p_payload->'broadcast'='true'::jsonb,false);
  send_at timestamptz := greatest((p_payload->>'sendAt')::timestamptz,statement_timestamp());
  expiry timestamptz := (p_payload->>'expiresAt')::timestamptz;
begin
  if p_category not in ('admin','system') or not public.mail_plain_text(p_payload->>'subject',140)
    or not public.mail_plain_text(p_payload->>'body',2400)
    or not public.mail_reward_payload_valid(coalesce(p_payload->'rewards','{}'))
    or (expiry is not null and expiry<=send_at) then return '{"status":"invalid"}'; end if;
  select coalesce(array_agg(distinct value::uuid order by value::uuid),'{}') into recipients
    from jsonb_array_elements_text(coalesce(p_payload->'recipients','[]'));
  if (all_server and cardinality(recipients)>0) or (not all_server and cardinality(recipients) not between 1 and 100)
    or (select count(*) from public.profiles where uid=any(recipients))<>cardinality(recipients)
    then return '{"status":"invalid"}'; end if;
  insert into public.mail_messages(category,sender,subject,body,created_at,expires_at,rewards,broadcast,source_key)
  values(p_category,case p_category when 'admin' then 'Ban Quản Trị' else 'Hệ Thống' end,
    btrim(p_payload->>'subject'),btrim(p_payload->>'body'),send_at,expiry,coalesce(p_payload->'rewards','{}'),all_server,p_source)
  on conflict(source_key) do nothing returning id into message_id;
  if message_id is null then
    select id into message_id from public.mail_messages where source_key=p_source;
    return jsonb_build_object('status','ok','mailId',message_id,'replayed',true);
  end if;
  -- Official delivery bypasses the player inbox cap. Each UID/message is unique.
  foreach target in array recipients loop insert into public.mail_inbox(uid,mail_id) values(target,message_id); end loop;
  return jsonb_build_object('status','ok','mailId',message_id);
end;
$$;

create function public.mail_player(p_uid uuid,p_action text,p_args jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  moment timestamptz := clock_timestamp();
  message_id uuid := (p_args->>'mailId')::uuid;
  target uuid := (p_args->>'recipient')::uuid;
  retry_id uuid := (p_args->>'requestId')::uuid;
  reply_id uuid := (p_args->>'replyTo')::uuid;
  q text := btrim(p_args->>'query');
  subject_text text := btrim(p_args->>'subject');
  body_text text := btrim(p_args->>'body');
  original public.mail_messages;
  sender_name text;
  last_send timestamptz;
  today_count integer;
  delivered uuid;
  result jsonb;
begin
  if p_action='search' then
    if q is null or char_length(q) not between 2 and 36 then return '{"status":"invalid"}'; end if;
    select coalesce(jsonb_agg(to_jsonb(matched)),'[]') into result from (
      select uid,coalesce(nullif(state->>'playerName',''),'Chúa Công') as name from public.player_saves
      where uid<>p_uid and (uid=case when q~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then q::uuid else null end
        or lower(state->>'playerName')=lower(q)) order by uid limit 10
    ) matched;
    return jsonb_build_object('status','ok','players',result);
  end if;

  if p_action in ('block','report') then
    select m.* into original from public.mail_incoming(p_uid,moment) i join public.mail_messages m on m.id=i.mail_id
    where i.mail_id=message_id and m.sender_uid is not null and m.sender_uid<>p_uid;
    if not found then return '{"status":"unavailable"}'; end if;
    if p_action='block' then
      perform 1 from public.profiles where uid=p_uid for update;
      insert into public.mail_blocks(owner_uid,blocked_uid) values(p_uid,original.sender_uid) on conflict do nothing;
    else
      if p_args->>'reason' not in ('harassment','spam','impersonation','other') or p_args->>'reason' is null then return '{"status":"invalid"}'; end if;
      insert into public.mail_reports(reporter_uid,mail_id,reason) values(p_uid,message_id,p_args->>'reason') on conflict do nothing;
    end if;
    return '{"status":"ok"}';
  end if;

  if p_action<>'send' or target is null or retry_id is null or target=p_uid
    or not public.mail_plain_text(subject_text,140) or not public.mail_plain_text(body_text,500) then return '{"status":"invalid"}'; end if;
  perform pg_advisory_xact_lock(hashtextextended('mail-player-send:'||p_uid,0));
  select * into original from public.mail_messages where sender_uid=p_uid and send_request=retry_id;
  if found then
    if original.target_uid is distinct from target or original.subject<>subject_text or original.body<>body_text
      or original.reply_to is distinct from reply_id then return '{"status":"reused"}'; end if;
    return jsonb_build_object('status','ok','mailId',original.id);
  end if;
  if reply_id is not null and not exists (
    select 1 from public.mail_messages m where m.id=reply_id and ((m.sender_uid=target and exists(
      select 1 from public.mail_incoming(p_uid,moment) i where i.mail_id=m.id)) or
      (m.sender_uid=p_uid and m.target_uid=target and m.sender_hidden_at is null))
  ) then return '{"status":"unavailable"}'; end if;
  select max(created_at),count(*) filter(where (created_at at time zone 'Asia/Ho_Chi_Minh')::date=(moment at time zone 'Asia/Ho_Chi_Minh')::date)
    into last_send,today_count from public.mail_messages where sender_uid=p_uid and created_at>=moment-interval '24 hours';
  if today_count>=10 or last_send > moment-interval '20 seconds' then return '{"status":"rateLimit"}'; end if;
  select coalesce(nullif(left(state->>'playerName',60),''),'Chúa Công') into sender_name from public.player_saves where uid=p_uid;
  if not found then return '{"status":"unavailable"}'; end if;
  perform 1 from public.profiles where uid=target for update;
  if not found or exists(select 1 from public.mail_blocks where owner_uid=target and blocked_uid=p_uid) then return '{"status":"unavailable"}'; end if;
  if (select count(*) from public.mail_inbox i join public.mail_messages m on m.id=i.mail_id
      where i.uid=target and i.deleted_at is null and not m.broadcast and m.sender_uid is not null)>=50
      then return '{"status":"unavailable"}'; end if;
  insert into public.mail_messages(category,sender,sender_uid,target_uid,send_request,subject,body,reply_to,created_at)
    values('personal',sender_name,p_uid,target,retry_id,subject_text,body_text,reply_id,moment) returning id into delivered;
  insert into public.mail_inbox(uid,mail_id) values(target,delivered);
  return jsonb_build_object('status','ok','mailId',delivered);
end;
$$;

create function public.mail_publish_system(p_workflow text,p_event_id text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare existing uuid;
begin
  if p_workflow is null or p_workflow not in ('maintenance','release','eventStart','eventEnd','arenaSettlement','compensation','workflow')
    or p_event_id is null or p_event_id !~ '^[a-zA-Z0-9:_-]{1,128}$' then return '{"status":"invalid"}'; end if;
  if p_workflow='arenaSettlement' and coalesce(p_payload->'rewards','{}')<>'{}' then return '{"status":"invalid"}'; end if;
  select id into existing from public.mail_messages where source_key='system:'||p_workflow||':'||p_event_id;
  if found then return jsonb_build_object('status','ok','mailId',existing,'replayed',true); end if;
  return public.mail_publish('system',p_payload,'system:'||p_workflow||':'||p_event_id);
end;
$$;

create function public.mail_notify_arena_settlement(p_uid uuid,p_season integer) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare settled_gold integer;
begin
  select gold into settled_gold from public.arena_claims where uid=p_uid and season=p_season;
  if not found then return '{"status":"unavailable"}'; end if;
  return public.mail_publish_system('arenaSettlement',p_season||':'||p_uid,jsonb_build_object(
    'recipients',jsonb_build_array(p_uid),'broadcast',false,'subject','Thưởng mùa Đấu Trường',
    'body',format('Thưởng mùa %s đã được cộng vào ví: %s Vàng.',p_season,settled_gold),'rewards','{}'::jsonb));
end;
$$;

create function public.mail_admin(p_uid uuid,p_action text,p_args jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  author boolean := exists(select 1 from public.mail_roles where uid=p_uid and role='author');
  approver boolean := exists(select 1 from public.mail_roles where uid=p_uid and role='approver');
  draft public.mail_admin_drafts;
  result jsonb;
begin
  if p_action='adminAccess' then return jsonb_build_object('status','ok','author',author,'approver',approver); end if;
  if not (author or approver) then return '{"status":"forbidden"}'; end if;
  if p_action='adminHistory' then
    return jsonb_build_object('status','ok','drafts',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc)
      from (select * from public.mail_admin_drafts where approver or author_uid=p_uid order by created_at desc limit 50) d),'[]'));
  end if;
  if p_action='adminDraft' and author then
    if not public.mail_plain_text(p_args->'draft'->>'subject',140) or not public.mail_plain_text(p_args->'draft'->>'body',2400)
      or not public.mail_reward_payload_valid(coalesce(p_args->'draft'->'rewards','{}')) then return '{"status":"invalid"}'; end if;
    insert into public.mail_admin_drafts(author_uid,request_id,payload) values(p_uid,(p_args->>'requestId')::uuid,p_args->'draft')
      on conflict(author_uid,request_id) do nothing returning * into draft;
    if not found then
      select * into draft from public.mail_admin_drafts where author_uid=p_uid and request_id=(p_args->>'requestId')::uuid;
      if draft.payload<>p_args->'draft' then return '{"status":"reused"}'; end if;
    end if;
    return jsonb_build_object('status','ok','draftId',draft.id);
  end if;
  if p_action='adminApprove' and approver then
    select * into draft from public.mail_admin_drafts where id=(p_args->>'draftId')::uuid for update;
    if not found or draft.author_uid=p_uid then return '{"status":"forbidden"}'; end if;
    if draft.mail_id is not null then return jsonb_build_object('status','ok','mailId',draft.mail_id,'replayed',true); end if;
    result:=public.mail_publish('admin',draft.payload,'admin:'||draft.id);
    if result->>'status'='ok' then
      update public.mail_admin_drafts set approver_uid=p_uid,approved_at=clock_timestamp(),mail_id=(result->>'mailId')::uuid where id=draft.id;
    end if;
    return result;
  end if;
  return '{"status":"forbidden"}';
end;
$$;

create or replace function public.mail_command(p_uid uuid,p_action text,p_args jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  moment timestamptz:=clock_timestamp();
  mail_id_arg uuid:=(p_args->>'mailId')::uuid;
  request_arg uuid:=(p_args->>'requestId')::uuid;
  category_arg text:=coalesce(p_args->>'category','all');
  page_arg int:=coalesce((p_args->>'page')::int,0);
  save_row public.player_saves; state_after jsonb; previous public.economy_ledger;
  command jsonb; receipt jsonb; committed jsonb; selected uuid[]; grant_item record;
  state_path text[]; balance numeric; affected integer; listing jsonb;
begin
  if p_action in ('adminAccess','adminHistory','adminDraft','adminApprove') then return public.mail_admin(p_uid,p_action,p_args); end if;
  if p_action in ('search','send','report','block') then return public.mail_player(p_uid,p_action,p_args); end if;
  if p_action='list' then
    if category_arg not in ('all','admin','system','event','personal','sent') or page_arg not between 0 and 10000
      then return '{"status":"invalid"}'; end if;
    with inbox as materialized (
      select m.id,m.sender,case when m.category='event' and category_arg<>'event' then 'system' else m.category end category,
        m.subject,m.body,m.created_at,m.expires_at,m.rewards,i.read_at,i.claimed_at,
        coalesce(m.expires_at<=moment,false) expired, m.sender_uid peer_uid,
        (m.category in ('admin','system','event') and m.sender_uid is null) verified, false outgoing
      from public.mail_incoming(p_uid,moment) i join public.mail_messages m on m.id=i.mail_id
    ), filtered as (
      select * from inbox where category_arg<>'sent' and (category_arg='all' or category=category_arg)
      union all
      select m.id,coalesce(ps.state->>'playerName','Tài khoản đã rời game'),m.category,m.subject,m.body,m.created_at,m.expires_at,
        '{}'::jsonb,null::timestamptz,null::timestamptz,false,m.target_uid,false,true
      from public.mail_messages m left join public.player_saves ps on ps.uid=m.target_uid
      where category_arg='sent' and m.sender_uid=p_uid and m.sender_hidden_at is null
    ), page as (select * from filtered order by created_at desc,id desc limit 12 offset page_arg*12)
    select jsonb_build_object('status','ok','total',(select count(*) from inbox),'filtered',(select count(*) from filtered),
      'unread',jsonb_build_object('all',count(*) filter(where read_at is null),
        'admin',count(*) filter(where read_at is null and category='admin'),
        'system',count(*) filter(where read_at is null and (category='system' or (category='event' and category_arg<>'event'))),
        'event',count(*) filter(where read_at is null and category='event'),
        'personal',count(*) filter(where read_at is null and category='personal'),'sent',0),
      'claimable',count(*) filter(where claimed_at is null and not expired and rewards<>'{}'),
      'deletable',count(*) filter(where read_at is not null and (claimed_at is not null or rewards='{}')),
      'rows',(select coalesce(jsonb_agg(to_jsonb(page) order by created_at desc,id desc),'[]') from page))
      into listing from inbox;
    return listing;
  end if;

  if p_action='read' then
    insert into public.mail_inbox(uid,mail_id,read_at)
      select p_uid,i.mail_id,moment from public.mail_incoming(p_uid,moment) i where i.mail_id=mail_id_arg
      on conflict(uid,mail_id) do update set read_at=coalesce(public.mail_inbox.read_at,excluded.read_at)
      where public.mail_inbox.deleted_at is null;
    if not found then return '{"status":"missing"}'; end if;
    return '{"status":"ok"}';
  end if;

  if p_action in ('deleteRead','delete') then
    perform 1 from public.player_saves where uid=p_uid for update;
    if not found then return '{"status":"missing"}'; end if;
    if p_action='delete' and p_args->'sent'='true' then
      update public.mail_messages set sender_hidden_at=coalesce(sender_hidden_at,moment) where id=mail_id_arg and sender_uid=p_uid;
    else
      insert into public.mail_inbox(uid,mail_id,deleted_at) select p_uid,i.mail_id,moment
      from public.mail_incoming(p_uid,moment) i join public.mail_messages m on m.id=i.mail_id
      where (p_action='deleteRead' and i.read_at is not null or p_action='delete' and i.mail_id=mail_id_arg)
        and (i.claimed_at is not null or m.rewards='{}')
      on conflict(uid,mail_id) do update set deleted_at=coalesce(public.mail_inbox.deleted_at,excluded.deleted_at);
    end if;
    get diagnostics affected=row_count;
    return jsonb_build_object('status','ok','deleted',affected);
  end if;

  if p_action not in ('claim','claimAll') or request_arg is null or (p_action='claim' and mail_id_arg is null)
    then return '{"status":"invalid"}'; end if;
  -- Claims and deletion share the UID save lock with all wallet transactions.
  select * into save_row from public.player_saves where uid=p_uid for update;
  if not found then return '{"status":"missing"}'; end if;
  command:=jsonb_strip_nulls(jsonb_build_object('type','mailClaim','action',p_action,'mailId',mail_id_arg));
  select * into previous from public.economy_ledger where uid=p_uid and request_id=request_arg;
  if found then
    if previous.command<>command then return '{"status":"reused"}'; end if;
    return jsonb_build_object('status','ok','receipt',previous.receipt);
  end if;
  moment:=clock_timestamp();
  select coalesce(array_agg(i.mail_id order by i.mail_id),'{}') into selected
  from public.mail_incoming(p_uid,moment) i join public.mail_messages m on m.id=i.mail_id
  where i.claimed_at is null and m.rewards<>'{}' and (m.expires_at is null or m.expires_at>moment)
    and (p_action='claimAll' or i.mail_id=mail_id_arg);
  if cardinality(selected)=0 then return '{"status":"unavailable"}'; end if;
  state_after:=save_row.state;
  receipt:=jsonb_build_object('kind','mailClaim','mailIds',selected,'rewards','{}'::jsonb);
  for grant_item in select x.key,sum(x.value::bigint) quantity from public.mail_messages m
    cross join lateral jsonb_each_text(m.rewards) x where m.id=any(selected) group by x.key loop
    state_path:=case grant_item.key when 'golden_key' then array['goldKeys'] when 'jewelry_essence' then array['jewelryEssence']
      when 'hero_exp' then array['trainingExp'] when 'enhancement_stone' then array['forge','stones']
      when 'forge_shard' then array['forge','shards'] else array[grant_item.key] end;
    if cardinality(state_path)=2 and not(state_after?'forge') then
      state_after:=jsonb_set(state_after,'{forge}',jsonb_build_object('stones',0,'shards',
        (case when state_after->'clearedStages' ? '2-5' then 15 else 0 end)+
        (case when state_after->'clearedStages' ? '3-5' then 20 else 0 end),
        'premiumClaimed',false,'crafted',0,'rewardedBattles','[]'::jsonb));
    end if;
    balance:=coalesce((state_after#>>state_path)::numeric,0)+grant_item.quantity;
    if balance>9007199254740991 or balance<grant_item.quantity then return '{"status":"walletLimit"}'; end if;
    state_after:=jsonb_set(state_after,state_path,to_jsonb(balance::bigint));
    receipt:=jsonb_set(receipt,array['rewards',grant_item.key],to_jsonb(grant_item.quantity));
  end loop;
  committed:=public.game_commit(p_uid,request_arg,save_row.revision,command,state_after,receipt);
  if committed->>'status' is distinct from 'ok' then raise exception 'Mail claim commit failed'; end if;
  insert into public.mail_inbox(uid,mail_id,claimed_at) select p_uid,unnest(selected),moment
    on conflict(uid,mail_id) do update set claimed_at=excluded.claimed_at;
  return jsonb_build_object('status','ok','receipt',receipt);
end;
$$;

revoke all on function public.mail_plain_text(text,integer),public.mail_reward_payload_valid(jsonb),
  public.mail_incoming(uuid,timestamptz),public.mail_publish(text,jsonb,text),public.mail_publish_system(text,text,jsonb),
  public.mail_notify_arena_settlement(uuid,integer),public.mail_player(uuid,text,jsonb),public.mail_admin(uuid,text,jsonb),
  public.mail_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.mail_plain_text(text,integer),public.mail_reward_payload_valid(jsonb),
  public.mail_incoming(uuid,timestamptz),public.mail_publish(text,jsonb,text),public.mail_publish_system(text,text,jsonb),
  public.mail_notify_arena_settlement(uuid,integer),public.mail_player(uuid,text,jsonb),public.mail_admin(uuid,text,jsonb),
  public.mail_command(uuid,text,jsonb) to service_role;
