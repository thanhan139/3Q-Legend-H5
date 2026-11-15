import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/data/campaign';
import { FactionConfig } from '../src/data/factions';
import { HERO_BY_ID, heroFaction } from '../src/data/heroes';
import { makeStageBattle } from '../src/domain/battle';
import { factionSynergy } from '../src/domain/factionSynergy';
import { combatPower, heroStats } from '../src/domain/progression';

const shu = ['guan-yu', 'zhang-fei', 'liu-bei', 'zhao-yun', 'guan-ping', 'zhou-cang'];

describe('Faction synergy', () => {
  it('uses only the highest 2/4/6 tier', () => {
    for (const tier of [2, 4, 6] as const) {
      const roster = shu.slice(0, tier);
      const entry = factionSynergy(roster)[0];
      expect(entry).toMatchObject({ tier, count: tier, bonus: FactionConfig.shu.bonuses[tier] });
      const [unit] = makeStageBattle(STAGES[0], roster).units;
      expect(unit.atk).toBe(Math.round(Math.round(HERO_BY_ID['guan-yu'].atk * (1 + entry.bonus / 100)) * 1.2));
    }
    expect(factionSynergy(shu.slice(0, 3))[0]).toMatchObject({ tier: 2, next: 4 });
  });

  it('applies three simultaneous factions to their own units and recalculates after replacement', () => {
    const mixed = ['cao-cao', 'dian-wei', 'sun-quan', 'gan-ning', 'lu-bu', 'hua-xiong'];
    const [wei,, wu,, qun] = makeStageBattle(STAGES[0], mixed).units;
    expect(wei.def).toBe(Math.round(HERO_BY_ID[wei.heroId].def * 1.05));
    expect(wu.speed).toBe(Math.round(HERO_BY_ID[wu.heroId].speed * 1.03));
    expect(wu.nextActionAt).toBe(100 / wu.speed);
    expect(qun.criticalChance).toBe(3);
    expect(combatPower({ ...qun, hp: qun.maxHp })).toBeGreaterThan(combatPower(heroStats(HERO_BY_ID[qun.heroId])));
    mixed[5] = 'guan-yu';
    expect(makeStageBattle(STAGES[0], mixed).units[4].criticalChance).toBe(0);
  });

  it('converts Quần Hùng chance into a real critical hit at the same deterministic roll', () => {
    const strike = (roster: string[]) => {
      const engine = makeStageBattle(STAGES[0], roster);
      const [attacker] = engine.units;
      attacker.nextActionAt = -1;
      attacker.actions = 93; // Next strike rolls 9 for attacker and target in slot zero.
      return engine.step().find(event => event.kind === 'damage')!;
    };
    expect(strike(['lu-bu', 'guan-yu']).critical).toBe(false);
    expect(strike(['lu-bu', 'hua-xiong']).critical).toBe(true);
  });

  it('inherits the base hero faction and counts a family once', () => {
    const id = 'test-awakened';
    const variant = { ...HERO_BY_ID['guan-yu'], id, baseHeroId: 'guan-yu', factionId: 'wei' as const };
    HERO_BY_ID[id] = variant;
    try {
      expect(heroFaction(variant)).toBe('shu');
      expect(factionSynergy([id, 'guan-yu'])[0]).toMatchObject({ count: 1, bonus: 0 });
    } finally { delete HERO_BY_ID[id]; }
  });
});
