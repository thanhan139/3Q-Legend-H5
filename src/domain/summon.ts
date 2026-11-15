import { HEROES, LEGENDARY_PITY_LIMIT, PITY_LIMIT, SUMMON_RATES } from '../data/heroes';
import type { Rarity } from './types';

export interface SummonDraw {
  heroId: string;
  rarity: Rarity;
  pityAfter: number;
  legendaryPityAfter: number;
  guaranteed: boolean;
}

export const DUPLICATE_SHARDS = 10;
export interface SummonReward extends SummonDraw { shards: number }

export function drawSummon(pityBefore: number, rng: () => number = Math.random, legendaryBefore = 0): SummonDraw {
  if (!Number.isInteger(pityBefore) || pityBefore < 0 || pityBefore >= PITY_LIMIT ||
    !Number.isInteger(legendaryBefore) || legendaryBefore < 0 || legendaryBefore >= LEGENDARY_PITY_LIMIT) {
    throw new Error('Invalid summon pity state');
  }
  const roll = rng();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('rng must return [0, 1)');
  const legendary = legendaryBefore + 1 >= LEGENDARY_PITY_LIMIT;
  const guaranteed = legendary || pityBefore + 1 >= PITY_LIMIT;
  const highRate = SUMMON_RATES.SSR + SUMMON_RATES['SSS+'];
  const rarity: Rarity = legendary || (roll >= SUMMON_RATES.SSR && roll < highRate) ? 'SSS+'
    : guaranteed || roll < SUMMON_RATES.SSR ? 'SSR' : roll < highRate + SUMMON_RATES.SR ? 'SR' : 'R';
  const pool = HEROES.filter(hero => hero.summonable && hero.rarity === rarity);
  const pick = rng();
  if (pick < 0 || pick >= 1 || !Number.isFinite(pick)) throw new Error('rng must return [0, 1)');
  const hero = pool[Math.floor(pick * pool.length)];
  if (!hero) throw new Error(`No summon pool for ${rarity}`);
  return { heroId: hero.id, rarity, guaranteed, pityAfter: rarity === 'SSR' || rarity === 'SSS+' ? 0 : pityBefore + 1,
    legendaryPityAfter: rarity === 'SSS+' ? 0 : legendaryBefore + 1 };
}
