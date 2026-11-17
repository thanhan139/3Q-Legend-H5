begin;
-- Versioned audit of the original counters; no inventory, roster or history rewrite.
create table public.summon_balance_migrations (
 uid uuid not null references public.player_saves(uid) on delete cascade,
 version integer not null, original_pity integer not null, migrated_at timestamptz not null default now(),
 primary key(uid,version)
);
alter table public.summon_balance_migrations enable row level security;
revoke all on public.summon_balance_migrations from public, anon, authenticated;
grant select, insert on public.summon_balance_migrations to service_role;

create function public.game_summon_pity_v2(p_state jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
 select case when (p_state->>'legendaryPity')::integer >= 100
 then jsonb_set(p_state, '{legendaryPity}', '99'::jsonb) else p_state end;
$$;
revoke execute on function public.game_summon_pity_v2(jsonb) from public, anon, authenticated;
grant execute on function public.game_summon_pity_v2(jsonb) to service_role;

-- Lock before the audit and update, so concurrent saves cannot escape reconciliation.
lock table public.player_saves in share row exclusive mode;
insert into public.summon_balance_migrations(uid,version,original_pity)
select uid,2,coalesce((state->>'legendaryPity')::integer,0) from public.player_saves;
update public.player_saves set state=public.game_summon_pity_v2(state),
 revision=revision+1, updated_at=now() where (state->>'legendaryPity')::integer >= 100;
-- Old functions cannot write an out-of-policy counter during a rolling release.
alter table public.player_saves add constraint summon_pity_v2_range
 check (state->>'legendaryPity' is null or
  ((state->>'legendaryPity')::integer between 0 and 99));
commit;
