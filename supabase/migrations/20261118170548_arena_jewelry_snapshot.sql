-- Retain old arena_command and receipts. The new settle path additionally pins
-- the defender's save revision used to calculate their current jewelry.
create function public.arena_settle_jewelry(p_uid uuid, p_args jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  opponent_id uuid := (p_args->>'opponent')::uuid;
  expected_revision bigint := (p_args->>'defenderSaveRevision')::bigint;
  current_revision bigint;
begin
  -- Match arena_command's lock order, including concurrent reward claims.
  perform 1 from public.profiles where uid = p_uid for update;
  if not exists (
    select 1 from public.arena_matches where attacker = p_uid and request_id = (p_args->>'requestId')::uuid
  ) then
    select revision into current_revision from public.player_saves where uid = opponent_id for share;
    if current_revision is null or current_revision is distinct from expected_revision then
      return jsonb_build_object('status', 'changed');
    end if;
  end if;
  return public.arena_command(p_uid, 'settle', p_args);
end;
$$;

revoke all on function public.arena_settle_jewelry(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.arena_settle_jewelry(uuid, jsonb) to service_role;
