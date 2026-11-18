import Phaser from 'phaser';
import config from '../data/combatDuoManifest.json';
import {DUO_ALIASES as aliases,duoSlug,duoActorKey} from './combatDuoConfig';
export {duoActor,duoClips,duoActorKey} from './combatDuoConfig';
type Clip=keyof typeof config.vfx_clips.lu_bo;type Point={x:number;y:number};
const fxKey=(slug:string,clip:string)=>'combat.duo.'+slug+'.'+clip;
export function loadCombatDuo(scene:Phaser.Scene){
 for(const [id,slug] of Object.entries(aliases)){
  const a=config.actor_animations[slug];if(!scene.textures.exists(duoActorKey(id)))scene.load.spritesheet(duoActorKey(id),import.meta.env.BASE_URL+'assets/combat-duo-v11/'+a.path.replace('assets/',''),{frameWidth:a.frameWidth,frameHeight:a.frameHeight,endFrame:15});
  for(const [clip,s] of Object.entries(config.vfx_clips[slug]))if(!scene.textures.exists(fxKey(slug,clip)))scene.load.spritesheet(fxKey(slug,clip),import.meta.env.BASE_URL+'assets/combat-duo-v11/'+s.path.replace('assets/',''),{frameWidth:s.frameWidth,frameHeight:s.frameHeight,endFrame:s.frames-1});
 }
}
/** Actor-independent, presentation only. Confirmed cast and contacts are supplied by BattleScene. */
export class CombatDuoVfx{
 private active=new Map<Phaser.GameObjects.Sprite,string>();private ready=new Map<string,Phaser.GameObjects.Sprite>();private rate=1;
 constructor(private scene:Phaser.Scene,private reduced=false){for(const slug of Object.values(aliases))for(const [clip,s] of Object.entries(config.vfx_clips[slug]))if(!scene.anims.exists(fxKey(slug,clip)))scene.anims.create({key:fxKey(slug,clip),frames:scene.anims.generateFrameNumbers(fxKey(slug,clip),{start:0,end:s.frames-1}),frameRate:s.fps,repeat:s.loop?-1:0});}
 setRate(rate:number){this.rate=rate;for(const s of this.active.keys())s.anims.timeScale=rate;}
 private play(id:string,clip:Clip,p:Point,owner:string,size=145){
  const slug=duoSlug(id);if(!slug||this.reduced)return;
  const spec=config.vfx_clips[slug][clip],s=this.scene.add.sprite(p.x,p.y,fxKey(slug,clip),0).setScale(size/spec.frameWidth).setDepth(8).setName('combat.duo.'+clip);
  this.active.set(s,owner);s.anims.timeScale=this.rate;s.play(fxKey(slug,clip));
  if(!spec.loop)s.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>this.remove(s));return s;
 }
 setReady(id:string,uid:string,art:Phaser.GameObjects.Container,enabled:boolean){
  if(!enabled){const old=this.ready.get(uid);if(old)this.remove(old);this.ready.delete(uid);return;}
  if(this.ready.has(uid)||!duoSlug(id))return;
  const s=this.play(id,'rage_ready',{x:0,y:-55},uid,138);if(s){art.addAt(s,0);s.setDepth(-1);this.ready.set(uid,s);}
 }
 swing(id:string,p:Point,uid:string){this.play(id,'basic_swing',p,uid,145);}
 cast(id:string,p:Point,uid:string){this.setReady(id,uid,null!,false);this.play(id,'rage_charge',{x:p.x,y:p.y-55},uid,160);}
 full(id:string,from:Point,to:Point,uid:string){const s=this.play(id,'rage_full',from,uid,185);if(s)this.scene.tweens.add({targets:s,x:to.x,y:to.y,duration:11*1000/16,ease:'Sine.InOut'});}
 impact(id:string,p:Point,uid:string,skill:boolean){this.play(id,skill?'rage_impact':'basic_hit',{x:p.x,y:p.y-52},uid,skill?165:115);}
 private remove(s:Phaser.GameObjects.Sprite){this.active.delete(s);for(const [id,old] of this.ready)if(old===s)this.ready.delete(id);if(s.scene){this.scene.tweens.killTweensOf(s);s.destroy();}}
 clearOwner(uid:string){for(const [s,id] of this.active)if(id===uid)this.remove(s);}
 clear(){for(const s of [...this.active.keys()])this.remove(s);this.ready.clear();}
}
