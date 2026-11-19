import Phaser from 'phaser';
import { cloudRepository } from '../cloud/cloudRepository';
import type { ShopCatalog, ShopCurrency, ShopListing, ShopQuote, ShopReceipt } from '../domain/shop';
import { heroLabel } from '../ui/heroUiControls';
import { loadSharedUi } from '../ui/sharedUi';
import { UiScene } from '../ui/UiScene';

const ART = {
  hall: 'summon/hall.webp',
  title: 'ui/formation/frames/title_dragon_red.png',
  panel: 'inventory/panels/inventory_grid_panel.png',
  detail: 'inventory/panels/item_detail_panel.png',
  red: 'equipment-themes/ui/buttons/secondary_red.png',
  gold: 'ui/welfare_v21/buttons/button_primary_hd.png',
  strip: 'inventory/panels/detail_title_plaque_blank.png',
  merchant: 'ui/welfare_v2/characters/hostess_phuc_loi.png',
  crest: 'inventory/decor/gold_dragon_divider.png',
  star: 'equipment-themes/ui/decor/star_gold.png',
  round: 'equipment-themes/ui/buttons/action_round.png',
  itemFrame: 'inventory/panels/hero_fragment_portrait_frame.png',
  chest: 'ui/welfare/items/golden_chest.png',
  coin: 'ui/welfare_v2/icons/icon_gold.png',
  ingot: 'ui/welfare/items/gold_ingot.png',
  ring: 'inventory/categories/03_trang_suc.png',
  sword: 'inventory/categories/07_than_binh.png',
  helmet: 'inventory/categories/02_trang_bi.png',
  gift: 'ui/welfare/items/gift_box.png',
  refine: 'ui/welfare/items/purple_gem.png',
  seal: 'ui/pvp_v1/icons/icon_challenge_ticket.png',
} as const;

const ICONS: Record<string, [number, number, number, number]> = {
  coin_pouch: [88, 75, 194, 178], enhancement_stone: [83, 86, 183, 181], forge_shard: [87, 77, 188, 186],
  golden_key: [84, 75, 181, 180], hero_exp: [78, 79, 181, 178], jewelry_chest: [78, 78, 189, 179],
  jewelry_essence: [87, 82, 188, 181], treasure_chest: [83, 73, 187, 176],
};
const icon = (id: string) => `shop/icons/${id}.png`;
const currencyName: Record<ShopCurrency, string> = { coins: 'Vàng', gems: 'Nguyên Bảo' };
const categoryRows = [
  ['all', 'Hiệu Lệnh', ART.chest], ['jewelry', 'Trang Sức', ART.ring],
  ['materials', 'Nguyên Liệu', icon('enhancement_stone')], ['heroes', 'Võ Tướng', ART.helmet],
  ['divine', 'Thần Binh', ART.sword], ['offers', 'Ưu Đãi', ART.gift],
  ['daily', 'Gói Ngày', ART.gift], ['weekly', 'Gói Tuần', ART.gift], ['monthly', 'Gói Tháng', ART.gift],
  ['vip', 'VIP', ART.star],
] as const;
const filters = [['all', 'Tất cả'], ['featured', 'Nổi bật'], ['limited', 'Giới hạn'], ['permanent', 'Vĩnh viễn']] as const;
type Category = typeof categoryRows[number][0];
type Filter = typeof filters[number][0];
const items: Record<string, { name: string; icon: string; description: string }> = {
  'golden-key': {name:'Chìa Khóa Vàng', icon:icon('golden_key'), description:'Dùng tại Điện Chiêu Mộ khi tính năng được mở qua Chinh Chiến.' },
  'jewelry-essence': {name:'Tinh Hoa Trang Sức', icon:icon('jewelry_essence'), description:'Dùng tại Trang Sức để cường hóa Nhẫn và Dây Chuyền.' },
  'enhancement-stone': {name:'Đá Cường Hóa', icon:icon('enhancement_stone'), description:'Dùng cường hóa trang bị SSR tại màn Trang Bị.' },
  'forge-shard': {name:'Mảnh Thần Binh', icon:icon('forge_shard'), description:'Nguyên liệu chế tạo tại Lò Rèn. Xem điều kiện trong công thức.' },
  'hero-exp': {name:'EXP Võ Tướng', icon:icon('hero_exp'), description:'Dùng để tăng cấp tướng đang sở hữu tại Võ Tướng.' },
  'gold-pouch': {name:'Túi Vàng', icon:icon('coin_pouch'), description:'Mặt hàng chưa mở bán.' },
  'refine-gem': {name:'Đá Tẩy Luyện', icon:ART.refine, description:'Mặt hàng chưa có cơ chế sử dụng.' },
  'summon-seal': {name:'Lệnh Chiêu Mộ Cao', icon:ART.seal, description:'Mặt hàng chưa có cơ chế sử dụng.' },
};
const locked = ['gold-pouch', 'refine-gem', 'summon-seal'];
const format = (n: number) => n.toLocaleString('vi-VN');
const shopKey = (path: string) => 'shop.' + path;
const periodLabel = (listing: ShopListing) =>
  listing.offer.period === 'daily' ? 'Hôm nay' : listing.offer.period === 'weekly' ? 'Tuần này' : 'Vĩnh viễn';

export class ShopScene extends UiScene {
  private layer?: Phaser.GameObjects.Container;
  private catalog?: ShopCatalog;
  private category: Category = 'all';
  private filter: Filter = 'all';
  private selected?: string;
  private quantity = 1;
  private quote?: ShopQuote;
  private busy = false;
  private message = '';
  private owner?: string;
  private generation = 0;
  private clockOffset = 0;
  private resetText?: Phaser.GameObjects.Text;
  private resetAt?: number;
  private refreshedReset?: number;

  constructor() { super('Shop'); }

  preload() {
    loadSharedUi(this);
    for (const path of [...Object.values(ART), ...Object.keys(ICONS).map(icon)])
      if (!this.textures.exists(shopKey(path))) this.load.image(shopKey(path), import.meta.env.BASE_URL + 'assets/' + path);
  }

  create() {
    this.owner = cloudRepository.uid;
    this.generation++;
    this.catalog = undefined;
    this.category = 'all';
    this.filter = 'all';
    this.selected = undefined;
    this.quantity = 1;
    this.quote = undefined;
    this.busy = false;
    this.message = '';
    this.refreshedReset = undefined;
    this.events.once('shutdown', () => { this.generation++; this.layer = undefined; });
    for (const [name, [x, y, right, bottom]] of Object.entries(ICONS)) {
      const texture = this.textures.get(shopKey(icon(name)));
      if (!texture.has('content')) texture.add('content', 0, x, y, right - x, bottom - y);
    }
    const merchant = this.textures.get(shopKey(ART.merchant));
    if (!merchant.has('bust')) merchant.add('bust', 0, 25, 0, 677, 442);
    this.add.image(640, 360, shopKey(ART.hall));
    this.backToLobby(1191, 32, 155, 51);
    if (!cloudRepository.active) { this.go('Boot'); return; }
    void this.loadCatalog();
  }

  update() {
    if (this.owner !== cloudRepository.uid) { this.scene.start('Boot'); return; }
    if (!this.resetText || !this.resetAt || !this.catalog) return;
    const remaining = Math.max(0, this.resetAt - Date.now() - this.clockOffset);
    if (remaining === 0) {
      this.resetText.setText('Đã tới giờ làm mới');
      if (!this.busy && !this.quote && this.refreshedReset !== this.resetAt) {
        this.refreshedReset = this.resetAt;
        void this.loadCatalog();
      }
      return;
    }
    const minutes = Math.ceil(remaining / 60_000);
    this.resetText.setText(`Làm mới sau ${Math.floor(minutes / 60)}g ${minutes % 60}p (giờ VN)`);
  }

  private async loadCatalog() {
    await this.perform(async () => { this.setCatalog(await cloudRepository.shopCatalog()); });
  }

  private setCatalog(value: ShopCatalog) {
    this.catalog = value;
    this.clockOffset = value.serverTime - Date.now();
  }

  private async perform(work: () => Promise<void>, refreshOnError = false) {
    if (this.busy || !cloudRepository.active) return;
    const generation = this.generation;
    this.busy = true;
    this.message = '';
    this.render();
    try { await work(); }
    catch (error) {
      if (this.generation !== generation) return;
      this.quote = undefined;
      this.message = cloudRepository.hasPendingShop
        ? 'Chưa nhận được kết quả. Bấm Đối chiếu để kiểm tra giao dịch.'
        : error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';
      if (refreshOnError && !cloudRepository.hasPendingShop) {
        try { this.setCatalog(await cloudRepository.shopCatalog()); } catch { /* Keep the actionable error visible. */ }
      }
    } finally {
      if (this.generation === generation) { this.busy = false; this.render(); }
    }
  }

  private async purchase(work: () => Promise<ShopReceipt>) {
    await this.perform(async () => {
      const receipt = await work();
      this.quote = undefined;
      this.quantity = 1;
      this.message = `Đã mua · Nhận ×${format(receipt.grant)}`;
      // Confirmed save is applied by the command; refresh the listing/counter before another quote.
      try { this.setCatalog(await cloudRepository.shopCatalog()); }
      catch { this.catalog = undefined; }
    }, true);
  }

  private render() {
    this.layer?.destroy(true);
    this.layer = this.add.container(0, 0);
    this.resetText = undefined;
    this.resetAt = undefined;
    const balances = this.catalog?.balances;
    this.frame(106,387,195,622,ART.detail);
    this.frame(579,385,740,619);
    this.frame(1107,385,319,619,ART.detail);
    this.art(ART.title, 198, 36, 395, 72);
    this.label(220, 34, 'Vạn Bảo Các', 31, 246);
    for (const [i, denomination] of (['coins', 'gems'] as const).entries()) {
      const x = 798 + i * 193;
      this.art(ART.strip, x, 32, 182, 47);
      this.art(denomination === 'coins' ? ART.coin : ART.ingot, x - 66, 32, 31, 29);
      this.label(x - 2, 31, balances ? format(balances[denomination]) : '—', 19, 94);
      this.shopButton(x + 68, 32, 34, 39, '+', () => {
        this.message = denomination === 'coins' ? 'Kiếm Vàng qua Chinh Chiến.' : 'Nguyên Bảo dùng số dư đã lưu.';
        this.render();
      }, true, `shop.wallet.${denomination}`);
    }
    this.art(ART.crest, 105, 96, 146, 35);
    this.art(ART.crest, 105, 678, 146, 35);
    for (const [i,[id,name,path]] of categoryRows.entries()) {
      const y = 124 + i * 56;
      this.shopButton(105,y,172,51,'',() => {
        this.category = id; this.filter = 'all'; this.selected = undefined; this.quantity = 1; this.render();
      }, this.category === id, `shop.category.${id}`);
      this.art(path, 44, y, 38, 35);
      this.label(124, y, name, 18, 115, this.category === id ? '#3b1b06' : '#fff0c8');
    }
    this.frame(579,137,723,117,ART.detail);
    this.art(ART.merchant, 346, 138, 205, 110, 'bust');
    this.art(ART.chest, 861, 143, 117, 101);
    this.label(609, 123, 'Vạn Bảo Các', 35, 380);
    this.label(609, 157, 'Trân Bảo Hội Tụ – Trợ Lực Xưng Bá', 17, 376);
    this.art(ART.crest, 578, 198, 690, 40);
    for (const [i,[id,name]] of filters.entries()) this.shopButton(309 + i * 177, 221, 151, 38, name, () => {
      this.filter = id; this.selected = undefined; this.quantity = 1; this.render();
    }, this.filter === id, `shop.filter.${id}`);

    const listings = (this.catalog?.listings ?? []).filter(listing => {
      const o = listing.offer;
      return Object.hasOwn(items, o.id) &&
        (this.category === 'all' || (this.category === 'offers' ? o.featured : this.category === o.category)) &&
        (this.filter === 'all' || (this.filter === 'featured' ? o.featured :
          this.filter === 'limited' ? o.period !== 'permanent' : o.period === 'permanent'));
    });
    const cards: string[] = listings.map(listing => listing.offer.id);
    if (this.catalog && this.category === 'all' && this.filter === 'all') cards.push(...locked);
    if (!cards.includes(this.selected ?? '')) this.selected = cards[0];
    for (let i = 0; i < 8; i++) {
      const x = 306 + (i % 4) * 181, y = 349 + Math.floor(i / 4) * 216;
      const id = cards[i];
      const listing = listings.find(entry => entry.offer.id === id);
      const active = id && id === this.selected;
      this.frame(x,y,170,200,ART.detail,136,active ? 0xffffff : 0xbda08b);
      if (!id) continue;
      this.art(items[id].icon, x, y - 40, 86, 82);
      this.label(x,y+15,items[id].name,16,157);
      this.label(x,y+42,listing ? `${periodLabel(listing)}: ${listing.used}/${listing.offer.limit}` : 'Sắp mở', 14, 156);
      this.art(listing ? ART.gold : ART.red, x, y+74, 146, 38).setAlpha(listing ? 1 : .64);
      this.label(x,y+73,listing ? `${format(listing.offer.price)} ${currencyName[listing.offer.currency]}` : 'Chưa bán',14,130,
        listing ? '#492103' : '#efd5b4');
      if (listing?.offer.featured) {
        this.art(ART.red,x-51,y-80,53,25);
        this.label(x-51,y-80,'Hot',13,40);
      }
      this.hit(x,y,170,201,`shop.card.${id}`,() => { this.selected=id; this.quantity=1; this.render(); });
    }
    if (!cards.length) this.label(579,427,this.busy ? 'Đang tải danh mục…' :
      this.catalog ? 'Chưa có mặt hàng trong mục này.' : 'Chưa tải được danh mục.', 22, 585);
    const listing = listings.find(entry => entry.offer.id === this.selected);
    this.details(listing);
    this.label(1107,666,this.message || (this.catalog?.checkoutEnabled ? 'Giá thử nghiệm · Chỉ dùng trên staging' :
      this.catalog ? 'Giá đề xuất · Chưa mở bán' : ''), 13, 284);
    if (this.quote) this.confirmation(this.quote);
  }

  private details(listing?: ShopListing) {
    const current = this.selected ? items[this.selected] : undefined;
    if (current) {
      this.art(ART.itemFrame,1007,155,109,109);
      this.art(current.icon, 1007,155,83,83);
    }
    this.label(1141,132,current?.name ?? 'Thông tin mặt hàng',21,196);
    this.label(1141,169,listing ? `Sở hữu: ${format(listing.owned)}` : current ? 'Chưa mở bán' : '',15,196);
    for (const [y, label] of [[233,'Công dụng'],[353,'Giới hạn mua'],[460,'Số lượng mua'],[555,'Tổng giá']] as const) {
      this.art(ART.strip,1107,y,286,33);
      this.label(1107,y,label,17,248);
    }
    this.label(1107,285,current?.description ?? 'Chọn mặt hàng để xem thông tin.',17,258, '#eed0ac',76);
    this.label(1107,390,listing ? `${periodLabel(listing)}: ${listing.used}/${listing.offer.limit} · Còn ${Math.max(0, listing.offer.limit-listing.used)}` : '—',15,264);
    if (listing?.resetAt) {
      this.resetAt = listing.resetAt;
      this.resetText = this.label(1107,418,'',13,263);
    }
    const max = listing?.max ?? 0;
    this.quantity = max ? Math.max(1, Math.min(this.quantity, max)) : 1;
    const q = max ? this.quantity : 0;
    const set = (quantity: number) => { this.quantity=quantity; this.render(); };
    this.shopButton(992,503,46,44,'−',q>1 ? () => set(q-1) : undefined,true,'shop.minus');
    this.art(ART.strip,1058,503,76,40);
    this.label(1058,503,String(q),23,65);
    this.shopButton(1121,503,46,44,'+',q && q<max ? () => set(q+1) : undefined,true,'shop.plus');
    this.shopButton(1192,503,75,44,'Max',max ? () => set(max) : undefined,false,'shop.max');
    this.label(1107,588,listing && q ? `${format(listing.offer.price*q)} ${currencyName[listing.offer.currency]}` : '—',22,270);
    const pending = cloudRepository.hasPendingShop;
    const expired = this.resetAt !== undefined && this.resetAt <= Date.now() + this.clockOffset;
    const buy = () => void this.perform(async () => { this.quote = await cloudRepository.shopQuote(listing!.offer.id, q); }, true);
    const action = pending ? () => void this.purchase(() => cloudRepository.retryShopPurchase()) :
      !this.catalog || expired ? () => void this.loadCatalog() : this.catalog.checkoutEnabled && listing && q ? buy : undefined;
    this.shopButton(1107,631,234,46,this.busy ? 'Đang xử lý…' : pending ? 'Đối chiếu giao dịch' :
      !this.catalog || expired ? 'Tải lại' : !this.catalog.checkoutEnabled || !listing ? 'Chưa mở bán' : !q ? 'Không đủ điều kiện' : 'Mua',
    this.busy ? undefined : action,true,'shop.buy');
  }

  private confirmation(quote: ShopQuote) {
    this.own(this.add.rectangle(640,360,3000,1800,0x0b0508,.87).setInteractive());
    this.frame(640,360,612,293,ART.detail);
    this.art(ART.title,640,229,435,80);
    this.label(662,231,'Xác nhận mua',25,277);
    this.label(640,303,`${items[quote.offerId].name} ×${format(quote.grant)}`,25,540);
    this.label(640,351,`Tổng giá: ${format(quote.total)} ${currencyName[quote.currency]}`,23,527);
    this.label(640,391,'Giao dịch thử nghiệm bằng tài nguyên trong game.',15,520);
    this.shopButton(500,446,183,58,'Quay lại',() => { this.quote=undefined; this.render(); },false,'shop.cancel');
    this.shopButton(771,446,194,58,'Xác nhận',() => {
      this.quote=undefined;
      void this.purchase(() => cloudRepository.buyShop(quote));
    },true,'shop.confirm');
  }

  private own<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.layer!.add(object); return object;
  }

  private art(path: string,x: number,y: number,width: number,height: number, frame?: string) {
    const selectedFrame = frame ?? (path.startsWith('shop/icons/') ? 'content' : undefined);
    const image = this.own(this.add.image(x,y,shopKey(path),selectedFrame));
    return image.setScale(Math.min(width/image.width,height/image.height));
  }

  private frame(x: number,y: number,width: number,height: number,path: string = ART.panel, corner=84,tint=0xffffff) {
    if (this.game.renderer.type === Phaser.WEBGL)
      this.own(this.add.nineslice(x,y,shopKey(path),undefined,width*2,height*2,corner,corner,corner,corner)).setScale(.5).setTint(tint);
    else this.own(this.add.image(x,y,shopKey(path))).setDisplaySize(width,height).setTint(tint);
  }

  private label(x: number,y: number,value: string,size: number,width: number,color='#fff0c5',height=36) {
    return this.own(heroLabel(this,x,y,value,size,width,height,color));
  }

  private hit(x: number,y: number,w: number,h: number,name: string,action: () => void) {
    const hit = this.own(this.add.zone(x,y,w,h)).setName(name).setInteractive({useHandCursor:true});
    let pressed = false;
    hit.on('pointerdown', () => { pressed = !this.busy && (!this.quote || name === 'shop.cancel' || name === 'shop.confirm'); });
    hit.on('pointerout', () => { pressed=false; });
    hit.on('pointerup', () => { if (pressed) { pressed=false; action(); } });
    return hit;
  }

  private shopButton(x: number,y: number,width: number,height: number,label: string,action: (() => void)|undefined,gold: boolean,name: string) {
    const compact = width < 50;
    const art = this.art(compact ? ART.round : gold ? ART.gold : ART.red,x,y,width,height);
    if (label) this.label(x,y,label,compact ? 22 : 16,width-6,gold && action && !compact ? '#411e02' : '#f3d6a4');
    if (!action) { art.setAlpha(.56); return; }
    const hit = this.hit(x,y,width,height,name,action);
    hit.on('pointerover',() => art.setTint(0xffe0a2));
    hit.on('pointerout',() => art.clearTint());
    hit.on('pointerdown',() => art.setTint(0xb8a08b));
    hit.on('pointerup',() => art.clearTint());
  }
}
