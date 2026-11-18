import { walletBalance, inventoryQuantity, ITEM_IDS } from '../domain/resources';
import type { GameCommand } from '../cloud/gameProtocol';
import { isSignature } from '../data/signatureConfig';
import { FactionConfig } from '../data/factions';
import { heroFaction } from '../data/heroes';
import { isForgeWeapon } from '../domain/forge';
import { HERO_BY_ID } from '../data/heroes';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { sampleTexture } from '../data/battleLayout';
import {
  EQUIPMENT, EQUIPMENT_SLOTS, canEnhance, enhancement, enhanceCost, gearRarity, gearStats, queryGear,
  type EquipmentSlot, type Gear, type GearQuery,
} from '../domain/equipment';
import { combatPower, heroStats } from '../domain/progression';
import { gameStore } from '../domain/store';
import { cloudRepository } from '../cloud/cloudRepository';
import { heroNavigation } from '../ui/heroNavigation';
import { HeroAnimationController, heroAnimationTexture } from '../ui/HeroAnimationController';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { UiScene } from '../ui/UiScene';
import {loadEquipmentThemes,drawEquipmentTheme} from '../ui/equipmentThemeView';
import {equipmentHeroModel} from '../ui/equipmentHeroModel';

interface EquipmentView {
  heroId?: string;
  bag?: boolean;
  slot?: EquipmentSlot;
  uid?: string;
  enhanced?: boolean;
  query?: GearQuery;
  page?: number;
}

const INK = 0x351c22;
const GOLD = 0xe5b570;
const STATS = { hp: 'HP', atk: 'ATK', def: 'DEF', speed: 'SPD' } as const;
const statKeys = Object.keys(STATS) as (keyof typeof STATS)[];
const number = (value: number) => value.toLocaleString('vi-VN');
const slots = Object.keys(EQUIPMENT_SLOTS) as EquipmentSlot[];
const SORT_LABEL = { rarity: 'Phẩm', slot: 'Loại', enhancement: 'Cường hóa', ...STATS };
const sortOptions = Object.keys(SORT_LABEL) as NonNullable<GearQuery['sort']>[];
const cycle = <T,>(options: readonly T[], current: T): T => options[(options.indexOf(current) + 1) % options.length];

export class EquipmentScene extends UiScene {
  constructor() { super('Equipment'); }

  private changing = false;
  private selectedHeroId?:string;
  preload(){
    const data = (this.sys.settings.data ?? {}) as EquipmentView;
    loadEquipmentThemes(this, heroNavigation.candidate(gameStore.snapshot, cloudRepository.uid ?? 'local-ui', data.heroId));
  }

  create({ heroId, bag = false, slot, uid, enhanced = false, query = {}, page = 0 }: EquipmentView = {}) {
    this.changing = false;
    this.data.remove('equipmentHeroView');
    const save = gameStore.snapshot;
    const items = (save.equipment ?? []).filter(item => !isSignature(item.itemId));
    const resolvedHeroId = heroNavigation.resolve(save, cloudRepository.uid ?? 'local-ui', heroId, 'equipment');
    const model=equipmentHeroModel(save,resolvedHeroId,uid);
    const switchingHero=this.selectedHeroId!==undefined&&this.selectedHeroId!==model?.selectedHeroId;
    if(switchingHero)uid=undefined;
    this.selectedHeroId=model?.selectedHeroId;
    const selectedHero=this.selectedHeroId;
    if (bag && selectedHero) {
      this.renderBagOverlay(selectedHero, items, { heroId: selectedHero, bag, slot, uid, enhanced, query, page });
      return;
    }
    if(!bag&&selectedHero){
      drawEquipmentTheme(this,selectedHero,id=>{
        if(this.changing)return;this.changing=true;
        this.scene.restart({heroId:id,bag:false,uid:undefined,slot:undefined});
      },(selectedSlot,selectedUid)=>{
        if(this.changing)return;this.changing=true;
        this.scene.restart({heroId:this.selectedHeroId,bag:true,query:{slot:selectedSlot},uid:selectedUid});
      });return;
    }
    const hero = selectedHero ? HERO_BY_ID[selectedHero] : undefined;
    const ownGear = selectedHero ? items.filter(item => item.heroId === selectedHero) : [];
    const results = queryGear(items, bag ? query : { slot });
    const pageSize = bag ? 12 : 8;
    const lastPage = Math.max(0, Math.ceil(results.length / pageSize) - 1);
    const selectedIndex = results.findIndex(item => item.uid === uid);
    const currentPage = selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) : Math.min(lastPage, Math.max(0, page));
    const visible = results.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const selected = results[selectedIndex] ?? visible.find(item=>item.heroId===selectedHero) ?? visible.find(item=>!item.heroId);
    const restart = (changes: EquipmentView) => {
      if (this.changing) return;
      this.changing = true;
      const switching=changes.heroId!==undefined&&changes.heroId!==selectedHero;
      this.scene.restart({ heroId: selectedHero, bag, slot, query, page: currentPage, uid: selected?.uid, ...changes,
        ...(switching?{uid:undefined,slot:undefined,page:0}:{}), });
    };

    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x251320, 0.56);
    this.frame(640, 46, 1244, 64, 0x5c2624);
    this.action(88, 46, 112, '‹ Quay lại', () => this.go(bag ? 'Inventory' : 'Heroes', { heroId: selectedHero }));
    this.text(163, 27, bag ? 'Túi Đồ  ·  Trang Bị' : 'Trang Bị Võ Tướng', 30, '#ffe0a0',
      { fontFamily: 'Georgia, serif', fontStyle: 'bold' });
    this.action(779, 46, 174, `Lò Rèn · ${save.forge?.shards ?? 0}`, () => this.go('Forge'));
    this.text(1230, 46, `Vàng  ${number(walletBalance(save).gold)}`, 21, '#ffe0a0').setOrigin(1, 0.5);
    this.action(985, 46, 175, bag ? 'Võ Tướng' : 'Túi Trang Bị', () => restart({ bag: !bag, slot: undefined, uid: undefined, page: 0 }));
    this.frame(214, 387, 386, 582, 0x351c22, GOLD, 0.66);
    this.frame(628, 387, 414, 582);
    this.frame(1054, 387, 414, 582);

    if (hero) {
      const stats = heroStats(hero, save.heroExp[hero.id], save.heroStars?.[hero.id], save.equipment);
      this.text(214, 133, hero.name, 30, '#ffe1a8', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
      this.text(214, 173, `${FactionConfig[heroFaction(hero)].name}   ·   ${hero.rarity}   ·   Lv ${stats.level}`, 16, '#e3c098').setOrigin(0.5);
      this.add.ellipse(214, 477, 240, 42, 0x140e17, 0.72).setStrokeStyle(2, GOLD, 0.64);
      const atlas = heroAnimationTexture(hero.id);
      const pose = sampleTexture(hero.id);
      const animated = this.textures.exists(atlas);
      const hasPose = this.textures.exists(pose);
      const sprite = this.add.sprite(214, 479, animated ? atlas : hasPose ? pose : BATTLE_SPRITES,
        animated ? 0 : hasPose ? undefined : battleSpriteFrames.get(hero.id)).setOrigin(0.5, 1).setDisplaySize(300, 300);
      if (animated) new HeroAnimationController(sprite, hero.id);
      // Static fallback retains its anatomy; no independent scaleY breathing.
      this.frame(214, 519, 276, 40, 0x672b20);
      this.text(214, 519, `Lực chiến  ${number(combatPower(stats))}`, 22, '#ffdd88',
        { fontStyle: 'bold' }).setOrigin(0.5);
      statKeys.forEach((key, index) => this.text(116 + index % 2 * 196, 554 + Math.floor(index / 2) * 32,
        `${STATS[key]}  ${number(stats[key])}`, 18, '#ffe7bf').setOrigin(0.5));
      const index = save.heroes.indexOf(hero.id);
      this.action(214, 634, 230, 'Đổi tướng  ›', () => restart({
        heroId: save.heroes[(index + 1) % save.heroes.length], slot: undefined,
      }), save.heroes.length > 1);
    }

    if (!bag) {
      this.text(628, 122, 'Ô TRANG BỊ', 21, '#ffd892', { fontStyle: 'bold' }).setOrigin(0.5);
      slots.forEach((key, index) => {
        const item = ownGear.find(candidate => EQUIPMENT[candidate.itemId].slot === key);
        const x = 500 + index % 3 * 128;
        const y = 201 + Math.floor(index / 3) * 131;
        this.tile(x, y, item, slot === key, () => restart({ slot: key, uid: item?.uid, page: 0 }));
        this.text(x, y + 55, EQUIPMENT_SLOTS[key], 16, '#eec99a').setOrigin(0.5);
      });
      this.action(628, 407, 230, slot ? `${EQUIPMENT_SLOTS[slot]}  ·  Xem tất cả` : 'Trang bị trong túi', () =>
        restart({ slot: undefined, uid: undefined, page: 0 }), Boolean(slot));
    } else {
      this.text(628, 121, `KHO TRANG BỊ  ·  ${results.length}/${items.length}`, 20, '#ffd892',
        { fontStyle: 'bold' }).setOrigin(0.5);
      const filter = (change: GearQuery) => restart({ query: { ...query, ...change }, uid: undefined, page: 0 });
      this.action(522, 169, 184, `Phẩm: ${query.rarity ?? 'Tất cả'}  ›`, () =>
        filter({ rarity: cycle([undefined, 'R', 'SR', 'SSR'], query.rarity) }));
      this.action(725, 169, 194, `Loại: ${query.slot ? EQUIPMENT_SLOTS[query.slot] : 'Tất cả'}  ›`, () =>
        filter({ slot: cycle([undefined, ...slots], query.slot) }));
      this.action(488, 219, 113, `Chỉ số: ${query.stat ? STATS[query.stat] : 'Tất cả'}`, () =>
        filter({ stat: cycle([undefined, ...statKeys], query.stat) }));
      this.action(613, 219, 128, `Cấp: ${query.minimum ? '≥ +' + query.minimum : 'Tất cả'}`, () =>
        filter({ minimum: cycle([0, 5, 10, 15], query.minimum ?? 0) }));
      this.action(753, 219, 134, `Xếp: ${SORT_LABEL[query.sort ?? 'rarity']}`, () =>
        filter({ sort: cycle(sortOptions, query.sort ?? 'rarity') }));
    }

    const cols = 4;
    visible.forEach((item, index) => {
      const x = 478 + index % cols * 100;
      const y = (bag ? 304 : 481) + Math.floor(index / cols) * 93;
      this.tile(x, y, item, item.uid === selected?.uid, () => restart({ uid: item.uid }), 79);
    });
    if (lastPage > 0) {
      this.action(493, 639, 106, '‹ Trước', () => restart({ page: currentPage - 1, uid: undefined }), currentPage > 0);
      this.text(628, 639, `${currentPage + 1} / ${lastPage + 1}`, 17).setOrigin(0.5);
      this.action(763, 639, 106, 'Sau ›', () => restart({ page: currentPage + 1, uid: undefined }), currentPage < lastPage);
    }
    if (!visible.length) {
      this.text(628, bag ? 285 : 510, items.length ? (bag ? 'Không có trang bị phù hợp.' : 'Chưa có vật phẩm cho ô này.') : 'Vượt ải 1-1 để nhận Hổ Vệ Giáp.',
        18, '#ecd0aa').setOrigin(0.5);
      if (!items.length) this.action(628, bag ? 353 : 570, 205, 'Đến Chinh Chiến', () => this.go('Campaign'));
    }
    if (!selected) {
      this.text(1054, 162, 'THUỘC TÍNH TRANG BỊ', 21, '#ffe1a8').setOrigin(0.5);
      return;
    }

    const definition = EQUIPMENT[selected.itemId];
    const style = gearRarity(selected);
    const capped = !canEnhance(selected);
    const cost = enhanceCost(selected);
    const current = gearStats(selected);
    const preview = gearStats({ ...selected, level: selected.level + 1 });
    const color = style.metal;
    this.text(1054, 132, definition.name, 26, '#ffe0a0', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.tile(1054, 243, selected, true, undefined, 153);
    if (ownGear.some(item => item.prestigeSkin)) {
      const aura = this.add.ellipse(214, 477, 254, 52).setStrokeStyle(3, 0xffae47, 0.8);
      this.tweens.add({ targets: aura, scale: 1.12, alpha: 0.38, yoyo: true, repeat: -1, duration: 850 });
    }
    if (selected.prestigeSkin) {
      for (let i = 0; i < 3; i++) {
        const spark = this.add.star(1007 + i * 46, 263 - i * 19, 4, 2, 8, 0xffde94);
        this.tweens.add({ targets: spark, y: spark.y - 23, alpha: 0, scale: 0.35,
          delay: i * 170, duration: 760, repeatDelay: 380, repeat: -1 });
      }
    }
    if (save.forge?.crafted || save.forge?.premiumClaimed) {
      if (isForgeWeapon(selected.itemId)) this.action(1175, 263, 104, selected.prestigeSkin ? 'Tắt skin' : 'Bật skin',
        () => doAction({ type: 'skin', uid: selected.uid }, () => gameStore.togglePrestigeSkin(selected.uid)));
    }
    this.text(1054, 342, `${definition.rarity}  ·  ${EQUIPMENT_SLOTS[definition.slot]}  ·  +${enhancement(selected)} / +${style.cap}`,
      18, '#ffdfa2').setOrigin(0.5);
    const owner = selected.heroId ? HERO_BY_ID[selected.heroId]?.name : undefined;
    this.text(1054, 372, owner ? `Đang dùng · ${owner}` : 'Đang trong túi', 16, '#ebbd99').setOrigin(0.5);
    this.frame(1054, 447, 354, 109, 0x653a2c);
    statKeys.filter(key => current[key] > 0).forEach((key, index) => {
      const y = 425 + index * 36;
      this.text(907, y, STATS[key], 18, '#ffdead').setOrigin(0, 0.5);
      this.text(1198, y, `+${current[key]}${capped ? '' : `  ›  +${preview[key]}`}`, 19, '#ffebbf').setOrigin(1, 0.5);
    });
    const doAction = (command: GameCommand, mutate: () => boolean, changes: EquipmentView = {}) => {
      if (this.changing) return;
      void this.saveAction(command, mutate, ok => {
        if (ok) restart(changes);
        else this.toast('Thao tác chưa được lưu.');
      });
    };
    this.action(1054, 536, 344, capped ? (enhancement(selected) > style.cap ? 'Giữ cấp cường hóa từ bản cũ' : 'Đã đạt cấp tối đa') : `Cường hóa  ·  ${number(cost)} vàng`, () =>
      doAction({ type: 'enhance', uid: selected.uid, useStone: false }, () => gameStore.enhanceGear(selected.uid), { enhanced: true }), !capped && walletBalance(save).gold >= cost);
    if (!capped && definition.rarity === 'SSR' && inventoryQuantity(save, ITEM_IDS.enhancementStone)) {
      this.action(1054, 586, 300, `Dùng đá cường hóa · còn ${inventoryQuantity(save, ITEM_IDS.enhancementStone)}`, () =>
        doAction({ type: 'enhance', uid: selected.uid, useStone: true }, () => gameStore.enhanceGear(selected.uid, true), { enhanced: true }));
    } else if (!capped && walletBalance(save).gold < cost) this.text(1054, 580, 'Không đủ vàng', 16, '#ffad93').setOrigin(0.5);
    if (owner) this.action(1054, 639, 344, `Tháo khỏi ${owner}`, () => doAction({ type: 'unequip', uid: selected.uid }, () => gameStore.unequipGear(selected.uid)));
    else if (hero) {
      const replace = ownGear.some(item => EQUIPMENT[item.itemId].slot === definition.slot);
      this.action(1054, 639, 344, `${replace ? 'Thay trang bị' : 'Trang bị'}  ·  ${hero.name}`,
        () => doAction({ type: 'equip', uid: selected.uid, heroId: hero.id }, () => gameStore.equipGear(selected.uid, hero.id)));
    }

    if (enhanced) {
      for (let i = 0; i < style.rings; i++) {
        const ring = this.add.circle(1054, 243, 58).setStrokeStyle(3, color);
        this.tweens.add({ targets: ring, scale: 1.95, alpha: 0, duration: 680, delay: i * 120,
          ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      }
      const glow = this.text(1054, 286, `Cường hóa +${enhancement(selected)}`, 24, '#fff3c7',
        { stroke: '#652616', strokeThickness: 5, fontStyle: 'bold' }).setOrigin(0.5);
      this.tweens.add({ targets: glow, y: 183, alpha: 0, duration: 1100, onComplete: () => glow.destroy() });
    }
  }


  /**
   * Equipment management is an overlay on the approved dragon-palace hero screen.
   * Never navigate to the deprecated three-column inventory layout for an owned hero.
   */
  private renderBagOverlay(heroId: string, items: Gear[], view: EquipmentView) {
    const { uid, query = {}, page = 0, enhanced = false } = view;
    const save = gameStore.snapshot;
    const results = queryGear(items, query);
    const pageSize = 12;
    const lastPage = Math.max(0, Math.ceil(results.length / pageSize) - 1);
    const selectedIndex = results.findIndex(item => item.uid === uid);
    const currentPage = selectedIndex >= 0
      ? Math.floor(selectedIndex / pageSize)
      : Math.max(0, Math.min(page, lastPage));
    const visible = results.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const selected = results[selectedIndex] ?? visible.find(item => item.heroId === heroId)
      ?? visible.find(item => !item.heroId) ?? visible[0];

    const restart = (changes: EquipmentView = {}) => {
      if (this.changing) return;
      this.changing = true;
      this.scene.restart({ heroId, bag: true, query, page: currentPage, uid: selected?.uid, ...changes });
    };
    const close = () => restart({ bag: false, slot: undefined, uid: undefined, query: undefined, page: 0 });

    drawEquipmentTheme(this, heroId,
      id => restart({ heroId: id, bag: true, query: {}, uid: undefined, slot: undefined, page: 0 }),
      (slot, uid) => restart({ bag: true, query: { slot }, uid, page: 0 }));

    // A modal layer preserves the full-body hero, six real slots and approved themed backdrop.
    this.add.rectangle(640, 360, 1280, 720, 0x130d15, 0.54);
    this.add.zone(640, 360, 1280, 720).setInteractive().on('pointerup', close);
    this.frame(910, 380, 670, 590, 0x351b24, GOLD, 0.985);
    this.add.zone(910, 380, 670, 590).setInteractive();
    this.text(774, 111, 'KHO TRANG BỊ · ' + results.length + '/' + items.length,
      19, '#ffdfa2', { fontStyle: 'bold' }).setOrigin(0.5);
    this.action(1173, 112, 104, 'Đóng ×', close);
    this.text(1091, 110, 'Trang bị đã chọn', 17, '#ffdda1', { fontStyle: 'bold' }).setOrigin(0.5);

    const filter = (change: GearQuery) =>
      restart({ query: { ...query, ...change }, uid: undefined, page: 0 });
    this.action(650, 177, 116, 'Phẩm: ' + (query.rarity ?? 'Tất cả'),
      () => filter({ rarity: cycle([undefined, 'R', 'SR', 'SSR'], query.rarity) }));
    this.action(793, 177, 162, 'Loại: ' + (query.slot ? EQUIPMENT_SLOTS[query.slot] : 'Tất cả'),
      () => filter({ slot: cycle([undefined, ...slots], query.slot) }));
    this.action(926, 177, 96, 'Lọc lại', () => restart({ query: {}, uid: undefined, page: 0 }));
    this.action(650, 224, 116, 'Chỉ số: ' + (query.stat ? STATS[query.stat] : 'Tất cả'),
      () => filter({ stat: cycle([undefined, ...statKeys], query.stat) }));
    this.action(793, 224, 162, 'Cấp: ' + (query.minimum ? '≥ +' + query.minimum : 'Tất cả'),
      () => filter({ minimum: cycle([0, 5, 10, 15], query.minimum ?? 0) }));
    this.action(926, 224, 96, 'Xếp: ' + SORT_LABEL[query.sort ?? 'rarity'],
      () => filter({ sort: cycle(sortOptions, query.sort ?? 'rarity') }));

    visible.forEach((item, index) => {
      const x = 636 + (index % 4) * 92;
      const y = 318 + Math.floor(index / 4) * 94;
      this.tile(x, y, item, item.uid === selected?.uid, () => restart({ uid: item.uid }), 76);
    });
    if (lastPage > 0) {
      this.action(656, 613, 102, '‹ Trước', () => restart({ page: currentPage - 1, uid: undefined }), currentPage > 0);
      this.text(780, 613, (currentPage + 1) + '/' + (lastPage + 1), 16).setOrigin(0.5);
      this.action(904, 613, 102, 'Sau ›', () => restart({ page: currentPage + 1, uid: undefined }), currentPage < lastPage);
    }
    if (!visible.length) {
      this.text(782, 400, items.length ? 'Không có trang bị phù hợp.' : 'Kho chưa có trang bị.',
        17, '#ecd0aa').setOrigin(0.5);
      if (!items.length) this.action(783, 474, 205, 'Đến Chinh Chiến', () => this.go('Campaign'));
    }

    if (!selected) {
      this.text(1094, 324, 'Chọn trang bị để xem\nthuộc tính và thao tác.',
        17, '#efd2ad', { align: 'center' }).setOrigin(0.5);
      this.data.set('equipmentBagOverlay', { selectedHeroId: heroId, query, selectedUid: undefined });
      return;
    }

    const definition = EQUIPMENT[selected.itemId];
    const rarity = gearRarity(selected);
    const capped = !canEnhance(selected);
    const cost = enhanceCost(selected);
    const current = gearStats(selected);
    const next = gearStats({ ...selected, level: selected.level + 1 });
    const owner = selected.heroId ? HERO_BY_ID[selected.heroId]?.name : undefined;
    this.text(1094, 157, definition.name, 20, '#ffe5b6', { fontStyle: 'bold',
      align: 'center', wordWrap: { width: 242 } }).setOrigin(0.5);
    this.tile(1094, 269, selected, true, undefined, 128);
    this.text(1094, 346, definition.rarity + ' · ' + EQUIPMENT_SLOTS[definition.slot] +
      ' · +' + enhancement(selected) + '/+' + rarity.cap, 15, '#ffdfa2').setOrigin(0.5);
    this.text(1094, 372, owner ? 'Đang dùng · ' + owner : 'Đang trong túi',
      14, '#eac19e').setOrigin(0.5);
    statKeys.filter(key => current[key] > 0).forEach((key, index) => {
      const y = 405 + index * 27;
      this.text(990, y, STATS[key], 15, '#ffdead').setOrigin(0, 0.5);
      this.text(1210, y, '+' + current[key] + (capped ? '' : ' › +' + next[key]),
        15, '#ffebbf').setOrigin(1, 0.5);
    });

    const doAction = (command: GameCommand, mutate: () => boolean, changes: EquipmentView = {}) => {
      if (this.changing) return;
      void this.saveAction(command, mutate, ok => {
        if (ok) restart(changes);
        else this.toast('Thao tác chưa được lưu.');
      });
    };
    if ((save.forge?.crafted || save.forge?.premiumClaimed) && isForgeWeapon(selected.itemId)) {
      this.action(1094, 496, 222, selected.prestigeSkin ? 'Tắt skin' : 'Bật skin',
        () => doAction({ type: 'skin', uid: selected.uid }, () => gameStore.togglePrestigeSkin(selected.uid)));
    }
    this.action(1094, 543, 238,
      capped ? 'Đã đạt cấp tối đa' : 'Cường hóa · ' + number(cost) + ' vàng',
      () => doAction({ type: 'enhance', uid: selected.uid, useStone: false },
        () => gameStore.enhanceGear(selected.uid), { enhanced: true }),
      !capped && walletBalance(save).gold >= cost);
    if (!capped && definition.rarity === 'SSR' && inventoryQuantity(save, ITEM_IDS.enhancementStone) > 0) {
      this.action(1094, 591, 238, 'Dùng đá · còn ' + inventoryQuantity(save, ITEM_IDS.enhancementStone),
        () => doAction({ type: 'enhance', uid: selected.uid, useStone: true },
          () => gameStore.enhanceGear(selected.uid, true), { enhanced: true }));
    } else if (!capped && walletBalance(save).gold < cost) {
      this.text(1094, 586, 'Không đủ vàng', 15, '#ffad93').setOrigin(0.5);
    }
    if (owner) {
      this.action(1094, 638, 238, 'Tháo khỏi ' + owner,
        () => doAction({ type: 'unequip', uid: selected.uid }, () => gameStore.unequipGear(selected.uid)));
    } else {
      const replace = items.some(item => item.heroId === heroId && EQUIPMENT[item.itemId].slot === definition.slot);
      this.action(1094, 638, 238, (replace ? 'Thay' : 'Trang bị') + ' · ' + HERO_BY_ID[heroId].name,
        () => doAction({ type: 'equip', uid: selected.uid, heroId },
          () => gameStore.equipGear(selected.uid, heroId)));
    }

    if (enhanced) {
      const ring = this.add.circle(1094, 269, 58).setStrokeStyle(3, rarity.metal);
      this.tweens.add({ targets: ring, scale: 1.9, alpha: 0, duration: 650, onComplete: () => ring.destroy() });
    }
    this.data.set('equipmentBagOverlay', { selectedHeroId: heroId, query, selectedUid: selected.uid });
    const key = this.input.keyboard;
    if (key) {
      key.on('keydown-ESC', close);
      this.events.once('shutdown', () => key.off('keydown-ESC', close));
    }
  }

  private frame(x: number, y: number, width: number, height: number, ink = INK, metal = GOLD, alpha = 0.93) {
    const g = this.add.graphics({ x, y });
    const w = width / 2, h = height / 2;
    const corners = (offset: number) => [
      { x: -w + 12, y: -h + offset }, { x: w - 12, y: -h + offset },
      { x: w - offset, y: -h + 12 }, { x: w - offset, y: h - 12 },
      { x: w - 12, y: h - offset }, { x: -w + 12, y: h - offset },
      { x: -w + offset, y: h - 12 }, { x: -w + offset, y: -h + 12 },
    ];
    g.fillStyle(ink, alpha).fillPoints(corners(0), true);
    g.lineStyle(2, metal, 0.93).strokePoints(corners(0), true);
    g.lineStyle(1, metal, 0.38).strokePoints(corners(5), true);
    g.fillStyle(metal, 0.9);
    for (const side of [-1, 1]) for (const vertical of [-1, 1]) {
      g.fillCircle(side * (w - 11), vertical * (h - 11), 2.5);
    }
    return g;
  }

  private action(x: number, y: number, width: number, label: string, fn: () => void, enabled = true) {
    const border = this.frame(x, y, width, 44, enabled ? 0x7b3f28 : 0x4a3334, enabled ? GOLD : 0x836752);
    const text = this.text(x, y, label, 16, enabled ? '#fff0c0' : '#bfa99d', { fontStyle: 'bold' }).setOrigin(0.5);
    if (enabled) this.add.zone(x, y, width, 44).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { border.setAlpha(0.78); text.setColor('#ffffff'); })
      .on('pointerout', () => { border.setAlpha(1); text.setColor('#fff0c0'); })
      .on('pointerup', fn);
  }

  private tile(x: number, y: number, item: Gear | undefined, selected: boolean, action?: () => void, size = 86) {
    const definition = item ? EQUIPMENT[item.itemId] : undefined;
    const style = item ? gearRarity(item) : undefined;
    if (style?.pulse) {
      const glow = this.add.rectangle(x, y, size + 12, size + 12, style.metal, 0.22);
      this.tweens.add({ targets: glow, alpha: 0.35, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    }
    if (selected) this.frame(x, y, size + 8, size + 8, INK, GOLD);
    this.frame(x, y, size, size, style?.backdrop ?? 0x2b1a22, style?.metal ?? 0x947356);
    if (item?.prestigeSkin) {
      const trim = this.frame(x, y, size + 5, size + 5, 0x6d3017, 0xffdc83, 0);
      this.tweens.add({ targets: trim, alpha: 0.45, yoyo: true, repeat: -1, duration: 720 });
    }
    if (item && definition) {
      this.add.image(x, y, `gear-${definition.art}`).setDisplaySize(size * 0.88, size * 0.88);
      this.text(x - size / 2 + 8, y - size / 2 + 5, definition.rarity, 13, '#ffedc5',
        { stroke: '#24141c', strokeThickness: 4, fontStyle: 'bold' });
      this.text(x + size / 2 - 7, y + size / 2 - 5, `+${enhancement(item)}`, 15, '#ffedc5',
        { stroke: '#24141c', strokeThickness: 4 }).setOrigin(1, 1);
    } else this.text(x, y, '+', 33, '#bc986c').setOrigin(0.5);
    if (action) this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true }).on('pointerup', action);
  }
}
