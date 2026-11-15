import { SaveCache, type PendingCommand } from './saveCache';
import { createClient, type Session } from '@supabase/supabase-js';

import { gameStore } from '../domain/store';
import type { BattleTicket, CloudSave, GameCommand, GameIntent } from './gameProtocol';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce' } }) : undefined;

interface Reply extends Partial<CloudSave> {
  status: string;
  ticket?: BattleTicket;
  receipt?: unknown;
}

export const cloudMessage = (status: string) => ({
  invalid: 'Yêu cầu không hợp lệ hoặc vé trận đã hết hạn.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  conflict: 'Tiến trình đã đổi trên thiết bị khác. Đã tải bản lưu mới nhất. Hãy thử lại thao tác.',
  missing: 'Tài khoản chưa có bản lưu online.',
  rejected: 'Server từ chối thao tác. Kiểm tra điều kiện và tài nguyên.',
  exists: 'Tài khoản đã có tiến trình online.',
  temporary: 'Không thể kết nối máy chủ',
}[status] ?? 'Không thể xác nhận thao tác online.');


class CloudRepository {
  private owner?: string;
  private current?: CloudSave;
  private inFlight = false;
  private pending?: PendingCommand;
  private conflicted = false;
  private connectionGeneration = 0;
  private get cache() { return new SaveCache(localStorage, `3q-account-save:${url}`); }
  get tutorial() { return this.current?.tutorial; }
  get busy() { return this.inFlight; }
  get status() {
    if (this.conflicted) return 'Tiến trình đã thay đổi trên thiết bị khác. Hãy thử lại.';
    if (this.pending || (this.owner && this.cache.read(this.owner).pending)) return 'Đang chờ máy chủ xác nhận giao dịch.';
    return this.active ? 'Đang dùng tiến trình online đã xác nhận.' : 'Cần đăng nhập và tải tiến trình online.';
  }

  get active() { return this.owner !== undefined && this.current !== undefined; }
  get uid() { return this.owner; }


  private async send(intent: GameIntent, expectedOwner = this.owner): Promise<Reply> {
    try {
      if (!navigator.onLine || !supabase) throw new Error(cloudMessage('temporary'));
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError || !auth.session || (expectedOwner && auth.session.user.id !== expectedOwner)) throw new Error(cloudMessage('unauthorized'));
      const { data, error } = await supabase.functions.invoke<Reply>('game-command', {
        body: intent, timeout: 12_000, headers: { Authorization: `Bearer ${auth.session.access_token}` },
      });
      if (expectedOwner && (await supabase.auth.getSession()).data.session?.user.id !== expectedOwner)
        throw new Error(cloudMessage('unauthorized'));
      if (error || !data) throw new Error(cloudMessage('temporary'));
      if (data.status === 'temporary' || data.status === 'unauthorized' ||
        (data.status === 'missing' && intent.action === 'command')) throw new Error(cloudMessage(data.status));
      return data;
    } catch (error) {
      window.dispatchEvent(new Event('3q:connection-error'));
      throw error;
    }
  }

  async connect(session: Session): Promise<void> {
    const generation = ++this.connectionGeneration;
    const assertCurrent = () => {
      if (generation !== this.connectionGeneration) throw new Error(cloudMessage('unauthorized'));
    };
    const uid = session.user.id;
    if (!navigator.onLine) throw new Error(cloudMessage('temporary'));
    let reply = await this.send({ action: 'load' }, uid);
    assertCurrent();
    if (reply.status === 'missing') {
      reply = await this.send({ action: 'initialize' }, uid);
      assertCurrent();
      if (reply.status === 'exists') reply = await this.send({ action: 'load' }, uid);
    }
    if (reply.status !== 'ok' || !reply.save || reply.revision === undefined || !reply.tutorial)
      throw new Error(cloudMessage(reply.status));
    if ((await supabase?.auth.getSession())?.data.session?.user.id !== uid)
      throw new Error(cloudMessage('unauthorized'));
    assertCurrent();
    if (this.owner !== uid) this.current = undefined;
    this.owner = uid;
    this.apply(reply);
    this.restorePending(uid);
    if (this.pending) await this.refresh();
    assertCurrent();
  }

  private restorePending(uid: string) {
    const record = this.cache.read(uid);
    this.pending = record.pending;
    this.conflicted = record.conflict === true;
    if (this.pending || !url) return;
    try {
      const previousKey = `3q-cloud-pending:${uid}`;
      const raw = localStorage.getItem(previousKey);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingCommand;
      this.cache.update(uid, old => ({ ...old, pending }));
      this.pending = pending;
      localStorage.removeItem(previousKey);
    } catch { /* Preserve the old record if migration could not complete. */ }
  }

  disconnect() {
    this.connectionGeneration++;
    this.owner = undefined;
    this.current = undefined;
    this.pending = undefined;
    this.conflicted = false;
    // Keep the last snapshot read-only. Startup blocks access until the next UID loads.
  }

  private apply(reply: Reply) {
    if (!reply.save || reply.revision === undefined) return;
    if (this.current && Number(reply.revision) < Number(this.current.revision)) return;
    if (!reply.tutorial) throw new Error('Máy chủ chưa cập nhật M8. Vui lòng thử lại sau.');
    const confirmed: CloudSave = { save: reply.save, revision: reply.revision, tutorial: reply.tutorial };
    if (this.owner) {
      try {
        this.cache.update(this.owner, old => ({ ...old, confirmed }));
      } catch { /* Server transactions remain durable if local storage is unavailable. */ }
    }
    this.current = confirmed;
    gameStore.useCloudSave(confirmed.save);
    window.dispatchEvent(new Event('3q:cloud-save'));
  }

  async refresh(): Promise<boolean> {
    if (!this.active || this.inFlight) return false;
    if (!navigator.onLine) throw new Error(cloudMessage('temporary'));
    const previousRevision = this.current?.revision;
    const owner = this.owner;
    if (owner) this.pending = this.cache.read(owner).pending ?? this.pending;
    this.inFlight = true;
    try {
      if (this.pending) {
        const reply = await this.send(this.pending);
        if (owner !== this.owner) return false;
        this.apply(reply);
        this.clearPending(reply);
      }
      const reply = await this.send({ action: 'load' });
      if (owner !== this.owner) return false;
      if (reply.status !== 'ok') throw new Error(cloudMessage(reply.status));
      this.apply(reply);
      return this.current?.revision !== previousRevision;
    } finally { this.inFlight = false; }
  }

  async startBattle(stageId: string): Promise<BattleTicket> {
    if (!this.current || this.inFlight || this.pending || (this.owner && this.cache.read(this.owner).pending)) throw new Error(cloudMessage('temporary'));
    const owner = this.owner;
    this.inFlight = true;
    try {
      const reply = await this.send({ action: 'startBattle', stageId, revision: this.current.revision });
      if (owner !== this.owner) throw new Error(cloudMessage('unauthorized'));
      this.apply(reply);
      if (!reply.ticket) throw new Error(cloudMessage(reply.status));
      return reply.ticket;
    } finally { this.inFlight = false; }
  }

  private clearPending(reply: Reply) {
    const id = this.pending?.requestId;
    this.conflicted = reply.status === 'conflict';
    if (this.owner) this.cache.update(this.owner, old => old.pending?.requestId === id
      ? { ...old, pending: undefined, conflict: this.conflicted } : old);
    this.pending = undefined;
  }

  async execute<T>(command: GameCommand): Promise<T> {
    if (!this.owner || !this.current || this.inFlight) throw new Error(cloudMessage('temporary'));
    const owner = this.owner;
    this.inFlight = true;
    try {
      const pending = this.cache.read(owner).pending ?? this.pending;
      const matching = pending && JSON.stringify(pending.command) === JSON.stringify(command);
      if (pending && !matching) {
        this.pending = pending;
        const previous = await this.send(pending);
        if (owner !== this.owner) throw new Error(cloudMessage('unauthorized'));
        this.apply(previous);
        this.clearPending(previous);
        throw new Error('Đã đối chiếu giao dịch trước. Hãy thử lại thao tác.');
      }
      const next = pending ?? {
        action: 'command', command,
        revision: command.type === 'battle' ? command.ticket.revision : this.current.revision,
        requestId: command.type === 'battle' ? command.ticket.id : crypto.randomUUID(),
      };
      this.pending = this.cache.update(owner, old => ({ ...old, pending: old.pending ?? next })).pending;
      if (!this.pending || this.pending.requestId !== next.requestId)
        throw new Error('Có giao dịch đang chờ xác nhận từ phiên khác.');
      const reply = await this.send(this.pending);
      if (owner !== this.owner) throw new Error(cloudMessage('unauthorized'));
      this.apply(reply);
      this.clearPending(reply);
      if (reply.status !== 'ok' && !(command.type === 'summon' && reply.status === 'rejected'))
        throw new Error(cloudMessage(reply.status));
      return reply.receipt as T;
    } finally { this.inFlight = false; }
  }
}

export const cloudRepository = new CloudRepository();

// Offline callbacks remain source-compatible with domain scene commands, but are never invoked.
export async function playCommand<T>(command: GameCommand, _offline?: () => T): Promise<T> {
  if (!cloudRepository.active) throw new Error('Đăng nhập để tiếp tục.');
  return cloudRepository.execute<T>(command);
}
