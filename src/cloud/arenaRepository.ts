import { cloudRepository, supabase } from './cloudRepository';
import type { ArenaRequest } from './arenaProtocol';

const messages: Record<string, string> = {
  unavailable: 'PvP xếp hạng cần tài khoản đã xác minh và đội hình đăng ký.',
  missing: 'Chưa có bản lưu online.',
  formation: 'Hãy bố trí ít nhất một tướng.',
  repeat: 'Đã khiêu chiến đối thủ này hôm nay.',
  exhausted: 'Đã hết lượt khiêu chiến hôm nay.',
  changed: 'Đội hình hoặc mùa giải đã đổi. Hãy tải lại.',
  invalid: 'Yêu cầu PvP không hợp lệ.',
};

async function send<T>(request: ArenaRequest, uid: string): Promise<T & { status: string }> {
  if (!supabase || !navigator.onLine)
    throw new Error('Cần kết nối online để dùng PvP xếp hạng.');
  const { data: auth } = await supabase.auth.getSession();
  if (auth.session?.user.id !== uid || cloudRepository.uid !== uid) throw new Error('Phiên đăng nhập đã đổi.');
  const { data, error } = await supabase.functions.invoke<T & { status: string }>('arena-command', {
    body: request, timeout: 12000, headers: { Authorization: `Bearer ${auth.session.access_token}` },
  });
  if (cloudRepository.uid !== uid) throw new Error('Phiên đăng nhập đã đổi.');
  if (error || !data) throw new Error('Chưa xác nhận được giao dịch. Hãy kết nối lại và thử lại.');
  return data;
}

export async function arenaRequest<T>(request: ArenaRequest): Promise<T> {
  const uid = cloudRepository.uid;
  if (!uid) throw new Error('Đăng nhập để dùng PvP xếp hạng.');
  const result = await send<T>(request, uid);
  if (result.status !== 'ok' && result.status !== 'claimed')
    throw new Error(messages[result.status] ?? 'Máy chủ chưa xác nhận yêu cầu.');
  return result;
}

export async function challengeArena(opponent?: string) {
  const uid = cloudRepository.uid;
  if (!uid) throw new Error('Đăng nhập để khiêu chiến.');
  const key = `3q:arena-pending:${uid}`;
  const raw = localStorage.getItem(key);
  const pending = raw ? JSON.parse(raw) as Extract<ArenaRequest, { action: 'challenge' }> : undefined;
  if (!pending && !opponent) return undefined;
  const request = pending ?? { action: 'challenge', opponent: opponent!, requestId: crypto.randomUUID() };
  if (!pending) localStorage.setItem(key, JSON.stringify(request));
  const result = await send<import('./arenaProtocol').ArenaResult>(request, uid);
  localStorage.removeItem(key);
  if (result.status !== 'ok') throw new Error(messages[result.status] ?? 'Trận chưa được xác thực.');
  return result;
}
