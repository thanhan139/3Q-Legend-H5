import { expect, it } from 'vitest';
import { baseSave, GameStore, normalizeSave } from '../src/domain/store';
import { heroShardId, inventoryQuantity, ITEM_IDS, walletBalance } from '../src/domain/resources';
import { welfareDay } from '../src/domain/welfare';

it('preserves legacy currency, grants configured inventory rewards once and restores both offline', () => {
  const today = welfareDay();
  let raw = JSON.stringify({
    ...baseSave(), copper: 35, coins: 6200, gems: 450, heroes: ['zhang-fei', 'guan-yu', 'liu-bei', 'zhao-yun'],
    welfare: { checkInDay: today - 1, checkIns: 1, daily: { day: today, counts: {}, claimed: [] } },
  });
  const repo = { read: () => raw, write: (value: object) => { raw = JSON.stringify(value); } };
  const store = new GameStore(repo);
  expect(store.claimFirstTopupDemo()).toBe(true);
  expect(store.claimCheckIn(today)).toBe(true);
  expect(store.upgradeHero('liu-bei')).toBe(true);
  expect(store.claimDaily('upgrade', today)).toBe(true);
  const reopened = new GameStore(repo);
  const save = reopened.snapshot;
  expect(walletBalance(save)).toEqual({ copper: 35, gold: 7800 });
  expect(inventoryQuantity(save, ITEM_IDS.legacyGem)).toBe(465);
  expect(inventoryQuantity(save, ITEM_IDS.goldenKey)).toBe(7);
  expect(inventoryQuantity(save, ITEM_IDS.heroExp)).toBe(0);
  expect(inventoryQuantity(save, heroShardId('zhao-yun'))).toBe(10);
  expect(reopened.claimFirstTopupDemo()).toBe(false);
  expect(reopened.claimCheckIn(today)).toBe(false);
  expect(reopened.claimDaily('upgrade', today)).toBe(false);
});

it('does not convert a legacy balance into Đồng', () => {
  const save = normalizeSave({ ...baseSave(), coins: 321, gems: 654 });
  expect(walletBalance(save)).toEqual({ copper: 0, gold: 321 });
  expect(inventoryQuantity(save, ITEM_IDS.legacyGem)).toBe(654);
});
