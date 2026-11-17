import { describe, expect, it } from 'vitest';
import proposal from '../docs/vip/VIP_BALANCE_PROPOSAL.json';
import { VIP_LEVELS } from '../src/data/vipConfig';
import { vipLevel, vipProgress, vipBonuses, vipPlaybackSpeeds, vipGiftState } from '../src/domain/vip';
import { makeStageBattle, makeArenaPracticeBattle, battleCriticalRoll } from '../src/domain/battle';
import { STAGES } from '../src/data/campaign';
import { baseSave } from '../src/domain/store';
import { handleGameRequest, type GameBackend } from '../supabase/functions/game-command/handler';
import { legacyTutorial } from '../src/domain/tutorial';

describe('Approved VIP progression and combat',()=>{
  it.each(proposal.levels)('preserves approved VIP $vip thresholds/columns without stacking',row=>{
    expect(VIP_LEVELS[row.vip]).toEqual({level:row.vip,threshold:row.thresholdBaseKnb,bonuses:row.combatBonuses});
    expect(vipLevel(row.thresholdBaseKnb)).toBe(row.vip);
    expect(vipLevel(row.thresholdBaseKnb+1)).toBe(row.vip);
    if(row.vip)expect(vipLevel(row.thresholdBaseKnb-1)).toBe(row.vip-1);
    expect(vipBonuses(row.vip)).toEqual(row.combatBonuses);
    expect(vipBonuses(row.vip,'PvP').atkPct).toBeCloseTo(row.combatBonuses.atkPct*.6);
    expect(Number.isFinite(vipProgress(row.thresholdBaseKnb).fraction)).toBe(true);
  });
  it('caps VIP 18 and handles invalid totals/max-level progress',()=>{
    expect(vipLevel(Number.MAX_SAFE_INTEGER)).toBe(18);
    expect(vipProgress(50000000)).toMatchObject({level:18,fraction:1,remaining:0});
    expect(vipProgress(400000)).toMatchObject({level:5,lower:300000,upper:500000,fraction:.5,remaining:100000});
    for(const n of [NaN,Infinity,-1,0.5])expect(vipLevel(n)).toBe(0);
    expect(vipPlaybackSpeeds(0)).toEqual([1,2]);expect(vipPlaybackSpeeds(5)).toEqual([1,2,3]);expect(vipPlaybackSpeeds(9)).toEqual([1,2,3,4]);
  });
  it('applies five stats exactly once, with HP initialized and enemies/PvP untouched',()=>{
    const save=baseSave(),stage=STAGES[0];
    const original=makeStageBattle(stage,save.formation),upgraded=makeStageBattle(stage,save.formation,{}, {},undefined,5);
    const player=original.units.find(u=>u.side==='player')!,vip=upgraded.units.find(u=>u.uid===player.uid)!;
    expect(vip.atk).toBe(Math.round(player.atk*1.08));expect(vip.def).toBe(Math.round(player.def*1.05));
    expect(vip.maxHp).toBe(Math.round(player.maxHp*1.12));expect(vip.hp).toBe(vip.maxHp);
    expect(vip.criticalChance).toBe((player.criticalChance??0)+2);expect(vip.vipCriticalDamage).toBe(.1);
    expect(upgraded.units.filter(u=>u.side==='enemy')).toEqual(original.units.filter(u=>u.side==='enemy'));
    expect(makeStageBattle(stage,save.formation,{}, {},undefined,0).finish()).toEqual(original.finish());
    const arena=makeArenaPracticeBattle(save.formation,{});expect(arena.units.every(u=>u.vipCriticalDamage===undefined)).toBe(true);
  });
  it('renders gifts from published server offers only',()=>{
    expect(vipGiftState({paidBaseKnbTotal:0,offers:[]},5,'level')).toBe('locked');
    expect(vipGiftState({paidBaseKnbTotal:300000,offers:[]},5,'level')).toBe('developing');
    const offer={tier:5,kind:'level' as const,period:'once',rewards:{golden_key:1},claimed:false};
    expect(vipGiftState({paidBaseKnbTotal:300000,offers:[offer]},5,'level')).toBe('ready');
    expect(vipGiftState({paidBaseKnbTotal:300000,offers:[{...offer,claimed:true}]},5,'level')).toBe('claimed');
  });
  it('represents fractional critical points without rounding VIP 1 up or altering legacy rolls',()=>{
    for(const points of [.3,.5,.8,2.5,3.5]){
      let critical=0;
      for(let actions=0;actions<10000;actions++)if(battleCriticalRoll(actions,0,0,1,true)<8+points)critical++;
      expect(critical).toBe(Math.round((8+points)*100));
    }
    for(let actions=0;actions<500;actions++)expect(battleCriticalRoll(actions,2,4,1)).toBe((actions*17+2*13+4*7+11)%100);
  });
  it('routes claims through authenticated UID/backend and never accepts a client recharge',async()=>{
    const calls:string[]=[];
    const backend:GameBackend={user:async token=>token==='alice'?{id:'uid-a',email_confirmed_at:'2026-11-17'}:null,
      read:async()=>({state:baseSave(),revision:0,tutorial:legacyTutorial(),vip:{paidBaseKnbTotal:300000,offers:[]}}),
      receipt:async()=>false,create:async()=>({}),commit:async()=>({}),sign:async()=>'',verify:async()=>true,
      claimVip:async uid=>{calls.push(uid);return{status:'rejected'};}};
    const command={type:'vipClaim',tier:5,kind:'level',period:'once'} as const;
    const intent={action:'command',revision:'0',requestId:crypto.randomUUID(),command} as const;
    expect(await handleGameRequest(intent,'other',backend)).toEqual({status:'unauthorized'});
    await handleGameRequest(intent,'alice',backend);expect(calls).toEqual(['uid-a']);
    await handleGameRequest({...intent,command:{...command,tier:19}},'alice',backend);expect(calls).toHaveLength(1);
    const forged={...intent,command:{type:'paidRecharge',baseKnb:50000000}};
    expect(await handleGameRequest(forged as never,'alice',backend)).toMatchObject({status:'rejected'});
  });
  it('uses the server VIP for battle settlement even when a client forges a higher level',async()=>{
    const candidates=['pan-feng','zhang-fei','guan-yu','liu-bei'].flatMap(hero=>STAGES.map(stage=>({hero,stage})));
    const scenario=candidates.find(({hero,stage})=>makeStageBattle(stage,[hero]).finish()==='enemy'&&makeStageBattle(stage,[hero],{}, {},undefined,18).finish()==='player');
    expect(scenario).toBeDefined();
    const {hero,stage}=scenario!,save={...baseSave(),heroes:[hero],formation:[hero],clearedStages:STAGES.slice(0,STAGES.indexOf(stage)).map(s=>s.id)};
    const settle=async(paidBaseKnbTotal:number)=>{
      const backend:GameBackend={user:async()=>({id:'verified-uid',email_confirmed_at:'2026-11-17'}),
        read:async()=>({state:save,revision:0,tutorial:legacyTutorial(),vip:{paidBaseKnbTotal,offers:[]}}),
        receipt:async()=>false,create:async()=>({}),commit:async(_uid,_id,_revision,_command,state,receipt)=>({status:'ok',save:state,receipt}),
        sign:async()=>'',verify:async()=>true};
      const id=crypto.randomUUID(),ticket={id,stageId:stage.id,revision:'0',expiresAt:Date.now()+60000,signature:'f'.repeat(64)};
      return handleGameRequest({action:'command',revision:'0',requestId:id,command:{type:'battle',ticket,vip:18} as never},'token',backend);
    };
    expect(await settle(0)).toMatchObject({status:'ok',receipt:{winner:'enemy'}});
    expect(await settle(50000000)).toMatchObject({status:'ok',receipt:{winner:'player'}});
  });
});
