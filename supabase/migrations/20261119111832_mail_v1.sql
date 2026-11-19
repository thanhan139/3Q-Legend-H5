-- Authenticated players use mail-command. Only service_role publishes mail.
create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('system','event','personal')),
  sender text not null check (char_length(trim(sender)) between 1 and 60),
  subject text not null check (char_length(trim(subject)) between 1 and 140),
  body text not null check (char_length(trim(body)) between 1 and 2400),
  created_at timestamptz not null default now(),
  expires_at timestamptz check (expires_at > created_at),
  rewards jsonb not null default '{}' check (
    jsonb_typeof(rewards) = 'object' and rewards - array['copper','coins','golden_key','jewelry_essence'] = '{}'::jsonb
    and (not rewards ? 'copper' or (jsonb_typeof(rewards->'copper') = 'number' and (rewards->>'copper') ~ '^[1-9][0-9]{0,8}$'))
    and (not rewards ? 'coins' or (jsonb_typeof(rewards->'coins') = 'number' and (rewards->>'coins') ~ '^[1-9][0-9]{0,8}$'))
    and (not rewards ? 'golden_key' or (jsonb_typeof(rewards->'golden_key') = 'number' and (rewards->>'golden_key') ~ '^[1-9][0-9]{0,4}$'))
    and (not rewards ? 'jewelry_essence' or (jsonb_typeof(rewards->'jewelry_essence') = 'number' and (rewards->>'jewelry_essence') ~ '^[1-9][0-9]{0,5}$'))
  )
);
create table public.mail_inbox (
  uid uuid not null references public.profiles(uid) on delete cascade,
  mail_id uuid not null references public.mail_messages(id) on delete restrict,
  read_at timestamptz,
  claimed_at timestamptz,
  deleted_at timestamptz,
  primary key (uid, mail_id)
);
alter table public.mail_messages enable row level security;
alter table public.mail_inbox enable row level security;
revoke all on public.mail_messages, public.mail_inbox from public, anon, authenticated, service_role;
grant select, insert on public.mail_messages to service_role;
grant select, insert, update on public.mail_inbox to service_role;

create function public.mail_deliver(p_uid uuid, p_mail_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profiles where uid=p_uid for update;
  if not found then return false; end if;
  if exists(select 1 from public.mail_inbox where uid=p_uid and mail_id=p_mail_id) then return true; end if;
  if (select count(*) from public.mail_inbox where uid=p_uid and deleted_at is null) >= 50 then return false; end if;
  insert into public.mail_inbox(uid,mail_id) values(p_uid,p_mail_id);
  return true;
end;
$$;

create function public.mail_command(p_uid uuid, p_action text, p_args jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  moment timestamptz := statement_timestamp();
  mail_id_arg uuid := (p_args->>'mailId')::uuid;
  request_arg uuid := (p_args->>'requestId')::uuid;
  category_arg text := coalesce(p_args->>'category','all');
  page_arg int := coalesce((p_args->>'page')::int,0);
  save_row public.player_saves;
  state_after jsonb;
  previous public.economy_ledger;
  command jsonb;
  receipt jsonb;
  committed jsonb;
  selected uuid[];
  grant_item record;
  state_key text;
  balance numeric;
  affected integer;
  listing jsonb;
begin
  if p_action = 'list' then
    if category_arg not in ('all','system','event','personal') or page_arg not between 0 and 4 then
      return '{"status":"invalid"}';
    end if;
    with inbox as materialized (
      select m.*, i.read_at, i.claimed_at, (m.expires_at is not null and m.expires_at <= moment) as expired
      from public.mail_inbox i join public.mail_messages m on m.id=i.mail_id
      where i.uid=p_uid and i.deleted_at is null
    ), filtered as (select * from inbox where category_arg='all' or category=category_arg),
    page as (select * from filtered order by created_at desc,id desc limit 12 offset page_arg*12)
    select jsonb_build_object('status','ok','total',(select count(*) from inbox),
      'filtered',(select count(*) from filtered),'unread',jsonb_build_object(
        'all',count(*) filter(where read_at is null), 'system',count(*) filter(where read_at is null and category='system'),
        'event',count(*) filter(where read_at is null and category='event'), 'personal',count(*) filter(where read_at is null and category='personal')),
      'claimable',count(*) filter(where claimed_at is null and not expired and rewards <> '{}'::jsonb),
      'deletable',count(*) filter(where read_at is not null and (claimed_at is not null or rewards='{}'::jsonb)),
      'rows',(select coalesce(jsonb_agg(to_jsonb(page) order by created_at desc,id desc),'[]'::jsonb) from page))
      into listing from inbox;
    return listing;
  end if;

  if p_action = 'read' then
    update public.mail_inbox set read_at=coalesce(read_at,moment)
    where uid=p_uid and mail_id=mail_id_arg and deleted_at is null;
    if not found then return '{"status":"missing"}'; end if;
    return '{"status":"ok"}';
  end if;

  if p_action = 'deleteRead' then
    perform 1 from public.player_saves where uid=p_uid for update;
    if not found then return '{"status":"missing"}'; end if;
    update public.mail_inbox i set deleted_at=moment from public.mail_messages m
    where i.uid=p_uid and i.mail_id=m.id and i.deleted_at is null and i.read_at is not null
      and (i.claimed_at is not null or m.rewards='{}'::jsonb);
    get diagnostics affected = row_count;
    return jsonb_build_object('status','ok','deleted',affected);
  end if;

  if p_action not in ('claim','claimAll') or request_arg is null or (p_action='claim' and mail_id_arg is null) then
    return '{"status":"invalid"}';
  end if;
  -- Serialize mailbox settlements with all existing wallet mutations for this UID.
  select * into save_row from public.player_saves where uid=p_uid for update;
  if not found then return '{"status":"missing"}'; end if;
  command := jsonb_strip_nulls(jsonb_build_object('type','mailClaim','action',p_action,'mailId',mail_id_arg));
  select * into previous from public.economy_ledger where uid=p_uid and request_id=request_arg;
  if found then
    if previous.command <> command then return '{"status":"reused"}'; end if;
    return jsonb_build_object('status','ok','receipt',previous.receipt);
  end if;

  select coalesce(array_agg(candidate.mail_id order by candidate.mail_id),'{}'::uuid[]) into selected from (
    select i.mail_id from public.mail_inbox i join public.mail_messages m on m.id=i.mail_id
    where i.uid=p_uid and i.deleted_at is null and i.claimed_at is null and m.rewards <> '{}'::jsonb
      and (m.expires_at is null or m.expires_at > clock_timestamp()) and (p_action='claimAll' or i.mail_id=mail_id_arg)
    order by i.mail_id for update of i
  ) candidate;
  if cardinality(selected)=0 then return '{"status":"unavailable"}'; end if;
  state_after := save_row.state;
  receipt := jsonb_build_object('kind','mailClaim','mailIds',selected,'rewards','{}'::jsonb);
  for grant_item in select x.key, sum(x.value::bigint) as quantity
    from public.mail_messages m cross join lateral jsonb_each_text(m.rewards) x where m.id=any(selected) group by x.key
  loop
    state_key := case grant_item.key when 'golden_key' then 'goldKeys' when 'jewelry_essence' then 'jewelryEssence' else grant_item.key end;
    balance := coalesce((state_after->>state_key)::numeric,0) + grant_item.quantity;
    if balance > 9007199254740991 or balance < grant_item.quantity then return '{"status":"walletLimit"}'; end if;
    state_after := jsonb_set(state_after,array[state_key],to_jsonb(balance::bigint));
    receipt := jsonb_set(receipt,array['rewards',grant_item.key],to_jsonb(grant_item.quantity));
  end loop;
  committed := public.game_commit(p_uid,request_arg,save_row.revision,command,state_after,receipt);
  if committed->>'status' is distinct from 'ok' then raise exception 'Mail claim commit failed'; end if;
  update public.mail_inbox set claimed_at=clock_timestamp() where uid=p_uid and mail_id=any(selected);
  return jsonb_build_object('status','ok','receipt',receipt);
end;
$$;

revoke all on function public.mail_deliver(uuid,uuid), public.mail_command(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.mail_deliver(uuid,uuid), public.mail_command(uuid,text,jsonb) to service_role;
