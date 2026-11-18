import { makeStageBattle } from '../../../src/domain/battle';
import { baseSave, GameStore } from '../../../src/domain/store';
import { STAGES } from '../../../src/data/campaign';
import { DAILY_MISSIONS } from '../../../src/domain/welfare';
import { canonicalJson, validateLegacy } from '../../../src/cloud/validateLegacy';
import type { BattleTicket, GameCommand, GameIntent } from '../../../src/cloud/gameProtocol';
import type { SaveV2 } from '../../../src/domain/types';
import { vipLevel, type VipSnapshot } from '../../../src/domain/vip';
import { legacyTutorial, playerName, tutorialActive, tutorialTransition, type TutorialProgress } from '../../../src/domain/tutorial';

export interface SaveRow {
  state: SaveV2;
  revision: number;
  tutorial?: TutorialProgress;
  vip?: VipSnapshot;
}

export interface GameBackend {
  claimVip?(uid: string, requestId: string, revision: string, command: Extract<GameCommand, {type:'vipClaim'}>): Promise<object>;
  user(token: string): Promise<{ id: string; is_anonymous?: boolean; email_confirmed_at?: string } | null>;
  read(uid: string): Promise<SaveRow | null>;
  receipt(uid: string, requestId: string): Promise<boolean>;
  create(uid: string, state: SaveV2, fingerprint?: string): Promise<object>;
  commit(uid: string, requestId: string, revision: string, command: GameCommand, state: SaveV2, receipt: unknown, tutorial?: TutorialProgress): Promise<object>;
  sign(message: string): Promise<string>;
  verify(message: string, signature: string): Promise<boolean>;
}

const REVISION = /^(0|[1-9][0-9]{0,15})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const revisionOK = (value: unknown): value is string =>
  typeof value === 'string' && REVISION.test(value) && Number.isSafeInteger(Number(value));
const idOK = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 80;
const ticketPayload = (uid: string, ticket: Omit<BattleTicket, 'signature'>) =>
  JSON.stringify([uid, ticket.id, ticket.stageId, ticket.revision, ticket.expiresAt]);
const serverRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

async function run(store: GameStore, command: GameCommand, uid: string, requestId: string,
  revision: string, backend: GameBackend, vip?: VipSnapshot): Promise<unknown> {
  switch (command.type) {
    case 'firstTopupDemo': return store.claimFirstTopupDemo();
    case 'checkIn': return store.claimCheckIn();
    case 'daily': return typeof command.mission === 'string' &&
      Object.hasOwn(DAILY_MISSIONS, command.mission) && store.claimDaily(command.mission);
    case 'formation': return (command.heroId === null || idOK(command.heroId)) && store.updateFormation(command.slot, command.heroId);
    case 'jewelryEquip': return idOK(command.uid) && idOK(command.heroId) && store.equipJewel(command.uid, command.heroId);
    case 'jewelryUnequip': return idOK(command.uid) && store.unequipJewel(command.uid);
    case 'jewelryEnhance': {
      if (!idOK(command.uid) || command.rulesVersion !== 2) return false;
      // HMAC is keyed by the server secret. A racing copy of the same request can
      // compute the same sample, but a retry cannot get a different outcome.
      const digest = await backend.sign(JSON.stringify(['jewelry-enhancement-v2', uid, requestId, command.uid]));
      if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('Invalid server enhancement sample');
      return store.enhanceJewel(command.uid, Number.parseInt(digest.slice(0, 12), 16) / 2 ** 48);
    }
    case 'jewelryClaim': return idOK(command.stageId) && store.claimJewelry(command.stageId, () => crypto.randomUUID());
    case 'equip': return idOK(command.uid) && idOK(command.heroId) && store.equipGear(command.uid, command.heroId);
    case 'unequip': return idOK(command.uid) && store.unequipGear(command.uid);
    case 'enhance': return idOK(command.uid) && typeof command.useStone === 'boolean' &&
      store.enhanceGear(command.uid, command.useStone);
    case 'skin': return idOK(command.uid) && store.togglePrestigeSkin(command.uid);
    case 'forge': return idOK(command.itemId) && Number.isSafeInteger(command.expectedCrafted) &&
      store.forgeWeapon(command.itemId, command.expectedCrafted);
    case 'upgrade': return idOK(command.heroId) && store.upgradeHero(command.heroId);
    case 'star': return idOK(command.heroId) && store.upgradeHeroStar(command.heroId);
    case 'summon': return store.summon(command.count, serverRandom);
    case 'battle': {
      const t = command.ticket;
      if (!t || t.id !== requestId || t.revision !== revision || !Number.isSafeInteger(t.expiresAt) ||
        t.expiresAt < Date.now() || typeof t.signature !== 'string' || !/^[a-f0-9]{64}$/.test(t.signature) ||
        !await backend.verify(ticketPayload(uid, t), t.signature)) return false;
      const stage = STAGES.find(item => item.id === t.stageId && store.isUnlocked(item.id));
      const { formation, heroExp, heroStars, equipment, jewelry } = store.snapshot;
      if (!stage || !formation.some(Boolean)) return false;
      const winner = makeStageBattle(stage, formation, heroExp, heroStars, equipment, vipLevel(vip?.paidBaseKnbTotal), jewelry).finish();
      return { winner, ...store.completeStage(stage.id, winner, requestId) };
    }
    default: return false;
  }
}

export async function handleGameRequest(intent: GameIntent, token: string, backend: GameBackend,
  legacyAllowed?: (uid: string, digest: string) => boolean) {
  const user = await backend.user(token);
  if (!user || user.is_anonymous || !user.email_confirmed_at) return { status: 'unauthorized' };
  const uid = user.id;
  if (!intent || typeof intent !== 'object') return { status: 'invalid' };
  if (intent.action === 'initialize') return backend.create(uid, baseSave());
  if (intent.action === 'import') {
    if (!legacyAllowed || intent.confirmed !== true) return { status: 'importDisabled' };
    let save: SaveV2;
    try { save = validateLegacy(intent.legacy); } catch { return { status: 'invalidSave' }; }
    // Approvals cover the exact input snapshot and are scoped to its destination UID.
    const digest = async (value: unknown) =>
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(value)))),
        byte => byte.toString(16).padStart(2, '0')).join('');
    if (!legacyAllowed(uid, await digest(intent.legacy))) return { status: 'importNotApproved' };
    const { playerName: _name, formation: _formation, lastSummon: _draws, ...progress } = save;
    return backend.create(uid, save, await digest(progress));
  }

  const row = await backend.read(uid);
  if (!row) return { status: 'missing' };
  const tutorial = row.tutorial ?? legacyTutorial();
  const authoritative = { save: row.state, revision: String(row.revision), tutorial, ...(row.vip ? {vip:row.vip} : {}) };
  if (intent.action === 'load') return { status: 'ok', ...authoritative };
  if (!revisionOK(intent.revision)) return { status: 'invalid' };

  if (intent.action === 'command') {
    if (typeof intent.requestId !== 'string' || !UUID.test(intent.requestId) ||
      !intent.command || typeof intent.command !== 'object' || typeof intent.command.type !== 'string')
      return { status: 'invalid' };
    // Replays must reach the transaction even after a revision has advanced or a ticket has expired.
    if (await backend.receipt(uid, intent.requestId))
      return backend.commit(uid, intent.requestId, intent.revision, intent.command, row.state, null);
  }
  if (intent.revision !== authoritative.revision) return { status: 'conflict', ...authoritative };

  const store = new GameStore({ read: () => null, write: () => {} }, row.state, false);
  if (intent.action === 'startBattle') {
    const stageId = intent.stageId;
    if (tutorialActive(tutorial) && (tutorial.tutorialStep !== 'battle' || stageId !== '1-1')) return { status: 'invalid' };
    if (!idOK(stageId) || !store.isUnlocked(stageId) || !row.state.formation.some(Boolean)) return { status: 'invalid' };
    const ticket = { id: crypto.randomUUID(), stageId, revision: intent.revision, expiresAt: Date.now() + 30 * 60_000 };
    return { status: 'ok', ticket: { ...ticket, signature: await backend.sign(ticketPayload(uid, ticket)) } };
  }
  if (intent.action !== 'command') return { status: 'invalid' };
  const command = intent.command;
  if (command.type === 'vipClaim') {
    if (tutorialActive(tutorial) || !backend.claimVip || !Number.isInteger(command.tier) || command.tier < 0 || command.tier > 18 ||
      !['level','daily','weekly'].includes(command.kind) || typeof command.period !== 'string' || command.period.length > 32) return {status:'rejected'};
    return backend.claimVip(uid, intent.requestId, intent.revision, command);
  }
  let receipt: unknown;
  let state = row.state;
  if (command.type === 'tutorial') {
    receipt = true;
    if (command.action === 'name') {
      const name = playerName(command.name);
      if (!name) return { status: 'rejected' };
      state = { ...state, playerName: name };
    }
  } else {
    receipt = await run(store, command, uid, intent.requestId, intent.revision, backend, row.vip);
    state = store.snapshot;
  }
  if (receipt === false || (receipt && typeof receipt === 'object' && 'ok' in receipt && !receipt.ok))
    return { status: 'rejected', receipt };
  const nextTutorial = tutorialTransition(tutorial, command, row.state, state, receipt, intent.requestId);
  if (!nextTutorial) return { status: 'rejected' };
  return backend.commit(uid, intent.requestId, intent.revision, command, state, receipt, nextTutorial);
}
