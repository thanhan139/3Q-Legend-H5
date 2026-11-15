import type { ArenaResult } from '../cloud/arenaProtocol';
import { cloudRepository } from '../cloud/cloudRepository';
import type { BattleTicket } from '../cloud/gameProtocol';
import { STATUS_ART } from '../data/ultimateKitVfx';
import { atlasOrder, PORTRAITS } from '../ui/heroPresentation';
import { SKILL_EFFECTS, skillTextureKey } from '../data/skillVfx';
import { ATTACK_SKILLS, STATUS_LABEL } from '../data/heroSkills';
import Phaser from 'phaser';
import { HeroAnimationController } from '../ui/HeroAnimationController';
import { SkillVFXManager } from '../ui/SkillVFXManager';
import { battleSpriteDisplaySize } from '../data/battleVisuals';
import { ultimateProfile } from '../data/skillCombat';
import { RAGE_CONFIG } from '../data/rageConfig';
import { STAGES } from '../data/campaign';
import { SLOT_COUNT } from '../data/heroes';
import { BATTLE_LAYOUT, sampleTexture } from '../data/battleLayout';
import { makeArenaPracticeBattle, makeStageBattle, BattleEngine, type BattleEvent, type BattleUnit } from '../domain/battle';
import { gameStore } from '../domain/store';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { UiScene } from '../ui/UiScene';

interface BattleData { stageId?: string; arenaPractice?: boolean; rankedArena?: ArenaResult }
type UnitPosition = Pick<BattleUnit, 'side' | 'slot'>;
interface UnitView {
  card: Phaser.GameObjects.Container;
  art: Phaser.GameObjects.Container;
  hp: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  rageBar: Phaser.GameObjects.Rectangle;
  rageLabel: Phaser.GameObjects.Text;
  statusLabel: Phaser.GameObjects.Text;
  portraitHp?: Phaser.GameObjects.Rectangle;
  portraitRage?: Phaser.GameObjects.Rectangle;
  portraitGlow?: Phaser.GameObjects.Rectangle;
  readyLabel: Phaser.GameObjects.Text;
  sprite: Phaser.GameObjects.Sprite;
  animation: HeroAnimationController;
  hit: Phaser.GameObjects.Ellipse;
  ko: Phaser.GameObjects.Text;
}

const ACTION_INTERVAL = 550;
const DRAGON_SKILL = 'guan-yu:ultimate';
const DRAGON_TIMING = { attack: 425, launch: 525, impact: 960, gap: 175, retreat: 280 };
const ULTIMATE_TIMING = { attack: 360, lunge: 180, maxTravel: 275, retreat: 245 };
const HP_WIDTH = 144;
const SKILL_WIDTH = 144;
const ALLY = 0x8cdabc;
const ENEMY = 0xf49479;
const INK = 0x171822;

export class BattleScene extends UiScene {
  private engine?: BattleEngine;
  private skillVfx!: SkillVFXManager;
  private stageId = '1-1';
  private battleId = '';
  private ticket?: BattleTicket;
  private ending = false;
  private elapsed = 0;
  private speed = 1;
  private paused = false;
  private presenting = false;
  private views = new Map<string, UnitView>();
  private lines: string[] = [];
  private note!: Phaser.GameObjects.Text;
  private log!: Phaser.GameObjects.Text;
  private turn!: Phaser.GameObjects.Text;

  constructor() { super('Battle'); }

  private arenaPractice = false;
  private rankedArena?: ArenaResult;

  async create({ stageId = '1-1', arenaPractice = false, rankedArena }: BattleData = {}) {
    this.rankedArena = rankedArena;
    arenaPractice ||= rankedArena !== undefined;
    this.arenaPractice = arenaPractice;
    this.engine = undefined;
    this.ticket = undefined;
    this.ending = false;
    this.elapsed = 0;
    this.speed = 1;
    this.paused = false;
    this.presenting = false;
    this.views.clear();
    this.skillVfx = new SkillVFXManager(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.skillVfx.clear();
      this.cutIn?.destroy();
      this.cutIn = undefined;
    });
    this.applyPlaybackRate();
    this.lines = [];
    const stage = STAGES.find(candidate => candidate.id === stageId);
    if (!arenaPractice && (!stage || !gameStore.isUnlocked(stage.id))) {
      this.scene.start('Campaign');
      return;
    }
    if (!arenaPractice && cloudRepository.tutorial?.tutorialStep === 'battle_intro' &&
      !cloudRepository.tutorial.tutorialSkipped) {
      this.drawArena();
      return;
    }
    if (!arenaPractice && stage && gameStore.snapshot.formation.some(Boolean)) {
      let active = true;
      const stop = () => { active = false; };
      this.events.once('shutdown', stop);
      const loading = this.text(640, 296, 'Đang tải trận online…', 27).setOrigin(0.5);
      try {
        const ticket = await cloudRepository.startBattle(stage.id);
        if (!active) return;
        this.ticket = ticket;
      } catch (error) {
        if (active) {
          loading.setWordWrapWidth(800).setText(error instanceof Error ? error.message : 'Chưa thể mở trận online.');
          this.button(486, 391, 220, 53, 'Thử lại', () => this.scene.restart({ stageId }));
          this.button(778, 391, 220, 53, '← Chinh Chiến', () => this.go('Campaign', { stageId }));

        }
        return;
      } finally { this.events.off('shutdown', stop); }
      loading.destroy();
    }
    this.stageId = stageId;
    this.battleId = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
    this.drawArena();
    this.text(34, 26, arenaPractice ? 'ĐẤU TRƯỜNG' : `ẢI ${stageId}`, 34, '#ffe7b0', { fontStyle: 'bold' });
    this.text(34, 67, arenaPractice ? (rankedArena ? 'Phát lại trận xếp hạng' : 'Luyện tập · Không tính hạng') : stage!.name, 17, '#f2d5b2');
    this.button(1150, 57, 186, 52, arenaPractice ? '← Bố trận' : '← Về sảnh', () => arenaPractice ? this.go('Arena', { page: 'prepare' }) : this.go('Lobby'), 0x38262c, true, true);
    const { formation, heroExp, heroStars, equipment } = gameStore.snapshot;
    if (!rankedArena && !formation.some(Boolean)) {
      this.panel(300, 231, 680, 246, INK);
      this.text(640, 306, 'Cần bố trí ít nhất một võ tướng để xuất trận.', 26).setOrigin(0.5);
      this.button(640, 392, 280, 60, 'SẮP XẾP ĐỘI HÌNH', () => this.go('Formation', { fromArena: arenaPractice }));
      return;
    }

    this.engine = rankedArena ? new BattleEngine(structuredClone(rankedArena.replay)) : arenaPractice ? makeArenaPracticeBattle(formation, heroExp, heroStars, equipment)
      : makeStageBattle(stage!, formation, heroExp, heroStars, equipment);
    for (const side of ['player', 'enemy'] as const) {
      const units = this.engine.units.filter(unit => unit.side === side);
      const center = side === 'player' ? 315 : 965;
      this.text(center, 132, `${side === 'player' ? 'QUÂN TA' : 'QUÂN ĐỊCH'}  ·  ${units.length}/6`,
        24, side === 'player' ? '#a8f0d4' : '#ffc0a7', { fontStyle: 'bold' }).setOrigin(0.5);
      for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const unit = units.find(candidate => candidate.slot === slot);
        if (unit) this.drawUnit(unit);
        else {
          const { x, y } = this.position({ side, slot });
          this.add.ellipse(x, y + 42, 83, 23, INK, 0.48).setStrokeStyle(1, 0xb29a77, 0.45);
          this.text(x, y + 42, `Ô ${slot + 1}`, 13, '#dfccb0').setOrigin(0.5);
        }
      }
    }

    this.turn = this.text(640, 58, 'LƯỢT 0', 23, '#fce4aa', { fontStyle: 'bold' }).setOrigin(0.5);
    this.text(640, 353, 'VS', 32, '#ffda99', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.panel(28, 562, 1224, 137, INK, 0.96);
    this.note = this.text(48, 575, 'Hai bên chuẩn bị xuất trận…', 21, '#ffe7bd', { fontStyle: 'bold' });
    this.log = this.text(49, 613, '', 14, '#d9c8b4', { lineSpacing: 3, wordWrap: { width: 385 } });
    this.drawHeroFooter();
    this.text(1203, 583, 'Thanh vàng = Nộ Khí · đầy sẽ xuất chiêu', 15, '#dfc193').setOrigin(1, 0);
    const speedButton = this.button(994, 653, 112, 54, 'Tốc độ ×1', () => {
      if (this.ending) return;
      this.speed = this.speed === 1 ? 2 : 1;
      this.applyPlaybackRate();
      speedButton.text.setText(`Tốc độ ×${this.speed}`);
    }, 0x354b4a, true, true);
    const pauseButton = this.button(868, 653, 118, 54, 'Tạm dừng', () => {
      if (this.ending) return;
      this.paused = !this.paused;
      this.applyPlaybackRate();
      pauseButton.text.setText(this.paused ? 'Tiếp tục' : 'Tạm dừng');
    }, 0x354b4a, true, true);
    this.button(1146, 653, 144, 54, 'Bỏ qua  »', () => {
      if (this.engine && !this.ending) this.endBattle(this.engine.finish());
    }, 0x773b31, true, true);
  }

  private applyPlaybackRate() {
    const rate = this.paused ? 0 : this.speed;
    this.time.timeScale = rate;
    this.tweens.timeScale = rate;
    this.skillVfx?.setPlaybackRate(rate);
    for (const view of this.views.values()) view.sprite.anims.timeScale = rate;
  }

  private drawArena() {
    this.add.rectangle(640, 360, 1280, 720, INK);
    const palace = this.arenaPractice && this.textures.exists('pvp_bg_pvp_battle_preview_hd')
      ? 'pvp_bg_pvp_battle_preview_hd' : 'battle-courtyard';
    if (this.textures.exists(palace)) this.add.image(640, 360, palace).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x211626, 0.15);
    this.add.rectangle(640, 55, 1280, 110, 0x1c1923, 0.94);

    for (const [label, y] of [['Tuyến trước', 145], ['Tuyến sau', 342]] as const) {
      for (const x of [315, 965]) this.text(x, y, label, 15, '#f2d6b7').setOrigin(0.5);
    }
    this.cameras.main.fadeIn(220, 17, 14, 20);
  }

  private position({ side, slot }: UnitPosition) {
    return {
      x: (side === 'player' ? BATTLE_LAYOUT.leftColumns : BATTLE_LAYOUT.rightColumns)[slot % 3],
      y: BATTLE_LAYOUT.rows[slot < 3 ? 0 : 1],
    };
  }

  private drawUnit(unit: BattleUnit) {
    const { x, y } = this.position(unit);
    const teamColor = unit.side === 'player' ? ALLY : ENEMY;
    const card = this.add.container(x, y).setDepth(2);
    const art = this.add.container(x, y).setDepth(1);
    const shadow = this.add.ellipse(0, BATTLE_LAYOUT.shadow.y, BATTLE_LAYOUT.shadow.width, BATTLE_LAYOUT.shadow.height, 0x0f0c15, 0.65)
      .setStrokeStyle(2, teamColor, 0.75);
    const sample = sampleTexture(unit.heroId);
    const texture = this.textures.exists(sample) ? sample : BATTLE_SPRITES;
    const frame = texture === BATTLE_SPRITES ? battleSpriteFrames.get(unit.heroId) : undefined;
    const displaySize = battleSpriteDisplaySize(unit.heroId);
    const sprite = this.add.sprite(0, BATTLE_LAYOUT.footY, texture, frame)
      .setOrigin(0.5, 1).setDisplaySize(displaySize, displaySize).setFlipX(unit.side === 'enemy');
    const hit = this.add.ellipse(0, -10, 118, 105, 0xf9b383, 0).setAlpha(0);
    art.add([shadow, sprite, hit]);
    const animation = new HeroAnimationController(sprite, unit.heroId);
    if (!animation.available) this.tweens.add({ targets: sprite, scaleY: sprite.scaleY * 1.015, duration: 700 + unit.slot * 45,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const name = this.text(0, 60, unit.name, 16, '#fff1cf', {
      fontStyle: 'bold', stroke: '#17121b', strokeThickness: 4,
    }).setOrigin(0.5);
    const hpBack = this.add.rectangle(0, 77, HP_WIDTH, 12, 0x0f1018).setStrokeStyle(1, 0xffddaa, 0.45);
    const hp = this.add.rectangle(-HP_WIDTH / 2, 77, HP_WIDTH, 10, teamColor).setOrigin(0, 0.5);
    const hpLabel = this.text(0, 77, `${unit.hp} / ${unit.maxHp}`, 10, '#ffffff',
      { stroke: '#15111a', strokeThickness: 3 }).setOrigin(0.5);
    const rageBack = this.add.rectangle(0, 94, SKILL_WIDTH, 8, 0x302c44)
      .setStrokeStyle(1, 0x947b5c, 0.7);
    const rageBar = this.add.rectangle(-SKILL_WIDTH / 2, 94, SKILL_WIDTH, 7, 0xe9b94d)
      .setOrigin(0, 0.5).setScale(unit.rage / RAGE_CONFIG.max, 1);
    const rageLabel = this.text(0, 107, `NỘ ${unit.rage}/${RAGE_CONFIG.max}`, 11, '#f8d997', {
      fontStyle: 'bold', stroke: '#17121b', strokeThickness: 3,
    }).setOrigin(0.5);
    const readyLabel = this.text(0, 121, '✦ TUYỆT KỸ', 12, '#fff0a6', {
      fontStyle: 'bold', stroke: '#5b361a', strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);
    const statusLabel = this.text(0, 135, '', 10, '#a2eaff', {
      fontStyle: 'bold', stroke: '#15121d', strokeThickness: 3,
    }).setOrigin(0.5);
    const ko = this.text(0, -24, 'TỬ TRẬN', 18, '#ffe1c9', {
      fontStyle: 'bold', stroke: '#221822', strokeThickness: 6,
    }).setOrigin(0.5).setVisible(false);
    card.add([name, hpBack, hp, hpLabel, rageBack, rageBar, rageLabel, readyLabel, statusLabel, ko]);
    this.views.set(unit.uid, { card, art, hp, hpLabel, rageBar, rageLabel, readyLabel, statusLabel, sprite, animation, hit, ko });
  }

  /** Six real formation portraits, separate HP + rage, connected to engine state. */
  private drawHeroFooter() {
    const allies = this.engine?.units.filter(unit => unit.side === 'player') ?? [];
    for (let slot = 0; slot < 6; slot++) {
      const px = 487 + slot * 56;
      const unit = allies.find(u => u.slot === slot);
      if (!unit) {
        this.add.rectangle(px, 644, 48, 58, 0x191c2a).setStrokeStyle(1, 0x8c785e, 0.5);
        this.text(px, 641, `${slot + 1}`, 12, '#b4ad9f').setOrigin(0.5);
        continue;
      }
      const glow = this.add.rectangle(px, 644, 49, 65, 0x2a303a, 0.95)
        .setStrokeStyle(2, 0x6ebdaa, 0.6);
      const frame = battleSpriteFrames.get(unit.heroId);
      if (this.textures.exists(BATTLE_SPRITES) && frame !== undefined) {
        this.add.image(px, 639, BATTLE_SPRITES, frame).setDisplaySize(41, 43);
      } else {
        this.add.circle(px, 638, 18, unit.color);
        this.text(px, 638, unit.name.slice(0, 1), 19, '#231622').setOrigin(0.5);
      }
      this.add.rectangle(px, 664, 44, 5, 0x10101b);
      const hp = this.add.rectangle(px - 22, 664, 44, 5, 0x70d4a7).setOrigin(0, 0.5);
      this.add.rectangle(px, 671, 44, 5, 0x10101b);
      const rage = this.add.rectangle(px - 22, 671, 44, 5, 0xe9b94d)
        .setOrigin(0, 0.5).setScale(unit.rage / RAGE_CONFIG.max, 1);
      const view = this.views.get(unit.uid);
      if (view) { view.portraitHp = hp; view.portraitRage = rage; view.portraitGlow = glow; }
    }
  }

  update(_time: number, delta: number) {
    const engine = this.engine;
    if (!engine || this.ending || this.paused || this.presenting || engine.winner) return;
    this.elapsed += delta * this.speed;
    if (this.elapsed < ACTION_INTERVAL) return;
    this.elapsed = 0;
    const events = engine.step();
    this.presenting = true;
    const duration = this.presentAction(engine, events);
    this.time.delayedCall(duration + 85, () => {
      if (this.ending) return;
      this.syncHud(engine);
      this.presenting = false;
      if (engine.winner) this.endBattle(engine.winner);
    });
  }

  private syncHud(engine: BattleEngine) {
    this.turn.setText(`LƯỢT ${engine.turn}`);
    for (const unit of engine.units) {
      const view = this.views.get(unit.uid);
      if (!view) continue;
      view.hp.setScale(unit.hp / unit.maxHp, 1);
      view.hpLabel.setText(`${unit.hp} / ${unit.maxHp}`);
      const rage = unit.hp > 0 ? Math.min(RAGE_CONFIG.max, unit.rage) : 0;
      this.presentRage(view, rage);
      view.readyLabel.setVisible(unit.hp > 0 && rage >= RAGE_CONFIG.skillThreshold && !unit.skillLocked);
      const states = [];
      if (unit.shield > 0) states.push(`KHIÊN ${unit.shield}`);
      if (unit.attackBuffActions > 0) states.push('CÔNG ↑');
      if (unit.criticalBuffActions > 0) states.push('BẠO ↑');
      view.statusLabel.setText(states.join(' · '));
      view.portraitHp?.setScale(unit.hp / unit.maxHp, 1);

    }
  }

  /** Visual-only action sequence. Every damage, heal, buff, and shield value is
   * resolved before this call by the deterministic BattleEngine.
   * Never call `engine.step()` from a tween callback.
   */
  private cutIn?: Phaser.GameObjects.Container;

  private presentCutIn(source: BattleUnit, title: string, skillId: string, dragon = false) {
    const effect = SKILL_EFFECTS[skillId];
    if (!effect?.cutin) return;
    this.cutIn?.destroy();
    const direction = source.side === 'player' ? 1 : -1;
    const backdrop = this.add.image(0, 0, skillTextureKey(effect.cutin)).setDisplaySize(684, 228)
      .setFlipX(direction < 0).setAlpha(0.94);
    const face = this.add.image(-direction * 226, 0, PORTRAITS, atlasOrder.indexOf(source.heroId))
      .setDisplaySize(133, 133);
    const hero = this.text(direction * 42, -35, source.name, 20, '#ffe2ac',
      { stroke: '#241522', strokeThickness: 4 }).setOrigin(0.5);
    const name = this.text(direction * 42, 12, title, dragon ? 40 : 32, dragon ? '#e1ffae' : '#fff1c6',
      { fontStyle: 'bold', stroke: '#291828', strokeThickness: 6 }).setOrigin(0.5);
    const content = this.add.container(640 - direction * 44, 236, [backdrop, face, hero, name]).setDepth(30).setAlpha(0);
    this.cutIn = content;
    this.tweens.add({ targets: content, x: 640, alpha: 1, duration: 110, ease: 'Cubic.Out' });
    this.time.delayedCall(dragon ? 300 : 255, () => this.tweens.add({
      targets: content, x: 640 + direction * 35, alpha: 0, duration: 125,
      onComplete: () => {
        content.destroy();
        if (this.cutIn === content) this.cutIn = undefined;
      },
    }));
  }

  private presentRage(view: UnitView, rage: number) {
    const ready = rage >= RAGE_CONFIG.skillThreshold;
    const ratio = rage / RAGE_CONFIG.max;
    view.rageBar.setScale(ratio, 1).setFillStyle(ready ? 0xffe575 : 0xe9b94d);
    view.rageLabel.setText(`NỘ ${rage}/${RAGE_CONFIG.max}`).setColor(ready ? '#fff49a' : '#f8d997');
    view.portraitRage?.setScale(ratio, 1);
    view.portraitGlow?.setStrokeStyle(2, ready ? 0xffe49a : 0x6ebdaa, ready ? 1 : 0.6);
  }

  private eventBadge(id: keyof typeof STATUS_ART, x: number, y: number) {
    const icon = this.add.image(x, y, skillTextureKey(STATUS_ART[id])).setDisplaySize(33, 33).setDepth(13);
    this.tweens.add({ targets: icon, y: y - 24, alpha: 0, duration: 560, onComplete: () => icon.destroy() });
  }

  private presentAction(engine: BattleEngine, events: BattleEvent[]): number {
    const hits = events.filter(e => e.kind === 'damage' || e.kind === 'heal' || e.kind === 'dodge');
    const action = events.find(event => event.kind === 'action') ?? events.find(event => event.kind === 'skip') ?? hits[0];
    const source = engine.units.find(u => u.uid === action?.source);
    if (!action || !source) { this.syncHud(engine); return 110; }
    const sourceView = this.views.get(source.uid);
    const skillId = action.kind === 'action' && action.actionType === 'skill' && action.skill === true &&
      (action.rageBefore ?? 0) >= RAGE_CONFIG.skillThreshold ? action.skillId : undefined;
    const skill = Boolean(skillId);
    const effect = skillId ? SKILL_EFFECTS[skillId] : undefined;
    const profile = ultimateProfile(source.heroId);
    const title = ATTACK_SKILLS.get(action.skillId?.replace(/:signature$/, '') ?? '')?.name ?? profile.title;
    const dragon = source.heroId === 'guan-yu' && skillId?.replace(/:signature$/, '') === DRAGON_SKILL;
    const attackAt = dragon ? DRAGON_TIMING.attack : ULTIMATE_TIMING.attack;
    const initial = dragon ? DRAGON_TIMING.impact : skill ? attackAt + profile.castMs : 260;
    const gap = dragon ? DRAGON_TIMING.gap : skill ? profile.impactGapMs : 105;
    const firstTarget = hits.find(hit => hit.source === source.uid && hit.kind !== 'heal')?.target;
    const enemy = engine.units.find(unit => unit.uid === firstTarget && unit.side !== source.side);
    const home = this.position(source);
    const dest = enemy ? this.position(enemy) : home;
    this.note.setText(skill ? `✦ ${title} · ${source.name} xuất chiêu!` : `${source.name} tấn công thường · Nộ ${source.rage}/${RAGE_CONFIG.max}`)
      .setColor(skill ? '#ffdc80' : '#ffe7bd');

    const direction = source.side === 'player' ? 1 : -1;
    const melee = source.role === 'fighter' || source.role === 'tank';
    const stride = dragon ? 82 : profile.style === 'spear' || profile.style === 'warlord' ? 112 : 58;
    const moves = dragon || (melee && Boolean(enemy));
    const launch = moves ? {
      x: Phaser.Math.Clamp(home.x + direction * stride, 80, 1200),
      y: home.y - (dragon || profile.style === 'warlord' ? 14 : 0),
    } : home;

    if (skillId) {
      this.turn.setText(`LƯỢT ${engine.turn}`);
      this.presentCutIn(source, title, skillId, dragon);
      if (dragon) {
        const seal = this.add.circle(home.x, home.y - 44, 49, 0xfadd8a, 0.16)
          .setStrokeStyle(3, 0xffe7a7, 0.8).setDepth(5);
        this.tweens.add({ targets: seal, scale: 1.7, alpha: 0, duration: initial,
          ease: 'Cubic.Out', onComplete: () => seal.destroy() });
      }
      if (sourceView) {
        this.presentRage(sourceView, action.rageBefore ?? 0);
        sourceView.readyLabel.setVisible(true);
      }
      this.time.delayedCall(attackAt, () => {
        this.skillVfx.cast(skillId, home, dest);
        sourceView?.animation.play('attack');
        if (!sourceView) return;
        this.presentRage(sourceView, action.rageAfter ?? 0);
        sourceView.readyLabel.setVisible(false);
        if (!moves) return;
        sourceView.art.setDepth(5);
        this.tweens.add({ targets: sourceView.art, x: launch.x, y: launch.y,
          duration: dragon ? 210 : ULTIMATE_TIMING.lunge, ease: 'Cubic.Out' });
      });
    } else if (action.kind === 'action') sourceView?.animation.play('attack');

    if (!skill && sourceView && enemy && action.kind === 'action') {
      sourceView.art.setDepth(5);
      // Ranged magic/support attacks stay on their slot; melee fighters approach.
      const approach = source.role === 'ranger' || source.role === 'mage' ? home : {
        x: dest.x + (source.side === 'player' ? -78 : 78), y: dest.y + 6,
      };
      this.tweens.add({ targets: sourceView.art, x: approach.x, y: approach.y,
        duration: initial * 0.7, ease: 'Quad.InOut',
        yoyo: true, hold: 35,
        onComplete: () => sourceView.art.setPosition(home.x, home.y).setDepth(1) });
    }

    // Preserve Core order, including counterattacks and heals interleaved with hits.
    const playback = events.filter(e => hits.includes(e) || e.kind === 'shield' || e.kind === 'buff' ||
      e.kind === 'status' || e.kind === 'skip' || e.reason === 'skill-effect');
    const dragonTravel = SKILL_EFFECTS[DRAGON_SKILL]?.travel;
    const dragonContacts = dragon ? playback.filter(event => hits.includes(event) &&
      event.source === source.uid && event.skillId === skillId && event.kind !== 'heal') : [];
    let hasTravel = false;
    playback.forEach((event, index) => {
      const at = initial + index * gap;
      const target = engine.units.find(unit => unit.uid === event.target);
      const contact = dragonContacts.indexOf(event);
      if (contact >= 0 && dragonTravel && target) {
        const first = contact === 0;
        const startsAt = first ? DRAGON_TIMING.launch : at - gap + 25;
        this.time.delayedCall(startsAt, () => {
          if (!this.ending) this.skillVfx.sweepDragon(dragonTravel, launch, this.position(target),
            at - startsAt, first, direction < 0);
        });
      }
      if (!dragon && skillId && effect?.travel && target && event.source === source.uid &&
        event.skillId === skillId && (hits.includes(event) || !hasTravel)) {
        const duration = hasTravel ? gap - 22 : ULTIMATE_TIMING.maxTravel;
        hasTravel = true;
        const arc = profile.style === 'earth' || profile.style === 'formation' ? 8 :
          profile.style === 'spear' ? 12 : target.side === source.side ? 44 : 32;
        this.time.delayedCall(at - duration, () => {
          if (!this.ending) this.skillVfx.travel(skillId, launch, this.position(target), duration, arc);
        });
      }
      this.time.delayedCall(at, () => {
        if (this.ending) return;
        if (hits.includes(event)) this.presentHit(engine.units.find(unit => unit.uid === event.source) ?? source, event, skillId);
        else this.presentStatus(event, skillId);
        if (contact >= 0 && contact === dragonContacts.length - 1) this.skillVfx.dismissDragon();
      });
    });
    const afterHits = initial + Math.max(0, playback.length - 1) * gap + 115;
    const retreat = dragon ? DRAGON_TIMING.retreat : ULTIMATE_TIMING.retreat;
    if (skill && moves && sourceView) this.time.delayedCall(afterHits, () => {
      this.tweens.add({ targets: sourceView.art, x: home.x, y: home.y,
        duration: retreat, ease: 'Cubic.InOut',
        onComplete: () => sourceView.art.setPosition(home.x, home.y).setDepth(1) });
    });
    const total = events.find(e => e.kind === 'total');
    if (total) this.time.delayedCall(afterHits + 90, () => {
      if (this.ending) return;
      const label = this.text(640, 424, `TỔNG SÁT THƯƠNG  ${total.amount ?? 0}`, 29, '#ffdb76', {
        fontFamily: 'Georgia, serif', fontStyle: 'bold', stroke: '#4b2031', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: label, y: 388, alpha: 0, duration: 590,
        onComplete: () => label.destroy() });
    });
    const previewLine = `${source.name} ${skill ? 'tung ' + title : action.kind === 'skip' ? 'mất lượt' : action.kind === 'action' ? title : 'gây chảy máu'}${hits.length > 1 ? ` · ${hits.length} hit` : ''}`;
    this.lines.unshift(`Lượt ${engine.turn} · ${previewLine}`);
    this.lines.length = Math.min(this.lines.length, 3);
    this.log.setText(this.lines.join('\n'));
    return afterHits + (total ? 330 : skill && moves ? retreat : 100);
  }

  private presentHit(attacker: BattleUnit, hit: BattleEvent, skillId?: string) {
    const victim = this.engine?.units.find(u => u.uid === hit.target);
    const view = victim && this.views.get(victim.uid);
    if (!victim || !view) return;
    const { x, y } = this.position(victim);
    if (hit.kind === 'dodge') {
      this.floating(x, y - 86, 'NÉ ĐÒN', '#e0eeff', 19);
      return;
    }
    const heals = hit.kind === 'heal';
    if (skillId && hit.skillId === skillId) this.skillVfx.impact(skillId, { x, y }, heals, attacker.side === 'enemy');
    if (!heals && hit.remainingHp === 0) {
      view.animation.play('death');
      this.tweens.killTweensOf(view.sprite);
      if (!view.animation.available) this.tweens.add({ targets: view.art, alpha: 0.28, duration: 300 });
      view.ko.setVisible(true);
    } else if (!heals) view.animation.play('hit');
    if (typeof hit.remainingHp === 'number') {
      view.hp.setScale(hit.remainingHp / victim.maxHp, 1);
      view.hpLabel.setText(`${hit.remainingHp} / ${victim.maxHp}`);
    }
    if (typeof hit.remainingShield === 'number') {
      view.statusLabel.setText(hit.remainingShield > 0 ? `KHIÊN ${hit.remainingShield}` : '');
    }
    if (hit.absorbed && hit.absorbed > 0) {
      this.floating(x, y - 86, `HẤP THỤ ${hit.absorbed}`, '#8fe9ff', 19);
      this.skillVfx.shield({ x, y });
    }
    if (heals) this.eventBadge('heal', x - 42, y - 67);
    if ((hit.hitCount ?? 0) > 1 && hit.hitIndex && hit.skillId &&
      this.engine?.log.some(event => event.actionId === hit.actionId && event.skillId === hit.skillId &&
        event.kind === 'damage' && event.target === hit.target && event.hitIndex !== hit.hitIndex))
      this.eventBadge('multi_hit', x + 43, y - 67);
    if (hit.critical) this.eventBadge('critical', x + 42, y - 106);
    if (hit.critical) this.floating(x, y - 118, 'BẠO KÍCH!', '#ffcf67', 19);
    const number = `${heals ? '+' : '−'}${hit.amount ?? 0}`;
    this.floating(x, y - 58, number, heals ? '#a2ffd1' : hit.critical ? '#ffe279' : '#ffb59b',
      hit.critical ? 36 : hit.skill ? 31 : 27);
    view.hit.setFillStyle(heals ? 0x74ffc3 : 0xffac83, 0.46).setAlpha(1);
    view.sprite.setTintFill(heals ? 0xa7ffd0 : 0xffe0ba);
    this.tweens.add({ targets: view.hit, alpha: 0, duration: 240,
      onComplete: () => view.sprite.clearTint() });
    if (!heals) {
      const dragon = skillId?.replace(/:signature$/, '') === DRAGON_SKILL && hit.skillId === skillId;
      this.cameras.main.shake(dragon ? 145 / this.speed : hit.skill ? 95 : 45,
        dragon ? 0.0034 : hit.skill ? 0.0022 : 0.0008);
    }
  }

  private floating(x: number, y: number, label: string, color: string, size: number) {
    const popup = this.text(x, y, label, size, color, {
      fontStyle: 'bold', stroke: '#261927', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: popup, y: y - 49, alpha: 0, duration: 520,
      onComplete: () => popup.destroy() });
  }

  private presentStatus(event: BattleEvent, skillId?: string) {
    if (skillId && event.skillId && event.skillId !== skillId) return;
    const target = this.engine?.units.find(u => u.uid === event.target);
    if (!target) return;
    const { x, y } = this.position(target);
    if (event.status) {
      const badges = { armor: 'armor_break', weaken: 'attack_down', bleed: 'bleed',
        stun: 'stun', charm: 'stun', taunt: 'taunt' } as const;
      if (event.kind === 'status' && event.status !== 'charm') this.eventBadge(badges[event.status], x - 55, y - 99);
      this.floating(x, y - 100, event.kind === 'skip' ? 'MẤT LƯỢT' : STATUS_LABEL[event.status], '#efb0fd', 19);
    } else if (event.reason === 'skill-effect') {
      const delta = (event.rageAfter ?? 0) - (event.rageBefore ?? 0);
      this.eventBadge(delta < 0 ? 'rage_drain' : 'rage_up', x - 55, y - 99);
      this.floating(x, y - 100, `${delta > 0 ? '+' : ''}${delta} Nộ`, '#b9dcff', 19);
    } else if (event.kind === 'shield') {
      this.skillVfx.shield({ x, y });
      this.eventBadge('shield', x - 55, y - 99);
      this.floating(x, y - 100, `KHIÊN +${event.amount ?? 0}`, '#a3ebff', 19);
    } else if (event.kind === 'buff') {
      this.skillVfx.buff({ x, y }, event.buff === 'critical');
      this.eventBadge(event.buff === 'critical' ? 'critical' : 'attack_up', x - 55, y - 99);
      this.floating(x, y - 100, event.buff === 'critical' ? 'TĂNG BẠO' : 'TĂNG CÔNG', '#ffe38a', 19);
    }
  }

  private endBattle(winner: 'player' | 'enemy') {
    this.ending = true;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.skillVfx.clear();
    this.cutIn?.destroy();
    this.cutIn = undefined;
    for (const view of this.views.values()) view.sprite.anims.stop();
    this.showResult(winner);
  }

  private showResult(winner: 'player' | 'enemy') {
    if (this.arenaPractice) {
      this.go('Arena', { page: 'result', winner: this.rankedArena ? (this.rankedArena.won ? 'player' : 'enemy') : winner, ranked: this.rankedArena });
      return;
    }
    const allies = this.engine?.units.filter(unit => unit.side === 'player');
    const enemies = new Set(this.engine?.units.filter(unit => unit.side === 'enemy').map(unit => unit.uid));
    const alliedIds = new Set(allies?.map(unit => unit.uid));
    const summary = allies && {
      deployed: allies.length,
      survivors: allies.filter(unit => unit.hp > 0).length,
      damage: this.engine!.log.reduce((sum, event) => event.kind === 'damage' &&
        event.source && alliedIds.has(event.source) && event.target && enemies.has(event.target)
        ? sum + (event.amount ?? 0) : sum, 0),
    };
    this.go('Result', { stageId: this.stageId, battleId: this.battleId, ticket: this.ticket, winner, turns: this.engine?.turn, summary });
  }
}
