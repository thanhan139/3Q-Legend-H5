import {describe,it,expect} from 'vitest';
import {HEROES} from '../src/data/heroes';
import {CHIBI_SOURCES,CHIBI_LIMITS,chibiFoot} from '../src/data/chibiBattle';
import {battleCharacterDisplaySize,legacyBattleCharacterDisplaySize} from '../src/data/battleVisuals';
import {BATTLE_LAYOUT} from '../src/data/battleLayout';
import {battleSpriteFrames} from '../src/ui/battleSprites';
describe('original chibi battle presentation',()=>{
  it('preserves all 23 real identities and atlas indices',()=>{
    expect(Object.keys(CHIBI_SOURCES)).toHaveLength(23);
    for(const hero of HEROES){expect(CHIBI_SOURCES[hero.id].frame).toBe(battleSpriteFrames.get(hero.id));}
  });
  it('increases the original display by 10–20% without upscaling the source or exceeding a slot',()=>{
    for(const hero of HEROES){
      const source=CHIBI_SOURCES[hero.id],size=battleCharacterDisplaySize(hero.id),ratio=size/legacyBattleCharacterDisplaySize(hero.id);
      expect(ratio,hero.id).toBeGreaterThanOrEqual(1.10);expect(ratio,hero.id).toBeLessThanOrEqual(1.20);
      expect(size/256).toBeLessThanOrEqual(1);
      expect(size/256*source.maxHeight).toBeLessThanOrEqual(CHIBI_LIMITS.height+.001);
      expect(size/256*source.maxWidth).toBeLessThanOrEqual(CHIBI_LIMITS.width+.001);
    }
  });
  it('registers feet for every real clip frame without fabricating clips for static heroes',()=>{
    expect(Object.entries(CHIBI_SOURCES).filter(([,s])=>s.clips.length).map(([id])=>id).sort()).toEqual(['guan-yu','liu-bei','zhang-fei']);
    for(const [id,source] of Object.entries(CHIBI_SOURCES)){
      const feet=[chibiFoot(id),...source.clipFeet.map((_,i)=>chibiFoot(id,i))];
      for(const point of feet){expect(point.x).toBeGreaterThan(0);expect(point.x).toBeLessThan(1);expect(point.y).toBeGreaterThan(.9);expect(point.y).toBeLessThanOrEqual(1);}
      expect(source.clipFeet.length).toBe(source.clips.length?24:0);
    }
  });
  it('reserves room below feet and between rows for the existing HUD',()=>{
    expect(BATTLE_LAYOUT.hud.nameTop).toBeGreaterThan(0);
    for(let row=1;row<3;row++){
      const previousHudBottom=BATTLE_LAYOUT.rows[row-1]+BATTLE_LAYOUT.hud.rageY+5;
      expect(BATTLE_LAYOUT.rows[row]-CHIBI_LIMITS.height).toBeGreaterThanOrEqual(previousHudBottom);
    }
    expect(BATTLE_LAYOUT.rows[0]-CHIBI_LIMITS.height).toBeGreaterThanOrEqual(110);
    expect(BATTLE_LAYOUT.rows[2]+BATTLE_LAYOUT.hud.rageY+5).toBeLessThanOrEqual(608);
  });
});
