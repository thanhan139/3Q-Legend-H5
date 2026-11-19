import { JEWELRY, normalizeJewelry, type JewelryRarity, type JewelrySlot } from '../domain/jewelry';
import type { SaveV2 } from '../domain/types';

export interface JewelryInventoryQuery {
  scope?: 'bag' | 'equipped';
  slot?: JewelrySlot;
  rarity?: JewelryRarity;
  page?: number;
  uid?: string;
  selectedSlot?: JewelrySlot;
}

const PAGE_SIZE = 12;

export function jewelryInventoryView(save: SaveV2, heroId: string, query: JewelryInventoryQuery = {}) {
  const allJewelry = normalizeJewelry(save.jewelry, save.heroes);
  const equippedJewelry = allJewelry.filter(item => item.heroId !== undefined);
  const bagJewelry = allJewelry.filter(item => item.heroId === undefined);
  const scoped = query.scope === 'equipped' ? equippedJewelry : bagJewelry;
  const results = scoped.filter(item => (!query.slot || JEWELRY[item.itemId].type === query.slot) &&
    (!query.rarity || JEWELRY[item.itemId].rarity === query.rarity));

  // The selected hero's slots can show details independently of the inventory filters.
  const slotItem = query.selectedSlot && equippedJewelry.find(item =>
    item.heroId === heroId && JEWELRY[item.itemId].type === query.selectedSlot);
  const selectedIndex = slotItem ? -1 : results.findIndex(item => item.uid === query.uid);
  const pageCount = Math.ceil(results.length / PAGE_SIZE);
  const page = selectedIndex >= 0 ? Math.floor(selectedIndex / PAGE_SIZE) :
    Math.max(0, Math.min(pageCount - 1, query.page ?? 0));
  const shown = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return { allJewelry, equippedJewelry, bagJewelry, shown, page, pageCount, total: results.length, scopeTotal: scoped.length,
    selected: slotItem || results[selectedIndex] || shown[0] };
}
