import type Phaser from 'phaser';
import type {CharacterAnimation,CharacterState} from './HeroAnimationController';
import type {BattleCharacterRig} from './BattleCharacterRig';
import {characterRigPose,mixPose,REST_POSE,type RigPose} from './characterRigPose';

export class RigAnimationController implements CharacterAnimation{
  readonly available=true;
  private state:CharacterState='idle';private elapsed=0;private duration=700;private rate=1;
  private playing=true;private pose:RigPose={...REST_POSE};private from:RigPose={...REST_POSE};
  constructor(private readonly scene:Phaser.Scene,readonly rig:BattleCharacterRig,private readonly seed=0){
    rig.applyPose(this.pose);scene.events.on('update',this.update,this);
  }
  get currentState(){return this.state;}
  get isPlaying(){return this.playing;}
  supports(_state:CharacterState){return true;}
  setPlaybackRate(rate:number){this.rate=rate;}
  play(state:CharacterState,contactMs?:number){
    if(this.state==='death'||(state===this.state&&this.playing))return;
    this.from={...this.pose};this.state=state;this.elapsed=0;this.playing=true;
    this.duration=contactMs?contactMs/.64:state==='death'||state==='victory'?800:state==='hit'||state==='criticalHit'?400:700;
  }
  private update(_time:number,delta:number){
    if(!this.playing||this.rate===0)return;this.elapsed+=delta*this.rate;
    const next=characterRigPose(this.rig.heroId,this.state,this.elapsed,this.duration,this.seed);
    this.pose=mixPose(this.from,next,Math.min(1,this.elapsed/70));
    this.rig.applyPose(this.pose,this.state==='hit'||this.state==='criticalHit');
    if(this.elapsed>=this.duration&&!['idle','run','ready','death','victory'].includes(this.state))this.play('idle');
  }
  debug(){return{state:this.state,elapsed:this.elapsed,duration:this.duration,pose:{...this.pose},joints:this.rig.jointSnapshot()};}
  revive(){this.state='ready';this.play('idle');}
  stop(){this.playing=false;}
  destroy(){this.playing=false;this.scene.events.off('update',this.update,this);}
}
