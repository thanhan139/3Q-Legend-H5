begin;

-- Sidecar metadata: SaveV2 and all balances remain unchanged.
create table public.player_tutorials (
  uid uuid primary key references public.player_saves(uid) on delete cascade,
  state jsonb not null check (
    jsonb_typeof(state) = 'object' and
    state ?& array['tutorialVersion','tutorialStep','tutorialCompleted','tutorialSkipped'] and
    jsonb_typeof(state->'tutorialVersion') = 'number' and
    jsonb_typeof(state->'tutorialStep') = 'string' and
    jsonb_typeof(state->'tutorialCompleted') = 'boolean' and
    jsonb_typeof(state->'tutorialSkipped') = 'boolean' and
    not (state @> '{"tutorialCompleted":true,"tutorialSkipped":true}')
  )
);
alter table public.player_tutorials enable row level security;
revoke all on public.player_tutorials from public, anon, authenticated;
grant select, insert, update on public.player_tutorials to service_role;

insert into public.player_tutorials(uid,state)
select uid, '{"tutorialVersion":0,"tutorialStep":"done","tutorialCompleted":true,"tutorialSkipped":false}'::jsonb
from public.player_saves;

-- One statement gives a consistent save/tutorial snapshot, including during PvP rewards.
create function public.game_load_online(p_uid uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object('state', s.state, 'revision', s.revision,
    'tutorial', coalesce(t.state,
      '{"tutorialVersion":0,"tutorialStep":"done","tutorialCompleted":true,"tutorialSkipped":false}'::jsonb))
  from public.player_saves s left join public.player_tutorials t using(uid) where s.uid = p_uid;
$$;

create function public.game_create_online(p_uid uuid, p_state jsonb, p_fingerprint text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare existed boolean; result jsonb; snapshot jsonb;
begin
  insert into public.profiles(uid) values(p_uid) on conflict do nothing;
  perform 1 from public.profiles where uid=p_uid for update;
  existed := exists(select 1 from public.player_saves where uid=p_uid);
  result := public.game_create_save(p_uid,p_state,p_fingerprint);
  if result->>'status' <> 'ok' then return result; end if;
  insert into public.player_tutorials(uid,state) values(p_uid,
    case when existed or p_fingerprint is not null then
      '{"tutorialVersion":0,"tutorialStep":"done","tutorialCompleted":true,"tutorialSkipped":false}'::jsonb
    else '{"tutorialVersion":1,"tutorialStep":"welcome","tutorialCompleted":false,"tutorialSkipped":false}'::jsonb end)
    on conflict do nothing;
  snapshot := public.game_load_online(p_uid);
  return jsonb_build_object('status','ok','save',snapshot->'state',
    'revision',snapshot->>'revision','tutorial',snapshot->'tutorial');
end;
$$;

-- Existing ledger and row lock protect both gameplay and tutorial in one transaction.
create function public.game_commit_online(p_uid uuid, p_request_id uuid, p_expected_revision bigint,
  p_command jsonb, p_state jsonb, p_receipt jsonb, p_tutorial jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare replayed boolean; result jsonb; snapshot jsonb;
begin
  perform 1 from public.player_saves where uid=p_uid for update;
  replayed := exists(select 1 from public.economy_ledger where uid=p_uid and request_id=p_request_id);
  result := public.game_commit(p_uid,p_request_id,p_expected_revision,p_command,p_state,p_receipt);
  if result->>'status' = 'ok' and not replayed and p_tutorial is not null then
    insert into public.player_tutorials(uid,state) values(p_uid,p_tutorial)
      on conflict(uid) do update set state=excluded.state;
  end if;
  snapshot := public.game_load_online(p_uid);
  return result || jsonb_build_object('tutorial',snapshot->'tutorial');
end;
$$;

revoke execute on function public.game_load_online(uuid) from public, anon, authenticated;
revoke execute on function public.game_create_online(uuid,jsonb,text) from public, anon, authenticated;
revoke execute on function public.game_commit_online(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.game_load_online(uuid) to service_role;
grant execute on function public.game_create_online(uuid,jsonb,text) to service_role;
grant execute on function public.game_commit_online(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
