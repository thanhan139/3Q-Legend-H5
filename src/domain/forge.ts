import { EquipmentConfig, type EquipmentId } from '../data/equipmentConfig';
import { welfareDay } from './welfare';

export const FORGE = EquipmentConfig.forge;

export interface ForgeWallet {
  shards: number;
  stones: number;
  premiumClaimed: boolean;
  crafted: number;
  week?: { key: number; count: number };
  rewardedBattles: string[];
}

export const forgeWeek = (now = Date.now()) => Math.floor((welfareDay(now) + 3) / 7);
export const weeklyWins = (wallet?: ForgeWallet, now = Date.now()) =>
  wallet?.week?.key === forgeWeek(now) ? wallet.week.count : 0;

const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;

export function normalizeForge(raw: ForgeWallet | undefined, cleared: readonly string[]): ForgeWallet {
  return {
    shards: raw ? count(raw.shards) : cleared.reduce((sum, id) => sum + (FORGE.firstClear[id] ?? 0), 0),
    stones: count(raw?.stones),
    premiumClaimed: raw?.premiumClaimed === true,
    crafted: count(raw?.crafted),
    week: raw?.week && Number.isSafeInteger(raw.week.key)
      ? { key: raw.week.key, count: Math.min(FORGE.weekly.limit, count(raw.week.count)) } : undefined,
    rewardedBattles: Array.isArray(raw?.rewardedBattles)
      ? [...new Set(raw.rewardedBattles.filter(id => typeof id === 'string' && id.length <= 80))] : [],
  };
}

export function isForgeWeapon(id: EquipmentId) {
  return FORGE.weapons.some(weapon => weapon === id);
}
