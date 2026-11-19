import { changeInventory, heroShardId, inventoryQuantity, ITEM_IDS, walletBalance } from './resources';
import { campaignCopper, copperDaily, COPPER_ECONOMY, normalizeCopperDaily } from './copperEconomy';
import { isSignature } from '../data/signatureConfig';
import { signatureNextCost, signatureNodes, SIGNATURE_MAX_NODES } from './signatureStars';
import { FORGE, forgeWeek, isForgeWeapon, normalizeForge, weeklyWins } from './forge';
import type { EquipmentId } from '../data/equipmentConfig';
import { advanceMission, CHECK_IN, DAILY_MISSIONS, grantWallet, normalizeWelfare, TOPUP_HERO, TOPUP_REWARD, welfareDay, welfareStatus, type Mission } from './welfare';
import { HERO_BY_ID, HERO_RARITIES, LEGENDARY_PITY_LIMIT, PITY_LIMIT, SLOT_COUNT, heroFamily } from '../data/heroes';
import { HERO_MILESTONES, STAGES, SUMMON_UNLOCK_STAGE } from '../data/campaign';
import { equipJewelry, jewelryEnhancement, resolveJewelryEnhancement, JEWELRY_REWARDS, JEWELRY_UID, JEWELRY_ESSENCE_PER_ITEM, normalizeJewelry } from './jewelry';
import { normalizeShopCounters } from './shop';
import type { SaveV2 } from './types';
import { drawSummon, DUPLICATE_SHARDS, type SummonReward } from './summon';

import { HERO_PROGRESSION, MAX_HERO_EXP, MAX_HERO_STARS, starCost } from './progression';

import { EQUIPMENT, canEnhance, enhanceCost, grantStageGear, normalizeEquipment, gearSlot } from './equipment';

import { localSaveRepository, type SaveRepository } from './saveRepository';
export const baseSave=():SaveV2=>({
  schemaVersion:2, forge: normalizeForge(undefined, []), trainingExp:0, heroExp:{}, playerName:'Chúa Công', coins:5000, gems:300, goldKeys:2,
  heroes:['zhang-fei','guan-yu','liu-bei'],
  formation:['zhang-fei','guan-yu',null,'liu-bei',null,null],
  heroShards:{}, clearedStages:[], summonPity:0, legendaryPity:0, firstTopupDemoClaimed:false
});

const unique=(arr:string[]):string[]=>Array.from(new Set(arr));
export function normalizeSave(data:unknown):SaveV2 {
  if (!data || typeof data !== 'object') return baseSave();
  const raw = data as Partial<Omit<SaveV2, 'schemaVersion'>> & { schemaVersion?: unknown };
  if (raw.schemaVersion !== 1 && raw.schemaVersion !== 2) return baseSave();
  const init = baseSave();
  const heroes=Array.isArray(raw.heroes)?unique(raw.heroes.filter((id):id is string=>typeof id==='string' && Object.hasOwn(HERO_BY_ID,id))):init.heroes;
  const formation:Array<string|null>=Array(SLOT_COUNT).fill(null);
  if (Array.isArray(raw.formation)) {
    const used=new Set<string>();
    raw.formation.slice(0,SLOT_COUNT).forEach((id,i)=>{
      if (typeof id==='string' && heroes.includes(id) && !used.has(heroFamily(id))) {formation[i]=id;used.add(heroFamily(id));}
    });
  } else init.formation.forEach((id,i)=>{if(id && heroes.includes(id))formation[i]=id;});
  const safeNumber=(n:unknown,fallback:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?Math.floor(n):fallback;
  const shards=Object.fromEntries(Object.entries(raw.heroShards??{}).filter(([key,val])=>Object.hasOwn(HERO_BY_ID,key)&&typeof val==='number'&&Number.isFinite(val)&&val>=0).map(([key,val])=>[key,Math.floor(val as number)]));
  const clearedStages = Array.isArray(raw.clearedStages)
    ? unique(raw.clearedStages.filter(id => STAGES.some(stage => stage.id === id))) : [];
  const heroExp = raw.schemaVersion === 2
    ? Object.fromEntries(heroes.filter(id => safeNumber(raw.heroExp?.[id], 0) > 0).map(id => [id, Math.min(MAX_HERO_EXP, safeNumber(raw.heroExp?.[id], 0))]))
    : {};
  const heroStars = Object.fromEntries(heroes.flatMap(id => {
    const stars = Math.min(MAX_HERO_STARS, safeNumber(raw.heroStars?.[id], 1));
    return stars > 1 ? [[id, stars]] : [];
  }));
  const jewelry = normalizeJewelry(raw.jewelry, heroes);
  const shopPurchases = normalizeShopCounters(raw.shopPurchases);
  const jewelryEssence = Math.min(Number.MAX_SAFE_INTEGER, safeNumber(raw.jewelryEssence, 0));
  const equipment = normalizeEquipment(raw.equipment, heroes);
  const copperActivity = normalizeCopperDaily(raw.copperDaily);
  const save: SaveV2 = {
    forge: normalizeForge(raw.forge, clearedStages),
    ...(equipment.length ? { equipment } : {}),
    ...(jewelry.length ? { jewelry } : {}),
    ...(Object.keys(shopPurchases).length ? { shopPurchases } : {}),
    ...(jewelryEssence ? { jewelryEssence } : {}),
    ...(Object.keys(heroStars).length ? { heroStars } : {}),
    ...(raw.welfare ? { welfare: normalizeWelfare(raw.welfare) } : {}),
    schemaVersion: 2,
    ...(raw.copper === undefined ? {} : { copper: safeNumber(raw.copper, 0) }),
    ...(copperActivity ? { copperDaily: copperActivity } : {}),
    trainingExp: raw.schemaVersion === 1
      ? STAGES.reduce((total, stage) => total + (clearedStages.includes(stage.id) ? stage.trainingReward : 0), 0)
      : safeNumber(raw.trainingExp, 0),
    heroExp,
    ...(Array.isArray(raw.lastSummon) && [1, 10].includes(raw.lastSummon.length) &&
      raw.lastSummon.every(draw => draw && Object.hasOwn(HERO_BY_ID, draw.heroId) &&
        HERO_RARITIES.includes(draw.rarity) && [0, DUPLICATE_SHARDS].includes(draw.shards) &&
        Number.isInteger(draw.pityAfter) && draw.pityAfter >= 0 && draw.pityAfter < PITY_LIMIT &&
        typeof draw.guaranteed === 'boolean') ? { lastSummon: raw.lastSummon.map(draw => ({
          heroId: draw.heroId, rarity: draw.rarity, shards: draw.shards, pityAfter: draw.pityAfter,
          guaranteed: draw.guaranteed,
          legendaryPityAfter: Math.min(LEGENDARY_PITY_LIMIT - 1, safeNumber(draw.legendaryPityAfter, 0)),
        })) } : {}),
    playerName:typeof raw.playerName==='string'?raw.playerName.slice(0,24):init.playerName,
    coins:safeNumber(raw.coins,init.coins), gems:safeNumber(raw.gems,init.gems),goldKeys:safeNumber(raw.goldKeys,init.goldKeys),
    heroes, formation, heroShards:shards, clearedStages,
    legendaryPity:Math.min(LEGENDARY_PITY_LIMIT - 1,safeNumber(raw.legendaryPity,0)),
    summonPity:Math.min(PITY_LIMIT - 1,safeNumber(raw.summonPity,0)), firstTopupDemoClaimed:raw.firstTopupDemoClaimed===true
  };
  // Give existing players the equipment from first clears they already earned.
  for (const id of clearedStages) grantStageGear(save, id);
  return save;
}
function load(repository: SaveRepository):SaveV2 {
  try {
    const raw = repository.read();
    if (!raw) return baseSave();
    const data = JSON.parse(raw);
    const save = normalizeSave(data);
    if (data?.schemaVersion === 1) {
      try { repository.write(save); } catch { /* session-only storage */ }
    }
    return save;
  } catch { return baseSave(); }
}

export class GameStore {
  private state: SaveV2;
  private cloud = false;
  private fallback?: SaveRepository;
  private localRevision?: string | null;

  constructor(private readonly repository: SaveRepository, initial?: SaveV2,
    private readonly demo?: boolean) {
    this.state = initial ? structuredClone(initial) : load(repository);
    if (!initial) this.localRevision = this.readLocalRevision();
  }

  useCloudSave(save: SaveV2, fallback?: SaveRepository) {
    this.state = structuredClone(save);
    this.cloud = true;
    this.fallback = fallback;
  }

  useLocalSave() {
    if (this.cloud) {
      this.state = load(this.repository);
      this.localRevision = this.readLocalRevision();
    }
    this.cloud = false;
    this.fallback = undefined;
  }
  get snapshot():SaveV2 {return structuredClone(this.state);}
  private readLocalRevision() {
    try { return this.repository.read(); } catch { return undefined; }
  }
  private commit(next: SaveV2): boolean {
    if (this.cloud && !this.fallback) return false;
    try {
      if (!this.cloud && this.localRevision !== undefined && this.localRevision !== this.repository.read()) return false;
      (this.fallback ?? this.repository).write(next);
      if (!this.cloud && this.localRevision !== undefined) this.localRevision = this.repository.read();
    }
    catch { return false; }
    this.state = next;
    return true;
  }

  claimCheckIn(day = welfareDay()): boolean {
    const next = this.snapshot;
    const { welfare, checkIn } = welfareStatus(next, day);
    if (!checkIn) return false;
    const index = welfare.checkIns % CHECK_IN.length;
    grantWallet(next, CHECK_IN[index]);
    next.welfare = { ...welfare, checkIns: index + 1, checkInDay: day };
    return this.commit(next);
  }

  claimDaily(key: Mission, day = welfareDay(), economyV14 = false): boolean {
    const next = this.snapshot;
    const { welfare, daily, missions } = welfareStatus(next, day);
    if (!missions.includes(key)) return false;
    grantWallet(next, DAILY_MISSIONS[key].reward);
    if (economyV14) grantWallet(next, { copper: COPPER_ECONOMY.mission[key] });
    next.welfare = { ...welfare, daily: { ...daily, claimed: [...daily.claimed, key] } };
    return this.commit(next);
  }

  claimArenaCopper(day: number) {
    const next = this.snapshot;
    const daily = copperDaily(next, day);
    if (daily.day !== day || daily.arenaClaimed) return false;
    next.copperDaily = { ...daily, arenaClaimed: true };
    grantWallet(next, { copper: COPPER_ECONOMY.rankedWin });
    return this.commit(next) && { copper: COPPER_ECONOMY.rankedWin };
  }

  isCleared(id:string):boolean {return this.state.clearedStages.includes(id);}
  isUnlocked(id:string):boolean {
    const index=STAGES.findIndex(stage=>stage.id===id);
    return index===0 || (index>0 && this.isCleared(STAGES[index-1].id));
  }
  isSummonUnlocked():boolean {return this.isCleared(SUMMON_UNLOCK_STAGE);}
  nextStageId():string {return STAGES.find(stage=>!this.isCleared(stage.id))?.id ?? STAGES[STAGES.length-1].id;}
  updateFormation(slot:number,heroId:string|null):boolean {
    if (!Number.isInteger(slot)||slot<0||slot>=SLOT_COUNT)return false;
    if (heroId!==null && !this.state.heroes.includes(heroId))return false;
    const next=this.state.formation.slice();
    if(heroId!==null){const existing=next.findIndex(id => id !== null && heroFamily(id) === heroFamily(heroId));if(existing>=0)next[existing]=null;}
    next[slot] = heroId;
    return this.commit({ ...this.state, formation: next });
  }
  equipJewel(uid: string, heroId: string): boolean {
    const next = this.snapshot;
    next.jewelry = normalizeJewelry(next.jewelry, next.heroes);
    return equipJewelry(next.jewelry, uid, heroId, next.heroes) && this.commit(next);
  }

  unequipJewel(uid: string): boolean {
    const next = this.snapshot;
    next.jewelry = normalizeJewelry(next.jewelry, next.heroes);
    const item = next.jewelry.find(candidate => candidate.uid === uid);
    if (!item?.heroId) return false;
    delete item.heroId;
    return this.commit(next);
  }

  enhanceJewel(uid: string, roll: number) {
    const next = this.snapshot;
    next.jewelry = normalizeJewelry(next.jewelry, next.heroes);
    const item = next.jewelry.find(candidate => candidate.uid === uid);
    if (!item) return false;
    const cost = jewelryEnhancement(item);
    if (!cost || walletBalance(next).copper < cost.copper || inventoryQuantity(next, ITEM_IDS.jewelryEssence) < cost.essence) return false;
    const receipt = resolveJewelryEnhancement(item, roll);
    if (!receipt || !changeInventory(next, ITEM_IDS.jewelryEssence, -receipt.essenceSpent)) return false;
    next.copper = (next.copper ?? 0) - receipt.copperSpent;
    item.level = receipt.toLevel;
    item.highestCheckpoint = receipt.highestCheckpoint;
    return this.commit(next) ? receipt : false;
  }

  claimJewelry(stageId: string, issueUid: () => string): boolean {
    const next = this.snapshot;
    const reward = JEWELRY_REWARDS.find(entry => entry.stageId === stageId);
    if (!reward || !next.clearedStages.includes(stageId)) return false;
    const inventory = normalizeJewelry(next.jewelry, next.heroes);
    const missing = reward.itemIds.filter(id => !inventory.some(item => item.itemId === id));
    if (!missing.length) return false;
    for (const itemId of missing) {
      const uid = issueUid();
      if (!JEWELRY_UID.test(uid) || inventory.some(item => item.uid === uid)) return false;
      inventory.push({ itemId, uid, level: 0 });
    }
    next.jewelry = inventory;
    return changeInventory(next, ITEM_IDS.jewelryEssence, JEWELRY_ESSENCE_PER_ITEM * missing.length) && this.commit(next);
  }

  equipGear(uid: string, heroId: string): boolean {
    const next = this.snapshot;
    const item = next.equipment?.find(candidate => candidate.uid === uid);
    if (!item || item.heroId || !next.heroes.includes(heroId)) return false;
    const slot = gearSlot(item.itemId);
    const replaced = next.equipment?.find(candidate => candidate.heroId === heroId && gearSlot(candidate.itemId) === slot);
    if (replaced) delete replaced.heroId;
    item.heroId = heroId;
    return this.commit(next);
  }

  unequipGear(uid: string): boolean {
    const next = this.snapshot;
    const item = next.equipment?.find(candidate => candidate.uid === uid);
    if (!item?.heroId) return false;
    delete item.heroId;
    return this.commit(next);
  }

  enhanceGear(uid: string, useStone = false): boolean {
    const next = this.snapshot;
    const item = next.equipment?.find(candidate => candidate.uid === uid);
    if (!item || !canEnhance(item)) return false;
    if (useStone) {
      if (EQUIPMENT[item.itemId].rarity !== 'SSR' || !changeInventory(next, ITEM_IDS.enhancementStone, -1)) return false;
    } else {
      const cost = enhanceCost(item);
      if (walletBalance(next).copper < cost) return false;
      next.copper = (next.copper ?? 0) - cost;
    }
    item.level++;
    return this.commit(next);
  }

  forgeWeapon(itemId: EquipmentId, expectedCrafted: number): boolean {
    const next = this.snapshot;
    const wallet = next.forge!;
    if ((!isForgeWeapon(itemId) && !isSignature(itemId)) || wallet.crafted !== expectedCrafted || !changeInventory(next, ITEM_IDS.forgeShard, -FORGE.shardsRequired)) return false;
    const uid = `forge:${++wallet.crafted}`;
    next.equipment = [...(next.equipment ?? []), {
      uid, itemId, level: 1, prestigeSkin: true,
      ...(isSignature(itemId) ? { signatureNodes: 1 } : {}),
    }];
    return this.commit(next);
  }

  upgradeSignature(uid: string, expectedNodes: number): boolean {
    const next = this.snapshot;
    const gear = next.equipment?.find(entry => entry.uid === uid);
    if (!gear || !isSignature(gear.itemId) || !Number.isSafeInteger(expectedNodes)) return false;
    const current = signatureNodes(gear.signatureNodes);
    if (current !== expectedNodes || current >= SIGNATURE_MAX_NODES) return false;
    const cost = signatureNextCost(current);
    if (!cost || !changeInventory(next, ITEM_IDS.forgeShard, -cost)) return false;
    gear.signatureNodes = current + 1;
    return this.commit(next);
  }

  claimPremiumForgeDemo(itemId: EquipmentId): boolean {
    if (!(this.demo ?? import.meta.env?.DEV) || !isForgeWeapon(itemId)) return false;
    const next = this.snapshot;
    const wallet = next.forge!;
    if (wallet.premiumClaimed) return false;
    wallet.premiumClaimed = true;
    changeInventory(next, ITEM_IDS.enhancementStone, FORGE.premiumStones);
    next.equipment = [...(next.equipment ?? []), { uid: 'forge:premium', itemId, level: 1, prestigeSkin: true }];
    return this.commit(next);
  }

  togglePrestigeSkin(uid: string): boolean {
    const next = this.snapshot;
    const item = next.equipment?.find(candidate => candidate.uid === uid);
    if (!item || !isForgeWeapon(item.itemId) || !(next.forge!.crafted || next.forge!.premiumClaimed)) return false;
    if (item.prestigeSkin) delete item.prestigeSkin;
    else item.prestigeSkin = true;
    return this.commit(next);
  }

  upgradeHeroStar(id: string): boolean {
    if (!this.state.heroes.includes(id)) return false;
    const stars = this.state.heroStars?.[id] ?? 1;
    const shards = inventoryQuantity(this.state, heroShardId(id));
    const cost = starCost(stars);
    if (stars >= MAX_HERO_STARS || shards < cost) return false;
    const next = this.snapshot;
    changeInventory(next, heroShardId(id), -cost);
    next.heroStars = { ...next.heroStars, [id]: stars + 1 };
    return this.commit(next);
  }

  upgradeHero(id: string): boolean {
    if (!this.state.heroes.includes(id)) return false;
    const current = this.state.heroExp[id] ?? 0;
    const cost = HERO_PROGRESSION.expPerLevel - current % HERO_PROGRESSION.expPerLevel;
    if (current >= MAX_HERO_EXP || inventoryQuantity(this.state, ITEM_IDS.heroExp) < cost) return false;
    const next = this.snapshot;
    next.heroExp[id] = current + cost;
    changeInventory(next, ITEM_IDS.heroExp, -cost);
    advanceMission(next, 'upgrade');
    return this.commit(next);
  }

  completeStage(stageId:string, outcome?: 'player' | 'enemy', battleId?: string,
    copperRewardDay?: number):{firstClear:boolean;rewards:string[]} {
    const stage=STAGES.find(stage=>stage.id===stageId);
    if(!stage||!this.isUnlocked(stageId))return {firstClear:false,rewards:[]};
    const next = this.snapshot;
    const wallet = next.forge!;
    const rewards: string[] = [];
    if (battleId && wallet.rewardedBattles.includes(battleId)) return { firstClear: false, rewards: [] };
    if (battleId) wallet.rewardedBattles.push(battleId);
    if (outcome) {
      advanceMission(next, 'battle', copperRewardDay);
      if (outcome === 'player') advanceMission(next, 'win', copperRewardDay);
    }
    if (outcome === 'player' && battleId && copperRewardDay !== undefined) {
      const first = !this.isCleared(stageId);
      const daily = copperDaily(next, copperRewardDay);
      if (first || (daily.day === copperRewardDay && daily.campaignReplays < COPPER_ECONOMY.replayDailyLimit)) {
        const copper = campaignCopper(stage, first);
        grantWallet(next, { copper });
        rewards.push(`${copper.toLocaleString('vi-VN')} Đồng`);
        if (!first) next.copperDaily = { ...daily, campaignReplays: daily.campaignReplays + 1 };
      }
    }
    if (outcome === 'enemy' || this.isCleared(stageId)) {
      if (outcome === 'player' && battleId && stageId === FORGE.weekly.stage) {
        const now = Date.now();
        const wins = weeklyWins(wallet, now);
        if (wins >= FORGE.weekly.limit) {
          return { firstClear: false, rewards: this.commit(next) ? rewards : [] };
        }
        wallet.week = { key: forgeWeek(now), count: wins + 1 };
        changeInventory(next, ITEM_IDS.forgeShard, FORGE.weekly.shards);
        rewards.push(`${FORGE.weekly.shards} Mảnh Thần Binh`);
      }
      return { firstClear: false, rewards: outcome && this.commit(next) ? rewards : [] };
    }
    next.clearedStages.push(stageId);
    grantWallet(next, { coins: stage.goldReward, goldKeys: stage.goldKeysReward, trainingExp: stage.trainingReward });
    rewards.push(`${stage.goldReward} vàng`, `${stage.trainingReward} EXP luyện tướng`);
    const shards = FORGE.firstClear[stageId];
    if (shards) {
      changeInventory(next, ITEM_IDS.forgeShard, shards);
      rewards.push(`${shards} Mảnh Thần Binh`);
    }
    if(stage.goldKeysReward)rewards.push(`${stage.goldKeysReward} chìa vàng`);
    const gear = grantStageGear(next, stageId);
    if (gear) rewards.push(gear.name);
    const milestone=HERO_MILESTONES[stageId];
    if(milestone && !next.heroes.includes(milestone)) {
      next.heroes.push(milestone);rewards.push(`Mở tướng ${HERO_BY_ID[milestone].name}`);
    }
    return this.commit(next) ? { firstClear: true, rewards } : { firstClear: false, rewards: [] };
  }
  summon(count: 1 | 10, rng: () => number = Math.random):
    { ok: true; draws: SummonReward[] } | { ok: false; reason: string } {
    if (count !== 1 && count !== 10) return { ok: false, reason: 'Số lượt quay không hợp lệ.' };
    if (!this.isSummonUnlocked()) return { ok: false, reason: 'Vượt ải 1-3 để mở Chiêu Mộ.' };
    if (inventoryQuantity(this.state, ITEM_IDS.goldenKey) < count) return { ok: false, reason: 'Không đủ Chìa Khóa Vàng.' };

    const next = this.snapshot;
    const draws: SummonReward[] = [];
    for (let i = 0; i < count; i++) {
      const draw = drawSummon(next.summonPity, rng, next.legendaryPity);
      next.summonPity = draw.pityAfter;
      next.legendaryPity = draw.legendaryPityAfter;
      const shards = next.heroes.includes(draw.heroId) ? DUPLICATE_SHARDS : 0;
      if (shards) changeInventory(next, heroShardId(draw.heroId), shards);
      else next.heroes.push(draw.heroId);
      draws.push({ ...draw, shards });
    }
    changeInventory(next, ITEM_IDS.goldenKey, -count);
    next.lastSummon = draws;
    advanceMission(next, 'summon');
    if (!this.commit(next)) {
      return { ok: false, reason: 'Không thể lưu lượt quay. Chìa khóa vẫn còn nguyên.' };
    }
    return { ok: true, draws: structuredClone(draws) };
  }
  // Configured one-time demo reward with no purchase or payment.
  claimFirstTopupDemo():boolean {
    if (this.state.firstTopupDemoClaimed || !Object.hasOwn(HERO_BY_ID, TOPUP_HERO)) return false;
    const next = this.snapshot;
    next.firstTopupDemoClaimed = true;
    if (!next.heroes.includes(TOPUP_HERO)) next.heroes.push(TOPUP_HERO);
    else changeInventory(next, heroShardId(TOPUP_HERO), DUPLICATE_SHARDS);
    grantWallet(next, TOPUP_REWARD);
    return this.commit(next);
  }

  resetDemo():void {if (!this.cloud) this.commit(baseSave());}
}
export const gameStore=new GameStore(localSaveRepository);
