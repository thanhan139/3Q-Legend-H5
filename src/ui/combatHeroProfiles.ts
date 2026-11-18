import {heroFamily} from '../data/heroes';
export type CombatVisualStyle='melee'|'thrust'|'ranged'|'magic';
/** Presentation mapping follows weapon/skill identity, not the balance role. */
export const COMBAT_HERO_STYLES:Readonly<Record<string,CombatVisualStyle>>={
 'zhao-yun':'thrust','zhang-fei':'thrust','guan-yu':'melee','liu-bei':'melee',
 'huang-yueying':'ranged','ma-chao':'thrust','cao-cao':'melee','xiahou-dun':'melee',
 'dian-wei':'melee','sun-quan':'melee','gan-ning':'melee','da-qiao':'magic',
 'diao-chan':'magic','hua-xiong':'melee','lu-bu':'melee','zhuge-liang':'magic',
 'pan-feng':'melee','xing-dao-rong':'melee','cheng-yuan-zhi':'thrust','pei-yuan-shao':'ranged',
 'guan-ping':'melee','zhou-cang':'melee','cao-hong':'melee',
};
export const combatHeroStyle=(id:string)=>COMBAT_HERO_STYLES[heroFamily(id)];
export const combatHeroMelee=(id:string)=>['melee','thrust'].includes(combatHeroStyle(id));
export const combatHeroSwing=(id:string)=>combatHeroStyle(id)==='thrust'?'melee_thrust':
 heroFamily(id)==='lu-bu'?'melee_heavy_impact':'melee_slash_arc';
export const COMBAT_SIGNATURES:Readonly<Record<string,string>>={'guan-yu':'quan_vu_green_dragon_slash','zhao-yun':'trieu_van_thunder_spear',
 'zhang-fei':'truong_phi_war_roar','zhuge-liang':'gia_cat_luong_bagua_cast','da-qiao':'dai_kieu_blossom_heal'};
