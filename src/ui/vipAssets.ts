import type Phaser from 'phaser';
import {loadSharedUi} from './sharedUi';
export const VIP_FONT = 'VipVietnamese';
export const vipBadge = (level: number) => `vip.badge.${level}`;
// Main connected alpha component + 3px edge allowance, in source pixels.
// VIP 8/14 include unrelated atlas fragments at the left edge: exclude those at runtime.
export const VIP_BADGE_BOUNDS = [
  [3,3,264,125],[2,2,248,135],[2,2,240,142],[3,3,242,148],
  [3,3,266,158],[3,3,257,152],[2,2,251,154],[3,2,261,166],
  [21,3,263,177],[3,3,285,189],[3,3,255,165],[3,3,264,175],
  [0,3,261,181],[3,3,279,186],[28,3,290,186],[2,3,308,210],
  [2,2,298,240],[3,3,349,267],[3,3,420,353],
] as const;
export const VIP_ART = ['button_gold','button_red','button_disabled','tab_normal','tab_selected',
  'panel_dark','panel_light','item_slot','progress_track','progress_fill_tilable','reward_card'] as const;
export type VipArt = typeof VIP_ART[number];
export const vipArt = (id: VipArt) => `vip.${id}`;
export function loadVipArt(scene: Phaser.Scene) {
  loadSharedUi(scene);
  // Isolated banner: only the fixed VIP word is baked in; progress and totals are live text.
  if (!scene.textures.exists('vip.header')) scene.load.image('vip.header',`${import.meta.env.BASE_URL}assets/vip/vip_header_progress.png`);
  // Fixed word VIP only: the isolated dragon title contains no illustrative quantities or player data.
  if (!scene.textures.exists('vip.title')) scene.load.image('vip.title',`${import.meta.env.BASE_URL}assets/vip/vip_title.png`);
  for (let level=0;level<=18;level++) if (!scene.textures.exists(vipBadge(level)))
    scene.load.image(vipBadge(level), `${import.meta.env.BASE_URL}assets/vip/badges/vip_${String(level).padStart(2,'0')}.png`);
  for (const id of VIP_ART) if (!scene.textures.exists(vipArt(id))) scene.load.image(vipArt(id), `${import.meta.env.BASE_URL}assets/vip/runtime_blank/${id}.png`);
  for (const id of ['chest_locked_wood','chest_ready_gold','chest_claimed_gray']) if (!scene.textures.exists(`vip.${id}`))
    scene.load.image(`vip.${id}`,`${import.meta.env.BASE_URL}assets/vip/rewards/${id}.png`);
  if (!scene.textures.exists('vip.hall')) scene.load.image('vip.hall',`${import.meta.env.BASE_URL}assets/inventory/background/inventory_hall_clean.png`);
  if (![...document.fonts].some(face=>face.family===VIP_FONT&&face.status==='loaded')) scene.load.font({key:VIP_FONT,
    url:`${import.meta.env.BASE_URL}assets/fonts/NotoSerif-Bold-Vietnamese.woff2`,format:'woff2',descriptors:{weight:'700'}});
}
