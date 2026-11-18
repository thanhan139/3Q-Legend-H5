import {describe,it,expect} from 'vitest';
import {duoActor,duoActorKey,duoClips,isDuoSkillCast} from '../src/ui/combatDuoConfig';
import mapping from '../src/data/combatDuoManifest.json';
import {RAGE_CONFIG} from '../src/data/rageConfig';
import type {BattleEvent} from '../src/domain/battle';
describe('Lu Bu / Diao Chan combat v1.1',()=>{
 it('uses existing identities and exact authored pose counts in a Battle-only namespace',()=>{
  for(const id of ['lu-bu','diao-chan']){const actor=duoActor(id),clips=duoClips(id)!;
   expect(actor.frameWidth).toBe(384);expect(duoActorKey(id)).not.toMatch(/^battle-poses-/);
   for(const [state,count] of [['idle',4],['run',4],['attack',4],['skill',2],['hit',1],['death',1]] as const){expect(clips[state]!.end-clips[state]!.start+1).toBe(count);}
   expect(clips.attack!.contactFrame).toBe(10);
  }expect(duoActor('unknown-new-hero')).toBeUndefined();
 });
 it('does not confuse ready rage, a normal attack, or another hero skill with confirmed cast',()=>{
  const cast:BattleEvent={kind:'action',actionType:'skill',skill:true,skillId:'lu-bu:ultimate',rageBefore:RAGE_CONFIG.skillThreshold};
  expect(isDuoSkillCast(cast,'lu-bu')).toBe(true);expect(isDuoSkillCast(cast,'diao-chan')).toBe(false);
  expect(isDuoSkillCast({...cast,kind:'rage'},'lu-bu')).toBe(false);
  expect(isDuoSkillCast({...cast,actionType:'normal'},'lu-bu')).toBe(false);
  expect(isDuoSkillCast({...cast,rageBefore:RAGE_CONFIG.skillThreshold-1},'lu-bu')).toBe(false);
  expect(isDuoSkillCast({...cast,skill:false},'lu-bu')).toBe(false);
 });
 it('has a looping ready aura and exactly 20 full rage FX frames for both heroes',()=>{
  for(const clips of Object.values(mapping.vfx_clips)){expect(clips.rage_ready.loop).toBe(true);expect(clips.rage_full.loop).toBe(false);expect(clips.rage_full.frames).toBe(20);expect(clips.rage_full.fps).toBe(16);}
 });
});
