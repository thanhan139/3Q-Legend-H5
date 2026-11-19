-- Roll back every fixture UID, save and receipt.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  initial jsonb := '{"schemaVersion":2,"copper":20000,"coins":5000,"gems":100,"goldKeys":0,"trainingExp":0}';
  after_buy jsonb := initial || '{"coins":3000,"goldKeys":1,"shopPurchases":{"golden-key":{"period":"d:20000","bought":1}}}';
  command jsonb := '{"type":"shopBuy","offerId":"golden-key","quantity":1}';
  receipt jsonb := '{"kind":"shopPurchase","offerId":"golden-key","quantity":1,"total":2000,"currency":"coins","item":"golden_key","grant":1}';
  result jsonb;
begin
  insert into auth.users(id) values(a),(b);
  perform public.game_create_save(a,initial);
  perform public.game_create_save(b,initial);
  result := public.game_commit_online(a,request_id,0,command,after_buy,receipt,null);
  if result->>'status' is distinct from 'ok' or result->'save' is distinct from after_buy
    or result->'receipt' is distinct from receipt then raise exception 'purchase did not persist wallet, grant and counter'; end if;
  result := public.game_commit_online(a,request_id,0,command,initial,'null',null);
  if result->>'revision' is distinct from '1' or result->'receipt' is distinct from receipt
    or result->'save' is distinct from after_buy then raise exception 'retry mutated purchase'; end if;
  result := public.game_commit_online(a,request_id,0,command || '{"quantity":2}',initial,'null',null);
  if result->>'status' is distinct from 'reused' then raise exception 'payload changed on retry'; end if;
  result := public.game_commit_online(a,gen_random_uuid(),0,command,after_buy,receipt,null);
  if result->>'status' is distinct from 'conflict' then raise exception 'stale concurrent write accepted'; end if;
  if (select count(*) from public.economy_ledger where uid=a) <> 1
    or public.game_load_online(b)->'state' is distinct from initial then raise exception 'duplicate or cross-UID side effect'; end if;
  if not exists(select 1 from public.economy_ledger where uid=a and delta @> '{"coins":-2000,"gems":0,"copper":0}')
    then raise exception 'purchase must debit Gold only'; end if;
  if has_function_privilege('authenticated','public.game_commit_online(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb)','EXECUTE')
    then raise exception 'authenticated client can call privileged commit'; end if;
end;
$$;
select 'shop purchase atomic ledger checks passed' as result;
rollback;
