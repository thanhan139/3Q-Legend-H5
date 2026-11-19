import { describe, expect, it } from 'vitest';
import { GameStore, baseSave, normalizeSave } from '../src/domain/store';
import { signatureCarrierBonus, signaturePassive, signatureTeamAura } from '../src/domain/equipment';
import { heroStats, formationPower } from '../src/domain/progression';
import { HERO_BY_ID } from '../src/data/heroes';
import { makeArenaBattle } from '../src/domain/battle';
import {
  SIGNATURE_STAR_COSTS, SIGNATURE_MAX_NODES, signatureNextCost, signatureSpentThrough,
  signatureStarBonus, signatureCompletedStars, signatureNodes,
} from '../src/domain/signatureStars';

const storeFor = (initial = baseSave()) => new GameStore({ read: () => null, write: () => {} }, initial, false);
const signature = (nodes: number) => [{ uid: 'sig:1', itemId: 'azureMoon' as const,
  level: 1, heroId: 'guan-yu', signatureNodes: nodes }];

describe('five-star Divine Forge — server-backed progression contract', () => {
  it('uses 25 deterministic petals with 300,450,600,750,900 shard star totals', () => {
    expect(SIGNATURE_STAR_COSTS.map(star => star.reduce((sum, cost) => sum + cost, 0)))
      .toEqual([300, 450, 600, 750, 900]);
    expect(signatureSpentThrough(25)).toBe(3000);
    expect(SIGNATURE_MAX_NODES).toBe(25);
    expect(signatureNextCost(0)).toBe(50);
    expect(signatureNextCost(4)).toBe(100);
    expect(signatureNextCost(9)).toBe(150);
    expect(signatureNextCost(14)).toBe(200);
    expect(signatureNextCost(19)).toBe(250);
    expect(signatureNextCost(24)).toBe(300);
    expect(signatureNextCost(25)).toBeUndefined();
    expect(signatureSpentThrough(1)).toBe(50);
    expect(signatureSpentThrough(14)).toBe(1150);
    expect(signatureSpentThrough(24)).toBe(2700);
  });

  it('credits first petal when forging and never charges it twice', () => {
    const save = baseSave(); save.forge!.shards = 50;
    const store = storeFor(save);
    expect(store.forgeWeapon('azureMoon', 0)).toBe(true);
    expect(store.snapshot.equipment?.[0].signatureNodes).toBe(1);
    expect(store.snapshot.forge?.shards).toBe(0);
    expect(store.upgradeSignature('forge:1', 1)).toBe(false);
    const supplied = store.snapshot; supplied.forge!.shards = 50;
    const again = storeFor(supplied);
    expect(again.upgradeSignature('forge:1', 1)).toBe(true);
    expect(again.snapshot.equipment?.[0].signatureNodes).toBe(2);
    expect(again.snapshot.forge?.shards).toBe(0);
    expect(again.upgradeSignature('forge:1', 1)).toBe(false);
  });

  it('requires valid expected nodes and actual shared shards for a milestone upgrade', () => {
    const save = baseSave();
    save.equipment = signature(4); save.forge!.shards = 99;
    const store = storeFor(save);
    expect(store.upgradeSignature('sig:1', 4)).toBe(false);
    expect(store.snapshot).toEqual(save);
    save.forge!.shards = 100;
    const funded = storeFor(save);
    expect(funded.upgradeSignature('sig:1', 4)).toBe(true);
    expect(funded.snapshot.equipment![0].signatureNodes).toBe(5);
    expect(funded.snapshot.forge!.shards).toBe(0);
    expect(funded.upgradeSignature('sig:1', 4)).toBe(false);
    expect(funded.upgradeSignature('unknown', 5)).toBe(false);
  });

  it('caps at node 25 and preserves old signatures as a paid first petal', () => {
    const old = baseSave(); old.equipment = [{ uid: 'old', itemId: 'azureMoon', level: 3 }];
    const normal = normalizeSave(old);
    expect(normal.equipment?.[0].signatureNodes).toBe(1);
    expect(signatureNodes(undefined)).toBe(1);
    const capped = baseSave(); capped.equipment = signature(24); capped.forge!.shards = 300;
    const store = storeFor(capped);
    expect(store.upgradeSignature('sig:1', 24)).toBe(true);
    expect(store.snapshot.equipment?.[0].signatureNodes).toBe(25);
    expect(store.snapshot.forge!.shards).toBe(0);
    expect(store.upgradeSignature('sig:1', 25)).toBe(false);
    expect(signatureCompletedStars(25)).toBe(5);
    expect(signatureStarBonus(25)).toEqual({
      hpPct: 155, atkPct: 190, defPct: 100, skillPct: 110, teamAuraPct: 40,
    });
  });

  it('boosts matching weapon owner, never unrelated hero or forged-unowned gear', () => {
    const owned = signature(25);
    expect(signatureCarrierBonus(owned, 'guan-yu').atkPct).toBe(190);
    expect(signatureCarrierBonus(owned, 'zhang-fei').atkPct).toBe(0);
    expect(signaturePassive(owned, 'guan-yu')).toBeGreaterThan(1);
    expect(signaturePassive(owned, 'zhang-fei')).toBeUndefined();
    const base = heroStats(HERO_BY_ID['guan-yu']);
    const boosted = heroStats(HERO_BY_ID['guan-yu'], 0, 1, owned);
    expect(boosted.atk).toBeGreaterThan(base.atk * 2);
    expect(boosted.hp).toBeGreaterThan(base.hp * 2);
    expect(signatureTeamAura(owned, ['guan-yu', 'zhang-fei'])).toBe(40);
    expect(signatureTeamAura(owned, ['zhang-fei'])).toBe(0);
  });

  it('applies strongest aura once in both PvP teams and displayed formation power', () => {
    const attacker = { formation: ['guan-yu', 'zhang-fei', null, null, null, null],
      heroExp: {}, equipment: signature(25) };
    const defender = { formation: ['guan-yu', 'zhang-fei', null, null, null, null],
      heroExp: {}, equipment: signature(14) };
    const battle = makeArenaBattle(attacker, defender);
    const strong = battle.units.find(u => u.side === 'player' && u.heroId === 'zhang-fei')!;
    const weak = battle.units.find(u => u.side === 'enemy' && u.heroId === 'zhang-fei')!;
    expect(strong.maxHp).toBeGreaterThan(weak.maxHp);
    expect(strong.atk).toBeGreaterThan(weak.atk);
    const extra = [{ uid: 'second', itemId: 'serpentSpear' as const,
      level: 1, heroId: 'zhang-fei', signatureNodes: 14 }];
    expect(signatureTeamAura([...signature(25), ...extra], attacker.formation)).toBe(40);
    const s = baseSave(); s.formation = attacker.formation; s.equipment = signature(25);
    const p25 = formationPower(s); s.equipment = signature(14);
    expect(p25).toBeGreaterThan(formationPower(s));
  });
});
