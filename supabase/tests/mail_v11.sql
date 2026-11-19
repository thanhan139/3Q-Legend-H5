begin;
do $$
declare
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  msg uuid; single_gift uuid; broadcast_id uuid; scheduled_id uuid; admin_draft uuid; attempt uuid:=gen_random_uuid();
  res jsonb; prior jsonb; draft jsonb; args jsonb; initial jsonb:='{"schemaVersion":2,"coins":100,"gems":33,"goldKeys":0,"trainingExp":7}';
  i integer;
  qa_season integer:=2147483467;
begin
  insert into auth.users(id) values(a),(b),(c);
  perform public.game_create_save(a,initial||'{"playerName":"Tướng A","clearedStages":["2-5"]}');
  perform public.game_create_save(b,initial||'{"playerName":"Tướng B"}');
  perform public.game_create_save(c,initial||'{"playerName":"Tướng C"}');
  args:=jsonb_build_object('recipient',b,'requestId',attempt,'subject','Xin chào','body','Cùng đi ải nhé!',
      'sender','Admin giả','sender_uid',c,'category','admin','rewards',jsonb_build_object('coins',999));
  prior:=public.mail_command(a,'send',args); msg:=(prior->>'mailId')::uuid;
  if prior->>'status'<>'ok' or public.mail_command(a,'send',args)<>prior then raise exception 'send or exact retry failed'; end if;
  if public.mail_command(a,'send',args||jsonb_build_object('requestId',gen_random_uuid()))->>'status'<>'rateLimit'
    then raise exception 'send cooldown missing'; end if;
  if public.mail_command(a,'send',args||'{"subject":"Khác"}')->>'status'<>'reused' then raise exception 'send idempotency'; end if;
  res:=public.mail_command(b,'list','{}');
  if res->>'total'<>'1' or not(res->'rows'->0 @> jsonb_build_object('sender','Tướng A','peer_uid',a,'verified',false,'rewards','{}'::jsonb))
    then raise exception 'sender or authority forged'; end if;
  if public.mail_command(c,'read',jsonb_build_object('mailId',msg))->>'status'<>'missing'
    or public.mail_command(c,'report',jsonb_build_object('mailId',msg,'reason','spam'))->>'status'<>'unavailable'
    or public.mail_command(c,'list','{}')->>'total'<>'0' or public.mail_command(a,'list','{}')->>'total'<>'0'
    then raise exception 'private message exposed'; end if;
  res:=public.mail_command(a,'list','{"category":"sent"}');
  if res->>'filtered'<>'1' or not(res->'rows'->0 @> jsonb_build_object('outgoing',true,'sender','Tướng B','peer_uid',b))
    then raise exception 'outbox missing'; end if;
  perform public.mail_command(b,'read',jsonb_build_object('mailId',msg));
  if public.mail_command(b,'list','{}')->'unread'->>'all'<>'0' then raise exception 'read is not durable'; end if;
  if public.mail_command(a,'search','{"query":"tướng b"}')->'players'->0->>'uid'<>b::text then raise exception 'player lookup'; end if;
  if public.mail_command(b,'send',jsonb_build_object('recipient',a,'requestId',gen_random_uuid(),'subject','Trả lời','body','Được nhé','replyTo',msg))->>'status'<>'ok'
    then raise exception 'reply denied'; end if;
  if public.mail_command(c,'send',jsonb_build_object('recipient',a,'requestId',gen_random_uuid(),'subject','Trả lời','body','Test','replyTo',msg))->>'status'<>'unavailable'
    then raise exception 'reply guessed another thread'; end if;
  if public.mail_command(c,'send',jsonb_build_object('recipient',a,'requestId',gen_random_uuid(),'subject','markup','body','<script>')) ->>'status'<>'invalid'
    then raise exception 'markup accepted'; end if;
  perform public.mail_command(b,'report',jsonb_build_object('mailId',msg,'reason','spam'));
  perform public.mail_command(b,'report',jsonb_build_object('mailId',msg,'reason','other'));
  if (select count(*) from public.mail_reports where reporter_uid=b and mail_id=msg)<>1 then raise exception 'report replay'; end if;
  perform public.mail_command(b,'block',jsonb_build_object('mailId',msg));
  update public.mail_messages set created_at=clock_timestamp()-interval '25 seconds' where id=msg;
  if public.mail_command(a,'send',args||jsonb_build_object('requestId',gen_random_uuid()))->>'status'<>'unavailable'
    then raise exception 'blocked sender sent a new letter'; end if;
  perform public.mail_command(a,'delete',jsonb_build_object('mailId',msg,'sent',true));
  if public.mail_command(a,'list','{"category":"sent"}')->>'filtered'<>'0'
    or public.mail_command(b,'list','{}')->>'total'<>'1' then raise exception 'outbox deletion removed recipient mail'; end if;
  perform public.mail_command(b,'delete',jsonb_build_object('mailId',msg));
  if public.mail_command(b,'list','{}')->>'total'<>'0' then raise exception 'inbox deletion failed'; end if;

  -- Fill today's outgoing quota with dated fixtures without waiting twenty seconds per send.
  for i in 1..9 loop
    insert into public.mail_messages(category,sender,sender_uid,target_uid,send_request,subject,body,created_at)
    values('personal','Tướng A',a,c,gen_random_uuid(),'Quota','QA',greatest(date_trunc('day',clock_timestamp() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh',clock_timestamp()-interval '25 seconds'));
  end loop;
  update public.mail_messages set created_at=greatest(created_at,date_trunc('day',clock_timestamp() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh') where id=msg;
  if public.mail_command(a,'send',args||jsonb_build_object('recipient',c,'requestId',gen_random_uuid()))->>'status'<>'rateLimit'
    then raise exception 'daily cap missing'; end if;

  draft:=jsonb_build_object('recipients',jsonb_build_array(a),'broadcast',false,'subject','Thư Admin QA','body','Quà kiểm thử',
    'rewards','{"copper":3,"coins":2,"golden_key":1,"jewelry_essence":4,"enhancement_stone":2,"forge_shard":3,"hero_exp":8}'::jsonb);
  args:=jsonb_build_object('requestId',gen_random_uuid(),'draft',draft);
  if public.mail_command(c,'adminDraft',args)->>'status'<>'forbidden' then raise exception 'RBAC author bypass'; end if;
  insert into public.mail_roles values(a,'author'),(a,'approver'),(b,'approver');
  admin_draft:=(public.mail_command(a,'adminDraft',args)->>'draftId')::uuid;
  if public.mail_command(a,'adminApprove',jsonb_build_object('draftId',admin_draft))->>'status'<>'forbidden'
    or public.mail_command(c,'adminHistory','{}')->>'status'<>'forbidden' then raise exception 'RBAC review bypass'; end if;
  single_gift:=(public.mail_command(b,'adminApprove',jsonb_build_object('draftId',admin_draft))->>'mailId')::uuid;
  if single_gift is null or public.mail_command(b,'adminApprove',jsonb_build_object('draftId',admin_draft))->>'mailId'<>single_gift::text
    then raise exception 'admin approvals duplicated'; end if;
  res:=public.mail_command(a,'list','{"category":"admin"}');
  if not(res->'rows'->0 @> '{"verified":true,"sender":"Ban Quản Trị"}') or public.mail_command(b,'list','{"category":"admin"}')->>'filtered'<>'0'
    then raise exception 'UID delivery/verified badge failed'; end if;
  if public.mail_command(a,'delete',jsonb_build_object('mailId',single_gift))->>'deleted'<>'0' then raise exception 'unclaimed gift discarded'; end if;
  args:=jsonb_build_object('mailId',single_gift,'requestId',gen_random_uuid());
  prior:=public.mail_command(a,'claim',args);
  if prior->>'status'<>'ok' or public.mail_command(a,'claim',args)<>prior
    or public.mail_command(a,'claim',args||jsonb_build_object('requestId',gen_random_uuid()))->>'status'<>'unavailable'
    or not (public.game_load_online(a)->'state' @> '{"coins":102,"copper":3,"gems":33,"goldKeys":1,"jewelryEssence":4,"trainingExp":15,"forge":{"stones":2,"shards":18}}')
    then raise exception 'registered gift or receipt failed'; end if;

  draft:=draft||'{"broadcast":true,"recipients":[],"subject":"Thông báo toàn server","rewards":{"coins":5}}';
  admin_draft:=(public.mail_command(a,'adminDraft',jsonb_build_object('requestId',gen_random_uuid(),'draft',draft))->>'draftId')::uuid;
  broadcast_id:=(public.mail_command(b,'adminApprove',jsonb_build_object('draftId',admin_draft))->>'mailId')::uuid;
  if exists(select 1 from public.mail_inbox where mail_id=broadcast_id) then raise exception 'broadcast cloned recipients'; end if;
  for i in 1..2 loop
    prior:=public.mail_command(case when i=1 then a else b end,'claimAll',jsonb_build_object('requestId',gen_random_uuid()));
    if prior->'receipt'->'mailIds'<>jsonb_build_array(broadcast_id) then raise exception 'broadcast claim failed'; end if;
  end loop;
  if (select count(*) from public.mail_inbox where mail_id=broadcast_id and claimed_at is not null)<>2
    or public.mail_command(a,'claimAll',jsonb_build_object('requestId',gen_random_uuid()))->>'status'<>'unavailable'
    then raise exception 'broadcast duplicate claim'; end if;

  draft:=draft||'{"subject":"Bảo trì QA","rewards":{}}';
  prior:=public.mail_publish_system('maintenance','qa-unique',draft);
  if prior->>'status'<>'ok' or public.mail_publish_system('maintenance','qa-unique',draft)->>'mailId'<>prior->>'mailId'
    or not(public.mail_command(c,'list','{"category":"system"}')->'rows'->0 @> '{"verified":true,"rewards":{}}')
    then raise exception 'system notification or dedupe failed'; end if;
  scheduled_id:=(public.mail_publish_system('release','qa-future',draft||jsonb_build_object('sendAt',clock_timestamp()+interval '1 day'))->>'mailId')::uuid;
  if scheduled_id is null or public.mail_command(c,'read',jsonb_build_object('mailId',scheduled_id))->>'status'<>'missing'
    then raise exception 'scheduled message visible early'; end if;
  if public.mail_notify_arena_settlement(c,qa_season)->>'status'<>'unavailable' then raise exception 'unsettled Arena notice'; end if;
  insert into public.arena_seasons(id,starts_at,ends_at) values(qa_season,now()-interval '2 days',now()-interval '1 day');
  insert into public.arena_claims(season,uid,gold) values(qa_season,c,113);
  prior:=public.mail_notify_arena_settlement(c,qa_season);
  if prior->>'status'<>'ok' or public.mail_notify_arena_settlement(c,qa_season)->>'mailId'<>prior->>'mailId'
    or public.game_load_online(c)->'state'->>'coins'<>'100'
    or public.mail_publish_system('arenaSettlement','qa-duplicate-award',draft||'{"rewards":{"coins":1}}')->>'status'<>'invalid'
    then raise exception 'Arena notice or currency changed'; end if;
  if has_function_privilege('authenticated','public.mail_publish_system(text,text,jsonb)','execute')
    or has_function_privilege('authenticated','public.mail_command(uuid,text,jsonb)','execute')
    or has_table_privilege('authenticated','public.mail_roles','select') then raise exception 'mail RLS/API exposure'; end if;
end;
$$;
select 'Mail V1.1 RBAC, targeted/broadcast, sparse claims, system idempotency, player isolation, moderation and quotas passed' as result;
rollback;
