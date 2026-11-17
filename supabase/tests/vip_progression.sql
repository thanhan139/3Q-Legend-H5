-- Disposable test records and configuration only. All changes, including migration when composed, roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000091'),('00000000-0000-4000-8000-000000000092');
set local role service_role;
do $$
declare a uuid:='00000000-0000-4000-8000-000000000091';b uuid:='00000000-0000-4000-8000-000000000092';
 initial jsonb:='{"schemaVersion":2,"playerName":"QA","coins":5000,"gems":300,"goldKeys":2,"trainingExp":0}';
 request uuid:=gen_random_uuid();r jsonb;s jsonb;rev bigint;
begin
 perform public.game_create_online(a,initial);perform public.game_create_online(b,initial);
 if public.game_vip_level((public.game_vip_snapshot(a)->>'paidBaseKnbTotal')::bigint)<>0 then raise exception 'new VIP is not zero';end if;
 if public.game_vip_level(299999)<>4 or public.game_vip_level(300000)<>5 or public.game_vip_level(999999)<>6
  or public.game_vip_level(1000000)<>7 or public.game_vip_level(50000000)<>18 or public.game_vip_level(90000000)<>18 then raise exception 'threshold mismatch';end if;
 perform public.game_record_vip_payment(a,'qa','paid-a',3000000,300000,9999999,'paid','fixture-settlement');
 perform public.game_record_vip_payment(a,'qa','paid-a',3000000,300000,9999999,'paid','fixture-settlement');
 if (public.game_vip_snapshot(a)->>'paidBaseKnbTotal')::bigint<>300000 or (public.game_load_online(a)->>'revision')::bigint<>1 then raise exception 'payment replay or bonus inflated VIP';end if;
 if public.game_vip_level((public.game_vip_snapshot(b)->>'paidBaseKnbTotal')::bigint)<>0 then raise exception 'UID leaked';end if;
 begin
  perform public.game_record_vip_payment(b,'qa','paid-a',3000000,300000,9999999,'paid','fixture-settlement');raise exception 'cross UID reused payment';
 exception when raise_exception then if sqlerrm<>'transaction identity mismatch' then raise;end if;end;
 begin
  perform public.game_record_vip_payment(a,'qa','invalid-conversion',1,1000,0,'paid','fixture-settlement');raise exception 'bad conversion accepted';
 exception when raise_exception then if sqlerrm<>'invalid verified payment' then raise;end if;end;
 begin
  perform public.game_record_vip_payment(a,'qa','paid-a',null,300000,9999999,'refunded','fixture-missing-amount');raise exception 'null payment metadata accepted';
 exception when raise_exception then if sqlerrm<>'invalid verified payment' then raise;end if;end;
 r:=public.game_claim_vip(a,request,1,5,'level','once');if r->>'status'<>'rejected' then raise exception 'unconfigured reward paid';end if;
 -- Test-only explicit approved catalog. The actual migration seeds no quantities.
 insert into public.vip_reward_catalog(kind,tier,rewards,approved) values
  ('level',5,'{"golden_key":5}',true),('daily',5,'{"hero_exp":100}',true),('weekly',5,'{"golden_key":1}',true),
  ('level',7,'{"golden_key":10}',true),('level',0,'{"fake_item":100}',true);
 r:=public.game_claim_vip(a,request,1,5,'level','once');
 if r->>'status'<>'ok' or (r#>>'{save,goldKeys}')::bigint<>7 then raise exception 'eligible gift failed';end if;
 r:=public.game_claim_vip(a,request,1,5,'level','once');if (r#>>'{save,goldKeys}')::bigint<>7 or (r->>'revision')::bigint<>2 then raise exception 'same request duplicate';end if;
 r:=public.game_claim_vip(a,gen_random_uuid(),2,5,'level','once');if r->>'status'<>'rejected' then raise exception 'different request duplicate';end if;
 r:=public.game_claim_vip(a,gen_random_uuid(),2,7,'level','once');if r->>'status'<>'rejected' then raise exception 'locked level gift';end if;
 r:=public.game_claim_vip(a,gen_random_uuid(),2,0,'level','once');if r->>'status'<>'rejected' then raise exception 'unknown item gift';end if;
 r:=public.game_claim_vip(a,gen_random_uuid(),2,5,'daily','2000-01-01');if r->>'status'<>'rejected' then raise exception 'client-controlled reset';end if;
 r:=public.game_claim_vip(a,gen_random_uuid(),2,5,'daily',public.game_vip_period('daily'));if r->>'status'<>'ok' then raise exception 'daily failed';end if;
 rev:=(r->>'revision')::bigint;
 r:=public.game_claim_vip(a,gen_random_uuid(),rev,5,'daily',public.game_vip_period('daily'));if r->>'status'<>'rejected' then raise exception 'daily duplicate';end if;
 r:=public.game_claim_vip(a,gen_random_uuid(),rev,5,'weekly',public.game_vip_period('weekly'));if r->>'status'<>'ok' then raise exception 'weekly failed';end if;
 rev:=(r->>'revision')::bigint;
 r:=public.game_claim_vip(a,gen_random_uuid(),rev,5,'weekly',public.game_vip_period('weekly'));if r->>'status'<>'rejected' then raise exception 'weekly duplicate';end if;
 -- Wallet gifts/spending never count as paid base KNB.
 s:=(public.game_load_online(a))->'state';
 perform public.game_commit_online(a,gen_random_uuid(),rev,'{"type":"qa-wallet"}',jsonb_set(s,'{coins}','90000000'),'true',null);
 if (public.game_vip_snapshot(a)->>'paidBaseKnbTotal')::bigint<>300000 then raise exception 'wallet inflated VIP';end if;
 rev := (public.game_load_online(a)->>'revision')::bigint;
 s := (public.game_load_online(a))->'state';
 perform public.game_commit_online(a,gen_random_uuid(),rev,'{"type":"qa-spend"}',jsonb_set(s,'{coins}','0'),'true',null);
 if (public.game_vip_snapshot(a)->>'paidBaseKnbTotal')::bigint<>300000 then raise exception 'spending lowered VIP';end if;
 perform public.game_record_vip_payment(a,'qa','paid-b',2000000,200000,0,'paid','fixture-settlement');
 insert into public.vip_reward_catalog(kind,tier,rewards,approved) values('daily',6,'{"golden_key":1}',true);
 rev := (public.game_load_online(a)->>'revision')::bigint;
 r:=public.game_claim_vip(a,gen_random_uuid(),rev,6,'daily',public.game_vip_period('daily'));
 if r->>'status'<>'rejected' then raise exception 'upgrading reset daily limit';end if;
 perform public.game_record_vip_payment(a,'qa','paid-b',2000000,200000,0,'refunded','fixture-refund');
 perform public.game_record_vip_payment(a,'qa','paid-a',3000000,300000,9999999,'refunded','fixture-refund');
 perform public.game_record_vip_payment(a,'qa','paid-a',3000000,300000,9999999,'paid','fixture-old-event');
 if (public.game_vip_snapshot(a)->>'paidBaseKnbTotal')::bigint<>0 then raise exception 'refund replay reinstated VIP';end if;
 if (public.game_load_online(b)->'state')<>initial then raise exception 'UID inventory mixed';end if;
end;$$;
reset role;
set local role authenticated;
do $$begin
 begin perform public.game_vip_snapshot('00000000-0000-4000-8000-000000000091');raise exception 'client VIP RPC leak';exception when insufficient_privilege then null;end;
 begin perform 1 from public.vip_verified_payments;raise exception 'client payment table leak';exception when insufficient_privilege then null;end;
 begin perform public.game_record_vip_payment('00000000-0000-4000-8000-000000000091','qa','forged',10000,1000,0,'paid','fake');raise exception 'client recharge forged';exception when insufficient_privilege then null;end;
 begin perform public.game_claim_vip('00000000-0000-4000-8000-000000000091',gen_random_uuid(),0,5,'level','once');raise exception 'client claim bypassed JWT';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select 'VIP_SQL_QA_PASS' as result;
rollback;
