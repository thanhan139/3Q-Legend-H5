import { ATTACK_SKILLS, DEFAULT_KIT, PASSIVE_SKILLS, type Status } from '../data/heroSkills';
import { applyFactionBonus, factionSynergy, type FactionSynergy } from './factionSynergy';
import { HERO_BY_ID, heroFamily, heroFaction } from '../data/heroes';
import { stageOpponents } from '../data/campaign';
import { RAGE_CONFIG, clampRage } from '../data/rageConfig';
import { COMBAT_BALANCE } from '../data/skillCombat';
import { signaturePassive, type Gear } from './equipment';
import { heroStats } from './progression';
import type { CampaignStage, HeroDefinition } from './types';

export type Side = 'player' | 'enemy';
export type BattleActionType = 'normal' | 'skill';
export type RageReason = 'normal-attack' | 'damage-taken' | 'skill-cost' | 'skill-effect';
export type CombatBuff = 'attack' | 'critical';

export interface BattleUnit {
  uid: string;
  heroId: string;
  side: Side;
  slot: number;
  name: string;
  role: HeroDefinition['role'];
  color: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  actions: number;
  nextActionAt: number;
  rage: number;
  skillLocked: boolean;
  shield: number;
  attackBuffActions: number;
  criticalBuffActions: number;
  criticalChance?: number;
  signatureBonus?: number;
  statuses?: Partial<Record<Status, { turns: number; value: number; source: string }>>;
}

/** The Scene replays this ordered stream; BattleEngine alone mutates state.
 * `amount` on damage means actual HP lost; `absorbed` is shield damage.
 * A cast may create multiple damage events and one total event.
 */
export interface BattleEvent {
  kind: 'damage' | 'heal' | 'rage' | 'ko' | 'end' | 'shield' | 'buff' | 'total' | 'status' | 'skip' | 'dodge' | 'action';
  source?: string;
  target?: string;
  amount?: number;
  absorbed?: number;
  remainingHp?: number;
  remainingShield?: number;
  critical?: boolean;
  buff?: CombatBuff;
  status?: Status;
  duration?: number;
  skill?: boolean;
  winner?: Side;
  actionType?: BattleActionType;
  skillId?: string;
  actionId?: number;
  hitIndex?: number;
  hitCount?: number;
  rageBefore?: number;
  rageAfter?: number;
  reason?: RageReason;
}

function createUnit(id: string, side: Side, slot: number, scale = 1, exp = 0, stars = 1, gear?: readonly Gear[], synergy?: FactionSynergy): BattleUnit {
  const hero = HERO_BY_ID[id];
  if (!hero) throw new Error(`Unknown hero: ${id}`);
  const base = heroStats(hero, exp, stars, gear);
  const stats = applyFactionBonus({ ...base, atk: Math.round(base.atk * scale), def: Math.round(base.def * scale) },
    heroFaction(hero), synergy);
  const passive = PASSIVE_SKILLS.get(hero.passiveSkillId);
  const maxHp = Math.round(stats.hp * scale * (1 + (passive?.hp ?? 0)));
  const speed = Math.round(stats.speed * (1 + (passive?.speed ?? 0)));
  return {
    uid: `${side}-${slot}`, heroId: id, side, slot, name: hero.name,
    role: hero.role, color: hero.color, maxHp, hp: maxHp,
    atk: Math.round(stats.atk * (1 + (passive?.atk ?? 0))), def: stats.def, criticalChance: stats.criticalChance, signatureBonus: signaturePassive(gear, id),
    speed, actions: 0, nextActionAt: 100 / speed,
    rage: RAGE_CONFIG.initial, skillLocked: false, shield: 0,
    attackBuffActions: 0, criticalBuffActions: 0,
  };
}

export function makeStageBattle(
  stage: CampaignStage,
  formation: (string | null)[],
  heroExp: Readonly<Record<string, number>> = {},
  heroStars: Readonly<Record<string, number>> = {},
  gear?: readonly Gear[],
): BattleEngine {
  const allySynergy = factionSynergy(formation);
  const allies = formation.slice(0, 6).flatMap((id, slot) =>
    id ? [createUnit(id, 'player', slot, 1, heroExp[id] ?? 0, heroStars[id] ?? 1, gear, allySynergy)] : []);
  const opponents = stageOpponents(stage);
  const enemySynergy = factionSynergy(opponents);
  const enemies = opponents.map((id, index) =>
    createUnit(id, 'enemy', index, 0.63 + (stage.enemyLevel - 1) * 0.085, 0, 1, undefined, enemySynergy));
  return new BattleEngine([...allies, ...enemies]);
}

export interface ArenaSquad {
  formation: (string | null)[];
  heroExp: Readonly<Record<string, number>>;
  heroStars?: Readonly<Record<string, number>>;
  equipment?: readonly Gear[];
}

export function makeArenaBattle(attack: ArenaSquad, defense: ArenaSquad): BattleEngine {
  const units = (['player', 'enemy'] as const).flatMap(side => {
    const squad = side === 'player' ? attack : defense;
    const synergy = factionSynergy(squad.formation);
    return squad.formation.slice(0, 6).flatMap((id, slot) => id
      ? [createUnit(id, side, slot, 1, squad.heroExp[id] ?? 0, squad.heroStars?.[id] ?? 1, squad.equipment, synergy)] : []);
  });
  return new BattleEngine(units);
}

export function makeArenaPracticeBattle(formation: (string | null)[],
  heroExp: Readonly<Record<string, number>>, heroStars: Readonly<Record<string, number>> = {},
  gear?: readonly Gear[]): BattleEngine {
  const squad = { formation, heroExp, heroStars, equipment: gear };
  return makeArenaBattle(squad, squad);
}

/** Deterministic simulation, independent of Phaser, timing, DOM, or LocalStorage. */
export class BattleEngine {
  readonly units: BattleUnit[];
  readonly log: BattleEvent[] = [];
  winner: Side | null = null;
  turn = 0;

  constructor(units: BattleUnit[]) {
    if (!units.some(unit => unit.side === 'player') || !units.some(unit => unit.side === 'enemy'))
      throw new Error('Both teams require at least one hero');
    const family = units.filter(unit => unit.side === 'player').map(unit => heroFamily(unit.heroId));
    if (new Set(family).size !== family.length) throw new Error('Duplicate hero family');
    for (const side of ['player', 'enemy'] as const) {
      const team = units.filter(unit => unit.side === side);
      if (team.length > 6 || new Set(team.map(unit => unit.slot)).size !== team.length)
        throw new Error(`Invalid ${side} formation`);
      if (team.some(unit => unit.slot < 0 || unit.slot >= 6)) throw new Error('Invalid slot');
    }
    this.units = units;
  }

  private living(side: Side): BattleUnit[] {
    return this.units.filter(unit => unit.side === side && unit.hp > 0);
  }

  private targets(attacker: BattleUnit): BattleUnit[] {
    const enemies = this.living(attacker.side === 'player' ? 'enemy' : 'player');
    const front = enemies.filter(unit => unit.slot < 3);
    const pool = front.length ? front : enemies;
    return [...pool].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.slot - b.slot);
  }

  private addShield(unit: BattleUnit, amount: number, events: BattleEvent[], metadata: Partial<BattleEvent>) {
    if (unit.hp <= 0 || amount <= 0) return;
    const cap = Math.round(unit.maxHp * COMBAT_BALANCE.shieldMaxHpFraction);
    const applied = Math.max(0, Math.min(cap - unit.shield, Math.round(amount)));
    if (!applied) return;
    unit.shield += applied;
    events.push({ kind: 'shield', target: unit.uid, amount: applied, remainingShield: unit.shield, ...metadata });
  }

  private giveBuff(unit: BattleUnit, buff: CombatBuff, events: BattleEvent[], metadata: Partial<BattleEvent>) {
    if (unit.hp <= 0) return;
    if (buff === 'attack') unit.attackBuffActions = COMBAT_BALANCE.buffActions;
    else unit.criticalBuffActions = COMBAT_BALANCE.buffActions;
    events.push({ kind: 'buff', target: unit.uid, buff, duration: COMBAT_BALANCE.buffActions, ...metadata });
  }

  private damage(target: BattleUnit, raw: number, events: BattleEvent[], metadata: Partial<BattleEvent>) {
    const absorbed = Math.min(target.shield, raw);
    target.shield -= absorbed;
    const amount = Math.min(target.hp, raw - absorbed);
    target.hp -= amount;
    events.push({ ...metadata, kind: 'damage', target: target.uid, amount, absorbed,
      remainingHp: target.hp, remainingShield: target.shield });
    if (!target.hp) events.push({ kind: 'ko', source: metadata.source, target: target.uid, actionId: this.turn });
    return amount;
  }

  step(): BattleEvent[] {
    if (this.winner) return [];
    const attacker = this.units.filter(unit => unit.hp > 0)
      .sort((a, b) => a.nextActionAt - b.nextActionAt || b.speed - a.speed)[0];
    if (!attacker) throw new Error('No units can act');

    const rageBefore = clampRage(attacker.rage);
    const hero = HERO_BY_ID[attacker.heroId];
    const passive = PASSIVE_SKILLS.get(hero?.passiveSkillId) ?? DEFAULT_KIT.passive;
    const statusAtStart = Object.entries(attacker.statuses ?? {}) as [Status, NonNullable<BattleUnit['statuses']>[Status]][];
    const blocked = Boolean(attacker.statuses?.stun || attacker.statuses?.charm);
    const skill = !blocked && !attacker.skillLocked && rageBefore >= RAGE_CONFIG.skillThreshold;
    const actionType: BattleActionType = skill ? 'skill' : 'normal';
    const id = skill ? hero?.ultimateSkillId : hero?.normalAttackId;
    const move = ATTACK_SKILLS.get(id ?? '') ?? (skill ? DEFAULT_KIT.ultimate : DEFAULT_KIT.normal);
    const ultimateId = attacker.signatureBonus ? `${heroFamily(attacker.heroId)}:ultimate:signature` : id;
    attacker.actions++;
    attacker.nextActionAt += 100 / attacker.speed;
    this.turn++;
    const events: BattleEvent[] = [];
    const attacked = new Set<BattleUnit>();
    const countered = new Set<string>();
    let totalDamage = 0;
    let damageEvents = 0;
    const hadAttackBuff = attacker.attackBuffActions > 0;
    const hadCriticalBuff = attacker.criticalBuffActions > 0;
    const effectiveAtk = attacker.atk * (1 + (hadAttackBuff ? COMBAT_BALANCE.attackBuffBonus : 0))
      * (1 - (attacker.statuses?.weaken?.value ?? 0));
    const bleed = attacker.statuses?.bleed;
    if (bleed) this.damage(attacker, bleed.value, events, { source: bleed.source, actionId: this.turn });
    if (attacker.hp > 0 && blocked) events.push({ kind: 'skip', source: attacker.uid, target: attacker.uid,
      status: attacker.statuses?.stun ? 'stun' : 'charm', actionId: this.turn });
    const acts = attacker.hp > 0 && !blocked;
    if (acts) attacker.rage = clampRage(rageBefore + (skill ? -RAGE_CONFIG.skillCost : RAGE_CONFIG.normalAttackGain));
    const rageAfter = attacker.rage;
    const metadata: Partial<BattleEvent> = {
      source: attacker.uid, skill, actionType, actionId: this.turn,
      skillId: skill ? ultimateId : id, rageBefore, rageAfter,
    };
    if (acts) events.push({ ...metadata, kind: 'action' });
    if (rageBefore !== rageAfter) events.push({ kind: 'rage', source: attacker.uid, target: attacker.uid,
      rageBefore, rageAfter, reason: skill ? 'skill-cost' : 'normal-attack', actionId: this.turn });

    let rolls = 0;
    const chance = (percent: number, target: BattleUnit) =>
      ((attacker.actions * 37 + attacker.slot * 19 + target.slot * 13 + ++rolls * 23) % 100) < percent;
    const changeRage = (target: BattleUnit, amount: number) => {
      const before = target.rage;
      target.rage = clampRage(before + amount);
      if (before !== target.rage) events.push({ ...metadata, kind: 'rage', target: target.uid,
        rageBefore: before, rageAfter: target.rage, reason: 'skill-effect' });
    };
    const heal = (target: BattleUnit, amount: number) => {
      const healed = Math.min(target.maxHp - target.hp, Math.round(amount));
      target.hp += healed;
      events.push({ ...metadata, kind: 'heal', target: target.uid, amount: healed, remainingHp: target.hp });
    };
    const strike = (target: BattleUnit, multiplier: number, hitIndex: number, hitCount: number) => {
      const defender = PASSIVE_SKILLS.get(HERO_BY_ID[target.heroId]?.passiveSkillId);
      const dodged = defender?.dodge ? chance(defender.dodge, target) : false;
      if (dodged) events.push({ ...metadata, kind: 'dodge', target: target.uid, hitIndex, hitCount });
      else {
        // Keep the existing critical roll stable for deterministic playback.
        const roll = (attacker.actions * 17 + attacker.slot * 13 + target.slot * 7 + hitIndex * 11) % 100;
        const critical = roll < (COMBAT_BALANCE.criticalBaseChance + (attacker.criticalChance ?? 0) +
          (passive.crit ?? 0) + (move.crit ?? 0) + (hadCriticalBuff ? COMBAT_BALANCE.criticalBuffBonus : 0));
        const pierce = move.pierce && chance(move.pierceChance ?? 100, target) ? move.pierce : 0;
        const def = target.def * (1 - (target.statuses?.armor?.value ?? 0)) * (1 - pierce);
        const surge = move.surge && chance(move.surge, target) ? 1.1 : 1;
        const charm = target.statuses?.charm ? 1 + (passive.charmDamage ?? 0) : 1;
        const signature = skill ? 1 + (attacker.signatureBonus ?? 0) : 1;
        const raw = Math.max(20, Math.round((effectiveAtk * multiplier * signature * surge * charm - def * .52) *
          (critical ? COMBAT_BALANCE.criticalDamageMultiplier + (passive.critDamage ?? 0) : 1)));
        const lost = this.damage(target, raw, events, { ...metadata, critical, hitIndex, hitCount });
        totalDamage += lost;
        damageEvents++;
        if (lost && target.hp > 0) attacked.add(target);
        if (!target.hp && passive.killRage) changeRage(attacker, passive.killRage);
        if (lost && passive.lifestealBelowHalf && attacker.hp < attacker.maxHp / 2)
          heal(attacker, lost * passive.lifestealBelowHalf);
      }
      if (defender?.counter && target.hp > 0 && !target.statuses?.stun && !target.statuses?.charm &&
        !countered.has(target.uid) && (defender.counterOnDodge ? dodged : !dodged && chance(defender.counterChance ?? 100, target))) {
        countered.add(target.uid);
        this.damage(attacker, Math.max(20, Math.round(target.atk * defender.counter - attacker.def * .52)),
          events, { source: target.uid, actionId: this.turn });
      }
      return !dodged;
    };

    if (acts) {
      const enemies = this.living(attacker.side === 'player' ? 'enemy' : 'player');
      const front = this.targets(attacker);
      const focus = enemies.find(unit => unit.statuses?.taunt) ?? front[0];
      const allies = this.living(attacker.side).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.slot - b.slot);
      const targetGroups = { single: focus ? [focus] : [], front, all: enemies,
        column: enemies.filter(unit => focus && unit.slot % 3 === focus.slot % 3),
        weakest: allies.slice(0, 1), party: allies, self: [attacker] };
      const targets = move.target === 'weakest' ? allies.slice(0, move.limit ?? 1) :
        targetGroups[move.target].slice(0, move.limit);
      const hits = move.hits ?? 1;
      const landed = new Set<BattleUnit>();
      if (move.power) {
        for (const [index, target] of targets.entries()) {
          const count = hits + (move.combo && chance(move.combo, target) ? 1 : 0);
          for (let hit = 1; hit <= count && target.hp > 0 && attacker.hp > 0; hit++) {
            if (strike(target, move.power, count > 1 ? hit : index + 1, count > 1 ? count : targets.length)) landed.add(target);
          }
          if (move.repeatOnKill && !target.hp && attacker.hp > 0) {
            const next = this.targets(attacker)[0];
            if (next) strike(next, move.power, 2, 2);
          }
        }
      }
      for (const effect of move.effects ?? []) {
        if (!attacker.hp) break;
        const recipients = effect.target === 'secondWeakest' ? allies.slice(1, 2) : effect.target && effect.target !== 'hit'
          ? targetGroups[effect.target] : effect.kind === 'charm' && move.target === 'party'
            ? enemies.slice(0, 2) : move.power ? [...landed] : targets;
        for (const target of recipients) {
          const control = effect.kind === 'stun' || effect.kind === 'charm';
          if (target.hp <= 0 || (effect.chance !== undefined && !chance(effect.chance + (control ? passive.control ?? 0 : 0), target))) continue;
          const value = effect.value ?? 0;
          if (effect.kind === 'rage') changeRage(target, value);
          else if (effect.kind === 'heal') {
            const teamHeal = Math.max(0, ...allies.filter(ally => ally.hp > 0).map(ally =>
              PASSIVE_SKILLS.get(HERO_BY_ID[ally.heroId]?.passiveSkillId)?.teamHeal ?? 0));
            heal(target, (effect.target === 'party' ? target.maxHp : effectiveAtk) * value * (1 + (passive.heal ?? 0) + teamHeal));
          } else if (effect.kind === 'shield') this.addShield(target, effectiveAtk * value, events, metadata);
          else if (effect.kind === 'attack' || effect.kind === 'critical') this.giveBuff(target, effect.kind, events, metadata);
          else if (effect.kind === 'cleanse') {
            const adverse = (['stun', 'charm', 'armor', 'weaken', 'bleed'] as const).find(key => target.statuses?.[key]);
            if (adverse && target.statuses) delete target.statuses[adverse];
          } else {
            const duration = effect.turns ?? 1;
            (target.statuses ??= {})[effect.kind] = {
              turns: duration, value: effect.kind === 'bleed' ? Math.round(effectiveAtk * value) : value, source: attacker.uid,
            };
            events.push({ ...metadata, kind: 'status', target: target.uid, status: effect.kind, duration });
          }
        }
      }
    }

    // Defender rage is awarded once per action, not once per AoE target hit or multi-hit.
    for (const target of attacked) {
      if (!target.hp) continue;
      const before = clampRage(target.rage);
      target.rage = clampRage(before + RAGE_CONFIG.damageTakenGain);
      if (target.rage !== before) events.push({ kind: 'rage', source: attacker.uid, target: target.uid,
        rageBefore: before, rageAfter: target.rage, reason: 'damage-taken', actionId: this.turn });
    }
    if (skill && damageEvents) events.push({ kind: 'total', amount: totalDamage, ...metadata });

    for (const [key, state] of statusAtStart) {
      if (state && attacker.statuses?.[key] === state && --state.turns <= 0) delete attacker.statuses[key];
    }
    if (hadAttackBuff && attacker.attackBuffActions > 0) attacker.attackBuffActions -= 1;
    if (hadCriticalBuff && attacker.criticalBuffActions > 0) attacker.criticalBuffActions -= 1;
    if (this.living('enemy').length === 0) this.winner = 'player';
    if (this.living('player').length === 0) this.winner = 'enemy';
    if (!this.winner && this.turn >= 500) {
      const percent = (side: Side) => this.living(side).reduce((sum, unit) => sum + unit.hp / unit.maxHp, 0);
      this.winner = percent('player') >= percent('enemy') ? 'player' : 'enemy';
    }
    if (this.winner) events.push({ kind: 'end', winner: this.winner, actionId: this.turn });
    this.log.push(...events);
    return events;
  }

  finish(maxSteps = 500): Side {
    for (let i = 0; i < maxSteps && !this.winner; i++) this.step();
    if (!this.winner) throw new Error('Battle did not finish');
    return this.winner;
  }
}
