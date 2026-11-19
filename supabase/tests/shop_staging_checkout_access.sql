-- The fixture accounts, grants and purchases are rolled back together.
begin;
do $$
declare
  qa uuid := gen_random_uuid(); other uuid := gen_random_uuid();
  initial jsonb := '{"schemaVersion":2,"copper":600,"coins":100000,"gems":33,"goldKeys":0,"trainingExp":0,"forge":{"stones":0,"shards":0}}';
  saved jsonb := initial;
  balance integer := 100000; revision integer := 0;
  offer record; req uuid; cmd jsonb; receipt jsonb; result jsonb;
begin
  insert into auth.users(id) values(qa),(other);
  perform public.game_create_save(qa,initial);
  perform public.game_create_save(other,initial);
  insert into public.shop_staging_checkout_grants(uid) values(qa) on conflict do nothing;
  insert into public.shop_staging_checkout_grants(uid) values(qa) on conflict do nothing;
  if not exists(select 1 from public.shop_staging_checkout_grants where uid=qa)
    or exists(select 1 from public.shop_staging_checkout_grants where uid=other)
    or has_table_privilege('authenticated','public.shop_staging_checkout_grants','SELECT')
    or has_table_privilege('anon','public.shop_staging_checkout_grants','INSERT')
    or has_table_privilege('service_role','public.shop_staging_checkout_grants','INSERT')
    or not has_table_privilege('service_role','public.shop_staging_checkout_grants','SELECT')
    then raise exception 'checkout grant isolation or permissions'; end if;

  -- Match the Shop V1.4 catalog and exercise the same SaveV2/ledger transaction as game-command.
  for offer in select * from (values
    ('golden-key','golden_key',2000,1,'d:20000',array['goldKeys']),
    ('jewelry-essence','jewelry_essence',100,1,'d:20000',array['jewelryEssence']),
    ('enhancement-stone','enhancement_stone',900,1,'d:20000',array['forge','stones']),
    ('forge-shard','forge_shard',2400,3,'w:19999',array['forge','shards']),
    ('hero-exp','hero_exp',725,100,'permanent',array['trainingExp'])
  ) as catalog(id,item,price,amount,period,path) loop
    balance:=balance-offer.price;
    saved:=jsonb_set(jsonb_set(saved,'{coins}',to_jsonb(balance)),offer.path,to_jsonb(offer.amount));
    saved:=jsonb_set(saved,'{shopPurchases}',coalesce(saved->'shopPurchases','{}') ||
      jsonb_build_object(offer.id,jsonb_build_object('period',offer.period,'bought',1)));
    req:=gen_random_uuid();
    cmd:=jsonb_build_object('type','shopBuy','offerId',offer.id,'quantity',1);
    receipt:=jsonb_build_object('kind','shopPurchase','offerId',offer.id,'quantity',1,
      'item',offer.item,'currency','coins','grant',offer.amount,'total',offer.price);
    result:=public.game_commit_online(qa,req,revision,cmd,saved,receipt,null);
    if result->>'status'<>'ok' or result->'receipt'<>receipt or result->'save'<>saved
      then raise exception 'purchase settlement failed for %',offer.id; end if;
    result:=public.game_commit_online(qa,req,revision,cmd,initial,'null',null);
    if result->>'status'<>'ok' or result->'receipt'<>receipt or result->'save'<>saved
      then raise exception 'retry changed settlement for %',offer.id; end if;
    result:=public.game_commit_online(qa,gen_random_uuid(),revision,cmd,saved,receipt,null);
    if result->>'status'<>'conflict' then raise exception 'stale device purchase accepted'; end if;
    revision:=revision+1;
  end loop;
  if (select count(*) from public.economy_ledger where uid=qa)<>5
    or (select sum((delta->>'coins')::int) from public.economy_ledger where uid=qa)<>-6125
    or public.game_load_online(qa)->'state'<>saved or public.game_load_online(other)->'state'<>initial
    then raise exception 'wrong totals, ledger count or UID'; end if;
end;
$$;
select 'Checkout grants and five SKU atomic purchases, retry and stale revision passed' as result;
rollback;
