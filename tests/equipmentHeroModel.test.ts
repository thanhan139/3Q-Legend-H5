import {describe,it,expect} from 'vitest';
import {baseSave} from '../src/domain/store';
import {equipmentHeroModel} from '../src/ui/equipmentHeroModel';
function saved(){const s=baseSave();s.heroes=['guan-yu','zhang-fei','zhao-yun','lu-bu','zhuge-liang','diao-chan'];
 s.equipment=[{uid:'a',itemId:'blade',level:3,heroId:'guan-yu'},{uid:'b',itemId:'armor',level:2,heroId:'zhang-fei'}];return s;}
describe('selectedHeroId equipment binding',()=>{
 it('switches identity, owned slots, stats and theme together and drops a foreign item selection',()=>{
  const s=saved(),a=equipmentHeroModel(s,'guan-yu','a')!,b=equipmentHeroModel(s,'zhang-fei','a')!;
  expect(a.hero.id).toBe(a.selectedHeroId);expect(a.selectedUid).toBe('a');expect(a.theme?.theme_name).toBe('Thanh Long');
  expect(b.hero.name).toBe('Trương Phi');expect(b.theme).toBeUndefined();expect(b.selectedUid).toBeUndefined();
  expect(b.equipped.map(g=>g.uid)).toEqual(['b']);expect(b.slots.every(slot=>!slot.item||slot.item.heroId==='zhang-fei')).toBe(true);
  expect(a.stats).not.toEqual(b.stats);expect(a.power).not.toBe(b.power);
 });
 it('keeps separate save snapshots independent and never mutates player data',()=>{
  const a=saved(),b=saved();b.equipment=[];b.heroExp['guan-yu']=500;const original=JSON.stringify([a,b]);
  for(let i=0;i<20;i++)equipmentHeroModel(i%2?a:b,'guan-yu','a');
  expect(JSON.stringify([a,b])).toBe(original);expect(equipmentHeroModel(b,'guan-yu','a')!.selectedUid).toBeUndefined();
  expect(equipmentHeroModel(b,'guan-yu')!.equipped).toHaveLength(0);
 });
 it('maps all five supplied themes to real hero IDs and falls back without borrowing another identity',()=>{
  const s=saved();for(const id of ['guan-yu','zhao-yun','lu-bu','zhuge-liang','diao-chan'])expect(equipmentHeroModel(s,id)!.theme).toBeDefined();
  expect(equipmentHeroModel(s,'zhang-fei')!.hero.id).toBe('zhang-fei');expect(equipmentHeroModel(s,'not-owned')!.selectedHeroId).toBe('guan-yu');
 });
});
