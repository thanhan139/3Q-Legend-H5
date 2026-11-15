import { describe, expect, it } from 'vitest';
import { handleGameRequest, type GameBackend, type SaveRow } from '../supabase/functions/game-command/handler';
import { baseSave } from '../src/domain/store';
import { legacyTutorial, newTutorial, playerName, TUTORIAL_STEPS, type TutorialProgress } from '../src/domain/tutorial';
import type { BattleTicket, GameCommand, GameIntent } from '../src/cloud/gameProtocol';

function server() {
  const saves = new Map<string, SaveRow>();
  const receipts = new Map<string, { command: GameCommand; value: unknown }>();
  let loseResponse = false;
  const view = (uid: string) => {
    const row = saves.get(uid)!;
    return { status: 'ok', save: structuredClone(row.state), revision: String(row.revision), tutorial: structuredClone(row.tutorial) };
  };
  const backend: GameBackend = {
    async user(token) { return token === 'invalid' ? null : { id: token, is_anonymous: token === 'guest',
      email_confirmed_at: token === 'unconfirmed' ? undefined : '2026-11-15' }; },
    async read(uid) { return structuredClone(saves.get(uid) ?? null); },
    async receipt(uid, id) { return receipts.has(`${uid}:${id}`); },
    async create(uid, state, fingerprint) {
      if (!saves.has(uid)) saves.set(uid, { state: structuredClone(state), revision: 0,
        tutorial: fingerprint ? legacyTutorial() : newTutorial() });
      return view(uid);
    },
    async commit(uid, id, revision, command, state, receipt, tutorial) {
      const row = saves.get(uid)!;
      const key = `${uid}:${id}`;
      const recorded = receipts.get(key);
      if (recorded) return JSON.stringify(recorded.command) === JSON.stringify(command)
        ? { ...view(uid), receipt: recorded.value } : { status: 'reused' };
      if (String(row.revision) !== revision) return { ...view(uid), status: 'conflict' };
      saves.set(uid, { state: structuredClone(state), revision: row.revision + 1, tutorial: structuredClone(tutorial) });
      receipts.set(key, { command: structuredClone(command), value: structuredClone(receipt) });
      if (loseResponse) { loseResponse = false; throw new Error('Connection lost after commit'); }
      return { ...view(uid), receipt };
    },
    async sign() { return 'f'.repeat(64); },
    async verify() { return true; },
  };
  const ask = (intent: GameIntent, uid = 'alice') => handleGameRequest(intent, uid, backend);
  const command = (value: GameCommand, uid = 'alice') => ask({ action: 'command', command: value,
    revision: String(saves.get(uid)!.revision), requestId: value.type === 'battle' ? value.ticket.id : crypto.randomUUID() }, uid);
  const tutorial = (action: 'next' | 'name' | 'skip', name?: string, uid = 'alice') => {
    const current = saves.get(uid)!.tutorial!;
    return command({ type: 'tutorial', version: current.tutorialVersion, step: current.tutorialStep, action,
      ...(name !== undefined ? { name } : {}) }, uid);
  };
  async function untilBattle() {
    await ask({ action: 'initialize' });
    await tutorial('name', '  Minh   Chủ  ');
    await tutorial('next');
    await command({ type: 'formation', slot: 0, heroId: 'zhang-fei' });
    await tutorial('next');
    await tutorial('next');
  }
  return { saves, receipts, ask, command, tutorial, untilBattle, loseNextResponse: () => { loseResponse = true; } };
}

describe('M8 server onboarding', () => {
  it('initializes once with unchanged starting resources and UID-specific tutorials', async () => {
    const { ask, saves, tutorial } = server();
    const first = await ask({ action: 'initialize' });
    expect(first).toMatchObject({ save: baseSave(), revision: '0', tutorial: newTutorial() });
    await tutorial('name', 'Minh Chủ');
    await Promise.all([ask({ action: 'initialize' }), ask({ action: 'initialize' })]);
    expect(saves.get('alice')).toMatchObject({ revision: 1, state: { playerName: 'Minh Chủ' },
      tutorial: { tutorialStep: 'starter_heroes' } });
    await ask({ action: 'initialize' }, 'bob');
    expect(saves.get('bob')!.tutorial).toEqual(newTutorial());
  });

  it('keeps existing saves exempt without changing their progress', async () => {
    const { ask, saves } = server();
    const state = { ...baseSave(), coins: 1234, clearedStages: ['1-1'] };
    saves.set('alice', { state, revision: 7 });
    expect(await ask({ action: 'load' })).toMatchObject({ save: state, revision: '7', tutorial: legacyTutorial() });
    expect(saves.get('alice')!.state).toEqual(state);
  });

  it('requires a confirmed non-anonymous account', async () => {
    const { ask, saves } = server();
    for (const uid of ['invalid', 'guest', 'unconfirmed'])
      expect(await ask({ action: 'initialize' }, uid)).toEqual({ status: 'unauthorized' });
    expect(saves.size).toBe(0);
  });

  it('validates names and rejects step jumps and unrelated resource spending', async () => {
    const { ask, tutorial, command, saves } = server();
    await ask({ action: 'initialize' });
    expect(await tutorial('name', '<script>')).toMatchObject({ status: 'rejected' });
    expect(await tutorial('next')).toMatchObject({ status: 'rejected' });
    expect(await command({ type: 'checkIn' })).toMatchObject({ status: 'rejected' });
    expect(await command({ type: 'tutorial', version: 1, step: 'arena_intro', action: 'next' })).toMatchObject({ status: 'rejected' });
    expect(saves.get('alice')!.state).toEqual(baseSave());
    expect(await tutorial('name', '  Minh   Chủ  ')).toMatchObject({ status: 'ok', save: { playerName: 'Minh Chủ' } });
  });

  it('persists each step across loads, rejects stale tabs and cannot repeat an upgrade', async () => {
    const { ask, command, tutorial, untilBattle, saves } = server();
    await untilBattle();
    expect(await ask({ action: 'load' })).toMatchObject({ tutorial: { tutorialStep: 'battle' } });
    const revision = String(saves.get('alice')!.revision);
    const start = await ask({ action: 'startBattle', stageId: '1-1', revision });
    const ticket = (start as { ticket: BattleTicket }).ticket;
    expect(ticket).toBeDefined();
    expect(await command({ type: 'battle', ticket })).toMatchObject({ status: 'ok', tutorial: { tutorialStep: 'rewards' } });
    expect(await ask({ action: 'command', revision, requestId: crypto.randomUUID(),
      command: { type: 'tutorial', version: 1, step: 'battle', action: 'skip' } })).toMatchObject({ status: 'conflict' });
    await tutorial('next'); await tutorial('next');
    expect(await command({ type: 'upgrade', heroId: 'zhang-fei' })).toMatchObject({ status: 'ok', tutorial: { tutorialStep: 'lobby_tour' } });
    const after = structuredClone(saves.get('alice'));
    expect(await command({ type: 'upgrade', heroId: 'zhang-fei' })).toMatchObject({ status: 'rejected' });
    expect(saves.get('alice')).toEqual(after);
    expect(after!.state.trainingExp).toBe(200);
    expect(after!.state.heroExp['zhang-fei']).toBe(100);
    for (let index = 0; index < 4; index++) await tutorial('next');
    expect(await ask({ action: 'load' })).toMatchObject({ tutorial: { tutorialStep: 'done', tutorialCompleted: true, tutorialSkipped: false } });
  });

  it('uses a single reward receipt even when the response is lost after commit', async () => {
    const { ask, untilBattle, saves, receipts, loseNextResponse } = server();
    await untilBattle();
    const revision = String(saves.get('alice')!.revision);
    const start = await ask({ action: 'startBattle', stageId: '1-1', revision });
    const ticket = (start as { ticket: BattleTicket }).ticket;
    const request: GameIntent = { action: 'command', command: { type: 'battle', ticket }, revision, requestId: ticket.id };
    loseNextResponse();
    await expect(ask(request)).rejects.toThrow('Connection lost');
    const saved = structuredClone(saves.get('alice'));
    expect(await ask(request)).toMatchObject({ status: 'ok', tutorial: { tutorialStep: 'rewards', battleReceipt: { requestId: ticket.id } } });
    expect(saves.get('alice')).toEqual(saved);
    expect(saved!.state).toMatchObject({ coins: 5200, trainingExp: 300, goldKeys: 2, clearedStages: ['1-1'] });
    expect([...receipts.values()].filter(row => row.command.type === 'battle')).toHaveLength(1);
    expect(await ask({ ...request, revision: String(saved!.revision), requestId: crypto.randomUUID() })).toMatchObject({ status: 'rejected' });
  });

  it('records skip at every active step without granting or removing resources', async () => {
    for (const step of TUTORIAL_STEPS.filter(value => value !== 'done')) {
      const { saves, tutorial, ask } = server();
      const state = baseSave();
      const progress: TutorialProgress = { ...newTutorial(), tutorialStep: step };
      saves.set('alice', { state, revision: 0, tutorial: progress });
      expect(await tutorial('skip')).toMatchObject({ status: 'ok', tutorial: { tutorialSkipped: true, tutorialCompleted: false } });
      expect(saves.get('alice')!.state).toEqual(state);
      expect(await ask({ action: 'load' })).toMatchObject({ tutorial: { tutorialSkipped: true } });
      expect(await tutorial('skip')).toMatchObject({ status: 'rejected' });
    }
  });

  it('only permits the configured first battle after its explanation', async () => {
    const { ask, saves, untilBattle } = server();
    await ask({ action: 'initialize' });
    expect(await ask({ action: 'startBattle', stageId: '1-1', revision: '0' })).toMatchObject({ status: 'invalid' });
    await untilBattle();
    expect(await ask({ action: 'startBattle', stageId: '1-2', revision: String(saves.get('alice')!.revision) })).toMatchObject({ status: 'invalid' });
  });
});

describe('Chúa Công names', () => {
  it('supports Vietnamese and normalizes whitespace and Unicode without accepting markup or controls', () => {
    expect(playerName('  Nguyễn   An ')).toBe('Nguyễn An');
    for (const name of ['', 'A', 'x'.repeat(25), 'Minh\nChủ', '<b>Minh</b>', 'An😀']) expect(playerName(name)).toBeUndefined();
  });
});
