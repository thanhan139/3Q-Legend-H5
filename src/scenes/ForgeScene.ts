import { inventoryQuantity, ITEM_IDS } from '../domain/resources';
import { cloudRepository } from '../cloud/cloudRepository';
import { EQUIPMENT, type EquipmentId } from '../data/equipmentConfig';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { FORGE, weeklyWins } from '../domain/forge';
import { gameStore } from '../domain/store';
import { UiScene } from '../ui/UiScene';

export class ForgeScene extends UiScene {
  constructor() { super('Forge'); }

  create({ itemId = FORGE.weapons[0], success = false }: { itemId?: EquipmentId; success?: boolean } = {}) {
    const save = gameStore.snapshot;
    const wallet = save.forge!;
    const shards = inventoryQuantity(save, ITEM_IDS.forgeShard);
    const selected = EQUIPMENT[itemId];
    let pending = false;
    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x231321, 0.75);
    this.panel(40, 32, 1200, 650, 0x351d23, 0.89);
    this.button(136, 76, 150, 44, '‹ Túi Đồ', () => this.go('Inventory'), 0x82452b, true, true);
    this.text(640, 75, 'Lò Rèn Thần Binh', 38, '#ffe0a0', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.text(1168, 75, `${shards} Mảnh Thần Binh`, 21, '#ffdb92').setOrigin(1, 0.5);

    FORGE.weapons.forEach((id, index) => {
      const gear = EQUIPMENT[id];
      const x = 168 + index * 210;
      this.add.rectangle(x, 247, 186, 176, id === itemId ? 0x713c25 : 0x362331).setStrokeStyle(2, 0xe8b965);
      this.add.image(x, 223, `gear-${gear.art}`).setDisplaySize(125, 125);
      this.button(x, 311, 171, 40, gear.name, () => this.scene.restart({ itemId: id }), 0x82452b, true, true);
    });
    this.add.ellipse(643, 422, 330, 60, 0x4d241d).setStrokeStyle(2, 0xe3ac5b);
    const weapon = this.add.image(643, 268, `gear-${selected.art}`).setDisplaySize(276, 276);
    this.tweens.add({ targets: weapon, y: 256, duration: 940, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.text(643, 472, selected.name, 26, '#ffda90').setOrigin(0.5);

    this.text(880, 152, 'Nguồn Mảnh Thần Binh', 22, '#ffdb92', { fontStyle: 'bold' });
    this.text(880, 202, [
      `Ải 2-5 lần đầu · +${FORGE.firstClear['2-5']} mảnh`,
      `Ải 3-5 lần đầu · +${FORGE.firstClear['3-5']} mảnh`,
      `Thắng lại 2-5 · +${FORGE.weekly.shards} mảnh`,
      `Tuần này · ${weeklyWins(wallet)}/${FORGE.weekly.limit} lượt đã nhận`,
      'Làm mới thứ Hai, 00:00 giờ Việt Nam',
    ].join('\n'), 17, '#f0d5ac', { lineSpacing: 14 });
    this.button(1034, 403, 236, 46, 'Đến Chinh Chiến', () => this.go('Campaign'), 0x82452b, true, true);
    const run = (action: () => boolean) => {
      if (pending) return;
      pending = true;
      if (action()) this.scene.restart({ itemId, success: true });
      else { pending = false; this.toast('Giao dịch chưa được lưu.'); }
    };
    this.button(643, 536, 290, 52, `Rèn · ${FORGE.shardsRequired} mảnh`,
      () => this.saveAction({ type: 'forge', itemId, expectedCrafted: wallet.crafted },
        () => gameStore.forgeWeapon(itemId, wallet.crafted), ok => run(() => ok)), 0x995026, shards >= FORGE.shardsRequired, true);
    if (import.meta.env.DEV && !cloudRepository.active) {
      this.text(643, 597, `Gói mô phỏng · SSR đang chọn và ${FORGE.premiumStones} đá cường hóa`, 17, '#ffdb92').setOrigin(0.5);
      this.button(643, 636, 300, 46, wallet.premiumClaimed ? 'Đã nhận gói thử' : 'Nhận gói thử (Dev)',
        () => run(() => gameStore.claimPremiumForgeDemo(itemId)), 0x82452b, !wallet.premiumClaimed, true);
    }
    if (success) {
      for (let i = 0; i < 3; i++) {
        const ring = this.add.circle(643, 270, 79).setStrokeStyle(4, 0xffc563);
        this.tweens.add({ targets: ring, scale: 2.1, alpha: 0, delay: i * 95, duration: 620,
          ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      }
      this.toast('Đã nhận vũ khí SSR và mở Skin Thần Binh.');
    }
  }
}
