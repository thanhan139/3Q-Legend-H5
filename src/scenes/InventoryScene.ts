import { inventoryQuantity, ITEM_IDS, heroShardId } from '../domain/resources';
import { DUPLICATE_SHARDS } from '../domain/summon';
import { HERO_BY_ID } from '../data/heroes';
import { gameStore } from '../domain/store';
import { UiScene } from '../ui/UiScene';
import { PALETTE } from '../ui/theme';

export class InventoryScene extends UiScene {
  constructor(){super('Inventory');}
  create(){
    this.headerBack('TÚI ĐỒ','Tài nguyên và mảnh tướng');
    this.button(928, 57, 180, 52, 'Trang bị', () => this.go('Equipment', { bag: true }), 0x815136, true, true);
    const save=gameStore.snapshot;
    this.button(726, 57, 194, 52, `Lò Rèn · ${save.forge?.shards ?? 0} mảnh`, () => this.go('Forge'), 0x815136, true, true);
    const items = [
      ['Chìa Khóa Vàng', ITEM_IDS.goldenKey], ['EXP Tướng', ITEM_IDS.heroExp],
      ['Đá Cường Hóa', ITEM_IDS.enhancementStone], ['Mảnh Thần Binh', ITEM_IDS.forgeShard],
      ['Nguyên Bảo cũ', ITEM_IDS.legacyGem],
    ] as const;
    const vals = items.map(([name, id]) => [name, inventoryQuantity(save, id)] as const);
    vals.forEach(([name,value],i)=>{
      this.panel(75+i*233,148,218,128,PALETTE.navy);
      this.text(91+i*233,177,name,22,'#bfcadd');
      this.text(91+i*233,216,String(value),36,'#f4d28d',{fontStyle:'bold'});
    });
    this.panel(75,310,1170,320,PALETTE.navy);
    this.text(100,343,'MẢNH TƯỚNG',26,'#f6d187',{fontStyle:'bold'});
    const entries = Object.keys(save.heroShards).map(id => [id, inventoryQuantity(save, heroShardId(id))] as const).filter(([, count]) => count > 0);
    if(!entries.length)this.text(100,402,`Chưa có mảnh tướng. Nếu quay trùng sẽ nhận ${DUPLICATE_SHARDS} mảnh.`,21,'#c7d4e6');
    entries.forEach(([id,count],i)=>this.text(100+(i%3)*380,407+Math.floor(i/3)*41,`${HERO_BY_ID[id]?.name??id}: ${count} mảnh`,19,'#d5e2f2'));
  }
}
