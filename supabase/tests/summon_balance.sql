-- Staging integration checks: synthetic rows exist ONLY within this rollback transaction.
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000091'), ('00000000-0000-4000-8000-000000000092');
set local role service_role;
do $$
declare
 a uuid := '00000000-0000-4000-8000-000000000091';
 b uuid := '00000000-0000-4000-8000-000000000092';
 request_id uuid := gen_random_uuid();
 initial jsonb := '{"schemaVersion":2,"playerName":"QA","coins":5000,"gems":300,"goldKeys":20,"trainingExp":0,"legendaryPity":99,"summonPity":49,"heroes":["guan-yu"],"heroShards":{}}';
 after_draw jsonb;
 command jsonb := '{"type":"summon","count":10}';
 receipt jsonb := '{"ok":true,"draws":[{"heroId":"lu-bu","rarity":"SSS+","shards":10}]}';
 result jsonb;
 legacy jsonb;
 n integer;
begin
 foreach n in array array[0,10,98,99,100,150,199] loop
  legacy := initial || jsonb_build_object('legendaryPity',n,'lastSummon',jsonb_build_array(jsonb_build_object('legendaryPityAfter',n)));
  result := public.game_summon_pity_v2(legacy);
  if (result->>'legendaryPity')::integer <> least(n,99) or result-'legendaryPity' <> legacy-'legendaryPity' then
   raise exception 'migration rewrote unrelated data or reset earned pity'; end if;
 end loop;
 perform public.game_create_online(a,initial);
 perform public.game_create_online(b,initial);
 after_draw := initial || '{"goldKeys":10,"legendaryPity":9,"summonPity":9,"heroShards":{"lu-bu":10}}';
 result := public.game_commit_online(a,request_id,0,command,after_draw,receipt,null);
 if result->>'status' <> 'ok' or result->'save' <> after_draw then raise exception 'atomic save failed'; end if;
 -- Lost response/replay must return the receipt WITHOUT spending keys/granting shards again.
 result := public.game_commit_online(a,request_id,0,command,initial,'null',null);
 if result->'receipt' <> receipt or result->'save' <> after_draw or result->>'revision' <> '1' then
  raise exception 'summon replay changed state'; end if;
 result := public.game_commit_online(a,request_id,1,'{"type":"summon","count":1}',initial,'null',null);
 if result->>'status' <> 'reused' then raise exception 'request id reused for a different command'; end if;
 result := public.game_commit_online(a,gen_random_uuid(),0,command,initial,receipt,null);
 if result->>'status' <> 'conflict' then raise exception 'concurrent stale request accepted'; end if;
 if public.game_load_online(b)->'state' <> initial then raise exception 'UID data crossed'; end if;
 if (select count(*) from public.economy_ledger where uid=a) <> 1 then raise exception 'duplicate ledger row'; end if;
 if exists(select 1 from public.economy_ledger where uid=b) then raise exception 'UID receipt crossed'; end if;
 if public.game_load_online(a)->'state' <> after_draw then raise exception 'reload lost summon'; end if;
end;
$$;
reset role;
set local role authenticated;
do $$
begin
 begin
  perform public.game_load_online('00000000-0000-4000-8000-000000000091');
  raise exception 'RPC exposed to client';
 exception when insufficient_privilege then null; end;
 begin
  perform public.game_commit_online('00000000-0000-4000-8000-000000000091',gen_random_uuid(),0,'{}','{}','{}',null);
  raise exception 'client can grant resources';
 exception when insufficient_privilege then null; end;
 begin
  perform 1 from public.summon_balance_migrations;
  raise exception 'migration audit exposed';
 exception when insufficient_privilege then null; end;
end;
$$;
rollback;
