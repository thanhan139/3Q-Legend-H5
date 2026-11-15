import { describe, expect, it } from 'vitest';
import { makeStageBattle, BattleEngine } from '../src/domain/battle';
import { STAGES } from '../src/data/campaign';

const FULL_TEAM=['zhang-fei','guan-yu','zhao-yun','liu-bei','huang-yueying','ma-chao'];

describe('BattleEngine 6v6 core',()=>{
  it('supports up to six allies and six enemies',()=>{
    const stage=STAGES.find(stage=>stage.id==='3-1')!;
    const engine=makeStageBattle(stage,FULL_TEAM);
    expect(engine.units.filter(unit=>unit.side==='player')).toHaveLength(6);
    expect(engine.units.filter(unit=>unit.side==='enemy')).toHaveLength(6);
  });
  it('starts with three heroes if other slots are empty',()=>{
    const engine=makeStageBattle(STAGES[0],[...FULL_TEAM.slice(0,3),null,null,null]);
    expect(engine.units.filter(unit=>unit.side==='player')).toHaveLength(3);
  });
  it('eventually terminates with one winner',()=>{
    const engine=makeStageBattle(STAGES[0],FULL_TEAM);
    const winner=engine.finish();
    expect(['player','enemy']).toContain(winner);
    expect(engine.turn).toBeLessThanOrEqual(500);
  });
  it('produces the same victory and events through normal steps and skip',()=>{
    const starters=['zhang-fei','guan-yu',null,'liu-bei',null,null];
    const normal=makeStageBattle(STAGES[0],starters);
    const skipped=makeStageBattle(STAGES[0],starters);
    while(!normal.winner) normal.step();
    expect(normal.winner).toBe('player');
    expect(skipped.finish()).toBe(normal.winner);
    expect(skipped.log).toEqual(normal.log);
  });
  it('reports defeat when a lone starter falls against six enemies',()=>{
    const stage=STAGES.find(candidate=>candidate.id==='3-1')!;
    expect(makeStageBattle(stage,['zhang-fei',null,null,null,null,null]).finish()).toBe('enemy');
  });
  it('does not allow duplicate slots',()=>{
    const engine=makeStageBattle(STAGES[0],FULL_TEAM);
    const duplicate={...engine.units[0],uid:'player-other'};
    expect(()=>new BattleEngine([...engine.units,duplicate])).toThrow();
  });
  it('does not act again after the battle ends',()=>{
    const engine=makeStageBattle(STAGES[0],FULL_TEAM);
    engine.finish();
    expect(engine.step()).toEqual([]);
  });
});
