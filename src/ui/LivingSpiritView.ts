import Phaser from 'phaser';
import {spiritDefinition,spiritTexture,spiritSourceTexture,SpiritPlaybackState,type SpiritClip} from './livingSpiritState';
import {readLobbySettings} from './lobbySettings';
const CLIPS:SpiritClip[]=['idle','selected','power_up'];
const STATE='livingSpirit.playback';
export function spiritPlayback(scene:Phaser.Scene):SpiritPlaybackState{
 let state=scene.registry.get(STATE) as SpiritPlaybackState|undefined;
 if(!state){state=new SpiritPlaybackState();scene.registry.set(STATE,state);}return state;
}
export function loadLivingSpirit(scene:Phaser.Scene,heroId?:string){
 const definition=heroId?spiritDefinition(heroId):undefined;if(!definition)return;
 const scheduled=new Set<string>();
 for(const clip of CLIPS){const spec=definition.clips[clip],texture=spiritSourceTexture(definition.hero_id_hint,clip);
  if(scene.textures.exists(texture)||scheduled.has(texture))continue;scheduled.add(texture);
  if(spec.sourceWidth&&spec.sourceHeight){
   // Supplied/generated sheets may have half-pixel cell spacing. Crop equal native frames,
   // rounding each cell origin independently; never stretch or resample the painted artwork.
   scene.load.image(texture,import.meta.env.BASE_URL+spec.atlas);
   scene.load.once('filecomplete-image-'+texture,()=>{const source=scene.textures.get(texture);
    for(let i=0;i<spec.frames;i++)source.add(i,0,Math.round(i%spec.cols*spec.sourceWidth!/spec.cols),Math.round(Math.floor(i/spec.cols)*spec.sourceHeight!/spec.rows),spec.frameWidth,spec.frameHeight);
   });
  }else scene.load.spritesheet(texture,import.meta.env.BASE_URL+spec.atlas,
    {frameWidth:spec.frameWidth,frameHeight:spec.frameHeight,startFrame:0,endFrame:spec.frames-1});
 }
}
export class LivingSpiritView{
 readonly sprite?:Phaser.GameObjects.Sprite;
 private complete=()=>this.play('idle');
 private motion=matchMedia('(prefers-reduced-motion: reduce)');
 private reduced=this.motion.matches||!readLobbySettings().effects||readLobbySettings().quality==='Thấp';
 private motionChanged=()=>{this.reduced=this.motion.matches||!readLobbySettings().effects||readLobbySettings().quality==='Thấp';this.play('idle');};
 constructor(private scene:Phaser.Scene,readonly heroId:string,owner:string,hidden=false){
  const clip=spiritPlayback(scene).select(owner,heroId,hidden),definition=spiritDefinition(heroId);
  scene.data.remove('livingSpirit');if(!definition)return;
  const slug=definition.hero_id_hint;
  for(const name of CLIPS){const key=spiritTexture(slug,name),spec=definition.clips[name];
   if(!scene.anims.exists(key))scene.anims.create({key,frames:scene.anims.generateFrameNumbers(spiritSourceTexture(slug,name),{start:0,end:spec.frames-1}),frameRate:1000/spec.duration_ms_per_frame,repeat:spec.repeat});
  }
  // Uniform scale, bounded between the gear columns; insertion before pedestal/body/HUD.
  this.sprite=scene.add.sprite(definition.presentation?.x??565,definition.presentation?.y??365,spiritSourceTexture(slug,'idle'),0).setAlpha(.88).setName('equipment.spiritLoop');
  this.sprite.setScale(definition.presentation?definition.presentation.height/Math.max(this.sprite.width,this.sprite.height):.95);
  this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE,this.complete);
  this.play(hidden?'idle':clip);
  if(hidden)this.sprite.anims.pause();
  this.motion.addEventListener('change',this.motionChanged);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
 }
 private play(clip:SpiritClip){
  if(!this.sprite?.scene)return;
  const definition=spiritDefinition(this.heroId)!;
  this.scene.data.set('livingSpirit',{heroId:this.heroId,slug:definition.hero_id_hint,clip,reduced:this.reduced});
  if(this.reduced){this.sprite.stop().setTexture(spiritTexture(definition.hero_id_hint,'idle'),0);return;}
  this.sprite.play(spiritTexture(definition.hero_id_hint,clip));
 }
 destroy(){this.motion.removeEventListener('change',this.motionChanged);if(this.sprite?.scene){this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE,this.complete);this.sprite.stop();this.sprite.destroy();}}
}
