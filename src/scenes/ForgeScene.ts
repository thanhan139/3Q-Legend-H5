import { inventoryQuantity, ITEM_IDS } from '../domain/resources';
import { cloudRepository } from '../cloud/cloudRepository';
import { EQUIPMENT, type EquipmentId } from '../data/equipmentConfig';
import { isSignature, signatureIds } from '../data/signatureConfig';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { FORGE, weeklyWins } from '../domain/forge';
import { gameStore } from '../domain/store';
import { UiScene } from '../ui/UiScene';
import { heroLabel } from '../ui/heroUiControls';

export class ForgeScene extends UiScene {
  constructor() { super('Forge'); }

  create(data: { itemId?: EquipmentId; success?: boolean; returnHeroId?: string } = {}) {
    const save = gameStore.snapshot;
    const wallet = save.forge;
    const shards = inventoryQuantity(save, ITEM_IDS.forgeShard);
    const signature = !!data.returnHeroId || (data.itemId !== undefined && isSignature(data.itemId));
    const options: readonly EquipmentId[] = signature ? signatureIds : FORGE.weapons;
    const itemId = data.itemId && options.includes(data.itemId) ? data.itemId : options[0];
    const selected = EQUIPMENT[itemId];
    const previewY = signature ? 383 : 268;
    const restart = (next: EquipmentId, success = false) => this.scene.restart({ ...data,itemId:next,success });
    let pending = false;
    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x231321, 0.75);
    this.panel(40, 32, 1200, 650, 0x351d23, 0.89);
    this.button(data.returnHeroId?147:136, 76, data.returnHeroId?172:150, 44, data.returnHeroId ? '‹ Thần Binh' : '‹ Túi Đồ', () => {
      if(data.returnHeroId) this.go('Heroes',{heroId:data.returnHeroId,tab:'signature',signatureId:itemId});
      else this.go('Inventory');
    }, 0x82452b, true, true).background.setName('forge.return');
    if(signature) heroLabel(this,640,75,'Lò Rèn Thần Binh',36,515,56,'#ffe0a0');
    else this.text(640,75,'Lò Rèn Thần Binh',38,'#ffe0a0',{fontFamily:'Georgia, serif',fontStyle:'bold'}).setOrigin(.5);
    this.text(1168, 75, `${shards} Mảnh Thần Binh`, 21, '#ffdb92').setOrigin(1, 0.5);

    options.forEach((id, index) => {
      const gear = EQUIPMENT[id];
      if(signature){
        const x=143+index*199;
        this.add.rectangle(x,213,181,170,id===itemId?0x713c25:0x362331).setStrokeStyle(id===itemId?3:1,0xe8b965);
        const icon=this.add.image(x,190,`gear-${gear.art}`);
        icon.setScale(Math.min(94/icon.width,94/icon.height));
        heroLabel(this,x,267,gear.name,16,165,51);
        this.add.zone(x,213,181,170).setName(`forge.weapon.${id}`).setInteractive({useHandCursor:true})
          .on('pointerup',()=>restart(id));
        return;
      }
      const x = 168 + index * 210;
      this.add.rectangle(x, 247, 186, 176, id === itemId ? 0x713c25 : 0x362331).setStrokeStyle(2, 0xe8b965);
      this.add.image(x, 223, `gear-${gear.art}`).setDisplaySize(125, 125);
      this.button(x, 311, 171, 40, gear.name, () => restart(id), 0x82452b, true, true);
    });
    this.add.ellipse(643, 422, 330, 60, 0x4d241d).setStrokeStyle(2, 0xe3ac5b);
    const weapon = this.add.image(643, previewY, `gear-${selected.art}`);
    const size=signature?137:276;
    weapon.setScale(Math.min(size/weapon.width,size/weapon.height));
    this.tweens.add({ targets: weapon, y: previewY-12, duration: 940, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.text(643, 472, selected.name, 26, '#ffda90').setOrigin(0.5);
    if(signature) this.text(643,511,`${shards}/${FORGE.shardsRequired} Mảnh Thần Binh`,18,'#ffe0a0').setOrigin(.5);

    const infoY=signature?337:152;
    this.text(880, infoY, 'Nguồn Mảnh Thần Binh', 22, '#ffdb92', { fontStyle: 'bold' });
    this.text(880, infoY+50, [
      `Ải 2-5 lần đầu · +${FORGE.firstClear['2-5']} mảnh`,
      `Ải 3-5 lần đầu · +${FORGE.firstClear['3-5']} mảnh`,
      `Thắng lại 2-5 · +${FORGE.weekly.shards} mảnh`,
      `Tuần này · ${weeklyWins(wallet)}/${FORGE.weekly.limit} lượt đã nhận`,
      'Làm mới thứ Hai, 00:00 giờ Việt Nam',
    ].join('\n'), 17, '#f0d5ac', { lineSpacing: 14 });
    this.button(1034, infoY+251, 236, 46, 'Đến Chinh Chiến', () => this.go('Campaign'), 0x82452b, true, true);
    const run = (action: () => boolean) => {
      if (pending) return;
      pending = true;
      if (action()) restart(itemId,true);
      else { pending = false; this.toast('Giao dịch chưa được lưu.'); }
    };
    const crafted=wallet?.crafted;
    this.button(643, signature?566:536, 290, 52, `Rèn · ${FORGE.shardsRequired} mảnh`, () => {
      if(crafted!==undefined) void this.saveAction({ type: 'forge', itemId, expectedCrafted: crafted },
        () => gameStore.forgeWeapon(itemId, crafted), ok => run(() => ok));
    }, 0x995026, crafted!==undefined&&shards>=FORGE.shardsRequired,true).background.setName('forge.craft');
    if (!signature && wallet && import.meta.env.DEV && !cloudRepository.active) {
      this.text(643, 597, `Gói mô phỏng · SSR đang chọn và ${FORGE.premiumStones} đá cường hóa`, 17, '#ffdb92').setOrigin(0.5);
      this.button(643, 636, 300, 46, wallet.premiumClaimed ? 'Đã nhận gói thử' : 'Nhận gói thử (Dev)',
        () => run(() => gameStore.claimPremiumForgeDemo(itemId)), 0x82452b, !wallet.premiumClaimed, true);
    }
    if (data.success) {
      for (let i = 0; i < 3; i++) {
        const ring = this.add.circle(643, previewY, 79).setStrokeStyle(4, 0xffc563);
        this.tweens.add({ targets: ring, scale: 2.1, alpha: 0, delay: i * 95, duration: 620,
          ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      }
      this.toast('Đã nhận vũ khí SSR và mở Skin Thần Binh.');
    }
  }
}
