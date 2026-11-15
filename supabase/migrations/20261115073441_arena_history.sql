create or replace function public.arena_command(p_uid uuid, p_action text, p_args jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  moment timestamptz := now();
  season_id integer := floor(extract(epoch from moment) / 2419200);
  today integer := floor((extract(epoch from moment) + 25200) / 86400);
  player public.arena_players;
  target public.arena_players;
  played_match public.arena_matches;
  player_save public.player_saves;
  request_key uuid := (p_args->>'requestId')::uuid;
  opponent uuid := (p_args->>'opponent')::uuid;
  played_today integer;
  won boolean;
  new_points integer;
  claim_id integer;
  reward integer;
  committed jsonb;
  board jsonb;
  candidates jsonb;
  history jsonb;
  previous jsonb;
begin
  if not exists(select 1 from public.player_saves where uid=p_uid) then
    return jsonb_build_object('status','missing');
  end if;
  insert into public.arena_seasons values (season_id,to_timestamp(season_id::bigint*2419200),
    to_timestamp((season_id::bigint+1)*2419200)) on conflict do nothing;
  -- Serialize mutations for a single attacker, including parallel device requests.
  if p_action <> 'view' then
    perform 1 from public.profiles where uid=p_uid for update;
  end if;
  select * into player from public.arena_players where season=season_id and uid=p_uid;

  if p_action='publish' then
    select * into player_save from public.player_saves where uid=p_uid for share;
    if player_save.revision is distinct from (p_args->>'revision')::bigint then
      return jsonb_build_object('status','changed');
    end if;
    insert into public.arena_players(season,uid,name,power,defense,defense_revision)
      values (season_id,p_uid,left(player_save.state->>'playerName',28),(p_args->>'power')::integer,
        p_args->'defense',player_save.revision)
      on conflict(season,uid) do update set name=excluded.name,power=excluded.power,
        defense=excluded.defense,defense_revision=excluded.defense_revision;
    return jsonb_build_object('status','ok');
  end if;

  if p_action='settle' then
    select m.* into played_match from public.arena_matches m where m.attacker=p_uid and m.request_id=request_key;
    if found then
      if played_match.defender is distinct from opponent then return jsonb_build_object('status','invalid'); end if;
      return jsonb_build_object('status','ok','won',played_match.won,'points',played_match.points,'delta',played_match.delta,'replay',played_match.replay);
    end if;
    if player.uid is null or opponent is null or opponent=p_uid then return jsonb_build_object('status','unavailable'); end if;
    if exists(select 1 from public.arena_matches where season=season_id and attacker=p_uid and day=today and defender=opponent)
      then return jsonb_build_object('status','repeat'); end if;
    select count(*) into played_today from public.arena_matches where season=season_id and attacker=p_uid and day=today;
    if played_today>=5 then return jsonb_build_object('status','exhausted'); end if;
    select * into target from public.arena_players where season=season_id and uid=opponent;
    select * into player_save from public.player_saves where uid=p_uid for share;
    if target.uid is null or season_id is distinct from (p_args->>'season')::integer
      or target.defense_revision is distinct from (p_args->>'defenseRevision')::bigint
      or player_save.revision is distinct from (p_args->>'attackRevision')::bigint
      then return jsonb_build_object('status','changed'); end if;
    won := (p_args->>'won')::boolean;
    new_points := greatest(0,player.points+case when won then 25 else -15 end);
    update public.arena_players set points=new_points,played=played+1 where season=season_id and uid=p_uid;
    insert into public.arena_matches(season,attacker,defender,defender_name,request_id,day,won,points,delta,replay)
      values(season_id,p_uid,opponent,target.name,request_key,today,won,new_points,new_points-player.points,p_args->'replay');
    return jsonb_build_object('status','ok','won',won,'points',new_points,'delta',new_points-player.points,'replay',p_args->'replay');
  end if;

  if p_action='claim' then
    claim_id := (p_args->>'season')::integer;
    if claim_id is null or claim_id >= season_id then return jsonb_build_object('status','unavailable'); end if;
    select gold into reward from public.arena_claims where season=claim_id and uid=p_uid;
    if found then return jsonb_build_object('status','claimed','gold',reward); end if;
    select least(500,100+greatest(0,points-1000)) into reward from public.arena_players
      where season=claim_id and uid=p_uid and played>0;
    if not found then return jsonb_build_object('status','unavailable'); end if;
    select * into player_save from public.player_saves where uid=p_uid for update;
    committed := public.game_commit(p_uid,gen_random_uuid(),player_save.revision,jsonb_build_object('type','arenaSeason','season',claim_id),
      jsonb_set(player_save.state,'{coins}',to_jsonb(least(9007199254740991,(player_save.state->>'coins')::bigint+reward))),
      jsonb_build_object('gold',reward));
    if committed->>'status'<>'ok' then raise exception 'Arena reward commit failed'; end if;
    insert into public.arena_claims values(claim_id,p_uid,reward);
    return jsonb_build_object('status','ok','gold',reward);
  end if;

  if p_action<>'view' then return jsonb_build_object('status','invalid'); end if;
  select count(*) into played_today from public.arena_matches where season=season_id and attacker=p_uid and day=today;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]') into board from (
    select name,power,points,row_number() over(order by points desc,uid) as rank
    from public.arena_players where season=season_id and played>0 order by points desc,uid limit 20
  ) r;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]') into candidates from (
    select uid,name,power,points,defense->'formation' as formation from public.arena_players a where season=season_id and a.uid<>p_uid
      and not exists(select 1 from public.arena_matches m where m.attacker=p_uid and m.season=season_id and m.day=today and m.defender=a.uid)
    order by abs(points-coalesce(player.points,1000)),uid limit 3
  ) r;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]') into history from (
    select m.request_id,m.defender_name,m.won,m.delta,m.played_at from public.arena_matches m
    where attacker=p_uid order by played_at desc,request_id limit 10
  ) r;
  select jsonb_build_object('season',a.season,'gold',least(500,100+greatest(0,a.points-1000)),
      'claimed',c.uid is not null) into previous
    from public.arena_players a left join public.arena_claims c on c.season=a.season and c.uid=a.uid
    where a.uid=p_uid and a.season<season_id and a.played>0
    order by (c.uid is null) desc,a.season desc limit 1;
  return jsonb_build_object('status','ok','season',season_id,'endsAt',(select ends_at from public.arena_seasons where id=season_id),
    'enrolled',player.uid is not null,'points',player.points,'remaining',greatest(0,5-played_today),
    'rank',case when player.played>0 then 1+(select count(*) from public.arena_players where season=season_id and
      played>0 and (points>player.points or (points=player.points and uid<p_uid))) end,
    'board',board,'opponents',candidates,'history',history,'reward',previous);
end;
$$;
