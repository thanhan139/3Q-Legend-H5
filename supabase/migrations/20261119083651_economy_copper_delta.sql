-- Keep the existing lock, revision and idempotency contract; record copper in the wallet delta.
create or replace function public.game_commit(p_uid uuid, p_request_id uuid, p_expected_revision bigint,
  p_command jsonb, p_state jsonb, p_receipt jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare current_save public.player_saves;
declare recorded public.economy_ledger;
declare next_revision bigint;
declare wallet_delta jsonb;
begin
  select * into current_save from public.player_saves where uid = p_uid for update;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  select * into recorded from public.economy_ledger where uid = p_uid and request_id = p_request_id;
  if found then
    if recorded.command <> p_command then return jsonb_build_object('status', 'reused'); end if;
    return jsonb_build_object('status', 'ok', 'receipt', recorded.receipt,
      'save', current_save.state, 'revision', current_save.revision::text);
  end if;
  if current_save.revision <> p_expected_revision then
    return jsonb_build_object('status', 'conflict', 'save', current_save.state, 'revision', current_save.revision::text);
  end if;

  next_revision := current_save.revision + 1;
  select jsonb_object_agg(key, coalesce((p_state ->> key)::bigint, 0) - coalesce((current_save.state ->> key)::bigint, 0))
    into wallet_delta from unnest(array['coins','gems','goldKeys','trainingExp','copper']) as wallet(key);
  update public.player_saves set state = p_state, revision = next_revision, updated_at = now() where uid = p_uid;
  insert into public.economy_ledger(uid, request_id, revision, command, receipt, delta)
    values (p_uid, p_request_id, next_revision, p_command, p_receipt, wallet_delta);
  return jsonb_build_object('status', 'ok', 'receipt', p_receipt, 'save', p_state, 'revision', next_revision::text);
end;
$$;
