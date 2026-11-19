import { HERO_BY_ID, heroFamily } from '../data/heroes';
import { isSignature, SignatureConfig, signatureIds, type SignatureId } from '../data/signatureConfig';
import { enhancement, gearStats, type Gear } from '../domain/equipment';
import type { SaveV2 } from '../domain/types';

export function signatureView(save: SaveV2, heroId: string, requested?: SignatureId, requestedUid?: string) {
  const gear=save.equipment??[];
  const equipped=gear.find(item=>item.heroId===heroId&&isSignature(item.itemId));
  const selectedId=requested&&isSignature(requested)?requested:
    equipped&&isSignature(equipped.itemId)?equipped.itemId:
      signatureIds.find(id=>SignatureConfig[id].hero===heroFamily(heroId))??signatureIds[0];
  const cards=signatureIds.map(id=>{
    const copies=gear.filter(item=>item.itemId===id);
    const item=(id===selectedId?copies.find(entry=>entry.uid===requestedUid):undefined)??
      copies.find(entry=>entry.heroId===heroId)??copies.find(entry=>!entry.heroId)??copies[0];
    return {id,copies,item,state:!item?'locked':item.heroId?'equipped':'stored',
      upgrade:item?enhancement(item):undefined} as const;
  });
  const selected=cards.find(card=>card.id===selectedId)!;
  const base: Gear = {uid:'',itemId:selected.id,level:1};
  return {cards,selected,stats:gearStats(selected.item??base),
    wielder:selected.item?.heroId?HERO_BY_ID[selected.item.heroId]?.name:undefined};
}
