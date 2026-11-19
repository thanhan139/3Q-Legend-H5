import { HERO_BY_ID } from '../data/heroes';
import { STAGES } from '../data/campaign';
import { EQUIPMENT, STAGE_GEAR } from '../domain/equipment';
import { normalizeSave } from '../domain/store';
import type { SaveV2 } from '../domain/types';

export function validateLegacy(value: unknown): SaveV2 {
  const invalid = () => { throw new Error('Save cũ không hợp lệ. Dữ liệu trên thiết bị vẫn được giữ.'); };
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > 250_000) return invalid();
  const raw = value as SaveV2;
  const integer = (n: unknown, max: number) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max;
  const knownHero = (id: string) => typeof id === 'string' && Object.hasOwn(HERO_BY_ID, id);
  const stages = raw.clearedStages;
  if (![1, 2].includes(raw.schemaVersion) || typeof raw.playerName !== 'string' ||
    (raw.copper !== undefined && !integer(raw.copper, 10_000_000)) || !integer(raw.coins, 10_000_000) || !integer(raw.gems, 1_000_000) || !integer(raw.goldKeys, 100_000) ||
    (raw.schemaVersion === 2 && !integer(raw.trainingExp, 10_000_000)) ||
    !Array.isArray(raw.heroes) || !raw.heroes.every(knownHero) ||
    !['zhang-fei', 'guan-yu', 'liu-bei'].every(id => raw.heroes.includes(id)) ||
    !Array.isArray(raw.formation) || raw.formation.length !== 6 ||
    !raw.formation.every(id => id === null || raw.heroes.includes(id)) ||
    !Array.isArray(stages) || !STAGES.slice(0, stages.length).every(stage => stages.includes(stage.id)) ||
    new Set(stages).size !== stages.length || stages.length > STAGES.length) return invalid();

  for (const record of [raw.heroShards, raw.heroExp ?? {}, raw.heroStars ?? {}]) {
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
      !Object.entries(record).every(([id, amount]) => knownHero(id) && integer(amount, 10_000_000))) return invalid();
  }
  if (raw.forge && (!integer(raw.forge.shards, 100_000) || !integer(raw.forge.stones, 100_000) ||
    !integer(raw.forge.crafted, 5_000))) return invalid();
  if (raw.equipment && (!Array.isArray(raw.equipment) || raw.equipment.length > 5_050 ||
    raw.equipment.some(item => !item || !Object.hasOwn(EQUIPMENT, item.itemId) || !integer(item.level, 100) ||
      item.level < 1 || typeof item.uid !== 'string' || item.uid.length > 80 ||
      (item.uid.startsWith('campaign:') && (!stages.includes(item.uid.slice(9)) || STAGE_GEAR[item.uid.slice(9)] !== item.itemId)) ||
      (item.heroId !== undefined && !raw.heroes.includes(item.heroId))))) return invalid();

  // Jewelry can only originate in an authenticated server transaction.
  const { jewelry: _jewelry, jewelryEssence: _essence, copperDaily: _copperDaily, ...legacy } = raw;
  const save = normalizeSave(legacy);
  if (raw.formation.some((id, i) => id !== save.formation[i]) ||
    (raw.equipment?.some(item => !save.equipment?.some(kept => kept.uid === item.uid && kept.heroId === item.heroId)))) return invalid();
  const days = [save.welfare?.checkInDay, save.welfare?.daily.day].filter((day): day is number => day !== undefined);
  const today = Math.floor((Date.now() + 7 * 3600000) / 86400000);
  if (days.some(day => day > today + 1)) return invalid();
  // Receipts from the local-only game are never used as cloud idempotency keys.
  if (save.forge) save.forge.rewardedBattles = [];
  return save;
}

export function canonicalJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, nested]) => [key, normalize(nested)]));
    }
    return input;
  };
  return JSON.stringify(normalize(value));
}
