import type Phaser from 'phaser';
import type { CharacterAnimation } from './HeroAnimationController';
export type CharacterArt=Phaser.GameObjects.Sprite;

/** Owns foot anchoring and lifecycle, separate from authoritative combat values. */
export class BattleCharacterView {
  dead = false;
  constructor(private readonly scene: Phaser.Scene,
    readonly art: Phaser.GameObjects.Container, readonly hud: Phaser.GameObjects.Container,
    readonly sprite: CharacterArt, readonly animation: CharacterAnimation,
    readonly footAnchor: {x:number;y:number}, private readonly reducedMotion: boolean) {}
  react(critical = false) {
    if (this.dead) return;
    this.animation.play(critical ? 'criticalHit' : 'hit');
    this.scene.tweens.killTweensOf(this.sprite);this.sprite.x=0;
    if (!this.reducedMotion) this.scene.tweens.add({targets:this.sprite,
      x:this.sprite.flipX ? (critical ? 12 : 6) : -(critical ? 12 : 6),
      duration:90,yoyo:true,ease:'Sine.Out',onComplete:()=>{this.sprite.x=0;}});
  }
  die() {
    if (this.dead) return;
    this.dead=true;this.hud.setVisible(false);
    this.scene.tweens.killTweensOf(this.art);this.scene.tweens.killTweensOf(this.sprite);
    this.animation.play('death');
    this.scene.tweens.add({targets:this.art,alpha:0,delay:this.animation.available?430:0,
      duration:this.reducedMotion ? 80 : 180,onComplete:()=>{this.art.setVisible(false);this.animation.stop();}});
  }
  revive() {
    if (!this.dead) return;
    this.dead=false;this.scene.tweens.killTweensOf(this.art);
    this.art.setPosition(this.footAnchor.x,this.footAnchor.y).setVisible(true).setAlpha(0);
    this.sprite.setPosition(0,0).clearTint();this.hud.setVisible(true);this.animation.revive();
    this.scene.tweens.add({targets:this.art,alpha:1,duration:this.reducedMotion ? 80 : 220});
  }
  settle() {
    this.scene.tweens.killTweensOf(this.art);this.scene.tweens.killTweensOf(this.sprite);
    this.art.setPosition(this.footAnchor.x,this.footAnchor.y).setAlpha(this.dead ? 0 : 1).setVisible(!this.dead);
    this.hud.setVisible(!this.dead);this.sprite.setPosition(0,0).clearTint();this.animation.stop();
  }
  destroy() { this.settle();this.animation.destroy(); }
}
