import type { Rarity } from '../domain/types';
import { rect, type ContentRect } from './lobbyContentLayout';

export const SUMMON_TEXTURES = {
  title: 'banners/banner_summon_result.png', plate: 'ui/plate_red_blank.png',
  back: 'buttons/btn_back_to_summon.png', heroes: 'buttons/btn_view_heroes.png',
  one: 'buttons/btn_summon_1.png', ten: 'buttons/btn_summon_10.png',
  R: 'portrait_frames/portrait_blue.png', SR: 'portrait_frames/portrait_purple.png', SSR: 'portrait_frames/portrait_gold.png',
  'SSS+': 'portrait_frames/portrait_dragon.png',
} as const;
export const summonTexture = (id: keyof typeof SUMMON_TEXTURES) => `summon-complete-${id}`;

// Composite card metadata: an unscaled-aspect portrait frame above THREE separate text rows.
// Tall landscape frames are not used: their baked rarity ribbon leaves too little room for live text.
const bodies: Record<Rarity, ContentRect> = {
  R: rect(.06, .04, .88, .92), SR: rect(.06, .04, .88, .92),
  SSR: rect(.06, .04, .88, .92), 'SSS+': rect(.06, .04, .88, .92),
};
export function cardContent(rarity: Rarity, frame: ContentRect) {
  const b = bodies[rarity];
  const body = rect(frame.x + frame.width * b.x, frame.y + frame.height * b.y,
    frame.width * b.width, frame.height * b.height);
  const rankHeight = Math.max(22, body.height * .12);
  const statusHeight = Math.max(22, body.height * .13);
  const nameHeight = Math.max(32, body.height * .18);
  const textTop = body.y + body.height - nameHeight - rankHeight - statusHeight;
  return { body, portrait: rect(body.x + 6, body.y + 7, body.width - 12, textTop - body.y - 15),
    name: rect(body.x, textTop, body.width, nameHeight),
    rank: rect(body.x, textTop + nameHeight, body.width, rankHeight),
    status: rect(body.x, textTop + nameHeight + rankHeight, body.width, statusHeight) };
}
export function summonCardSlots(count: 1 | 10) {
  return Array.from({ length: count }, (_, i) => count === 1
    ? rect(494, 204, 292, 396)
    : rect(146 + i % 5 * 200, 204 + Math.floor(i / 5) * 224, 188, 218));
}
