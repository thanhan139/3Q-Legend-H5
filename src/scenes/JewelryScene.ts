import type Phaser from 'phaser';
import { cloudRepository } from '../cloud/cloudRepository';
import type { GameCommand } from '../cloud/gameProtocol';
import { HERO_BY_ID, heroFamily } from '../data/heroes';
import { CHIBI_SOURCES } from '../data/chibiBattle';
import themeAssets from '../data/equipmentThemeAssets.json';
import {
  equipJewelry, JEWELRY, JEWELRY_ITEMS, JEWELRY_MAX_LEVEL, JEWELRY_REWARDS, JEWELRY_SETS,
  jewelryBonus, jewelryEnhanceCost, normalizeJewelry, type JewelryItem, type JewelryRarity, type JewelrySlot,
} from '../domain/jewelry';
import { combatPower, heroStats } from '../domain/progression';
import { gameStore } from '../domain/store';
import { ITEM_IDS, inventoryQuantity, walletBalance } from '../domain/resources';
import { equipmentHeroModel } from '../ui/equipmentHeroModel';
import { heroNavigation, heroTabRoute } from '../ui/heroNavigation';
import { heroLabel } from '../ui/heroUiControls';
import { loadEquipmentThemes } from '../ui/equipmentThemeView';
import { LivingSpiritView } from '../ui/LivingSpiritView';
import { PORTRAITS, PORTRAIT_TILE, atlasOrder } from '../ui/heroPresentation';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { sharedButton } from '../ui/sharedUi';
import { UiScene } from '../ui/UiScene';

const THEME = 'equipment.theme.';
const SLOTS = { ring: 'Nhẫn', necklace: 'Dây Chuyền' } as const;
const RARITIES = [undefined, 'R', 'SR', 'SSR'] as const;
const STAT_ROWS = [
  ['hp', 'hp'], ['attack', 'atk'], ['defense', 'def'],
  ['critical', 'criticalChance'], ['accuracy', 'accuracy'], ['dodge', 'dodge'],
] as const;
const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const asset = (path: string) => `assets/jewelry/${path}.png`;
const PAGE_SIZE = 12;
const HERO_PAGE_SIZE = 5;
interface View {
  heroId?: string;
  uid?: string;
  slot?: JewelrySlot;
  rarity?: JewelryRarity;
  page?: number;
  message?: string;
}

export class JewelryScene extends UiScene {
  private restarting = false;
  private pending = false;
  private owner?: string;

  constructor() { super('Jewelry'); }

  preload() {
    const data = this.sys.settings.data as View | undefined;
    loadEquipmentThemes(this, heroNavigation.candidate(gameStore.snapshot, cloudRepository.uid ?? 'local-ui', data?.heroId));
    for (const path of [
      ...JEWELRY_ITEMS.map(item => item.asset),
      ...STAT_ROWS.map(([id]) => asset(`ui/stats/${id}`)),
      ...['r', 'sr', 'ssr', 'active'].map(id => asset(`ui/badges/${id}`)),
    ]) {
      if (!this.textures.exists(path)) this.load.image(path, import.meta.env.BASE_URL + path);
    }
    if (!this.textures.exists(PORTRAITS)) this.load.spritesheet(PORTRAITS, import.meta.env.BASE_URL + 'assets/heroes/portraits.webp',
      { frameWidth: PORTRAIT_TILE, frameHeight: PORTRAIT_TILE });
    if (!this.textures.exists(BATTLE_SPRITES)) this.load.spritesheet(BATTLE_SPRITES, import.meta.env.BASE_URL + 'assets/heroes/battle-sprites.webp',
      { frameWidth: 256, frameHeight: 256 });
  }

  create(view: View = {}) {
    this.restarting = false;
    this.pending = false;
    this.owner = cloudRepository.uid;
    const save = gameStore.snapshot;
    const id = heroNavigation.resolve(save, this.owner ?? 'local-ui', view.heroId, 'jewelry');
    this.art(THEME + 'background/equipment_hall_clean.png', 640, 360, 1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x190911, .38);
    this.art(THEME + 'ui/panels/header_nav.png', 640, 43, 1260, 75);
    this.label(143, 43, 'Trang Sức', 31, 218);
    this.backToLobby(1162, 42, 190, 54);
    if (!id) return;

    const restart = (next: View) => {
      if (this.restarting || this.pending) return;
      this.restarting = true;
      this.scene.restart({ ...view, heroId: id, message: undefined, ...next });
    };
    const tabs = [['detail', 'Chi tiết'], ['skills', 'Kỹ năng'], ['equipment', 'Trang Bị'],
      ['jewelry', 'Trang Sức'], ['signature', 'Thần Binh']] as const;
    for (const [index, [tab, label]] of tabs.entries()) {
      this.control(323 + index * 143, 42, 136, 51, label, tab === 'jewelry' ? undefined : () => {
        if (this.pending) return;
        const route = heroTabRoute(tab, id);
        this.go(route.scene, route.data);
      }, tab === 'jewelry');
    }

    const inventory = normalizeJewelry(save.jewelry, save.heroes);
    const results = inventory.filter(item => (!view.slot || JEWELRY[item.itemId].type === view.slot) &&
      (!view.rarity || JEWELRY[item.itemId].rarity === view.rarity));
    const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const selectedIndex = results.findIndex(item => item.uid === view.uid);
    const page = selectedIndex < 0 ? Math.min(pageCount - 1, view.page ?? 0) : Math.floor(selectedIndex / PAGE_SIZE);
    const shown = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const selected = results[selectedIndex] ?? shown[0];
    const equipped = jewelryBonus(id, inventory);
    const compareInventory = structuredClone(inventory);
    if (selected) {
      if (selected.heroId === id) delete compareInventory.find(item => item.uid === selected.uid)?.heroId;
      else equipJewelry(compareInventory, selected.uid, id, save.heroes);
    }
    const stats = heroStats(HERO_BY_ID[id], save.heroExp[id], save.heroStars?.[id], save.equipment, inventory);
    const preview = heroStats(HERO_BY_ID[id], save.heroExp[id], save.heroStars?.[id], save.equipment, compareInventory);

    this.frame(18, 91, 186, 611);
    this.frame(213, 91, 505, 611, .61);
    this.frame(727, 91, 535, 611);
    this.label(111, 120, 'Võ Tướng', 21, 150);
    this.roster(save.heroes, id, next => restart({ heroId: next, uid: undefined }));

    const model = equipmentHeroModel(save, id);
    if (model?.theme) {
      const path = model.theme.fullbody.replace('assets/', '');
      const { bounds, size } = themeAssets[path as keyof typeof themeAssets];
      const scale = Math.min(1, 378 / (bounds[2] - bounds[0]), 324 / (bounds[3] - bounds[1]));
      const spirit = new LivingSpiritView(this, id, heroNavigation.accountKey).sprite;
      if (spirit) spirit.setPosition(475, 321).setScale(365 / Math.max(spirit.width, spirit.height));
      else this.art(THEME + model.theme.fx_back.replace('assets/', ''), 466, 331, 476, 340).setAlpha(.74);
      this.add.image(466 - ((bounds[0] + bounds[2]) / 2 - size[0] / 2) * scale,
        493 - (bounds[3] - size[1] / 2) * scale, THEME + path).setScale(scale);
    } else if (this.textures.exists(BATTLE_SPRITES)) {
      const source = CHIBI_SOURCES[heroFamily(id)];
      this.add.image(466, 485, BATTLE_SPRITES, battleSpriteFrames.get(heroFamily(id)))
        .setOrigin(source.staticFoot[0] / 256, source.staticFoot[1] / 256).setScale(Math.min(1.24, 292 / source.maxHeight));
    }
    this.title(466, 124, 422, HERO_BY_ID[id].name);
    this.label(466, 163, `${HERO_BY_ID[id].rarity} · Cấp ${stats.level} · ${save.heroStars?.[id] ?? 1} sao`, 17, 360);
    for (const [i, slot] of (['ring', 'necklace'] as const).entries()) {
      const x = i ? 644 : 286;
      const item = equipped.equipped.find(candidate => JEWELRY[candidate.itemId].type === slot);
      this.itemCard(x, 393, item, item?.uid === selected?.uid && !!item, () =>
        restart({ slot, rarity: undefined, uid: item?.uid, page: 0 }));
      this.label(x, 452, SLOTS[slot], 17, 120);
    }
    this.title(466, 534, 391, `Lực Chiến  ${number(combatPower(stats))}`);
    this.label(466, 578, 'Cộng hưởng Trang Sức', 18, 445);
    const displaySet = equipped.activeSet ?? (selected && JEWELRY[selected.itemId].setId) ??
      equipped.equipped.map(item => JEWELRY[item.itemId].setId).find(Boolean);
    const count = displaySet ? equipped.equipped.filter(item => JEWELRY[item.itemId].setId === displaySet).length : 0;
    const set = displaySet ? JEWELRY_SETS[displaySet] : undefined;
    this.label(449, 610, `${set?.name ?? 'Chưa có bộ SSR'} · ${count}/2`, 19, 380);
    if (equipped.activeSet) this.art(asset('ui/badges/active'), 639, 610, 108, 36);
    const bonus = set ? [['HP', set.hp], ['Công', set.atk], ['Thủ', set.def]]
      .filter(([, value]) => !!value).map(([name, value]) => `${name} +${number(Number(value))}%`).join(' · ') : '';
    this.label(466, 642, bonus || 'Đeo hai món cùng bộ SSR để kích hoạt.', 16, 455);
    this.label(466, 673, `${number(walletBalance(save).gold)} Vàng   ·   ${number(inventoryQuantity(save, ITEM_IDS.jewelryEssence))} Tinh Hoa`, 16, 455);

    this.title(902, 121, 318, 'Kho Trang Sức');
    const filters = [[undefined, 'Tất cả'], ['ring', 'Nhẫn'], ['necklace', 'Dây Chuyền']] as const;
    for (const [i, [slot, label]] of filters.entries()) {
      this.control(795 + i * 114, 169, 110, 45, label,
        () => restart({ slot, page: 0, uid: undefined }), slot === view.slot).setName('jewelry.filter.' + (slot ?? 'all'));
    }
    this.control(1147, 169, 136, 45, `Phẩm: ${view.rarity ?? 'Tất cả'}`, () =>
      restart({ rarity: RARITIES[(RARITIES.indexOf(view.rarity) + 1) % RARITIES.length], page: 0, uid: undefined }));
    for (const [i, item] of shown.entries()) {
      this.itemCard(806 + i % 4 * 124, 229 + Math.floor(i / 4) * 78, item, item.uid === selected?.uid,
        () => restart({ uid: item.uid }), 75);
    }
    if (!shown.length) this.label(994, 289, inventory.length ? 'Không có món phù hợp bộ lọc.' : 'Kho chưa có trang sức.', 19, 470);
    this.control(790, 441, 105, 42, '‹ Trước', page > 0 ? () => restart({ page: page - 1, uid: undefined }) : undefined);
    this.label(994, 441, `${page + 1}/${pageCount} · ${results.length} món`, 15, 230);
    this.control(1196, 441, 105, 42, 'Sau ›', page + 1 < pageCount ? () => restart({ page: page + 1, uid: undefined }) : undefined);

    const run = async (command: GameCommand, success: string) => {
      if (this.pending) return;
      this.pending = true;
      let active = true;
      const shutdown = () => { active = false; };
      this.events.once('shutdown', shutdown);
      this.statusText.setText('Đang xác nhận với máy chủ…');
      let message: string;
      try {
        await cloudRepository.execute(command);
        message = success;
      } catch (error) {
        message = error instanceof Error ? error.message : 'Không thể lưu. Hãy thử lại.';
      } finally {
        this.events.off('shutdown', shutdown);
        this.pending = false;
      }
      if (active) restart({ message, uid: selected?.uid });
    };
    const reward = JEWELRY_REWARDS.find(entry => entry.itemIds.some(itemId => !inventory.some(item => item.itemId === itemId)));
    const unlocked = !!reward && save.clearedStages.includes(reward.stageId);
    this.control(1142, 121, 164, 46, unlocked ? `Nhận mốc ${reward.stageId}` : 'Mốc Chinh Chiến',
      unlocked ? () => void run({ type: 'jewelryClaim', stageId: reward.stageId }, 'Đã nhận trang sức và Tinh Hoa.') : undefined, unlocked);
    this.statusText = this.label(994, 682, view.message ?? (reward ? `Trang sức thưởng từ mốc Ải ${reward.stageId}.` : 'Đã nhận đủ thưởng mốc.'), 14, 490);
    if (!selected) return;

    this.label(994, 476, `${JEWELRY[selected.itemId].name}  +${selected.level}`, 19, 492);
    const owner = selected.heroId && HERO_BY_ID[selected.heroId]?.name;
    this.label(994, 503, `${owner ? `Đang đeo: ${owner}` : 'Trong kho'} · Hiện tại → ${selected.heroId === id ? 'khi tháo' : 'khi đeo'}`, 14, 492);
    for (const [i, [icon, stat]] of STAT_ROWS.entries()) {
      const x = 748 + i % 2 * 250, y = 533 + Math.floor(i / 2) * 30;
      this.art(asset(`ui/stats/${icon}`), x + 48, y, 96, 30);
      const pct = i >= 3 ? '%' : '';
      const before = stats[stat] ?? 0, after = preview[stat] ?? 0;
      this.label(x + 166, y, `${number(before)}${pct} → ${number(after)}${pct}`, 15, 130,
        after === before ? '#eed6b4' : after > before ? '#b2eb8e' : '#ffaf95');
    }
    const action = selected.heroId === id;
    this.control(840, 646, 214, 50, action ? 'Tháo' : selected.heroId ? 'Chuyển / Thay' : 'Trang Bị', () =>
      void run(action ? { type: 'jewelryUnequip', uid: selected.uid } :
        { type: 'jewelryEquip', uid: selected.uid, heroId: id }, action ? 'Đã tháo trang sức.' : 'Đã trang bị.'), true)
      .setName(action ? 'jewelry.commit.unequip' : 'jewelry.commit.equip');
    const cost = jewelryEnhanceCost(selected), capped = selected.level >= JEWELRY_MAX_LEVEL;
    const enough = walletBalance(save).gold >= cost.gold && inventoryQuantity(save, ITEM_IDS.jewelryEssence) >= cost.essence;
    this.control(1097, 646, 285, 50, capped ? 'Đã đạt +50' : `Cường Hóa · ${number(cost.gold)} V · ${cost.essence} TH`,
      !capped && enough ? () => void run({ type: 'jewelryEnhance', uid: selected.uid }, 'Đã cường hóa trang sức.') : undefined, !capped && enough)
      .setName('jewelry.commit.enhance');
  }

  private statusText!: Phaser.GameObjects.Text;

  update() {
    if (!this.restarting && this.owner !== cloudRepository.uid) {
      this.restarting = true;
      this.scene.start('Boot');
    }
  }

  private roster(heroes: string[], id: string, choose: (id: string) => void) {
    const save = gameStore.snapshot;
    const selectedIndex = heroes.indexOf(id);
    const page = Math.floor(selectedIndex / HERO_PAGE_SIZE);
    for (const [i, heroId] of heroes.slice(page * HERO_PAGE_SIZE, (page + 1) * HERO_PAGE_SIZE).entries()) {
      const y = 181 + i * 96, hero = HERO_BY_ID[heroId];
      const selected = id === heroId;
      this.add.rectangle(111, y, 170, 74, selected ? 0x552719 : 0x28171c, .86)
        .setStrokeStyle(selected ? 2 : 1, selected ? 0xf6bd57 : 0x93704d, .82);
      const theme = equipmentHeroModel(save, heroId)?.theme;
      if (theme) this.art(THEME + theme.portrait.replace('assets/', ''), 61, y, 54, 54);
      else this.add.image(61, y, PORTRAITS, atlasOrder.indexOf(heroFamily(heroId))).setScale(54 / PORTRAIT_TILE);
      this.art(THEME + `equipment/frames/slot_${selected ? 'selected' : 'sr'}.png`, 61, y, 60, 60);
      this.label(139, y - 11, hero.name, 16, 104);
      this.label(139, y + 13, `Cấp ${heroStats(hero, save.heroExp[heroId]).level} · ${save.heroStars?.[heroId] ?? 1} sao`, 13, 104);
      this.hit(111, y, 172, 78, `jewelry.hero.${heroId}`, () => choose(heroId));
    }
    const nextPage = (delta: number) => heroes[(page + delta) * HERO_PAGE_SIZE];
    for (const delta of [-1, 1]) {
      const next = nextPage(delta);
      this.control(111 + delta * 49, 668, 82, 48, delta < 0 ? '‹' : '›', next ? () => choose(next) : undefined);
    }
  }

  private itemCard(x: number, y: number, item: JewelryItem | undefined, active: boolean, action: () => void, size = 106) {
    const def = item && JEWELRY[item.itemId];
    const frame = active ? 'selected' : def?.rarity.toLowerCase() ?? 'empty';
    this.art(THEME + `equipment/frames/slot_${frame}.png`, x, y, size, size);
    if (item && def) {
      this.art(def.asset, x, y, size * .83, size * .83);
      this.art(asset(`ui/badges/${def.rarity.toLowerCase()}`), x - size * .25, y - size * .33, size * .43, size * .24);
      this.label(x + size * .24, y + size * .31, `+${item.level}`, 14, 41);
    } else this.label(x, y, '+', 24, size - 16);
    this.hit(x, y, size, size, `jewelry.item.${item?.uid ?? x}`, action);
  }

  private title(x: number, y: number, width: number, label: string) {
    this.art(THEME + 'ui/panels/power_banner.png', x, y, width, 54);
    this.label(x, y, label, 24, width - 44);
  }

  private frame(x: number, y: number, width: number, height: number, alpha = .92) {
    this.add.graphics().fillStyle(0x271019, alpha).fillRoundedRect(x, y, width, height, 15)
      .lineStyle(2, 0xbc8446, .9).strokeRoundedRect(x, y, width, height, 15)
      .lineStyle(1, 0xe8b979, .33).strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 12);
  }

  private art(key: string, x: number, y: number, width: number, height: number) {
    const image = this.add.image(x, y, key);
    return image.setScale(Math.min(width / image.width, height / image.height));
  }

  private label(x: number, y: number, text: string, size: number, width: number, color?: string) {
    return heroLabel(this, x, y, text, size, width, 36, color);
  }

  private control(x: number, y: number, width: number, height: number, label: string, action?: () => void, highlighted = false) {
    const button = sharedButton(this, { x: x - width / 2, y: y - height / 2, width, height },
      label, action, highlighted ? 'gold' : 'red');
    if (highlighted && !action) { button.background.clearTint().setAlpha(1); button.text.setAlpha(1); }
    return button.background;
  }

  private hit(x: number, y: number, width: number, height: number, name: string, action: () => void) {
    this.add.zone(x, y, width, height).setName(name).setInteractive({ useHandCursor: true }).on('pointerup', action);
  }
}
