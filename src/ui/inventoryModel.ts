import { HERO_BY_ID } from '../data/heroes';
import { inventoryQuantity, ITEM_IDS, heroShardId, type ItemId } from '../domain/resources';
import type { Rarity, SaveV2 } from '../domain/types';

export const INVENTORY_TABS = [
  ['all', 'Tất cả'], ['resources', 'Tài nguyên'], ['fragments', 'Mảnh tướng'],
  ['items', 'Vật phẩm'], ['divine', 'Thần binh'],
] as const;
export type InventoryCategory = typeof INVENTORY_TABS[number][0];
export interface InventoryEntry {
  id: string; name: string; quantity: number; category: InventoryCategory;
  description: string; icon?: string; textureKey?: string; heroId?: string; rarity: Rarity;
  destination?: { scene: string; label: string; data?: object };
}

/** Presentation only: quantities and identities come from the existing confirmed SaveV2. */
export function inventoryEntries(save: SaveV2): InventoryEntry[] {
  const definitions: (Omit<InventoryEntry, 'quantity'> & { id: ItemId })[] = [
    { id: ITEM_IDS.goldenKey, name: 'Chìa Khóa Vàng', category: 'items', icon: 'key', rarity: 'SSR',
      description: 'Dùng tại Điện Chiêu Mộ. Mỗi lượt chiêu mộ tiêu hao một Chìa Khóa Vàng. Phần thưởng do máy chủ xác nhận.',
      destination: { scene: 'Summon', label: 'Đến Chiêu Mộ' } },
    { id: ITEM_IDS.heroExp, name: 'EXP Tướng', category: 'resources', icon: 'exp', rarity: 'SR',
      description: 'Kinh nghiệm dùng để nâng cấp võ tướng đang sở hữu. Chọn tướng tại Võ Tướng để xem điều kiện và chi phí.',
      destination: { scene: 'Heroes', label: 'Đến Võ Tướng' } },
    { id: ITEM_IDS.enhancementStone, name: 'Đá Cường Hóa', category: 'resources', icon: 'stone', rarity: 'SR',
      description: 'Nguyên liệu cường hóa trang bị SSR. Chọn trang bị phù hợp để xem điều kiện sử dụng.',
      destination: { scene: 'Equipment', label: 'Xem trang bị', data: { bag: true } } },
    { id: ITEM_IDS.forgeShard, name: 'Mảnh Thần Binh', category: 'divine', icon: 'forge', rarity: 'SSR',
      description: 'Nguyên liệu chế tạo Thần Binh. Công thức và số lượng cần thiết được hiển thị tại Lò Rèn.',
      destination: { scene: 'Forge', label: 'Xem công thức' } },
    { id: ITEM_IDS.legacyGem, name: 'Nguyên Bảo cũ', category: 'resources', icon: 'legacy', rarity: 'SSR',
      description: 'Tài nguyên được giữ lại từ tiến trình cũ. Hiện chưa có thao tác sử dụng trực tiếp. Đồng và Vàng được quản lý riêng trong ví tiền.' },
  ];
  for (const heroId of Object.keys(save.heroShards)) {
    const hero = HERO_BY_ID[heroId];
    if (!hero) continue;
    definitions.push({ id: heroShardId(heroId), name: `Mảnh ${hero.name}`, heroId, category: 'fragments', rarity: hero.rarity,
      description: `Mảnh tướng ${hero.name}. Dùng để nâng sao cho tướng này khi đã sở hữu và đạt đủ điều kiện. Xem chi phí tại Võ Tướng.`,
      destination: { scene: 'Heroes', label: 'Đến Võ Tướng' } });
  }
  return definitions.map(entry => ({ ...entry, quantity: inventoryQuantity(save, entry.id) }))
    .filter(entry => entry.quantity > 0);
}

export const filterInventory = (entries: InventoryEntry[], tab: InventoryCategory) =>
  entries.filter(entry => tab === 'all' || entry.category === tab);

export const INVENTORY_CATEGORIES = ['Đạo Cụ', 'Trang Bị', 'Trang Sức', 'Bảo Vật', 'Chiến Hồn', 'Pet',
  'Thần Binh', 'Thần Thú', 'Cẩm Nang', 'Túi Đá Quý', 'Điện Võ Lệnh', 'Trang Bị Quân Sư', 'Huyễn Thú'] as const;
