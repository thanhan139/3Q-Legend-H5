import zhao from './characterRigs/zhao-yun.json';
import guan from './characterRigs/guan-yu.json';
import liu from './characterRigs/liu-bei.json';
import zhang from './characterRigs/zhang-fei.json';
import dian from './characterRigs/dian-wei.json';
import {heroFamily} from './heroes';
export const RIG_PARTS=['head','torso','upperNear','foreNear','upperFar','foreFar','thighNear','shinNear',
  'thighFar','shinFar','weapon','cape','hair','skirt','accessory','headHit'] as const;
export type RigPart=typeof RIG_PARTS[number];
export interface RigManifest{heroId:string;texture:string;size:number[];sha256:string;frames:Record<RigPart,number[]>}
export const REMASTER_RIGS:Readonly<Record<string,RigManifest>>={'zhao-yun':zhao,'guan-yu':guan,'liu-bei':liu,'zhang-fei':zhang,'dian-wei':dian};
export const remasterFor=(id:string)=>REMASTER_RIGS[heroFamily(id)];
export const rigTexture=(id:string)=>`battle-remaster.${heroFamily(id)}`;
