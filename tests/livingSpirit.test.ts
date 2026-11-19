import {describe,it,expect} from 'vitest';
import {baseSave} from '../src/domain/store';
import {SpiritPlaybackState,spiritDefinition,spiritSourceTexture,spiritTexture,confirmedSpiritUpgrade} from '../src/ui/livingSpiritState';
describe('Living Spirit Phase 2A + 2B',()=>{
 it('maps the five canonical heroes and uses complete PNG clips',()=>{
  for(const [id,slug] of [['guan-yu','quan_vu'],['zhao-yun','trieu_van'],['lu-bu','lu_bo'],['zhuge-liang','gia_cat_luong'],['diao-chan','dieu_thuyen']]){
   const definition=spiritDefinition(id);expect(definition.hero_id_hint).toBe(slug);
   for(const [name,spec] of Object.entries(definition.clips)){
    const painted=Boolean(definition.visualVariant);
    expect(spec.atlas).toMatch(/\.png$/);expect(spec.frameWidth).toBe(painted?443:384);expect(spec.frameHeight).toBe(painted?443:384);
    expect(spec.frames).toBe(painted?8:name==='idle'?16:12);expect(spec.repeat).toBe(name==='idle'?-1:0);
    expect(spec.duration_ms_per_frame).toBe(name==='idle'?145:name==='selected'?95:85);
   }
  }
  expect(spiritDefinition('zhang-fei')).toBeUndefined();expect(spiritDefinition('missing')).toBeUndefined();
 });
 it('shares the two painted source textures across three distinct animation states',()=>{
  for(const slug of ['gia_cat_luong','dieu_thuyen']){
   expect(spiritSourceTexture(slug,'power_up')).toBe(spiritSourceTexture(slug,'idle'));
   expect(spiritTexture(slug,'power_up')).not.toBe(spiritTexture(slug,'idle'));
   expect(spiritTexture(slug,'idle')).toContain('painted-v2');
  }
  expect(spiritSourceTexture('quan_vu','power_up')).toBe('livingSpirit:quan_vu:power_up');
 });
 it('gates expansion power-up by confirmed ownership and enhancement too',()=>{
  for(const id of ['lu-bu','zhuge-liang','diao-chan']){
   const before=baseSave();before.equipment=[{uid:id,itemId:'blade',level:1,heroId:id}];
   const after=structuredClone(before);after.equipment![0].level=2;const command={type:'enhance',uid:id,useStone:false,feeCurrency:'copper'} as const;
   expect(confirmedSpiritUpgrade(before,after,id,command,true)).toBe(`${id}:${id}:2`);
   expect(confirmedSpiritUpgrade(before,after,id,command,false)).toBeUndefined();
   expect(confirmedSpiritUpgrade(before,before,id,command,true)).toBeUndefined();
  }
 });
 it('selects once on hero changes, keeps idle across tabs, separates account state',()=>{
  const state=new SpiritPlaybackState();
  expect(state.select('a','guan-yu')).toBe('selected');expect(state.select('a','guan-yu')).toBe('idle');
  expect(state.select('a','zhao-yun')).toBe('selected');expect(state.select('a','guan-yu')).toBe('selected');
  expect(state.select('b','guan-yu')).toBe('selected');
 });
 it('queues confirmed upgrades until visible and deduplicates retries',()=>{
  const state=new SpiritPlaybackState();state.select('a','guan-yu');
  expect(state.confirm('a','guan-yu','gear:2')).toBe(true);expect(state.confirm('a','guan-yu','gear:2')).toBe(false);
  expect(state.select('a','guan-yu',true)).toBe('idle');expect(state.select('a','guan-yu')).toBe('power_up');
  expect(state.select('a','guan-yu')).toBe('idle');
  state.confirm('a','guan-yu','gear:3');expect(state.select('b','guan-yu')).toBe('selected');expect(state.select('b','guan-yu')).toBe('idle');
 });
 it('requires a successful receipt and a confirmed level increase of the selected owner gear',()=>{
  const before=baseSave();before.equipment=[{uid:'weapon',itemId:'blade',level:1,heroId:'guan-yu'}];
  const after=structuredClone(before);after.equipment![0].level=2;
  const command={type:'enhance',uid:'weapon',useStone:false,feeCurrency:'copper'} as const;
  expect(confirmedSpiritUpgrade(before,after,'guan-yu',command,true)).toBe('guan-yu:weapon:2');
  expect(confirmedSpiritUpgrade(before,after,'guan-yu',command,false)).toBeUndefined();
  expect(confirmedSpiritUpgrade(before,before,'guan-yu',command,true)).toBeUndefined();
  expect(confirmedSpiritUpgrade(before,after,'zhao-yun',command,true)).toBeUndefined();
  expect(confirmedSpiritUpgrade(before,after,'guan-yu',{type:'equip',uid:'weapon',heroId:'guan-yu'},true)).toBeUndefined();
  expect(before.equipment[0].level).toBe(1);
 });
});
