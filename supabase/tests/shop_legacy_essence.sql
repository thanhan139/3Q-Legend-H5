-- Historical packet receipts straddle 00:00 Asia/Ho_Chi_Minh.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  day_start timestamptz := '2026-11-19 00:00:00+07';
  old_command jsonb := '{"type":"shopBuy","offerId":"jewelry-essence","quantity":1}';
  old_receipt jsonb := '{"kind":"shopPurchase","offerId":"jewelry-essence","quantity":1,"currency":"gems","item":"jewelry_essence","grant":20,"total":110}';
  initial jsonb := '{"schemaVersion":2,"coins":100000,"gems":500,"jewelryEssence":0}';
  purchased jsonb := initial || '{"coins":4100,"gems":170,"jewelryEssence":1019,"shopPurchases":{"jewelry-essence":{"period":"d:20000","bought":959}}}';
  next_command jsonb := old_command || '{"quantity":959}';
  next_receipt jsonb := old_receipt || '{"quantity":959,"currency":"coins","grant":959,"total":95900}';
  next_request uuid := gen_random_uuid();
  result jsonb;
begin
  insert into auth.users(id) values (a),(b);
  perform public.game_create_save(a,initial);
  perform public.game_create_save(b,initial);
  insert into public.economy_ledger(uid,request_id,revision,command,receipt,delta,created_at) values
    (a,gen_random_uuid(),1,old_command,old_receipt,'{}',day_start - interval '1 millisecond'),
    (a,gen_random_uuid(),2,old_command,old_receipt,'{}',day_start),
    (a,gen_random_uuid(),3,old_command,old_receipt,'{}',day_start + interval '12 hours'),
    (b,gen_random_uuid(),1,old_command,old_receipt,'{}',day_start + interval '1 hour');
  update public.player_saves set revision=3,
    state=initial || '{"gems":170,"jewelryEssence":60,"shopPurchases":{"jewelry-essence":{"period":"w:19999","bought":3}}}'
    where uid=a;
  result := public.game_commit_online(a,next_request,3,next_command,purchased,next_receipt,null);
  if result->>'status' is distinct from 'ok' or result->'save' is distinct from purchased then
    raise exception 'new purchase did not persist';
  end if;
  update public.economy_ledger set created_at=day_start + interval '23 hours' where uid=a and request_id=next_request;
  if public.game_legacy_shop_essence_units(a,day_start) <> 40
    or public.game_legacy_shop_essence_units(b,day_start) <> 20
    or public.game_legacy_shop_essence_units(a,day_start + interval '24 hours') <> 0 then
    raise exception 'legacy quota incorrect at day boundary, from coins or across UID';
  end if;
  result := public.game_commit_online(a,next_request,3,next_command,initial,'null',null);
  if result->'receipt' is distinct from next_receipt or result->'save' is distinct from purchased then
    raise exception 'new purchase retry mutated receipt or wallet';
  end if;
  result := public.game_commit_online(a,gen_random_uuid(),3,next_command,purchased,next_receipt,null);
  if result->>'status' is distinct from 'conflict' then raise exception 'stale concurrent purchase accepted'; end if;
  if has_function_privilege('authenticated','public.game_legacy_shop_essence_units(uuid,timestamptz)','EXECUTE')
    or has_function_privilege('anon','public.game_legacy_shop_essence_units(uuid,timestamptz)','EXECUTE')
    or not has_function_privilege('service_role','public.game_legacy_shop_essence_units(uuid,timestamptz)','EXECUTE') then
    raise exception 'legacy quota RPC has wrong grants';
  end if;
end;
$$;
select 'shop legacy essence, Vietnam midnight, isolation and atomic purchase checks passed' as result;
rollback;
