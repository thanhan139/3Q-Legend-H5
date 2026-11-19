-- Additive grants supplement the existing Edge secret. No accounts are seeded here.
create table public.shop_staging_checkout_grants (
  uid uuid primary key references public.profiles(uid) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.shop_staging_checkout_grants enable row level security;
revoke all on public.shop_staging_checkout_grants from public, anon, authenticated, service_role;
grant select on public.shop_staging_checkout_grants to service_role;
