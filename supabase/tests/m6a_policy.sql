begin;

insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

set local role service_role;
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
declare b uuid := '00000000-0000-4000-8000-000000000002';
declare command_id uuid := '00000000-0000-4000-8000-000000000011';
declare state jsonb := '{"schemaVersion":2,"coins":5000,"gems":300,"goldKeys":2,"trainingExp":0}';
declare next_state jsonb := jsonb_set(state, '{coins}', '5250');
declare result jsonb;
begin
  result := public.game_create_save(a, state, repeat('a', 64));
  if result->>'status' <> 'ok' then raise exception 'first import failed'; end if;
  result := public.game_create_save(b, state, repeat('a', 64));
  if result->>'status' <> 'used' then raise exception 'duplicate import accepted'; end if;
  result := public.game_create_save(a, next_state, repeat('b', 64));
  if result->>'status' <> 'exists' then raise exception 'existing save overwritten'; end if;
  perform public.game_create_save(b, state);
  result := public.game_commit(a, command_id, 0, '{"type":"checkIn"}', next_state, 'true');
  if result->>'revision' <> '1' then raise exception 'commit failed'; end if;
  result := public.game_commit(a, command_id, 0, '{"type":"checkIn"}', state, 'null');
  if result->>'status' <> 'ok' or result->>'revision' <> '1' or result->'save' <> next_state or
     result->'receipt' <> 'true'::jsonb then raise exception 'idempotent retry changed state or receipt'; end if;
  result := public.game_commit(a, command_id, 1, '{"type":"summon"}', state, 'null');
  if result->>'status' <> 'reused' then raise exception 'reused request ID accepted'; end if;
  result := public.game_commit(a, '00000000-0000-4000-8000-000000000012', 0, '{"type":"checkIn"}', state, 'true');
  if result->>'status' <> 'conflict' or result->'save' <> next_state then raise exception 'stale revision accepted'; end if;
  if (select delta->>'coins' from public.economy_ledger where uid = a) <> '250' then raise exception 'wrong wallet delta'; end if;
  begin
    perform public.game_commit(a, '00000000-0000-4000-8000-000000000013', 1, '{"type":"checkIn"}', next_state, null);
    raise exception 'bad receipt committed';
  exception when not_null_violation then null;
  end;
  if (select revision from public.player_saves where uid = a) <> 1 then raise exception 'rollback failed'; end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $$
begin
  if (select count(*) from public.profiles) <> 1 or
     (select count(*) from public.player_saves) <> 1 or
     (select count(*) from public.economy_ledger) <> 1 then
    raise exception 'owner isolation failed';
  end if;
  if exists (select 1 from public.player_saves where uid = '00000000-0000-4000-8000-000000000002') then
    raise exception 'read across accounts';
  end if;
  begin
    update public.player_saves set revision = 999;
    raise exception 'client write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.game_create_save('00000000-0000-4000-8000-000000000001', '{}');
    raise exception 'client can execute privileged function';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.game_commit('00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000011', 1, '{}', '{}', '{}');
    raise exception 'client can execute economic commit';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.player_saves) <> 1 or
     exists (select 1 from public.economy_ledger) then raise exception 'account B can view account A ledger'; end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.player_saves;
    raise exception 'unauthenticated read accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
