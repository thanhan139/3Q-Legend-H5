import Phaser from 'phaser';
import {chibiFoot} from '../data/chibiBattle';

export const HERO_CLIPS = {
  idle: { start: 0, end: 5, frameRate: 8 },
  attack: { start: 6, end: 13, frameRate: 16 },
  hit: { start: 14, end: 17, frameRate: 16 },
  death: { start: 18, end: 23, frameRate: 14 },
} as const;

export type CharacterState = 'idle' | 'ready' | 'run' | 'attack' | 'attack2' | 'skill' |
  'ultimate' | 'hit' | 'criticalHit' | 'death' | 'victory';
export interface CharacterClip {start:number;end:number;frameRate:number;contactFrame?:number}
export type CharacterClipSet=Partial<Record<CharacterState,CharacterClip>>;
export interface CharacterAnimation {
  readonly available:boolean;readonly currentState:CharacterState;
  supports(state:CharacterState):boolean;setPlaybackRate(rate:number):void;
  play(state:CharacterState,contactMs?:number):void;revive():void;stop():void;destroy():void;
}
export const heroAnimationTexture = (id: string) => `battle-poses-${id}`;

export class HeroAnimationController {
  private state: CharacterState = 'idle';
  private readonly atlas: string;
  private rate = 1;
  private clipRate = 1;
  private disposed = false;

  constructor(private readonly sprite: Phaser.GameObjects.Sprite, private readonly id: string,
    private readonly clips:CharacterClipSet=HERO_CLIPS) {
    this.atlas = heroAnimationTexture(id);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.complete, this);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE,this.alignFoot,this);
    this.play('idle');
  }

  get available() {
    return this.sprite.scene.textures.exists(this.atlas);
  }

  get currentState() { return this.state; }
  supports(state: CharacterState) { return this.available && !!this.clips[state]; }
  setPlaybackRate(rate: number) { this.rate=rate;this.sprite.anims.timeScale=rate*this.clipRate; }
  play(state: CharacterState, contactMs?: number) {
    if (this.disposed || this.state === 'death' || (state === this.state && this.sprite.anims.isPlaying)) return;
    this.state = state;
    this.clipRate=1;
    if (!this.available) { this.sprite.anims.stop();return; }
    if (state === 'ready'&&!this.clips.ready) {
      this.sprite.anims.stop();this.sprite.setTexture(this.atlas,this.clips.attack?.start??0);this.alignFoot();return;
    }
    if(state==='run'&&!this.clips.run){
      // No original running frames exist. Move the complete neutral sprite safely.
      this.sprite.anims.stop();this.sprite.setTexture(this.atlas,this.clips.idle?.start??0);this.alignFoot();return;
    }
    // Explicit reuse of the existing strike/hit, not a claim of dedicated skill/critical clips.
    const clip = this.clips[state] ? state : state === 'ultimate' || state === 'skill' || state === 'attack2' ? 'attack' :
      state === 'criticalHit' ? 'hit' : state;
    const data=this.clips[clip];
    if(!data){this.sprite.anims.stop();return;}
    const key = `${this.atlas}:${clip}`;
    const { start, end, frameRate } = data;
    const manager = this.sprite.scene.anims;
    if (!manager.exists(key)) {
      manager.create({ key, frames: manager.generateFrameNumbers(this.atlas, { start, end }),
        frameRate, repeat: clip === 'idle'||clip==='run' ? -1 : 0 });
    }
    // Frame 10 (four frames after anticipation) is the existing strike's contact pose.
    if(contactMs)this.clipRate=((data.contactFrame??start+4)-start)*1000/frameRate/Math.max(80,contactMs);
    this.sprite.play(key);this.alignFoot();this.setPlaybackRate(this.rate);
  }

  private alignFoot(){
    if(!this.available)return;
    const foot=chibiFoot(this.id,Number(this.sprite.frame.name));this.sprite.setOrigin(foot.x,foot.y);
  }

  private complete() {
    if (this.state !== 'death' && this.state !== 'run' && this.state !== 'victory') this.play('idle');
  }
  revive() { this.state='ready';this.play('idle'); }
  stop() { this.sprite.anims?.stop(); }
  destroy() {
    this.disposed=true;this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE,this.complete,this);this.stop();
    this.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE,this.alignFoot,this);
  }
}
