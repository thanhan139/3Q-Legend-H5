import { JEWELRY, jewelryEnhancement, type JewelryItem } from '../src/domain/jewelry';
import { makeArenaBattle, makeStageBattle, type ArenaSquad } from '../src/domain/battle';
import { STAGES } from '../src/data/campaign';
import { HEROES, heroFamily } from '../src/data/heroes';
import { formationPower } from '../src/domain/progression';
import { baseSave } from '../src/domain/store';

const thresholds = [10, 20, 30, 40, 50];
const budgets = [
  { gold: 100_000, essence: 1600 },
  { gold: 1_000_000, essence: 10_000 },
  { gold: 10_000_000, essence: 100_000 },
  { gold: 50_000_000, essence: 500_000 },
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
    gold: exactExpectation(rules, rule => rule.gold),
    essence: exactExpectation(rules, rule => rule.essence * rule.p + rule.failEssence * (1 - rule.p)),
    downgrades: exactExpectation(rules, (rule, level) => rule.failLevel < level ? 1 - rule.p : 0),
    checkpointActivations: exactExpectation(rules, (rule, level) =>
      rule.checkpoint > 0 && level - rule.loss < rule.checkpoint ? 1 - rule.p : 0),
  };
  const metrics = Object.keys(expected) as (keyof typeof expected)[];
  const grade = JEWELRY[itemId].rarity;
  const samples = thresholds.map(() => ({ attempts: [], gold: [], essence: [], downgrades: [], checkpointActivations: [] }) as
    Record<keyof typeof expected, number[]>);
  const successes = budgets.map(() => 0);
  const downgradeHistogram = [0, 0, 0, 0];
  let attemptsTo50 = 0, blockedByCheckpoint = 0;
  for (let n = 0; n < journeys; n++) {
    let level = 0, milestone = 0, essenceRequired = 0;
    const running = { attempts: 0, gold: 0, essence: 0, downgrades: 0, checkpointActivations: 0 };
    while (level < 50) {
      const r = rules[level];
      const win = random() < r.p;
      running.attempts++;
      running.gold += r.gold;
      essenceRequired = Math.max(essenceRequired, running.essence + r.essence);
      running.essence += win ? r.essence : r.failEssence;
      if (win) {
        level++;
        if (level === thresholds[milestone]) {
          for (const metric of metrics) samples[milestone][metric].push(running[metric]);
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
    for (const [i, b] of budgets.entries()) if (running.gold <= b.gold && essenceRequired <= b.essence) successes[i]++;
  }
  return {
    grade, journeys,
    milestones: thresholds.map((level, index) => ({
      level,
      metrics: Object.fromEntries(metrics.map(metric => [metric, {
        ...summary(samples[index][metric]), expected: expected[metric][level],
      }])),
    })),
    downgradeHistogram, checkpointActivationRatePerAttempt: blockedByCheckpoint / attemptsTo50,
    reach50ByBudget: budgets.map((b, i) => ({ ...b, successes: successes[i], probability: successes[i] / journeys })),
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
  const tiers = [undefined, 0, 40, 50];
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
  return { seed, economy: catalog.map((itemId, index) => economy(itemId, journeys, simulationRng(seed + index))),
    combat: combat(simulationRng(seed ^ 0xa3717c3f)) };
}
