import type { HeroDefinition, Rarity } from '../domain/types';

// Demo baseline statistics only. Keep content data-driven; never bury balance in Scenes.
const roster: readonly Omit<HeroDefinition, 'normalAttackId' | 'ultimateSkillId' | 'passiveSkillId'>[] = [
  { id:'zhao-yun', name:'Triệu Vân', factionId:'shu', role:'fighter', rarity:'SSR', hp:1380, atk:235, def:68, speed:122, color:0x86b9ef, summonable:true },
  { id:'zhang-fei', name:'Trương Phi', factionId:'shu', role:'tank', rarity:'SSR', hp:1560, atk:145, def:85, speed:78, color:0xc08e58, summonable:true },
  { id:'guan-yu', name:'Quan Vũ', factionId:'shu', role:'fighter', rarity:'SSR', hp:1180, atk:205, def:46, speed:100, color:0x60b991, summonable:true },
  { id:'liu-bei', name:'Lưu Bị', factionId:'shu', role:'support', rarity:'SSR', hp:1100, atk:134, def:48, speed:98, color:0xc7ac67, summonable:true },
  { id:'huang-yueying', name:'Hoàng Nguyệt Anh', factionId:'shu', role:'mage', rarity:'SR', hp:970, atk:221, def:34, speed:110, color:0xaa9aee, summonable:true },
  { id:'ma-chao', name:'Mã Siêu', factionId:'shu', role:'ranger', rarity:'SSR', hp:1030, atk:226, def:38, speed:117, color:0xe3bf7a, summonable:true },
  { id:'cao-cao', name:'Tào Tháo', factionId:'wei', role:'mage', rarity:'SSR', hp:1160, atk:252, def:50, speed:115, color:0xbd73b8, summonable:true },
  { id:'xiahou-dun', name:'Hạ Hầu Đôn', factionId:'wei', role:'tank', rarity:'SSR', hp:1480, atk:163, def:83, speed:87, color:0xb87f7a, summonable:true },
  { id:'dian-wei', name:'Điển Vi', factionId:'wei', role:'tank', rarity:'SSR', hp:1420, atk:155, def:79, speed:74, color:0x999da9, summonable:true },
  { id:'sun-quan', name:'Tôn Quyền', factionId:'wu', role:'fighter', rarity:'SSR', hp:1200, atk:238, def:54, speed:112, color:0xf0a762, summonable:true },
  { id:'gan-ning', name:'Cam Ninh', factionId:'wu', role:'ranger', rarity:'SSR', hp:975, atk:180, def:35, speed:118, color:0x76b9a6, summonable:true },
  { id:'da-qiao', name:'Đại Kiều', factionId:'wu', role:'support', rarity:'SR', hp:1050, atk:172, def:38, speed:103, color:0xf08db2, summonable:true },
  { id:'diao-chan', name:'Điêu Thuyền', factionId:'warlords', role:'mage', rarity:'SSR', hp:990, atk:250, def:38, speed:126, color:0xea8ccc, summonable:true },
  { id:'hua-xiong', name:'Hoa Hùng', factionId:'warlords', role:'fighter', rarity:'SR', hp:1110, atk:178, def:44, speed:94, color:0xa88c66, summonable:true },
  { id:'lu-bu', name:'Lữ Bố', factionId:'warlords', role:'fighter', rarity:'SSS+', hp:1430, atk:260, def:62, speed:116, color:0xd45549, summonable:true },
  { id:'zhuge-liang', name:'Gia Cát Lượng', factionId:'shu', role:'mage', rarity:'SSS+', hp:1120, atk:255, def:51, speed:118, color:0x6cc6ae, summonable:true },
  { id:'pan-feng', name:'Phan Phượng', factionId:'warlords', role:'tank', rarity:'R', hp:1250, atk:125, def:61, speed:82, color:0xca984d, summonable:true },
  { id:'xing-dao-rong', name:'Hình Đạo Vinh', factionId:'warlords', role:'fighter', rarity:'R', hp:1100, atk:160, def:41, speed:95, color:0xbb7561, summonable:true },
  { id:'cheng-yuan-zhi', name:'Trình Viễn Chí', factionId:'warlords', role:'fighter', rarity:'R', hp:1050, atk:165, def:38, speed:96, color:0xd4b455, summonable:true },
  { id:'pei-yuan-shao', name:'Bùi Nguyên Thiệu', factionId:'warlords', role:'ranger', rarity:'R', hp:920, atk:162, def:34, speed:108, color:0x91b458, summonable:true },
  { id:'guan-ping', name:'Quan Bình', factionId:'shu', role:'fighter', rarity:'SR', hp:1160, atk:190, def:46, speed:99, color:0x67ae71, summonable:true },
  { id:'zhou-cang', name:'Chu Thương', factionId:'shu', role:'tank', rarity:'SR', hp:1370, atk:148, def:72, speed:85, color:0x527f65, summonable:true },
  { id:'cao-hong', name:'Tào Hồng', factionId:'wei', role:'fighter', rarity:'SR', hp:1200, atk:184, def:53, speed:94, color:0x7282ad, summonable:true },
];

export const HEROES: readonly HeroDefinition[] = roster.map(hero => ({
  ...hero, normalAttackId: `${hero.id}:normal`, ultimateSkillId: `${hero.id}:ultimate`, passiveSkillId: `${hero.id}:passive`,
}));

export const HERO_BY_ID: Record<string, HeroDefinition> = Object.fromEntries(HEROES.map(h => [h.id, h]));
export const SUMMON_RATES: Record<Rarity, number> = { R:0.75, SR:0.20, SSR:0.042, 'SSS+':0.008 };
export const PITY_LIMIT = 50;
export const SLOT_COUNT = 6;

export const LEGENDARY_PITY_LIMIT = 100;
export const HERO_RARITIES = ['R', 'SR', 'SSR', 'SSS+'] as const;
export const SSS_ROADMAP = [
  { name: 'Tư Mã Ý', baseHeroId: 'sima-yi' }, { name: 'Chu Du', baseHeroId: 'zhou-yu' },
  { name: 'Quan Vũ thức tỉnh', baseHeroId: 'guan-yu' }, { name: 'Triệu Vân thức tỉnh', baseHeroId: 'zhao-yun' },
  { name: 'Trương Phi thức tỉnh', baseHeroId: 'zhang-fei' }, { name: 'Tào Tháo thức tỉnh', baseHeroId: 'cao-cao' },
] as const;
export const HeroConfig = { roster: HEROES, rates: SUMMON_RATES, rarities: HERO_RARITIES, roadmap: SSS_ROADMAP };
export const heroFamily = (id: string) => HERO_BY_ID[id]?.baseHeroId ?? id;

export const heroFaction = (hero: HeroDefinition) => HERO_BY_ID[heroFamily(hero.id)]?.factionId ?? hero.factionId;
