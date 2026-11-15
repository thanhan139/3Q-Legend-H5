export const FACTION_IDS = ['shu', 'wei', 'wu', 'warlords'] as const;
export type FactionId = typeof FACTION_IDS[number];
export const FACTION_THRESHOLDS = [2, 4, 6] as const;
export type FactionThreshold = typeof FACTION_THRESHOLDS[number];

interface FactionDefinition {
  name: string;
  emblem: string;
  color: number;
  stat: 'atk' | 'def' | 'speed' | 'criticalChance';
  label: string;
  bonuses: Record<FactionThreshold, number>;
}

export const FactionConfig: Record<FactionId, FactionDefinition> = {
  shu: { name: 'Thục', emblem: '蜀', color: 0x75d9a2, stat: 'atk', label: 'ATK', bonuses: { 2: 4, 4: 8, 6: 12 } },
  wei: { name: 'Ngụy', emblem: '魏', color: 0x82bfff, stat: 'def', label: 'DEF', bonuses: { 2: 5, 4: 10, 6: 15 } },
  wu: { name: 'Ngô', emblem: '吳', color: 0xff927b, stat: 'speed', label: 'SPD', bonuses: { 2: 3, 4: 6, 6: 9 } },
  warlords: { name: 'Quần Hùng', emblem: '群', color: 0xd3a5ff, stat: 'criticalChance', label: 'Bạo kích', bonuses: { 2: 3, 4: 6, 6: 9 } },
};
