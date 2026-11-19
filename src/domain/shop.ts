import { changeInventory, inventoryQuantity, ITEM_IDS } from './resources';
import { normalizeForge } from './forge';
import type { SaveV2 } from './types';

export type ShopPeriod = 'daily' | 'weekly' | 'permanent';
export type ShopCurrency = 'coins' | 'gems';
export type ShopCounter = { period: string; bought: number };
export const SHOP_MAX_QUANTITY = 99;
const DAY = 86_400_000;
const VIETNAM_OFFSET = 7 * 3_600_000;

// Staging economics proposal. A server-side QA allowlist gates all purchases.
const terms = { priceVersion: 1, active: true, testOnly: true } as const;
export const SHOP_OFFERS = [
  { ...terms, id: 'golden-key', category: 'summon', item: ITEM_IDS.goldenKey, amount: 1,
    currency: 'gems', price: 95, limit: 4, period: 'daily', featured: true },
  { ...terms, id: 'jewelry-essence', category: 'jewelry', item: ITEM_IDS.jewelryEssence, amount: 20,
    currency: 'gems', price: 110, limit: 6, period: 'weekly', featured: true },
  { ...terms, id: 'enhancement-stone', category: 'materials', item: ITEM_IDS.enhancementStone, amount: 1,
    currency: 'coins', price: 900, limit: 5, period: 'daily', featured: false },
  { ...terms, id: 'forge-shard', category: 'divine', item: ITEM_IDS.forgeShard, amount: 3,
    currency: 'gems', price: 125, limit: 4, period: 'weekly', featured: false },
  { ...terms, id: 'hero-exp', category: 'heroes', item: ITEM_IDS.heroExp, amount: 100,
    currency: 'coins', price: 725, limit: 10, period: 'permanent', featured: false },
] as const satisfies readonly {
  id: string; category: string; item: string; amount: number; price: number; currency: ShopCurrency;
  limit: number; period: ShopPeriod; featured: boolean; priceVersion: number; active: boolean; testOnly: true;
  activeFrom?: number; activeUntil?: number;
}[];

export type ShopOffer = (typeof SHOP_OFFERS)[number] & { activeFrom?: number; activeUntil?: number };
export interface ShopListing {
  offer: ShopOffer; used: number; owned: number; max: number; resetAt?: number;
}
export interface ShopCatalog {
  serverTime: number;
  checkoutEnabled: boolean;
  balances: Record<ShopCurrency, number>;
  listings: ShopListing[];
}
export interface ShopQuote {
  requestId: string; revision: string; offerId: string; quantity: number;
  currency: ShopCurrency; total: number; item: ShopOffer['item']; grant: number;
}
export interface ShopReceipt extends Omit<ShopQuote, 'revision' | 'requestId'> {
  kind: 'shopPurchase';
}

export function shopPeriod(period: ShopPeriod, now: number): { key: string; resetAt?: number } {
  if (period === 'permanent') return { key: 'permanent' };
  const day = Math.floor((now + VIETNAM_OFFSET) / DAY);
  if (period === 'daily') return { key: `d:${day}`, resetAt: (day + 1) * DAY - VIETNAM_OFFSET };
  // Unix epoch was Thursday. Local week starts Monday 00:00.
  const monday = Math.floor((day + 3) / 7) * 7 - 3;
  return { key: `w:${monday}`, resetAt: (monday + 7) * DAY - VIETNAM_OFFSET };
}

export function normalizeShopCounters(value: unknown): Record<string, ShopCounter> {
  if (!value || typeof value !== 'object') return {};
  const counters = value as Record<string, ShopCounter>;
  return Object.fromEntries(SHOP_OFFERS.flatMap(({ id }) => {
    const entry = Object.hasOwn(counters, id) ? counters[id] : undefined;
    return entry && typeof entry.period === 'string' && /^(?:[dw]:-?\d{1,12}|permanent)$/.test(entry.period) &&
      Number.isSafeInteger(entry.bought) && entry.bought > 0 ? [[id, { period: entry.period, bought: entry.bought }]] : [];
  }));
}

export function shopListing(save: SaveV2, offer: ShopOffer, now: number): ShopListing {
  const window = shopPeriod(offer.period, now);
  const counter = save.shopPurchases?.[offer.id];
  const used = counter?.period === window.key ? counter.bought : 0;
  const inventory = save.forge ? save : { ...save, forge: normalizeForge(undefined, save.clearedStages) };
  const owned = inventoryQuantity(inventory, offer.item);
  const max = Math.max(0, Math.min(SHOP_MAX_QUANTITY, offer.limit - used, Math.floor(save[offer.currency] / offer.price),
    Math.floor((Number.MAX_SAFE_INTEGER - owned) / offer.amount)));
  return { offer, used, owned, max, resetAt: window.resetAt };
}

export const activeShopOffer = (offer: ShopOffer, now: number) => offer.active &&
  (offer.activeFrom === undefined || offer.activeFrom <= now) && (offer.activeUntil === undefined || now < offer.activeUntil);

export function shopCatalog(save: SaveV2, now: number, checkoutEnabled: boolean): ShopCatalog {
  return { serverTime: now, checkoutEnabled, balances: { coins: save.coins, gems: save.gems },
    listings: SHOP_OFFERS.filter(offer => activeShopOffer(offer, now)).map(offer => shopListing(save, offer, now)) };
}

export function applyShopPurchase(save: SaveV2, offer: ShopOffer, quantity: number, now: number) {
  if (!activeShopOffer(offer, now) || !Number.isSafeInteger(quantity) || quantity < 1 ||
    quantity > shopListing(save, offer, now).max) return undefined;
  const state = structuredClone(save);
  if (!state.forge && (offer.item === ITEM_IDS.enhancementStone || offer.item === ITEM_IDS.forgeShard))
    state.forge = normalizeForge(undefined, state.clearedStages);
  const { key } = shopPeriod(offer.period, now);
  const used = shopListing(save, offer, now).used;
  const total = offer.price * quantity, grant = offer.amount * quantity;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(grant) || !changeInventory(state, offer.item, grant))
    return undefined;
  state[offer.currency] -= total;
  state.shopPurchases = { ...state.shopPurchases, [offer.id]: { period: key, bought: used + quantity } };
  const receipt: ShopReceipt = { kind: 'shopPurchase', offerId: offer.id, quantity, total, currency: offer.currency, item: offer.item, grant };
  return { state, receipt };
}
