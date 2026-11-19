/**
 * Signature Weapon Star Progression V1 — 5 gold stars × 5 petals.
 * Costs are shared forge shards; the first 50 shards forge the weapon and
 * unlock petal 1. Subsequent upgrades advance the SAME gear instance.
 * All bonuses are public deterministic percentages, never tied to spend.
 */
export const SIGNATURE_STAR_RULES_VERSION = 1 as const;
export const SIGNATURE_MAX_NODES = 25;
export const SIGNATURE_STAR_COSTS = [
  [50, 50, 50, 50, 100],
  [75, 75, 75, 75, 150],
  [100, 100, 100, 100, 200],
  [125, 125, 125, 125, 250],
  [150, 150, 150, 150, 300],
] as const;

export type SignatureBonus = {
  hpPct: number;
  atkPct: number;
  defPct: number;
  skillPct: number;
  teamAuraPct: number;
};

/** End-of-star multipliers. Progress within each star is linear, visible, and monotonic. */
export const SIGNATURE_STAR_BONUSES: readonly SignatureBonus[] = [
  { hpPct: 0, atkPct: 0, defPct: 0, skillPct: 0, teamAuraPct: 0 },
  { hpPct: 12, atkPct: 18, defPct: 10, skillPct: 12, teamAuraPct: 3 },
  { hpPct: 30, atkPct: 40, defPct: 25, skillPct: 25, teamAuraPct: 8 },
  { hpPct: 60, atkPct: 75, defPct: 45, skillPct: 45, teamAuraPct: 15 },
  { hpPct: 105, atkPct: 125, defPct: 70, skillPct: 70, teamAuraPct: 25 },
  { hpPct: 155, atkPct: 190, defPct: 100, skillPct: 110, teamAuraPct: 40 },
];

export const signatureValidNodes = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= SIGNATURE_MAX_NODES;

/** Old owned signature weapons had no star field: credit the paid first petal. */
export const signatureNodes = (value: unknown): number =>
  signatureValidNodes(value) ? value : 1;

export function signatureNextCost(nodes: number): number | undefined {
  if (!Number.isSafeInteger(nodes) || nodes < 0 || nodes >= SIGNATURE_MAX_NODES) return undefined;
  return SIGNATURE_STAR_COSTS[Math.floor(nodes / 5)][nodes % 5];
}

export function signatureSpentThrough(nodes: number): number {
  const count = Number.isSafeInteger(nodes) ? Math.max(0, Math.min(SIGNATURE_MAX_NODES, nodes)) : 0;
  let cost = 0;
  for (let i = 0; i < count; i++) cost += signatureNextCost(i) ?? 0;
  return cost;
}

export function signatureStarBonus(nodes: number): SignatureBonus {
  const n = Number.isSafeInteger(nodes) ? Math.max(0, Math.min(SIGNATURE_MAX_NODES, nodes)) : 0;
  const star = Math.floor(n / 5);
  if (star >= 5) return { ...SIGNATURE_STAR_BONUSES[5] };
  const from = SIGNATURE_STAR_BONUSES[star], to = SIGNATURE_STAR_BONUSES[star + 1];
  const fraction = (n % 5) / 5;
  return {
    hpPct: from.hpPct + (to.hpPct - from.hpPct) * fraction,
    atkPct: from.atkPct + (to.atkPct - from.atkPct) * fraction,
    defPct: from.defPct + (to.defPct - from.defPct) * fraction,
    skillPct: from.skillPct + (to.skillPct - from.skillPct) * fraction,
    teamAuraPct: from.teamAuraPct + (to.teamAuraPct - from.teamAuraPct) * fraction,
  };
}

export const signatureCompletedStars = (nodes: number) =>
  Math.floor(Math.max(0, Math.min(SIGNATURE_MAX_NODES, nodes)) / 5);

export const signatureStarPetals = (nodes: number) =>
  Math.max(0, Math.min(SIGNATURE_MAX_NODES, nodes)) % 5;
