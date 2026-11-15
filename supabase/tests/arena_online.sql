begin;
do $$
declare
 a uuid := gen_random_uuid();
 b uuid := gen_random_uuid();
 target uuid;
 req uuid := gen_random_uuid();
 s integer := floor(extract(epoch from now())/2419200);
 d integer := floor((extract(epoch from now())+25200)/86400);
 r jsonb;
 args jsonb;
 initial jsonb := '{"schemaVersion":2,"playerName":"Arena test","coins":1000,"gems":0,"goldKeys":0,"trainingExp":0}';
begin
 insert into auth.users(id) values(a),(b);
 perform public.game_create_save(a,initial);
 perform public.game_create_save(b,initial);
 perform public.arena_command(a,'publish','{"revision":0,"power":100,"defense":{"formation":["liu-bei"]}}');
 perform public.arena_command(b,'publish','{"revision":0,"power":101,"defense":{"formation":["guan-yu"]}}');
 r := public.arena_command(a,'view','{}');
 if not (r->'opponents' @> jsonb_build_array(jsonb_build_object('uid',b))) then raise exception 'missing real opponent'; end if;
 args := jsonb_build_object('opponent',b,'requestId',req,'season',s,'defenseRevision',0,'attackRevision',0,'won',true,'replay','[]'::jsonb);
 r := public.arena_command(a,'settle',args);
 if r->>'points' is distinct from '1025' then raise exception 'settlement: %',r; end if;
 if public.arena_command(a,'settle',args) is distinct from r then raise exception 'receipt changed'; end if;
 if public.arena_command(a,'settle',args||jsonb_build_object('requestId',gen_random_uuid()))->>'status' is distinct from 'repeat'
   then raise exception 'rematch limit'; end if;
 for i in 1..4 loop
   target := gen_random_uuid();
   insert into auth.users(id) values(target);
   perform public.game_create_save(target,initial);
   insert into public.arena_matches(season,attacker,defender,defender_name,request_id,day,won,points,delta,replay)
     values(s,a,target,'QA',gen_random_uuid(),d,true,1025,0,'[]');
 end loop;
 target := gen_random_uuid();
 if public.arena_command(a,'settle',args||jsonb_build_object('requestId',gen_random_uuid(),'opponent',target))->>'status'
   is distinct from 'exhausted' then raise exception 'daily cap'; end if;
 insert into public.arena_seasons values(s-1,to_timestamp((s-1)::bigint*2419200),to_timestamp(s::bigint*2419200)) on conflict do nothing;
 insert into public.arena_players(season,uid,name,power,defense,defense_revision,points,played)
   values(s-1,a,'QA',100,'{}',0,1025,1);
 args := jsonb_build_object('season',s-1);
 if public.arena_command(a,'claim',args)->>'gold' is distinct from '125' then raise exception 'wrong award'; end if;
 if public.arena_command(a,'claim',args)->>'status' is distinct from 'claimed' then raise exception 'duplicate award'; end if;
 if (select state->>'coins' from public.player_saves where uid=a) is distinct from '1125' then raise exception 'wallet mismatch'; end if;
 if (select state->>'coins' from public.player_saves where uid=b) is distinct from '1000' then raise exception 'unexpected defender wallet change'; end if;
 if has_function_privilege('authenticated','public.arena_command(uuid,text,jsonb)','EXECUTE')
    or has_table_privilege('authenticated','public.arena_matches','SELECT') then raise exception 'client access'; end if;
end;
$$;
select 'arena transaction checks passed' as result;
rollback;
