import { describe, expect, it, vi } from 'vitest';
import { handleGameRequest, type GameBackend, type SaveRow } from '../supabase/functions/game-command/handler';
import { baseSave, GameStore } from '../src/domain/store';
import type { GameCommand, GameIntent } from '../src/cloud/gameProtocol';
import { validateLegacy } from '../src/cloud/validateLegacy';
import { COPPER_ECONOMY } from '../src/domain/copperEconomy';
import { welfareDay } from '../src/domain/welfare';

function fixture(options: Pick<GameBackend, 'economyTestEnabled' | 'hasRankedWin'> = {}) {
  const saves = new Map<string, SaveRow>();
  const receipts = new Map<string, { command: GameCommand; receipt: unknown }>();
  const backend: GameBackend = {
    ...options,
    async user(token) {
      return ['alice', 'bob', 'unconfirmed'].includes(token)
        ? { id: token, email_confirmed_at: token !== 'unconfirmed' ? '2026-11-15' : undefined } : null;
    },
    async read(uid) { return saves.get(uid) ?? null; },
    async receipt(uid, requestId) { return receipts.has(uid + requestId); },
    async create(uid, state) {
      if (!saves.has(uid)) saves.set(uid, { state, revision: 0 });
      return { status: 'ok', save: saves.get(uid)!.state, revision: String(saves.get(uid)!.revision) };
    },
    async commit(uid, requestId, revision, command, state, receipt) {
      const current = saves.get(uid)!;
      const key = uid + requestId;
      if (receipts.has(key)) return { status: 'ok', save: current.state, receipt: receipts.get(key)!.receipt };
      if (Number(revision) !== current.revision) return { status: 'conflict', save: current.state };
      saves.set(uid, { state, revision: current.revision + 1 });
      receipts.set(key, { command, receipt });
      return { status: 'ok', save: state, receipt };
    },
    async sign(message) { signed.add(message); return 'f'.repeat(64); },
    async verify(message, signature) { return signature === 'f'.repeat(64) && signed.has(message); },
  };
  const signed = new Set<string>();
  return { saves, ask: (intent: GameIntent, user = 'alice', legacy?: (uid: string, digest: string) => boolean) =>
    handleGameRequest(intent, user, backend, legacy) };
}

describe('cloud save boundary', () => {
  it('grants V1.4 campaign Copper once on first clear, and caps replay wins by Vietnam day', async () => {
    const now = Date.parse('2026-11-19T16:59:00Z');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const {ask,saves} = fixture({economyTestEnabled: uid => uid === 'alice'});
      const battle = async (uid: string) => {
        const revision = String(saves.get(uid)!.revision);
        const result = await ask({action:'startBattle',stageId:'1-1',revision},uid);
        if (!('ticket' in result)) throw new Error('Missing battle ticket');
        const ticket = result.ticket as Extract<GameCommand,{type:'battle'}>['ticket'];
        const command = {action:'command',command:{type:'battle',ticket},revision,requestId:ticket.id} as const;
        const settled = await ask(command,uid);
        expect(settled).toMatchObject({status:'ok',receipt:{winner:'player'}});
        const revisionAfter = saves.get(uid)!.revision;
        expect(await ask(command,uid)).toMatchObject({status:'ok'});
        expect(saves.get(uid)?.revision).toBe(revisionAfter);
      };
      for (const uid of ['alice','bob']) await ask({action:'initialize'},uid);
      await battle('alice');
      await battle('bob');
      expect(saves.get('alice')?.state).toMatchObject({copper:2000,coins:5200,gems:300});
      expect(saves.get('bob')?.state.copper).toBeUndefined();
      for (let n = 0; n <= COPPER_ECONOMY.replayDailyLimit; n++) await battle('alice');
      expect(saves.get('alice')?.state).toMatchObject({copper:5000,coins:5200,gems:300});
      clock.mockReturnValue(now + 60_000);
      await battle('alice');
      expect(saves.get('alice')?.state).toMatchObject({copper:6000,copperDaily:{campaignReplays:1}});
      expect(validateLegacy({...baseSave(),copperDaily:{day:welfareDay(),arenaClaimed:true,campaignReplays:3}})).not.toHaveProperty('copperDaily');
    } finally { clock.mockRestore(); }
  });

  it('keeps daily Copper and ranked claims scoped to verified UID, day and revision', async () => {
    const start = Date.parse('2026-11-18T17:00:00Z');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    const verified = vi.fn(async (uid: string, from: number) => uid === 'alice' && from === start);
    try {
      const {ask,saves} = fixture({economyTestEnabled:()=>true,hasRankedWin:verified});
      const day = welfareDay();
      const daily = {day,counts:{win:1},claimed:[]};
      for (const uid of ['alice','bob']) saves.set(uid,{state:{...baseSave(),welfare:{checkIns:0,checkInDay:0,daily}},revision:0});
      const intent = (command: GameCommand, revision: string) => ({action:'command',revision,requestId:crypto.randomUUID(),command} as const);
      const reward = intent({type:'daily',mission:'win'},'0');
      expect(await ask(reward)).toMatchObject({status:'ok',save:{copper:1000,coins:5250,gems:300}});
      expect(await ask(reward)).toMatchObject({status:'ok',save:{copper:1000}});
      expect(await ask(intent({type:'daily',mission:'win'},'1'))).toMatchObject({status:'rejected'});
      const ranked = intent({type:'arenaCopper',day},'1');
      expect(await ask(intent({type:'arenaCopper',day},'0'),'bob')).toMatchObject({status:'rejected'});
      const simultaneous = await Promise.all([ask(ranked),ask({...ranked,requestId:crypto.randomUUID()})]);
      expect(simultaneous.map(r => (r as {status:string}).status).sort()).toEqual(['conflict','ok']);
      expect(await ask(ranked)).toMatchObject({status:'ok',save:{copper:5000,coins:5250,gems:300}});
      expect(await ask(intent({type:'arenaCopper',day},'2'))).toMatchObject({status:'rejected'});
      expect(verified).toHaveBeenCalledWith('alice',start,start+86_400_000);
      clock.mockReturnValue(start+86_400_000);
      expect(await ask(intent({type:'arenaCopper',day},'2'))).toMatchObject({status:'rejected'});
      expect(await ask(intent({type:'arenaCopper',day:day+1},'2'))).toMatchObject({status:'rejected'});
      expect(saves.get('bob')?.state.copper).toBeUndefined();
    } finally { clock.mockRestore(); }
  });
  it('commits a single-key draw once and rejects a concurrent stale batch', async () => {
    const { ask, saves } = fixture();
    const initial = { ...baseSave(), goldKeys: 11, clearedStages: ['1-1', '1-2', '1-3'], summonPity: 49, legendaryPity: 0 };
    saves.set('alice', { state: initial, revision: 0 });
    const intent = { action: 'command', command: { type: 'summon', count: 1 }, revision: '0', requestId: crypto.randomUUID() } as const;
    const results = await Promise.all([ask(intent), ask({ ...intent, requestId: crypto.randomUUID(), command: { type: 'summon', count: 10 } })]);
    expect(results[0]).toMatchObject({ status: 'ok' });
    expect(results[1]).toMatchObject({ status: 'conflict' });
    expect(saves.get('alice')!.state.goldKeys).toBe(10);
    expect(saves.get('alice')!.state.lastSummon).toHaveLength(1);
    expect(saves.get('alice')!.state.lastSummon![0].rarity).toMatch(/SSR|SSS\+/);
    await ask(intent);
    expect(saves.get('alice')!.revision).toBe(1);
    expect(saves.get('alice')!.state.goldKeys).toBe(10);
  });
  it('reconciles a lost summon response by replaying one request ID without charging twice or crossing UID', async () => {
    const { ask, saves } = fixture();
    await ask({ action: 'initialize' });
    await ask({ action: 'initialize' }, 'bob');
    const initial = { ...baseSave(), goldKeys: 10, clearedStages: ['1-1', '1-2', '1-3'], summonPity: 49, legendaryPity: 99 };
    saves.set('alice', { state: initial, revision: 0 });
    const intent = { action: 'command', command: { type: 'summon', count: 10 }, revision: '0', requestId: crypto.randomUUID() } as const;
    // First response is deliberately discarded, as with a dropped network response.
    await ask(intent);
    const confirmed = structuredClone(saves.get('alice'));
    const replay = await ask(intent);
    expect(replay).toMatchObject({ status: 'ok', receipt: { ok: true, draws: expect.arrayContaining([expect.objectContaining({ rarity: 'SSS+' })]) } });
    expect(confirmed!.state.lastSummon![0].rarity).toBe('SSS+');
    expect(saves.get('alice')).toEqual(confirmed);
    expect(confirmed!.state.goldKeys).toBe(0);
    expect(confirmed!.revision).toBe(1);
    expect(saves.get('bob')!.state).toEqual(baseSave());
    expect(await ask({ action: 'load' })).toMatchObject({ save: confirmed!.state });
    expect(await ask({ ...intent, revision: '1', requestId: crypto.randomUUID() })).toMatchObject({ status: 'rejected' });
  });
  it('requires a confirmed account and scopes reads to the verified UID', async () => {
    const { ask } = fixture();
    expect(await ask({ action: 'initialize' }, 'unconfirmed')).toEqual({ status: 'unauthorized' });
    expect(await ask({ action: 'initialize' }, 'invalid')).toEqual({ status: 'unauthorized' });
    expect(await ask({ action: 'initialize' })).toMatchObject({ status: 'ok' });
    expect(await ask({ action: 'load' }, 'bob')).toEqual({ status: 'missing' });
  });

  it('uses a single receipt when retried and returns a conflict on stale requests', async () => {
    const { ask, saves } = fixture();
    await ask({ action: 'initialize' });
    const request: GameIntent = { action: 'command', command: { type: 'checkIn' }, revision: '0', requestId: crypto.randomUUID() };
    expect(await ask(request)).toMatchObject({ status: 'ok', receipt: true });
    expect(await ask(request)).toMatchObject({ status: 'ok', receipt: true });
    expect(saves.get('alice')!.revision).toBe(1);
    expect(saves.get('alice')!.state.coins).toBe(5250);
    expect(await ask({ ...request, requestId: crypto.randomUUID() })).toMatchObject({ status: 'conflict', revision: '1' });
    expect(await ask({ ...request, revision: '1', requestId: crypto.randomUUID() })).toMatchObject({ status: 'rejected' });
  });

  it('grants the configured first-topup demo once through the server transaction', async () => {
    const { ask, saves } = fixture();
    await ask({ action: 'initialize' });
    const command = { action: 'command', command: { type: 'firstTopupDemo' }, revision: '0',
      requestId: crypto.randomUUID() } as const;
    expect(await ask(command)).toMatchObject({ status: 'ok', receipt: true });
    expect(await ask(command)).toMatchObject({ status: 'ok', receipt: true });
    expect(await ask({ ...command, revision: '1', requestId: crypto.randomUUID() })).toMatchObject({ status: 'rejected' });
    expect(await ask({ action: 'load' })).toMatchObject({ status: 'ok', revision: '1',
      save: { firstTopupDemoClaimed: true, coins: 6000, goldKeys: 7 } });
    expect(saves.get('alice')!.state.heroes).toContain('zhao-yun');
  });

  it('binds battle tickets to UID and revision and calculates the result on the server', async () => {
    const { ask, saves } = fixture();
    await ask({ action: 'initialize' });
    await ask({ action: 'initialize' }, 'bob');
    expect(await ask({ action: 'startBattle', stageId: '1-5', revision: '0' })).toEqual({ status: 'invalid' });
    const started = await ask({ action: 'startBattle', stageId: '1-1', revision: '0' });
    if (!('ticket' in started)) throw new Error('Missing battle ticket');
    const ticket = started.ticket as Extract<GameCommand, { type: 'battle' }>['ticket'];
    const intent: GameIntent = { action: 'command', command: { type: 'battle', ticket }, revision: '0', requestId: ticket.id };
    expect(await ask(intent, 'bob')).toMatchObject({ status: 'rejected' });
    expect(await ask({ ...intent, command: { type: 'battle', ticket: { ...ticket, stageId: '1-5' } } }))
      .toMatchObject({ status: 'rejected' });
    expect(await ask(intent)).toMatchObject({ status: 'ok', receipt: { winner: 'player', firstClear: true } });
    expect(await ask(intent)).toMatchObject({ status: 'ok', receipt: { firstClear: true } });
    expect(saves.get('alice')!.state).toMatchObject({ clearedStages: ['1-1'], coins: 5200, trainingExp: 300 });
  });

  it('validates legacy saves and only imports explicitly when enabled', async () => {
    const { ask } = fixture();
    const legacy = { ...baseSave(), coins: 1234, clearedStages: ['1-1'] };
    expect(validateLegacy(legacy)).toMatchObject({ coins: 1234, equipment: [{ uid: 'campaign:1-1' }] });
    expect(() => validateLegacy({ ...legacy, clearedStages: ['1-5'] })).toThrow();
    expect(() => validateLegacy({ ...legacy, goldKeys: Number.MAX_SAFE_INTEGER })).toThrow();
    const request = { action: 'import', legacy, confirmed: true } as const;
    expect(await ask(request)).toEqual({ status: 'importDisabled' });
    expect(await ask(request, 'bob', uid => uid === 'alice')).toEqual({ status: 'importNotApproved' });
    expect(await ask(request, 'alice', uid => uid === 'alice')).toMatchObject({ status: 'ok', save: { coins: 1234 } });
  });

  it('keeps the offline snapshot separate from the cloud snapshot', () => {
    let local = baseSave();
    const store = new GameStore({ read: () => JSON.stringify(local), write: value => { local = value; } });
    store.useCloudSave({ ...baseSave(), coins: 6530 });
    expect(store.claimCheckIn()).toBe(false);
    expect(store.updateFormation(0, null)).toBe(false);
    expect(store.snapshot.coins).toBe(6530);
    store.useLocalSave();
    expect(store.snapshot.coins).toBe(5000);
    expect(store.claimCheckIn()).toBe(true);
    expect(local.coins).toBe(5250);
  });
});
