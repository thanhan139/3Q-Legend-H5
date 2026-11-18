begin;
do $$
<<qa>>
declare
  attacker uuid := gen_random_uuid();
  defender uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  season_id int := floor(extract(epoch from now())/2419200);
  initial jsonb := '{"schemaVersion":2,"playerName":"Jewelry QA","coins":1000,"gems":0,"goldKeys":0,"trainingExp":0}';
  receipt jsonb;
  args jsonb;
  replay jsonb := '[{"slot":0,"side":"player","accuracy":2},{"slot":0,"side":"enemy","dodge":3}]';
begin
  if has_function_privilege('authenticated', 'public.arena_settle_jewelry(uuid,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.arena_settle_jewelry(uuid,jsonb)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.arena_settle_jewelry(uuid,jsonb)', 'EXECUTE')
    then raise exception 'wrong settlement grants'; end if;
  insert into auth.users(id) values(attacker),(defender);
  perform public.game_create_save(attacker,initial);
  perform public.game_create_save(defender,initial);
  perform public.arena_command(attacker,'publish','{"revision":0,"power":100,"defense":{"formation":["liu-bei"]}}');
  perform public.arena_command(defender,'publish','{"revision":0,"power":101,"defense":{"formation":["guan-yu"]}}');
  receipt := public.game_commit(defender,gen_random_uuid(),0,'{"type":"jewelryEquip"}',
    initial || '{"jewelry":[{"uid":"5cd6bf25-bc64-4bad-bc00-3a2ed8d479b3","itemId":"ring_r_blue","heroId":"guan-yu","level":0}]}',
    'true');
  if receipt->>'status' <> 'ok' then raise exception 'Jewelry save update rejected: %', receipt; end if;
  args := jsonb_build_object('opponent',defender,'requestId',request_id,'season',season_id,
    'defenseRevision',0,'defenderSaveRevision',0,'attackRevision',0,'won',true,'replay',replay);
  if public.arena_settle_jewelry(attacker,args)->>'status' is distinct from 'changed'
    then raise exception 'stale defender save accepted'; end if;
  args := args || '{"defenderSaveRevision":1,"attackRevision":1}';
  if public.arena_settle_jewelry(attacker,args)->>'status' is distinct from 'changed'
    then raise exception 'stale attacker save accepted'; end if;
  args := args || '{"attackRevision":0}';
  receipt := public.arena_settle_jewelry(attacker,args);
  if receipt->>'points' is distinct from '1025' or receipt->'replay' is distinct from replay
    then raise exception 'settlement did not persist replay: %', receipt; end if;
  if public.arena_settle_jewelry(attacker,args || '{"defenderSaveRevision":0}') is distinct from receipt
    then raise exception 'retry changed replay or reward'; end if;
  if (select count(*) from public.arena_matches m where m.attacker = qa.attacker) <> 1
    then raise exception 'settlement ran twice'; end if;
end;
$$;
select 'arena jewelry snapshot checks passed' as result;
rollback;
