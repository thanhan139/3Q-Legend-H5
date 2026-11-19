import type {SaveV2} from '../domain/types';
import {HERO_BY_ID,heroFamily} from '../data/heroes';
import {isSignature} from '../data/signatureConfig';
import {heroStats,combatPower} from '../domain/progression';
import {EQUIPMENT,EQUIPMENT_SLOTS} from '../domain/equipment';
import themes from '../data/equipmentThemes.json';
const ids:Record<string,string>={'guan-yu':'quan_vu','zhao-yun':'trieu_van','lu-bu':'lu_bo','zhuge-liang':'gia_cat_luong','diao-chan':'dieu_thuyen'};
export function equipmentHeroModel(save:SaveV2,requested?:string,uid?:string,collection=false){
 const selectedHeroId=requested&&HERO_BY_ID[requested]&&(collection||save.heroes.includes(requested))?requested:save.heroes.find(id=>HERO_BY_ID[id]);
 if(!selectedHeroId)return undefined;
 const hero=HERO_BY_ID[selectedHeroId];if(!hero)return undefined;
 const equipped=(save.equipment??[]).filter(g=>g.heroId===selectedHeroId);
 const stats=heroStats(hero,save.heroExp[selectedHeroId],save.heroStars?.[selectedHeroId],save.equipment,save.jewelry);
 return{selectedHeroId,hero,stats,power:combatPower(stats),stars:save.heroStars?.[selectedHeroId]??1,
  theme:themes.heroes.find(t=>t.hero_id_hint===ids[heroFamily(selectedHeroId)]),equipped,
  selectedUid:equipped.some(g=>g.uid===uid)?uid:undefined,
  slots:Object.keys(EQUIPMENT_SLOTS).map(slot=>({slot:slot as keyof typeof EQUIPMENT_SLOTS,
   item:equipped.find(g=>!isSignature(g.itemId)&&EQUIPMENT[g.itemId].slot===slot)}))};
}
