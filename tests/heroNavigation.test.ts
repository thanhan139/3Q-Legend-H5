import {describe,it,expect} from 'vitest';
import {HeroNavigation,heroTabRoute} from '../src/ui/heroNavigation';
import {baseSave} from '../src/domain/store';
import {equipmentHeroModel} from '../src/ui/equipmentHeroModel';
import {signatureView} from '../src/ui/signatureView';
import {signatureIds} from '../src/data/signatureConfig';
import {gearStats} from '../src/domain/equipment';
describe('unified hero navigation',()=>{
 it('preloads a candidate without changing selection or account ownership',()=>{
  const s=baseSave();s.heroes=['guan-yu','zhao-yun'];const state=new HeroNavigation();state.resolve(s,'a','guan-yu');
  expect(state.candidate(s,'a','zhao-yun')).toBe('zhao-yun');expect(state.selectedHeroId).toBe('guan-yu');
  expect(state.candidate(s,'b')).toBe('guan-yu');expect(state.accountKey).toBe('a');
 });
 it('keeps the selected hero through every tab and clears on account change',()=>{
  const s=baseSave();s.heroes=['guan-yu','zhang-fei'];const state=new HeroNavigation();
  expect(state.resolve(s,'uid-a','zhang-fei')).toBe('zhang-fei');
  for(const tab of ['detail','skills','equipment','signature'] as const){
   const route=heroTabRoute(tab,state.selectedHeroId!);
   expect(route.data.heroId).toBe('zhang-fei');
   expect(state.resolve(s,'uid-a',undefined,tab)).toBe('zhang-fei');
  }
  expect(state.resolve(s,'uid-b')).toBe('guan-yu');
 });
 it('uses the current owner gear and stats and cannot carry a foreign UID',()=>{
  const s=baseSave();s.heroes=['guan-yu','zhang-fei'];
  s.equipment=[{uid:'guan',itemId:'blade',level:4,heroId:'guan-yu'},{uid:'zhang',itemId:'armor',level:2,heroId:'zhang-fei'}];
  const before=JSON.stringify(s),model=equipmentHeroModel(s,'zhang-fei','guan')!;
  expect(model.equipped.map(g=>g.uid)).toEqual(['zhang']);expect(model.selectedUid).toBeUndefined();
  expect(model.hero.name).toBe('Trương Phi');expect(JSON.stringify(s)).toBe(before);
 });
 it('permits collection previews while rejecting unowned equipment routes',()=>{
  const s=baseSave();s.heroes=['guan-yu'];const state=new HeroNavigation();
  expect(state.resolve(s,'uid-a','diao-chan','detail',true)).toBe('diao-chan');
  expect(state.resolve(s,'uid-a',undefined,'equipment')).toBe('guan-yu');
  expect(state.resolve(s,'uid-a','missing')).toBe('guan-yu');
 });
 it('selects the worn signature first, shows all six states, and limits an instance to its own signature',()=>{
  const save=baseSave();
  save.equipment=[{uid:'equipped',itemId:'silverSpear',heroId:'guan-yu',level:3},
    {uid:'other',itemId:'azureMoon',heroId:'zhang-fei',level:2},
    {uid:'stored',itemId:'azureMoon',level:1}];
  const initial=signatureView(save,'guan-yu');
  expect(initial.cards.map(card=>card.id)).toEqual(signatureIds);
  expect(initial.selected).toMatchObject({id:'silverSpear',state:'equipped',upgrade:2});
  expect(initial.stats).toEqual(gearStats(save.equipment[0]));
  expect(initial.wielder).toBe('Quan Vũ');
  expect(signatureView(save,'guan-yu','azureMoon','equipped').selected).toMatchObject({state:'stored',upgrade:0,item:{uid:'stored'}});
  expect(signatureView(save,'guan-yu','skyHalberd').selected).toMatchObject({state:'locked'});
 });
});
