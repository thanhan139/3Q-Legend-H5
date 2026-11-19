-- Emulates the three server-confirmed reward commits on isolated fixture accounts.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  arena_request uuid := gen_random_uuid();
  initial jsonb := '{"schemaVersion":2,"coins":5000,"gems":300}';
  campaign jsonb := initial || '{"coins":5200,"copper":2000,"clearedStages":["1-1"]}';
  mission jsonb := campaign || '{"coins":5450,"copper":3000}';
  ranked jsonb := mission || '{"copper":7000,"copperDaily":{"day":20776,"campaignReplays":0,"arenaClaimed":true}}';
  arena_command jsonb := '{"type":"arenaCopper","day":20776}';
  result jsonb;
begin
  insert into auth.users(id) values(a),(b);
  perform public.game_create_save(a,initial);
  perform public.game_create_save(b,initial);
  result := public.game_commit_online(a,gen_random_uuid(),0,'{"type":"battle"}',campaign,'{"winner":"player"}',null);
  if result->'save' is distinct from campaign then raise exception 'campaign commit failed'; end if;
  result := public.game_commit_online(a,gen_random_uuid(),1,'{"type":"daily","mission":"win"}',mission,'true',null);
  if result->'save' is distinct from mission then raise exception 'daily commit failed'; end if;
  result := public.game_commit_online(a,arena_request,2,arena_command,ranked,'{"copper":4000}',null);
  if result->'save' is distinct from ranked then raise exception 'ranked commit failed'; end if;
  result := public.game_commit_online(a,arena_request,2,arena_command,initial,'null',null);
  if result->'receipt' is distinct from '{"copper":4000}'::jsonb or result->'save' is distinct from ranked
    then raise exception 'ranked retry did not preserve the original receipt'; end if;
  result := public.game_commit_online(a,gen_random_uuid(),2,arena_command,ranked,'{"copper":4000}',null);
  if result->>'status' is distinct from 'conflict' then raise exception 'stale reward accepted'; end if;
  if public.game_load_online(b)->'state' is distinct from initial then raise exception 'wrong UID credited'; end if;
  if (select sum((delta->>'copper')::int) from public.economy_ledger where uid=a) <> 7000
    or (select sum((delta->>'gems')::int) from public.economy_ledger where uid=a) <> 0
    then raise exception 'incorrect ledger currency delta'; end if;
end;
$$;
select 'V1.4 reward ledger, retry, stale revision and UID isolation passed' as result;
rollback;
