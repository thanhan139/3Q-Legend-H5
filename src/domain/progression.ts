import { HERO_BY_ID, heroFaction } from '../data/heroes';
import { applyFactionBonus, factionSynergy } from './factionSynergy';
import { COMBAT_BALANCE } from '../data/skillCombat';
import { equipmentBonus, type Gear, type EquipmentStats } from './equipment';
import type { HeroDefinition, SaveV2 } from './types';
import { jewelryBonus, JEWELRY_SETS, type JewelryItem } from './jewelry';
import { vipBonuses } from './vip';

export const HERO_PROGRESSION = {
  maxLevel: 15,
  expPerLevel: 100,
  hpGrowth: 0.09,
  atkGrowth: 0.09,
  defGrowth: 0.09,
  speedGrowth: 0.025,
} as const;

export const MAX_HERO_EXP = (HERO_PROGRESSION.maxLevel - 1) * HERO_PROGRESSION.expPerLevel;

export function heroLevel(exp = 0): number {
  return 1 + Math.floor(Math.min(MAX_HERO_EXP, Math.max(0, exp)) / HERO_PROGRESSION.expPerLevel);
}

export const MAX_HERO_STARS = 5;
export const starCost = (stars: number) => stars * 20;

interface HeroStats extends EquipmentStats {
  level: number;
  criticalChance?: number;
  accuracy?: number;
  dodge?: number;
}

export function heroStats(hero: HeroDefinition, exp = 0, stars = 1, gear?: readonly Gear[], jewelry?: readonly JewelryItem[]): HeroStats {
  const equipped = equipmentBonus(gear, hero.id);
  const bonus = 1 + (stars - 1) * 0.08;
  const level = heroLevel(exp);
  const growth = level - 1;
  const base = {
    level,
    hp: Math.round(hero.hp * (1 + growth * HERO_PROGRESSION.hpGrowth) * bonus) + equipped.hp,
    atk: Math.round(hero.atk * (1 + growth * HERO_PROGRESSION.atkGrowth) * bonus) + equipped.atk,
    def: Math.round(hero.def * (1 + growth * HERO_PROGRESSION.defGrowth) * bonus) + equipped.def,
    speed: Math.round(hero.speed * (1 + growth * HERO_PROGRESSION.speedGrowth)) + equipped.speed,
  };
  const { stats, activeSet, equipped: jewelryEquipped } = jewelryBonus(hero.id, jewelry);
  if (!jewelryEquipped.length) return base;
  const set = activeSet ? JEWELRY_SETS[activeSet] : undefined;
  return { ...base,
    hp: Math.round((base.hp + stats.hp) * (1 + (set?.hp ?? 0) / 100)),
    atk: Math.round((base.atk + stats.atk) * (1 + (set?.atk ?? 0) / 100)),
    def: Math.round((base.def + stats.def) * (1 + (set?.def ?? 0) / 100)),
    criticalChance: stats.crit, accuracy: stats.accuracy, dodge: stats.dodge,
  };
}

export const combatPower = ({ hp, atk, def, speed, criticalChance = 0, accuracy = 0, dodge = 0 }: EquipmentStats &
  { criticalChance?: number; accuracy?: number; dodge?: number }) =>
  Math.round(hp / 5 + atk * 3 * (1 + criticalChance / 100 * (COMBAT_BALANCE.criticalDamageMultiplier - 1)) + def * 2 + speed +
    atk * 3 * accuracy / 100 + hp / 5 * dodge / 100);


export function formationPower(save: SaveV2, synergy = factionSynergy(save.formation), vip = 0) {
  return save.formation.reduce((total, id) => {
    if (!id) return total;
    const hero = HERO_BY_ID[id];
    const stats = heroStats(hero, save.heroExp[id], save.heroStars?.[id], save.equipment, save.jewelry);
    const faction = applyFactionBonus(stats, heroFaction(hero), synergy), bonus = vipBonuses(vip);
    return total + combatPower({...faction, hp: Math.round(faction.hp*(1+bonus.hpPct/100)),
      atk:Math.round(faction.atk*(1+bonus.atkPct/100)),def:Math.round(faction.def*(1+bonus.defPct/100)),
      criticalChance:(faction.criticalChance??0)+bonus.critRatePoints});
  }, 0);
}
