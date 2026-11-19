import type { FactionId } from '../data/factions';
import type { ForgeWallet } from './forge';
import type { JewelryItem } from './jewelry';
import type { Gear } from './equipment';
import type { Welfare } from './welfare';
import type { CopperDaily } from './copperEconomy';
import type { SummonReward } from './summon';

export type EquipmentRarity = 'R' | 'SR' | 'SSR';
export type Rarity = EquipmentRarity | 'SSS+';
export type HeroRole = 'tank' | 'fighter' | 'ranger' | 'mage' | 'support';

export interface HeroDefinition {
  id: string;
  name: string;
  baseHeroId?: string;
  normalAttackId: string;
  ultimateSkillId: string;
  passiveSkillId: string;
  factionId: FactionId;
  role: HeroRole;
  rarity: Rarity;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  color: number;
  summonable: boolean;
}

export interface CampaignStage {
  id: string;
  chapter: number;
  stage: number;
  name: string;
  enemyCount: number;
  enemyLevel: number;
  goldReward: number;
  goldKeysReward: number;
  trainingReward: number;
}

export interface SaveV1 {
  schemaVersion: 1;
  playerName: string;
  coins: number;
  gems: number;
  goldKeys: number;
  heroes: string[];
  formation: Array<string | null>;
  heroShards: Record<string, number>;
  clearedStages: string[];
  summonPity: number;
  firstTopupDemoClaimed: boolean;
}

export interface SaveV2 extends Omit<SaveV1, 'schemaVersion'> {
  schemaVersion: 2;
  copper?: number;
  copperDaily?: CopperDaily;
  legendaryPity?: number;
  lastSummon?: SummonReward[];
  trainingExp: number;
  heroExp: Record<string, number>;
  welfare?: Welfare;
  forge?: ForgeWallet;
  equipment?: Gear[];
  jewelry?: JewelryItem[];
  jewelryEssence?: number;
  heroStars?: Record<string, number>;
}
