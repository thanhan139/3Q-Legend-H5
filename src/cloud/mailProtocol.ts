export const MAIL_CATEGORIES = ['all', 'system', 'event', 'personal'] as const;
export const MAIL_ITEMS = ['copper', 'coins', 'golden_key', 'jewelry_essence'] as const;
export type MailCategory = typeof MAIL_CATEGORIES[number];
export type MailItem = typeof MAIL_ITEMS[number];
export type MailRewards = Partial<Record<MailItem, number>>;
export const MAIL_PAGE_SIZE = 12;

export type MailRequest =
  | { action: 'list'; category: MailCategory; page: number }
  | { action: 'read'; mailId: string }
  | { action: 'claim'; mailId: string; requestId: string }
  | { action: 'claimAll'; requestId: string }
  | { action: 'deleteRead' };

export interface MailRow {
  id: string;
  category: Exclude<MailCategory,'all'>;
  sender: string;
  subject: string;
  body: string;
  created_at: string;
  expires_at: string | null;
  read_at: string | null;
  claimed_at: string | null;
  expired: boolean;
  rewards: MailRewards;
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

export function parseMailRequest(input: unknown): MailRequest | undefined {
  if (!input || typeof input !== 'object') return;
  const value = input as Partial<Record<'action'|'mailId'|'requestId'|'category'|'page',unknown>>;
  const uuid = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
  switch (value.action) {
    case 'list':
      if (MAIL_CATEGORIES.includes(value.category as MailCategory) && typeof value.page === 'number' &&
        Number.isInteger(value.page) && value.page >= 0 && value.page <= 4)
        return { action:'list', category:value.category as MailCategory, page:value.page };
      break;
    case 'read': if (uuid(value.mailId)) return {action:'read',mailId:value.mailId}; break;
    case 'claim':
      if (uuid(value.mailId) && uuid(value.requestId)) return {action:'claim',mailId:value.mailId,requestId:value.requestId};
      break;
    case 'claimAll': if (uuid(value.requestId)) return {action:'claimAll',requestId:value.requestId}; break;
    case 'deleteRead': return {action:'deleteRead'};
  }
}
