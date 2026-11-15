import { describe, expect, it } from 'vitest';
import { baseSave, GameStore } from '../src/domain/store';
import { confirmSave, SaveCache } from '../src/cloud/saveCache';

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe('SaveV2 persistence', () => {
  it('restores rewards, training and spent currency without granting a second clear', () => {
    const device = storage();
    const repository = { read: () => device.getItem('legacy'), write: (save: object) =>
      device.setItem('legacy', JSON.stringify(save)) };
    let store = new GameStore(repository);
    expect(store.completeStage('1-1', 'player', 'battle-1').firstClear).toBe(true);
    store = new GameStore(repository);
    expect(store.snapshot).toMatchObject({ coins: 5200, trainingExp: 300, clearedStages: ['1-1'] });
    expect(store.completeStage('1-1', 'player', 'battle-1').firstClear).toBe(false);
    expect(store.upgradeHero('liu-bei')).toBe(true);
    expect(store.enhanceGear('campaign:1-1')).toBe(true);
    const expected = store.snapshot;
    expect(new GameStore(repository).snapshot).toEqual(expected);
  });

  it('commits configured first-topup rewards only after storage succeeds, even in a release build', () => {
    const device = storage();
    let fail = true;
    const repository = { read: () => device.getItem('save'), write: (save: object) => {
      if (fail) throw Error('Storage full');
      device.setItem('save', JSON.stringify(save));
    } };
    const store = new GameStore(repository, undefined, false);
    expect(store.claimFirstTopupDemo()).toBe(false);
    expect(store.snapshot).toEqual(baseSave());
    fail = false;
    expect(store.claimFirstTopupDemo()).toBe(true);
    const reloaded = new GameStore(repository);
    expect(reloaded.snapshot).toMatchObject({ coins: 6000, gems: 300, goldKeys: 7, firstTopupDemoClaimed: true });
    expect(reloaded.snapshot.heroes).toContain('zhao-yun');
    expect(reloaded.claimFirstTopupDemo()).toBe(false);
  });

  it('does not advance daily battle missions twice for the same result across reload', () => {
    const device = storage();
    const repository = { read: () => device.getItem('save'), write: (save: object) =>
      device.setItem('save', JSON.stringify(save)) };
    new GameStore(repository).completeStage('1-1', 'enemy', 'lost-match');
    const store = new GameStore(repository);
    store.completeStage('1-1', 'enemy', 'lost-match');
    expect(store.snapshot.welfare?.daily.counts.battle).toBe(1);
    expect(store.snapshot.coins).toBe(5000);
  });

  it('rejects a stale local tab write', () => {
    const device = storage();
    const repository = { read: () => device.getItem('legacy'), write: (save: object) =>
      device.setItem('legacy', JSON.stringify(save)) };
    const first = new GameStore(repository);
    const stale = new GameStore(repository);
    expect(first.claimCheckIn()).toBe(true);
    expect(stale.updateFormation(0, null)).toBe(false);
    expect(new GameStore(repository).snapshot.coins).toBe(5250);
  });

  it('reopens the UID-specific offline save, preserves pending commands and ignores stale cloud data', () => {
    const device = storage();
    let cache = new SaveCache(device, 'project');
    const confirmed = { save: baseSave(), revision: '5' };
    cache.update('alice', record => confirmSave(record, confirmed));
    const store = new GameStore({ read: () => null, write: () => { throw new Error('Wrong repository'); } });
    store.useCloudSave(confirmed.save, {
      read: () => null,
      write: offline => { cache.update('alice', record => ({ ...record, offline, offlineRevision: '5' })); },
    });
    expect(store.completeStage('1-1', 'player', 'offline-battle').firstClear).toBe(true);
    const pending = { action: 'command', command: { type: 'checkIn' },
      requestId: 'same-id-after-reload', revision: '5' } as const;
    cache.update('alice', record => ({ ...record, pending }));
    store.useLocalSave();
    cache = new SaveCache(device, 'project');
    cache.update('alice', record => confirmSave(record, { save: { ...baseSave(), coins: 5400 }, revision: '6' }));
    cache.update('alice', record => confirmSave(record, confirmed));
    expect(cache.read('bob')).toEqual({});
    expect(cache.read('alice')).toMatchObject({
      confirmed: { save: { coins: 5400 }, revision: '6' },
      offline: { coins: 5200, clearedStages: ['1-1'] }, offlineRevision: '5', pending,
    });
  });
});
