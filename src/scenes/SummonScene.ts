import Phaser from 'phaser';
import { inventoryQuantity, ITEM_IDS } from '../domain/resources';
import { playCommand } from '../cloud/cloudRepository';
import { FactionConfig } from '../data/factions';
import { heroFaction, HERO_BY_ID, HERO_RARITIES, LEGENDARY_PITY_LIMIT, PITY_LIMIT, SUMMON_RATES } from '../data/heroes';
import { gameStore } from '../domain/store';
import { DUPLICATE_SHARDS, type SummonReward } from '../domain/summon';
import { RARITY_COLOR } from '../ui/heroPresentation';
import { BATTLE_SPRITES } from '../ui/battleSprites';
import { LobbyContent as ContentLayout } from '../ui/LobbyContent';
import { rect, type ContentRect } from '../ui/lobbyContentLayout';
import { summonCardSlots, SUMMON_TEXTURES, summonTexture, SMOOTH_ATLAS, DAI_QIAO_PORTRAIT } from '../ui/summonLayout';
import { summonCardArt } from '../ui/SummonCard';
import { UiScene } from '../ui/UiScene';
import {loadSharedUi} from '../ui/sharedUi';

const HALL = 'summon-hall';
const GOLD = 0xffd38b;
const INK = 0x211829;
const PORTAL_Y = 344;
const SUMMON_FONT = 'SummonNotoSerif';

export class SummonScene extends UiScene {
  private busy = false;
  private content!: ContentLayout;

  constructor() { super('Summon'); }
  preload() {
    loadSharedUi(this);
    // Wait for the bundled Vietnamese face before Phaser measures or paints any labels.
    if (![...document.fonts].some(face => face.family === SUMMON_FONT && face.status === 'loaded')) {
      this.load.font({ key: SUMMON_FONT,
        url: `${import.meta.env.BASE_URL}assets/fonts/NotoSerif-Bold-Vietnamese.woff2`,
        format: 'woff2', descriptors: { weight: '700', style: 'normal' } });
    }
    if (!this.textures.exists(SMOOTH_ATLAS)) this.load.image(SMOOTH_ATLAS, `${import.meta.env.BASE_URL}assets/summon/smooth/card-atlas.png`);
    if (!this.textures.exists(DAI_QIAO_PORTRAIT)) this.load.image(DAI_QIAO_PORTRAIT, `${import.meta.env.BASE_URL}assets/summon/smooth/da-qiao.png`);
    if (!this.textures.exists(BATTLE_SPRITES)) this.load.spritesheet(BATTLE_SPRITES,
      `${import.meta.env.BASE_URL}assets/heroes/battle-sprites.webp`, { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists(HALL)) this.load.image(HALL, `${import.meta.env.BASE_URL}assets/summon/hall.webp`);
    for (const [id, path] of Object.entries(SUMMON_TEXTURES)) {
      const key = summonTexture(id as keyof typeof SUMMON_TEXTURES);
      if (!this.textures.exists(key)) this.load.image(key, `${import.meta.env.BASE_URL}assets/summon/complete/${path}`);
    }
  }

  create({ draws, instant = false }: { draws?: SummonReward[]; instant?: boolean } = {}) {
    this.busy = false;
    this.content = new ContentLayout(this, { fastFit: true, fontFamily: SUMMON_FONT, resolution: 2, textPaddingY: 2 });
    // The sliced blank plate includes neighboring FX above y=32. Runtime uses ONLY its clean body.
    const plate = this.textures.get(summonTexture('plate'));
    if (!plate.has('clean')) plate.add('clean', 0, 5, 32, 284, 74);
    this.add.rectangle(640, 360, 1280, 720, INK);
    const hall = this.add.image(640, 360, HALL);
    hall.setScale(Math.max(1280 / hall.width, 720 / hall.height));
    this.add.rectangle(640, 360, 1280, 720, 0x110d1d, draws ? .60 : .33);
    const save = gameStore.snapshot;
    if (draws) this.content.frame('result.title', summonTexture('title'), rect(350, -25, 580, 140));
    else this.content.field('hall.title', rect(330, 26, 620, 66), 'ĐIỆN CHIÊU MỘ', { size: 36, align: 'center' });
    this.backToLobby(1162,50,200,56).background.setName('summon.lobby');
    const values = [
      `Chìa Khóa Vàng · ${inventoryQuantity(save, ITEM_IDS.goldenKey).toLocaleString('vi-VN')}`,
      `SSR trở lên · ${save.summonPity}/${PITY_LIMIT}`, `SSS+ · ${save.legendaryPity}/${LEGENDARY_PITY_LIMIT}`,
    ];
    values.forEach((value, i) => {
      const slot = rect(165 + i * 320, 112, 310, 48);
      this.add.nineslice(slot.x + slot.width / 2, slot.y + slot.height / 2, summonTexture('plate'), 'clean',
        slot.width, slot.height, 22, 22, 12, 12).setName(`summon.stat.${i}`);
      this.content.region(`stat.${i}`, slot);
      this.content.field(`stat.${i}`, rect(slot.x + 25, slot.y + 8, slot.width - 50, slot.height - 16), value,
        { size: 19, minSize: 12, align: 'center' });
    });
    if (draws) {
      this.showResults(draws, instant);
      return;
    }
    this.drawPortal();
    this.panel(36, 220, 302, 220, INK, .94);
    this.content.field('rates.title', rect(54, 230, 264, 36), 'TỶ LỆ CƠ BẢN', { size: 22, align: 'center' });
    HERO_RARITIES.forEach((rarity, i) => this.content.field(`rate.${rarity}`, rect(56, 274 + i * 29, 260, 28),
      `${rarity}: ${(SUMMON_RATES[rarity] * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
      { size: 20, color: `#${RARITY_COLOR[rarity].toString(16)}`, align: 'center' }));
    this.content.field('rates.duplicate', rect(54, 398, 264, 32), `Tướng trùng: +${DUPLICATE_SHARDS} mảnh`, { size: 18, align: 'center' });
    if (save.lastSummon) this.textButton('recent', rect(52, 458, 270, 62), 'Kết quả gần nhất',
      () => this.scene.restart({ draws: save.lastSummon, instant: true }));
    this.panel(932, 234, 308, 242, INK, .94);
    this.content.field('pity.explanation', rect(956, 254, 260, 198),
      'Bảo hiểm ngay lượt 50: SSR trở lên.\nNgay lượt 100: SSS+.\nSSR đặt lại bộ đếm SSR. SSS+ đặt lại cả hai.\nMỗi lượt dùng 1 Chìa Khóa Vàng.',
      { size: 22, minSize: 16, wrap: true, maxLines: 9, align: 'left' });
    this.content.field('hall.status', rect(340, 546, 600, 52), gameStore.isSummonUnlocked()
      ? 'Chọn quay ×1 hoặc ×10 bằng Chìa Khóa Vàng' : 'Vượt ải 1-3 để mở Chiêu Mộ', { size: 20, align: 'center' });
    this.artButton('one', rect(367, 620, 258, 72), () => this.summon(1), this.canSummon(1));
    this.artButton('ten', rect(654, 620, 270, 72), () => this.summon(10), this.canSummon(10));
  }

  private canSummon(count: 1 | 10) {
    return gameStore.isSummonUnlocked() && inventoryQuantity(gameStore.snapshot, ITEM_IDS.goldenKey) >= count;
  }

  private async summon(count: 1 | 10) {
    if (this.busy) return;
    this.busy = true;
    let active = true;
    const stop = () => { active = false; };
    this.events.once('shutdown', stop);
    try {
      // Existing repository persists the request ID before sending, reconciles uncertain network results,
      // and applies only the server-confirmed snapshot. Animations never grant rewards.
      const outcome = await playCommand<ReturnType<typeof gameStore.summon>>({ type: 'summon', count });
      if (!active) return;
      if (!outcome.ok) { this.toast(outcome.reason); this.busy = false; return; }
      this.scene.restart({ draws: outcome.draws });
    } catch (error) {
      if (active) { this.busy = false; this.toast(error instanceof Error ? error.message : 'Không thể kết nối máy chủ'); }
    } finally { this.events.off('shutdown', stop); }
  }

  private artButton(id: 'back' | 'heroes' | 'one' | 'ten', slot: ContentRect, action: () => void, enabled = true) {
    const texture = this.textures.get(summonTexture(id));
    const trims = { back: [0, 0, 406, 99], heroes: [17, 20, 358, 81], one: [30, 14, 259, 85], ten: [40, 10, 289, 89] } as const;
    if (!texture.has('clean')) { const [x, y, w, h] = trims[id]; texture.add('clean', 0, x, y, w, h); }
    const art = this.content.frame(`button.${id}`, summonTexture(id), slot, 'clean').image;
    art.setAlpha(enabled ? 1 : .42);
    const hit = this.add.zone(slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width, slot.height).setName(`summon.${id}`);
    if (enabled) this.bindButton(hit, art, action);
    return hit;
  }

  private textButton(id: string, slot: ContentRect, label: string, action: () => void) {
    const frame = this.content.frame(`button.${id}`, summonTexture('plate'), slot, 'clean');
    this.content.field(`button.${id}`, rect(frame.bounds.x + 22, frame.bounds.y + 9, frame.bounds.width - 44, frame.bounds.height - 18),
      label, { size: 21, align: 'center' });
    const hit = this.add.zone(slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width, slot.height).setName(`summon.${id}`);
    this.bindButton(hit, frame.image, action);
  }

  private bindButton(hit: Phaser.GameObjects.Zone, art: Phaser.GameObjects.Image, action: () => void) {
    let pressed = false;
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => art.setTint(0xffe5ac));
    hit.on('pointerout', () => { pressed = false; art.clearTint(); });
    hit.on('pointerdown', () => { pressed = true; art.setTint(0xc4a56b); });
    hit.on('pointerup', () => { art.clearTint(); if (pressed && !this.busy) { pressed = false; action(); } });
  }

  private drawPortal() {
    const core = this.add.circle(0, 0, 104, 0x592c65, 0.67).setStrokeStyle(2, 0xe5afff, 0.8);
    const runes = this.add.graphics();
    runes.lineStyle(3, GOLD, 0.9).strokeCircle(0, 0, 129);
    runes.lineStyle(1, GOLD, 0.5).strokeCircle(0, 0, 143);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      runes.fillStyle(GOLD, 0.9).fillCircle(Math.cos(angle) * 136, Math.sin(angle) * 136, 3);
      runes.lineBetween(Math.cos(angle) * 116, Math.sin(angle) * 116,
        Math.cos(angle + Math.PI / 2) * 116, Math.sin(angle + Math.PI / 2) * 116);
    }
    this.tweens.add({ targets: runes, angle: 360, duration: 15000, repeat: -1 });
    this.tweens.add({ targets: core, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });
    const portal = this.add.container(640, PORTAL_Y, [core, runes]);
    for (let i = 0; i < 18; i++) {
      const x = 492 + (i * 73) % 296;
      const y = 263 + (i * 41) % 220;
      const spark = this.add.circle(x, y, 2 + i % 3, i % 2 ? GOLD : 0xe9b3ff, 0.78);
      this.tweens.add({ targets: spark, y: y - 64, alpha: 0, duration: 700 + i * 51,
        repeat: -1, delay: i * 36 });
    }
    return portal;
  }

  private showResults(draws: SummonReward[], instant: boolean) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = !instant && !reduced;
    const slots = summonCardSlots(draws.length === 1 ? 1 : 10);
    const reveals: { group: Phaser.GameObjects.Container; shape: Phaser.GameObjects.Graphics; tween: Phaser.Tweens.Tween }[] = [];
    draws.forEach((draw, i) => {
      const before = this.children.list.length;
      const hero = HERO_BY_ID[draw.heroId], box = slots[i];
      const art = summonCardArt(this, hero, box, i), cells = art.cells;
      this.content.region(`card.${i}`, box);this.content.region(`card.${i}.portrait`, cells.portrait);
      this.content.field(`card.${i}.badge`, cells.badge, hero.rarity,
        { size: draws.length === 1 ? 25 : 13, minSize: 7, padding: 0, align: 'center', color: '#fff2fc' });
      this.content.field(`card.${i}.name`, cells.name, hero.name,
        { size: draws.length === 1 ? 34 : 16, minSize: 8, padding: 1, wrap: true, maxLines: 2, align: 'center', color: '#ffe3a2' });
      this.content.field(`card.${i}.rank`, cells.rank, `${hero.rarity} · ${FactionConfig[heroFaction(hero)].name}`,
        { size: draws.length === 1 ? 27 : 15, minSize: 8, padding: 1, align: 'center', color: `#${art.color.toString(16)}` });
      this.content.field(`card.${i}.status`, cells.status, draw.shards ? `+${draw.shards} mảnh` : 'Tướng mới',
        { size: draws.length === 1 ? 29 : 16, minSize: 8, padding: 1, align: 'center', color: '#ffe3a2' });
      const group = this.add.container(0, 0, this.children.list.slice(before)).setName(`summon.reveal.${i}`);
      group.bringToTop(art.glow);
      if (!reduced && (hero.rarity === 'SSR' || hero.rarity === 'SSS+')) {
        this.tweens.add({ targets: art.glow, alpha: hero.rarity === 'SSS+' ? .85 : .7,
          delay: reveal ? i * 55 + 650 : 0, duration: hero.rarity === 'SSS+' ? 1000 : 1400,
          ease: 'Sine.inOut', yoyo: true, repeat: -1 });
        const sparkCount = hero.rarity === 'SSS+' ? 5 : 3;
        for (let n = 0; n < sparkCount; n++) {
          const spark = this.add.circle(box.x + box.width * (n % 2 ? .97 : .03),
            box.y + box.height * (n + 1) / (sparkCount + 1), 1.1, art.color, .5)
            .setBlendMode(Phaser.BlendModes.ADD).setName(`summon.spark.${i}.${n}`);
          group.add(spark);
          this.tweens.add({ targets: spark, y: spark.y - 12, alpha: .05,
            duration: 1400 + n * 110, delay: n * 180, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
        }
      }
      if (reveal) {
        // One transform/opacity timeline per entire card keeps portrait, frame and all labels together.
        const startScale = .985, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        group.setScale(startScale).setPosition(cx * (1 - startScale), cy * (1 - startScale) + 9).setAlpha(0);
        art.maskShape.setPosition(group.x, group.y).setScale(startScale);
        const tween = this.tweens.add({ targets: group, x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1,
          duration: draws.length === 1 ? 460 : 360, delay: i * 55, ease: 'Sine.out',
          onUpdate: () => art.maskShape.setPosition(group.x, group.y).setScale(group.scaleX),
          onComplete: () => art.maskShape.setPosition(0, 0).setScale(1) });
        reveals.push({ group, shape: art.maskShape, tween });
      }
    });
    if (reveal && draws.length > 1) this.textButton('skip', rect(30, 32, 180, 52), 'Hiện tất cả', () => {
      for (const item of reveals) {
        item.tween.stop();item.group.setPosition(0,0).setScale(1).setAlpha(1);item.shape.setPosition(0,0).setScale(1);
      }
    });
    const actions = [
      ['back', () => this.scene.restart({}), true], ['heroes', () => this.go('Heroes'), true],
      ['one', () => this.summon(1), this.canSummon(1)], ['ten', () => this.summon(10), this.canSummon(10)],
    ] as const;
    actions.forEach(([id, action, enabled], i) => this.artButton(id, rect(48 + i * 304, 656, 272, 58), action, enabled));
  }
}
