import { expect, it } from 'vitest';
import { makeArenaPracticeBattle } from '../src/domain/battle';

it('uses both six-slot copies of the saved formation without modifying it', () => {
  const formation = ['liu-bei', 'guan-yu', 'zhang-fei', 'zhao-yun', 'ma-chao', 'cao-cao'];
  const engine = makeArenaPracticeBattle(formation, { 'liu-bei': 100 }, { 'liu-bei': 2 });
  for (const side of ['player', 'enemy']) {
    const team = engine.units.filter(unit => unit.side === side);
    expect(team.map(unit => unit.heroId)).toEqual(formation);
    expect(team.map(unit => unit.slot)).toEqual([0, 1, 2, 3, 4, 5]);
  }
  expect(engine.units[0].maxHp).toBe(engine.units[6].maxHp);
  expect(['player', 'enemy']).toContain(engine.finish());
  expect(formation).toEqual(['liu-bei', 'guan-yu', 'zhang-fei', 'zhao-yun', 'ma-chao', 'cao-cao']);
});
