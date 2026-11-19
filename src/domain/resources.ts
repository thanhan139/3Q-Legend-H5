import type { SaveV2 } from './types';

export const ITEM_IDS = {
  goldenKey: 'golden_key',
  heroExp: 'hero_exp',
  enhancementStone: 'enhancement_stone',
  forgeShard: 'forge_shard',
  jewelryEssence: 'jewelry_essence',
  legacyGem: 'legacy_gem',
} as const;

export type ItemId = typeof ITEM_IDS[keyof typeof ITEM_IDS] | `hero_shard:${string}`;
export const heroShardId = (heroId: string): ItemId => `hero_shard:${heroId}`;
export const walletBalance = (save: SaveV2) => ({ copper: save.copper ?? 0, gold: save.coins });

const saveFields = {
  [ITEM_IDS.goldenKey]: 'goldKeys',
  [ITEM_IDS.heroExp]: 'trainingExp',
  [ITEM_IDS.legacyGem]: 'gems',
} as const;

export function inventoryQuantity(save: SaveV2, id: ItemId): number {
  switch (id) {
    case ITEM_IDS.jewelryEssence: return save.jewelryEssence ?? 0;
    case ITEM_IDS.enhancementStone: return save.forge?.stones ?? 0;
    case ITEM_IDS.forgeShard: return save.forge?.shards ?? 0;
    case ITEM_IDS.goldenKey:
    case ITEM_IDS.heroExp:
    case ITEM_IDS.legacyGem: return save[saveFields[id]];
    default: return Object.hasOwn(save.heroShards, id.slice('hero_shard:'.length))
      ? save.heroShards[id.slice('hero_shard:'.length)] : 0;
  }
}

/** Write the existing SaveV2 fields so older saves and the cloud ledger stay compatible. */
export function changeInventory(save: SaveV2, id: ItemId, delta: number): boolean {
  const quantity = Math.min(Number.MAX_SAFE_INTEGER, inventoryQuantity(save, id) + delta);
  if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(quantity) || quantity < 0) return false;
  switch (id) {
    case ITEM_IDS.jewelryEssence:
      save.jewelryEssence = quantity;
      return true;
    case ITEM_IDS.enhancementStone:
      if (!save.forge) return false;
      save.forge.stones = quantity;
      return true;
    case ITEM_IDS.forgeShard:
      if (!save.forge) return false;
      save.forge.shards = quantity;
      return true;
    case ITEM_IDS.goldenKey:
    case ITEM_IDS.heroExp:
    case ITEM_IDS.legacyGem:
      save[saveFields[id]] = quantity;
      return true;
    default:
      save.heroShards = { ...save.heroShards, [id.slice('hero_shard:'.length)]: quantity };
      return true;
  }
}
