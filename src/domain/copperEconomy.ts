import type { CampaignStage, SaveV2 } from './types';
import { welfareDay, type Mission } from './welfare';

export const COPPER_ECONOMY = {
  firstClearByChapter: [2_000, 4_000, 6_000],
  replayByChapter: [1_000, 1_500, 2_500],
  replayDailyLimit: 3,
  mission: { win: 1_000, upgrade: 1_200, summon: 1_000, battle: 2_000 },
  rankedWin: 4_000,
} as const satisfies { firstClearByChapter: readonly number[]; replayByChapter: readonly number[];
  replayDailyLimit: number; mission: Record<Mission, number>; rankedWin: number };

export interface CopperDaily { day: number; campaignReplays: number; arenaClaimed: boolean }

export function normalizeCopperDaily(raw?: CopperDaily): CopperDaily | undefined {
  if (!raw || !Number.isSafeInteger(raw.day) || raw.day < 0) return;
  return { day: raw.day,
    campaignReplays: Number.isSafeInteger(raw.campaignReplays)
      ? Math.max(0, Math.min(raw.campaignReplays, COPPER_ECONOMY.replayDailyLimit)) : 0,
    arenaClaimed: raw.arenaClaimed === true };
}

export function copperDaily(save: SaveV2, day = welfareDay()): CopperDaily {
  const current = normalizeCopperDaily(save.copperDaily);
  return current && current.day >= day ? current : { day, campaignReplays: 0, arenaClaimed: false };
}

export function campaignCopper(stage: CampaignStage, firstClear: boolean): number {
  const schedule = firstClear ? COPPER_ECONOMY.firstClearByChapter : COPPER_ECONOMY.replayByChapter;
  return (schedule as readonly number[])[stage.chapter - 1] ?? schedule[schedule.length - 1];
}
