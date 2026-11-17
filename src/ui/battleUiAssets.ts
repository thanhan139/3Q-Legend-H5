import type Phaser from 'phaser';
import {loadSharedUi} from './sharedUi';
export const BATTLE_FONT='BattleVietnamese';
const ROOT='assets/battle/ui/';
export const BATTLE_UI_ASSETS={
  stage:'plates/stage_plaque_blank',turn:'plates/turn_plaque_blank',back:'buttons/back_lobby_blank',
  speed:'buttons/speed_blank',skip:'buttons/skip_blank',versus:'effects/versus_emblem',
  name:'hud/ally_nameplate_empty',enemyName:'hud/enemy_nameplate_empty',
  hp:'hud/bar_track_ally',rage:'hud/bar_rage_track',footer:'panels/battle_log_frame',
  allyRing:'ground/ground_ring_ally',enemyRing:'ground/ground_ring_enemy',divider:'decor/gold_divider_thin',
} as const;
export type BattleUiArt=keyof typeof BATTLE_UI_ASSETS;
export const battleUiKey=(id:BattleUiArt)=>`battle.ui.${id}`;
// Frames exclude unrelated neighboring artwork; source PNGs remain unchanged.
const CROPS:Partial<Record<BattleUiArt,readonly[number,number,number,number]>>={
  enemyName:[3,17,329,70],rage:[0,7,452,57],versus:[38,16,240,184],
};
export function loadBattleUi(scene:Phaser.Scene){
  loadSharedUi(scene);
  for(const [id,path] of Object.entries(BATTLE_UI_ASSETS))if(!scene.textures.exists(battleUiKey(id as BattleUiArt)))
    scene.load.image(battleUiKey(id as BattleUiArt),`${import.meta.env.BASE_URL}${ROOT}${path}.png`);
  if(!scene.textures.exists('battle.courtyard-premium'))scene.load.image('battle.courtyard-premium',
    `${import.meta.env.BASE_URL}assets/battle/backgrounds/courtyard-premium-v1.png`);
  if(![...document.fonts].some(f=>f.family===BATTLE_FONT&&f.status==='loaded'))scene.load.font({key:BATTLE_FONT,
    url:`${import.meta.env.BASE_URL}assets/fonts/NotoSerif-Bold-Vietnamese.woff2`,format:'woff2',descriptors:{weight:'700'}});
}
export function battleUiFrame(scene:Phaser.Scene,id:BattleUiArt){
  const texture=scene.textures.get(battleUiKey(id)),crop=CROPS[id];
  if(crop&&!texture.has('clean'))texture.add('clean',0,...crop);
  return crop?'clean':undefined;
}
