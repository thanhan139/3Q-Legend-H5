export const MAIL_CATEGORIES = ['all','admin','system','personal','sent'] as const;
export const MAIL_ITEMS = ['copper','coins','golden_key','jewelry_essence','enhancement_stone','forge_shard','hero_exp'] as const;
export type MailCategory = typeof MAIL_CATEGORIES[number] | 'event';
export type MailItem = typeof MAIL_ITEMS[number];
export type MailRewards = Partial<Record<MailItem, number>>;
export const MAIL_PAGE_SIZE = 12;
export const MAIL_REPORT_REASONS = ['harassment','spam','impersonation','other'] as const;
export type MailReportReason = typeof MAIL_REPORT_REASONS[number];
export interface MailPlayer { uid:string; name:string }
export interface OfficialDraft {
  recipients:string[]; broadcast:boolean; subject:string; body:string; rewards:MailRewards;
  sendAt?:string; expiresAt?:string;
}
export interface MailDraftRecord {
  id:string; author_uid:string; approver_uid:string|null; approved_at:string|null; mail_id:string|null;
  created_at:string; payload:OfficialDraft;
}

export type MailRequest =
  | { action: 'list'; category: MailCategory; page: number }
  | { action: 'read'; mailId: string }
  | { action: 'claim'; mailId: string; requestId: string }
  | { action: 'claimAll'; requestId: string }
  | { action: 'deleteRead'|'adminAccess'|'adminHistory' }
  | { action: 'search'; query:string }
  | { action: 'send'; recipient:string; subject:string; body:string; requestId:string; replyTo?:string }
  | { action: 'delete'; mailId:string; sent:boolean }
  | { action: 'block'; mailId:string }
  | { action: 'report'; mailId:string; reason:MailReportReason }
  | { action: 'adminDraft'; requestId:string; draft:OfficialDraft }
  | { action: 'adminApprove'; draftId:string };

export interface MailRow {
  id: string;
  category: Exclude<MailCategory,'all'|'sent'>;
  sender: string;
  subject: string;
  body: string;
  created_at: string;
  expires_at: string | null;
  read_at: string | null;
  claimed_at: string | null;
  expired: boolean;
  rewards: MailRewards;
  verified?:boolean;
  outgoing?:boolean;
  peer_uid?:string|null;
}

export interface MailInbox {
  total: number;
  filtered: number;
  claimable: number;
  deletable: number;
  unread: Record<MailCategory, number>;
  rows: MailRow[];
}

export interface MailReceipt { kind: 'mailClaim'; mailIds: string[]; rewards: MailRewards }
export const hasAttachments = (row: MailRow) => MAIL_ITEMS.some(item => (row.rewards[item] ?? 0) > 0);
export const canClaimMail = (row: MailRow) => !row.expired && !row.claimed_at && hasAttachments(row);

const uuid = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
function plain(value: unknown, max:number) {
  if (typeof value !== 'string') return;
  const text = value.normalize('NFC').trim();
  if (!text || Array.from(text).length>max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]|https?:\/\/|javascript:|data:text\/html|www\./iu.test(text)) return;
  return text;
}
export function parseOfficialDraft(input:unknown): OfficialDraft|undefined {
  if (!input || typeof input!=='object') return;
  const d=input as Partial<Record<keyof OfficialDraft,unknown>>;
  const subject=plain(d.subject,140), body=plain(d.body,2400);
  if (!subject||!body||typeof d.broadcast!=='boolean'||!Array.isArray(d.recipients)||d.recipients.length>100||!d.recipients.every(uuid)) return;
  const recipients=[...new Set(d.recipients)].sort();
  if (d.broadcast===Boolean(recipients.length) || !d.rewards || typeof d.rewards!=='object'||Array.isArray(d.rewards)) return;
  const rewards: MailRewards={};
  for(const [key,value] of Object.entries(d.rewards)){
    const limit=key==='golden_key'?99_999:key==='jewelry_essence'?999_999:999_999_999;
    if (!MAIL_ITEMS.includes(key as MailItem)||typeof value!=='number'||!Number.isInteger(value)||value<1||value>limit) return;
    rewards[key as MailItem]=value;
  }
  const time=(value:unknown)=>typeof value==='string'&&value.length<=35&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():undefined;
  const sendAt=time(d.sendAt), expiresAt=time(d.expiresAt);
  if ((d.sendAt!==undefined&&!sendAt)||(d.expiresAt!==undefined&&!expiresAt)||(sendAt&&expiresAt&&sendAt>=expiresAt)) return;
  return {recipients,broadcast:d.broadcast,subject,body,rewards,...(sendAt?{sendAt}:{}),...(expiresAt?{expiresAt}:{})};
}

export function parseMailRequest(input: unknown): MailRequest | undefined {
  if (!input || typeof input !== 'object') return;
  const value = input as Record<string,unknown>;
  switch (value.action) {
    case 'list':
      if ((MAIL_CATEGORIES.some(c=>c===value.category)||value.category==='event') && typeof value.page === 'number' &&
        Number.isInteger(value.page) && value.page >= 0 && value.page <= 10000)
        return { action:'list', category:value.category as MailCategory, page:value.page };
      break;
    case 'read': if (uuid(value.mailId)) return {action:'read',mailId:value.mailId}; break;
    case 'claim':
      if (uuid(value.mailId) && uuid(value.requestId)) return {action:'claim',mailId:value.mailId,requestId:value.requestId};
      break;
    case 'claimAll': if (uuid(value.requestId)) return {action:'claimAll',requestId:value.requestId}; break;
    case 'deleteRead': return {action:'deleteRead'};
    case 'delete': if(uuid(value.mailId)) return {action:'delete',mailId:value.mailId,sent:value.sent===true}; break;
    case 'block': if(uuid(value.mailId)) return {action:'block',mailId:value.mailId}; break;
    case 'report':
      if(uuid(value.mailId)&&MAIL_REPORT_REASONS.some(reason=>reason===value.reason))
        return {action:'report',mailId:value.mailId,reason:value.reason as MailReportReason};
      break;
    case 'search': {
      const query=plain(value.query,36);
      if(query&&query.length>=2)return {action:'search',query};
      break;
    }
    case 'send': {
      const subject=plain(value.subject,140),body=plain(value.body,500);
      if(subject&&body&&uuid(value.recipient)&&uuid(value.requestId)&&(value.replyTo===undefined||uuid(value.replyTo)) &&
        !('rewards' in value)&&!('attachments' in value))
        return {action:'send',recipient:value.recipient,requestId:value.requestId,subject,body,
          ...(value.replyTo?{replyTo:value.replyTo}:{})};
      break;
    }
    case 'adminAccess': case 'adminHistory': return {action:value.action};
    case 'adminDraft': {
      const draft=parseOfficialDraft(value.draft);
      if(draft&&uuid(value.requestId))return {action:'adminDraft',requestId:value.requestId,draft};
      break;
    }
    case 'adminApprove': if(uuid(value.draftId)) return {action:'adminApprove',draftId:value.draftId}; break;
  }
}
