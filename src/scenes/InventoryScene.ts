import Phaser from 'phaser';
import { gameStore } from '../domain/store';
import { HERO_BY_ID } from '../data/heroes';
import { cloudRepository } from '../cloud/cloudRepository';
import { UiScene } from '../ui/UiScene';
import { LobbyContent } from '../ui/LobbyContent';
import { rect, type ContentRect } from '../ui/lobbyContentLayout';
import { coverScale, readSafeInsets } from '../ui/viewport';
import { PORTRAITS, PORTRAIT_TILE, atlasOrder } from '../ui/heroPresentation';
import { inventoryEntries, filterInventory, INVENTORY_TABS, type InventoryCategory, type InventoryEntry } from '../ui/inventoryModel';
import { COLLECTION_INFO, collectionEntries, isCollectionId, type CollectionId } from '../ui/inventoryCollections';
import { inventoryLayout, INVENTORY_SLOT_CONTENT } from '../ui/inventoryLayout';
import { INVENTORY_FONT, loadInventoryArt, inventoryKey, type InventoryArt } from '../ui/inventoryAssets';

/** Read-only view of confirmed inventory. Spending stays in existing server-backed destinations. */
export class InventoryScene extends UiScene {
  private content!: LobbyContent;
  private tab: InventoryCategory = 'all';
  private collection?: CollectionId;
  private selected?: string;
  private offset = 0;
  private detailOpen = false;
  private compact = false;
  private grid?: Phaser.GameObjects.Container;
  private clip?: Phaser.Display.Masks.GeometryMask;
  private clipShape?: Phaser.GameObjects.Graphics;
  private highlight?: Phaser.GameObjects.Image;
  private scrollbar?: Phaser.GameObjects.Graphics;
  private layout!: ReturnType<typeof inventoryLayout>;
  private entries: InventoryEntry[] = [];
  private owner?: string;
  private signature = '';
  private lastCheck = 0;
  private drag?: { y: number; offset: number; moved: boolean };

  constructor() { super('Inventory'); }
  // Actual viewport coordinates; other UiScene cameras retain their authored layout.
  init({ collection }: { collection?: string } = {}) { this.collection = isCollectionId(collection) ? collection : undefined;
    this.tab = 'all'; this.selected = undefined; this.offset = 0; this.detailOpen = false; this.signature = ''; this.lastCheck = 0; }
  preload() {
    loadInventoryArt(this);
    if (!this.textures.exists(PORTRAITS)) this.load.spritesheet(PORTRAITS,
      `${import.meta.env.BASE_URL}assets/heroes/portraits.webp`, { frameWidth: PORTRAIT_TILE, frameHeight: PORTRAIT_TILE });
  }
  create() {
    this.content = new LobbyContent(this, { fastFit: true, fontFamily: INVENTORY_FONT, resolution: 2, textPaddingY: 2 });
    this.owner = cloudRepository.uid;
    this.render();
    const resize = () => this.render();
    const wheel = (pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      const v = this.layout.viewport;
      if (!this.detailOpen && pointer.worldX >= v.x && pointer.worldX <= v.x + v.width && pointer.worldY >= v.y && pointer.worldY <= v.y + v.height) this.scrollTo(this.offset + dy);
    };
    const move = (pointer: Phaser.Input.Pointer) => {
      if (!this.drag || !pointer.isDown) return;
      if (Math.abs(pointer.worldY - this.drag.y) > 8) this.drag.moved = true;
      if (this.drag.moved) this.scrollTo(this.drag.offset + this.drag.y - pointer.worldY);
    };
    const up = () => { this.drag = undefined; };
    const escape = () => { if (this.detailOpen) { this.detailOpen = false; this.render(); } else this.go('Lobby'); };
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.input.on('wheel', wheel); this.input.on('pointermove', move); this.input.on('pointerup', up);
    this.input.keyboard?.on('keydown-ESC', escape);
    const pageDown = () => this.scrollTo(this.offset + this.layout.viewport.height * .8);
    const pageUp = () => this.scrollTo(this.offset - this.layout.viewport.height * .8);
    this.input.keyboard?.on('keydown-PAGEDOWN', pageDown); this.input.keyboard?.on('keydown-PAGEUP', pageUp);
    this.events.once('shutdown', () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);
      this.input.off('wheel', wheel); this.input.off('pointermove', move); this.input.off('pointerup', up);
      this.input.keyboard?.off('keydown-ESC', escape);
      this.input.keyboard?.off('keydown-PAGEDOWN', pageDown); this.input.keyboard?.off('keydown-PAGEUP', pageUp);
      this.destroyClip();
    });
    this.cameras.main.fadeIn(150, 17, 14, 20);
  }
  update(time: number) {
    if (time - this.lastCheck < 250) return;
    this.lastCheck = time;
    const owner = cloudRepository.uid;
    const signature = JSON.stringify(this.collection ? collectionEntries(gameStore.snapshot, this.collection) : inventoryEntries(gameStore.snapshot));
    const ownerChanged = owner !== this.owner;
    if (ownerChanged) {
      this.owner = owner; this.selected = undefined; this.tab = 'all'; this.offset = 0; this.detailOpen = false;
    }
    if (ownerChanged || signature !== this.signature) this.render();
  }
  private destroyClip() { this.grid?.clearMask(); this.clip?.destroy(); this.clipShape?.destroy(); this.clip = undefined; this.clipShape = undefined; }

  private render() {
    this.drag = undefined;
    this.destroyClip(); this.children.removeAll(true); this.content.reset();
    this.grid = undefined; this.highlight = undefined;
    const { width, height } = this.scale.gameSize;
    const physical = this.game.canvas.getBoundingClientRect();
    this.compact = physical.width <= 950 || physical.height <= 500;
    const safe = readSafeInsets(physical.width / width);
    this.cameras.main.setSize(width, height).setScroll(-safe.left, -safe.top);
    this.layout = inventoryLayout(width - safe.left - safe.right, height - safe.top - safe.bottom, this.compact);
    const background = this.add.image(width / 2 - safe.left, height / 2 - safe.top, inventoryKey('background'));
    background.setScale(coverScale(background.width, background.height, width, height));
    this.add.rectangle(width / 2, height / 2, width + 100, height + 100, 0x100607, .28);
    const allEntries = this.collection ? collectionEntries(gameStore.snapshot, this.collection) : inventoryEntries(gameStore.snapshot);
    this.entries = this.collection ? allEntries : filterInventory(allEntries, this.tab);
    this.signature = JSON.stringify(allEntries);
    if (!this.entries.some(entry => entry.id === this.selected)) this.selected = this.entries[0]?.id;
    this.offset = Phaser.Math.Clamp(this.offset, 0, this.layout.maxScroll(this.entries.length));
    const header = rect(this.layout.grid.x, 16, 440, 88);
    this.slice('title', header, 20);
    const categoryInfo = this.collection ? COLLECTION_INFO[this.collection] : undefined;
    this.content.field('header.title', rect(header.x + 24, 22, 370, 42), categoryInfo ? 'TÚI ĐỒ · ' + categoryInfo.label : 'TÚI ĐỒ',
      { size: categoryInfo ? 27 : 35, minSize: 16, align: 'left', color: '#ffe09a' });
    this.content.field('header.subtitle', rect(header.x + 24, 67, 370, 27), categoryInfo ? 'Đang có ' + this.entries.length + ' loại vật phẩm' : 'Tài nguyên và mảnh tướng', { size: 17, minSize: 12 });
    this.add.image((this.layout.grid.x + width - 48) / 2, 107, inventoryKey('divider')).setScale(28 / 95);
    this.backToLobby(width-safe.left-safe.right-161,30+(this.compact?70:58)/2,214,this.compact?70:58).background.setName('inventory.back');
    INVENTORY_TABS.forEach(([id, label], i) => this.control(`tab.${id}`, this.layout.tabs[i], label, () => {
      this.collection = undefined; this.tab = id; this.offset = 0; this.selected = undefined; this.detailOpen = false; this.render();
    }, id === this.tab ? 'tabActive' : 'tab', id === this.tab ? '#ffe775' : '#fff0ca'));
    this.slice('grid', this.layout.grid, 30);
    this.drawGrid();
    if (!this.compact) this.drawDetail();
    else if (this.detailOpen && this.selected) {
      this.add.rectangle(width / 2, height / 2, width + 100, height + 100, 0x100609, .85)
        .setInteractive().on('pointerup', () => { this.detailOpen = false; this.render(); });
      this.drawDetail();
      this.control('close-detail', rect(this.layout.detail.x + this.layout.detail.width - 94, this.layout.detail.y + 12, 80, 68), '×', () => {
        this.detailOpen = false; this.render();
      }, 'back');
    }
  }
  private slice(id: InventoryArt, box: ContentRect, corner = 16) {
    return this.add.nineslice(box.x + box.width / 2, box.y + box.height / 2, inventoryKey(id), undefined,
      box.width, box.height, corner, corner, corner, corner).setName(`inventory.art.${id}`);
  }
  private control(id: string, box: ContentRect, label: string, action: () => void, art: InventoryArt = 'gold', color = '#fff0ca') {
    const image = this.slice(art, box, 16);
    this.content.field(`button.${id}`, rect(box.x + 16, box.y + 8, box.width - 32, box.height - 16), label,
      { size: this.compact ? 25 : 20, minSize: 11, align: 'center', color, wrap: true, maxLines: 2 });
    const hit = this.add.zone(box.x + box.width / 2, box.y + box.height / 2, box.width, box.height)
      .setName(`inventory.${id}`).setInteractive({ useHandCursor: true });
    let pressed = false;
    hit.on('pointerover', () => image.setTint(0xffe1a3));
    hit.on('pointerout', () => { pressed = false; image.clearTint(); });
    hit.on('pointerdown', () => { pressed = true; image.setTint(0xc9a564); });
    hit.on('pointerup', () => { image.clearTint(); if (pressed) { pressed = false; action(); } });
    return hit;
  }
  private drawGrid() {
    const { viewport, cell, columns } = this.layout;
    const before = this.children.length;
    // The supplied selected PNG has an opaque center: keep it below every icon and live label.
    this.highlight = this.add.image(0, 0, inventoryKey('selected')).setScale(this.layout.cellWidth / 174).setVisible(false);
    this.entries.forEach((entry, index) => {
      const box = cell(index), scale = box.width / 174;
      this.add.image(box.x + box.width / 2, box.y + box.height / 2, inventoryKey('slot')).setScale(scale);
      const project = (source: ContentRect) => rect(box.x + source.x * scale, box.y + source.y * scale, source.width * scale, source.height * scale);
      this.itemIcon(entry, project(INVENTORY_SLOT_CONTENT.icon));
      this.content.field(`item.${entry.id}.name`, project(INVENTORY_SLOT_CONTENT.name), entry.name,
        { size: 16 * scale, minSize: 8 * scale, padding: 1, wrap: true, maxLines: 2, align: 'center' });
      this.content.field(`item.${entry.id}.quantity`, project(INVENTORY_SLOT_CONTENT.count), `×${entry.quantity.toLocaleString('vi-VN')}`,
        { size: 22 * scale, minSize: 10 * scale, padding: 1, align: 'center', color: '#ffe775' });
    });
    if (!this.entries.length) {
      const info = this.collection ? COLLECTION_INFO[this.collection] : undefined;
      this.content.field('empty.title', rect(viewport.x + 40, viewport.y + 110, viewport.width - 80, 58), info?.state === 'planned' ? 'CHƯA TRIỂN KHAI' : 'Chưa có vật phẩm', { size: 30, align: 'center' });
      this.content.field('empty.description', rect(viewport.x + 45, viewport.y + 180, viewport.width - 90, 116),
        info?.description ?? 'Vật phẩm nhận được từ hành trình sẽ xuất hiện tại đây. Hãy thử chọn danh mục khác.',
        { size: 20, align: 'center', wrap: true, maxLines: 4 });
    }
    this.grid = this.add.container(0, -this.offset, this.children.list.slice(before)).setName('inventory.grid-content');
    this.clipShape = new Phaser.GameObjects.Graphics(this).fillStyle(0xffffff).fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    this.clip = this.clipShape.createGeometryMask(); this.grid.setMask(this.clip);
    const hit = this.add.zone(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2, viewport.width, viewport.height)
      .setName('inventory.grid-hit').setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.drag = { y: pointer.worldY, offset: this.offset, moved: false }; });
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.drag || this.drag.moved) return;
      const x = pointer.worldX - viewport.x, y = pointer.worldY - viewport.y + this.offset;
      const col = Math.floor(x / (this.layout.cellWidth + this.layout.gap)), row = Math.floor(y / this.layout.stride);
      if (col >= columns || x % (this.layout.cellWidth + this.layout.gap) > this.layout.cellWidth || y % this.layout.stride > this.layout.cellHeight) return;
      const entry = this.entries[row * columns + col];
      if (entry) { this.selected = entry.id; this.detailOpen = this.compact; this.render(); }
    });
    this.scrollbar = this.add.graphics().setName('inventory.scrollbar');
    this.scrollTo(this.offset);
    this.content.field('grid.caption', rect(this.layout.grid.x + 28, this.layout.grid.y + this.layout.grid.height - (this.compact ? 61 : 40),
      this.layout.grid.width - 56, this.compact ? 36 : 22), this.compact ? `${this.entries.length} loại · Vuốt để xem thêm`
        : `${this.entries.length} loại vật phẩm · Kéo hoặc cuộn để xem thêm`,
      { size: this.compact ? 24 : 12, minSize: this.compact ? 18 : 9, align: 'center', padding: 0, color: '#e6c99e' });
  }
  private scrollTo(offset: number) {
    const max = this.layout.maxScroll(this.entries.length), v = this.layout.viewport;
    this.offset = Phaser.Math.Clamp(offset, 0, max); this.grid?.setY(-this.offset);
    const index = this.entries.findIndex(entry => entry.id === this.selected);
    if (index >= 0 && this.highlight) { const box = this.layout.cell(index); this.highlight.setPosition(box.x + box.width / 2, box.y + box.height / 2).setVisible(true); }
    this.scrollbar?.clear();
    if (max > 0) {
      const height = Math.max(40, v.height * v.height / (v.height + max));
      this.scrollbar?.fillStyle(0x4c2216, .9).fillRoundedRect(v.x + v.width + 9, v.y, 6, v.height, 3)
        .fillStyle(0xe8b65e).fillRoundedRect(v.x + v.width + 9, v.y + this.offset / max * (v.height - height), 6, height, 3);
    }
  }
  private itemIcon(entry: InventoryEntry, box: ContentRect) {
    const frame = entry.heroId ? atlasOrder.indexOf(HERO_BY_ID[entry.heroId]?.baseHeroId ?? entry.heroId) : undefined;
    const key = entry.textureKey ?? (entry.heroId ? PORTRAITS : `inventory.icon.${entry.icon}`);
    if (frame === -1 || !this.textures.exists(key)) return;
    const source = this.textures.get(key).get(frame), max = Math.min(128, box.width, box.height);
    const pixelScale = this.game.canvas.getBoundingClientRect().width / this.scale.width;
    const art = this.add.image(box.x + box.width / 2, box.y + box.height / 2, key, frame)
      .setScale(Math.min(max / source.width, max / source.height, 1 / Math.max(1, pixelScale))).setName(`inventory.icon.${entry.id}`);
    if (entry.heroId) this.add.image(art.x, art.y, inventoryKey('portrait')).setScale((art.displayWidth + 8) / 157);
    return art;
  }
  private drawDetail() {
    const box = this.layout.detail, large = this.compact;
    this.slice('detail', box, 30);
    if (large) this.add.zone(box.x + box.width / 2, box.y + box.height / 2, box.width, box.height).setInteractive();
    const entry = this.entries.find(value => value.id === this.selected);
    if (!entry) {
      this.content.field('detail.empty', rect(box.x + 28, box.y + 130, box.width - 56, 180),
        this.collection ? COLLECTION_INFO[this.collection].description : 'Chọn vật phẩm để xem chi tiết',
        { size: 22, wrap: true, maxLines: 5, align: 'center' });
      // Empty inventories can still reach the existing server-backed Forge/Equipment flows.
      if (this.collection === 'than_binh') {
        this.control('collection.forge', rect(box.x + 38, box.y + box.height - 94, box.width - 76, 62),
          'Đến Lò Rèn', () => this.go('Forge'));
      } else if (this.collection === 'trang_bi' || this.collection === 'bao_vat') {
        this.control('collection.equipment', rect(box.x + 38, box.y + box.height - 94, box.width - 76, 62),
          'Quản lý trang bị', () => this.go('Equipment', { bag: true }));
      }
      return;
    }
    const iconY = box.y + (large ? 50 : 28), iconSize = large ? 140 : 116;
    this.add.image(box.x + box.width / 2, iconY + iconSize / 2, inventoryKey('glow')).setScale((iconSize + 50) / 192).setAlpha(.65);
    this.itemIcon(entry, rect(box.x + (box.width - iconSize) / 2, iconY, iconSize, iconSize));
    const plaque = rect(box.x + 18, iconY + iconSize + 16, box.width - 36, large ? 76 : 62);
    this.slice('plaque', plaque, 12);
    this.content.field('detail.name', rect(plaque.x + 16, plaque.y + 7, plaque.width - 32, plaque.height - 14), entry.name,
      { size: large ? 28 : 21, minSize: 12, align: 'center', wrap: true, maxLines: 2, color: '#ffe178' });
    const quantityY = plaque.y + plaque.height + 8;
    this.content.field('detail.quantity', rect(box.x + 22, quantityY, box.width - 44, 34), `Số lượng: ×${entry.quantity.toLocaleString('vi-VN')}`, { size: large ? 25 : 19, align: 'center' });
    const parchment = rect(box.x + 18, quantityY + 43, box.width - 36, box.y + box.height - quantityY - 64);
    this.slice('parchment', parchment, 18);
    this.content.field('detail.description-title', rect(parchment.x + 20, parchment.y + 10, parchment.width - 40, 32), 'Mô tả', { size: large ? 25 : 20, align: 'center', color: '#3c1d12' });
    const actionHeight = entry.destination ? (large ? 76 : 54) : 0;
    this.content.field('detail.description', rect(parchment.x + 20, parchment.y + 47, parchment.width - 40, parchment.height - 59 - actionHeight), entry.description,
      { size: large ? 25 : 18, minSize: large ? 18 : 12, wrap: true, maxLines: 7, color: '#3c1d12' });
    // Navigation never consumes an item; the destination retains its authenticated command.
    if (entry.destination) {
      const destination = entry.destination;
      this.control('destination', rect(parchment.x + 22, parchment.y + parchment.height - actionHeight - 5,
        parchment.width - 44, actionHeight), destination.label, () => this.go(destination.scene, destination.data));
    }
  }
}
