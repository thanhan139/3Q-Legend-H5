import measurements from './chibiBattleAssets.json';
import {heroFamily} from './heroes';
export interface ChibiSource{frame:number;staticBounds:number[];staticFoot:number[];maxWidth:number;maxHeight:number;clipFeet:number[][];clipBounds?:number[][];clips:string[]}
export const CHIBI_SOURCES:Readonly<Record<string,ChibiSource>>=measurements.heroes;
// Expanded after the two-hero gate passed at all three target resolutions.
export const CHIBI_GROWTH=1.15;
export const CHIBI_ENLARGEMENT:Readonly<Record<string,number>>={'dian-wei':1.18,'lu-bu':1.12};
export const CHIBI_LIMITS={height:128,width:170,sourceScale:1} as const;
export function chibiFoot(id:string,frame?:number){
  const spec=CHIBI_SOURCES[heroFamily(id)];
  const foot=frame===undefined?spec.staticFoot:spec.clipFeet[frame]??spec.staticFoot;
  return{x:foot[0]/256,y:foot[1]/256};
}
