import { isSignature, SignatureConfig } from '../data/signatureConfig';
import { heroFamily } from '../data/heroes';
import { EQUIPMENT, EQUIPMENT_SLOTS, EquipmentConfig, type EquipmentId, type EquipmentSlot, type EquipmentStats } from '../data/equipmentConfig';
import type { SaveV2 } from './types';

export { EQUIPMENT, EQUIPMENT_SLOTS } from '../data/equipmentConfig';
export type { EquipmentSlot, EquipmentStats } from '../data/equipmentConfig';

export interface Gear {
  uid: string;
  itemId: EquipmentId;
  level: number;
  heroId?: string;
  prestigeSkin?: true;
}

export const STAGE_GEAR = EquipmentConfig.stageRewards;
export const gearSlot = (id: EquipmentId) => isSignature(id) ? 'signature' : EQUIPMENT[id].slot;

export function signaturePassive(gear: readonly Gear[] | undefined, heroId: string) {
  const item = gear?.find(entry => entry.heroId === heroId && isSignature(entry.itemId));
  if (!item || !isSignature(item.itemId)) return undefined;
  const signature = SignatureConfig[item.itemId];
  return heroFamily(heroId) === signature.hero ? signature.bonus : undefined;
}

export const gearRarity = (gear: Gear) => EquipmentConfig.rarity[EQUIPMENT[gear.itemId].rarity];
// Save levels are one-based. Level 1 is displayed as +0.
export const enhancement = (gear: Gear) => gear.level - 1;
export const canEnhance = (gear: Gear) => enhancement(gear) < gearRarity(gear).cap;
export const enhanceCost = (gear: Gear) => gear.level * gearRarity(gear).cost;

export function gearStats(gear: Gear): EquipmentStats {
  const base: Partial<EquipmentStats> = EQUIPMENT[gear.itemId].base;
  const bonus = 1 + enhancement(gear) * EquipmentConfig.growthPerEnhancement;
  return {
    hp: Math.round((base.hp ?? 0) * bonus),
    atk: Math.round((base.atk ?? 0) * bonus),
    def: Math.round((base.def ?? 0) * bonus),
    speed: Math.round((base.speed ?? 0) * bonus),
  };
}

export function equipmentBonus(gear: readonly Gear[] = [], heroId?: string): EquipmentStats {
  const total = { hp: 0, atk: 0, def: 0, speed: 0 };
  if (!heroId) return total;
  for (const item of gear) {
    if (item.heroId !== heroId) continue;
    const stats = gearStats(item);
    total.hp += stats.hp;
    total.atk += stats.atk;
    total.def += stats.def;
    total.speed += stats.speed;
  }
  return total;
}

export function normalizeEquipment(raw: unknown, heroes: readonly string[]): Gear[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const occupied = new Set<string>();
  return raw.flatMap((item): Gear[] => {
    if (!item || typeof item.uid !== 'string' || !item.uid || seen.has(item.uid) ||
      typeof item.itemId !== 'string' || !Object.hasOwn(EQUIPMENT, item.itemId)) return [];
    seen.add(item.uid);
    const itemId = item.itemId as EquipmentId;
    const slotKey = `${item.heroId}:${gearSlot(itemId)}`;
    const heroId = heroes.includes(item.heroId) && !occupied.has(slotKey) ? item.heroId as string : undefined;
    if (heroId) occupied.add(slotKey);
    const level = Number.isSafeInteger(item.level) ? Math.max(1, item.level) : 1;
    const prestigeSkin = item.prestigeSkin === true && EQUIPMENT[itemId].rarity === 'SSR' &&
      EQUIPMENT[itemId].slot === 'weapon';
    return [{ uid: item.uid, itemId, level, ...(heroId ? { heroId } : {}), ...(prestigeSkin ? { prestigeSkin: true } : {}) }];
  });
}

export function grantStageGear(save: SaveV2, stageId: string): (typeof EQUIPMENT)[EquipmentId] | undefined {
  const itemId = STAGE_GEAR[stageId];
  const uid = `campaign:${stageId}`;
  if (!itemId || save.equipment?.some(item => item.uid === uid)) return;
  save.equipment = [...(save.equipment ?? []), { uid, itemId, level: 1 }];
  return EQUIPMENT[itemId];
}

export interface GearQuery {
  rarity?: (typeof EQUIPMENT)[EquipmentId]['rarity'];
  slot?: EquipmentSlot;
  stat?: keyof EquipmentStats;
  minimum?: number;
  sort?: 'rarity' | 'slot' | 'enhancement' | keyof EquipmentStats;
}

export function queryGear(items: readonly Gear[], query: GearQuery): Gear[] {
  const { rarity, slot, stat, minimum = 0, sort = 'rarity' } = query;
  return items.filter(item => {
    const definition = EQUIPMENT[item.itemId];
    return (!rarity || definition.rarity === rarity) && (!slot || definition.slot === slot) &&
      (!stat || gearStats(item)[stat] > 0) && enhancement(item) >= minimum;
  }).sort((a, b) => {
    const rank = gearRarity(b).rank - gearRarity(a).rank;
    const level = b.level - a.level;
    if (sort === 'slot') {
      return Object.keys(EQUIPMENT_SLOTS).indexOf(EQUIPMENT[a.itemId].slot) -
        Object.keys(EQUIPMENT_SLOTS).indexOf(EQUIPMENT[b.itemId].slot) || rank || level;
    }
    if (sort === 'enhancement') return level || rank;
    if (sort === 'rarity') return rank || level;
    return gearStats(b)[sort] - gearStats(a)[sort] || rank || level;
  });
}
