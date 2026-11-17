import Phaser from 'phaser';
import { readLobbySettings } from './lobbySettings';
import { ATTACK_BUFF_VFX, CRIT_BUFF_VFX, SHIELD_VFX,
  SKILL_EFFECTS, skillTextureKey } from '../data/skillVfx';

interface Point { x: number; y: number }

export class SkillVFXManager {
  private readonly emitters = new Set<Phaser.GameObjects.Particles.ParticleEmitter>();
  private readonly images = new Set<Phaser.GameObjects.Image>();
  private rate = 1;
  private dragon?: Phaser.GameObjects.Image;
  private dragonTrail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private dragonMotion?: Phaser.Tweens.Tween;
  private readonly enabled=readLobbySettings().effects&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly lowQuality=readLobbySettings().quality==='Thấp';

  constructor(private readonly scene: Phaser.Scene) {}

  setPlaybackRate(rate: number) {
    this.rate = rate;
    for (const emitter of this.emitters) emitter.timeScale = rate;
  }

  clear() {
    this.dragonMotion?.stop();
    this.dragonMotion = undefined;
    this.dragon = undefined;
    this.dragonTrail = undefined;
    for (const emitter of this.emitters) emitter.destroy();
    this.emitters.clear();
    for (const image of this.images) image.destroy();
    this.images.clear();
  }

  private flare(id: string, point: Point, maxSize: number, duration: number, depth: number, flip = false) {
    if(!this.enabled)return;
    const key = skillTextureKey(id);
    if (!this.scene.textures.exists(key)) return;
    const image = this.scene.add.image(point.x, point.y, key).setDepth(depth).setFlipX(flip);
    this.images.add(image);
    const scale = maxSize / Math.max(image.width, image.height);
    image.setScale(scale * 0.67).setAlpha(0.84);
    this.scene.tweens.add({
      targets: image, scale: scale * 1.08, alpha: 0, duration, ease: 'Cubic.Out',
      onComplete: () => { this.images.delete(image); image.destroy(); },
    });
  }

  private sparkTexture() {
    const key = 'skill-vfx-spark';
    if (!this.scene.textures.exists(key)) {
      const graphic = this.scene.make.graphics({}, false);
      graphic.fillStyle(0xffffff).fillCircle(4, 4, 3);
      graphic.generateTexture(key, 8, 8);
      graphic.destroy();
    }
    return key;
  }

  private burst(point: Point, color: number) {
    if(!this.enabled)return;
    const key = this.sparkTexture();
    const emitter = this.scene.add.particles(point.x, point.y, key, {
      emitting: false, lifespan: 320, speed: { min: 55, max: 145 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 0.95, end: 0 },
      tint: color, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(8);
    emitter.timeScale = this.rate;
    this.emitters.add(emitter);
    emitter.explode(this.lowQuality?4:10);
    this.scene.time.delayedCall(340, () => {
      this.emitters.delete(emitter);
      emitter.destroy();
    });
  }

  cast(skillId: string, caster: Point, target: Point) {
    const effect = SKILL_EFFECTS[skillId];
    if (!effect) return;
    this.flare(effect.cast, { x: caster.x, y: caster.y + 14 }, 153, 340, 0, target.x < caster.x);
    this.burst({ x: caster.x, y: caster.y + 32 }, effect.color);
  }

  travel(skillId: string, from: Point, to: Point, duration: number, arc: number) {
    if(!this.enabled)return;
    const texture = SKILL_EFFECTS[skillId]?.travel;
    if (!texture) return;
    const key = skillTextureKey(texture);
    if (!this.scene.textures.exists(key)) return;
    const image = this.scene.add.image(from.x, from.y - 10, key).setDepth(6).setFlipX(to.x < from.x);
    this.images.add(image);
    const scale = 127 / Math.max(image.width, image.height);
    image.setScale(scale * 0.88).setAlpha(0.9);
    const phase = { progress: 0 };
    this.scene.tweens.add({
      targets: phase, progress: 1, duration, ease: 'Linear',
      onUpdate: () => {
        const t = phase.progress;
        image.setPosition(Phaser.Math.Linear(from.x, to.x, t),
          Phaser.Math.Linear(from.y, to.y, t) - 10 - Math.sin(Math.PI * t) * arc);
      },
      onComplete: () => { this.images.delete(image); image.destroy(); },
    });
  }

  impact(skillId: string, target: Point, heal = false, flip = false) {
    const effect = SKILL_EFFECTS[skillId];
    if (!effect) return;
    const point = { x: target.x, y: target.y + (heal ? 23 : -10) };
    this.flare(effect.impact, point, heal ? 118 : 156, 345, 6, flip);
    this.burst(point, effect.color);
  }

  sweepDragon(texture: string, from: Point, to: Point, duration: number, first: boolean, facingLeft: boolean) {
    if(!this.enabled)return;
    const key = skillTextureKey(texture);
    if (!this.scene.textures.exists(key)) return;
    const dragon = this.dragon ?? this.scene.add.image(from.x, from.y - 44, key).setDepth(6);
    const trail = this.dragonTrail ?? this.scene.add.particles(0, 0, this.sparkTexture(), {
      frequency: this.lowQuality?48:24, quantity: this.lowQuality?1:2, lifespan: 250,
      speedX: { min: -48, max: 48 }, speedY: { min: -22, max: 36 },
      scale: { start: 1.25, end: 0 }, alpha: { start: 0.8, end: 0 },
      tint: [0xb2ff70, 0x60ff9c, 0xffdc7a], blendMode: Phaser.BlendModes.ADD,
    }).setDepth(5);
    trail.timeScale = this.rate;
    this.images.add(dragon);
    this.emitters.add(trail);
    this.dragon = dragon;
    this.dragonTrail = trail;
    const size = 325 / Math.max(dragon.width, dragon.height);
    const startX = first ? from.x : dragon.x;
    const startY = first ? from.y - 44 : dragon.y;
    const endY = to.y - 25;
    const arc = first ? 40 : 26;
    const flip = Math.abs(to.x - startX) < 2 ? facingLeft : to.x < startX;
    const head = flip ? -size * dragon.width * 0.3 : size * dragon.width * 0.3;
    const endX = to.x - head;
    dragon.setFlipX(flip).setPosition(startX, startY).setScale(size)
      .setAlpha(first ? 0 : 0.92);
    trail.setPosition(startX - head * 0.6, startY);
    this.dragonMotion?.stop();
    const phase = { t: 0 };
    this.dragonMotion = this.scene.tweens.add({
      targets: phase, t: 1, duration, ease: first ? 'Sine.InOut' : 'Linear',
      onUpdate: () => {
        const t = phase.t;
        dragon.setPosition(Phaser.Math.Linear(startX, endX, t),
          Phaser.Math.Linear(startY, endY, t) - Math.sin(Math.PI * t) * arc);
        if (first) dragon.setAlpha(Math.min(0.92, t * 5));
        trail.setPosition(dragon.x - head * 0.6, dragon.y);
      },
      onComplete: () => { this.dragonMotion = undefined; },
    });
  }

  dismissDragon() {
    const dragon = this.dragon;
    const trail = this.dragonTrail;
    this.dragon = undefined;
    this.dragonTrail = undefined;
    trail?.stop();
    if (trail) this.scene.time.delayedCall(260, () => {
      this.emitters.delete(trail);
      trail.destroy();
    });
    if (!dragon) return;
    this.scene.tweens.add({ targets: dragon, alpha: 0, duration: 180,
      onComplete: () => { this.images.delete(dragon); dragon.destroy(); },
    });
  }

  shield(target: Point) {
    this.flare(SHIELD_VFX, { x: target.x, y: target.y - 12 }, 118, 390, 6);
  }

  buff(target: Point, critical = false) {
    this.flare(critical ? CRIT_BUFF_VFX : ATTACK_BUFF_VFX,
      { x: target.x, y: target.y + 28 }, 104, 380, 6);
  }
}
