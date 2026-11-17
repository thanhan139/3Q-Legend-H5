import type Phaser from 'phaser';

/** Phaser 3.90 tweens normally use Date.now(), while timers/sprites use game delta.
 * Use one delta inside Battle only, including after blur, slow frames and speed changes.
 */
export function bindBattlePresentationClock(scene:Phaser.Scene){
  let delta=0;
  const original=scene.tweens.getDelta;
  const frame=(_time:number,value:number)=>{delta=value;};
  scene.events.on('preupdate',frame);
  scene.tweens.getDelta=()=>delta;
  return()=>{scene.events.off('preupdate',frame);scene.tweens.getDelta=original;};
}
