export const BATTLE_LAYOUT = {
  // Core slots 0–2 are the front line; 3–5 remain the back line.
  leftColumns: [395, 172],
  rightColumns: [885, 1108],
  rows: [238, 404, 570],
  footY: 0,
  approachGap:96,
  shadow: { y: 0, width: 84, height: 17 },
  // Compact the existing name/HP/rage stack, retaining the approved textures.
  // 128px visible art + 38px HUD fits each 166px row without covering feet.
  hud:{nameTop:2,nameHeight:18,nameY:11,nameFont:11,hpY:24,hpHeight:10,hpFill:6,rageY:33,rageHeight:8,rageFill:5},
} as const;

/** Authored world coordinates; UiScene's camera handles EXPAND/resize uniformly. */
export function battleFormationPosition(side: 'player' | 'enemy', slot: number) {
  const columns = side === 'player' ? BATTLE_LAYOUT.leftColumns : BATTLE_LAYOUT.rightColumns;
  return { x: columns[slot < 3 ? 0 : 1], y: BATTLE_LAYOUT.rows[slot % 3] };
}

export const SAMPLE_HERO_IDS = ['liu-bei', 'guan-yu', 'zhang-fei'] as const;
export const sampleTexture = (id: string) => `battle-sample-${id}`;
