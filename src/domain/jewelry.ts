import artwork from '../data/jewelryAssets.json';
import { STAGES } from '../data/campaign';
import { HERO_BY_ID } from '../data/heroes';

export type JewelrySlot = 'ring' | 'necklace';
export type JewelryRarity = 'R' | 'SR' | 'SSR';
export interface JewelryStats { hp: number; atk: number; def: number; crit: number; accuracy: number; dodge: number }
export const JEWELRY_SETS = {
  dragon: { name: 'Thanh Long', hp: 0, atk: 2, def: 0 },
  tiger: { name: 'Bạch Hổ', hp: 0, atk: 0, def: 3 },
  phoenix: { name: 'Chu Tước', hp: 3, atk: 0, def: 0 },
  tortoise: { name: 'Huyền Vũ', hp: 1.5, atk: 0, def: 1.5 },
} as const;
export type JewelrySetId = keyof typeof JEWELRY_SETS;
interface JewelryDefinition {
  id: string; type: JewelrySlot; rarity: JewelryRarity; name: string; asset: string;
  color: string; setId: JewelrySetId | null; size: number[];
}
export type JewelryCheckpoint = 0 | 10 | 20 | 30 | 40;
export interface JewelryItem { uid: string; itemId: string; level: number; heroId?: string; highestCheckpoint?: JewelryCheckpoint }
export interface JewelryEnhancementReceipt {
  kind: 'jewelryEnhancement';
  uid: string;
  success: boolean;
  fromLevel: number;
  toLevel: number;
  targetLevel: number;
  highestCheckpoint: JewelryCheckpoint;
  copperSpent: number;
  essenceSpent: number;
}

export const JEWELRY_ITEMS = artwork as readonly JewelryDefinition[];
export const JEWELRY: Readonly<Record<string, JewelryDefinition>> = Object.fromEntries(JEWELRY_ITEMS.map(def => [def.id, def]));
export const JEWELRY_MAX_LEVEL = 50;
export const JEWELRY_RULES_VERSION = 3;
export const JEWELRY_ESSENCE_PER_ITEM = 100;
export const JEWELRY_UID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const EMPTY_JEWELRY_STATS: Readonly<JewelryStats> = { hp: 0, atk: 0, def: 0, crit: 0, accuracy: 0, dodge: 0 };
const rarityBalance = {
  R: { multiplier: 1, copper: 70, step: 5 },
  SR: { multiplier: 1.45, copper: 110, step: 7 },
  SSR: { multiplier: 2, copper: 170, step: 10 },
};
const slotStats: Record<JewelrySlot, JewelryStats> = {
  ring: { hp: 0, atk: 11, def: 2, crit: .55, accuracy: .65, dodge: 0 },
  necklace: { hp: 55, atk: 0, def: 3, crit: 0, accuracy: 0, dodge: .65 },
};
export const JEWELRY_ENHANCEMENT_RULES = [
  { maxTarget: 9, chance: 100, loss: 0, copperFactor: 1, ssrEssence: 1, failPercent: 0 },
  { maxTarget: 10, chance: 70, loss: 1, copperFactor: 2, ssrEssence: 2, failPercent: 50 },
  { maxTarget: 19, chance: 75, loss: 1, copperFactor: 2, ssrEssence: 3, failPercent: 50 },
  { maxTarget: 20, chance: 45, loss: 2, copperFactor: 3, ssrEssence: 8, failPercent: 60 },
  { maxTarget: 29, chance: 65, loss: 1, copperFactor: 3, ssrEssence: 8, failPercent: 60 },
  { maxTarget: 30, chance: 20, loss: 2, copperFactor: 5, ssrEssence: 18, failPercent: 75 },
  { maxTarget: 39, chance: 55, loss: 1, copperFactor: 5, ssrEssence: 20, failPercent: 75 },
  { maxTarget: 40, chance: 8, loss: 3, copperFactor: 8, ssrEssence: 40, failPercent: 100 },
  { maxTarget: 49, chance: 45, loss: 1, copperFactor: 8, ssrEssence: 45, failPercent: 100 },
  { maxTarget: 50, chance: 1, loss: 2, copperFactor: 15, ssrEssence: 120, failPercent: 100 },
] as const;
const essenceFactor: Record<JewelryRarity, number> = { R: .5, SR: .75, SSR: 1 };
export const jewelryCheckpoint = (level: number): JewelryCheckpoint =>
  Math.min(40, Math.floor(level / 10) * 10) as JewelryCheckpoint;

export function jewelryEnhancement(item: JewelryItem) {
  const targetLevel = item.level + 1;
  const rule = JEWELRY_ENHANCEMENT_RULES.find(rule => rule.maxTarget >= targetLevel);
  if (!rule) return undefined;
  const grade = JEWELRY[item.itemId].rarity, rarity = rarityBalance[grade];
  // Older saves have no checkpoint field. The current level proves all prior checkpoints.
  const checkpoint = jewelryCheckpoint(item.level);
  const essence = Math.ceil(rule.ssrEssence * essenceFactor[grade]);
  return { ...rule, targetLevel, checkpoint, failLevel: Math.max(checkpoint, item.level - rule.loss),
    copper: (rarity.copper + rarity.step * item.level) * rule.copperFactor, essence,
    failEssence: Math.ceil(essence * rule.failPercent / 100) };
}

/** Pure resolution. Only the authenticated command supplies the secret-derived roll. */
export function resolveJewelryEnhancement(item: JewelryItem, roll: number): JewelryEnhancementReceipt | undefined {
  const attempt = jewelryEnhancement(item);
  if (!attempt || !Number.isFinite(roll) || roll < 0 || roll >= 1) return undefined;
  const success = roll < attempt.chance / 100;
  const toLevel = success ? attempt.targetLevel : attempt.failLevel;
  return { kind: 'jewelryEnhancement', uid: item.uid, success, fromLevel: item.level, toLevel,
    targetLevel: attempt.targetLevel, highestCheckpoint: jewelryCheckpoint(toLevel), copperSpent: attempt.copper,
    essenceSpent: success ? attempt.essence : attempt.failEssence };
}

export function jewelryStats(item: JewelryItem): JewelryStats {
  const def = JEWELRY[item.itemId];
  const base = slotStats[def.type];
  const scale = rarityBalance[def.rarity].multiplier * (1 + item.level * .018);
  const variation = def.color === 'ice' ? { accuracy: .35, dodge: .35 } :
    def.color === 'purple' ? { crit: .35, dodge: .15 } :
    def.color === 'green' ? { hp: 14, def: 1 } :
    def.color === 'red' ? { hp: 12, crit: .25 } :
    def.color === 'gold' ? { atk: 2, accuracy: .2 } : {};
  const value = (stat: keyof JewelryStats) => (base[stat] + (variation[stat] ?? 0)) * scale;
  const points = (stat: keyof JewelryStats) => Math.round(value(stat) * 100) / 100;
  return { hp: Math.round(value('hp')), atk: Math.round(value('atk')), def: Math.round(value('def')),
    crit: points('crit'), accuracy: points('accuracy'), dodge: points('dodge') };
}

export function normalizeJewelry(raw: unknown, heroes: readonly string[]): JewelryItem[] {
  if (!Array.isArray(raw)) return [];
  const uids = new Set<string>();
  const slots = new Set<string>();
  const result: JewelryItem[] = [];
  for (const item of raw) {
    if (!item || typeof item.uid !== 'string' || !JEWELRY_UID.test(item.uid) || uids.has(item.uid) ||
      typeof item.itemId !== 'string' || !Object.hasOwn(JEWELRY, item.itemId) ||
      !Number.isInteger(item.level) || item.level < 0 || item.level > JEWELRY_MAX_LEVEL) continue;
    uids.add(item.uid);
    const owned = typeof item.heroId === 'string' && Object.hasOwn(HERO_BY_ID, item.heroId) && heroes.includes(item.heroId);
    const slot = owned ? `${item.heroId}:${JEWELRY[item.itemId].type}` : '';
    const heroId = owned && !slots.has(slot) ? item.heroId : undefined;
    if (heroId) slots.add(slot);
    const highestCheckpoint = jewelryCheckpoint(item.level);
    result.push({ uid: item.uid, itemId: item.itemId, level: item.level,
      ...(highestCheckpoint ? { highestCheckpoint } : {}), ...(heroId ? { heroId } : {}) });
  }
  return result;
}

export function jewelryBonus(heroId: string, items?: readonly JewelryItem[]) {
  const equipped = normalizeJewelry(items, [heroId]).filter(item => item.heroId === heroId);
  const stats = equipped.reduce((sum, item) => {
    const bonus = jewelryStats(item);
    return { hp: sum.hp + bonus.hp, atk: sum.atk + bonus.atk, def: sum.def + bonus.def,
      crit: sum.crit + bonus.crit, accuracy: sum.accuracy + bonus.accuracy, dodge: sum.dodge + bonus.dodge };
  }, { ...EMPTY_JEWELRY_STATS });
  const first = equipped[0] && JEWELRY[equipped[0].itemId].setId;
  const activeSet = equipped.length === 2 && first === JEWELRY[equipped[1].itemId].setId ? first : null;
  return { equipped, stats, activeSet };
}

export function equipJewelry(items: JewelryItem[], uid: string, heroId: string, heroes: readonly string[]): boolean {
  const item = items.find(candidate => candidate.uid === uid);
  if (!item || item.heroId === heroId || !heroes.includes(heroId)) return false;
  const slot = JEWELRY[item.itemId].type;
  const replaced = items.find(candidate => candidate.heroId === heroId && JEWELRY[candidate.itemId].type === slot);
  if (replaced) delete replaced.heroId;
  item.heroId = heroId;
  return true;
}

// Milestones award a fixed catalog item once, including to saves that already cleared the stage.
const rewardOrder = [
  'ring_r_blue', 'necklace_r_blue',
  'ring_sr_green', 'necklace_sr_green', 'ring_sr_violet', 'necklace_sr_violet', 'ring_sr_ice', 'necklace_sr_ice',
  'ring_ssr_dragon', 'necklace_ssr_dragon', 'ring_ssr_tiger', 'necklace_ssr_tiger',
  'ring_ssr_phoenix', 'necklace_ssr_phoenix', 'ring_ssr_tortoise', 'necklace_ssr_tortoise',
];
export const JEWELRY_REWARDS = STAGES.map((stage, index) => ({
  stageId: stage.id,
  itemIds: rewardOrder.slice(index, index === STAGES.length - 1 ? undefined : index + 1),
}));
