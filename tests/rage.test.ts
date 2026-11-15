import { describe, expect, it } from 'vitest';
import { makeStageBattle } from '../src/domain/battle';
import { RAGE_CONFIG } from '../src/data/rageConfig';
import { STAGES } from '../src/data/campaign';

function match() {
  return makeStageBattle(STAGES[0], ['zhang-fei', 'guan-yu', 'liu-bei', null, null, null]);
}

function forceNext(engine: ReturnType<typeof match>, uid: string) {
  for (const unit of engine.units) unit.nextActionAt = unit.uid === uid ? -1 : 999;
}

function action(events: ReturnType<ReturnType<typeof match>['step']>) {
  const result = events.find(e => e.kind === 'damage' || e.kind === 'heal');
  expect(result).toBeDefined();
  return result!;
}

describe('Rage combat / OMG 3Q-inspired accumulation', () => {
  it('initializes independent rage meters at 0', () => {
    const engine = match();
    expect(engine.units.length).toBeGreaterThan(0);
    expect(engine.units.every(unit => unit.rage === RAGE_CONFIG.initial)).toBe(true);
  });

  it('a basic attack gains rage and reports the transition in the event', () => {
    const engine = match();
    forceNext(engine, 'player-0');
    const turn = engine.step();
    const move = action(turn);
    expect(move.actionType).toBe('normal');
    expect(move.skill).toBe(false);
    expect(move.rageBefore).toBe(0);
    expect(move.rageAfter).toBe(RAGE_CONFIG.normalAttackGain);
    expect(engine.units.find(u => u.uid === 'player-0')!.rage).toBe(30);
    expect(turn).toContainEqual(expect.objectContaining({
      kind: 'rage', target: 'player-0', reason: 'normal-attack', rageBefore: 0, rageAfter: 30,
    }));
  });

  it('a surviving unit gains rage once from incoming damage, a KO gains none', () => {
    const engine = match();
    forceNext(engine, 'player-0');
    const first = engine.step();
    const damaged = action(first);
    const victim = engine.units.find(u => u.uid === damaged.target)!;
    expect(victim.hp).toBeGreaterThan(0);
    expect(victim.rage).toBe(10);
    expect(first.filter(e => e.kind === 'rage' && e.target === victim.uid && e.reason === 'damage-taken')).toHaveLength(1);
    victim.hp = 1;
    forceNext(engine, 'player-0');
    engine.step();
    expect(victim.hp).toBe(0);
    expect(victim.rage).toBe(10);
  });

  it('does not cast merely on the third action if rage is insufficient', () => {
    const engine = match();
    const hero = engine.units.find(u => u.uid === 'player-0')!;
    hero.rage = 0;
    for (let i = 0; i < 3; i++) {
      forceNext(engine, hero.uid);
      const move = action(engine.step());
      expect(move.actionType).toBe('normal');
      expect(move.skill).toBe(false);
    }
    expect(hero.actions).toBe(3);
    expect(hero.rage).toBe(90);
  });

  it('casts at full rage, uses the hero skill ID, and consumes exactly 100 rage', () => {
    const engine = match();
    const hero = engine.units.find(u => u.uid === 'player-1')!;
    hero.rage = 100;
    forceNext(engine, hero.uid);
    const events = engine.step();
    const move = action(events);
    expect(move.actionType).toBe('skill');
    expect(move.skill).toBe(true);
    expect(move.skillId).toBe('guan-yu:ultimate');
    expect(move.rageBefore).toBe(100);
    expect(move.rageAfter).toBe(0);
    expect(hero.rage).toBe(events.filter(event => event.reason === 'skill-effect' && event.target === hero.uid)
      .reduce((sum, event) => sum + (event.rageAfter ?? 0) - (event.rageBefore ?? 0), 0));
    expect(events).toContainEqual(expect.objectContaining({
      kind: 'rage', target: hero.uid, reason: 'skill-cost', rageBefore: 100, rageAfter: 0,
    }));
  });

  it('caps received and generated rage at the configured maximum', () => {
    const engine = match();
    const hero = engine.units.find(u => u.uid === 'player-0')!;
    hero.rage = 90;
    hero.skillLocked = true;
    forceNext(engine, hero.uid);
    const move = action(engine.step());
    expect(move.actionType).toBe('normal');
    expect(hero.rage).toBe(RAGE_CONFIG.max);
    const enemy = engine.units.find(u => u.side === 'enemy' && u.hp > 0)!;
    enemy.rage = 99;
    forceNext(engine, hero.uid);
    engine.step();
    expect(enemy.rage).toBeLessThanOrEqual(RAGE_CONFIG.max);
  });

  it('a skill lock preserves full rage; after unlock skill triggers next action', () => {
    const engine = match();
    const hero = engine.units.find(u => u.uid === 'player-0')!;
    hero.rage = 100;
    hero.skillLocked = true;
    forceNext(engine, hero.uid);
    expect(action(engine.step()).skill).toBe(false);
    expect(hero.rage).toBe(100);
    hero.skillLocked = false;
    forceNext(engine, hero.uid);
    expect(action(engine.step()).skill).toBe(true);
    expect(hero.rage).toBe(0);
  });

  it('support uses a rage-funded healing ultimate, not a free every-third-turn heal', () => {
    const engine = match();
    const healer = engine.units.find(u => u.heroId === 'liu-bei')!;
    const injured = engine.units.find(u => u.uid === 'player-0')!;
    injured.hp -= 400;
    healer.rage = 100;
    forceNext(engine, healer.uid);
    const move = action(engine.step());
    expect(move.kind).toBe('heal');
    expect(move.skillId).toBe('liu-bei:ultimate');
    expect(healer.rage).toBe(0);
    expect(injured.hp).toBeGreaterThan(injured.maxHp - 400);
  });

  it('normal resolution and skip yield exactly the same event stream and winner', () => {
    const a = match();
    const b = match();
    while (!a.winner) a.step();
    expect(b.finish()).toBe(a.winner);
    expect(b.log).toEqual(a.log);
  });
});
