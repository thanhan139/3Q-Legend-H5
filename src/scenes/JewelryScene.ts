import Phaser from 'phaser';
import { cloudRepository } from '../cloud/cloudRepository';
import type { GameCommand } from '../cloud/gameProtocol';
import { HERO_BY_ID, heroFamily } from '../data/heroes';
import { CHIBI_SOURCES } from '../data/chibiBattle';
import themeAssets from '../data/equipmentThemeAssets.json';
import {
  equipJewelry, JEWELRY, JEWELRY_ITEMS, JEWELRY_MAX_LEVEL, JEWELRY_RULES_VERSION, JEWELRY_REWARDS, JEWELRY_SETS,
  jewelryBonus, jewelryEnhancement, jewelryStats,
  type JewelryEnhancementReceipt, type JewelryItem,
} from '../domain/jewelry';
import { combatPower, heroStats } from '../domain/progression';
import { gameStore } from '../domain/store';
import { ITEM_IDS, inventoryQuantity, walletBalance } from '../domain/resources';
import { equipmentHeroModel } from '../ui/equipmentHeroModel';
import { heroNavigation, heroTabRoute } from '../ui/heroNavigation';
import { jewelryInventoryView, type JewelryInventoryQuery } from '../ui/jewelryInventoryView';
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
const PANEL = 'assets/inventory/panels/item_detail_panel.png';
const DRAGON = 'assets/summon/complete/portrait_frames/portrait_dragon.png';
const ENHANCE_ART = {
  outer: 'assets/inventory/panels/inventory_grid_panel.png',
  title: 'assets/inventory/panels/title_banner_blank.png',
  plaque: 'assets/inventory/panels/detail_title_plaque_blank.png',
  crest: 'assets/inventory/decor/gold_dragon_divider.png',
  primary: 'assets/inventory/buttons/button_gold.png',
  secondary: 'assets/inventory/buttons/button_back.png',
  close: THEME + 'ui/buttons/action_round.png',
} as const;
const RARITY_GLOW = { R: 0x70caff, SR: 0xc471ff, SSR: 0xffb94d };
const HERO_PAGE_SIZE = 5;
interface View extends JewelryInventoryQuery {
  heroId?: string;
  message?: string;
  enhancing?: boolean;
  enhancement?: JewelryEnhancementReceipt;
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
      PANEL, DRAGON, ...Object.values(ENHANCE_ART).filter(path => path.startsWith('assets/')),
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
      this.scene.restart({ ...view, heroId: id, message: undefined, enhancing: false, enhancement: undefined, ...next });
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

    const { allJewelry, equippedJewelry, bagJewelry, page, pageCount, scopeTotal, selected, shown, total } =
      jewelryInventoryView(save, id, view);
    const equipped = jewelryBonus(id, allJewelry);
    const compareInventory = structuredClone(allJewelry);
    if (selected) {
      if (selected.heroId === id) delete compareInventory.find(item => item.uid === selected.uid)?.heroId;
      else equipJewelry(compareInventory, selected.uid, id, save.heroes);
    }
    const stats = heroStats(HERO_BY_ID[id], save.heroExp[id], save.heroStars?.[id], save.equipment, allJewelry);
    const preview = heroStats(HERO_BY_ID[id], save.heroExp[id], save.heroStars?.[id], save.equipment, compareInventory);

    this.frame(18, 91, 186, 611);
    this.frame(213, 91, 505, 611, .61);
    this.frame(727, 91, 535, 611);
    this.label(111, 120, 'Võ Tướng', 21, 150);
    this.roster(save.heroes, id, next => restart({ heroId: next, uid: undefined, selectedSlot: undefined, page: 0 }));

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
      this.itemCard(x, 393, item, item?.uid === selected?.uid && !!item, () => restart(item
        ? { selectedSlot: slot, uid: undefined, page }
        : { scope: 'bag', slot, rarity: undefined, selectedSlot: undefined, uid: undefined, page: 0 }),
      106, `jewelry.slot.${slot}`);
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
    this.label(466, 673, `${number(walletBalance(save).copper)} Đồng   ·   ${number(inventoryQuantity(save, ITEM_IDS.jewelryEssence))} Tinh Hoa`, 16, 455);

    this.title(902, 121, 318, 'Kho Trang Sức');
    const resetSelection: View = { page: 0, uid: undefined, selectedSlot: undefined };
    const showingEquipped = view.scope === 'equipped';
    this.control(843, 162, 194, 35, 'Trong kho', () => restart({ ...resetSelection, scope: 'bag' }), !showingEquipped)
      .setName('jewelry.scope.bag');
    this.control(1079, 162, 225, 35, 'Đang sử dụng', () => restart({ ...resetSelection, scope: 'equipped' }), showingEquipped)
      .setName('jewelry.scope.equipped');
    const filters = [[undefined, 'Tất cả'], ['ring', 'Nhẫn'], ['necklace', 'Dây Chuyền']] as const;
    for (const [i, [slot, label]] of filters.entries()) {
      this.control(795 + i * 114, 197, 110, 35, label,
        () => restart({ ...resetSelection, slot }), slot === view.slot).setName('jewelry.filter.' + (slot ?? 'all'));
    }
    this.control(1147, 197, 136, 35, `Phẩm: ${view.rarity ?? 'Tất cả'}`, () =>
      restart({ ...resetSelection, rarity: RARITIES[(RARITIES.indexOf(view.rarity) + 1) % RARITIES.length] }));
    for (const [i, item] of shown.entries()) {
      const x = 806 + i % 4 * 124;
      const y = 248 + Math.floor(i / 4) * 70;
      this.itemCard(x, y, item, item.uid === selected?.uid,
        () => restart({ uid: item.uid, selectedSlot: undefined }), showingEquipped ? 58 : 67);
      if (item.heroId) this.label(x, y + 33, HERO_BY_ID[item.heroId].name, 13, 115);
    }
    if (!total) {
      this.label(994, 289, scopeTotal ? 'Không có món phù hợp bộ lọc.' :
        showingEquipped ? 'Chưa có trang sức đang sử dụng.' : 'Kho chưa có trang sức.', 19, 470);
      if (!showingEquipped && !bagJewelry.length && equippedJewelry.length)
        this.label(994, 322, 'Xem món đang đeo ở mục Đang sử dụng.', 15, 470);
    }
    if (pageCount > 1) {
      this.control(790, 441, 105, 42, '‹ Trước', page > 0 ? () => restart({ ...resetSelection, page: page - 1 }) : undefined);
      this.control(1196, 441, 105, 42, 'Sau ›', page + 1 < pageCount ? () => restart({ ...resetSelection, page: page + 1 }) : undefined);
    }
    this.label(994, 441, pageCount ? `${page + 1}/${pageCount} · ${total} món` : '0 món', 15, 230).setName('jewelry.inventory.count');

    const run = async (command: GameCommand, success: string) => {
      if (this.pending) return;
      this.pending = true;
      let active = true;
      const shutdown = () => { active = false; };
      this.events.once('shutdown', shutdown);
      this.statusText.setText('Đang xác nhận với máy chủ…');
      let message: string;
      let enhancement: JewelryEnhancementReceipt | undefined;
      let selection: View = { uid: selected?.uid, page };
      try {
        const receipt = await cloudRepository.execute<JewelryEnhancementReceipt | boolean>(command);
        if (typeof receipt === 'object' && receipt?.kind === 'jewelryEnhancement') enhancement = receipt;
        message = success;
        if (selected && command.type === 'jewelryEquip')
          selection = { uid: undefined, page, selectedSlot: JEWELRY[selected.itemId].type };
        if (selected && command.type === 'jewelryUnequip')
          selection = { ...resetSelection, scope: 'bag', slot: undefined, rarity: undefined, uid: selected.uid };
      } catch (error) {
        message = error instanceof Error ? error.message : 'Không thể lưu. Hãy thử lại.';
      } finally {
        this.events.off('shutdown', shutdown);
        this.pending = false;
      }
      if (active) restart({ ...selection, message, enhancement, enhancing: command.type === 'jewelryEnhance' });
    };
    const reward = JEWELRY_REWARDS.find(entry => entry.itemIds.some(itemId => !allJewelry.some(item => item.itemId === itemId)));
    const unlocked = !!reward && save.clearedStages.includes(reward.stageId);
    this.control(1142, 121, 164, 46, unlocked ? `Nhận mốc ${reward.stageId}` : 'Mốc Chinh Chiến',
      unlocked ? () => void run({ type: 'jewelryClaim', stageId: reward.stageId }, 'Đã nhận trang sức và Tinh Hoa.') : undefined, unlocked);
    this.statusText = this.label(994, 677, view.message ?? (reward ? `Trang sức thưởng từ mốc Ải ${reward.stageId}.` : 'Đã nhận đủ thưởng mốc.'), 14, 490);
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
    const capped = selected.level >= JEWELRY_MAX_LEVEL;
    this.control(1097, 646, 285, 50, capped ? 'Đã đạt +50' : 'Cường Hóa',
      capped ? undefined : () => restart({ enhancing: true, uid: selected.uid }), !capped)
      .setName('jewelry.open.enhance');
    if (view.enhancing && selected.uid === view.uid) this.enhancePanel(selected, view, restart, run);
  }

  private statusText!: Phaser.GameObjects.Text;

  private enhancePanel(item: JewelryItem, view: View, restart: (view: View) => void,
    run: (command: GameCommand, success: string) => Promise<void>) {
    const result = view.enhancement?.uid === item.uid ? view.enhancement : undefined;
    const previous = result ? { ...item, level: result.fromLevel } : item;
    const attempt = jewelryEnhancement(previous);
    const next = jewelryEnhancement(item);
    if (!attempt) return;
    const save = gameStore.snapshot;
    const enough = walletBalance(save).copper >= attempt.copper &&
      inventoryQuantity(save, ITEM_IDS.jewelryEssence) >= attempt.essence;
    const close = () => restart({ enhancing: false });
    this.add.rectangle(640, 360, 4000, 2600, 0x0a050a, .83).setName('jewelry.enhance.backdrop').setInteractive();
    this.art(ENHANCE_ART.outer, 640, 360, 1008, 610).setName('jewelry.enhance.frame.outer');
    this.modalFrame('details', PANEL, 640, 233, 864, 180, 82, .33);
    this.modalFrame('stats', ENHANCE_ART.outer, 640, 429, 864, 190, 82, .33);
    this.modalFrame('stats-header', ENHANCE_ART.plaque, 640, 354, 830, 30, 22, .5);
    this.modalFrame('footer', PANEL, 640, 586, 864, 106, 82, .33);
    this.art(ENHANCE_ART.title, 640, 110, 430, 58).setName('jewelry.enhance.frame.title');
    this.art(ENHANCE_ART.crest, 640, 83, 640, 45).setName('jewelry.enhance.frame.crest');
    this.label(640, 111, 'Cường Hóa Trang Sức', 26, 365);
    this.modalControl(1067, 108, 58, 58, '×', 'close', close).setName('jewelry.enhance.close');
    this.itemPreview(332, result ? 217 : 232, item);
    this.label(748, 174, JEWELRY[item.itemId].name, 24, 577);
    this.label(748, 207, `+${previous.level} → +${attempt.targetLevel}   •   Thành công ${attempt.chance}%`, 24, 577);
    const outcome = !attempt.loss ? 'Thành công chắc chắn' : `Nếu thất bại: +${attempt.failLevel}`;
    this.label(748, 236, `${outcome}   •   ${attempt.checkpoint ? 'Khóa mốc +' + attempt.checkpoint : 'Chưa khóa mốc'}`, 18, 564, '#e7c992');
    this.add.graphics().lineStyle(1, 0xc79a5b, .4).lineBetween(476, 255, 1024, 255);
    this.label(748, 271, `Thành công: ${number(attempt.copper)} Đồng · ${attempt.essence} Tinh Hoa`, 17, 555);
    this.label(748, 295, attempt.loss ? `Thất bại: ${number(attempt.copper)} Đồng · ${attempt.failEssence} Tinh Hoa` :
      'Không có hình phạt ở cấp mục tiêu này.', 17, 555, '#dcb88d');
    if (result) this.label(332, 302, `Đã dùng ${number(result.copperSpent)} Đ · ${result.essenceSpent} TH`, 15, 230);
    this.label(379, 354, 'Chỉ số món', 18, 230);
    this.label(640, 354, `+${previous.level} → +${result?.toLevel ?? attempt.targetLevel}`, 18, 210, '#ffe1a5');
    this.label(897, 354, result ? 'Thay đổi thực tế' : attempt.loss ? `Nếu trượt → +${attempt.failLevel}` : 'Nếu trượt', 18, 245);
    const from = jewelryStats(previous);
    const after = jewelryStats({ ...previous, level: result?.toLevel ?? attempt.targetLevel });
    const fail = jewelryStats({ ...previous, level: attempt.failLevel });
    const rows = [
      ['HP', 'hp'], ['Công', 'atk'], ['Thủ', 'def'], ['Bạo Kích', 'crit'], ['Chính Xác', 'accuracy'], ['Né Tránh', 'dodge'],
    ] as const;
    const separators = this.add.graphics().lineStyle(1, 0xb88b59, .23);
    for (const [i, [label, stat]] of rows.entries()) {
      const y = 384 + i * 23;
      if (i < rows.length - 1) separators.lineBetween(237, y + 12, 1043, y + 12);
      const scale = i >= 3 ? '%' : '';
      this.label(379, y, label, 17, 205);
      this.label(640, y, `${number(from[stat])}${scale} → ${number(after[stat])}${scale}`, 17, 220);
      const delta = result ? after[stat] - from[stat] : fail[stat] - from[stat];
      const pretty = Math.round(delta * 100) / 100;
      this.label(897, y, result || attempt.loss ? `${pretty > 0 ? '+' : ''}${number(pretty)}${scale}` : '—', 17, 170,
        pretty < 0 ? '#ffac9a' : pretty > 0 ? '#b8ec9b' : '#ddbd9a');
    }
    let banner = view.message || (enough ? 'Kết quả do máy chủ xác nhận sau mỗi lần thử.' : 'Cần đủ Đồng và Tinh Hoa cho lần thử.');
    if (result) {
      banner = `${result.success ? 'Thành công' : 'Thất bại'} · +${result.fromLevel} → +${result.toLevel}`;
      if (result.success && (result.toLevel === 40 || result.toLevel === 50)) {
        const glow = this.add.ellipse(640, 557, 515, 43, 0xeea339, .32).setBlendMode('ADD');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
          this.tweens.add({ targets: glow, alpha: .1, scale: 1.12, duration: 660, yoyo: true, repeat: 1 });
      } else if (!result.success) {
        const shade = this.art(ENHANCE_ART.plaque, 640, 558, 510, 34).setTint(0x9b6d7a).setAlpha(.9);
        this.tweens.add({ targets: shade, alpha: .26, duration: 400 });
      }
    }
    this.statusText = this.label(640, 559, banner, result ? 23 : 17, 748,
      result ? result.success ? '#ffe09a' : '#ffc3b7' : '#ead4ab');
    this.modalControl(501, 603, 235, 54, 'Quay lại kho', 'secondary', close).setName('jewelry.enhance.back');
    this.modalControl(778, 603, 235, 54, result ? next ? 'Lần thử tiếp theo' : 'Đã đạt +50' : 'Xác nhận cường hóa', 'primary',
      result ? next ? () => restart({ enhancing: true }) : undefined :
        enough ? () => void run({ type: 'jewelryEnhance', uid: item.uid, rulesVersion: JEWELRY_RULES_VERSION }, 'Đã xác nhận cấp mới.') : undefined)
      .setName(result ? 'jewelry.enhance.next' : 'jewelry.commit.enhance');
    this.input.keyboard?.once('keydown-ESC', close);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown-ESC', close));
  }

  private modalFrame(name: string, key: string, x: number, y: number, width: number, height: number,
    corner: number, scale: number) {
    const frame = this.game.renderer.type === Phaser.WEBGL
      ? this.add.nineslice(x, y, key, undefined, width / scale, height / scale,
        corner, corner, corner, corner).setScale(scale)
      : this.add.image(x, y, key).setDisplaySize(width, height);
    frame.setTint(0xdfbb9c).setName(`jewelry.enhance.frame.${name}`);
  }

  private modalControl(x: number, y: number, width: number, height: number, label: string,
    style: 'close' | 'primary' | 'secondary', action?: () => void) {
    const tint = style === 'secondary' ? 0xcdb09f : 0xffffff;
    const art = this.art(ENHANCE_ART[style], x, y, width, height).setTint(tint);
    const text = this.label(x, y, label, style === 'close' ? 28 : 18, art.displayWidth - 22);
    const hit = this.add.zone(x, y, width, height);
    if (!action) {
      art.setTint(0xb19a87).setAlpha(.54);
      text.setAlpha(.65);
      return hit;
    }
    let pressed = false;
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => art.setTint(0xffe8bd));
    hit.on('pointerout', () => { pressed = false; art.setTint(tint); });
    hit.on('pointerdown', () => { pressed = true; art.setTint(0xc7a477); });
    hit.on('pointerup', () => { art.setTint(tint); if (pressed) { pressed = false; action(); } });
    return hit;
  }

  private itemPreview(x: number, y: number, item: JewelryItem) {
    const definition = JEWELRY[item.itemId];
    this.add.ellipse(x, y, 148, 104, RARITY_GLOW[definition.rarity], .12);
    this.art(definition.asset, x, y, 135, 135);
    this.art(DRAGON, x, y, 150, 150);
  }

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
      this.art(THEME + `equipment/frames/slot_${selected ? 'selected' : 'sr'}.png`, 61, y, 60, 60);
      if (theme) this.art(THEME + theme.portrait.replace('assets/', ''), 61, y, 48, 48);
      else this.add.image(61, y, PORTRAITS, atlasOrder.indexOf(heroFamily(heroId))).setScale(48 / PORTRAIT_TILE);
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

  private itemCard(x: number, y: number, item: JewelryItem | undefined, active: boolean, action: () => void, size = 106,
    hitName = `jewelry.item.${item?.uid ?? x}`) {
    const def = item && JEWELRY[item.itemId];
    const frame = active ? 'selected' : def?.rarity.toLowerCase() ?? 'empty';
    if (def) this.add.ellipse(x, y + 2, size * 1.03, size * .84, RARITY_GLOW[def.rarity], active ? .27 : .13);
    this.art(THEME + `equipment/frames/slot_${frame}.png`, x, y, size, size);
    if (item && def) {
      this.art(def.asset, x, y, size * .83, size * .83);
      this.art(asset(`ui/badges/${def.rarity.toLowerCase()}`), x - size * .25, y - size * .33, size * .43, size * .24);
      this.label(x + size * .24, y + size * .31, `+${item.level}`, 14, 41);
    } else this.label(x, y, '+', 24, size - 16);
    this.hit(x, y, size, size, hitName, action);
  }

  private title(x: number, y: number, width: number, label: string) {
    this.art(THEME + 'ui/panels/power_banner.png', x, y, width, 54);
    this.label(x, y, label, 24, width - 44);
  }

  private frame(x: number, y: number, width: number, height: number, alpha = .92) {
    if (this.game.renderer.type === Phaser.WEBGL) {
      const borderScale = .5;
      this.add.nineslice(x + width / 2, y + height / 2, PANEL, undefined,
        width / borderScale, height / borderScale, 49, 49, 55, 55).setScale(borderScale).setAlpha(alpha);
    } else {
      this.add.graphics().fillStyle(0x271019, alpha).fillRoundedRect(x, y, width, height, 15)
        .lineStyle(2, 0xbc8446).strokeRoundedRect(x, y, width, height, 15);
    }
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
