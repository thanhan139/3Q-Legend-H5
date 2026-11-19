import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/data/campaign';
import { HERO_BY_ID } from '../src/data/heroes';
import { BattleEngine, battleCriticalRoll, makeArenaBattle, makeStageBattle } from '../src/domain/battle';
import { COMBAT_BALANCE } from '../src/data/skillCombat';
import { RAGE_CONFIG } from '../src/data/rageConfig';
import { JEWELRY_ITEMS, JEWELRY_REWARDS, jewelryBonus, jewelryEnhancement,
  resolveJewelryEnhancement, type JewelryEnhancementReceipt, type JewelryItem } from '../src/domain/jewelry';
import { formationPower, heroStats } from '../src/domain/progression';
import { baseSave, GameStore, normalizeSave } from '../src/domain/store';
import { validateLegacy } from '../src/cloud/validateLegacy';
import { arenaDefense, arenaSquad } from '../supabase/functions/arena-command/squad';
import { handleGameRequest, type GameBackend } from '../supabase/functions/game-command/handler';
import { heroTabRoute } from '../src/ui/heroNavigation';
import { INVENTORY_CATEGORY_CONFIG } from '../src/ui/inventoryCategoryConfig';
import { jewelryInventoryView } from '../src/ui/jewelryInventoryView';
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

describe('Trang Sức', () => {
  it('keeps equipped instances out of the bag through equip, replace, transfer, unequip and reload', () => {
    const worn = { ...ring(), level: 22 };
    const replacement = { ...ring(), uid: uid(3), itemId: 'ring_r_blue', heroId: undefined };
    const store = new GameStore(memory, saveWith([worn, replacement]));
    const bag = () => jewelryInventoryView(store.snapshot, hero);
    expect(bag().shown.map(item => item.uid)).toEqual([uid(3)]);
    expect(store.equipJewel(uid(3), hero)).toBe(true);
    expect(bag().shown).toEqual([{ ...worn, heroId: undefined, highestCheckpoint: 20 }]);
    expect(store.equipJewel(uid(3), second)).toBe(true);
    expect(jewelryInventoryView(store.snapshot, second, { scope: 'equipped' }).shown)
      .toEqual([{ ...replacement, heroId: second }]);
    expect(store.unequipJewel(uid(3))).toBe(true);
    expect(store.equipJewel(uid(1), hero)).toBe(true);
    const loaded = normalizeSave(JSON.parse(JSON.stringify(store.snapshot)));
    expect(jewelryInventoryView(loaded, hero).shown).toEqual([replacement]);
    expect(jewelryInventoryView(loaded, hero, { selectedSlot: 'ring' }).selected)
      .toEqual({ ...worn, highestCheckpoint: 20 });
    expect(store.unequipJewel(uid(1))).toBe(true);
    expect(bag().bagJewelry).toContainEqual({ ...worn, heroId: undefined, highestCheckpoint: 20 });
    expect(bag().allJewelry).toHaveLength(2);
  });

  it('paginates each filtered scope, clamps the last page, and resolves an equipped slot even with no bag results', () => {
    const jewelry = JEWELRY_ITEMS.map((item, i) => ({ uid: uid(i + 10), itemId: item.id, level: 0,
      ...(item.id === 'ring_ssr_dragon' ? { heroId: hero } : {}) }));
    const save = saveWith(jewelry);
    expect(jewelryInventoryView(save, hero, { page: 9 })).toMatchObject({ total: 15, pageCount: 2, page: 1 });
    expect(jewelryInventoryView(save, hero, { page: 1, slot: 'ring', rarity: 'SSR' }))
      .toMatchObject({ total: 3, pageCount: 1, page: 0 });
    const equipped = jewelryInventoryView(save, hero, { scope: 'equipped', slot: 'ring', rarity: 'SSR' });
    expect(equipped.shown.map(item => item.heroId)).toEqual([hero]);
    const onlyEquipped = saveWith([ring()]);
    expect(jewelryInventoryView(onlyEquipped, hero, { rarity: 'SR', selectedSlot: 'ring', page: 1 }))
      .toMatchObject({ total: 0, pageCount: 0, page: 0, shown: [], selected: ring() });
    expect(jewelryInventoryView(onlyEquipped, hero, { uid: uid(1) }).selected).toBeUndefined();
  });

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
    const store = new GameStore(memory, saveWith([{ ...ring(), level: 49 }, necklace()], { coins: 20_000, jewelryEssence: 100 }));
    const cost = jewelryEnhancement(store.snapshot.jewelry![0])!;
    const before = formationPower(store.snapshot);
    expect(store.enhanceJewel(uid(1), .009)).toMatchObject({ success: true, fromLevel: 49, toLevel: 50, highestCheckpoint: 40 });
    expect(store.snapshot.jewelry?.[0].level).toBe(50);
    expect(store.snapshot.coins).toBe(20_000 - cost.gold);
    expect(store.snapshot.jewelryEssence).toBe(100 - cost.essence);
    expect(store.enhanceJewel(uid(1), 0)).toBe(false);
    expect(formationPower(store.snapshot)).toBeGreaterThan(before);
    const poor = new GameStore(memory, saveWith(set, { jewelryEssence: 0 }));
    expect(poor.enhanceJewel(uid(1), 0)).toBe(false);
    expect(poor.snapshot.coins).toBe(baseSave().coins);
  });

  it.each([
    [8, 100, 8], [9, 70, 8], [10, 75, 10], [18, 75, 17], [19, 45, 17],
    [20, 65, 20], [28, 65, 27], [29, 20, 27], [30, 55, 30], [38, 55, 37],
    [39, 8, 36], [40, 45, 40], [48, 45, 47], [49, 1, 47],
  ])('uses the exact probability boundary and failure floor from +%i', (level, chance, failLevel) => {
    const item = { ...ring(), level };
    expect(jewelryEnhancement(item)).toMatchObject({ chance, failLevel });
    expect(resolveJewelryEnhancement(item, chance / 100 - 1e-12)).toMatchObject({ success: true, toLevel: level + 1 });
    if (chance < 100) expect(resolveJewelryEnhancement(item, chance / 100)).toMatchObject({ success: false, toLevel: failLevel });
  });

  it('backfills legacy checkpoints without changing levels, and a committed downgrade updates combat and power', () => {
    const legacyRing = { ...ring(), level: 49 };
    const legacySave = saveWith([legacyRing, necklace()], { coins: 20_000, jewelryEssence: 90 });
    expect(normalizeSave(legacySave).jewelry?.[0]).toMatchObject({ level: 49, highestCheckpoint: 40 });
    expect(normalizeSave(saveWith([{ ...ring(), level: 8, highestCheckpoint: 40 }])).jewelry?.[0])
      .toMatchObject({ level: 8 });
    const store = new GameStore(memory, legacySave);
    const before = stage([legacyRing, necklace()]);
    const arena = makeArenaBattle(arenaSquad(legacySave), arenaSquad(saveWith([])));
    const replay = structuredClone(arena.units);
    expect(store.enhanceJewel(uid(1), .9)).toMatchObject({
      success: false, fromLevel: 49, toLevel: 47, goldSpent: 9_900, essenceSpent: 45, highestCheckpoint: 40,
    });
    const after = store.snapshot;
    expect(after.coins).toBe(10_100);
    expect(after.jewelryEssence).toBe(45);
    expect(stage(after.jewelry).units[0].maxHp).toBeLessThan(before.units[0].maxHp);
    expect(formationPower(after)).toBeLessThan(formationPower(legacySave));
    expect(makeArenaBattle(arenaSquad(after), arenaSquad(saveWith([]))).units[0].criticalChance!)
      .toBeLessThan(arena.units[0].criticalChance!);
    expect(new BattleEngine(replay).finish()).toBe(arena.finish());
    expect(after.jewelry).toHaveLength(2);
  });

  it.each([
    ['ring_r_blue', 45, 23, 4725], ['ring_sr_green', 68, 34, 6795], ['ring_ssr_dragon', 90, 45, 9900],
  ])('charges the exact +50 cost for %s and requires the full quoted balance', (itemId, essence, failEssence, gold) => {
    const item = { ...ring(), itemId, level: 49 };
    expect(jewelryEnhancement(item)).toMatchObject({ essence, failEssence, gold });
    const store = new GameStore(memory, saveWith([item], { coins: gold, jewelryEssence: essence - 1 }));
    expect(store.enhanceJewel(uid(1), 0.9)).toBe(false);
    expect(store.snapshot.coins).toBe(gold);
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
      create: async () => ({}), sign: async () => '0'.repeat(64), verify: async () => false,
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
    const enhanced = { type: 'jewelryEnhance', uid: acquired.uid, rulesVersion: 2 } as const;
    const responses = await Promise.all([send(enhanced, 'alice', 1, uid(13)), send(enhanced, 'alice', 1, uid(14))]);
    expect(responses.map(result => 'status' in result ? result.status : undefined).sort()).toEqual(['conflict', 'ok']);
    expect(rows.alice.state.jewelry![0].level).toBe(1);
    expect(rows.alice.state.coins).toBe(baseSave().coins - jewelryEnhancement(acquired)!.gold);
  });

  it('commits a failed server sample once even when the same request races or retries', async () => {
    let state = saveWith([{ ...ring(), level: 39 }], { coins: 10_000, jewelryEssence: 100 });
    let revision = 0;
    let recorded: JewelryEnhancementReceipt | undefined;
    const signed: string[] = [];
    const backend: GameBackend = {
      user: async () => ({ id: 'alice', email_confirmed_at: 'confirmed' }),
      read: async () => ({ revision, state }),
      create: async () => ({}), verify: async () => false,
      sign: async payload => { signed.push(payload); return 'f'.repeat(64); },
      receipt: async () => !!recorded,
      commit: async (_uid, _id, expected, _command, next, value) => {
        if (recorded) return { status: 'ok', receipt: recorded };
        if (Number(expected) !== revision) return { status: 'conflict' };
        recorded = value as JewelryEnhancementReceipt;
        state = next;
        revision++;
        return { status: 'ok', receipt: recorded };
      },
    };
    const send = () => handleGameRequest({ action: 'command', revision: '0', requestId: uid(49),
      command: { type: 'jewelryEnhance', uid: uid(1), rulesVersion: 2 } }, 'token', backend);
    const double = await Promise.all([send(), send()]);
    expect(double[0]).toEqual(double[1]);
    expect(double[0]).toMatchObject({ status: 'ok', receipt: { success: false, fromLevel: 39, toLevel: 36 } });
    expect(revision).toBe(1);
    expect(state.jewelryEssence).toBe(85);
    expect(state.coins).toBe(5_520);
    expect(new Set(signed).size).toBe(1);
    const count = signed.length;
    expect(await send()).toEqual(double[0]);
    expect(signed.length).toBe(count);
  });
});
