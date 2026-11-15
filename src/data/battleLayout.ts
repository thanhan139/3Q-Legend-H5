export const BATTLE_LAYOUT = {
  leftColumns: [128, 315, 502],
  rightColumns: [1152, 965, 778],
  rows: [281, 467],
  footY: 49,
  shadow: { y: 48, width: 100, height: 24 },
} as const;

export const SAMPLE_HERO_IDS = ['liu-bei', 'guan-yu', 'zhang-fei'] as const;
export const sampleTexture = (id: string) => `battle-sample-${id}`;
