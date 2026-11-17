import {describe,it,expect} from 'vitest';
import {battleFormationPosition} from '../src/data/battleLayout';
import {BattleAnimationEventBridge} from '../src/ui/BattleAnimationEventBridge';
import {bindBattlePresentationClock} from '../src/ui/BattlePresentationClock';
import {battleTurnQueue} from '../src/ui/battleTurnQueue';
import {makeArenaPracticeBattle} from '../src/domain/battle';

describe('battle presentation boundary',()=>{
  it('forecasts both teams in Core scheduling order without changing combat state',()=>{
    const engine=makeArenaPracticeBattle(['guan-yu','liu-bei','zhang-fei','zhao-yun','cao-cao','lu-bu'],{});
    for(const unit of engine.units)unit.hp=unit.maxHp=100000;
    const before=structuredClone(engine.units),forecast=battleTurnQueue(engine.units,12).map(u=>u.uid);
    expect(engine.units).toEqual(before);
    const actions=[];
    for(let i=0;i<12;i++)actions.push(engine.step().find(e=>e.kind==='action')?.source);
    expect(forecast).toEqual(actions);
    const dead=before[0];dead.hp=0;
    expect(battleTurnQueue(before,24).some(u=>u.uid===dead.uid)).toBe(false);
    expect(battleTurnQueue([])).toEqual([]);
  });
  it('shares the game delta with tweens and restores the original manager clock',()=>{
    let listener:(_time:number,delta:number)=>void=()=>{};
    const original=()=>999;
    const scene={events:{on:(_key:string,fn:typeof listener)=>{listener=fn;},off:()=>{}},tweens:{getDelta:original}};
    const restore=bindBattlePresentationClock(scene as never);
    listener(1000,16);expect(scene.tweens.getDelta()).toBe(16);
    listener(1016,33);expect(scene.tweens.getDelta()).toBe(33);
    restore();expect(scene.tweens.getDelta).toBe(original);
  });
  it('keeps the Core front/back slots in two mirrored columns and three rows',()=>{
    for(const side of ['player','enemy'] as const){
      const positions=Array.from({length:6},(_,i)=>battleFormationPosition(side,i));
      expect(new Set(positions.map(p=>p.x)).size).toBe(2);
      expect(new Set(positions.map(p=>p.y)).size).toBe(3);
      expect(new Set(positions.map(p=>`${p.x}:${p.y}`)).size).toBe(6);
      for(let row=0;row<3;row++){
        expect(positions[row].y).toBe(positions[row+3].y);
        expect(Math.abs(positions[row].x-640)).toBeLessThan(Math.abs(positions[row+3].x-640));
        const opposite=battleFormationPosition(side==='player'?'enemy':'player',row);
        expect(positions[row].x+opposite.x).toBe(1280);
      }
    }
  });
  it('delivers each ordered impact once and cancels stale callbacks after skip/restart',()=>{
    const timers:{callback:()=>void;removed:boolean}[]=[];
    const scene={time:{delayedCall:(_delay:number,callback:()=>void)=>{
      const timer={callback,removed:false,remove(){this.removed=true;}};timers.push(timer);return timer;
    }}};
    const bridge=new BattleAnimationEventBridge(scene as never),seen:number[]=[];
    bridge.begin();bridge.after(100,()=>seen.push(1),0);bridge.after(100,()=>seen.push(999),0);
    bridge.after(120,()=>seen.push(2),1);timers.forEach(t=>t.callback());
    expect(seen).toEqual([1,2]);
    bridge.after(500,()=>seen.push(3),2);const stale=timers.at(-1)!;
    bridge.begin();expect(stale.removed).toBe(true);stale.callback();expect(seen).toEqual([1,2]);
    bridge.after(100,()=>seen.push(4),0);timers.at(-1)!.callback();expect(seen).toEqual([1,2,4]);
  });
});
