import {HERO_BY_ID} from '../data/heroes';
import type {SaveV2} from '../domain/types';
export type HeroTab='detail'|'skills'|'equipment'|'signature';
/** Transient UI selection only. Account changes discard the previous selection. */
export class HeroNavigation {
  selectedHeroId?:string;
  tab:HeroTab='detail';
  private owner?:string;
  get accountKey(){return this.owner??'local-ui';}
  candidate(save:SaveV2,owner:string,requested?:string,collection=false){
    const valid=(id?:string)=>Boolean(id&&HERO_BY_ID[id]&&(collection||save.heroes.includes(id)));
    return valid(requested)?requested:this.owner===owner&&valid(this.selectedHeroId)?this.selectedHeroId:save.heroes.find(id=>HERO_BY_ID[id]);
  }
  resolve(save:SaveV2,owner:string,requested?:string,tab:HeroTab='detail',collection=false){
    this.selectedHeroId=this.candidate(save,owner,requested,collection);this.owner=owner;
    this.tab=tab;return this.selectedHeroId;
  }
}
export const heroNavigation=new HeroNavigation();
export const heroTabRoute=(tab:HeroTab,heroId:string)=>({scene:tab==='equipment'?'Equipment':'Heroes',data:{heroId,tab}});
