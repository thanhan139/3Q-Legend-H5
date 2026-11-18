import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/data/campaign';
import { HERO_BY_ID } from '../src/data/heroes';
import { BattleEngine, battleCriticalRoll, makeArenaBattle, makeStageBattle } from '../src/domain/battle';
import { COMBAT_BALANCE } from '../src/data/skillCombat';
import { RAGE_CONFIG } from '../src/data/rageConfig';
import { JEWELRY_ITEMS, JEWELRY_REWARDS, jewelryBonus, jewelryEnhanceCost, type JewelryItem } from '../src/domain/jewelry';
import { formationPower, heroStats } from '../src/domain/progression';
import { baseSave, GameStore, normalizeSave } from '../src/domain/store';
import { validateLegacy } from '../src/cloud/validateLegacy';
import { arenaDefense, arenaSquad } from '../supabase/functions/arena-command/squad';
import { handleGameRequest, type GameBackend } from '../supabase/functions/game-command/handler';
import { heroTabRoute } from '../src/ui/heroNavigation';
import { INVENTORY_CATEGORY_CONFIG } from '../src/ui/inventoryCategoryConfig';
import type { GameCommand } from '../src/cloud/gameProtocol';
import type { SaveV2 } from '../src/domain/types';

const uid = (n: number) => `12345678-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hero = 'zhang-fei';
const second = 'guan-yu';
const formation = [hero, null, null, null, null, null];
const ring = (heroId = hero): JewelryItem => ({ uid: uid(1), itemId: 'ring_ssr_dragon', level: 0, heroId });
const necklace = (heroId = hero): JewelryItem => ({ uid: uid(2), itemId: 'necklace_ssr_dragon', level: 0, heroId });
const memory = { read: () => null, write: () => {} };
const saveWith = (jewelry: JewelryItem[], extra: Partial<SaveV2> = {}): SaveV2 =>
  ({ ...baseSave(), formation, jewelryEssence: 30, jewelry, ...extra });
const stage = (items: JewelryItem[] = []) => makeStageBattle(STAGES[0], formation, {}, {}, [], 0, items);
const heroStat = (items: JewelryItem[]) => heroStats(HERO_BY_ID[hero], 0, 1, [], items);
const firstStrike = (battle: BattleEngine, actions = 0, skill = false) => {
  battle.units.forEach(unit => { unit.nextActionAt = unit.side === 'player' ? 0 : 100; });
  battle.units[0].actions = actions;
  battle.units[0].rage = skill ? RAGE_CONFIG.skillThreshold : 0;
  return battle.step().find(event => event.kind === 'damage' || event.kind === 'dodge')!;
};

describe('Trang Sức V1', () => {
  it('routes both entry points and awards every catalog item exactly once across cleared milestones', () => {
    expect(heroTabRoute('jewelry', hero)).toEqual({ scene: 'Jewelry', data: { heroId: hero, tab: 'jewelry' } });
    expect(INVENTORY_CATEGORY_CONFIG.find(category => category.id === 'trang_suc')?.destination).toBe('Jewelry');
    const store = new GameStore(memory, saveWith([], { clearedStages: STAGES.map(stage => stage.id) }));
    let sequence = 1;
    for (const reward of JEWELRY_REWARDS) {
      expect(store.claimJewelry(reward.stageId, () => uid(sequence++))).toBe(true);
      const reloaded = new GameStore(memory, normalizeSave(JSON.parse(JSON.stringify(store.snapshot))));
      expect(reloaded.claimJewelry(reward.stageId, () => uid(sequence++))).toBe(false);
    }
    expect(store.snapshot.jewelry?.map(item => item.itemId).sort()).toEqual(JEWELRY_ITEMS.map(item => item.id).sort());
    expect(new Set(store.snapshot.jewelry?.map(item => item.uid)).size).toBe(16);
  });

  it('moves and replaces a single slot item atomically and leaves six gear slots untouched', () => {
    const oldGear = [{ uid: 'weapon-1', itemId: 'blade' as const, level: 1, heroId: hero }];
    const replacement = { uid: uid(3), itemId: 'ring_r_blue', level: 0, heroId: second };
    const store = new GameStore(memory, saveWith([ring(), necklace(), replacement], { equipment: oldGear }));
    expect(store.equipJewel(uid(99), hero)).toBe(false);
    expect(store.equipJewel(uid(1), 'lu-bu')).toBe(false);
    expect(store.equipJewel(uid(1), second)).toBe(true);
    expect(store.snapshot.jewelry).toEqual([ring(second), necklace(), { ...replacement, heroId: undefined }]);
    expect(store.equipJewel(uid(1), second)).toBe(false);
    expect(store.unequipJewel(uid(1))).toBe(true);
    expect(store.unequipJewel(uid(1))).toBe(false);
    expect(store.snapshot.equipment).toEqual(oldGear);
  });

  it('uses one matching-set bonus, charges upgrade costs once and rejects cap or missing material', () => {
    const set = [ring(), necklace()];
    expect(jewelryBonus(hero, set).activeSet).toBe('dragon');
    expect(jewelryBonus(hero, [ring(), { ...necklace(), itemId: 'necklace_ssr_tiger' }]).activeSet).toBeNull();
    const flat = jewelryBonus(hero, set).stats;
    expect(heroStat(set).atk).toBe(Math.round((heroStat([]).atk + flat.atk) * 1.02));
    const store = new GameStore(memory, saveWith([{ ...ring(), level: 49 }, necklace()]));
    const cost = jewelryEnhanceCost(store.snapshot.jewelry![0]);
    const before = formationPower(store.snapshot);
    expect(store.enhanceJewel(uid(1))).toBe(true);
    expect(store.snapshot.jewelry?.[0].level).toBe(50);
    expect(store.snapshot.coins).toBe(baseSave().coins - cost.gold);
    expect(store.snapshot.jewelryEssence).toBe(30 - cost.essence);
    expect(store.enhanceJewel(uid(1))).toBe(false);
    expect(formationPower(store.snapshot)).toBeGreaterThan(before);
    const poor = new GameStore(memory, saveWith(set, { jewelryEssence: 0 }));
    expect(poor.enhanceJewel(uid(1))).toBe(false);
    expect(poor.snapshot.coins).toBe(baseSave().coins);
  });

  it('handles old saves, invalid IDs, duplicate slots and blocks jewelry from legacy imports', () => {
    expect(normalizeSave(baseSave())).not.toHaveProperty('jewelry');
    const duplicateSlot = { ...ring(), uid: uid(3) };
    const input = saveWith([ring(), necklace(), duplicateSlot, necklace(second),
      { ...necklace(), uid: uid(4), level: -1 }, { ...necklace('lu-bu'), uid: uid(5) }]);
    expect(normalizeSave(input).jewelry).toEqual([ring(), necklace(),
      { ...duplicateSlot, heroId: undefined }, { ...necklace(), uid: uid(5), heroId: undefined }]);
    expect(validateLegacy(input)).not.toHaveProperty('jewelry');
    expect(validateLegacy(input)).not.toHaveProperty('jewelryEssence');
  });

  it('changes real PvE max HP, damage and power, then restores them when unequipped', () => {
    const items = [ring(), necklace()];
    const plain = stage(), equipped = stage(items);
    expect(equipped.units[0].maxHp).toBeGreaterThan(plain.units[0].maxHp);
    expect(equipped.units[0].atk).toBeGreaterThan(plain.units[0].atk);
    expect(firstStrike(equipped).amount!).toBeGreaterThan(firstStrike(plain).amount!);
    expect(formationPower(saveWith(items))).toBeGreaterThan(formationPower(saveWith([])));
    expect(stage(items.map(({ heroId, ...item }) => item)).units).toEqual(stage().units);
  });

  it('uses crit, accuracy pierce and dodge for normal attacks and damaging skills', () => {
    const equipped = stage([ring()]);
    const target = equipped.units.find(unit => unit.side === 'enemy')!;
    const critAction = Array.from({ length: 100 }, (_, n) => n).find(n => {
      const coarse = battleCriticalRoll(n + 1, 0, target.slot, 1);
      const fine = battleCriticalRoll(n + 1, 0, target.slot, 1, true);
      return coarse >= COMBAT_BALANCE.criticalBaseChance &&
        fine < COMBAT_BALANCE.criticalBaseChance + equipped.units[0].criticalChance!;
    })!;
    expect(firstStrike(stage(), critAction).critical).toBe(false);
    expect(firstStrike(stage([ring()]), critAction).critical).toBe(true);
    const armor = (battle: BattleEngine, accuracy: number) => {
      battle.units[0].accuracy = accuracy;
      battle.units[0].atk = 400;
      battle.units.find(unit => unit.side === 'enemy')!.def = 500;
      return firstStrike(battle).amount!;
    };
    expect(armor(stage(), equipped.units[0].accuracy!)).toBeGreaterThan(armor(stage(), 0));
    const dodge = stage([necklace()]).units[0].dodge!;
    const action = Array.from({ length: 100 }, (_, n) => n).find(n => battleCriticalRoll(n + 24, 0, 0, 1, true) < dodge)!;
    for (const skill of [false, true]) {
      const missed = stage(), hit = stage([ring()]);
      missed.units.find(unit => unit.side === 'enemy')!.dodge = dodge;
      hit.units.find(unit => unit.side === 'enemy')!.dodge = dodge;
      expect(firstStrike(missed, action, skill).kind).toBe('dodge');
      expect(firstStrike(hit, action, skill).kind).toBe('damage');
    }
  });

  it('uses separate rankside confirmed gear, including equipment changes after publishing, and replays the same events', () => {
    const attacker = arenaSquad(saveWith([ring()]));
    const defenderSave = saveWith([{ ...necklace(second), uid: uid(8) }], { formation: [second] });
    const defense = arenaDefense({ formation: [second], heroExp: {}, jewelry: [ring(second)] }, defenderSave);
    expect(defense.jewelry).toEqual(defenderSave.jewelry);
    const live = makeArenaBattle(attacker, defense);
    const initial = makeArenaBattle(arenaSquad(saveWith([])), { formation: [second], heroExp: {} });
    expect(live.units[0].atk).toBeGreaterThan(initial.units[0].atk);
    expect(live.units[0].maxHp).toBe(stage([ring()]).units[0].maxHp);
    expect(live.units[1].maxHp).toBeGreaterThan(initial.units[1].maxHp);
    expect(live.units[1].atk).toBe(initial.units[1].atk);
    const replay = new BattleEngine(JSON.parse(JSON.stringify(live.units)));
    expect(replay.finish()).toBe(live.finish());
    expect(replay.log).toEqual(live.log);
    const afterUnequip = arenaDefense(defense, { ...defenderSave, jewelry: [] });
    expect(makeArenaBattle(attacker, afterUnequip).units[1]).toEqual(initial.units[1]);
  });

  it('routes jewelry only through authenticated revision commits with distinct receipts per UID', async () => {
    const rows: Record<string, { revision: number; state: SaveV2 }> = {
      alice: { revision: 0, state: saveWith([], { clearedStages: ['1-1'] }) },
      bob: { revision: 0, state: saveWith([]) },
    };
    const receipts = new Map<string, GameCommand>();
    const backend: GameBackend = {
      user: async token => rows[token] ? { id: token, email_confirmed_at: 'confirmed' } : null,
      read: async id => structuredClone(rows[id]),
      create: async () => ({}), sign: async () => '', verify: async () => false,
      receipt: async (id, requestId) => receipts.has(id + requestId),
      commit: async (id, requestId, revision, command, state) => {
        const key = id + requestId, prior = receipts.get(key);
        if (prior) return { status: JSON.stringify(prior) === JSON.stringify(command) ? 'ok' : 'reused' };
        if (rows[id].revision !== Number(revision)) return { status: 'conflict' };
        rows[id] = { revision: Number(revision) + 1, state };
        receipts.set(key, command);
        return { status: 'ok' };
      },
    };
    const send = (command: GameCommand, token: string, revision: number, requestId: string) =>
      handleGameRequest({ action: 'command', command, revision: String(revision), requestId }, token, backend);
    const claim = { type: 'jewelryClaim', stageId: '1-1' } as const;
    expect(await send(claim, 'bob', 0, uid(10))).toMatchObject({ status: 'rejected' });
    expect(await send(claim, 'alice', 0, uid(10))).toMatchObject({ status: 'ok' });
    const acquired = rows.alice.state.jewelry![0];
    expect(await send(claim, 'alice', 0, uid(10))).toMatchObject({ status: 'ok' });
    expect(await send(claim, 'alice', 1, uid(11))).toMatchObject({ status: 'rejected' });
    expect(await send({ type: 'jewelryEquip', uid: acquired.uid, heroId: hero }, 'bob', 0, uid(12))).toMatchObject({ status: 'rejected' });
    const enhanced = { type: 'jewelryEnhance', uid: acquired.uid } as const;
    const responses = await Promise.all([send(enhanced, 'alice', 1, uid(13)), send(enhanced, 'alice', 1, uid(14))]);
    expect(responses.map(result => 'status' in result ? result.status : undefined).sort()).toEqual(['conflict', 'ok']);
    expect(rows.alice.state.jewelry![0].level).toBe(1);
    expect(rows.alice.state.coins).toBe(baseSave().coins - jewelryEnhanceCost(acquired).gold);
  });
});
