import type Phaser from 'phaser';
import { signatureIds } from '../data/signatureConfig';

const pack = 'ui/divine-forge-v2/';
const assets = {
  hall: 'equipment-themes/background/equipment_hall_clean.png',
  title: 'ui/formation/frames/title_dragon_red.png',
  reward: 'ui/welfare_v21/panels/panel_reward_strip_hd.png',
  panel: 'ui/welfare_v21/panels/panel_main_ornate_hd.png',
  glow: 'equipment-themes/ui/effects/glow_gold.png',
  brazier: 'battle/ui/ground/ground_ring_active.png',
  sigil: 'battle/effects/skill_vfx/isolated_vfx/trieu_hoi__gold_magic_circle.png',
  shard: 'shop/icons/forge_shard.png',
  parchment: 'inventory/panels/detail_parchment_blank.png',
};
const packAssets = {
  center: 'frames/forge_panel_center.png',
  wallet: 'frames/wallet_shard_blank.png',
  name: 'frames/weapon_name_banner_blank.png',
  rarity: 'frames/rarity_diamond_blank.png',
  track: 'frames/progress_track.png',
  fill: 'frames/progress_fill.png',
  locked: 'frames/weapon_card_locked.png',
  owned: 'frames/weapon_card_owned.png',
  equipped: 'frames/weapon_card_equipped.png',
  selected: 'frames/weapon_card_selected.png',
  success: 'frames/popup_success_blank.png',
  lock: 'icons/icon_lock.png',
  worn: 'icons/icon_equipped.png',
  anvil: 'icons/icon_forge_crossed.png',
  campaign: 'icons/icon_campaign.png',
  altar: 'overlays/forge_altar.png',
  divider: 'overlays/gold_divider.png',
  embers: 'effects/forge_sparkles.png',
};

export const forgeTexture = (name: string) => `divine-forge.${name}`;

export function loadDivineForge(scene: Phaser.Scene) {
  const load = (name: string, path: string) => {
    const key = forgeTexture(name);
    if (!scene.textures.exists(key)) scene.load.image(key, `${import.meta.env.BASE_URL}assets/${path}`);
  };
  Object.entries(assets).forEach(([name, path]) => load(name, path));
  Object.entries(packAssets).forEach(([name, path]) => load(name, pack + path));
  for (const kind of ['back', 'gold', 'red']) {
    for (const state of ['normal', 'hover', 'pressed', 'disabled']) {
      if (kind === 'back' && state === 'hover') continue;
      load(`${kind}.${state}`, `${pack}buttons/btn_${kind}_${state}.png`);
    }
  }
  for (const id of signatureIds) {
    load(id, `${pack}weapons/${id}.png`);
    load(`${id}.thumb`, `${pack}weapons/${id}_thumb.png`);
  }
}
