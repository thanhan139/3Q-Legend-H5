import { SignatureConfig, signatureIds, type SignatureId } from './signatureConfig';
import type { EquipmentRarity } from '../domain/types';

export const EQUIPMENT_SLOTS = {
  weapon: 'Vũ Khí', armor: 'Giáp', helmet: 'Mũ', boots: 'Giày', relic: 'Bảo Vật', mount: 'Chiến Mã',
} as const;
export type EquipmentSlot = keyof typeof EQUIPMENT_SLOTS;
export type EquipmentStats = Record<'hp' | 'atk' | 'def' | 'speed', number>;

interface EquipmentDefinition {
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  art: string;
  base: Partial<EquipmentStats>;
}

const signatureGear = Object.fromEntries(signatureIds.map(id => {
  const item = SignatureConfig[id];
  return [id, { name: item.name, slot: 'weapon', rarity: 'SSR',
    art: `signatures/${id}.webp`, base: { hp: item.hp, atk: item.atk, def: item.def } }];
})) as Record<SignatureId, EquipmentDefinition>;

export const EQUIPMENT = {
  ...signatureGear,
  militiaBlade: { name: 'Đao Nghĩa Binh', slot: 'weapon', rarity: 'R', art: 'weapons/r/weapon_r_02.png', base: { atk: 18 } },
  blade: { name: 'Thanh Long Đao', slot: 'weapon', rarity: 'SR', art: 'weapons/sr/weapon_sr_02.png', base: { atk: 24 } },
  dragonBlade: { name: 'Kim Long Đao', slot: 'weapon', rarity: 'SSR', art: 'weapons/ssr/weapon_ssr_02.png', base: { atk: 30 } },
  phoenixSpear: { name: 'Phượng Vũ Thương', slot: 'weapon', rarity: 'SSR', art: 'weapons/ssr/weapon_ssr_04.png', base: { atk: 28, speed: 2 } },
  armor: { name: 'Hổ Vệ Giáp', slot: 'armor', rarity: 'R', art: 'armor.webp', base: { def: 11, hp: 40 } },
  eliteArmor: { name: 'Hổ Uy Giáp', slot: 'armor', rarity: 'SR', art: 'armor.webp', base: { def: 15, hp: 55 } },
  imperialArmor: { name: 'Kim Long Giáp', slot: 'armor', rarity: 'SSR', art: 'armor.webp', base: { def: 20, hp: 72 } },
  helmet: { name: 'Kim Lân Khôi', slot: 'helmet', rarity: 'R', art: 'helmet.webp', base: { hp: 70, def: 5 } },
  boots: { name: 'Truy Phong Ngoa', slot: 'boots', rarity: 'R', art: 'boots.webp', base: { speed: 4 } },
  eliteBoots: { name: 'Đạp Vân Ngoa', slot: 'boots', rarity: 'SR', art: 'boots.webp', base: { speed: 6 } },
  jade: { name: 'Bích Ngọc Phù', slot: 'relic', rarity: 'SR', art: 'jade.webp', base: { hp: 80, atk: 8 } },
  horse: { name: 'Chiếu Dạ Ngọc Sư Tử', slot: 'mount', rarity: 'SSR', art: 'horse.webp', base: { speed: 6, hp: 90 } },
} satisfies Record<string, EquipmentDefinition>;
export type EquipmentId = keyof typeof EQUIPMENT;

export const EquipmentConfig = {
  rarity: {
    R: { rank: 0, cap: 5, cost: 250, metal: 0x8fc5e6, backdrop: 0x23354b, rings: 1, pulse: false },
    SR: { rank: 1, cap: 10, cost: 400, metal: 0xd49af6, backdrop: 0x42264d, rings: 2, pulse: false },
    SSR: { rank: 2, cap: 15, cost: 600, metal: 0xffb750, backdrop: 0x65331d, rings: 3, pulse: true },
  },
  forge: {
    weapons: ['dragonBlade', 'phoenixSpear'] as const satisfies readonly EquipmentId[],
    shardsRequired: 50,
    firstClear: { '2-5': 15, '3-5': 20 } as Readonly<Partial<Record<string, number>>>,
    weekly: { stage: '2-5', shards: 5, limit: 3 },
    premiumStones: 5,
  },
  growthPerEnhancement: 0.18,
  // Previously published reward entries stay stable for existing saves.
  stageRewards: {
    '1-1': 'armor', '1-2': 'boots', '1-3': 'helmet', '1-4': 'militiaBlade', '1-5': 'blade',
    '2-1': 'armor', '2-2': 'eliteArmor', '2-3': 'blade',
    '3-3': 'eliteBoots', '3-4': 'imperialArmor', '3-5': 'horse',
  } as Readonly<Partial<Record<string, EquipmentId>>>,
} as const;
