import Phaser from 'phaser';
import { inventoryQuantity, ITEM_IDS } from '../domain/resources';
import { cloudRepository } from '../cloud/cloudRepository';
import { EQUIPMENT, type EquipmentId } from '../data/equipmentConfig';
import { HERO_BY_ID } from '../data/heroes';
import { isSignature, SignatureConfig, signatureIds } from '../data/signatureConfig';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { FORGE, weeklyWins } from '../domain/forge';
import { gameStore } from '../domain/store';
import { UiScene } from '../ui/UiScene';
import { loadInventoryArt, inventoryKey } from '../ui/inventoryAssets';
import { loadSharedUi, sharedButton, UI_FONT } from '../ui/sharedUi';
import { rect } from '../ui/lobbyContentLayout';

type ForgeView = { itemId?: EquipmentId; success?: boolean; returnHeroId?: string };

/** Ornamental client view. Forge rules and server receipts are unchanged. */
export class ForgeScene extends UiScene {
  constructor() { super('Forge'); }
  preload() { loadInventoryArt(this); loadSharedUi(this); }

  create(data: ForgeView = {}) {
    const save = gameStore.snapshot;
    const wallet = save.forge;
    const shards = inventoryQuantity(save, ITEM_IDS.forgeShard);
    const signatureMode = Boolean(data.returnHeroId) || (data.itemId !== undefined && isSignature(data.itemId));
    const options: readonly EquipmentId[] = signatureMode ? signatureIds : FORGE.weapons;
    const itemId: EquipmentId = data.itemId && options.includes(data.itemId) ? data.itemId : options[0];
    const selected = EQUIPMENT[itemId];
    const owned = (save.equipment ?? []).filter(item => item.itemId === itemId);
    const equipped = owned.find(item => item.heroId);
    const signature = isSignature(itemId) ? SignatureConfig[itemId] : undefined;
    const canForge = wallet !== undefined && shards >= FORGE.shardsRequired;
    let pending = false;

    const art = this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    art.setName('forge.background');
    this.add.rectangle(640, 360, 1280, 720, 0x15070d, .65);
    const wall = this.add.graphics();
    wall.fillGradientStyle(0x38141e, 0x38141e, 0x180c1d, 0x180c1d, .96)
      .fillRoundedRect(9, 9, 1262, 702, 18)
      .lineStyle(3, 0xd5a354, .92).strokeRoundedRect(10, 10, 1260, 700, 18)
      .lineStyle(1, 0xffdc8b, .5).strokeRoundedRect(18, 18, 1244, 684, 15);
    const panel = (x: number, y: number, width: number, height: number, kind: 'grid' | 'detail') =>
      this.add.nineslice(x + width / 2, y + height / 2, inventoryKey(kind), undefined,
        width, height, 30, 30, 30, 30).setAlpha(.96);
    const line = (x: number, y: number, width: number) => {
      this.add.rectangle(x, y, width, 2, 0xe9ba62, .63);
    };
    const label = (x: number, y: number, value: string, size = 18, width = 280,
      color = '#fbe4b7', height = 58) => {
      const t = this.add.text(x, y, value, {
        fontFamily: UI_FONT, fontSize: size, fontStyle: 'bold', color, align: 'center',
        wordWrap: { width: width - 6 }, lineSpacing: 3, resolution: 2,
        padding: { top: 2, bottom: 2 },
      }).setOrigin(.5);
      while ((t.width > width || t.height > height) && size > 11) t.setFontSize(--size);
      return t;
    };
    const button = (x: number, y: number, width: number, height: number, text: string,
      action?: () => void, kind: 'gold' | 'red' = 'gold') =>
      sharedButton(this, rect(x - width / 2, y - height / 2, width, height), text, action, kind);
    const back = () => data.returnHeroId
      ? this.go('Heroes', { heroId: data.returnHeroId, tab: 'signature', signatureId: itemId })
      : this.go('Inventory');

    panel(282, 19, 718, 85, 'grid');
    label(640, 57, 'LÒ RÈN THẦN BINH', 33, 665, '#ffe2a1', 58);
    const crest = this.add.image(640, 100, inventoryKey('divider'));
    crest.setScale(Math.min(210 / crest.width, 28 / crest.height));
    button(128, 59, 188, 52, data.returnHeroId ? '← Thần Binh' : '← Túi Đồ', back, 'red')
      .background.setName('forge.return');
    panel(1020, 28, 234, 57, 'grid');
    label(1137, 56, 'Mảnh: ' + shards.toLocaleString('vi-VN'), 20, 216, '#ffe1a5', 45);

    panel(17, 128, 286, 530, 'grid');
    label(160, 159, signatureMode ? 'LỤC ĐẠI THẦN BINH' : 'VŨ KHÍ RÈN', 18, 260);
    line(160, 187, 242);
    options.forEach((id, index) => {
      const gear = EQUIPMENT[id];
      const row = Math.floor(index / 2), col = index % 2;
      const x = 92 + col * 137, y = (signatureMode ? 262 : 300) + row * 151;
      const active = id === itemId;
      const copies = (save.equipment ?? []).filter(item => item.itemId === id).length;
      const card = this.add.graphics()
        .fillStyle(active ? 0x69311f : 0x2d1424, .95)
        .fillRoundedRect(x - 63, y - 68, 126, 140, 10)
        .lineStyle(active ? 3 : 1.3, active ? 0xffd475 : 0x9d6b3c, active ? 1 : .8)
        .strokeRoundedRect(x - 63, y - 68, 126, 140, 10);
      card.setName('forge.card.' + id);
      if (active) {
        const light = this.add.image(x, y - 21, inventoryKey('glow'));
        light.setScale(Math.min(98 / light.width, 98 / light.height)).setAlpha(.28);
      }
      const icon = this.add.image(x, y - 25, 'gear-' + gear.art);
      icon.setScale(Math.min(86 / icon.width, 83 / icon.height));
      label(x, y + 34, gear.name, 13, 120, active ? '#fff0be' : '#efd2a6', 45);
      label(x, y + 64, copies ? 'Đã có ×' + copies : 'Chưa sở hữu',
        11, 114, copies ? '#b9f2b0' : '#d8b79b', 22);
      this.add.zone(x, y, 130, 145).setName('forge.weapon.' + id)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { if (!active) card.setAlpha(.8); })
        .on('pointerout', () => card.setAlpha(1))
        .on('pointerup', () => this.scene.restart({ ...data, itemId: id, success: false }));
    });

    panel(311, 128, 548, 530, 'grid');
    label(584, 160, 'THẦN BINH ĐỘC QUYỀN · SSR', 18, 486, '#f7ce80');
    line(584, 186, 435);
    const halo = this.add.image(583, 338, inventoryKey('glow'));
    halo.setScale(Math.min(340 / halo.width, 340 / halo.height)).setAlpha(.58);
    this.tweens.add({ targets: halo, alpha: .38, scaleX: halo.scaleX * 1.1,
      scaleY: halo.scaleY * 1.1, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.graphics().fillStyle(0x411c1c, .85).fillEllipse(583, 435, 354, 63)
      .lineStyle(3, 0xe9b35e, .94).strokeEllipse(583, 435, 354, 63);
    const weapon = this.add.image(583, 326, 'gear-' + selected.art);
    weapon.setScale(Math.min(255 / weapon.width, 235 / weapon.height));
    this.tweens.add({ targets: weapon, y: 315, duration: 1150,
      yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    label(583, 474, selected.name, 24, 496, '#ffe6aa', 53);
    label(583, 511, 'Mảnh sở hữu: ' + shards.toLocaleString('vi-VN') + ' / ' + FORGE.shardsRequired,
      17, 455, '#ffdaad', 32);
    const progressWidth = 416;
    this.add.rectangle(583, 542, progressWidth, 20, 0x1a0d14).setStrokeStyle(2, 0xc48d4c);
    const fraction = Math.min(1, shards / FORGE.shardsRequired);
    if (fraction > 0) this.add.rectangle(583 - progressWidth / 2 + 2, 542,
      Math.max(1, (progressWidth - 5) * fraction), 15, 0x56b66a).setOrigin(0, .5);
    if (!canForge) label(583, 568, 'Cần thêm ' + Math.max(0, FORGE.shardsRequired - shards) + ' mảnh để rèn',
      13, 420, '#ecd09c', 23);

    const forge = async () => {
      if (pending || !wallet || shards < FORGE.shardsRequired) return;
      pending = true;
      try {
        await this.saveAction({ type: 'forge', itemId, expectedCrafted: wallet.crafted },
          () => gameStore.forgeWeapon(itemId, wallet.crafted),
          ok => {
            if (ok) this.scene.restart({ ...data, itemId, success: true });
            else this.toast('Giao dịch chưa được lưu.');
          });
      } finally { pending = false; }
    };
    button(583, 618, 323, 56, 'Rèn · ' + FORGE.shardsRequired + ' mảnh',
      canForge ? () => { void forge(); } : undefined, 'gold').background.setName('forge.craft');

    panel(871, 128, 390, 530, 'detail');
    label(1066, 161, selected.name, 23, 352, '#ffe4aa', 62);
    label(1066, 206, 'THUỘC TÍNH THẦN BINH', 17, 350, '#f4c16d');
    line(1066, 230, 318);
    const stats = selected.base as Partial<Record<'hp' | 'atk' | 'def', number>>;
    label(1066, 257, 'HP +' + (stats.hp ?? 0) + '   ·   Công +' + (stats.atk ?? 0) +
      '   ·   Thủ +' + (stats.def ?? 0), 15, 347, '#fff1d2', 38);
    if (signature) label(1066, 294,
      'Độc quyền ' + (HERO_BY_ID[signature.hero]?.name ?? 'Võ tướng') +
      ' · Tuyệt kỹ +' + Math.round(signature.bonus * 100) + '%',
      14, 344, '#f7d29a', 43);
    else label(1066, 294, 'Vũ khí SSR · Cường hóa tại Trang Bị', 14, 340, '#f7d29a', 43);
    label(1066, 327, owned.length
      ? 'Đang sở hữu ' + owned.length + ' bản' + (equipped?.heroId
        ? ' · ' + (HERO_BY_ID[equipped.heroId]?.name ?? '') + ' đang dùng' : '')
      : 'Chưa sở hữu — Có thể rèn khi đủ mảnh', 13, 347, '#e7ddb1', 37);
    line(1066, 357, 318);
    label(1066, 378, 'NGUỒN MẢNH THẦN BINH', 17, 344, '#ffd788');
    const sources = [
      'Ải 2-5 lần đầu: +' + FORGE.firstClear['2-5'] + ' mảnh',
      'Ải 3-5 lần đầu: +' + FORGE.firstClear['3-5'] + ' mảnh',
      'Thắng lại 2-5: +' + FORGE.weekly.shards + ' mảnh',
      'Tuần này: ' + weeklyWins(wallet) + '/' + FORGE.weekly.limit + ' lượt nhận',
    ];
    sources.forEach((entry, index) => {
      this.add.circle(908, 415 + index * 33, 4, 0xe3ae55);
      label(1070, 415 + index * 33, entry, 14, 321, '#f9e3bc', 31);
    });
    label(1066, 561, 'Làm mới thứ Hai · 00:00 giờ Việt Nam', 12, 345, '#d6b890', 27);
    button(1066, 618, 307, 56, 'Đến Chinh Chiến',
      () => this.go('Campaign'), 'red').background.setName('forge.campaign');

    if (!signatureMode && wallet && import.meta.env.DEV && !cloudRepository.active) {
      const claim = () => {
        if (pending || wallet.premiumClaimed) return;
        pending = true;
        if (gameStore.claimPremiumForgeDemo(itemId)) this.scene.restart({ ...data, itemId, success: true });
        else { pending = false; this.toast('Chưa thể nhận gói thử.'); }
      };
      button(584, 669, 305, 39, wallet.premiumClaimed ? 'Đã nhận gói thử' : 'Gói thử DEV',
        wallet.premiumClaimed ? undefined : claim, 'red').background.setName('forge.dev');
    }
    if (data.success) {
      for (let index = 0; index < 3; index++) {
        const ring = this.add.circle(583, 324, 79).setStrokeStyle(3, 0xffd16d);
        this.tweens.add({ targets: ring, scale: 2.1, alpha: 0,
          delay: index * 105, duration: 680, ease: 'Cubic.Out',
          onComplete: () => ring.destroy() });
      }
      this.toast('Rèn thành công! Thần Binh đã được lưu vào kho.');
    }

    const fitToViewport = () => {
      const { width, height } = this.scale.gameSize;
      const zoom = Math.min(1, (width - 20) / 1280, (height - 16) / 720);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.setScroll(640 - width / (2 * zoom), 360 - height / (2 * zoom));
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, fitToViewport);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,
      () => this.scale.off(Phaser.Scale.Events.RESIZE, fitToViewport));
    fitToViewport();
    this.cameras.main.fadeIn(170, 17, 14, 20);
  }
}
