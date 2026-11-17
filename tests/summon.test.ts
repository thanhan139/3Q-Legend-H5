import {describe,expect,it} from 'vitest';
import {drawSummon} from '../src/domain/summon';
import { HEROES, SUMMON_RATES } from '../src/data/heroes';
import { baseSave, GameStore, normalizeSave } from '../src/domain/store';
import type { SaveV2 } from '../src/domain/types';

describe('Golden Key gacha domain',()=>{
  it('SSR at roll 0, pity reset',()=>{
    const draw=drawSummon(17,()=>0);
    expect(draw.rarity).toBe('SSR');
    expect(draw.pityAfter).toBe(0);
  });
  it('guarantees SSR at 50th draw',()=>{
    const draw=drawSummon(49,()=>0.99);
    expect(draw.rarity).toBe('SSR');
    expect(draw.guaranteed).toBe(true);
    expect(draw.pityAfter).toBe(0);
  });
  it('R on high roll before pity',()=>{
    const draw=drawSummon(0,()=>0.9);
    expect(draw.rarity).toBe('R');
    expect(draw.pityAfter).toBe(1);
  });
  it('rejects invalid rng',()=>expect(()=>drawSummon(1,()=>1)).toThrow());
});

it('uses the approved rates and nonempty real hero pools at every RNG boundary', () => {
  expect(Object.values(SUMMON_RATES).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  for (const [roll, rarity] of [[0, 'SSR'], [.041999, 'SSR'], [.042, 'SSS+'], [.049999, 'SSS+'], [.05, 'SR'], [.249999, 'SR'], [.25, 'R'], [.999999, 'R']] as const) {
    const draw = drawSummon(0, () => roll);
    expect(draw.rarity).toBe(rarity);
    expect(HEROES.find(h => h.id === draw.heroId)).toMatchObject({ rarity, summonable: true });
  }
});

it('keeps natural SSS+ at SSR pity and resets only the qualifying counters', () => {
  expect(drawSummon(49, () => .047, 90)).toMatchObject({ rarity: 'SSS+', pityAfter: 0, legendaryPityAfter: 0 });
  expect(drawSummon(20, () => 0, 60)).toMatchObject({ rarity: 'SSR', pityAfter: 0, legendaryPityAfter: 61 });
});

it('processes x10 sequentially across BOTH exact guarantees and persists duplicate Inventory shards', () => {
  let saved: SaveV2 = { ...baseSave(), goldKeys: 20, clearedStages: ['1-1', '1-2', '1-3'], summonPity: 45, legendaryPity: 95 };
  const store = new GameStore({ read: () => null, write: s => { saved = s; } }, saved);
  const result = store.summon(10, () => .99);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error('summon failed');
  expect(result.draws[3].rarity).toBe('R');
  expect(result.draws[4]).toMatchObject({ rarity: 'SSS+', pityAfter: 0, legendaryPityAfter: 0 });
  expect(saved.goldKeys).toBe(10);
  expect(Object.values(saved.heroShards).reduce((a, b) => a + b, 0)).toBe(80);
  const reloaded = new GameStore({ read: () => JSON.stringify(saved), write: () => {} });
  expect(reloaded.snapshot).toMatchObject({ legendaryPity: 5, summonPity: 5, lastSummon: result.draws });
});

it('rejects insufficient x10 atomically and preserves state on persistence failure', () => {
  const initial = { ...baseSave(), goldKeys: 9, clearedStages: ['1-1', '1-2', '1-3'] };
  const store = new GameStore({ read: () => null, write: () => { throw Error('disk'); } }, initial);
  expect(store.summon(10).ok).toBe(false);
  expect(store.summon(1).ok).toBe(false);
  expect(store.snapshot).toEqual(initial);
});

it('preserves an old near-guarantee and its owned heroes, resources and prior result on legacy normalization', () => {
  const old = { ...baseSave(), legendaryPity: 187, goldKeys: 27 };
  expect(normalizeSave(old)).toMatchObject({ legendaryPity: 99, goldKeys: 27, heroes: old.heroes });
});

it('draws only the two released SSS+ heroes and applies the independent 100-pull guarantee', () => {
  const draws = [0, 0.99].map(pick => {
    const rolls = [0.047, pick];
    return drawSummon(20, () => rolls.shift()!, 40);
  });
  expect(draws.map(draw => draw.heroId)).toEqual(['lu-bu', 'zhuge-liang']);
  expect(draws.every(draw => draw.rarity === 'SSS+' && draw.pityAfter === 0 && draw.legendaryPityAfter === 0)).toBe(true);
  expect(drawSummon(49, () => 0.99, 99)).toMatchObject({ rarity: 'SSS+', guaranteed: true });
  expect(drawSummon(49, () => 0.99, 98)).toMatchObject({ rarity: 'SSR', legendaryPityAfter: 99 });
});

it('classifies the active roster from the requested list and keeps roadmap heroes out', async () => {
  const { HeroConfig } = await import('../src/data/heroes');
  const expected = {
    R: ['pan-feng', 'xing-dao-rong', 'cheng-yuan-zhi', 'pei-yuan-shao'],
    SR: ['hua-xiong', 'da-qiao', 'huang-yueying', 'guan-ping', 'zhou-cang', 'cao-hong'],
    SSR: ['liu-bei', 'guan-yu', 'zhang-fei', 'zhao-yun', 'ma-chao', 'cao-cao', 'xiahou-dun',
      'dian-wei', 'sun-quan', 'gan-ning', 'diao-chan'],
    'SSS+': ['lu-bu', 'zhuge-liang'],
  };
  for (const rarity of HeroConfig.rarities) {
    expect(HeroConfig.roster.filter(hero => hero.rarity === rarity).map(hero => hero.id).sort())
      .toEqual(expected[rarity].sort());
  }
});
