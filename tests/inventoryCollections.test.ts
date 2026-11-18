import { describe, expect, it } from 'vitest';
import { baseSave } from '../src/domain/store';
import { ITEM_IDS } from '../src/domain/resources';
import { COLLECTION_IDS, COLLECTION_INFO, collectionEntries, isCollectionId } from '../src/ui/inventoryCollections';
import { INVENTORY_CATEGORY_CONFIG } from '../src/ui/inventoryCategoryConfig';

describe('Túi Đồ · 13 live category routes', () => {
  it('preserves all thirteen icon IDs and opens an inventory collection instead of a dead end', () => {
    expect(COLLECTION_IDS).toHaveLength(13);
    expect(new Set(COLLECTION_IDS).size).toBe(13);
    expect(INVENTORY_CATEGORY_CONFIG.map(item => item.id)).toEqual([...COLLECTION_IDS]);
    expect(INVENTORY_CATEGORY_CONFIG.every(item => item.destination === 'Inventory')).toBe(true);
    for (const id of COLLECTION_IDS) {
      expect(isCollectionId(id)).toBe(true);
      expect(COLLECTION_INFO[id].label.length).toBeGreaterThan(0);
    }
    expect(isCollectionId('../../forge')).toBe(false);
    expect(isCollectionId(undefined)).toBe(false);
  });

  it('lists actual owned equipment and relics, without duplicate currencies or changing saves', () => {
    const save = baseSave();
    save.goldKeys = 4;
    save.equipment = [
      { uid: 'armor-one', itemId: 'armor', level: 2 },
      { uid: 'relic-one', itemId: 'jade', level: 3 },
      { uid: 'blade-one', itemId: 'dragonBlade', level: 1 },
    ];
    const previous = JSON.stringify(save);
    const gear = collectionEntries(save, 'trang_bi');
    const relics = collectionEntries(save, 'bao_vat');
    expect(gear.some(item => item.id === 'gear:armor-one' && item.destination?.scene === 'Equipment')).toBe(true);
    expect(gear.some(item => item.id === 'gear:blade-one')).toBe(true);
    expect(gear.some(item => item.id === 'gear:relic-one')).toBe(false);
    expect(relics).toHaveLength(1);
    expect(relics[0].id).toBe('gear:relic-one');
    expect(relics[0].description).toContain('Bảo Vật');
    expect(collectionEntries(save, 'dao_cu').some(item => item.id === ITEM_IDS.goldenKey && item.quantity === 4)).toBe(true);
    expect(JSON.stringify(save)).toBe(previous);
  });

  it('shows genuine forge materials and crafted weapons, never fabricated pet/soul/gem balances', () => {
    const save = baseSave();
    save.forge = { ...save.forge!, shards: 15 };
    save.equipment = [{ uid: 'forge-2', itemId: 'phoenixSpear', level: 1 }];
    const divine = collectionEntries(save, 'than_binh');
    expect(divine.find(item => item.id === ITEM_IDS.forgeShard)?.quantity).toBe(15);
    expect(divine.find(item => item.id === 'gear:forge-2')?.destination?.scene).toBe('Equipment');
    expect(collectionEntries(save, 'dao_cu').some(item => item.id === ITEM_IDS.forgeShard)).toBe(false);
    const unavailable = COLLECTION_IDS.filter(id => COLLECTION_INFO[id].state === 'planned');
    expect(unavailable.length).toBeGreaterThanOrEqual(7);
    for (const id of unavailable) expect(collectionEntries(save, id)).toEqual([]);
  });

  it('does not leak possessions between user snapshots', () => {
    const a = baseSave();
    const b = baseSave();
    a.equipment = [{ uid: 'uid-a-item', itemId: 'jade', level: 1 }];
    b.equipment = [];
    expect(collectionEntries(a, 'bao_vat')).toHaveLength(1);
    expect(collectionEntries(b, 'bao_vat')).toHaveLength(0);
  });
});
