import { describe, expect, it } from 'vitest';
import { baseSave } from '../src/domain/store';
import { ITEM_IDS, heroShardId } from '../src/domain/resources';
import { inventoryEntries, filterInventory, INVENTORY_CATEGORIES } from '../src/ui/inventoryModel';
import { inventoryLayout } from '../src/ui/inventoryLayout';

describe('Inventory presentation boundary', () => {
  it('reads exact owned quantities without changing saves or turning currencies into inventory', () => {
    const save = { ...baseSave(), goldKeys: 3, trainingExp: 2550, coins: 98760, copper: 500000, gems: 300,
      heroShards: { 'pei-yuan-shao': 20, 'missing-hero': 999 } };
    const before = JSON.stringify(save), entries = inventoryEntries(save);
    expect(entries.find(e => e.id === ITEM_IDS.goldenKey)?.quantity).toBe(3);
    expect(entries.find(e => e.id === ITEM_IDS.heroExp)?.quantity).toBe(2550);
    expect(entries.find(e => e.id === heroShardId('pei-yuan-shao'))?.quantity).toBe(20);
    expect(entries.some(e => e.id.includes('missing-hero'))).toBe(false);
    expect(entries.some(e => e.quantity === save.copper || e.quantity === save.coins)).toBe(false);
    expect(JSON.stringify(save)).toBe(before);
  });
  it('does not retain items between independent save/UID snapshots', () => {
    const first = { ...baseSave(), heroShards: { 'da-qiao': 10 } };
    const second = { ...baseSave(), heroShards: { 'guan-yu': 30 } };
    expect(filterInventory(inventoryEntries(first), 'fragments').map(e => e.id)).toEqual([heroShardId('da-qiao')]);
    expect(filterInventory(inventoryEntries(second), 'fragments').map(e => e.id)).toEqual([heroShardId('guan-yu')]);
  });
  it('has an actual empty state and disjoint filters, with no direct-use commands invented', () => {
    const save = { ...baseSave(), goldKeys: 0, trainingExp: 0, gems: 0, heroShards: {} };
    expect(inventoryEntries(save)).toEqual([]);
    const populated = inventoryEntries({ ...save, goldKeys: 1, trainingExp: 2, heroShards: { 'da-qiao': 10 } });
    expect(filterInventory(populated, 'items').map(e => e.id)).toEqual([ITEM_IDS.goldenKey]);
    expect(filterInventory(populated, 'resources').map(e => e.id)).toEqual([ITEM_IDS.heroExp]);
    expect(filterInventory(populated, 'divine')).toEqual([]);
    expect(INVENTORY_CATEGORIES).toHaveLength(13);
  });
  it.each([[1280, 720, false], [1558, 720, true], [1920, 1080, false]] as const)(
    'supports an unbounded grid and keeps the final row reachable at %ix%i', (width, height, compact) => {
      const l = inventoryLayout(width, height, compact);
      expect(l.columns).toBe(compact ? 3 : 5);
      expect(l.maxScroll(0)).toBe(0);
      const last = l.cell(102);
      expect(last.y + last.height - l.maxScroll(103)).toBeCloseTo(l.viewport.y + l.viewport.height);
      expect(l.tabs[4].x + l.tabs[4].width).toBeLessThanOrEqual(width);
      expect(l.detail.y).toBeGreaterThanOrEqual(0);
      expect(l.detail.y + l.detail.height).toBeLessThanOrEqual(height);
    });
});
