-- Legacy purchases counted packs per week. The ledger records exactly how many
-- essence units were granted per UID on the current Vietnam calendar day.
create function public.game_legacy_shop_essence_units(p_uid uuid, p_day_start timestamptz)
returns integer
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(sum((l.receipt->>'grant')::integer), 0)::integer
  from public.economy_ledger l
  where l.uid = p_uid
    and l.created_at >= p_day_start and l.created_at < p_day_start + interval '24 hours'
    and l.command->>'type' = 'shopBuy' and l.command->>'offerId' = 'jewelry-essence'
    and l.receipt->>'kind' = 'shopPurchase' and l.receipt->>'currency' = 'gems'
    and l.receipt->>'item' = 'jewelry_essence';
$$;

revoke all on function public.game_legacy_shop_essence_units(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.game_legacy_shop_essence_units(uuid, timestamptz) to service_role;
