/** Provisional 3Q Legend H5 rage balance (not values from any other game).
 * Keep these rules shared by all heroes until skill-specific balance is added.
 * Rage is simulated entirely in the Phaser-independent BattleEngine.
 */
export const RAGE_CONFIG = Object.freeze({
  initial: 0,
  max: 100,
  skillThreshold: 100,
  skillCost: 100,
  normalAttackGain: 30,
  damageTakenGain: 10,
});

export function clampRage(value: number): number {
  return Math.max(0, Math.min(RAGE_CONFIG.max, Math.trunc(value)));
}
