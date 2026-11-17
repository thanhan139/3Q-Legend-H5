import type { Rarity } from '../domain/types';
import { rect, type ContentRect } from './lobbyContentLayout';

export const SUMMON_TEXTURES = {
  title: 'banners/banner_summon_result.png', plate: 'ui/plate_red_blank.png',
  back: 'buttons/btn_back_to_summon.png', heroes: 'buttons/btn_view_heroes.png',
  one: 'buttons/btn_summon_1.png', ten: 'buttons/btn_summon_10.png',
} as const;
export const summonTexture = (id: keyof typeof SUMMON_TEXTURES) => `summon-complete-${id}`;
export const SMOOTH_ATLAS = 'summon-smooth-card-atlas';
export const DAI_QIAO_PORTRAIT = 'summon-smooth-da-qiao';
export const CARD_DESIGN = { width: 156, height: 234 };
export const CARD_SKIN: Record<Rarity, { column: number; row: number; color: number }> = {
  R: { column: 0, row: 0, color: 0x77c9ff }, SR: { column: 1, row: 0, color: 0xe6a1ff },
  SSR: { column: 0, row: 1, color: 0xffd27d }, 'SSS+': { column: 1, row: 1, color: 0xffa16b },
};

// Normalized art metadata from the new 2x2 runtime atlas. No baked text in any cell.
export function cardContent(_rarity: Rarity, frame: ContentRect) {
  const project = (x: number, y: number, w: number, h: number) => rect(frame.x + x * frame.width,
    frame.y + y * frame.height, w * frame.width, h * frame.height);
  return { body: project(.04, .02, .92, .95), badge: project(.39, .025, .22, .052),
    portrait: project(.062, .09, .876, .492), name: project(.18, .60, .64, .08),
    rank: project(.15, .715, .70, .07), status: project(.13, .816, .74, .087) };
}
export function summonCardSlots(count: 1 | 10) {
  return Array.from({ length: count }, (_, i) => count === 1
    ? rect(490, 184, 300, 450)
    : rect(122 + i % 5 * 220, 170 + Math.floor(i / 5) * 240, 156, 234));
}
