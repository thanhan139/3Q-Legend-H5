import type { Session } from '@supabase/supabase-js';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { cloudRepository, supabase } from './cloudRepository';
import { EntryError, SessionEntry, type EntryState } from './sessionEntry';

type Mode = 'login' | 'register' | 'forgot' | 'password' | 'link' | 'account' | 'loading' | 'connection' | 'verify';
const redirect = (passwordReset = false) => {
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  if (passwordReset) url.searchParams.set('auth', 'recovery');
  return url.href;
};
let recoveryCallback = new URLSearchParams(location.search).get('auth') === 'recovery';
let recovery = false;
let pendingLink: string | null = null;
let showing: Promise<void> | undefined;
const entry = supabase ? new SessionEntry(supabase.auth, cloudRepository) : undefined;

supabase?.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') recovery = true;
  if ((event === 'SIGNED_OUT' || event === 'SIGNED_IN') && cloudRepository.uid && session?.user.id !== cloudRepository.uid) {
    entry?.cancel(); cloudRepository.disconnect();
    if (!showing) location.reload();
  }
  if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')
    setTimeout(() => window.dispatchEvent(new Event('3q:auth-ready')), 0);
});

export function initialAccount() { return show('entry'); }
export function openAccount() { return show('manage'); }
/** UI entry point shared by account management and the player profile. */
export async function logoutAccount() {
  if (!entry) throw new EntryError('connection', 'Không thể kết nối máy chủ');
  await entry.logout();
  location.reload();
}
function show(purpose: 'entry' | 'manage') {
  if (showing) return showing;
  showing = showAccount(purpose).finally(() => { showing = undefined; });
  return showing;
}

async function showAccount(purpose: 'entry' | 'manage') {
  const dialog = document.createElement('dialog'); dialog.className = 'account-dialog';
  dialog.style.setProperty('--account-background', `url("${LOBBY_ASSETS.palace.url}")`);
  dialog.addEventListener('cancel', event => event.preventDefault());
  document.body.append(dialog); dialog.showModal();
  let session: Session | undefined;
  let mode: Mode = 'loading';
  let working = false;
  let retryAction: () => void | Promise<void> = boot;
  let finish!: () => void;
  const done = new Promise<void>(resolve => { finish = resolve; });
  const authReady = () => { if (!working && ['login', 'verify', 'link'].includes(mode)) void run(boot); };
  window.addEventListener('3q:auth-ready', authReady);
  const close = () => {
    window.removeEventListener('3q:auth-ready', authReady);
    dialog.close(); dialog.remove(); finish();
  };
  const requiresPassword = (value: Session) => {
    let linked = pendingLink;
    try { linked ??= sessionStorage.getItem('3q-link-uid'); } catch { /* Optional callback context. */ }
    return recovery || (recoveryCallback && !new URLSearchParams(location.search).has('code')) ||
      Boolean(linked === value.user.id && value.user.email_confirmed_at);
  };
  const accept = (state: EntryState) => {
    session = state.session;
    if (state.kind === 'ready') {
      if (purpose === 'entry') close(); else render('account');
    } else render(state.kind);
  };
  async function boot() {
    render('loading');
    if (!entry) throw new EntryError('connection', 'Không thể kết nối máy chủ');
    accept(await entry.restore(requiresPassword));
  }
  async function run(action: () => void | Promise<void>, fallback: Mode = 'login', retry: () => void | Promise<void> = boot) {
    if (working) return;
    working = true;
    dialog.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try { await action(); }
    catch (error) {
      if (!dialog.open) return;
      if (error instanceof EntryError && error.kind === 'changed') {
        try { await boot(); return; } catch (restoredError) { error = restoredError; }
      }
      if (error instanceof EntryError && error.kind === 'credentials') render(fallback, error.message);
      else { retryAction = retry; render('connection'); }
    } finally {
      working = false;
      dialog.querySelectorAll('button').forEach(button => { button.disabled = false; });
    }
  }
  function render(next: Mode, message = '') {
    mode = next; dialog.replaceChildren();
    const form = document.createElement('form'); form.className = 'account-card';
    const heading = document.createElement('h1');
    heading.textContent = ({ login: 'Đăng nhập', register: 'Đăng ký', forgot: 'Quên mật khẩu', password: 'Đặt mật khẩu',
      link: 'Liên kết email', account: 'Tài khoản', loading: 'Đang kết nối…', connection: 'Không thể kết nối máy chủ', verify: 'Xác minh email' })[next];
    form.append(heading);
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = message;
    const field = (label: string, type: string, autocomplete: string) => {
      const wrap = document.createElement('label'); wrap.textContent = label;
      const input = document.createElement('input'); input.type = type; input.required = true;
      input.setAttribute('autocomplete', autocomplete);
      if (type === 'password') input.minLength = 6;
      wrap.append(input); form.append(wrap); return input;
    };
    const button = (label: string, action?: () => void | Promise<void>, retry: () => void | Promise<void> = boot) => {
      const control = document.createElement('button'); control.textContent = label;
      control.type = action ? 'button' : 'submit'; control.disabled = working;
      if (action) control.onclick = () => { void run(action, next, retry); };
      form.append(control);
    };
    const signOut = async () => {
      // A fresh Boot prevents an old scene or async callback surviving an account switch.
      await logoutAccount();
    };
    if (next === 'loading') status.textContent = 'Đang xác thực và tải dữ liệu nhân vật…';
    else if (next === 'connection') button('Thử lại', retryAction, retryAction);
    else if (next === 'verify') {
      status.textContent ||= 'Mở email xác minh để kích hoạt tài khoản. Sau xác minh, game tự tiếp tục khi phiên đăng nhập sẵn sàng.';
      button('Đã xác minh · Kiểm tra lại', boot);
      button('Về đăng nhập', async () => {
        if (session) { await entry?.logout(); session = undefined; }
        render('login');
      });
    } else if (next === 'account') {
      const uid = document.createElement('p'); uid.textContent = `UID · ${session?.user.id ?? ''}`; form.append(uid);
      if (session?.user.email_confirmed_at) button('Đặt mật khẩu', () => render('password'));
      button('Đăng xuất', signOut, signOut); button('Đóng', close);
    } else {
      if (next === 'link') status.textContent ||= 'Liên kết và xác minh email để tiếp tục trên cùng UID. Tiến trình được giữ nguyên.';
      const email = next === 'password' ? undefined : field('Email', 'email', 'email');
      const password = ['login', 'register', 'password'].includes(next)
        ? field('Mật khẩu', 'password', next === 'login' ? 'current-password' : 'new-password') : undefined;
      button(({ login: 'Đăng nhập', register: 'Tạo tài khoản', forgot: 'Gửi email đặt lại mật khẩu',
        password: 'Lưu mật khẩu', link: 'Gửi xác minh email' })[next]);
      form.onsubmit = event => {
        event.preventDefault();
        void run(async () => {
          if (!supabase || !entry) throw new EntryError('connection', 'Không thể kết nối máy chủ');
          const address = email?.value.trim() ?? '';
          if (next === 'login' || next === 'register') {
            const value = password!.value; render('loading');
            accept(await (next === 'login' ? entry.login(address, value) : entry.register(address, value, redirect())));
          } else if (next === 'forgot') {
            const result = await supabase.auth.resetPasswordForEmail(address, { redirectTo: redirect(true) });
            if (result.error) throw result.error;
            render('login', 'Kiểm tra hộp thư để đặt lại mật khẩu.');
          } else if (next === 'link') {
            const result = await supabase.auth.updateUser({ email: address }, { emailRedirectTo: redirect() });
            if (result.error) throw result.error;
            pendingLink = session?.user.id ?? null;
            try { if (pendingLink) sessionStorage.setItem('3q-link-uid', pendingLink); } catch { /* Optional callback context. */ }
            render('verify');
          } else {
            const result = await supabase.auth.updateUser({ password: password!.value });
            if (result.error) throw result.error;
            recovery = false; recoveryCallback = false; pendingLink = null;
            const url = new URL(location.href); url.searchParams.delete('auth'); history.replaceState(history.state, '', url);
            try { sessionStorage.removeItem('3q-link-uid'); } catch { /* Optional callback context. */ }
            await boot();
          }
        }, next);
      };
      if (next === 'login') {
        button('Đăng ký', () => render('register')); button('Quên mật khẩu', () => render('forgot'));
      } else if (next === 'link') button('Đăng xuất', signOut, signOut);
      else button('Quay lại', () => render(purpose === 'manage' && session ? 'account' : 'login'));
    }
    form.append(status); dialog.append(form);
  }
  await run(boot);
  await done;
}
