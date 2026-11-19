import {describe,it,expect} from 'vitest';
import categories from '../src/data/inventoryCategoryAssets.json';
import {inventoryCategoryLayout} from '../src/ui/inventoryCategoryLayout';
import {INVENTORY_CATEGORY_CONFIG} from '../src/ui/inventoryCategoryConfig';
describe('icon-first inventory navigation',()=>{
 it('retains all thirteen unique supplied identities and unlabeled runtime PNGs',()=>{
  expect(categories).toHaveLength(13);expect(new Set(categories.map(c=>c.id)).size).toBe(13);
  expect(categories.map(c=>c.order)).toEqual(Array.from({length:13},(_,i)=>i+1));
  for(const c of categories){expect(c.file).not.toContain('labeled');expect(c.bounds[2]).toBeLessThanOrEqual(320);expect(c.bounds[3]).toBeLessThanOrEqual(320);}
 });
 it('opens the existing signature hero tab and preserves the other bag routes',()=>{
  const items=Object.fromEntries(INVENTORY_CATEGORY_CONFIG.map(category=>[category.id,category]));
  expect(items.than_binh).toMatchObject({featureState:'available',destination:'Heroes',sceneData:{tab:'signature'}});
  expect(items.dao_cu.destination).toBe('Inventory');
  expect(items.trang_bi).toMatchObject({destination:'Equipment',sceneData:{bag:true}});
  expect(items.trang_suc).toMatchObject({destination:'Jewelry',sceneData:{bag:true}});
 });
 it.each([[1920,1080],[1280,720],[844,390]])('keeps the shared panel and touch targets inside %s × %s',(w,h)=>{
  const l=inventoryCategoryLayout(w,h);expect(l.x).toBeGreaterThanOrEqual(12);expect(l.y).toBeGreaterThanOrEqual(12);
  expect(l.x+l.width).toBeLessThanOrEqual(w-12);expect(l.y+l.height).toBeLessThanOrEqual(h-12);
  expect(l.pitch-6).toBeGreaterThanOrEqual(44);expect(l.row-4).toBeGreaterThanOrEqual(44);
  if(!l.mobile)expect(l.content).toBeLessThanOrEqual(l.viewport);
 });
});
