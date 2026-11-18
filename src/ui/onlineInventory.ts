import type { Rarity } from '../domain/types';
import type { InventoryEntry } from './inventoryModel';
import { isCollectionId, type CollectionId } from './inventoryCollections';

export interface OwnedOnlineItem {
  id: string; categoryId: CollectionId; quantity: number; name: string; description: string; rarity: Rarity;
}
/** Treat REST rows as untrusted; only display positive, server-confirmed quantities. */
export function parseOnlineRows(raw: unknown): OwnedOnlineItem[] {
  if (!Array.isArray(raw)) return [];
  const results: OwnedOnlineItem[] = [], seen = new Set<string>();
  for (const value of raw) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const item = row.item;
    if (!item || Array.isArray(item) || typeof item !== 'object') continue;
    const detail = item as Record<string, unknown>;
    const id = row.item_id, quantity = row.quantity;
    if (typeof id !== 'string' || !/^[a-z0-9_:-]{1,80}$/.test(id) ||
      seen.has(id) || !Number.isSafeInteger(quantity) || (quantity as number) <= 0 ||
      !isCollectionId(detail.category_id) || typeof detail.name_vi !== 'string' ||
      !detail.name_vi.trim() || typeof detail.description_vi !== 'string' ||
      !['R','SR','SSR','SSS+'].includes(String(detail.rarity))) continue;
    seen.add(id);
    results.push({ id, categoryId: detail.category_id, quantity: quantity as number,
      name: detail.name_vi, description: detail.description_vi, rarity: detail.rarity as Rarity });
  }
  return results;
}
export function onlineCollectionEntries(items: readonly OwnedOnlineItem[], category: CollectionId): InventoryEntry[] {
  return items.filter(item => item.categoryId === category).map(item => ({
    id: 'online:' + item.id, name: item.name, quantity: item.quantity,
    category: 'items', rarity: item.rarity, description: item.description,
    textureKey: 'inventory.category.' + item.categoryId,
  }));
}
