import manifest from '../data/livingSpiritManifest.json';
import expansion from '../data/livingSpiritExpansionManifest.json';
import painted from '../data/livingSpiritPaintedManifest.json';
import {heroFamily} from '../data/heroes';
import type {GameCommand} from '../cloud/gameProtocol';
import type {SaveV2} from '../domain/types';
export type SpiritClip='idle'|'selected'|'power_up';
export interface SpiritDefinition{
 hero_id_hint:string;visualVariant?:string;presentation?:{x:number;y:number;height:number};
 clips:Record<SpiritClip,{atlas:string;frames:number;frameWidth:number;frameHeight:number;cols:number;rows:number;
 duration_ms_per_frame:number;repeat:number;sourceWidth?:number;sourceHeight?:number}>;
}
const definitions:Record<string,SpiritDefinition>={...manifest.hero_mapping,...expansion.hero_mapping,...painted.hero_mapping};
const SLUGS:Record<string,keyof typeof definitions>={'guan-yu':'quan_vu','zhao-yun':'trieu_van',
 'lu-bu':'lu_bo','zhuge-liang':'gia_cat_luong','diao-chan':'dieu_thuyen'};
export const spiritDefinition=(heroId:string)=>definitions[SLUGS[heroFamily(heroId)]];
export const spiritTexture=(slug:string,clip:SpiritClip)=>`livingSpirit:${slug}:${definitions[slug]?.visualVariant?definitions[slug].visualVariant+':':''}${clip}`;
export const spiritSourceTexture=(slug:string,clip:SpiritClip)=>spiritTexture(slug,definitions[slug]?.visualVariant?'idle':clip);
export function confirmedSpiritUpgrade(before:SaveV2,after:SaveV2,heroId:string,command:GameCommand,ok:boolean){
 if(!ok||command.type!=='enhance'||!spiritDefinition(heroId))return undefined;
 const old=before.equipment?.find(g=>g.uid===command.uid),next=after.equipment?.find(g=>g.uid===command.uid);
 if(!old||!next||old.heroId!==heroId||next.heroId!==heroId||next.itemId!==old.itemId||next.level<=old.level)return undefined;
 return `${heroId}:${next.uid}:${next.level}`;
}
/** Per-game transient presentation, never stored in player saves. */
export class SpiritPlaybackState{
 private owner?:string;
 private heroId?:string;
 private pending=new Map<string,string>();
 private seen=new Set<string>();
 select(owner:string,heroId:string,hidden=false):SpiritClip{
  this.account(owner);
  const changed=this.heroId!==heroId;this.heroId=heroId;
  if(hidden)return 'idle';
  if(this.pending.delete(heroId))return 'power_up';
  return changed?'selected':'idle';
 }
 confirm(owner:string,heroId:string,event:string){
  this.account(owner);
  if(this.seen.has(event))return false;
  this.seen.add(event);this.pending.set(heroId,event);return true;
 }
 private account(owner:string){if(this.owner!==owner){this.owner=owner;this.heroId=undefined;this.pending.clear();this.seen.clear();}}
}
