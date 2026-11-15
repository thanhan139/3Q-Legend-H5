-- Run against a disposable local/test database after all migrations; always rolls back.
begin;
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000081'),
  ('00000000-0000-4000-8000-000000000082'),
  ('00000000-0000-4000-8000-000000000083');
set local role service_role;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000081';
  b uuid := '00000000-0000-4000-8000-000000000082';
  c uuid := '00000000-0000-4000-8000-000000000083';
  request_id uuid := '00000000-0000-4000-8000-000000000084';
  initial jsonb := '{"schemaVersion":2,"playerName":"Chúa Công","coins":5000,"gems":300,"goldKeys":2,"trainingExp":0}';
  named jsonb;
  progress jsonb := '{"tutorialVersion":1,"tutorialStep":"starter_heroes","tutorialCompleted":false,"tutorialSkipped":false}';
  command jsonb := '{"type":"tutorial","action":"name","version":1,"step":"welcome","name":"Minh Chủ"}';
  result jsonb;
begin
  result := public.game_create_online(a,initial);
  if result#>>'{tutorial,tutorialStep}' <> 'welcome' or result->'save' <> initial then
    raise exception 'new account tutorial or balances invalid'; end if;
  perform public.game_create_online(b,initial);
  perform public.game_create_save(c,initial);
  if public.game_load_online(c)#>>'{tutorial,tutorialCompleted}' <> 'true' then
    raise exception 'legacy account forced into tutorial'; end if;
  named := jsonb_set(initial,'{playerName}','"Minh Chủ"');
  result := public.game_commit_online(a,request_id,0,command,named,'true',progress);
  if result->>'revision' <> '1' or result->'tutorial' <> progress then
    raise exception 'save and tutorial not committed together'; end if;
  result := public.game_commit_online(a,request_id,0,command,initial,'null',null);
  if result->>'revision' <> '1' or result->'save' <> named or result->'tutorial' <> progress then
    raise exception 'retry altered save/tutorial'; end if;
  result := public.game_create_online(a,initial);
  if result->'save' <> named or result->'tutorial' <> progress then
    raise exception 'initialize overwrote existing progress'; end if;
  result := public.game_commit_online(a,gen_random_uuid(),0,command,initial,'true',progress);
  if result->>'status' <> 'conflict' then raise exception 'stale request accepted'; end if;
  if public.game_load_online(b)#>>'{tutorial,tutorialStep}' <> 'welcome' then
    raise exception 'UID isolation failed'; end if;
  if (select count(*) from public.economy_ledger where uid=a) <> 1 then
    raise exception 'duplicate receipt'; end if;
end;
$$;
reset role;
set local role authenticated;
do $$
begin
  begin
    perform public.game_load_online('00000000-0000-4000-8000-000000000081');
    raise exception 'client RPC privilege leak';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.player_tutorials;
    raise exception 'client table privilege leak';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
