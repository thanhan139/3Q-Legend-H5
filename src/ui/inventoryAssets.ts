import categories from '../data/inventoryCategoryAssets.json';
import type Phaser from 'phaser';
import { EQUIPMENT } from '../domain/equipment';
import {loadSharedUi} from './sharedUi';
export const INVENTORY_FONT = 'InventoryVietnamese';
export const INVENTORY_ART = {
  background: 'background/inventory_hall_clean.png', grid: 'panels/inventory_grid_panel.png',
  detail: 'panels/item_detail_panel.png', title: 'panels/title_banner_blank.png',
  parchment: 'panels/detail_parchment_blank.png', plaque: 'panels/detail_title_plaque_blank.png',
  portrait: 'panels/hero_fragment_portrait_frame.png', divider: 'decor/gold_dragon_divider.png',
  slot: 'slots/item_slot_default.png', selected: 'slots/item_slot_selected.png',
  tab: 'tabs/tab_default.png', tabActive: 'tabs/tab_selected.png',
  gold: 'buttons/button_gold.png', back: 'buttons/button_back.png', glow: 'effects/glow_gold.png',
} as const;
export type InventoryArt = keyof typeof INVENTORY_ART;
export const inventoryKey = (id: InventoryArt) => `inventory.${id}`;
export const INVENTORY_ICONS = {
  key: 'assets/ui/welfare/items/golden_key.png', exp: 'assets/ui/campaign/icons/training_exp.png',
  stone: 'assets/ui/welfare/items/purple_gem.png', forge: 'assets/equipment/weapons/ssr/weapon_ssr_02.png',
  legacy: 'assets/ui/welfare/items/gold_ingot.png',
} as const;
export function loadInventoryArt(scene: Phaser.Scene) {
  loadSharedUi(scene);
  for (const [id, file] of Object.entries(INVENTORY_ART)) {
    if (!scene.textures.exists(`inventory.${id}`)) scene.load.image(`inventory.${id}`, `${import.meta.env.BASE_URL}assets/inventory/${file}`);
  }
  // Display the actual equipment artwork in category inventories.
  for (const [id, gear] of Object.entries(EQUIPMENT)) {
    const key = 'inventory.gear.' + id;
    if (!scene.textures.exists(key)) scene.load.image(key, import.meta.env.BASE_URL + 'assets/equipment/' + gear.art);
  }
  for (const [id, file] of Object.entries(INVENTORY_ICONS)) {
    if (!scene.textures.exists(`inventory.icon.${id}`)) scene.load.image(`inventory.icon.${id}`, `${import.meta.env.BASE_URL}${file}`);
  }
  for (const cat of categories) {
    const key = 'inventory.category.' + cat.id;
    if (!scene.textures.exists(key)) scene.load.image(key, import.meta.env.BASE_URL + 'assets/inventory/categories/' + cat.file);
  }
  if (![...document.fonts].some(face => face.family === INVENTORY_FONT && face.status === 'loaded')) {
    scene.load.font({ key: INVENTORY_FONT, url: `${import.meta.env.BASE_URL}assets/fonts/NotoSerif-Bold-Vietnamese.woff2`,
      format: 'woff2', descriptors: { weight: '700' } });
  }
}
