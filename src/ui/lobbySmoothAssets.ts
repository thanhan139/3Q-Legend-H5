import type Phaser from 'phaser';

const root = 'assets/ui/lobby_smooth/';
// Clean frames exclude disconnected scraps from neighboring sheet cells.
// Original PNGs are retained byte-for-byte; no baked badge or sample data is hidden behind text.
export const LOBBY_SMOOTH = {
  red: { path: 'hud/empty_button_red.png', crop: [32, 24, 307, 89] },
  gold: { path: 'hud/empty_button_gold.png', crop: [35, 5, 299, 102] },
  welfare: { path: 'feature_icons/welfare_labelled.png', crop: [0, 10, 162, 151] },
  topup: { path: 'feature_icons/first_topup_labelled.png', crop: [0, 10, 176, 151] },
  checkin: { path: 'feature_icons/checkin_labelled.png', crop: [0, 10, 167, 151] },
  mail: { path: 'feature_icons/mail_labelled.png', crop: [0, 10, 159, 151] },
  missions: { path: 'feature_icons/missions_labelled.png', crop: [0, 10, 164, 151] },
  settings: { path: 'feature_icons/settings_labelled.png', crop: [0, 10, 148, 151] },
  formation: { path: 'bottom_nav/formation_default.png' },
  formationActive: { path: 'bottom_nav/formation_selected.png' },
  heroes: { path: 'bottom_nav/heroes_default.png' },
  heroesActive: { path: 'bottom_nav/heroes_selected.png' },
  inventory: { path: 'bottom_nav/inventory_default.png' },
  inventoryActive: { path: 'bottom_nav/inventory_selected.png' },
  summon: { path: 'bottom_nav/summon_default.png' },
  summonActive: { path: 'bottom_nav/summon_selected.png' },
  campaign: { path: 'campaign/button_chinh_chien_default.png', crop: [0, 8, 491, 149] },
  campaignActive: { path: 'campaign/button_chinh_chien_selected.png', crop: [0, 8, 491, 154] },
} as const;

export type LobbySkin = keyof typeof LOBBY_SMOOTH;
export const smoothKey = (id: LobbySkin) => `smooth-lobby-${id}`;
export const SMOOTH_FRAME = 'clean';
export const LOBBY_DOCK = { centers: [172, 482, 792, 1102], y: 650, width: 168, height: 112 } as const;

export function loadLobbySmooth(scene: Phaser.Scene) {
  for (const [id, asset] of Object.entries(LOBBY_SMOOTH)) {
    const key = smoothKey(id as LobbySkin);
    if (!scene.textures.exists(key)) scene.load.image(key, `${import.meta.env.BASE_URL}${root}${asset.path}`);
  }
}

export function prepareLobbySmooth(scene: Phaser.Scene) {
  for (const [id, asset] of Object.entries(LOBBY_SMOOTH)) {
    const texture = scene.textures.get(smoothKey(id as LobbySkin));
    if (texture.has(SMOOTH_FRAME)) continue;
    const base = texture.get();
    const rect = 'crop' in asset ? asset.crop : [0, 0, base.width, base.height];
    texture.add(SMOOTH_FRAME, 0, rect[0], rect[1], rect[2], rect[3]);
  }
}
