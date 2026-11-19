begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  req uuid := gen_random_uuid();
  command jsonb := '{"type":"jewelryEnhance","uid":"12345678-0000-4000-8000-000000000001","rulesVersion":3}';
  initial jsonb := '{"schemaVersion":2,"coins":5000,"copper":20000,"gems":0,"goldKeys":0,"trainingExp":0,"jewelryEssence":120,
    "jewelry":[{"uid":"12345678-0000-4000-8000-000000000001","itemId":"ring_ssr_dragon","level":49}]}';
  failed jsonb := initial || '{"copper":10100,"jewelryEssence":0,
    "jewelry":[{"uid":"12345678-0000-4000-8000-000000000001","itemId":"ring_ssr_dragon","level":47,"highestCheckpoint":40}]}';
  receipt jsonb := '{"kind":"jewelryEnhancement","uid":"12345678-0000-4000-8000-000000000001","success":false,
    "fromLevel":49,"toLevel":47,"targetLevel":50,"highestCheckpoint":40,"copperSpent":9900,"essenceSpent":120}';
  result jsonb;
begin
  insert into auth.users(id) values(a),(b);
  perform public.game_create_save(a,initial);
  perform public.game_create_save(b,initial);
  result := public.game_commit_online(a,req,0,command,failed,receipt,null);
  if result->>'status' is distinct from 'ok' or result->'receipt' is distinct from receipt
    or result->'save' is distinct from failed then raise exception 'failure was not committed'; end if;
  result := public.game_commit_online(a,req,0,command,initial,'null',null);
  if result->>'revision' is distinct from '1' or result->'receipt' is distinct from receipt
    or result->'save' is distinct from failed then raise exception 'retry changed outcome or charged twice'; end if;
  result := public.game_commit_online(a,gen_random_uuid(),0,command,initial,'null',null);
  if result->>'status' is distinct from 'conflict' then raise exception 'stale write accepted'; end if;
  result := public.game_commit_online(a,req,0,command || '{"uid":"different"}',initial,'null',null);
  if result->>'status' is distinct from 'reused' then raise exception 'request reused for a different item'; end if;
  if (select count(*) from public.economy_ledger where uid = a and delta->>'copper' = '-9900' and delta->>'coins' = '0') <> 1
    or (select revision from public.player_saves where uid = b) <> 0
    or public.game_load_online(b)->'state' is distinct from initial then raise exception 'receipt or UID isolation failed'; end if;
end;
$$;
select 'jewelry failed enhancement receipt checks passed' as result;
rollback;
