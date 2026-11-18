import { FACTION_IDS, FACTION_THRESHOLDS, FactionConfig, type FactionId } from '../data/factions';
import { HERO_BY_ID, SLOT_COUNT, heroFaction, heroFamily } from '../data/heroes';
import type { EquipmentStats } from './equipment';

export function factionSynergy(formation: readonly (string | null)[]) {
  const counts: Record<FactionId, number> = { shu: 0, wei: 0, wu: 0, warlords: 0 };
  const used = new Set<string>();
  for (const id of formation.slice(0, SLOT_COUNT)) {
    if (!id || !Object.hasOwn(HERO_BY_ID, id) || used.has(heroFamily(id))) continue;
    used.add(heroFamily(id));
    counts[heroFaction(HERO_BY_ID[id])]++;
  }
  return FACTION_IDS.map(id => {
    const count = counts[id];
    const tier = [...FACTION_THRESHOLDS].reverse().find(threshold => count >= threshold);
    const next = FACTION_THRESHOLDS.find(threshold => count < threshold);
    const config = FactionConfig[id];
    return { id, count, tier, next, bonus: tier ? config.bonuses[tier] : 0 };
  });
}

export type FactionSynergy = ReturnType<typeof factionSynergy>;

export function applyFactionBonus<T extends EquipmentStats & { criticalChance?: number }>(stats: T, id: FactionId, synergy?: FactionSynergy) {
  const bonus = synergy?.find(entry => entry.id === id)?.bonus ?? 0;
  const { stat } = FactionConfig[id];
  const criticalChance = (stats.criticalChance ?? 0) + (stat === 'criticalChance' ? bonus : 0);
  if (stat === 'criticalChance' || !bonus) return { ...stats, criticalChance };
  return { ...stats, [stat]: Math.round(stats[stat] * (1 + bonus / 100)), criticalChance };
}
