import type Phaser from 'phaser';
import mapping from './campaignAssetMapping.json';
import layout from './campaignLayout.json';

const ROOT = 'assets/ui/campaign/';
export const campaignKey = (asset: string) => `campaign-ui:${asset}`;
export const campaignArt = mapping;
export const campaignLayout = layout.desktop;

export const CHAPTER_MAPS = [
  campaignLayout.mapAnchorsNormalizedPerChapter.chapter01,
  campaignLayout.mapAnchorsNormalizedPerChapter.chapter02,
  campaignLayout.mapAnchorsNormalizedPerChapter.chapter03,
];

export const campaignIcons = {
  lock: 'icons/lock_gold.png',
  gold: 'icons/gold_ingot.png',
  gem: 'icons/purple_gem.png',
  key: 'icons/golden_key.png',
  exp: 'icons/training_exp.png',
  chest: 'icons/treasure_chest.png',
};

export const campaignProps = [
  ['map_props_v11/pagoda_pavilion.png', 'map_props_v11/peach_tree.png', 'map_props_v11/fortified_gate.png'],
  ['map_props_v11/camp_tent.png', 'map_props_v11/autumn_tree.png', 'map_props_v11/watchtower.png'],
  ['map_props_v11/wood_barricade.png', 'map_props_v11/pine_tree.png', 'map_props_v11/fortified_gate.png'],
];

export const campaignTrim = 'panels_v11/ornate_section_separator.png';
export const rewardFrames = {
  R: 'shared/reward_frame_r.png',
  SR: 'shared/reward_frame_sr.png',
  SSR: 'shared/reward_frame_ssr.png',
  'SSS+': 'shared/reward_frame_sssp.png',
};

function texturePaths(group: object): string[] {
  return Object.values(group).flatMap(value => typeof value === 'string' ? [value] : texturePaths(value));
}

export function loadCampaignAssets(load: Phaser.Loader.LoaderPlugin, textures: Phaser.Textures.TextureManager) {
  const paths = new Set([
    ...texturePaths(mapping), ...Object.values(campaignIcons), ...Object.values(rewardFrames),
    ...campaignProps.flat(), campaignTrim,
  ]);
  for (const path of paths) {
    const key = campaignKey(path);
    if (!textures.exists(key)) load.image(key, `${import.meta.env.BASE_URL}${ROOT}${path}`);
  }
}
