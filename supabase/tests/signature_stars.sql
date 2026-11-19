begin;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  req uuid := gen_random_uuid();
  command jsonb := '{"type":"signatureStar","uid":"forge:1","expectedNodes":24,"rulesVersion":1}';
  initial jsonb := '{"schemaVersion":2,"forge":{"shards":300,"crafted":1},"equipment":[
    {"uid":"forge:1","itemId":"azureMoon","level":3,"heroId":"guan-yu","signatureNodes":24}]}';
  final jsonb := jsonb_set(jsonb_set(initial,'{forge,shards}','0'),'{equipment,0,signatureNodes}','25');
  result jsonb;
begin
  if has_function_privilege('authenticated','public.game_commit_online(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb)','execute') then
    raise exception 'Client can commit state directly';
  end if;
  insert into auth.users(id) values (a),(b);
  perform public.game_create_save(a,initial);
  perform public.game_create_save(b,initial);
  result := public.game_commit_online(a,req,0,command,final,'true',null);
  if result->>'status' is distinct from 'ok' or result->'save' is distinct from final then
    raise exception 'Star and shard debit did not commit together';
  end if;
  result := public.game_commit_online(a,req,0,command,initial,'null',null);
  if result->>'revision' is distinct from '1' or result->'receipt' is distinct from 'true'::jsonb
    or result->'save' is distinct from final then raise exception 'Retry changed original receipt'; end if;
  result := public.game_commit_online(a,gen_random_uuid(),0,command,initial,'true',null);
  if result->>'status' is distinct from 'conflict' then raise exception 'Stale revision succeeded'; end if;
  result := public.game_commit_online(a,req,0,command || '{"uid":"forge:2"}',initial,'true',null);
  if result->>'status' is distinct from 'reused' then raise exception 'Changed payload reused a receipt'; end if;
  if (select count(*) from public.economy_ledger where uid=a and request_id=req)<>1
    or (select count(*) from public.economy_ledger where uid=b)<>0
    or public.game_load_online(b)->'state' is distinct from initial then
    raise exception 'UID isolation failed';
  end if;
end;
$$;

select 'signature star transaction checks passed' as result;
rollback;
