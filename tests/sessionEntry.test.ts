import { describe, expect, it, vi } from 'vitest';
import { AuthApiError, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { SessionEntry } from '../src/cloud/sessionEntry';

type Auth = SupabaseClient['auth'];
const alice = { user: { id: 'alice', email_confirmed_at: '2026-11-15', is_anonymous: false }, access_token: 'alice-token' } as Session;
const bob = { ...alice, user: { ...alice.user, id: 'bob' }, access_token: 'bob-token' };
function fixture() {
  let session: Session | null = alice;
  let online = true;
  const auth = {
    getSession: vi.fn<Auth['getSession']>().mockImplementation(async () => session
      ? { data: { session }, error: null } : { data: { session: null }, error: null }),
    getUser: vi.fn<Auth['getUser']>().mockImplementation(async () => ({ data: { user: session!.user }, error: null })),
    signInWithPassword: vi.fn<Auth['signInWithPassword']>().mockImplementation(async () => ({ data: { session: session!, user: session!.user }, error: null })),
    signUp: vi.fn<Auth['signUp']>().mockImplementation(async () => ({ data: { session, user: session?.user ?? null }, error: null })),
    signOut: vi.fn<Auth['signOut']>().mockImplementation(async () => { session = null; return { error: null }; }),
  };
  const repository = { connect: vi.fn(async (_session: Session) => {}), disconnect: vi.fn() };
  const entry = new SessionEntry(auth, repository, () => online);
  return { auth, repository, entry, setSession: (value: Session | null) => { session = value; }, offline: () => { online = false; } };
}

describe('automatic account entry', () => {
  it('restores a valid session and enters without password login or registration', async () => {
    const { auth, entry, repository } = fixture();
    expect(await entry.restore()).toMatchObject({ kind: 'ready', session: { user: { id: 'alice' } } });
    expect(repository.connect).toHaveBeenCalledExactlyOnceWith(alice);
    expect(auth.signInWithPassword).not.toHaveBeenCalled(); expect(auth.signUp).not.toHaveBeenCalled();
  });
  it('shows login when no session exists and automatically connects after password login', async () => {
    const { entry, setSession, repository } = fixture();
    setSession(null); expect(await entry.restore()).toEqual({ kind: 'login' });
    expect(repository.connect).not.toHaveBeenCalled();
    setSession(alice); expect(await entry.login('alice@example.com', 'password')).toMatchObject({ kind: 'ready' });
    expect(repository.connect).toHaveBeenCalledExactlyOnceWith(alice);
  });
  it('waits for email verification when registration has no session, then resumes automatically', async () => {
    const { entry, setSession, repository, auth } = fixture();
    setSession(null);
    expect(await entry.register('alice@example.com', 'password', 'https://game.example/')).toEqual({ kind: 'verify' });
    expect(repository.connect).not.toHaveBeenCalled();
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'password', options: { emailRedirectTo: 'https://game.example/' } });
    setSession(alice); expect(await entry.restore()).toMatchObject({ kind: 'ready' });
  });
  it('enters immediately when registration returns a confirmed session', async () => {
    const { entry, repository } = fixture();
    expect(await entry.register('alice@example.com', 'password', 'https://game.example/')).toMatchObject({ kind: 'ready' });
    expect(repository.connect).toHaveBeenCalledExactlyOnceWith(alice);
  });
  it('does not connect unconfirmed accounts or create a new UID for existing guests', async () => {
    const { entry, repository, setSession } = fixture();
    setSession({ ...alice, user: { ...alice.user, email_confirmed_at: undefined } });
    expect(await entry.restore()).toMatchObject({ kind: 'verify' });
    setSession({ ...alice, user: { ...alice.user, is_anonymous: true } });
    expect(await entry.restore()).toMatchObject({ kind: 'link', session: { user: { id: 'alice' } } });
    expect(repository.connect).not.toHaveBeenCalled();
  });
  it('keeps wrong-password errors on the login path without calling game APIs', async () => {
    const { entry, auth, repository } = fixture();
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: new AuthApiError('Invalid credentials', 400, 'invalid_credentials') });
    await expect(entry.login('alice@example.com', 'wrong')).rejects.toMatchObject({ kind: 'credentials', message: 'Email hoặc mật khẩu không đúng.' });
    expect(repository.connect).not.toHaveBeenCalled();
  });
  it('reports offline and temporary auth errors without deleting the session or connecting a save', async () => {
    const first = fixture(); first.offline();
    await expect(first.entry.restore()).rejects.toMatchObject({ kind: 'connection', message: 'Không thể kết nối máy chủ' });
    expect(first.auth.getSession).not.toHaveBeenCalled();
    const second = fixture();
    second.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthApiError('Unavailable', 503, undefined) });
    await expect(second.entry.restore()).rejects.toMatchObject({ kind: 'connection' });
    expect(second.auth.signOut).not.toHaveBeenCalled(); expect(second.repository.connect).not.toHaveBeenCalled();
    expect(await second.entry.restore()).toMatchObject({ kind: 'ready' });
  });
  it('only clears a session after the server confirms it has expired', async () => {
    const { entry, auth, repository } = fixture();
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthApiError('Expired', 401, undefined) });
    expect(await entry.restore()).toEqual({ kind: 'login' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(repository.disconnect).toHaveBeenCalledOnce(); expect(repository.connect).not.toHaveBeenCalled();
  });
  it('retries a failed cloud load using the same session instead of registering again', async () => {
    const { entry, auth, repository } = fixture();
    repository.connect.mockRejectedValueOnce(new Error('Network error'));
    await expect(entry.login('alice@example.com', 'password')).rejects.toMatchObject({ kind: 'connection' });
    expect(await entry.restore()).toMatchObject({ kind: 'ready' });
    expect(auth.signInWithPassword).toHaveBeenCalledOnce(); expect(auth.signUp).not.toHaveBeenCalled();
    expect(repository.connect).toHaveBeenCalledTimes(2);
  });
  it('disconnects on logout and uses the next UID on subsequent entry', async () => {
    const { entry, repository, setSession } = fixture();
    await entry.restore(); await entry.logout();
    expect(repository.disconnect).toHaveBeenCalledOnce();
    expect(await entry.restore()).toEqual({ kind: 'login' });
    setSession(bob); expect(await entry.restore()).toMatchObject({ kind: 'ready', session: { user: { id: 'bob' } } });
    expect(repository.connect.mock.calls.map(([session]) => session.user.id)).toEqual(['alice', 'bob']);
  });
  it('rejects a late authentication response after logout', async () => {
    const { auth, entry, repository } = fixture();
    let resolve!: (value: Awaited<ReturnType<Auth['getUser']>>) => void;
    auth.getUser.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const restoring = entry.restore();
    const rejected = expect(restoring).rejects.toMatchObject({ kind: 'changed' });
    await vi.waitFor(() => expect(auth.getUser).toHaveBeenCalledOnce());
    await entry.logout(); resolve({ data: { user: alice.user }, error: null });
    await rejected; expect(repository.connect).not.toHaveBeenCalled();
  });
  it('keeps password recovery ahead of game entry and rejects UID changes during verification', async () => {
    const { entry, repository, auth } = fixture();
    expect(await entry.restore(() => true)).toMatchObject({ kind: 'password' });
    expect(repository.connect).not.toHaveBeenCalled();
    auth.getSession.mockResolvedValueOnce({ data: { session: alice }, error: null })
      .mockResolvedValueOnce({ data: { session: bob }, error: null });
    await expect(entry.restore()).rejects.toMatchObject({ kind: 'changed' });
    expect(repository.connect).not.toHaveBeenCalled();
  });
});
