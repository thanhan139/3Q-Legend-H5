import { describe, expect, it } from 'vitest';
import { makeStageBattle } from '../src/domain/battle';
import { STAGES } from '../src/data/campaign';
import { RAGE_CONFIG } from '../src/data/rageConfig';

const TEAM = ['zhang-fei', 'guan-yu', 'zhao-yun', 'liu-bei', 'huang-yueying', 'ma-chao'];
const stage = STAGES.find(s => s.id === '3-1')!;
function match() { return makeStageBattle(stage, TEAM); }
function force(engine: ReturnType<typeof match>, uid: string) {
  engine.units.forEach(unit => { unit.nextActionAt = unit.uid === uid ? -1 : 999; });
}
function cast(id: string) {
  const engine = match();
  const caster = engine.units.find(unit => unit.heroId === id && unit.side === 'player')!;
  caster.rage = RAGE_CONFIG.skillThreshold;
  force(engine, caster.uid);
  return { engine, caster, events: engine.step() };
}

describe('M3.8 Ultimate Combat: logical mechanics, not presentation-only', () => {
  it('Quan Vũ cleaves all targets and emits the exact aggregate damage', () => {
    const { events, caster } = cast('guan-yu');
    const hits = events.filter(e => e.kind === 'damage' && e.source === caster.uid);
    expect(hits).toHaveLength(6);
    expect(new Set(hits.map(h => h.target)).size).toBe(6);
    expect(hits.every(h => h.skillId === 'guan-yu:ultimate')).toBe(true);
    expect(events.find(e => e.kind === 'total')?.amount).toBe(hits.reduce((s, h) => s + (h.amount ?? 0), 0));
    expect(caster.rage).toBe(0);
  });
  it('Trương Phi increases max HP and stuns the front row on his ultimate', () => {
    const { engine, events, caster } = cast('zhang-fei');
    expect(caster.maxHp).toBe(1950);
    expect(events.filter(e => e.kind === 'damage' && e.source === caster.uid)).toHaveLength(3);
    const stun = events.find(e => e.kind === 'status' && e.status === 'stun')!;
    expect(stun.duration).toBe(1);
    force(engine, stun.target!);
    expect(engine.step()).toContainEqual(expect.objectContaining({ kind: 'skip', target: stun.target }));
    expect(engine.units.find(unit => unit.uid === stun.target)?.statuses?.stun).toBeUndefined();
  });
  it('Triệu Vân performs seven actual hits with one skill consumption', () => {
    const { events, caster } = cast('zhao-yun');
    const hits = events.filter(e => e.kind === 'damage' && e.source === caster.uid);
    expect(hits).toHaveLength(7);
    expect(hits.map(h => h.hitIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(hits.map(h => h.target)).size).toBe(1);
    expect(caster.rage).toBe(0);
    expect(events.filter(e => e.kind === 'rage' && e.reason === 'skill-cost')).toHaveLength(1);
  });
  it('Multi-hit grants defender rage no more than once per action', () => {
    const { events } = cast('zhao-yun');
    const enemy = events.find(e => e.kind === 'damage')?.target;
    expect(events.filter(e => e.kind === 'rage' && e.reason === 'damage-taken' && e.target === enemy).length)
      .toBeLessThanOrEqual(1);
  });
  it('Shields absorb damage before HP, and the event states the actual remaining shield', () => {
    const engine = match();
    const attacker = engine.units.find(u => u.uid === 'player-1')!;
    const target = engine.units.find(u => u.side === 'enemy' && u.slot === 0)!;
    target.shield = 90;
    const hpBefore = target.hp;
    force(engine, attacker.uid);
    const hit = engine.step().find(e => e.kind === 'damage' && e.target === target.uid)!;
    expect(hit.absorbed).toBe(90);
    expect(target.hp).toBe(hpBefore - (hit.amount ?? 0));
    expect(hit.remainingShield).toBe(target.shield);
    expect(target.shield).toBe(0);
  });
  it('Support ultimate heals allies and applies actual attack/critical buffs', () => {
    const engine = match();
    const healer = engine.units.find(u => u.heroId === 'liu-bei')!;
    engine.units.filter(u => u.side === 'player').slice(0, 2).forEach(u => { u.hp -= 400; });
    healer.rage = 100;
    force(engine, healer.uid);
    const events = engine.step();
    expect(events.filter(e => e.kind === 'heal')).toHaveLength(2);
    expect(events.some(e => e.kind === 'buff' && e.buff === 'attack')).toBe(true);
    expect(events.some(e => e.kind === 'buff' && e.buff === 'critical')).toBe(true);
  });
  it('Critical hits are deterministic and increase damage for the same attack', () => {
    const a = match(); const b = match();
    const aa = a.units.find(u => u.uid === 'player-1')!;
    const bb = b.units.find(u => u.uid === 'player-1')!;
    aa.actions = 5; bb.actions = 5;
    aa.criticalBuffActions = 2;
    force(a, aa.uid); force(b, bb.uid);
    const left = a.step().find(e => e.kind === 'damage')!;
    const right = b.step().find(e => e.kind === 'damage')!;
    expect(left.critical).toBe(true);
    expect(right.critical).toBe(false);
    expect(left.amount).toBeGreaterThan(right.amount!);
  });
  it('Normal playback and Skip create an identical multi-hit event stream', () => {
    const a = match(); const b = match();
    while (!a.winner) a.step();
    expect(b.finish()).toBe(a.winner);
    expect(b.log).toEqual(a.log);
  });
  it('Skill lock at full rage preserves energy and the next unlocked action casts', () => {
    const engine = match();
    const hero = engine.units.find(u => u.uid === 'player-0')!;
    hero.rage = 100; hero.skillLocked = true; force(engine, hero.uid);
    expect(engine.step().some(e => e.kind === 'damage' && e.skill)).toBe(false);
    expect(hero.rage).toBe(100);
    hero.skillLocked = false; force(engine, hero.uid);
    expect(engine.step().some(e => e.kind === 'damage' && e.skill)).toBe(true);
    expect(hero.rage).toBe(0);
  });
});

it('casts the two SSS+ ultimates through normal rage and resolves their distinct effects', () => {
  const engine = makeStageBattle(stage, ['lu-bu', 'zhuge-liang']);
  const [lu, zhuge] = engine.units;
  const victim = engine.units.find(unit => unit.uid === 'enemy-0')!;
  victim.hp = 1;
  lu.rage = 100;
  force(engine, lu.uid);
  expect(engine.step().filter(event => event.kind === 'damage' && event.skillId === 'lu-bu:ultimate')).toHaveLength(2);
  const column = engine.units.find(unit => unit.uid === 'enemy-1')!;
  column.hp = Math.floor(column.maxHp / 2);
  zhuge.rage = 100;
  force(engine, zhuge.uid);
  const events = engine.step();
  expect(events.filter(event => event.kind === 'damage' && event.skillId === 'zhuge-liang:ultimate')).toHaveLength(2);
  expect(events.filter(event => event.kind === 'damage').every(event => engine.units.find(unit => unit.uid === event.target)!.slot % 3 === 1)).toBe(true);
  expect(zhuge.rage).toBe(0);
});

it('applies signature stats universally but adds skill damage and VFX only for the matching owner', () => {
  function strike(heroId: string, itemId: 'azureMoon' | 'serpentSpear', skill: boolean) {
    const battle = makeStageBattle(stage, [heroId], {}, {}, [{ uid: 'sig', itemId, level: 1, heroId }]);
    const actor = battle.units[0];
    actor.rage = skill ? 100 : 0;
    force(battle, actor.uid);
    return { actor, hit: battle.step().find(event => event.kind === 'damage')! };
  }
  const owner = strike('guan-yu', 'azureMoon', true);
  const other = strike('zhang-fei', 'azureMoon', true);
  expect(owner.hit.skillId).toBe('guan-yu:ultimate:signature');
  expect(other.hit.skillId).toBe('zhang-fei:ultimate');
  expect(other.actor.atk).toBe(159);
  expect(strike('guan-yu', 'azureMoon', false).hit.skillId).toBe('guan-yu:normal');
  expect(owner.hit.amount).toBeGreaterThan(strike('guan-yu', 'serpentSpear', true).hit.amount!);
});

it('ticks bleed twice, consumes it on skipped turns and redirects single attacks to taunt', () => {
  const engine = makeStageBattle(stage, ['gan-ning', 'xiahou-dun']);
  const [gan, tank] = engine.units;
  gan.rage = 100;
  force(engine, gan.uid);
  const cast = engine.step();
  const id = cast.find(event => event.status === 'bleed')!.target!;
  const victim = engine.units.find(unit => unit.uid === id)!;
  victim.statuses!.stun = { turns: 1, source: gan.uid, value: 0 };
  force(engine, victim.uid);
  const before = victim.hp;
  expect(engine.step()).toContainEqual(expect.objectContaining({ kind: 'skip' }));
  expect(victim.hp).toBeLessThan(before);
  expect(victim.statuses?.bleed?.turns).toBe(1);
  force(engine, victim.uid);
  engine.step();
  expect(victim.statuses?.bleed).toBeUndefined();
  tank.rage = 100;
  force(engine, tank.uid);
  expect(engine.step()).toContainEqual(expect.objectContaining({ kind: 'shield', target: tank.uid }));
  expect(tank.statuses?.taunt?.turns).toBe(1);
  victim.rage = 0;
  force(engine, victim.uid);
  expect(engine.step()).toContainEqual(expect.objectContaining({ kind: 'damage', source: victim.uid, target: tank.uid }));
});

it('reduces rage after a successful debuff and emits the actual change', () => {
  const engine = makeStageBattle(stage, ['cao-cao']);
  const [caster] = engine.units;
  const victim = engine.units.find(unit => unit.uid === 'enemy-0')!;
  caster.rage = 100;
  victim.rage = 50;
  force(engine, caster.uid);
  expect(engine.step()).toContainEqual(expect.objectContaining({
    kind: 'rage', target: victim.uid, reason: 'skill-effect', rageBefore: 50, rageAfter: 35,
  }));
  expect(victim.rage).toBe(45); // Rage received once for surviving damage.
});

it('covers all configured skill IDs and includes the runtime rage cost in descriptions', async () => {
  const { HEROES } = await import('../src/data/heroes');
  const { ATTACK_SKILLS, PASSIVE_SKILLS, describeSkill } = await import('../src/data/heroSkills');
  for (const hero of HEROES) {
    expect(ATTACK_SKILLS.get(hero.normalAttackId)?.name).toBeTruthy();
    expect(PASSIVE_SKILLS.get(hero.passiveSkillId)?.name).toBeTruthy();
    expect(describeSkill(ATTACK_SKILLS.get(hero.ultimateSkillId)!, true)).toContain('100 Nộ');
  }
});
