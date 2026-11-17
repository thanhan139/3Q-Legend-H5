import { VIP_LEVELS, VIP_MAX } from '../data/vipConfig';
export type VipGiftKind = 'level' | 'daily' | 'weekly';
export interface VipOffer {
  kind: VipGiftKind; tier: number; period: string; rewards: Record<string, number>;
  claimed: boolean;
}
export interface VipSnapshot {
  paidBaseKnbTotal: number;
  offers: VipOffer[];
}
/** Never accepts a wallet balance or a claimed level. Only verified paid-base total is an input. */
export function vipLevel(total = 0): number {
  if (!Number.isSafeInteger(total) || total < 0) return 0;
  for (let level = VIP_MAX; level > 0; level--) if (total >= VIP_LEVELS[level].threshold) return level;
  return 0;
}
export function vipProgress(total = 0) {
  total = Number.isSafeInteger(total) && total >= 0 ? total : 0;
  const level = vipLevel(total), lower = VIP_LEVELS[level].threshold;
  const upper = VIP_LEVELS[Math.min(level + 1, VIP_MAX)].threshold;
  return { level, lower, upper, remaining: Math.max(0, upper - total),
    fraction: level === VIP_MAX ? 1 : Math.max(0, Math.min(1, (total - lower) / (upper - lower))) };
}
export function vipBonuses(level = 0, mode: 'PvE' | 'PvP' = 'PvE') {
  const row = VIP_LEVELS[Number.isInteger(level) ? Math.max(0, Math.min(VIP_MAX, level)) : 0];
  const factor = mode === 'PvE' ? 1 : .6;
  return Object.fromEntries(Object.entries(row.bonuses).map(([key, value]) => [key, value * factor])) as {
    atkPct: number; defPct: number; hpPct: number; critRatePoints: number; critDamagePct: number;
  };
}
export const vipPlaybackSpeeds = (level: number) => level >= 9 ? [1, 2, 3, 4] : level >= 5 ? [1, 2, 3] : [1, 2];
export function vipGiftState(snapshot: VipSnapshot | undefined, tier: number, kind: VipGiftKind) {
  if (vipLevel(snapshot?.paidBaseKnbTotal) < tier) return 'locked' as const;
  const offer = snapshot?.offers.find(offer => offer.tier === tier && offer.kind === kind);
  return !offer ? 'developing' as const : offer.claimed ? 'claimed' as const : 'ready' as const;
}
