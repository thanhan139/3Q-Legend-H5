import { JEWELRY, JEWELRY_ESSENCE_PER_ITEM, JEWELRY_ITEMS, JEWELRY_REWARDS, jewelryEnhancement, type JewelryItem } from '../src/domain/jewelry';
import { makeArenaBattle, makeStageBattle, type ArenaSquad } from '../src/domain/battle';
import { STAGES } from '../src/data/campaign';
import { HEROES, heroFamily } from '../src/data/heroes';
import { formationPower } from '../src/domain/progression';
import { baseSave } from '../src/domain/store';
import { campaignCopper, COPPER_ECONOMY } from '../src/domain/copperEconomy';
import { DAILY_MISSIONS } from '../src/domain/welfare';

const thresholds = [10, 20, 30, 40, 50];
const campaignEssence = JEWELRY_ESSENCE_PER_ITEM * JEWELRY_ITEMS.length;
const goldPerEssence = 100;
const horizons = [1, 7, 30, 90, 180, 365];
const scenarios = [
  { name: 'campaign only, Copper funded', essencePerDay: 0, copperPerDay: null },
  { name: '100/day, Copper funded', essencePerDay: 100, copperPerDay: null },
  { name: '300/day with hypothetical 100k Copper/day', essencePerDay: 300, copperPerDay: 100_000 },
  { name: '999/day limit, Copper funded (upper bound)', essencePerDay: 999, copperPerDay: null },
];
const catalog = ['ring_r_blue', 'ring_sr_green', 'ring_ssr_dragon'];
const uuid = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
const seed = 0xc20a46a1;
function simulationRng(initial: number) {
  let state = initial >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  };
}
function summary(samples: number[]) {
  const ordered = samples.slice().sort((a, b) => a - b);
  const at = (p: number) => ordered[Math.ceil(p * ordered.length) - 1];
  return { mean: samples.reduce((a, b) => a + b, 0) / samples.length, p50: at(.5), p90: at(.9), p99: at(.99) };
}

type Rule = NonNullable<ReturnType<typeof jewelryEnhancement>> & { p: number };
// For first passage to a level, E[i]-E[i+1] = (cost_i + (1-p_i) * (E[fail]-E[i])) / p_i.
// Fail transitions never move upward, so the differences can be solved in a single forward pass.
function exactExpectation(rules: Rule[], reward: (rule: Rule, level: number) => number) {
  const differences: number[] = [];
  const total = [0];
  for (const [i, rule] of rules.entries()) {
    const recovery = differences.slice(rule.failLevel, i).reduce((a, b) => a + b, 0);
    const difference = (reward(rule, i) + (1 - rule.p) * recovery) / rule.p;
    differences.push(difference);
    total.push(total[i] + difference);
  }
  return total;
}

function economy(itemId: string, journeys: number, random: () => number) {
  const rules = Array.from({ length: 50 }, (_, level) => {
    const rule = jewelryEnhancement({ uid: uuid(0), level, itemId })!;
    return { ...rule, p: rule.chance / 100 };
  });
  const expected = {
    attempts: exactExpectation(rules, () => 1),
    copper: exactExpectation(rules, rule => rule.copper),
    essence: exactExpectation(rules, rule => rule.essence * rule.p + rule.failEssence * (1 - rule.p)),
    downgrades: exactExpectation(rules, (rule, level) => rule.failLevel < level ? 1 - rule.p : 0),
    checkpointActivations: exactExpectation(rules, (rule, level) =>
      rule.checkpoint > 0 && level - rule.loss < rule.checkpoint ? 1 - rule.p : 0),
  };
  const metrics = Object.keys(expected) as (keyof typeof expected)[];
  const grade = JEWELRY[itemId].rarity;
  const samples = thresholds.map(() => ({ attempts: [], copper: [], essence: [], downgrades: [], checkpointActivations: [] }) as
    Record<keyof typeof expected, number[]>);
  const daily = thresholds.map(() => scenarios.map(() => [] as number[]));
  const goldAfterCampaign = thresholds.map(() => [] as number[]);
  const downgradeHistogram = [0, 0, 0, 0];
  let attemptsTo50 = 0, blockedByCheckpoint = 0;
  for (let n = 0; n < journeys; n++) {
    let level = 0, milestone = 0, essenceRequired = 0;
    const running = { attempts: 0, copper: 0, essence: 0, downgrades: 0, checkpointActivations: 0 };
    while (level < 50) {
      const r = rules[level];
      const win = random() < r.p;
      running.attempts++;
      running.copper += r.copper;
      essenceRequired = Math.max(essenceRequired, running.essence + r.essence);
      running.essence += win ? r.essence : r.failEssence;
      if (win) {
        level++;
        if (level === thresholds[milestone]) {
          for (const metric of metrics) samples[milestone][metric].push(running[metric]);
          goldAfterCampaign[milestone].push(Math.max(0, running.essence - campaignEssence) * goldPerEssence);
          for (const [i, s] of scenarios.entries()) {
            const need = Math.max(0, essenceRequired - campaignEssence);
            const essenceDays = need === 0 ? 1 : s.essencePerDay ? Math.ceil(need / s.essencePerDay) : Infinity;
            const copperDays = s.copperPerDay ? Math.ceil(running.copper / s.copperPerDay) : 1;
            daily[milestone][i].push(Math.max(essenceDays, copperDays));
          }
          milestone++;
        }
      } else {
        const loss = level - r.failLevel;
        downgradeHistogram[loss]++;
        if (loss) running.downgrades++;
        if (r.checkpoint && level - r.loss < r.checkpoint) running.checkpointActivations++;
        level = r.failLevel;
      }
    }
    attemptsTo50 += running.attempts;
    blockedByCheckpoint += running.checkpointActivations;
  }
  return {
    grade, journeys,
    milestones: thresholds.map((level, index) => ({
      level,
      metrics: Object.fromEntries(metrics.map(metric => [metric, {
        ...summary(samples[index][metric]), expected: expected[metric][level],
      }])),
      goldAllFromShop: { ...summary(samples[index].essence.map(n => n * goldPerEssence)),
        expected: expected.essence[level] * goldPerEssence },
      goldAfterCampaign: summary(goldAfterCampaign[index]),
      timelines: scenarios.map((s,i) => {
        const days = daily[index][i].sort((a,b) => a-b);
        const pct = (p: number) => {
          const value = days[Math.ceil(p*journeys)-1];
          return Number.isFinite(value) ? value : null;
        };
        return { ...s, withinDays: Object.fromEntries(horizons.map(h => [h,days.filter(d => d <= h).length / journeys])),
          daysP50: pct(.5), daysP90: pct(.9), daysP99: pct(.99) };
      }),
    })),
    downgradeHistogram, checkpointActivationRatePerAttempt: blockedByCheckpoint / attemptsTo50,
  };
}

function combat(random: () => number) {
  const lineup = (size: number) => {
    const heroes = [...HEROES], used = new Set<string>(), formation: string[] = [];
    while (formation.length < size) {
      const [hero] = heroes.splice(Math.floor(random() * heroes.length), 1);
      const family = heroFamily(hero.id);
      if (!used.has(family)) { used.add(family); formation.push(hero.id); }
    }
    return {
      formation,
      heroExp: Object.fromEntries(formation.map(id => [id, 100 * Math.floor(random() * 7)])),
      heroStars: Object.fromEntries(formation.map(id => [id, 1 + Math.floor(random() * 3)])),
    };
  };
  const equipped = (base: ArenaSquad, level: number): ArenaSquad => ({
    ...base,
    jewelry: base.formation.flatMap((heroId, i): JewelryItem[] => heroId ? [
      { uid: uuid(i * 2), itemId: 'ring_ssr_dragon', level, heroId },
      { uid: uuid(i * 2 + 1), itemId: 'necklace_ssr_dragon', level, heroId },
    ] : []),
  });
  const count = 600;
  const tiers = [undefined, 0, 30, 40, 50];
  const result = tiers.map(level => ({ level: level ?? null, pveWins: 0, pvpWins: 0, averagePower: 0 }));
  for (let i = 0; i < count; i++) {
    const size = 3 + Math.floor(random() * 4);
    const attack = lineup(size), defense = equipped(lineup(size), 40);
    const stage = STAGES[Math.floor(random() * STAGES.length)];
    for (const [index, level] of tiers.entries()) {
      const squad = level === undefined ? attack : equipped(attack, level);
      const { formation, heroExp, heroStars, jewelry } = squad;
      result[index].pveWins += Number(makeStageBattle(stage, formation, heroExp, heroStars, undefined, 0, jewelry).finish() === 'player');
      result[index].pvpWins += Number(makeArenaBattle(squad, defense).finish() === 'player');
      result[index].averagePower += formationPower({ ...baseSave(), formation, heroExp, heroStars, jewelry: jewelry?.slice() }) / count;
    }
  }
  return { fixtures: count, opponentJewelryLevel: 40, results: result };
}

export function simulate(journeys: number) {
  return { rulesVersion: 3, goldPerEssence, campaignEssence, verifiedDailyMissionEssence: 0, seed,
    economy: catalog.map((itemId, index) => economy(itemId, journeys, simulationRng(seed + index))),
    combat: combat(simulationRng(seed ^ 0xa3717c3f)) };
}

const economyHorizons = [90, 180, 365];
const economyMilestones = [30, 40, 50];
const cohorts = [
  { name: 'Miễn phí', activeDaysPerWeek: 3, clearsEveryActiveDays: 2, replays: 1,
    missions: ['win'], rankedWinEvery: 0, goldReserve: 0 },
  { name: 'Tích cực', activeDaysPerWeek: 6, clearsEveryActiveDays: 1, replays: 3,
    missions: ['win', 'battle', 'upgrade'], rankedWinEvery: 2, goldReserve: 0 },
  { name: 'Chi tiêu cao', activeDaysPerWeek: 7, clearsEveryActiveDays: 1, replays: 3,
    missions: ['win', 'battle', 'upgrade', 'summon'], rankedWinEvery: 1, goldReserve: 12_000_000 },
] as const;

function dailyBudgets(cohort: (typeof cohorts)[number]) {
  let active = 0, unlocked = 0;
  return Array.from({ length: 365 }, (_, index) => {
    if (index % 7 >= cohort.activeDaysPerWeek) return { copper: 0, gold: 0, essence: 0, active: false };
    const turn = active++;
    const first = turn % cohort.clearsEveryActiveDays === 0 ? STAGES[unlocked++] : undefined;
    const last = STAGES[Math.min(Math.max(unlocked - 1, 0), STAGES.length - 1)];
    const missions = cohort.missions.reduce((total, key) => ({
      copper: total.copper + COPPER_ECONOMY.mission[key], gold: total.gold + DAILY_MISSIONS[key].reward.coins,
    }), { copper: 0, gold: 0 });
    const ranked = cohort.rankedWinEvery > 0 && turn % cohort.rankedWinEvery === 0 ? COPPER_ECONOMY.rankedWin : 0;
    const grantedEssence = (JEWELRY_REWARDS.find(reward => reward.stageId === first?.id)?.itemIds.length ?? 0) * JEWELRY_ESSENCE_PER_ITEM;
    return { active: true, essence: grantedEssence,
      copper: missions.copper + ranked + cohort.replays * campaignCopper(last, false) + (first ? campaignCopper(first, true) : 0),
      gold: missions.gold + (first?.goldReward ?? 0) };
  });
}

export function simulateEconomyV14(journeys: number) {
  return { journeysPerCohortAndRarity: journeys, goldPerEssence, seed, horizons: economyHorizons,
    cohorts: cohorts.map((cohort, ci) => {
      const budgets = dailyBudgets(cohort);
      const issued = economyHorizons.map(day => budgets.slice(0, day).reduce((sum, budget) => ({
        copper: sum.copper + budget.copper, gold: sum.gold + budget.gold, essence: sum.essence + budget.essence,
      }), { copper: 0, gold: baseSave().coins + cohort.goldReserve, essence: 0 }));
      return { ...cohort, issued, rarities: catalog.map((itemId, ri) => {
        const random = simulationRng(seed + 10 * ci + ri);
        const rules = Array.from({ length: 50 }, (_, level) => jewelryEnhancement({ uid: uuid(0), level, itemId })!);
        const records = economyHorizons.map(() => ({ copper: [] as number[], gold: [] as number[], attempts: [] as number[],
          reached: economyMilestones.map(() => 0), copperLimitedDays: 0, essenceLimitedDays: 0 }));
        for (let n = 0; n < journeys; n++) {
          let level = 0, highest = 0, attempts = 0, copper = 0, gold = baseSave().coins + cohort.goldReserve, essence = 0;
          let copperSpent = 0, goldSpent = 0, copperLimitedDays = 0, essenceLimitedDays = 0, horizon = 0;
          for (const [index, budget] of budgets.entries()) {
            copper += budget.copper;
            gold += budget.gold;
            essence += budget.essence;
            if (budget.active) {
              let quota = 999;
              while (level < 50) {
                const rule = rules[level];
                if (copper < rule.copper) { copperLimitedDays++; break; }
                const units = Math.max(0, rule.essence - essence);
                if (units > quota || units * goldPerEssence > gold) { essenceLimitedDays++; break; }
                quota -= units;
                gold -= units * goldPerEssence;
                goldSpent += units * goldPerEssence;
                copper -= rule.copper;
                copperSpent += rule.copper;
                attempts++;
                const win = random() * 100 < rule.chance;
                essence += units - (win ? rule.essence : rule.failEssence);
                level = win ? level + 1 : rule.failLevel;
                highest = Math.max(highest, level);
              }
            }
            if (index + 1 === economyHorizons[horizon]) {
              const row = records[horizon++];
              row.copper.push(copperSpent); row.gold.push(goldSpent); row.attempts.push(attempts);
              row.copperLimitedDays += copperLimitedDays; row.essenceLimitedDays += essenceLimitedDays;
              economyMilestones.forEach((milestone, i) => { if (highest >= milestone) row.reached[i]++; });
            }
          }
        }
        return { rarity: JEWELRY[itemId].rarity, results: records.map((data, i) => ({ day: economyHorizons[i],
          reached: Object.fromEntries(economyMilestones.map((level, j) => [level, data.reached[j] / journeys])),
          attempts: summary(data.attempts), copper: summary(data.copper), gold: summary(data.gold),
          averageUnusedCopper: issued[i].copper - summary(data.copper).mean,
          averageCopperLimitedDays: data.copperLimitedDays / journeys, averageEssenceLimitedDays: data.essenceLimitedDays / journeys,
        })) };
      }) };
    }),
  };
}
