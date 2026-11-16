import type { LobbySkin } from './lobbySmoothAssets';

export interface ContentRect { x: number; y: number; width: number; height: number }
export const rect = (x: number, y: number, width: number, height: number): ContentRect => ({ x, y, width, height });
export const inset = (box: ContentRect, padding: number): ContentRect =>
  rect(box.x + padding, box.y + padding, Math.max(0, box.width - 2 * padding), Math.max(0, box.height - 2 * padding));
export const contains = (outer: ContentRect, inner: ContentRect, epsilon = 0.1) =>
  inner.x >= outer.x - epsilon && inner.y >= outer.y - epsilon &&
  inner.x + inner.width <= outer.x + outer.width + epsilon && inner.y + inner.height <= outer.y + outer.height + epsilon;

/** All rectangles below are measured in source texture pixels, excluding borders/glow. */
export const LOBBY_PANELS = {
  profile: {
    key: 'smooth-lobby-red', path: 'assets/ui/lobby_smooth/hud/empty_button_red.png', frame: 'clean', width: 307, height: 89,
    content: rect(30, 18, 247, 53),
    fields: { avatar: rect(34, 24, 40, 40), name: rect(86, 19, 129, 22),
      level: rect(86, 43, 180, 12), power: rect(86, 57, 180, 14), vip: rect(219, 20, 58, 22) },
  },
  campaign: {
    key: 'lobby-content-campaign', path: 'assets/ui/pvp_v1/panels/panel_season_status.png', width: 420, height: 330,
    content: rect(38, 40, 344, 254),
    // Rows partition the panel's safe inner body. CTA is a separate blank gold texture.
    fields: { title: rect(38, 40, 344, 31), stage: rect(38, 78, 344, 31),
      power: rect(38, 116, 344, 25), progress: rect(52, 153, 316, 6),
      caption: rect(38, 166, 344, 23), cta: rect(38, 196, 344, 98) },
  },
} as const;

export const LOBBY_WIDGETS = {
  profile: rect(16, 16, 466, 89 * 466 / 307),
  currencies: [rect(840, 18, 206, 64), rect(1058, 18, 206, 64)],
  campaign: rect(962, 588 - 300 * 330 / 420, 300, 300 * 330 / 420),
  heroName: rect(480, 588, 320, 30),
  currencyFields: { icon: rect(34, 24, 42, 42), label: rect(84, 20, 135, 21),
    value: rect(84, 43, 135, 27), plus: rect(237, 30, 30, 30) },
} as const;

const blankRed = { bakedLabel: false, content: rect(30, 18, 247, 53) };
const blankGold = { bakedLabel: false, content: rect(30, 24, 239, 54) };
const feature = { bakedLabel: true, content: rect(0.12, 0.74, 0.76, 0.24), normalized: true };
const dock = { bakedLabel: true, content: rect(0.17, 0.73, 0.66, 0.22), normalized: true };
const campaign = { bakedLabel: true, content: rect(0.27, 0.25, 0.63, 0.48), normalized: true };
export const LOBBY_SKIN_CONTENT: Record<LobbySkin, { bakedLabel: boolean; content: ContentRect; normalized?: boolean }> = {
  red: blankRed, gold: blankGold,
  welfare: feature, topup: feature, checkin: feature, mail: feature, missions: feature, settings: feature,
  formation: dock, formationActive: dock, heroes: dock, heroesActive: dock,
  inventory: dock, inventoryActive: dock, summon: dock, summonActive: dock,
  campaign, campaignActive: campaign,
};

export function fitTexture(source: { width: number; height: number }, slot: ContentRect) {
  const scale = Math.min(slot.width / source.width, slot.height / source.height);
  const bounds = rect(slot.x + (slot.width - source.width * scale) / 2,
    slot.y + (slot.height - source.height * scale) / 2, source.width * scale, source.height * scale);
  return { scale, bounds, project: (box: ContentRect) => rect(bounds.x + box.x * scale,
    bounds.y + box.y * scale, box.width * scale, box.height * scale) };
}

/** Align baked label baselines across different PNG canvases without stretching their artwork. */
export function fitLabelledTexture(source: { width: number; height: number }, slot: ContentRect, label: ContentRect) {
  const anchorX = label.x + label.width / 2, anchorY = label.y + label.height / 2;
  const targetX = slot.x + slot.width / 2, targetY = slot.y + slot.height * 0.82;
  const scale = Math.min((targetX - slot.x) / anchorX, (slot.x + slot.width - targetX) / (source.width - anchorX),
    (targetY - slot.y) / anchorY, (slot.y + slot.height - targetY) / (source.height - anchorY));
  return { scale, bounds: rect(targetX - anchorX * scale, targetY - anchorY * scale,
    source.width * scale, source.height * scale) };
}

export function skinContent(skin: LobbySkin, width: number, height: number) {
  const spec = LOBBY_SKIN_CONTENT[skin], box = spec.content;
  return spec.normalized ? rect(box.x * width, box.y * height, box.width * width, box.height * height) : box;
}

export const compactLobbyAmount = (value: number) => value < 1_000_000_000
  ? value.toLocaleString('vi-VN') : new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
