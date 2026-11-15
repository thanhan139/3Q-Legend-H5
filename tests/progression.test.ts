import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../src/data/heroes';
import { STAGES, stageOpponents } from '../src/data/campaign';
import { makeStageBattle } from '../src/domain/battle';
import { heroLevel, heroStats } from '../src/domain/progression';

describe('Hero stats and campaign encounters', () => {
  it('uses configured growth in actual battle units including turn priority', () => {
    const hero = HERO_BY_ID['zhang-fei'];
    expect(heroLevel(99)).toBe(1);
    expect(heroLevel(100)).toBe(2);
    expect(heroLevel(5000)).toBe(15);
    const upgraded = heroStats(hero, 100);
    expect(upgraded).toEqual({ level: 2, hp: 1700, atk: 158, def: 93, speed: 80 });
    const engine = makeStageBattle(STAGES[0], [hero.id], { [hero.id]: 100 });
    expect(engine.units[0]).toMatchObject({
      maxHp: Math.round(upgraded.hp * 1.25), hp: Math.round(upgraded.hp * 1.25), atk: upgraded.atk, def: upgraded.def,
      speed: upgraded.speed, nextActionAt: 100 / upgraded.speed,
    });
    const baseline = makeStageBattle(STAGES[0], [hero.id]);
    expect(engine.units.slice(1)).toEqual(baseline.units.slice(1));
  });

  it('keeps three chapters of five encounters and matches boss preview to battle', () => {
    expect(STAGES.map(stage => stage.id)).toEqual(
      [1, 2, 3].flatMap(chapter => [1, 2, 3, 4, 5].map(stage => `${chapter}-${stage}`)),
    );
    for (const stage of STAGES.filter(stage => stage.stage === 5)) {
      const enemies = makeStageBattle(stage, ['zhang-fei']).units.filter(unit => unit.side === 'enemy');
      expect(enemies.map(unit => unit.heroId)).toEqual(stageOpponents(stage));
      expect(enemies).toHaveLength(stage.enemyCount);
      expect(stage.trainingReward).toBeGreaterThan(STAGES[STAGES.indexOf(stage) - 1].trainingReward);
    }
  });
});
