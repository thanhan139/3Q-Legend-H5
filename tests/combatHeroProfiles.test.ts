import {describe,it,expect} from 'vitest';
import {HEROES,HERO_BY_ID} from '../src/data/heroes';
import {HERO_SKILLS} from '../src/data/heroSkills';
import {COMBAT_SIGNATURES,COMBAT_HERO_STYLES,combatHeroStyle,combatHeroMelee,combatHeroSwing} from '../src/ui/combatHeroProfiles';
import manifest from '../src/data/combatVfxManifest.json';
describe('combat asset ownership and identity',()=>{
 it('covers exactly the existing roster, without borrowing another hero signature',()=>{
  expect(Object.keys(COMBAT_HERO_STYLES).sort()).toEqual(HEROES.map(h=>h.id).sort());
  for(const [id,fx] of Object.entries(COMBAT_SIGNATURES)){expect(HERO_BY_ID[id]).toBeDefined();expect(HERO_SKILLS[id]).toBeDefined();expect(manifest.data.find(s=>s.id===fx)?.category).toBe('signature');}
  expect(COMBAT_SIGNATURES['lu-bu']).toBeUndefined();expect(COMBAT_SIGNATURES['diao-chan']).toBeUndefined();expect(combatHeroStyle('new-unapproved-hero')).toBeUndefined();
 });
 it('maps actual weapons instead of assuming balance roles define projectile art',()=>{
  expect(combatHeroStyle('ma-chao')).toBe('thrust');expect(combatHeroMelee('gan-ning')).toBe(true);
  expect(combatHeroStyle('huang-yueying')).toBe('ranged');expect(combatHeroStyle('pei-yuan-shao')).toBe('ranged');
  expect(combatHeroStyle('lu-bu')).toBe('melee');expect(combatHeroStyle('diao-chan')).toBe('magic');
  expect(combatHeroSwing('lu-bu')).toBe('melee_heavy_impact');
 });
});
