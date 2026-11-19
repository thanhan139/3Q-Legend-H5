import type { SaveV2 } from '../domain/types';
import type { Mission } from '../domain/welfare';
import type { EquipmentId } from '../data/equipmentConfig';
import type { TutorialProgress, TutorialStep } from '../domain/tutorial';
import type { VipSnapshot, VipGiftKind } from '../domain/vip';

export interface CloudSave {
  save: SaveV2;
  revision: string;
  tutorial?: TutorialProgress;
  vip?: VipSnapshot;
}

export interface BattleTicket {
  id: string;
  stageId: string;
  revision: string;
  expiresAt: number;
  signature: string;
}

export type GameCommand =
  | { type: 'vipClaim'; tier: number; kind: VipGiftKind; period: string }
  | { type: 'tutorial'; version: number; step: TutorialStep; action: 'name' | 'next' | 'skip'; name?: string }
  | { type: 'checkIn' | 'firstTopupDemo' }
  | { type: 'daily'; mission: Mission }
  | { type: 'formation'; slot: number; heroId: string | null }
  | { type: 'jewelryEquip'; uid: string; heroId: string }
  | { type: 'jewelryUnequip'; uid: string }
  | { type: 'jewelryEnhance'; uid: string; rulesVersion: 3 }
  | { type: 'jewelryClaim'; stageId: string }
  | { type: 'equip'; uid: string; heroId: string }
  | { type: 'unequip' | 'skin'; uid: string }
  | { type: 'enhance'; uid: string; useStone: true }
  | { type: 'enhance'; uid: string; useStone: false; feeCurrency: 'copper' }
  | { type: 'forge'; itemId: EquipmentId; expectedCrafted: number }
  | { type: 'upgrade' | 'star'; heroId: string }
  | { type: 'summon'; count: 1 | 10 }
  | { type: 'battle'; ticket: BattleTicket };

export type GameIntent =
  | { action: 'load' }
  | { action: 'initialize' }
  | { action: 'import'; legacy: unknown; confirmed: true }
  | { action: 'startBattle'; stageId: string; revision: string }
  | { action: 'command'; command: GameCommand; revision: string; requestId: string };
