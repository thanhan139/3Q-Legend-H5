/** Source-art alpha bounds measured in 256 x 256 sprite cells.
 * The atlas cells include wildly different transparent margins. Scaling the
 * whole cell equally made the sample heroes look much smaller than the rest.
 * These metadata values normalize the VISIBLE figure, not the canvas.
 */
import {CHIBI_SOURCES,CHIBI_ENLARGEMENT,CHIBI_LIMITS,CHIBI_GROWTH} from './chibiBattle';
import {heroFamily} from './heroes';
interface VisibleFootprint { width: number; height: number }

const VISIBLE_FOOTPRINTS: Readonly<Record<string, VisibleFootprint>> = {
  'zhang-fei': { width: 214, height: 193 },
  'guan-yu': { width: 197, height: 202 },
  'liu-bei': { width: 213, height: 208 },
  'zhao-yun': { width: 249, height: 243 },
  'huang-yueying': { width: 241, height: 250 },
  'ma-chao': { width: 249, height: 242 },
  'cao-cao': { width: 248, height: 250 },
  'xiahou-dun': { width: 241, height: 250 },
  'dian-wei': { width: 249, height: 234 },
  'sun-quan': { width: 229, height: 250 },
  'gan-ning': { width: 249, height: 239 },
  'da-qiao': { width: 226, height: 250 },
  'diao-chan': { width: 243, height: 250 },
  'hua-xiong': { width: 249, height: 240 },
};

// 145px high figures fit the 186px row separation. Allow room for long weapons.
export const TARGET_VISIBLE_HEIGHT = 145;
export const MAX_VISIBLE_WIDTH = 172;
export const SPRITE_CELL_SIZE = 256;

export function battleSpriteDisplaySize(heroId: string): number {
  const { width, height } = VISIBLE_FOOTPRINTS[heroId] ?? { width: 248, height: 248 };
  return Math.round(Math.min(
    TARGET_VISIBLE_HEIGHT * SPRITE_CELL_SIZE / height,
    MAX_VISIBLE_WIDTH * SPRITE_CELL_SIZE / width,
  ));
}

// Battle-only limits for three rows. Leave the shared Lobby sizing above unchanged.
// Include the largest idle/strike/hit frame, not only the initial standing pose.
const CLIP_FOOTPRINTS:Readonly<Record<string,VisibleFootprint>>={
  'zhang-fei':{width:236,height:216},'guan-yu':{width:228,height:204},'liu-bei':{width:219,height:210},
};
export function legacyBattleCharacterDisplaySize(heroId:string):number{
  const {width,height}=CLIP_FOOTPRINTS[heroId]??VISIBLE_FOOTPRINTS[heroId]??{width:248,height:248};
  return Math.floor(Math.min(112*SPRITE_CELL_SIZE/height,148*SPRITE_CELL_SIZE/width));
}
/** One uniform scale for every frame; source alpha bounds include weapon extremes. */
export function battleCharacterDisplaySize(heroId:string):number{
  const id=heroFamily(heroId),source=CHIBI_SOURCES[id],baseline=legacyBattleCharacterDisplaySize(id);
  if(!source)return baseline;
  return Math.min(baseline*(CHIBI_ENLARGEMENT[id]??CHIBI_GROWTH),
    CHIBI_LIMITS.height*256/source.maxHeight,CHIBI_LIMITS.width*256/source.maxWidth,CHIBI_LIMITS.sourceScale*256);
}
