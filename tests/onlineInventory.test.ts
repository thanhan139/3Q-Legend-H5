import { describe, expect, it } from 'vitest';
import { parseOnlineRows, onlineCollectionEntries } from '../src/ui/onlineInventory';
import { COLLECTION_IDS } from '../src/ui/inventoryCollections';
describe('Server-owned items across thirteen collections',()=>{
 it('uses existing 13 category ids without an invented balance',()=>{
  expect(COLLECTION_IDS).toHaveLength(13);
  for(const id of COLLECTION_IDS) expect(onlineCollectionEntries([],id)).toEqual([]);
 });
 it('accepts validated server quantities but not malformed, duplicate, or cross-category values',()=>{
  const a={item_id:'gau_truc_dong_hanh',quantity:2,item:{category_id:'pet',name_vi:'Gấu Trúc',description_vi:'Linh thú',rarity:'SR'}};
  const list=parseOnlineRows([a,{...a,quantity:20},{...a,item_id:'bad',quantity:-1},{...a,item_id:'x',item:{...a.item,category_id:'unknown'}}]);
  expect(list).toHaveLength(1);
  expect(onlineCollectionEntries(list,'pet').map(x=>[x.id,x.quantity])).toEqual([['online:gau_truc_dong_hanh',2]]);
  expect(onlineCollectionEntries(list,'chien_hon')).toEqual([]);
 });
});
