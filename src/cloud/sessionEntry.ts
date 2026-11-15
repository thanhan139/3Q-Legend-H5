import type { Session, SupabaseClient } from '@supabase/supabase-js';

type Auth = Pick<SupabaseClient['auth'], 'getSession' | 'getUser' | 'signInWithPassword' | 'signUp' | 'signOut'>;
interface Repository { connect(session: Session): Promise<unknown>; disconnect(): void }
export type EntryState = { kind: 'ready' | 'login' | 'verify' | 'link' | 'password'; session?: Session };
export class EntryError extends Error {
  constructor(readonly kind: 'connection' | 'credentials' | 'changed', message: string) { super(message); }
}
const expired = (error: unknown) => error instanceof Error &&
  ('status' in error && [401, 403, 404].includes(Number(error.status)) || error.name === 'AuthSessionMissingError');
const failure = (error: unknown): EntryError => {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'invalid_credentials') return new EntryError('credentials', 'Email hoặc mật khẩu không đúng.');
  if (code === 'email_not_confirmed') return new EntryError('credentials', 'Vui lòng xác minh email trước khi đăng nhập.');
  if (code === 'user_already_exists' || code === 'weak_password' || code === 'validation_failed' || code === 'over_email_send_rate_limit')
    return new EntryError('credentials', 'Chưa thể tạo tài khoản. Kiểm tra email, mật khẩu hoặc thử lại sau.');
  return new EntryError('connection', 'Không thể kết nối máy chủ');
};

/** One entry path for restoration, password login and registration; no save-source decisions. */
export class SessionEntry {
  private generation = 0;
  constructor(private readonly auth: Auth, private readonly repository: Repository,
    private readonly online = () => navigator.onLine) {}
  cancel() { this.generation++; }
  private assert(generation: number) {
    if (generation !== this.generation) throw new EntryError('changed', 'Phiên đăng nhập đã thay đổi.');
  }
  private async perform(action: (generation: number) => Promise<EntryState>): Promise<EntryState> {
    const generation = ++this.generation;
    if (!this.online()) throw failure(undefined);
    try { const result = await action(generation); this.assert(generation); return result; }
    catch (error) {
      this.assert(generation);
      throw error instanceof EntryError ? error : failure(error);
    }
  }
  private async enter(session: Session, generation: number, requiresPassword: (session: Session) => boolean): Promise<EntryState> {
    const verified = await this.auth.getUser();
    this.assert(generation);
    if (verified.error) {
      if (!expired(verified.error)) throw verified.error;
      const result = await this.auth.signOut({ scope: 'local' });
      this.assert(generation);
      if (result.error) throw result.error;
      this.repository.disconnect();
      return { kind: 'login' };
    }
    if (!verified.data.user || verified.data.user.id !== session.user.id) throw new EntryError('changed', 'Phiên đăng nhập đã thay đổi.');
    session = { ...session, user: verified.data.user };
    if (requiresPassword(session)) return { kind: 'password', session };
    if (session.user.is_anonymous) return { kind: 'link', session };
    if (!session.user.email_confirmed_at) return { kind: 'verify', session };
    const current = await this.auth.getSession();
    this.assert(generation);
    if (current.error) throw current.error;
    if (current.data.session?.user.id !== session.user.id) throw new EntryError('changed', 'Phiên đăng nhập đã thay đổi.');
    await this.repository.connect(current.data.session);
    this.assert(generation);
    return { kind: 'ready', session };
  }
  restore(requiresPassword: (session: Session) => boolean = () => false) {
    return this.perform(async generation => {
      const result = await this.auth.getSession();
      this.assert(generation);
      if (result.error) {
        if (!expired(result.error)) throw result.error;
        const signedOut = await this.auth.signOut({ scope: 'local' });
        this.assert(generation);
        if (signedOut.error) throw signedOut.error;
        this.repository.disconnect();
        return { kind: 'login' };
      }
      return result.data.session ? this.enter(result.data.session, generation, requiresPassword) : { kind: 'login' };
    });
  }
  login(email: string, password: string) {
    return this.perform(async generation => {
      const result = await this.auth.signInWithPassword({ email, password });
      this.assert(generation);
      if (result.error) throw result.error;
      if (!result.data.session) throw failure(undefined);
      return this.enter(result.data.session, generation, () => false);
    });
  }
  register(email: string, password: string, emailRedirectTo: string) {
    return this.perform(async generation => {
      const result = await this.auth.signUp({ email, password, options: { emailRedirectTo } });
      this.assert(generation);
      if (result.error) throw result.error;
      return result.data.session ? this.enter(result.data.session, generation, () => false) : { kind: 'verify' };
    });
  }
  async logout() {
    const generation = ++this.generation;
    this.repository.disconnect();
    try {
      const result = await this.auth.signOut({ scope: 'local' });
      this.assert(generation);
      if (result.error) throw result.error;
    } catch (error) { this.assert(generation); throw error instanceof EntryError ? error : failure(error); }
  }
}
