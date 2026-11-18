import Phaser from 'phaser';
import manifest from '../data/combatVfxManifest.json';
import {heroFamily} from '../data/heroes';
import {COMBAT_SIGNATURES,combatHeroStyle,combatHeroSwing} from './combatHeroProfiles';
export {COMBAT_SIGNATURES} from './combatHeroProfiles';
type Point={x:number;y:number};
const key=(id:string)=>'combat.feedback.'+id;
export function loadCombatFeedback(scene:Phaser.Scene){
 for(const spec of manifest.data)if(!scene.textures.exists(key(spec.id)))scene.load.spritesheet(key(spec.id),
  import.meta.env.BASE_URL+'assets/combat-vfx/'+spec.spritesheet.replace('assets/',''),
  {frameWidth:spec.frameWidth,frameHeight:spec.frameHeight,startFrame:0,endFrame:spec.frameCount-1});
}
/** Presentation only: no engine/store/command access and no damage callbacks. */
export class CombatFeedbackVfx{
 private active=new Map<Phaser.GameObjects.Sprite,string|undefined>();private rate=1;
 constructor(private scene:Phaser.Scene,private reduced=false){
  for(const spec of manifest.data)if(!scene.anims.exists(key(spec.id)))scene.anims.create({key:key(spec.id),
   frames:scene.anims.generateFrameNumbers(key(spec.id),{start:0,end:spec.frameCount-1}),frameRate:spec.fps,repeat:0});
 }
 setRate(rate:number){this.rate=rate;for(const sprite of this.active.keys())sprite.anims.timeScale=rate;}
 play(id:string,p:Point,size=135,owner?:string,flip=false){
  if(this.reduced||!this.scene.anims.exists(key(id)))return;
  if(this.active.size>=48)this.remove(this.active.keys().next().value!);
  const sprite=this.scene.add.sprite(p.x,p.y,key(id),0).setScale(size/256).setFlipX(flip).setDepth(8).setName('combat.feedback.'+id);
  const spec=manifest.data.find(s=>s.id===id)!;sprite.setOrigin(spec.origin[0],spec.origin[1]);
  this.active.set(sprite,owner);sprite.anims.timeScale=this.rate;sprite.play(key(id));
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>this.remove(sprite));return sprite;
 }
 cast(heroId:string,p:Point,heal=false){
  if(heal)this.play('heal_cast_circle',p,105);
  else if(combatHeroStyle(heroId)==='magic'){this.play('magic_cast_circle',p,110);this.play('magic_charge',{x:p.x,y:p.y-52},110);}
 }
 travel(heroId:string,from:Point,to:Point,duration:number,multi=false,owner?:string){
  const style=combatHeroStyle(heroId);if(style!=='ranged'&&style!=='magic')return;
  const arrow=style==='ranged',id=arrow?(multi?'ranged_multi_shot':'ranged_projectile_arrow'):'magic_projectile';
  const sprite=this.play(id,from,arrow?95:105,owner);if(!sprite)return;
  sprite.setRotation(Math.atan2(to.y-from.y,to.x-from.x));
  // Projectile survives until scheduled contact, independent of its short one-shot sheet.
  sprite.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);
  if(arrow)this.play('ranged_arrow_trail',from,90,owner);
  this.scene.tweens.add({targets:sprite,x:to.x,y:to.y,duration,ease:'Linear',onComplete:()=>this.remove(sprite)});
 }
 hit(heroId:string,p:Point,owner:string,skill=false,heal=false,crit=false,flip=false,weapon?:Point){
  const style=combatHeroStyle(heroId);if(!style)return;
  const center={x:p.x,y:p.y-52};
  if(heal){this.play('heal_target_glow',center,145,owner);this.play('heal_particles',center,125,owner);}
  else if(style==='ranged')this.play('ranged_impact',center,125,owner,flip);
  else if(style==='magic'){this.play('magic_impact_burst',center,150,owner);if(skill)this.play('magic_aoe_ground',p,145,owner);}
  else{this.play(combatHeroSwing(heroId),weapon??center,145,owner,flip);
   this.play(crit?'melee_heavy_impact':'melee_hit_spark',center,110,owner);if(crit)this.play('melee_ground_shock',p,135,owner);}
  if(skill&&COMBAT_SIGNATURES[heroFamily(heroId)])this.play(COMBAT_SIGNATURES[heroFamily(heroId)],center,175,owner,flip);
 }
 status(p:Point,owner:string,shield=false){this.play(shield?'support_shield':'buff_activate',{x:p.x,y:p.y-50},125,owner);}
 death(p:Point,owner:string){
  this.clearOwner(owner);for(const id of ['death_flash','death_dissolve','death_particles','death_shadow_fade'])this.play(id,{x:p.x,y:p.y-(id==='death_shadow_fade'?0:52)},125,owner);
  this.scene.time.delayedCall(600,()=>this.clearOwner(owner));
 }
 clearOwner(owner:string){for(const [sprite,id] of this.active)if(id===owner)this.remove(sprite);}
 private remove(sprite:Phaser.GameObjects.Sprite){this.active.delete(sprite);if(sprite.scene){this.scene.tweens.killTweensOf(sprite);sprite.destroy();}}
 clear(){for(const sprite of [...this.active.keys()])this.remove(sprite);}
}
