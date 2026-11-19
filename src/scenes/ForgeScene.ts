import Phaser from 'phaser';
import { cloudMessage, cloudRepository, playCommand } from '../cloud/cloudRepository';
import type { GameCommand } from '../cloud/gameProtocol';
import { EQUIPMENT, type EquipmentId } from '../data/equipmentConfig';
import { HERO_BY_ID } from '../data/heroes';
import { isSignature, SignatureConfig, signatureIds, type SignatureId } from '../data/signatureConfig';
import { enhancement, gearStats } from '../domain/equipment';
import { FORGE, weeklyWins } from '../domain/forge';
import { inventoryQuantity, ITEM_IDS } from '../domain/resources';
import { signatureNextCost, signatureNodes, signatureSpentThrough, signatureStarBonus,
  SIGNATURE_MAX_NODES, SIGNATURE_STAR_RULES_VERSION } from '../domain/signatureStars';
import { gameStore } from '../domain/store';
import { forgeTexture, loadDivineForge } from '../ui/divineForgeAssets';
import { loadSharedUi, UI_FONT } from '../ui/sharedUi';
import { readSafeInsets } from '../ui/viewport';

interface ForgeEntry {
  itemId?: EquipmentId;
  returnHeroId?: string;
  gearUid?: string;
}

interface ForgeAttempt {
  command: Extract<GameCommand, { type: 'forge' | 'signatureStar' }>;
  itemId: EquipmentId;
  cost: number;
}
type Modal =
  | { kind: 'shortage' | 'confirm' | 'pending' | 'success'; attempt: ForgeAttempt }
  | { kind: 'error'; attempt: ForgeAttempt; message: string };

type ButtonKind = 'gold' | 'red' | 'back';
type Rect = [x: number, y: number, width: number, height: number];
const number = new Intl.NumberFormat('vi-VN');
const cream = '#fff0c8';
const gold = '#ffda8c';

export class ForgeScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  private motion: Phaser.Tweens.Tween[] = [];
  private entry: ForgeEntry = {};
  private gearUid?: string;
  private selected: EquipmentId = signatureIds[0];
  private signature: SignatureId = signatureIds[0];
  private modal?: Modal;
  private uid?: string;
  private session = 0;
  private pressedAt?: { id: number; x: number };
  private width = 1280;
  private height = 720;

  constructor() { super('Forge'); }

  preload() {
    loadSharedUi(this);
    loadDivineForge(this);
  }

  create(data: ForgeEntry = {}) {
    this.entry = data;
    this.signature = data.itemId && isSignature(data.itemId) ? data.itemId : signatureIds[0];
    this.selected = data.itemId && FORGE.weapons.includes(data.itemId as typeof FORGE.weapons[number])
      ? data.itemId : this.signature;
    this.gearUid = data.gearUid;
    this.uid = cloudRepository.uid;
    this.modal = undefined;
    this.pressedAt = undefined;
    this.render();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.render);
    this.input.keyboard?.on('keydown-ESC', this.escape);
    this.input.on('pointerup', this.releaseStrip);
    this.input.on('pointerupoutside', this.releaseStrip);
    window.addEventListener('3q:cloud-save', this.cloudChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session++;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.render);
      this.input.keyboard?.off('keydown-ESC', this.escape);
      this.input.off('pointerup', this.releaseStrip);
      this.input.off('pointerupoutside', this.releaseStrip);
      window.removeEventListener('3q:cloud-save', this.cloudChanged);
      this.clearMotion();
    });
  }

  private clearMotion() {
    this.motion.forEach(tween => tween.remove());
    this.motion = [];
  }

  private cloudChanged = () => {
    if (this.uid !== cloudRepository.uid) {
      this.scene.start('Boot');
      return;
    }
    if (this.modal?.kind !== 'pending') this.render();
  };

  private closeModal() {
    if (this.modal?.kind === 'pending') return;
    this.modal = undefined;
    this.render();
  }

  private escape = () => {
    if (this.modal) this.closeModal();
    else this.back();
  };

  private back() {
    const heroId = this.entry.returnHeroId;
    if (heroId) this.scene.start('Heroes', { heroId, tab: 'signature', signatureId: this.signature,
      signatureUid: this.selected === this.signature ? this.gear().display?.uid : undefined });
    else this.scene.start('Inventory');
  }

  private get shards() {
    return inventoryQuantity(gameStore.snapshot, ITEM_IDS.forgeShard);
  }

  private attempt(): ForgeAttempt | undefined {
    const itemId = this.selected;
    const item = this.gear().display;
    if (isSignature(itemId) && item) {
      const expectedNodes = signatureNodes(item.signatureNodes);
      const cost = signatureNextCost(expectedNodes);
      if (cost === undefined) return;
      return { itemId, cost, command: { type: 'signatureStar', uid: item.uid, expectedNodes,
        rulesVersion: SIGNATURE_STAR_RULES_VERSION } };
    }
    const expectedCrafted = gameStore.snapshot.forge?.crafted;
    if (expectedCrafted === undefined) return;
    return { itemId, cost: FORGE.shardsRequired, command: { type: 'forge', itemId, expectedCrafted } };
  }

  private openForge() {
    if (this.modal || !cloudRepository.active) return;
    const attempt = this.attempt();
    if (!attempt) return;
    this.modal = { kind: this.shards < attempt.cost ? 'shortage' : 'confirm', attempt };
    this.render();
  }

  private async forge(attempt: ForgeAttempt) {
    if (this.modal?.kind !== 'confirm' && this.modal?.kind !== 'error') return;
    const session = this.session;
    this.modal = { kind: 'pending', attempt };
    this.render();
    try {
      const result = await playCommand<boolean>(attempt.command);
      if (session !== this.session || this.uid !== cloudRepository.uid) return;
      if (result !== true) throw new Error('Máy chủ chưa xác nhận giao dịch.');
      if (attempt.command.type === 'forge' && isSignature(attempt.itemId))
        this.gearUid = `forge:${attempt.command.expectedCrafted + 1}`;
      this.modal = { kind: 'success', attempt };
    } catch (error) {
      if (session !== this.session || this.uid !== cloudRepository.uid) return;
      const message = error instanceof Error && error.message
        ? error.message : 'Không thể kết nối máy chủ.';
      this.modal = { kind: 'error', attempt, message };
    }
    this.render();
  }

  private choose(id: EquipmentId) {
    if (this.modal || id === this.selected) return;
    this.selected = id;
    this.gearUid = undefined;
    if (isSignature(id)) this.signature = id;
    this.render(true);
  }

  private releaseStrip = (pointer: Phaser.Input.Pointer) => {
    const start = this.pressedAt;
    this.pressedAt = undefined;
    if (!start || start.id !== pointer.id || this.modal) return;
    const dx = (pointer.x - start.x) / this.root.scaleX;
    if (Math.abs(dx) < 26) return;
    const items = isSignature(this.selected) ? signatureIds : FORGE.weapons;
    const at = items.findIndex(id => id === this.selected);
    const id = items[Phaser.Math.Clamp(at + (dx < 0 ? 1 : -1), 0, items.length - 1)];
    this.choose(id);
  };

  private render = (changed: boolean | Phaser.Structs.Size = false) => {
    this.clearMotion();
    this.root?.destroy();
    const { width, height } = this.scale.gameSize;
    const css = this.game.canvas.getBoundingClientRect();
    const safe = readSafeInsets(css.width / width);
    const availW = width - safe.left - safe.right;
    const availH = height - safe.top - safe.bottom;
    const mobile = css.height <= 510 || css.width < 900;
    this.height = mobile ? 390 : 720;
    this.width = mobile ? Phaser.Math.Clamp(availW / availH * 390, 680, 1000) : 1280;
    const scale = Math.min(availW / this.width, availH / this.height);
    this.cameras.main.setSize(width, height).setScroll(0, 0);
    this.root = this.add.container(safe.left + (availW - this.width * scale) / 2,
      safe.top + (availH - this.height * scale) / 2).setScale(scale);
    this.content = this.root;
    const canvas: Rect = [-this.root.x / scale, -this.root.y / scale, width / scale, height / scale];
    const bg = this.texture('hall', canvas);
    bg.setScale(Math.max(canvas[2] / bg.width, canvas[3] / bg.height));
    this.content.add(this.add.rectangle(canvas[0], canvas[1], canvas[2], canvas[3], 0x220903, .34).setOrigin(0));

    this.header(mobile);
    if (mobile) {
      const previewW = Math.round(this.width * .367);
      const rightX = previewW + 15;
      const rightW = this.width - rightX - 8;
      this.collection([8, 52, this.width - 16, 84], true);
      this.preview([8, 143, previewW, 239], true, changed === true);
      this.details([rightX, 143, rightW, 188], true);
      const buttonW = (rightW - 10) / 2;
      this.actions([rightX, 338, buttonW, 44], [rightX + buttonW + 10, 338, buttonW, 44]);
    } else {
      this.collection([24, 122, 284, 550], false);
      this.preview([320, 122, 538, 550], false, changed === true);
      this.details([870, 122, 386, 475], false);
      this.actions([415, 604, 348, 56], [892, 604, 342, 56]);
    }
    if (this.modal) this.drawModal(canvas, mobile);
  };

  private texture(id: string, box: Rect, opacity = 1, raw = false) {
    const [x, y, w, h] = box;
    const image = this.add.image(x + w / 2, y + h / 2, raw ? id : forgeTexture(id));
    image.setScale(Math.min(w / image.width, h / image.height)).setAlpha(opacity);
    this.content.add(image);
    return image;
  }

  // Nine-slice frames preserve corner proportions when a panel changes aspect ratio.
  private frame(id: string, box: Rect, corner: number, alpha = 1) {
    const [x, y, w, h] = box;
    if (this.game.renderer instanceof Phaser.Renderer.Canvas.CanvasRenderer) {
      return this.texture(id, box, alpha).setDisplaySize(w, h);
    }
    const panel = this.add.nineslice(x + w / 2, y + h / 2, forgeTexture(id), undefined,
      w * 2, h * 2, corner, corner, corner, corner).setScale(.5).setAlpha(alpha);
    this.content.add(panel);
    return panel;
  }

  private label(value: string, box: Rect, size: number, options: { left?: boolean; color?: string; wrap?: boolean } = {}) {
    const [x, y, w, h] = box;
    const text = this.add.text(options.left ? x : x + w / 2, y + h / 2, value, {
      fontFamily: `${UI_FONT}, Georgia, serif`, fontStyle: 'bold', fontSize: size,
      color: options.color ?? cream, align: options.left ? 'left' : 'center', resolution: 2,
      padding: { top: 2, bottom: 2 }, shadow: { offsetY: 1, color: '#180906', blur: 2, fill: true },
      wordWrap: options.wrap ? { width: w, useAdvancedWrap: true } : undefined,
    }).setOrigin(options.left ? 0 : .5, .5);
    while ((text.width > w || text.height > h) && size > 11) text.setFontSize(--size);
    this.content.add(text);
    return text;
  }

  private hit(name: string, box: Rect) {
    const [x, y, w, h] = box;
    const hit = this.add.zone(x + w / 2, y + h / 2, w, h).setName(`forge.${name}`);
    this.content.add(hit);
    return hit;
  }

  private button(name: string, value: string, box: Rect, kind: ButtonKind, action?: () => void,
    options: { muted?: boolean; icon?: string } = {}) {
    const [x, y, w, h] = box;
    const state = !action || options.muted ? 'disabled' : 'normal';
    const art = this.frame(`${kind}.${state}`, box, 28);
    if (options.icon) this.texture(options.icon, [x + 8, y + 6, h - 12, h - 12]);
    const pad = options.icon ? h : 12;
    this.label(value, [x + pad, y, w - pad - 12, h], h >= 50 ? 23 : 16,
      { color: state === 'disabled' ? '#e6c496' : kind === 'gold' ? '#fff7d7' : cream });
    if (!action) return;
    const target = this.hit(name, box).setInteractive({ useHandCursor: true });
    const texture = (next: string) => {
      const key = forgeTexture(`${kind}.${next}`);
      if (!options.muted && this.textures.exists(key)) art.setTexture(key);
    };
    target.on('pointerover', () => texture('hover'))
      .on('pointerout', () => texture('normal'))
      .on('pointerdown', () => texture('pressed'))
      .on('pointerup', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        texture('normal');
        action();
      });
  }

  private header(mobile: boolean) {
    const walletW = mobile ? Math.min(193, Math.floor(this.width * .25)) : 240;
    const titleW = Math.min(mobile ? 428 : 679, this.width - 2 * walletW);
    const walletX = this.width - walletW - (mobile ? 8 : 24);
    const titleBox: Rect = [(this.width - titleW) / 2, mobile ? 1 : 5, titleW, mobile ? 49 : 103];
    this.texture('title', titleBox);
    const titleInset = mobile ? titleW * .12 : 72;
    this.label('Lò Rèn Thần Binh', [titleBox[0] + titleInset, titleBox[1] + 3, titleW - 1.65 * titleInset, titleBox[3]],
      mobile ? 23 : 33,
      { color: gold });
    this.button('return', this.entry.returnHeroId ? '← Thần Binh' : '← Trở về',
      mobile ? [8, 4, 130, 44] : [24, 28, 194, 55], 'back', () => this.back());
    const walletBox: Rect = [walletX, mobile ? 5 : 28, walletW, mobile ? 42 : 55];
    this.frame('wallet', walletBox, 28);
    this.texture('shard', [walletX + 8, walletBox[1] + 4, walletBox[3] - 8, walletBox[3] - 8]);
    this.label(`${number.format(this.shards)} Mảnh Thần Binh`,
      [walletX + walletBox[3], walletBox[1], walletW - walletBox[3] - 9, walletBox[3]], mobile ? 15 : 17, { color: gold });
  }

  private gear(id = this.selected) {
    const copies = (gameStore.snapshot.equipment ?? []).filter(item => item.itemId === id);
    const equipped = copies.find(item => item.heroId);
    const display = (id === this.selected ? copies.find(item => item.uid === this.gearUid) : undefined)
      ?? equipped ?? copies[0];
    return { copies, equipped, display };
  }

  private collection([x, y, w, h]: Rect, mobile: boolean) {
    this.frame('panel', [x, y, w, h], 110);
    const signature = isSignature(this.selected);
    const options: readonly EquipmentId[] = signature ? signatureIds : FORGE.weapons;
    const switchSet = () => this.choose(signature ? FORGE.weapons[0] : this.signature);
    if (mobile) {
      this.button('collection', signature ? 'Vũ khí' : 'Thần Binh', [x + w - 69, y + 20, 64, 44], 'red', switchSet);
      const area = w - 81;
      const pitch = area / options.length;
      options.forEach((id, index) => this.card(id, [x + 5 + index * pitch, y + 5, pitch - 4, h - 10], true));
      return;
    }
    this.label(signature ? 'Bộ sưu tập Thần Binh' : 'Vũ khí SSR', [x + 22, y + 15, w - 44, 34], 20, { color: gold });
    this.texture('divider', [x + 22, y + 47, w - 44, 14]);
    const gap = 8;
    const cardW = (w - 28 - gap) / 2;
    options.forEach((id, index) => this.card(id, [
      x + 14 + (index % 2) * (cardW + gap), y + 61 + Math.floor(index / 2) * 142, cardW, 134,
    ], false));
    this.button('collection', signature ? 'Vũ khí SSR khác' : 'Bộ sưu tập Thần Binh',
      [x + 35, y + h - 54, w - 70, 42], 'red', switchSet);
  }

  private weapon(id: EquipmentId, box: Rect, thumb = false) {
    return isSignature(id) ? this.texture(thumb ? `${id}.thumb` : id, box)
      : this.texture(`gear-${EQUIPMENT[id].art}`, box, 1, true);
  }

  private card(id: EquipmentId, box: Rect, mobile: boolean) {
    const [x, y, w, h] = box;
    const { equipped, display } = this.gear(id);
    const frame = equipped ? 'equipped' : display ? 'owned' : 'locked';
    this.frame(this.selected === id ? 'selected' : frame, box, 34);
    if (this.selected === id) this.texture('divider', [x + 9, y + 2, w - 18, 8]);
    const icon = this.weapon(id, [x + 9, y + 2, w - 18, h - (mobile ? 31 : 49)], true);
    if (!display || equipped) this.texture(equipped ? 'worn' : 'lock', [x + 4, y + 4, 19, 19]);
    this.label(EQUIPMENT[id].name, [x + 6, y + h - (mobile ? 31 : 49), w - 12, mobile ? 25 : 28],
      mobile ? 12 : 13, { wrap: true });
    if (!mobile) this.label(equipped ? 'Đang trang bị' : display ? 'Đã sở hữu' : 'Chưa sở hữu',
      [x + 11, y + h - 22, w - 22, 16], 11, { color: equipped ? '#c7ef9b' : '#ecd3a1' });
    if (this.modal) return;
    const hit = this.hit(`weapon.${id}`, box).setInteractive({ useHandCursor: true });
    const rest = icon.scaleX;
    hit.on('pointerover', () => icon.setScale(rest * 1.05)).on('pointerout', () => icon.setScale(rest))
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        icon.setScale(rest * .96);
        if (mobile) this.pressedAt = { id: pointer.id, x: pointer.x };
      }).on('pointerup', (pointer: Phaser.Input.Pointer) => {
        icon.setScale(rest);
        if (!mobile || !this.pressedAt || Math.abs(pointer.x - this.pressedAt.x) < 26 * this.root.scaleX) {
          this.pressedAt = undefined;
          this.choose(id);
        }
      });
  }

  private preview([x, y, w, h]: Rect, mobile: boolean, changed: boolean) {
    const id = this.selected;
    this.frame('center', [x, y, w, h], 76, .78);
    const signature = isSignature(id);
    const { copies, display } = this.gear();
    const nodes = signature && display ? signatureNodes(display.signatureNodes) : 0;
    const artHeight = signature ? (mobile ? 133 : 348) : (mobile ? 158 : 380);
    const halo = this.texture('glow', [x + w * .10, y + 4, w * .80, artHeight], .64);
    if (isSignature(id)) halo.setTint(SignatureConfig[id].color);
    this.texture('altar', [x + w * .10, y + artHeight - (mobile ? 44 : 107), w * .80, mobile ? 56 : 140], .43);
    this.texture('brazier', [x + w * .12, y + artHeight - (mobile ? 65 : 144), w * .76, mobile ? 81 : 181]);
    this.texture('embers', [x + w * .06, y + 10, w * .88, artHeight], .78);
    const art = this.weapon(id, [x + w * .17, y + (mobile ? 1 : 8), w * .66, artHeight - (mobile ? 8 : 22)]);
    const nameY = y + artHeight - (mobile ? 8 : 18);
    this.frame('name', [x + w * .08, nameY, w * .84, mobile ? 33 : 46], 32);
    this.label(EQUIPMENT[id].name, [x + w * .15, nameY, w * .70, mobile ? 33 : 46], mobile ? 17 : 26, { color: gold })
      .setName('forge.preview.name');
    if (signature) {
      const starY = nameY + (mobile ? 33 : 45);
      this.drawStars([x + w * .12, starY, w * .76, mobile ? 31 : 48], nodes);
      if (display && copies.length > 1) {
        const index = copies.indexOf(display);
        this.button('copy', `Bản ${index + 1}/${copies.length}`, [x + w - 101, y + 8, 91, 44], 'back',
          this.modal ? undefined : () => {
            this.gearUid = copies[(index + 1) % copies.length].uid;
            this.render();
          });
      }
    }
    const cost = this.attempt()?.cost;
    const progressY = nameY + (signature ? (mobile ? 68 : 101) : (mobile ? 34 : 48));
    const progress = cost === undefined ? `${number.format(signatureSpentThrough(nodes))} mảnh tích lũy`
      : `${number.format(this.shards)}/${number.format(cost)} Mảnh Thần Binh`;
    this.label(progress, [x + 12, progressY, w - 24, mobile ? 21 : 27], mobile ? 14 : 19);
    const bar: Rect = [x + w * .15, progressY + (mobile ? 24 : 29), w * .70, mobile ? 12 : 16];
    this.frame('track', bar, 12);
    const fraction = cost === undefined ? 1 : Math.min(1, this.shards / cost);
    if (fraction > 0) {
      const fillW = (bar[2] - 6) * fraction;
      this.texture('fill', [bar[0] + 3, bar[1] + 2, fillW, bar[3] - 4]).setDisplaySize(fillW, bar[3] - 4);
    }
    if (!this.modal) {
      const restingY = art.y;
      if (changed) {
        art.setAlpha(.35);
        this.motion.push(this.tweens.add({ targets: art, alpha: 1, duration: 180, ease: 'Sine.Out' }));
      }
      this.motion.push(this.tweens.add({ targets: art, y: restingY - (mobile ? 3 : 7),
        ease: 'Sine.InOut', duration: 1350, yoyo: true, repeat: -1 }));
    }
  }

  private drawStars([x, y, w, h]: Rect, nodes: number, flashNode?: number) {
    const petals = 5;
    const groups = SIGNATURE_MAX_NODES / petals;
    const pitch = w / groups;
    const radius = Math.min(h * .46, pitch * .38);
    const center = new Phaser.Math.Vector2();
    const outline = Array.from({ length: petals * 2 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / petals;
      const length = index % 2 === 0 ? radius : radius * .43;
      return new Phaser.Math.Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
    });

    for (let star = 0; star < groups; star++) {
      const position = { x: x + (star + .5) * pitch, y: y + h / 2 + radius * .09 };
      const graphic = this.add.graphics(position);
      this.content.add(graphic);
      for (let petal = 0; petal < petals; petal++) {
        const node = star * petals + petal + 1;
        const tip = outline[2 * petal];
        const left = outline[(2 * petal + outline.length - 1) % outline.length];
        const right = outline[2 * petal + 1];
        const filled = node <= nodes;
        graphic.fillStyle(filled ? 0xffdf74 : 0x432722).fillPoints([center, left, tip], true);
        graphic.fillStyle(filled ? 0xe4a53c : 0x2c1a1c).fillPoints([center, tip, right], true);
        graphic.lineStyle(.7, filled ? 0x9d6029 : 0x694331).strokePoints([left, center, right]);
        if (filled && node === flashNode) {
          const flash = this.add.graphics(position).fillStyle(0xfff7ce).fillPoints([center, left, tip, right], true);
          this.content.add(flash);
          this.motion.push(this.tweens.add({ targets: flash, alpha: { from: .9, to: 0 },
            duration: 650, ease: 'Sine.Out' }));
        }
      }
      const completed = nodes >= (star + 1) * petals;
      if (completed) graphic.lineStyle(3, 0xffb73f, .28).strokePoints(outline, true);
      graphic.lineStyle(1.2, completed ? 0xffeb99 : 0xbb8950).strokePoints(outline, true);
    }
  }

  private details([x, y, w, h]: Rect, mobile: boolean) {
    const id = this.selected;
    const signature = isSignature(id) ? SignatureConfig[id] : undefined;
    const { copies, display } = this.gear(id);
    const equipped = display?.heroId ? display : undefined;
    const nodes = signature && display ? signatureNodes(display.signatureNodes) : 0;
    const bonus = signatureStarBonus(nodes);
    const pct = (value: number) => number.format(Number(value.toFixed(1)));
    const ownerBonus = `Chủ: HP +${pct(bonus.hpPct)}% · Công +${pct(bonus.atkPct)}% · Thủ +${pct(bonus.defPct)}%`;
    const skillSummary = signature ? `${nodes}/${SIGNATURE_MAX_NODES} cánh · Tuyệt kỹ +${pct(signature.bonus * 100 + bonus.skillPct)}% · Hào quang +${pct(bonus.teamAuraPct)}%` : '';
    const stats = display ? gearStats(display) : gearStats({ uid: '', itemId: id, level: 1 });
    const titleW = w - 86;
    const weapon = EQUIPMENT[id];
    this.frame('panel', [x, y, w, h], 110);
    this.texture('rarity', [x + 10, y + 7, mobile ? 51 : 59, mobile ? 33 : 46]);
    this.label(weapon.rarity, [x + 10, y + 7, mobile ? 51 : 59, mobile ? 33 : 46], mobile ? 14 : 18, { color: gold });
    this.label(weapon.name, [x + 68, y + (mobile ? 9 : 13), titleW - 24, mobile ? 29 : 37], mobile ? 17 : 21,
      { left: true, color: gold });
    const hero = signature ? HERO_BY_ID[signature.hero]?.name : undefined;
    const owner = equipped?.heroId ? HERO_BY_ID[equipped.heroId]?.name : undefined;
    const status = equipped ? (owner ? `Đang trang bị · ${owner}` : 'Đang trang bị')
      : copies.length ? `Đã sở hữu · ${number.format(copies.length)} món` : 'Chưa sở hữu';
    const stage = FORGE.weekly.stage;
    const first = Object.entries(FORGE.firstClear).map(([id, amount]) => `${id} +${amount}`).join('  •  ');
    const week = weeklyWins(gameStore.snapshot.forge);
    const statEntries: [string, number][] = [['HP', stats.hp], ['Công', stats.atk], ['Thủ', stats.def]];
    if (stats.speed) statEntries.push(['Tốc độ', stats.speed]);
    const level = display ? `+${enhancement(display)}` : '+0';
    if (mobile) {
      this.label([hero ? `Độc quyền: ${hero}` : 'Vũ khí SSR', status].join('  ·  '),
        [x + 15, y + 38, w - 30, 24], 13);
      this.texture('divider', [x + 20, y + 61, w - 40, 8]);
      this.label(`${level}   ${statEntries.map(([name, value]) => `${name} +${number.format(value)}`).join('  ·  ')}`,
        [x + 14, y + 67, w - 28, 23], 15, { color: gold });
      if (signature) {
        this.label(ownerBonus, [x + 12, y + 91, w - 24, 20], 14);
        this.label(skillSummary, [x + 12, y + 110, w - 24, 20], 14, { color: gold });
      }
      this.label(`Mảnh Thần Binh · Lần đầu: ${first}`, [x + 12, y + 130, w - 24, 21], 14, { color: gold });
      this.label(`Thắng lại ${stage}: +${FORGE.weekly.shards} mảnh · Tuần này ${week}/${FORGE.weekly.limit}`,
        [x + 12, y + 151, w - 24, 22], 14);
      return;
    }
    this.label(hero ? `Võ tướng độc quyền · ${hero}` : 'Vũ khí SSR', [x + 21, y + 57, w - 42, 27], 17);
    this.label(status, [x + 21, y + 84, w - 42, 27], 16, { color: equipped ? '#c9ef9e' : '#f8d6a1' });
    this.texture('divider', [x + 24, y + 111, w - 48, 15]);
    this.label(`Thuộc tính ${level}`, [x + 24, y + 128, w - 48, 29], 20, { color: gold });
    statEntries.forEach(([name, value], index) => {
      const inset = 37;
      this.label(name, [x + inset, y + 162 + index * 23, w / 2, 23], 16, { left: true });
      this.label(`+${number.format(value)}`, [x + w - 126, y + 162 + index * 23, 100, 23], 17, { color: '#fbdf92' });
    });
    const infoY = y + 249;
    this.label(signature ? ownerBonus : 'Hiệu lực theo thuộc tính trang bị',
      [x + 24, infoY, w - 48, 25], 16);
    if (signature) this.label(skillSummary, [x + 26, infoY + 27, w - 52, 25], 16, { color: gold });
    this.texture('divider', [x + 24, infoY + 59, w - 48, 14]);
    this.label('Nguồn Mảnh Thần Binh', [x + 20, infoY + 73, w - 40, 28], 19, { color: gold });
    const sources = [
      { title: 'Thưởng vượt ải lần đầu', detail: first, icon: 'campaign' },
      { title: `Thắng lại ${stage} · +${FORGE.weekly.shards} mảnh`, detail: `Tuần này: ${week}/${FORGE.weekly.limit} lượt · Làm mới thứ Hai`, icon: 'shard' },
    ];
    sources.forEach((source, index) => {
      const rowY = infoY + 103 + index * 52;
      this.frame('reward', [x + 19, rowY, w - 38, 47], 54);
      this.texture(source.icon, [x + 31, rowY + 8, 31, 31]);
      this.label(source.title, [x + 70, rowY + 6, w - 96, 17], 14, { left: true, color: gold });
      this.label(source.detail, [x + 70, rowY + 23, w - 96, 17], 12, { left: true });
    });
  }

  private actions(craft: Rect, campaign: Rect) {
    const attempt = this.attempt();
    const upgrade = attempt?.command.type === 'signatureStar';
    const label = attempt ? `${upgrade ? 'Nâng cánh sao' : 'Rèn'} · ${number.format(attempt.cost)} mảnh` : 'Đã đạt 5 sao vàng';
    this.button(upgrade ? 'star' : 'craft', label, craft, 'gold',
      this.modal || !attempt || !cloudRepository.active ? undefined : () => this.openForge(),
      { icon: 'anvil', muted: !attempt || this.shards < attempt.cost });
    this.button('campaign', 'Đến Chinh Chiến', campaign, 'red',
      this.modal ? undefined : () => this.scene.start('Campaign'), { icon: 'campaign' });
  }

  private drawModal(canvas: Rect, mobile: boolean) {
    const modal = this.modal!;
    const blocker = this.add.rectangle(canvas[0], canvas[1], canvas[2], canvas[3], 0x150606, .82)
      .setOrigin(0).setInteractive();
    blocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
    this.content.add(blocker);
    const w = mobile ? 474 : 570, h = mobile ? 316 : 400;
    const x = (this.width - w) / 2, y = (this.height - h) / 2;
    const success = modal.kind === 'success';
    const { attempt } = modal;
    const upgrade = attempt.command.type === 'signatureStar' ? attempt.command : undefined;
    this.frame(success ? 'success' : 'panel', [x, y, w, h], 110);
    if (!success) this.frame('parchment', [x + 18, y + 52, w - 36, h - 70], 100);
    this.texture('title', [x + 24, y - 13, w - 48, 80]);
    const title = { shortage: 'Không đủ mảnh', confirm: upgrade ? 'Xác nhận nâng cánh' : 'Xác nhận rèn',
      pending: upgrade ? 'Đang nâng cánh…' : 'Đang rèn…',
      success: upgrade ? 'Nâng cánh thành công' : 'Rèn thành công', error: 'Chưa xác nhận giao dịch' }[modal.kind];
    this.label(title, [x + 63, y, w - 115, 54], mobile ? 24 : 28, { color: gold });
    const artHeight = mobile ? 120 : 159;
    const artBox: Rect = [x + w * .28, y + 56, w * .44, artHeight];
    if (success) {
      const flare = this.texture('sigil', [x + 18, y + 45, w - 36, artHeight + 27], .65);
      this.motion.push(this.tweens.add({ targets: flare, alpha: { from: .55, to: 1 }, duration: 700,
        ease: 'Sine.InOut', yoyo: true, repeat: 1 }));
      this.texture('embers', [x + 30, y + 60, w - 60, artHeight]);
    }
    if (modal.kind === 'shortage') this.texture('shard', artBox);
    else this.weapon(attempt.itemId, artBox);
    const lineY = artBox[1] + artHeight + 4;
    const name = modal.kind === 'shortage' ? 'Mảnh Thần Binh'
      : EQUIPMENT[attempt.itemId].name;
    const description = modal.kind === 'shortage'
      ? `Hiện có ${number.format(this.shards)}/${attempt.cost} mảnh · Còn thiếu ${Math.max(0, attempt.cost - this.shards)}`
      : modal.kind === 'success' ? (upgrade ? ''
        : 'Vũ khí đã được lưu vào Túi Đồ.')
      : modal.kind === 'confirm' ? (upgrade ? `${upgrade.expectedNodes} → ${upgrade.expectedNodes + 1} cánh · Dùng ${attempt.cost} mảnh.`
        : `Dùng ${attempt.cost} Mảnh Thần Binh từ kho chung.`)
      : modal.kind === 'pending' ? 'Đang chờ xác nhận từ máy chủ.'
      : modal.kind === 'error' ? modal.message : '';
    this.label(name, [x + 24, lineY, w - 48, 32], 22, { color: success ? gold : '#45140c' });
    if (success && upgrade) {
      const confirmed = gameStore.snapshot.equipment?.find(item => item.uid === upgrade.uid);
      const nodes = confirmed ? signatureNodes(confirmed.signatureNodes) : 0;
      this.drawStars([x + w * .18, lineY + 31, w * .64, mobile ? 36 : 51], nodes, upgrade.expectedNodes + 1);
    } else {
      this.label(description, [x + 26, lineY + 34, w - 52, mobile ? 42 : 55], 16,
        { color: success ? cream : '#522314', wrap: true });
    }
    const buttonY = y + h - 64;
    const left: Rect = [x + 35, buttonY, w / 2 - 46, 47];
    const right: Rect = [x + w / 2 + 11, buttonY, w / 2 - 46, 47];
    if (modal.kind === 'success' || modal.kind === 'pending') {
      this.button('close', success ? 'Đồng ý' : 'Đang chờ máy chủ', [x + w * .23, buttonY, w * .54, 47], 'gold',
        success ? () => this.closeModal() : undefined);
    } else {
      this.button('cancel', modal.kind === 'confirm' ? 'Hủy' : 'Đóng', left, 'back', () => this.closeModal());
      if (modal.kind === 'shortage') this.button('modal.campaign', 'Đến Chinh Chiến', right, 'gold',
        () => this.scene.start('Campaign'));
      else if (modal.kind === 'error' && modal.message === cloudMessage('conflict')) {
        this.button('confirm', 'Xem lại yêu cầu', right, 'gold', () => {
          this.modal = undefined;
          this.openForge();
        });
      } else {
        this.button('confirm', modal.kind === 'error' ? 'Thử lại' : upgrade ? 'Xác nhận nâng' : 'Xác nhận rèn', right, 'gold',
          () => void this.forge(attempt));
      }
    }
  }
}
