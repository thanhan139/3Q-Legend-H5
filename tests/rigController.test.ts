import {describe,it,expect} from 'vitest';
import {RigAnimationController} from '../src/ui/RigAnimationController';
import {characterRigPose} from '../src/ui/characterRigPose';
function fixture(){
  let update=(_time:number,_delta:number)=>{},unsubscribed=false;
  const scene={events:{on:(_event:string,callback:typeof update,context:object)=>{update=callback.bind(context);},off:()=>{unsubscribed=true;}}};
  const rig={heroId:'zhao-yun',applyPose:()=>{},jointSnapshot:()=>({})};
  const controller=new RigAnimationController(scene as never,rig as never);
  return{controller,step:(delta:number)=>update(0,delta),disposed:()=>unsubscribed};
}
describe('articulated animation state lifecycle',()=>{
  it('reaches the contact keypose at the resolved impact delay',()=>{
    const {controller:c,step}=fixture();c.play('attack',320);step(320);
    expect(c.debug().duration).toBe(500);
    expect(c.debug().pose).toEqual(characterRigPose('zhao-yun','attack',320,500));
    step(200);expect(c.currentState).toBe('idle');
  });
  it('holds death terminal until an explicit revival and releases its update listener',()=>{
    const {controller:c,step,disposed}=fixture();c.play('death');step(300);
    expect(c.debug().pose.nearKnee).toBeGreaterThan(80);c.play('attack');expect(c.currentState).toBe('death');
    c.stop();const stopped=c.debug();step(1000);expect(c.debug()).toEqual(stopped);
    c.revive();step(100);expect(c.currentState).toBe('idle');c.destroy();expect(disposed()).toBe(true);
  });
  it('uses the shared rate and does not restart an already running state',()=>{
    const {controller:c,step}=fixture();c.play('run');c.setPlaybackRate(0);step(1000);expect(c.debug().elapsed).toBe(0);
    c.setPlaybackRate(4);step(25);c.play('run');expect(c.debug().elapsed).toBe(100);
    c.play('victory');step(200);expect(c.currentState).toBe('victory');expect(c.debug().pose.nearArm).toBeLessThan(-100);
  });
});
