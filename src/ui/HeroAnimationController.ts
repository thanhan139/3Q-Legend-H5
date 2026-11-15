import Phaser from 'phaser';

export const HERO_CLIPS = {
  idle: { start: 0, end: 5, frameRate: 8 },
  attack: { start: 6, end: 13, frameRate: 16 },
  hit: { start: 14, end: 17, frameRate: 16 },
  death: { start: 18, end: 23, frameRate: 14 },
} as const;

type State = keyof typeof HERO_CLIPS;
export const heroAnimationTexture = (id: string) => `battle-poses-${id}`;

export class HeroAnimationController {
  private state: State = 'idle';
  private readonly atlas: string;

  constructor(private readonly sprite: Phaser.GameObjects.Sprite, id: string) {
    this.atlas = heroAnimationTexture(id);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.complete, this);
    this.play('idle');
  }

  get available() {
    return this.sprite.scene.textures.exists(this.atlas);
  }

  play(state: State) {
    if (this.state === 'death' || (state === 'idle' && this.sprite.anims.isPlaying)) return;
    this.state = state;
    if (!this.available) return;
    const key = `${this.atlas}:${state}`;
    const { start, end, frameRate } = HERO_CLIPS[state];
    const manager = this.sprite.scene.anims;
    if (!manager.exists(key)) {
      manager.create({ key, frames: manager.generateFrameNumbers(this.atlas, { start, end }),
        frameRate, repeat: state === 'idle' ? -1 : 0 });
    }
    this.sprite.play(key);
  }

  private complete() {
    if (this.state !== 'death') this.play('idle');
  }
}
