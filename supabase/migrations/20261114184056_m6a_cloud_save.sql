begin;

create table public.profiles (
  uid uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.player_saves (
  uid uuid primary key references public.profiles(uid) on delete cascade,
  save_version integer not null check (save_version = 2),
  revision bigint not null check (revision >= 0 and revision <= 9007199254740991),
  state jsonb not null check (
    jsonb_typeof(state) = 'object' and state @> '{"schemaVersion":2}'
  ),
  legacy_imported boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.economy_ledger (
  uid uuid not null references public.profiles(uid) on delete cascade,
  request_id uuid not null,
  revision bigint not null,
  command jsonb not null,
  receipt jsonb not null,
  delta jsonb not null,
  created_at timestamptz not null default now(),
  primary key (uid, request_id),
  unique (uid, revision)
);

-- Legacy saves predate account ownership. Allow an exact canonical snapshot only once.
create table public.legacy_save_imports (
  fingerprint text primary key check (fingerprint ~ '^[a-f0-9]{64}$'),
  uid uuid not null unique references public.profiles(uid) on delete cascade
);

alter table public.profiles enable row level security;
alter table public.player_saves enable row level security;
alter table public.economy_ledger enable row level security;
alter table public.legacy_save_imports enable row level security;

revoke all on public.profiles, public.player_saves, public.economy_ledger, public.legacy_save_imports
  from public, anon, authenticated;
grant select on public.profiles, public.player_saves, public.economy_ledger to authenticated;
grant select, insert, update, delete on public.profiles, public.player_saves, public.economy_ledger,
  public.legacy_save_imports to service_role;

create policy profile_owner on public.profiles for select to authenticated using ((select auth.uid()) = uid);
create policy save_owner on public.player_saves for select to authenticated using ((select auth.uid()) = uid);
create policy ledger_owner on public.economy_ledger for select to authenticated using ((select auth.uid()) = uid);

create function public.game_create_save(p_uid uuid, p_state jsonb, p_fingerprint text default null)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare current_save public.player_saves;
begin
  insert into public.profiles(uid) values (p_uid) on conflict do nothing;
  perform 1 from public.profiles where uid = p_uid for update;
  select * into current_save from public.player_saves where uid = p_uid;
  if found then
    if p_fingerprint is not null and not exists (
      select 1 from public.legacy_save_imports where uid = p_uid and fingerprint = p_fingerprint
    ) then
      return jsonb_build_object('status', 'exists');
    end if;
  else
    if p_fingerprint is not null then
      insert into public.legacy_save_imports(uid, fingerprint) values (p_uid, p_fingerprint)
        on conflict do nothing;
      if not found then return jsonb_build_object('status', 'used'); end if;
    end if;
    insert into public.player_saves(uid, save_version, revision, state, legacy_imported)
      values (p_uid, 2, 0, p_state, p_fingerprint is not null)
      returning * into current_save;
  end if;
  return jsonb_build_object('status', 'ok', 'save', current_save.state, 'revision', current_save.revision::text);
end;
$$;

create function public.game_commit(p_uid uuid, p_request_id uuid, p_expected_revision bigint,
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
  select jsonb_object_agg(key, (p_state ->> key)::bigint - (current_save.state ->> key)::bigint)
    into wallet_delta from unnest(array['coins','gems','goldKeys','trainingExp']) as wallet(key);
  update public.player_saves set state = p_state, revision = next_revision, updated_at = now() where uid = p_uid;
  insert into public.economy_ledger(uid, request_id, revision, command, receipt, delta)
    values (p_uid, p_request_id, next_revision, p_command, p_receipt, wallet_delta);
  return jsonb_build_object('status', 'ok', 'receipt', p_receipt, 'save', p_state, 'revision', next_revision::text);
end;
$$;

revoke execute on function public.game_create_save(uuid,jsonb,text) from public, anon, authenticated;
revoke execute on function public.game_commit(uuid,uuid,bigint,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.game_create_save(uuid,jsonb,text) to service_role;
grant execute on function public.game_commit(uuid,uuid,bigint,jsonb,jsonb,jsonb) to service_role;

commit;
