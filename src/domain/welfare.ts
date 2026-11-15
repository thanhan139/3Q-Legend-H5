import { changeInventory, ITEM_IDS } from './resources';
import type { SaveV2 } from './types';

export type WalletReward = Partial<Pick<SaveV2, 'copper' | 'coins' | 'gems' | 'goldKeys' | 'trainingExp'>>;
export const DAILY_MISSIONS = {
  win: { label: 'Vượt ải Chinh Chiến', goal: 1, reward: { coins: 250, trainingExp: 100 }, scene: 'Campaign' },
  upgrade: { label: 'Nâng cấp võ tướng', goal: 1, reward: { coins: 300, gems: 15 }, scene: 'Heroes' },
  summon: { label: 'Chiêu mộ võ tướng', goal: 1, reward: { coins: 350, goldKeys: 1 }, scene: 'Summon' },
  battle: { label: 'Hoàn thành trận chiến', goal: 3, reward: { coins: 450, trainingExp: 150 }, scene: 'Campaign' },
} as const;
export type Mission = keyof typeof DAILY_MISSIONS;
export const MISSIONS = Object.keys(DAILY_MISSIONS) as Mission[];
export const CHECK_IN: readonly WalletReward[] = [
  { coins: 250 }, { coins: 300, trainingExp: 100 }, { coins: 350, gems: 20 },
  { coins: 400, goldKeys: 1 }, { coins: 500, trainingExp: 250 }, { coins: 650, gems: 50, goldKeys: 1 },
  { coins: 1000, gems: 100, goldKeys: 3, trainingExp: 500 },
];
export const TOPUP_HERO = 'zhao-yun';
export const TOPUP_REWARD = { coins: 1000, goldKeys: 5 } as const;

export interface Welfare {
  checkInDay: number;
  checkIns: number;
  daily: { day: number; counts: Partial<Record<Mission, number>>; claimed: Mission[] };
}

export const welfareDay = (now = Date.now()) => Math.floor((now + 7 * 3600000) / 86400000);
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;

export function normalizeWelfare(raw?: Welfare): Welfare {
  return {
    checkInDay: integer(raw?.checkInDay),
    checkIns: integer(raw?.checkIns, CHECK_IN.length),
    daily: {
      day: integer(raw?.daily?.day),
      counts: Object.fromEntries(MISSIONS.flatMap(key => { const count = integer(raw?.daily?.counts?.[key], DAILY_MISSIONS[key].goal); return count ? [[key, count]] : []; })),
      claimed: MISSIONS.filter(key => Array.isArray(raw?.daily?.claimed) && raw.daily.claimed.includes(key)),
    },
  };
}

export function dailyProgress(welfare: Welfare, day = welfareDay()): Welfare['daily'] {
  return day > welfare.daily.day ? { day, counts: {}, claimed: [] } : welfare.daily;
}

export function welfareStatus(save: SaveV2, day = welfareDay()) {
  const welfare = normalizeWelfare(save.welfare);
  const daily = dailyProgress(welfare, day);
  return {
    welfare, daily,
    checkIn: day > welfare.checkInDay,
    missions: MISSIONS.filter(key => day === daily.day &&
      (daily.counts[key] ?? 0) >= DAILY_MISSIONS[key].goal && !daily.claimed.includes(key)),
    topup: !save.firstTopupDemoClaimed,
  };
}

export function grantWallet(save: SaveV2, reward: WalletReward) {
  if (reward.copper !== undefined) save.copper = Math.min(Number.MAX_SAFE_INTEGER, (save.copper ?? 0) + reward.copper);
  save.coins = Math.min(Number.MAX_SAFE_INTEGER, save.coins + (reward.coins ?? 0));
  changeInventory(save, ITEM_IDS.legacyGem, reward.gems ?? 0);
  changeInventory(save, ITEM_IDS.goldenKey, reward.goldKeys ?? 0);
  changeInventory(save, ITEM_IDS.heroExp, reward.trainingExp ?? 0);
}

export function advanceMission(save: SaveV2, key: Mission, day = welfareDay()) {
  const welfare = normalizeWelfare(save.welfare);
  const daily = dailyProgress(welfare, day);
  if (day !== daily.day) return;
  daily.counts[key] = Math.min(DAILY_MISSIONS[key].goal, (daily.counts[key] ?? 0) + 1);
  save.welfare = { ...welfare, daily };
}
