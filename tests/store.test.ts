import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const storageKey = '3q-legend-h5-save-v1';
let saves: Map<string, string>;

async function openStore() {
  vi.resetModules();
  return (await import('../src/domain/store')).gameStore;
}

beforeEach(() => {
  saves = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => saves.get(key) ?? null,
    setItem: (key: string, value: string) => saves.set(key, value),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('Offline progression', () => {
  it('unlocks stages in order and grants first-clear rewards once across reload', async () => {
    const store = await openStore();
    expect(store.completeStage('1-2').firstClear).toBe(false);
    expect(store.summon(1).ok).toBe(false);
    for (const id of ['1-1', '1-2', '1-3']) expect(store.completeStage(id).firstClear).toBe(true);
    const afterClear = store.snapshot;
    const reloaded = await openStore();
    expect(reloaded.snapshot).toEqual(afterClear);
    expect(reloaded.nextStageId()).toBe('1-4');
    expect(reloaded.completeStage('1-3').firstClear).toBe(false);
    expect(reloaded.snapshot.goldKeys).toBe(7);
  });

  it('preserves six unique formation slots and handles old partial saves', async () => {
    saves.set(storageKey, JSON.stringify({ schemaVersion: 1, heroes: ['guan-yu', 'constructor'] }));
    const store = await openStore();
    expect(store.snapshot.heroes).toEqual(['guan-yu']);
    expect(store.snapshot.formation).toEqual([null, 'guan-yu', null, null, null, null]);
    expect(store.updateFormation(5, 'guan-yu')).toBe(true);
    expect(store.updateFormation(6, 'guan-yu')).toBe(false);
    expect(store.updateFormation(0, 'zhang-fei')).toBe(false);
    expect((await openStore()).snapshot.formation).toEqual([null, null, null, null, null, 'guan-yu']);
  });

  it('converts duplicate summons to shards and grants new milestone heroes', async () => {
    const store = await openStore();
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1']) store.completeStage(id);
    expect(store.snapshot.heroes).toContain('zhao-yun');
    expect(store.summon(1, () => 0).ok).toBe(true);
    expect(store.snapshot.heroShards['zhao-yun']).toBe(10);
    expect(store.snapshot.heroes.filter(id => id === 'zhao-yun')).toHaveLength(1);
    expect(store.snapshot.goldKeys).toBe(6);
  });

  it('claims the first-topup demo only once across reload', async () => {
    const store = await openStore();
    expect(store.claimFirstTopupDemo()).toBe(true);
    const reloaded = await openStore();
    expect(reloaded.claimFirstTopupDemo()).toBe(false);
    expect(reloaded.snapshot).toMatchObject({ coins: 6000, goldKeys: 7, firstTopupDemoClaimed: true });
    expect(reloaded.snapshot.heroes).toContain('zhao-yun');
  });
});

describe('M3 training and campaign rewards', () => {
  it('migrates a legacy save, credits old clears once and preserves its existing state', async () => {
    const legacy = {
      schemaVersion: 1, playerName: 'Legacy', heroes: ['guan-yu'], formation: ['guan-yu', null, null, null, null, null],
      clearedStages: ['1-1', '1-1', '1-2'], coins: 6110, gems: 20, goldKeys: 4,
      heroShards: { 'guan-yu': 10 }, summonPity: 7, firstTopupDemoClaimed: true,
    };
    saves.set(storageKey, JSON.stringify(legacy));
    const store = await openStore();
    expect(store.snapshot).toMatchObject({ ...legacy, schemaVersion: 2,
      clearedStages: ['1-1', '1-2'], trainingExp: 600, heroExp: {} });
    expect(JSON.parse(saves.get(storageKey)!).schemaVersion).toBe(2);
    expect(store.upgradeHero('guan-yu')).toBe(true);
    expect((await openStore()).snapshot).toEqual(store.snapshot);
  });

  it('only pays first clear and unlocks the next chapter, summon and milestone heroes', async () => {
    const store = await openStore();
    expect(store.completeStage('1-2').firstClear).toBe(false);
    expect(store.snapshot.trainingExp).toBe(0);
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1']) {
      expect(store.completeStage(id).firstClear).toBe(true);
    }
    expect(store.snapshot.trainingExp).toBe(2100);
    expect(store.isSummonUnlocked()).toBe(true);
    expect(store.snapshot.heroes).toContain('zhao-yun');
    const reloaded = await openStore();
    expect(reloaded.completeStage('2-1').firstClear).toBe(false);
    expect(reloaded.snapshot).toEqual(store.snapshot);
  });

  it('charges only owned heroes, handles insufficient EXP and stops at level cap', async () => {
    const store = await openStore();
    expect(store.upgradeHero('zhang-fei')).toBe(false);
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5']) store.completeStage(id);
    expect(store.upgradeHero('zhao-yun')).toBe(false);
    for (let i = 0; i < 14; i++) expect(store.upgradeHero('zhang-fei')).toBe(true);
    expect(store.upgradeHero('zhang-fei')).toBe(false);
    expect(store.snapshot.heroExp['zhang-fei']).toBe(1400);
    expect(store.snapshot.heroExp['guan-yu']).toBeUndefined();
    expect(store.snapshot.trainingExp).toBe(300);
    for (let i = 0; i < 3; i++) expect(store.upgradeHero('guan-yu')).toBe(true);
    expect(store.upgradeHero('guan-yu')).toBe(false);
    expect(store.snapshot.trainingExp).toBe(0);
  });
});

describe('Golden Key summon receipt', () => {
  it('processes pity and duplicates sequentially and keeps the receipt after reload', async () => {
    const initial = (await openStore()).snapshot;
    saves.set(storageKey, JSON.stringify({
      ...initial, clearedStages: ['1-3'], goldKeys: 10, summonPity: 49,
    }));
    const store = await openStore();
    const result = store.summon(10, () => 0.99);
    if (!result.ok) throw new Error(result.reason);
    expect(result.draws[0]).toMatchObject({ rarity: 'SSR', guaranteed: true, pityAfter: 0 });
    expect(result.draws[1].shards).toBe(0);
    expect(result.draws.slice(2).every(draw => draw.shards === 10)).toBe(true);
    expect(store.snapshot).toMatchObject({ goldKeys: 0, summonPity: 9, lastSummon: result.draws });
    expect(store.summon(1).ok).toBe(false);
    const reloaded = await openStore();
    expect(reloaded.snapshot).toEqual(store.snapshot);
    expect(reloaded.snapshot.heroShards[result.draws[1].heroId]).toBe(80);
    expect(reloaded.updateFormation(5, result.draws[0].heroId)).toBe(true);
    expect((await openStore()).snapshot.formation[5]).toBe(result.draws[0].heroId);
  });

  it('preserves wallet and roster when the save write fails', async () => {
    const store = await openStore();
    for (const id of ['1-1', '1-2', '1-3']) store.completeStage(id);
    const before = store.snapshot;
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('storage full'); });
    expect(store.summon(1, () => 0).ok).toBe(false);
    expect(store.snapshot).toEqual(before);
    expect((await openStore()).snapshot).toEqual(before);
  });
});

describe('Hero ascension', () => {
  it('spends only the selected hero shards and persists stars for real battle stats', async () => {
    const baseline = (await openStore()).snapshot;
    saves.set(storageKey, JSON.stringify({ ...baseline, heroShards: { 'zhang-fei': 20, 'guan-yu': 9 } }));
    const store = await openStore();
    expect(store.upgradeHeroStar('zhao-yun')).toBe(false);
    expect(store.upgradeHeroStar('guan-yu')).toBe(false);
    expect(store.upgradeHeroStar('zhang-fei')).toBe(true);
    expect(store.upgradeHeroStar('zhang-fei')).toBe(false);
    const { formation, heroExp, heroStars, heroShards } = (await openStore()).snapshot;
    expect(heroShards).toEqual({ 'zhang-fei': 0, 'guan-yu': 9 });
    expect(heroStars).toEqual({ 'zhang-fei': 2 });
    const { makeStageBattle } = await import('../src/domain/battle');
    const { STAGES } = await import('../src/data/campaign');
    const before = makeStageBattle(STAGES[0], formation, heroExp);
    const after = makeStageBattle(STAGES[0], formation, heroExp, heroStars);
    expect(after.units[0].maxHp).toBe(Math.round(before.units[0].maxHp * 1.08));
    expect(after.units[0].atk).toBeGreaterThan(before.units[0].atk);
    expect(after.units[0].def).toBeGreaterThan(before.units[0].def);
    expect(after.units.slice(1)).toEqual(before.units.slice(1));
  });
});

describe('Welfare rewards', () => {
  it('loads missing welfare state, claims seven days once, and starts a new cycle', async () => {
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, welfare: { daily: { counts: null } } }));
    let store = await openStore();
    const baseline = store.snapshot;
    for (let day = 100; day < 107; day++) {
      expect(store.claimCheckIn(day)).toBe(true);
      expect(store.claimCheckIn(day)).toBe(false);
      store = await openStore();
      expect(store.claimCheckIn(day)).toBe(false);
    }
    expect(store.snapshot.goldKeys).toBe(baseline.goldKeys + 5);
    expect(store.snapshot.trainingExp).toBe(baseline.trainingExp + 850);
    expect(store.claimCheckIn(105)).toBe(false);
    expect(store.claimCheckIn(107)).toBe(true);
    expect(store.snapshot.welfare?.checkIns).toBe(1);
  });

  it('claims real daily progress once and resets at midnight Vietnam time', async () => {
    const { welfareDay } = await import('../src/domain/welfare');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-13T16:59:59Z'));
    try {
      let store = await openStore();
      expect(store.claimDaily('win')).toBe(false);
      store.completeStage('1-1', 'player');
      expect(store.claimDaily('win')).toBe(true);
      store.completeStage('1-1', 'enemy');
      store.completeStage('1-1', 'enemy');
      expect(store.claimDaily('battle')).toBe(true);
      store = await openStore();
      expect(store.claimDaily('win')).toBe(false);
      const previous = welfareDay();
      clock.mockReturnValue(Date.parse('2026-11-13T17:00:00Z'));
      expect(welfareDay()).toBe(previous + 1);
      expect(store.claimDaily('battle')).toBe(false);
      store.completeStage('1-1', 'player');
      expect(store.claimDaily('win')).toBe(true);
      expect(store.claimDaily('battle')).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it('does not change the wallet if writing the claim fails', async () => {
    const store = await openStore();
    const previous = store.snapshot;
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw Error('full'); });
    expect(store.claimCheckIn()).toBe(false);
    expect(store.snapshot).toEqual(previous);
    expect(store.claimCheckIn()).toBe(true);
  });
});

describe('Equipment', () => {
  it('grants one item on first clear and credits old clears without paying campaign rewards again', async () => {
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, clearedStages: ['1-1'], coins: 900 }));
    const store = await openStore();
    expect(store.snapshot.equipment).toEqual([{ uid: 'campaign:1-1', itemId: 'armor', level: 1 }]);
    expect(store.completeStage('1-1', 'player').firstClear).toBe(false);
    expect(store.completeStage('1-2', 'enemy').firstClear).toBe(false);
    expect(store.completeStage('1-2', 'player').rewards).toContain('Truy Phong Ngoa');
    expect((await openStore()).snapshot.equipment).toHaveLength(2);
    expect(store.snapshot.coins).toBe(1160);
  });

  it('blocks sharing an equipped instance and atomically replaces an occupied slot', async () => {
    const store = await openStore();
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1']) store.completeStage(id);
    expect(store.equipGear('campaign:1-1', 'guan-yu')).toBe(true);
    expect(store.equipGear('campaign:1-1', 'liu-bei')).toBe(false);
    expect(store.equipGear('campaign:2-1', 'unknown')).toBe(false);
    expect(store.equipGear('campaign:2-1', 'guan-yu')).toBe(true);
    expect(store.snapshot.equipment?.find(item => item.uid === 'campaign:1-1')?.heroId).toBeUndefined();
    expect(store.equipGear('campaign:1-1', 'liu-bei')).toBe(true);
    expect(store.unequipGear('campaign:2-1')).toBe(true);
    expect(store.unequipGear('campaign:2-1')).toBe(false);
    expect((await openStore()).snapshot).toEqual(store.snapshot);
  });

  it('spends real gold, preserves the state on write failure, and rejects insufficient funds and max level', async () => {
    const gear = { uid: 'campaign:1-1', itemId: 'armor', level: 1 };
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, coins: 250, equipment: [gear] }));
    const store = await openStore();
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw Error('full'); });
    expect(store.enhanceGear(gear.uid)).toBe(false);
    expect(store.snapshot).toMatchObject({ coins: 250, equipment: [gear] });
    expect(store.enhanceGear(gear.uid)).toBe(true);
    expect(store.enhanceGear(gear.uid)).toBe(false);
    expect((await openStore()).snapshot).toMatchObject({ coins: 0, equipment: [{ ...gear, level: 2 }] });
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, coins: 9000, equipment: [{ ...gear, level: 10 }] }));
    expect((await openStore()).enhanceGear(gear.uid)).toBe(false);
  });

  it('uses equipped HP, ATK, DEF and SPD in combat and leaves other units unchanged', async () => {
    const store = await openStore();
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5']) store.completeStage(id);
    for (const id of ['1-1', '1-2', '1-5']) expect(store.equipGear('campaign:' + id, 'zhang-fei')).toBe(true);
    expect(store.enhanceGear('campaign:1-5')).toBe(true);
    const { formation, equipment } = (await openStore()).snapshot;
    const { makeStageBattle } = await import('../src/domain/battle');
    const { STAGES } = await import('../src/data/campaign');
    const { combatPower } = await import('../src/domain/progression');
    const before = makeStageBattle(STAGES[0], formation).units;
    const after = makeStageBattle(STAGES[0], formation, {}, {}, equipment).units;
    expect(after[0]).toMatchObject({
      maxHp: before[0].maxHp + 50, hp: before[0].hp + 50,
      atk: Math.round((145 + 28) * 1.04), def: before[0].def + 11, speed: before[0].speed + 4,
      nextActionAt: 100 / (before[0].speed + 4),
    });
    expect(combatPower(after[0])).toBeGreaterThan(combatPower(before[0]));
    expect(after.slice(1)).toEqual(before.slice(1));
  });
});

describe('Equipment rarity', () => {
  it('stops each rarity exactly at its configured enhancement cap', async () => {
    const items = [
      { uid: 'r', itemId: 'armor', level: 5 },
      { uid: 'sr', itemId: 'eliteArmor', level: 10 },
      { uid: 'ssr', itemId: 'imperialArmor', level: 15 },
    ];
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, coins: 100000, equipment: items }));
    const store = await openStore();
    for (const item of items) {
      expect(store.enhanceGear(item.uid)).toBe(true);
      const after = store.snapshot;
      expect(store.enhanceGear(item.uid)).toBe(false);
      expect(store.snapshot).toEqual(after);
    }
    expect((await openStore()).snapshot.equipment?.map(item => item.level)).toEqual([6, 11, 16]);
  });

  it('keeps an old over-cap item, its owner and full stats across save and reload', async () => {
    const item = { uid: 'campaign:1-1', itemId: 'armor', level: 10, heroId: 'zhang-fei' };
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, coins: 9000, clearedStages: ['1-1'], equipment: [item] }));
    const store = await openStore();
    const { gearStats } = await import('../src/domain/equipment');
    expect(store.enhanceGear(item.uid)).toBe(false);
    expect(store.snapshot.equipment).toEqual([item]);
    expect(gearStats(store.snapshot.equipment![0])).toMatchObject({ hp: 105, def: 29 });
    expect(store.unequipGear(item.uid)).toBe(true);
    expect(store.equipGear(item.uid, 'zhang-fei')).toBe(true);
    expect((await openStore()).snapshot.equipment).toEqual([item]);
  });

  it('keeps SSR late and awards new milestones at most once across reload', async () => {
    const { STAGES } = await import('../src/data/campaign');
    const { EQUIPMENT } = await import('../src/domain/equipment');
    const store = await openStore();
    for (const stage of STAGES.slice(0, -2)) store.completeStage(stage.id, 'player');
    const rarities = () => store.snapshot.equipment?.map(item => EQUIPMENT[item.itemId].rarity);
    expect(rarities()).toContain('R');
    expect(rarities()).toContain('SR');
    expect(rarities()).not.toContain('SSR');
    expect(store.completeStage('3-4', 'enemy').firstClear).toBe(false);
    expect(store.completeStage('3-4', 'player').rewards).toContain('Kim Long Giáp');
    expect(rarities()).toContain('SSR');
    const reload = await openStore();
    expect(reload.completeStage('3-4', 'player').firstClear).toBe(false);
    expect(reload.snapshot.equipment?.filter(item => item.uid === 'campaign:3-4')).toHaveLength(1);
  });

  it('filters and sorts gear and carries same-slot rarity differences into battle and power', async () => {
    const { queryGear } = await import('../src/domain/equipment');
    const { STAGES } = await import('../src/data/campaign');
    const { makeStageBattle } = await import('../src/domain/battle');
    const { combatPower } = await import('../src/domain/progression');
    const armor = (['armor', 'eliteArmor', 'imperialArmor'] as const).map(itemId =>
      ({ uid: itemId, itemId, level: 3, heroId: 'zhang-fei' }));
    const boots = { uid: 'boots', itemId: 'boots', level: 5 } as const;
    const items = [...armor, boots];
    expect(queryGear(items, { rarity: 'SR', slot: 'armor', stat: 'def', minimum: 2 })).toEqual([armor[1]]);
    expect(queryGear(items, { slot: 'armor', stat: 'speed' })).toEqual([]);
    expect(queryGear(items, { sort: 'hp' }).slice(0, 3)).toEqual([...armor].reverse());
    expect(queryGear(items, { sort: 'enhancement' })[0]).toEqual(boots);
    expect(queryGear(items, { sort: 'slot' }).at(-1)).toEqual(boots);
    const powers = armor.map(item => {
      const [unit] = makeStageBattle(STAGES[0], ['zhang-fei'], {}, {}, [item]).units;
      return combatPower({ ...unit, hp: unit.maxHp });
    });
    expect(powers[2]).toBeGreaterThan(powers[1]);
    expect(powers[1]).toBeGreaterThan(powers[0]);
  });
});

describe('Thần Binh economy', () => {
  it('awards milestones and caps distinct repeat wins per Vietnam week across reload', async () => {
    const { STAGES } = await import('../src/data/campaign');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-15T16:59:59Z'));
    try {
      let store = await openStore();
      for (const stage of STAGES) store.completeStage(stage.id, 'player', stage.id);
      expect(store.snapshot.forge?.shards).toBe(35);
      expect(store.snapshot.equipment?.some(item => item.uid === 'campaign:2-5')).toBe(false);
      expect(store.completeStage('2-5', 'player', '2-5').rewards).toEqual([]);
      expect(store.completeStage('2-5', 'enemy', 'lost').rewards).toEqual([]);
      for (const id of ['a','b','c']) {
        expect(store.completeStage('2-5', 'player', id).rewards).toEqual(['5 Mảnh Thần Binh']);
      }
      store = await openStore();
      expect(store.completeStage('2-5', 'player', 'a').rewards).toEqual([]);
      expect(store.completeStage('2-5', 'player', 'd').rewards).toEqual([]);
      expect(store.snapshot.forge?.shards).toBe(50);
      clock.mockReturnValue(Date.parse('2026-11-15T17:00:00Z'));
      expect(store.completeStage('2-5', 'player', 'd').rewards).toEqual([]);
      expect(store.completeStage('2-5', 'player', 'e').rewards).toEqual(['5 Mảnh Thần Binh']);
    } finally { clock.mockRestore(); }
  });

  it('backfills first-clear shards and retains previously earned gear', async () => {
    const jade = { uid: 'campaign:2-5', itemId: 'jade', level: 4 };
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, clearedStages: ['2-5','3-5'], equipment: [jade] }));
    const store = await openStore();
    expect(store.snapshot.forge?.shards).toBe(35);
    expect(store.snapshot.equipment).toContainEqual(jade);
  });

  it('rolls back failed writes and settles one forge request only once', async () => {
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, forge: { shards: 100 } }));
    const store = await openStore();
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw Error('full'); });
    expect(store.forgeWeapon('dragonBlade', 0)).toBe(false);
    expect(store.snapshot.forge?.shards).toBe(100);
    expect(store.snapshot.equipment).toBeUndefined();
    expect(store.forgeWeapon('dragonBlade', 0)).toBe(true);
    const reload = await openStore();
    expect(reload.forgeWeapon('dragonBlade', 0)).toBe(false);
    expect(reload.snapshot.forge?.shards).toBe(50);
    expect(reload.snapshot.equipment).toEqual([{ uid: 'forge:1', itemId: 'dragonBlade', level: 1, prestigeSkin: true }]);
    const { gearStats } = await import('../src/domain/equipment');
    const stats = gearStats(reload.snapshot.equipment![0]);
    expect(reload.togglePrestigeSkin('forge:1')).toBe(true);
    expect(gearStats((await openStore()).snapshot.equipment![0])).toEqual(stats);
  });

  it('does not spend a weekly slot when storage fails and disables the premium demo in production', async () => {
    const store = await openStore();
    const { STAGES } = await import('../src/data/campaign');
    for (const stage of STAGES.slice(0, 10)) store.completeStage(stage.id, 'player');
    const before = store.snapshot;
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw Error('full'); });
    expect(store.completeStage('2-5', 'player', 'retry').rewards).toEqual([]);
    expect(store.snapshot).toEqual(before);
    expect(store.completeStage('2-5', 'player', 'retry').rewards).toEqual(['5 Mảnh Thần Binh']);
    vi.stubEnv('DEV', false);
    try {
      expect(store.claimPremiumForgeDemo('dragonBlade')).toBe(false);
      expect(store.snapshot.forge?.premiumClaimed).toBe(false);
    } finally { vi.unstubAllEnvs(); }
  });

  it('lets free and premium gear reach the same cap and grants the demo once', async () => {
    saves.set(storageKey, JSON.stringify({ schemaVersion: 2, coins: 200000, forge: { shards: 50 } }));
    const store = await openStore();
    expect(store.forgeWeapon('dragonBlade', 0)).toBe(true);
    expect(store.claimPremiumForgeDemo('phoenixSpear')).toBe(true);
    expect(store.claimPremiumForgeDemo('dragonBlade')).toBe(false);
    expect(store.snapshot.forge?.stones).toBe(5);
    const coins = store.snapshot.coins;
    expect(store.enhanceGear('forge:premium', true)).toBe(true);
    expect(store.snapshot.coins).toBe(coins);
    expect(store.snapshot.forge?.stones).toBe(4);
    for (let i = 0; i < 15; i++) expect(store.enhanceGear('forge:1')).toBe(true);
    for (let i = 1; i < 15; i++) expect(store.enhanceGear('forge:premium')).toBe(true);
    expect(store.enhanceGear('forge:1')).toBe(false);
    expect(store.enhanceGear('forge:premium', true)).toBe(false);
    expect(store.snapshot.forge?.stones).toBe(4);
  });
});

describe('Hero rarity reclassification', () => {
  it('keeps old hero progress, formation and summon receipts after rarity changes', async () => {
    saves.set(storageKey, JSON.stringify({
      schemaVersion: 2, heroes: ['guan-yu'], formation: ['guan-yu'], heroExp: { 'guan-yu': 230 },
      heroStars: { 'guan-yu': 3 }, summonPity: 38,
      lastSummon: [{ heroId: 'guan-yu', rarity: 'SR', pityAfter: 38, guaranteed: false, shards: 10 }],
    }));
    const store = await openStore();
    expect(store.snapshot).toMatchObject({ heroExp: { 'guan-yu': 230 }, heroStars: { 'guan-yu': 3 },
      summonPity: 38, legendaryPity: 0, lastSummon: [{ heroId: 'guan-yu', rarity: 'SR' }] });
    expect(store.snapshot.formation[0]).toBe('guan-yu');
  });

  it('blocks duplicate hero families in battle and moves a hero when changing slots', async () => {
    const store = await openStore();
    const { HERO_BY_ID } = await import('../src/data/heroes');
    HERO_BY_ID['guan-awakened-test'] = { ...HERO_BY_ID['guan-yu'], id: 'guan-awakened-test', baseHeroId: 'guan-yu' };
    try {
      const seed = { ...store.snapshot, heroes: ['guan-yu', 'guan-awakened-test'], formation: ['guan-yu', 'guan-awakened-test'] };
      const { makeStageBattle } = await import('../src/domain/battle');
      const { STAGES } = await import('../src/data/campaign');
      expect(() => makeStageBattle(STAGES[0], seed.formation)).toThrow('Duplicate hero family');
      expect(store.updateFormation(5, 'guan-yu')).toBe(true);
      expect(store.snapshot.formation.filter(id => id === 'guan-yu')).toHaveLength(1);
    } finally { delete HERO_BY_ID['guan-awakened-test']; }
  });
});

it('recomputes faction thresholds from the saved formation after a replacement', async () => {
  const { factionSynergy } = await import('../src/domain/factionSynergy');
  saves.set(storageKey, JSON.stringify({ schemaVersion: 2,
    heroes: ['guan-yu', 'zhang-fei', 'lu-bu'], formation: ['guan-yu', 'zhang-fei'] }));
  const store = await openStore();
  expect(factionSynergy(store.snapshot.formation)[0].tier).toBe(2);
  expect(store.updateFormation(1, 'lu-bu')).toBe(true);
  const restored = await openStore();
  expect(restored.snapshot.formation.slice(0, 2)).toEqual(['guan-yu', 'lu-bu']);
  expect(factionSynergy(restored.snapshot.formation)[0].bonus).toBe(0);
});

it('forges all six signatures and keeps normal and signature weapon slots separate after reload', async () => {
  const { signatureIds } = await import('../src/data/signatureConfig');
  saves.set(storageKey, JSON.stringify({ schemaVersion: 2, coins: 5000, forge: { shards: 300 },
    equipment: [{ uid: 'old', itemId: 'blade', level: 4, heroId: 'guan-yu' }] }));
  const store = await openStore();
  signatureIds.forEach((id, index) => expect(store.forgeWeapon(id, index)).toBe(true));
  expect(store.snapshot.forge?.shards).toBe(0);
  expect(store.equipGear('forge:1', 'guan-yu')).toBe(true);
  expect(store.equipGear('forge:1', 'zhang-fei')).toBe(false);
  expect(store.enhanceGear('forge:1')).toBe(true);
  const reloaded = await openStore();
  expect(reloaded.snapshot.equipment?.filter(item => item.heroId === 'guan-yu')).toEqual([
    { uid: 'old', itemId: 'blade', level: 4, heroId: 'guan-yu' },
    { uid: 'forge:1', itemId: 'azureMoon', level: 2, heroId: 'guan-yu', prestigeSkin: true },
  ]);
  expect(reloaded.equipGear('forge:2', 'guan-yu')).toBe(true);
  expect(reloaded.snapshot.equipment?.find(item => item.uid === 'forge:1')?.heroId).toBeUndefined();
  expect(reloaded.unequipGear('forge:2')).toBe(true);
});
