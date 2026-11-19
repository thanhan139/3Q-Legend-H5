import { cloudRepository, supabase } from './cloudRepository';
import { parseMailRequest, type MailInbox, type MailReceipt, type MailRequest } from './mailProtocol';

type Claim = Extract<MailRequest,{action:'claim'|'claimAll'}>;
type Reply = (Partial<MailInbox> & {status:string; receipt?:MailReceipt; deleted?:number});
export class MailUnavailable extends Error {}

export const mailRepository = {
  get uid() { return cloudRepository.active ? cloudRepository.uid : undefined; },
  pending(owner: string): Claim | undefined {
    const memory = pendingClaims.get(owner);
    if (memory) return memory;
    try {
      const parsed = parseMailRequest(JSON.parse(localStorage.getItem(`3q-mail:${owner}`) ?? 'null'));
      if (parsed?.action === 'claim' || parsed?.action === 'claimAll') return parsed;
    } catch { /* Persistence is best-effort on restricted browsers. */ }
  },
  async send(owner: string, request: MailRequest): Promise<Reply> {
    if (!supabase || this.uid !== owner) throw new Error('Phiên đăng nhập đã thay đổi.');
    const {data:{session}} = await supabase.auth.getSession();
    if (session?.user.id !== owner || this.uid !== owner) throw new Error('Phiên đăng nhập đã thay đổi.');
    const {data,error} = await supabase.functions.invoke<Reply>('mail-command', {
      body:request, timeout:12_000, headers:{Authorization:`Bearer ${session.access_token}`},
    });
    if (this.uid !== owner) throw new Error('Phiên đăng nhập đã thay đổi.');
    if (error || !data) throw new Error('Không thể kết nối hộp thư. Vui lòng thử lại.');
    if (data.status === 'missing' || data.status === 'unavailable') throw new MailUnavailable('Thư hoặc phần thưởng không còn khả dụng.');
    if (data.status === 'reused') throw new MailUnavailable('Yêu cầu đã thay đổi. Vui lòng tải lại hộp thư.');
    if (data.status === 'walletLimit') throw new MailUnavailable('Số dư sẽ vượt giới hạn. Phần thưởng vẫn ở trong thư.');
    if (data.status !== 'ok') throw new Error('Hộp thư chưa phản hồi. Vui lòng thử lại.');
    return data;
  },
  async list(owner: string, category: MailInbox['rows'][number]['category']|'all', page: number): Promise<MailInbox> {
    const reply = await this.send(owner,{action:'list',category,page});
    if (!Array.isArray(reply.rows) || !reply.unread || reply.total === undefined || reply.filtered === undefined ||
      reply.claimable === undefined || reply.deletable === undefined) throw new Error('Dữ liệu hộp thư chưa đầy đủ.');
    return {rows:reply.rows,total:reply.total,filtered:reply.filtered,unread:reply.unread,
      claimable:reply.claimable,deletable:reply.deletable};
  },
  async claim(owner: string, mailId?: string): Promise<MailReceipt> {
    const existing = this.pending(owner);
    const requestId = existing?.requestId ?? crypto.randomUUID();
    const request: Claim = existing ?? (mailId ? {action:'claim',mailId,requestId} : {action:'claimAll',requestId});
    pendingClaims.set(owner,request);
    try { localStorage.setItem(`3q-mail:${owner}`,JSON.stringify(request)); } catch { /* In-memory retry still works. */ }
    try {
      const reply = await this.send(owner,request);
      if (!reply.receipt) throw new Error('Chưa có biên nhận. Hãy bấm Đối chiếu.');
      clearPending(owner);
      void cloudRepository.refresh().catch(() => undefined);
      return reply.receipt;
    } catch (error) {
      if (error instanceof MailUnavailable) clearPending(owner);
      throw error;
    }
  },
};

const pendingClaims = new Map<string,Claim>();
function clearPending(owner: string) {
  pendingClaims.delete(owner);
  try { localStorage.removeItem(`3q-mail:${owner}`); } catch { /* Browser storage unavailable. */ }
}
