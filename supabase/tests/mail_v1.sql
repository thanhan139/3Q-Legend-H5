-- Staging QA fixtures are rolled back, including the Auth users and all grants.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  one uuid; batch uuid; expired_id uuid; note uuid; overflow_id uuid;
  claim_request uuid := gen_random_uuid(); batch_request uuid := gen_random_uuid();
  initial jsonb := '{"schemaVersion":2,"copper":0,"coins":100,"gems":33,"goldKeys":0,"trainingExp":0}';
  result jsonb; original jsonb; i integer;
begin
  insert into auth.users(id) values(a),(b);
  perform public.game_create_save(a,initial);
  perform public.game_create_save(b,initial);
  insert into public.mail_messages(category,sender,subject,body,rewards)
    values('system','QA','Vượt ải','Kiểm thử', '{"copper":17,"coins":11,"golden_key":1,"jewelry_essence":3}') returning id into one;
  insert into public.mail_messages(category,sender,subject,body,rewards)
    values('event','QA','Thư sự kiện','Kiểm thử', '{"coins":7}') returning id into batch;
  insert into public.mail_messages(category,sender,subject,body,created_at,expires_at,rewards)
    values('personal','QA','Thư hết hạn','Kiểm thử', now()-interval '3 days',now()-interval '2 days','{"coins":19}') returning id into expired_id;
  insert into public.mail_messages(category,sender,subject,body)
    values('system','QA','Thông báo','Kiểm thử') returning id into note;
  perform public.mail_deliver(a,one); perform public.mail_deliver(a,one);
  perform public.mail_deliver(a,batch); perform public.mail_deliver(a,expired_id); perform public.mail_deliver(a,note);
  result := public.mail_command(b,'list','{}');
  if result->>'total' <> '0' or result->'rows' <> '[]' then raise exception 'foreign UID listed mail'; end if;
  if public.mail_command(b,'read',jsonb_build_object('mailId',one))->>'status' <> 'missing'
    or public.mail_command(b,'claim',jsonb_build_object('mailId',one,'requestId',claim_request))->>'status' <> 'unavailable'
    then raise exception 'foreign UID accessed mail'; end if;
  result := public.mail_command(a,'list','{"category":"event"}');
  if result->>'total' <> '4' or result->>'filtered' <> '1' or result->'unread'->>'system' <> '2'
    or result->>'claimable' <> '2' or result->'rows'->0->>'id' <> batch::text then raise exception 'incorrect categories or counts'; end if;
  perform public.mail_command(a,'read',jsonb_build_object('mailId',one));
  perform public.mail_command(a,'read',jsonb_build_object('mailId',expired_id));
  if public.mail_command(a,'deleteRead','{}')->>'deleted' <> '0' then raise exception 'unclaimed attachment deleted'; end if;
  if public.mail_command(a,'claim',jsonb_build_object('mailId',expired_id,'requestId',gen_random_uuid()))->>'status' <> 'unavailable'
    then raise exception 'expired gift claim accepted'; end if;
  original := public.mail_command(a,'claim',jsonb_build_object('mailId',one,'requestId',claim_request));
  if original->>'status' <> 'ok' or original->'receipt'->'rewards' <> '{"copper":17,"coins":11,"golden_key":1,"jewelry_essence":3}'
    then raise exception 'incorrect claim receipt'; end if;
  if public.mail_command(a,'claim',jsonb_build_object('mailId',one,'requestId',claim_request)) <> original
    or public.mail_command(a,'claim',jsonb_build_object('mailId',one,'requestId',gen_random_uuid()))->>'status' <> 'unavailable'
    or public.mail_command(a,'claimAll',jsonb_build_object('requestId',claim_request))->>'status' <> 'reused'
    then raise exception 'retry or duplicate check failed'; end if;
  result := public.mail_command(a,'claimAll',jsonb_build_object('requestId',batch_request));
  if result->>'status' <> 'ok' or result->'receipt'->'mailIds' <> jsonb_build_array(batch) then raise exception 'incorrect batch'; end if;
  if public.mail_command(a,'claimAll',jsonb_build_object('requestId',batch_request)) <> result then raise exception 'batch retry changed'; end if;
  if not (public.game_load_online(a)->'state' @> '{"copper":17,"coins":118,"gems":33,"goldKeys":1,"jewelryEssence":3}')
    or public.game_load_online(b)->'state' <> initial or (select count(*) from public.economy_ledger where uid=a)<>2
    then raise exception 'wallet delta or ledger is incorrect'; end if;
  perform public.mail_command(a,'read',jsonb_build_object('mailId',note));
  if public.mail_command(a,'deleteRead','{}')->>'deleted' <> '2' then raise exception 'safe delete incorrect'; end if;
  if public.mail_command(a,'claim',jsonb_build_object('mailId',one,'requestId',claim_request)) <> original then raise exception 'deletion lost retry receipt'; end if;
  insert into public.mail_messages(category,sender,subject,body,rewards) values('event','QA','Quá giới hạn','Kiểm thử','{"coins":9}') returning id into overflow_id;
  update public.player_saves set state=jsonb_set(state,'{coins}','9007199254740991') where uid=a;
  perform public.mail_deliver(a,overflow_id);
  if public.mail_command(a,'claimAll',jsonb_build_object('requestId',gen_random_uuid()))->>'status' <> 'walletLimit'
    or not exists(select 1 from public.mail_inbox where uid=a and mail_id=overflow_id and claimed_at is null)
    then raise exception 'wallet overflow consumed gift'; end if;
  for i in 1..48 loop
    insert into public.mail_messages(category,sender,subject,body,created_at)
      values('system','QA',i::text,'Thư phân trang',now()+make_interval(secs=>i)) returning id into note;
    if public.mail_deliver(a,note) is distinct from (i<=47) then raise exception 'incorrect inbox cap'; end if;
  end loop;
  result := public.mail_command(a,'list','{"category":"all","page":0}');
  if result->>'total' <> '50' or result->'rows'->0->>'subject' <> '47' or jsonb_array_length(result->'rows')<>12
    or jsonb_array_length(public.mail_command(a,'list','{"category":"all","page":4}')->'rows')<>2 then raise exception 'incorrect paging'; end if;
  begin
    insert into public.mail_messages(category,sender,subject,body,rewards) values('system','QA','Bad','Bad','{"gems":12}');
    raise exception 'invalid reward accepted';
  exception when check_violation then null;
  end;
  if has_table_privilege('authenticated','public.mail_inbox','select')
    or has_function_privilege('authenticated','public.mail_command(uuid,text,jsonb)','execute')
    or has_function_privilege('anon','public.mail_deliver(uuid,uuid)','execute') then raise exception 'mail privileges are too broad'; end if;
end;
$$;
select 'Mail V1 UID isolation, delivery, read, credit, batch, exact retry, expiry, deletion and paging passed' as result;
rollback;
