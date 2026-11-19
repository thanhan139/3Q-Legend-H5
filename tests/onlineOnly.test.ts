import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { baseSave } from '../src/domain/store';
import { newTutorial } from '../src/domain/tutorial';
import { jewelryInventoryView } from '../src/ui/jewelryInventoryView';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getSession: mocks.getSession }, functions: { invoke: mocks.invoke } }) }));

describe('online-only client boundary', () => {
  let storage: Map<string, string>;
  const session = { user: { id: 'alice', email_confirmed_at: '2026-11-15' }, access_token: 'session' } as Session;
  beforeEach(() => {
    vi.resetModules(); mocks.invoke.mockReset(); mocks.getSession.mockReset();
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging.example');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    storage = new Map();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('navigator', { onLine: true });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('never invokes local gameplay callbacks without a confirmed online save', async () => {
    const { playCommand } = await import('../src/cloud/cloudRepository');
    const offline = vi.fn(() => true);
    await expect(playCommand({ type: 'checkIn' }, offline)).rejects.toThrow();
    expect(offline).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('restores the bag and owned slot from confirmed Cloud Save after signing back in', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    const { gameStore } = await import('../src/domain/store');
    const item = { uid: '00000000-0000-4000-8000-000000000012', itemId: 'ring_r_blue', level: 22,
      highestCheckpoint: 20 as const, heroId: 'zhang-fei' };
    const confirmed = { status: 'ok', save: { ...baseSave(), jewelry: [item] }, revision: '4', tutorial: newTutorial() };
    mocks.invoke.mockResolvedValue({ data: confirmed, error: null });
    await cloudRepository.connect(session);
    cloudRepository.disconnect();
    expect(cloudRepository.active).toBe(false);
    await cloudRepository.connect(session);
    expect(jewelryInventoryView(gameStore.snapshot, 'zhang-fei', { selectedSlot: 'ring' }))
      .toMatchObject({ allJewelry: [item], bagJewelry: [], equippedJewelry: [item], selected: item, total: 0 });
    expect(mocks.invoke.mock.calls.map(([, options]) => options.body.action)).toEqual(['load', 'load']);
  });

  it('reconciles a lost Shop receipt on sign-in using the same UID and request ID', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    const { gameStore } = await import('../src/domain/store');
    const save = baseSave(), tutorial = { ...newTutorial(), tutorialCompleted: true };
    const initial = { status: 'ok', save, revision: '0', tutorial };
    const confirmed = { status: 'ok', save: { ...save, gems: save.gems - 95, goldKeys: save.goldKeys + 1,
      shopPurchases: { 'golden-key': { period: 'd:20000', bought: 1 } } }, revision: '1', tutorial };
    const receipt = { kind: 'shopPurchase', offerId: 'golden-key', quantity: 1, currency: 'gems',
      total: 95, item: 'golden_key', grant: 1 } as const;
    const quote = { ...receipt, revision: '0', requestId: '00000000-0000-4000-8000-000000000050' };
    mocks.invoke.mockResolvedValueOnce({ data: initial, error: null });
    await cloudRepository.connect(session);
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('Lost after commit') });
    await expect(cloudRepository.buyShop(quote)).rejects.toThrow();
    expect(gameStore.snapshot.goldKeys).toBe(save.goldKeys);
    cloudRepository.disconnect();
    mocks.invoke.mockResolvedValueOnce({ data: confirmed, error: null })
      .mockResolvedValueOnce({ data: { ...confirmed, receipt }, error: null })
      .mockResolvedValueOnce({ data: confirmed, error: null });
    await cloudRepository.connect(session);
    expect(gameStore.snapshot).toMatchObject(confirmed.save);
    expect(cloudRepository.hasPendingShop).toBe(false);
    const commands = mocks.invoke.mock.calls.map(([, options]) => options.body).filter(body => body.action === 'command');
    expect(commands).toEqual([commands[0], commands[0]]);
    expect(commands[0]).toMatchObject({ requestId: quote.requestId, command: { type: 'shopBuy', offerId: 'golden-key', quantity: 1 } });
  });

  it('only creates on an explicit missing response, never on a network error', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('Offline') });
    await expect(cloudRepository.connect(session)).rejects.toThrow();
    expect(mocks.invoke.mock.calls.some(([, options]) => options.body.action === 'initialize')).toBe(false);
    expect(cloudRepository.active).toBe(false);
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'missing' }, error: null });
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: baseSave(), revision: '0', tutorial: newTutorial() }, error: null });
    await expect(cloudRepository.connect(session)).resolves.toBeUndefined();
    expect(mocks.invoke.mock.calls.filter(([, options]) => options.body.action === 'initialize')).toHaveLength(1);
    expect(cloudRepository.tutorial).toEqual(newTutorial());
  });

  it('blocks offline writes, retains legacy data, and keeps unconfirmed requests for reconciliation', async () => {
    const { cloudRepository, playCommand } = await import('../src/cloud/cloudRepository');
    const legacy = JSON.stringify({ ...baseSave(), coins: 9876 });
    storage.set('3q-legend-h5-save-v1', legacy);
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: baseSave(), revision: '0', tutorial: newTutorial() }, error: null });
    await cloudRepository.connect(session);
    vi.stubGlobal('navigator', { onLine: false });
    const offline = vi.fn(() => true);
    await expect(playCommand({ type: 'tutorial', action: 'name', version: 1, step: 'welcome', name: 'Minh Chủ' }, offline)).rejects.toThrow();
    expect(offline).not.toHaveBeenCalled();
    expect(storage.get('3q-legend-h5-save-v1')).toBe(legacy);
    const cache = JSON.parse(storage.get('3q-account-save:https://staging.example:alice')!);
    expect(cache.pending.command).toMatchObject({ type: 'tutorial', action: 'name' });
    expect(cache.confirmed.save.playerName).toBe('Chúa Công');
    expect(mocks.invoke.mock.calls.some(([, options]) => options.body.action === 'initialize')).toBe(false);
    vi.stubGlobal('navigator', { onLine: true });
    const confirmed = { status: 'ok', save: { ...baseSave(), playerName: 'Minh Chủ' }, revision: '1',
      tutorial: { ...newTutorial(), tutorialStep: 'starter_heroes' }, receipt: true };
    mocks.invoke.mockResolvedValue({ data: confirmed, error: null });
    await cloudRepository.refresh();
    expect(cloudRepository.tutorial?.tutorialStep).toBe('starter_heroes');
    expect(JSON.parse(storage.get('3q-account-save:https://staging.example:alice')!).pending).toBeUndefined();
  });

  it('rejects missing M8 metadata and never adopts an edited cached save', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: baseSave(), revision: '0' }, error: null });
    await expect(cloudRepository.connect(session)).rejects.toThrow();
    expect(cloudRepository.active).toBe(false);
    storage.set('3q-account-save:https://staging.example:alice', JSON.stringify({ confirmed: {
      save: { ...baseSave(), coins: 999999 }, revision: '999', tutorial: newTutorial() } }));
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: baseSave(), revision: '0', tutorial: newTutorial() }, error: null });
    await cloudRepository.connect(session);
    const { gameStore } = await import('../src/domain/store');
    expect(gameStore.snapshot.coins).toBe(5000);
  });

  it('loads an existing character after a lost initialization response without initializing again', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'missing' }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Lost response after server commit') });
    await expect(cloudRepository.connect(session)).rejects.toThrow();
    expect(cloudRepository.active).toBe(false);
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: baseSave(), revision: '0', tutorial: newTutorial() }, error: null });
    await cloudRepository.connect(session);
    expect(mocks.invoke.mock.calls.filter(([, options]) => options.body.action === 'initialize')).toHaveLength(1);
    expect(cloudRepository.tutorial).toEqual(newTutorial());
  });

  it('rejects a reply from a superseded UID and loads only the next UID character', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    const bob = { ...session, user: { ...session.user, id: 'bob' } };
    mocks.getSession.mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValueOnce({ data: { session: bob }, error: null });
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: { ...baseSave(), coins: 6000 }, revision: '8', tutorial: newTutorial() }, error: null });
    await expect(cloudRepository.connect(session)).rejects.toThrow();
    expect(cloudRepository.active).toBe(false);
    mocks.getSession.mockResolvedValue({ data: { session: bob }, error: null });
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: { ...baseSave(), coins: 1234 }, revision: '2', tutorial: newTutorial() }, error: null });
    await cloudRepository.connect(bob);
    const { gameStore } = await import('../src/domain/store');
    expect(cloudRepository.uid).toBe('bob'); expect(gameStore.snapshot.coins).toBe(1234);
    expect(storage.has('3q-account-save:https://staging.example:alice')).toBe(false);
  });

  it('reconciles an existing pending command before automatic entry completes', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    const command = { type: 'tutorial', action: 'name', version: 1, step: 'welcome', name: 'Minh Chủ' };
    const requestId = crypto.randomUUID();
    storage.set('3q-account-save:https://staging.example:alice', JSON.stringify({ pending: {
      action: 'command', command, revision: '0', requestId,
    } }));
    const reply = { status: 'ok', save: { ...baseSave(), playerName: 'Minh Chủ' }, revision: '1',
      tutorial: { ...newTutorial(), tutorialStep: 'starter_heroes' }, receipt: true };
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'ok', save: baseSave(), revision: '0', tutorial: newTutorial() }, error: null })
      .mockResolvedValue({ data: reply, error: null });
    await cloudRepository.connect(session);
    expect(cloudRepository.tutorial?.tutorialStep).toBe('starter_heroes');
    expect(mocks.invoke.mock.calls[1][1].body).toMatchObject({ action: 'command', requestId });
    expect(JSON.parse(storage.get('3q-account-save:https://staging.example:alice')!).pending).toBeUndefined();
  });

  it('does not apply an in-flight load after disconnect', async () => {
    const { cloudRepository } = await import('../src/cloud/cloudRepository');
    let release!: (value: { data: object; error: null }) => void;
    mocks.invoke.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
    const connecting = cloudRepository.connect(session);
    const rejected = expect(connecting).rejects.toThrow();
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledOnce());
    cloudRepository.disconnect();
    release({ data: { status: 'ok', save: baseSave(), revision: '0', tutorial: newTutorial() }, error: null });
    await rejected;
    expect(cloudRepository.active).toBe(false);
    expect(storage.size).toBe(0);
  });
});
