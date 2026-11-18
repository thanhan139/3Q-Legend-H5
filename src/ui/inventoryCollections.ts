import { EQUIPMENT, EQUIPMENT_SLOTS, gearStats } from '../domain/equipment';
import { isForgeWeapon } from '../domain/forge';
import { isSignature } from '../data/signatureConfig';
import { ITEM_IDS } from '../domain/resources';
import type { SaveV2 } from '../domain/types';
import { inventoryEntries, type InventoryEntry } from './inventoryModel';

/** The 13 visual categories are collection views, never independent currencies or saves. */
export const COLLECTION_IDS = [
  'dao_cu', 'trang_bi', 'trang_suc', 'bao_vat', 'chien_hon', 'pet', 'than_binh',
  'than_thu', 'cam_nang', 'tui_da_quy', 'dien_vo_lenh', 'trang_bi_quan_su', 'huyen_thu',
] as const;
export type CollectionId = typeof COLLECTION_IDS[number];

export const COLLECTION_INFO: Record<CollectionId, { label: string; description: string; state: 'live' | 'partial' | 'planned' }> = {
  dao_cu: { label: 'Đạo Cụ', description: 'Chìa Khóa Vàng, EXP, đá cường hóa và mảnh tướng đã nhận.', state: 'live' },
  trang_bi: { label: 'Trang Bị', description: 'Vũ khí, giáp, mũ, giày và chiến mã thuộc sở hữu tài khoản.', state: 'live' },
  trang_suc: { label: 'Trang Sức', description: 'Hệ thống nhẫn, dây chuyền và trang sức chưa được triển khai.', state: 'planned' },
  bao_vat: { label: 'Bảo Vật', description: 'Bảo vật thuộc ô trang bị Bảo Vật; thuộc tính do máy chủ lưu.', state: 'live' },
  chien_hon: { label: 'Chiến Hồn', description: 'Hệ thống Chiến Hồn chưa có vật phẩm hoặc cơ chế lưu online.', state: 'planned' },
  pet: { label: 'Pet', description: 'Hệ thống thú đồng hành chưa có vật phẩm hoặc cơ chế lưu online.', state: 'planned' },
  than_binh: { label: 'Thần Binh', description: 'Mảnh Lò Rèn và Thần Binh đang sở hữu; chế tạo tại Lò Rèn.', state: 'partial' },
  than_thu: { label: 'Thần Thú', description: 'Hệ thống Thần Thú chưa có vật phẩm hoặc cơ chế lưu online.', state: 'planned' },
  cam_nang: { label: 'Cẩm Nang', description: 'Hệ thống sách kỹ năng chưa có vật phẩm hoặc cơ chế lưu online.', state: 'planned' },
  tui_da_quy: { label: 'Túi Đá Quý', description: 'Túi Đá Quý chưa có kho đá quý riêng; không tự chuyển đổi Nguyên Bảo cũ.', state: 'planned' },
  dien_vo_lenh: { label: 'Điện Võ Lệnh', description: 'Hệ thống Võ Lệnh chưa có loại tiền hoặc giao dịch online.', state: 'planned' },
  trang_bi_quan_su: { label: 'Trang Bị Quân Sư', description: 'Trang bị Quân Sư chưa có ô trang bị hoặc cơ chế lưu online.', state: 'planned' },
  huyen_thu: { label: 'Huyễn Thú', description: 'Hệ thống Huyễn Thú chưa có vật phẩm hoặc cơ chế lưu online.', state: 'planned' },
};

export function isCollectionId(value: unknown): value is CollectionId {
  return typeof value === 'string' && (COLLECTION_IDS as readonly string[]).includes(value);
}

function equipmentEntries(save: SaveV2, accepts: (id: keyof typeof EQUIPMENT) => boolean): InventoryEntry[] {
  return (save.equipment ?? []).filter(item => Object.hasOwn(EQUIPMENT, item.itemId) && accepts(item.itemId))
    .map(item => {
      const definition = EQUIPMENT[item.itemId];
      const stats = gearStats(item);
      const values = (Object.keys(stats) as Array<keyof typeof stats>)
        .filter(stat => stats[stat] > 0).map(stat => stat.toUpperCase() + ' +' + stats[stat]).join(' · ');
      const signature = isSignature(item.itemId);
      return {
        id: 'gear:' + item.uid,
        name: definition.name + (item.level > 1 ? ' +' + (item.level - 1) : ''),
        quantity: 1,
        category: 'items' as const,
        rarity: definition.rarity,
        textureKey: 'inventory.gear.' + item.itemId,
        description: EQUIPMENT_SLOTS[definition.slot] + ' · ' + values +
          (item.heroId ? ' · Đã trang bị cho ' + item.heroId : ' · Chưa trang bị'),
        ...(signature
          ? item.heroId ? { destination: { scene: 'Heroes', label: 'Xem Thần Binh', data: { heroId: item.heroId, tab: 'signature' } } } : {}
          : { destination: { scene: 'Equipment', label: 'Quản lý trang bị', data: { bag: true, uid: item.uid } } }),
      };
    });
}

/** Read-only projection of authoritative SaveV2. No item quantities or battle bonuses are invented. */
export function collectionEntries(save: SaveV2, category: CollectionId): InventoryEntry[] {
  if (category === 'dao_cu') return inventoryEntries(save).filter(entry => entry.id !== ITEM_IDS.forgeShard);
  if (category === 'trang_bi') return equipmentEntries(save, id => !isSignature(id) && EQUIPMENT[id].slot !== 'relic');
  if (category === 'bao_vat') return equipmentEntries(save, id => EQUIPMENT[id].slot === 'relic');
  if (category === 'than_binh') return [
    ...inventoryEntries(save).filter(entry => entry.id === ITEM_IDS.forgeShard),
    ...equipmentEntries(save, id => isSignature(id) || isForgeWeapon(id)),
  ];
  return [];
}
