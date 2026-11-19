import type { ArenaResult } from '../cloud/arenaProtocol';
import { cloudRepository } from '../cloud/cloudRepository';
import type { BattleTicket } from '../cloud/gameProtocol';
import { STATUS_ART } from '../data/ultimateKitVfx';
import { atlasOrder, PORTRAITS } from '../ui/heroPresentation';
import { SKILL_EFFECTS, skillTextureKey } from '../data/skillVfx';
import { ATTACK_SKILLS, STATUS_LABEL } from '../data/heroSkills';
import Phaser from 'phaser';
import { vipLevel, vipPlaybackSpeeds } from '../domain/vip';
import { HeroAnimationController,type CharacterAnimation } from '../ui/HeroAnimationController';
import { BattleCharacterView,type CharacterArt } from '../ui/BattleCharacterView';
import {chibiFoot} from '../data/chibiBattle';
import { BattleAnimationEventBridge } from '../ui/BattleAnimationEventBridge';
import { bindBattlePresentationClock } from '../ui/BattlePresentationClock';
import {BattleUi} from '../ui/BattleUi';
import {loadBattleUi,BATTLE_FONT,battleUiKey,battleUiFrame} from '../ui/battleUiAssets';
import {battleTurnQueue} from '../ui/battleTurnQueue';
import {rect} from '../ui/lobbyContentLayout';
import { readLobbySettings } from '../ui/lobbySettings';
import { SkillVFXManager } from '../ui/SkillVFXManager';
import { battleCharacterDisplaySize } from '../data/battleVisuals';
import { ultimateProfile } from '../data/skillCombat';
import { RAGE_CONFIG } from '../data/rageConfig';
import { STAGES } from '../data/campaign';
import { SLOT_COUNT,heroFamily } from '../data/heroes';
import { BATTLE_LAYOUT, battleFormationPosition } from '../data/battleLayout';
import { makeArenaPracticeBattle, makeStageBattle, BattleEngine, type BattleEvent, type BattleUnit } from '../domain/battle';
import { gameStore } from '../domain/store';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { UiScene } from '../ui/UiScene';
import {CombatFeedbackVfx,loadCombatFeedback} from '../ui/CombatFeedbackVfx';
import {combatHeroMelee} from '../ui/combatHeroProfiles';
import {duoActor,duoActorKey,duoClips,CombatDuoVfx,loadCombatDuo} from '../ui/CombatDuo';
import {isDuoSkillCast} from '../ui/combatDuoConfig';

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
  sprite: CharacterArt;
  animation: CharacterAnimation;
  hit: Phaser.GameObjects.Ellipse;
  character: BattleCharacterView;
}

const ACTION_INTERVAL = 550;
const DRAGON_SKILL = 'guan-yu:ultimate';
const DRAGON_TIMING = { attack: 425, launch: 525, impact: 960, gap: 175, retreat: 280 };
const ULTIMATE_TIMING = { attack: 360, lunge: 180, maxTravel: 275, retreat: 245 };
const HP_WIDTH = 132;
const SKILL_WIDTH = 132;
const ALLY = 0x8cdabc;
const ENEMY = 0xf49479;
const INK = 0x171822;

export class BattleScene extends UiScene {
  private engine?: BattleEngine;
  private skillVfx!: SkillVFXManager;
  private combatFeedback!:CombatFeedbackVfx;
  private duoVfx!:CombatDuoVfx;
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
  private bridge!: BattleAnimationEventBridge;
  private intro?: Phaser.GameObjects.Image;
  private suspended=false;
  private reducedMotion=false;
  private aliveCounts={player:0,enemy:0};
  private floatingPool:Phaser.GameObjects.Text[]=[];
  private ui!:BattleUi;
  private queue?:Phaser.GameObjects.Container;
  private controls:ReturnType<BattleUi['button']>[]=[];

  constructor() { super('Battle'); }
  preload(){loadBattleUi(this);loadCombatFeedback(this);loadCombatDuo(this);}
  override text(x:number,y:number,value:string,size=22,color='#fff5dc',options:Partial<Phaser.Types.GameObjects.Text.TextStyle>={}){
    return super.text(x,y,value,size,color,{fontFamily:BATTLE_FONT,resolution:2,padding:{top:2,bottom:2},...options});
  }

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
    this.aliveCounts={player:0,enemy:0};this.queue=undefined;this.floatingPool=[];this.suspended=document.hidden;
    this.ui=new BattleUi(this);this.controls=[];
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches||!readLobbySettings().effects;
    this.bridge=new BattleAnimationEventBridge(this);
    const restoreClock=bindBattlePresentationClock(this);
    this.skillVfx = new SkillVFXManager(this);
    this.combatFeedback=new CombatFeedbackVfx(this,this.reducedMotion);
    this.duoVfx=new CombatDuoVfx(this,this.reducedMotion);
    const visibility=()=>{this.suspended=document.hidden;this.applyPlaybackRate();};
    document.addEventListener('visibilitychange',visibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      restoreClock();
      document.removeEventListener('visibilitychange',visibility);
      this.bridge.cancel();this.intro?.destroy();this.intro=undefined;
      for(const view of this.views.values())view.character.destroy();
      this.skillVfx.clear();
      this.combatFeedback.clear();
      this.duoVfx.clear();
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
    const plaque=this.ui.art('stage',rect(8,0,344,112)).getBounds();
    this.ui.label('stage.title',rect(plaque.x+plaque.width*.13,plaque.y+plaque.height*.37,plaque.width*.75,30),
      arenaPractice?'ĐẤU TRƯỜNG':`ẢI ${stageId}`,27);
    this.ui.label('stage.subtitle',rect(plaque.x+plaque.width*.12,plaque.y+plaque.height*.66,plaque.width*.76,25),
      arenaPractice?(rankedArena?'Phát lại xếp hạng':'Luyện tập · Không tính hạng'):stage!.name,14);
    this.controls.push(this.ui.button('back','back',rect(1048,22,210,58),arenaPractice?'Bố trận':'Về sảnh',
      ()=>arenaPractice?this.go('Arena',{page:'prepare'}):this.go('Lobby')));
    const { formation, heroExp, heroStars, equipment, jewelry } = gameStore.snapshot;
    if (!rankedArena && !formation.some(Boolean)) {
      this.panel(300, 231, 680, 246, INK);
      this.text(640, 306, 'Cần bố trí ít nhất một võ tướng để xuất trận.', 26).setOrigin(0.5);
      this.button(640, 392, 280, 60, 'SẮP XẾP ĐỘI HÌNH', () => this.go('Formation', { fromArena: arenaPractice }));
      return;
    }

    this.engine = rankedArena ? new BattleEngine(structuredClone(rankedArena.replay)) : arenaPractice ? makeArenaPracticeBattle(formation, heroExp, heroStars, equipment, jewelry)
      : makeStageBattle(stage!, formation, heroExp, heroStars, equipment, vipLevel(cloudRepository.vip?.paidBaseKnbTotal), jewelry);
    for (const side of ['player', 'enemy'] as const) {
      const units = this.engine.units.filter(unit => unit.side === side);
      this.aliveCounts[side]=units.length;
      for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const unit = units.find(candidate => candidate.slot === slot);
        if (unit) this.drawUnit(unit);
      }
    }

    const turnPlate=this.ui.art('turn',rect(510,0,260,106)).getBounds();
    this.turn=this.ui.label('turn',rect(turnPlate.x+turnPlate.width*.17,turnPlate.y+turnPlate.height*.48,
      turnPlate.width*.66,turnPlate.height*.28),'LƯỢT 0',27);
    this.presenting=true;
    this.intro=this.ui.art('versus',rect(540,265,200,150)).setDepth(25).setName('battle.intro-vs');
    this.tweens.add({targets:this.intro,alpha:0,delay:600,duration:260,onComplete:()=>{
      this.intro?.destroy();this.intro=undefined;this.presenting=false;
    }});
    this.ui.footer(rect(12,588,1256,122));
    this.ui.label('log.title',rect(100,610,306,24),'Nhật ký chiến đấu',18);
    this.ui.label('queue.title',rect(471,610,356,24),'Thứ tự hành động',18);
    this.add.rectangle(439,661,1,68,0xa27439,.7);
    this.add.rectangle(857,661,1,68,0xa27439,.7);
    this.note = this.text(102, 635, 'Hai bên chuẩn bị xuất trận…', 14, '#ffe7bd', {
      fontStyle:'bold',wordWrap:{width:321},maxLines:1 });
    this.log = this.text(102, 660, '', 11, '#ead5ac', { lineSpacing: 2, wordWrap: { width: 321 },maxLines:2 });
    this.drawHeroFooter();
    this.ui.label('rage.tip',rect(880,607,354,26),'Thanh vàng = Nộ Khí',12,'#e0c18a');
    const speedButton = this.ui.button('speed','speed',rect(882,640,174,57),'Tốc độ ×1', () => {
      if (this.ending) return;
      const speeds = arenaPractice ? [1, 2] : vipPlaybackSpeeds(vipLevel(cloudRepository.vip?.paidBaseKnbTotal));
      this.speed = speeds[(speeds.indexOf(this.speed) + 1) % speeds.length];
      this.applyPlaybackRate();
      speedButton.text.setText(`Tốc độ ×${this.speed}`);
    });
    this.controls.push(speedButton);
    this.controls.push(this.ui.button('skip','skip',rect(1073,640,177,57),'Bỏ qua', () => {
      if (this.engine && !this.ending) this.endBattle(this.engine.finish(),true);
    }));
  }

  private applyPlaybackRate() {
    const rate = this.paused||this.suspended ? 0 : this.speed;
    this.time.timeScale = rate;
    this.tweens.timeScale = rate;
    this.skillVfx?.setPlaybackRate(rate);
    this.combatFeedback?.setRate(rate);
    this.duoVfx?.setRate(rate);
    for (const view of this.views.values()) view.animation.setPlaybackRate(rate);
  }

  private drawArena() {
    this.add.rectangle(640, 360, 1280, 720, INK);
    const palace=this.textures.exists('battle.courtyard-premium')?'battle.courtyard-premium':'battle-courtyard';
    if (this.textures.exists(palace)){const bg=this.add.image(640,360,palace);bg.setScale(Math.max(1280/bg.width,720/bg.height));}
    this.add.rectangle(640, 360, 1280, 720, 0x211626, 0.05);
    this.cameras.main.fadeIn(220, 17, 14, 20);
  }

  private position({ side, slot }: UnitPosition) {
    return battleFormationPosition(side,slot);
  }

  private drawUnit(unit: BattleUnit) {
    const { x, y } = this.position(unit);
    const teamColor = unit.side === 'player' ? ALLY : ENEMY;
    const card = this.add.container(x, y).setDepth(10).setName(`battle.hud.${unit.uid}`);
    const art = this.add.container(x, y).setDepth(y/1000).setName(`battle.character.${unit.uid}`);
    const shadow=this.ui.art(unit.side==='player'?'allyRing':'enemyRing',rect(-45,-12,90,24)).setAlpha(.62);
    const visualId=heroFamily(unit.heroId),foot=chibiFoot(visualId),size=battleCharacterDisplaySize(visualId);
    const sprite=this.add.sprite(0,BATTLE_LAYOUT.footY,BATTLE_SPRITES,battleSpriteFrames.get(visualId))
      .setOrigin(foot.x,foot.y).setScale(size/256).setFlipX(unit.side==='enemy');
    const duo=duoActor(visualId);
    if(duo)sprite.setScale(Math.min(128/duo.maxInkHeight,170/duo.maxInkWidth));
    const animation=new HeroAnimationController(sprite,visualId,duoClips(visualId),duo?{x:duo.origin[0],y:duo.origin[1]}:undefined,duo?duoActorKey(visualId):undefined);
    const hit = this.add.ellipse(0, -10, 118, 105, 0xf9b383, 0).setAlpha(0);
    art.add([shadow, sprite, hit]);
    animation.setPlaybackRate(this.speed);

    const hud=BATTLE_LAYOUT.hud;
    const plate=this.ui.art(unit.side==='player'?'name':'enemyName',rect(-62,hud.nameTop,124,hud.nameHeight));
    const name = this.text(0, hud.nameY, unit.name, hud.nameFont, '#fff1cf', {
      fontStyle: 'bold', stroke: '#17121b', strokeThickness: 2,padding:{top:0,bottom:0},
    }).setOrigin(0.5);
    const safeWidth=plate.displayWidth*.77;
    for(let size:number=hud.nameFont;name.width>safeWidth&&size>9;)name.setFontSize(--size);
    let shortName=unit.name;while(name.width>safeWidth&&shortName.length>2){shortName=shortName.slice(0,-1);name.setText(shortName+'…');}
    const track=(kind:'hp'|'rage',y:number,height:number)=>{
      const frame=battleUiFrame(this,kind),native=this.textures.get(battleUiKey(kind)).get(frame),scale=height/native.height;
      return this.add.nineslice(0,y,battleUiKey(kind),frame,150/scale,native.height,42,30,10,10).setScale(scale);
    };
    const hpBack=track('hp',hud.hpY,hud.hpHeight);
    const hp = this.add.rectangle(-HP_WIDTH / 2, hud.hpY, HP_WIDTH, hud.hpFill, teamColor).setOrigin(0, 0.5);
    const hpLabel = this.text(0, hud.hpY, `${unit.hp} / ${unit.maxHp}`, 9, '#ffffff',
      { stroke: '#15111a', strokeThickness: 1,padding:{top:0,bottom:0} }).setOrigin(0.5);
    const rageBack=track('rage',hud.rageY,hud.rageHeight);
    const rageBar = this.add.rectangle(-SKILL_WIDTH / 2, hud.rageY, SKILL_WIDTH, hud.rageFill, 0xe9b94d)
      .setOrigin(0, 0.5).setScale(unit.rage / RAGE_CONFIG.max, 1);
    const rageLabel = this.text(0, hud.rageY, `NỘ ${unit.rage}/${RAGE_CONFIG.max}`, 8, '#fff4c9', {
      fontStyle: 'bold', stroke: '#17121b', strokeThickness: 1,padding:{top:0,bottom:0},
    }).setOrigin(0.5);
    const readyLabel = this.text(-78, 9, '✦', 12, '#fff0a6', {
      fontStyle: 'bold', stroke: '#5b361a', strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);
    const statusLabel = this.text(90, 12, '', 9, '#a2eaff', {
      fontStyle: 'bold', stroke: '#15121d', strokeThickness: 3,wordWrap:{width:44},maxLines:3,
    }).setOrigin(0.5);
    card.add([plate,name,hpBack,hp,hpLabel,rageBack,rageBar,rageLabel,readyLabel,statusLabel]);
    const character=new BattleCharacterView(this,art,card,sprite,animation,{x,y},this.reducedMotion);
    this.views.set(unit.uid,{card,art,hp,hpLabel,rageBar,rageLabel,readyLabel,statusLabel,sprite,animation,hit,character});
  }

  /** Forecasted Core scheduling, including repeats and both teams; never mutates combat. */
  private drawHeroFooter() {
    this.queue?.destroy();this.queue=this.add.container(0,0).setDepth(15).setName('battle.queue');
    const units=battleTurnQueue(this.engine?.units??[]);
    for(let i=0;i<6;i++){
      const x=490+i*56,unit=units[i];
      const border=this.add.graphics().fillStyle(0x251218,.96).fillRoundedRect(x-23,640,46,60,4)
        .lineStyle(i===0?2:1,unit?.side==='enemy'?0xd99057:i===0?0xffd86e:0x91bb89,.9).strokeRoundedRect(x-23,640,46,60,4);
      this.queue.add(border);
      if(!unit)continue;
      const frame=battleSpriteFrames.get(heroFamily(unit.heroId));
      const portrait=this.add.image(x,663,BATTLE_SPRITES,frame).setDisplaySize(41,41);
      const hp=this.add.rectangle(x-20,688,40,4,unit.side==='player'?0x83dca0:0xf1a080).setOrigin(0,.5).setScale(unit.hp/unit.maxHp,1);
      const rage=this.add.rectangle(x-20,694,40,3,0xeac24b).setOrigin(0,.5).setScale(unit.rage/RAGE_CONFIG.max,1);
      this.queue.add([portrait,hp,rage]);
    }
  }

  update(_time: number, delta: number) {
    const engine = this.engine;
    if (!engine || this.ending || this.paused || this.suspended || this.presenting || engine.winner) return;
    this.elapsed += delta * this.speed;
    if (this.elapsed < ACTION_INTERVAL) return;
    this.elapsed = 0;
    const events = engine.step();
    this.presenting = true;
    const duration = this.presentAction(engine, events);
    this.bridge.after(duration + 85, () => {
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
      if(unit.hp<=0)view.character.die();
      else if(view.character.dead)view.character.revive();
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
    this.updateCounts();this.drawHeroFooter();
  }

  private updateCounts(){
    for(const side of ['player','enemy'] as const)this.aliveCounts[side]=
      this.engine?.units.filter(u=>u.side===side&&!this.views.get(u.uid)?.character.dead).length??0;
  }

  /** Visual-only action sequence. Every damage, heal, buff, and shield value is
   * resolved before this call by the deterministic BattleEngine.
   * Never call `engine.step()` from a tween callback.
   */
  private cutIn?: Phaser.GameObjects.Container;

  private presentCutIn(source: BattleUnit, title: string, skillId: string, dragon = false) {
    if(this.reducedMotion)return;
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
    const unit=this.engine?.units.find(u=>this.views.get(u.uid)===view);
    if(unit)this.duoVfx?.setReady(unit.heroId,unit.uid,view.art,ready&&!view.character.dead);
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
    this.bridge.begin();this.drawHeroFooter();
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
    const special=Boolean(duoActor(source.heroId));
    const attackAt = dragon ? DRAGON_TIMING.attack : ULTIMATE_TIMING.attack;
    const initial = dragon ? DRAGON_TIMING.impact : skill ? attackAt + profile.castMs : special?680:480;
    const gap = dragon ? DRAGON_TIMING.gap : skill ? profile.impactGapMs : 105;
    const firstTarget = hits.find(hit => hit.source === source.uid && hit.kind !== 'heal')?.target;
    const enemy = engine.units.find(unit => unit.uid === firstTarget && unit.side !== source.side);
    const home = this.position(source);
    const dest = enemy ? this.position(enemy) : home;
    this.note.setText(skill ? `✦ ${title} · ${source.name} xuất chiêu!` : `${source.name} tấn công thường · Nộ ${source.rage}/${RAGE_CONFIG.max}`)
      .setColor(skill ? '#ffdc80' : '#ffe7bd');

    const direction = source.side === 'player' ? 1 : -1;
    const melee = special||combatHeroMelee(source.heroId);
    const stride = dragon ? 82 : profile.style === 'spear' || profile.style === 'warlord' ? 112 : 58;
    const moves = dragon || (melee && Boolean(enemy));
    const launch = moves ? {
      x: Phaser.Math.Clamp(home.x + direction * stride, 80, 1200),
      y: home.y - (dragon || profile.style === 'warlord' ? 14 : 0),
    } : home;

    if(action.kind==='action'&&sourceView&&!sourceView.character.dead){
      sourceView.animation.play('ready');
      if(!special)this.combatFeedback.cast(source.heroId,home,hits.some(h=>h.kind==='heal'&&h.source===source.uid));
      this.bridge.after(60,()=>{if(moves)sourceView.animation.play('run');});
    }

    if (skillId) {
      if(isDuoSkillCast(action,source.heroId)){
        this.bridge.after(60,()=>this.duoVfx.cast(source.heroId,home,source.uid));
        const first=hits.find(h=>h.source===source.uid),target=engine.units.find(u=>u.uid===first?.target);
        if(target)this.bridge.after(Math.max(0,initial-11*1000/16),()=>{
          const point=this.position(target);this.duoVfx.full(source.heroId,{x:home.x,y:home.y-55},{x:point.x,y:point.y-52},target.uid);
        });
      }
      this.turn.setText(`LƯỢT ${engine.turn}`);
      this.presentCutIn(source, title, skillId, dragon);
      if (dragon&&!this.reducedMotion) {
        const seal = this.add.circle(home.x, home.y - 44, 49, 0xfadd8a, 0.16)
          .setStrokeStyle(3, 0xffe7a7, 0.8).setDepth(5);
        this.tweens.add({ targets: seal, scale: 1.7, alpha: 0, duration: initial,
          ease: 'Cubic.Out', onComplete: () => seal.destroy() });
      }
      if (sourceView) {
        this.presentRage(sourceView, action.rageBefore ?? 0);
        sourceView.readyLabel.setVisible(true);
      }
      this.bridge.after(attackAt, () => {
        const hand={x:home.x+direction*24,y:home.y-52};
        if(!special)this.skillVfx.cast(skillId,hand,dest);
        sourceView?.animation.play('ultimate',initial-attackAt);
        if (!sourceView) return;
        this.presentRage(sourceView, action.rageAfter ?? 0);
        sourceView.readyLabel.setVisible(false);
        if (!moves) return;
        sourceView.art.setDepth(5);
        this.tweens.add({ targets: sourceView.art, x: launch.x, y: launch.y,
          duration: dragon ? 210 : ULTIMATE_TIMING.lunge, ease: 'Cubic.Out' });
      });
    } else if(action.kind==='action'){const strikeAt=special?460:160;this.bridge.after(strikeAt,()=>sourceView?.animation.play('attack',initial-strikeAt));}
    if(special&&!skill&&sourceView&&action.kind==='action')this.bridge.after(initial-125,()=>this.duoVfx.swing(source.heroId,{x:sourceView.art.x+direction*45,y:sourceView.art.y-55},source.uid));

    if (!skill && sourceView && enemy && action.kind === 'action') {
      sourceView.art.setDepth(5);
      // Ranged magic/support attacks stay on their slot; melee fighters approach.
      const approach = !melee ? home : {
        x: dest.x + (source.side === 'player' ? -BATTLE_LAYOUT.approachGap : BATTLE_LAYOUT.approachGap), y: dest.y + 6,
      };
      this.bridge.after(60,()=>this.tweens.add({ targets: sourceView.art, x: approach.x, y: approach.y,
        duration:special?400:160,ease:'Quad.InOut' }));
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
      if(!skill&&!melee&&target&&event.kind==='damage'&&event.source===source.uid){
        this.bridge.after(at-260,()=>{if(!this.ending)this.combatFeedback.travel(source.heroId,
          {x:home.x+direction*24,y:home.y-52},{x:this.position(target).x,y:this.position(target).y-52},260,(hits.length>1),target.uid);});
      }
      const contact = dragonContacts.indexOf(event);
      if (contact >= 0 && dragonTravel && target) {
        const first = contact === 0;
        const startsAt = first ? DRAGON_TIMING.launch : at - gap + 25;
        this.bridge.after(startsAt, () => {
          if (!this.ending) this.skillVfx.sweepDragon(dragonTravel, launch, this.position(target),
            at - startsAt, first, direction < 0);
        });
      }
      if (!special && !dragon && skillId && effect?.travel && target && event.source === source.uid &&
        event.skillId === skillId && (hits.includes(event) || !hasTravel)) {
        const duration = hasTravel ? gap - 22 : ULTIMATE_TIMING.maxTravel;
        hasTravel = true;
        const arc = profile.style === 'earth' || profile.style === 'formation' ? 8 :
          profile.style === 'spear' ? 12 : target.side === source.side ? 44 : 32;
        this.bridge.after(at - duration, () => {
          if (!this.ending){const point=this.position(target);
            const hand={x:launch.x+direction*24,y:launch.y-52};
            this.skillVfx.travel(skillId,hand,{x:point.x,y:point.y-52},duration,arc);}
        });
      }
      this.bridge.after(at, () => {
        if (this.ending) return;
        if (hits.includes(event)) this.presentHit(engine.units.find(unit => unit.uid === event.source) ?? source, event, skillId);
        else this.presentStatus(event, skillId);
        if (contact >= 0 && contact === dragonContacts.length - 1) this.skillVfx.dismissDragon();
      },index);
    });
    const afterHits = initial + Math.max(0, playback.length - 1) * gap + (special?350:115);
    const retreat = dragon ? DRAGON_TIMING.retreat : ULTIMATE_TIMING.retreat;
    if (sourceView&&action.kind==='action') this.bridge.after(afterHits, () => {
      if(sourceView.character.dead)return;
      sourceView.animation.play('run');
      this.tweens.add({ targets: sourceView.art, x: home.x, y: home.y,
        duration: retreat, ease: 'Cubic.InOut',
        onComplete: () => {sourceView.art.setPosition(home.x, home.y).setDepth(home.y/1000);sourceView.animation.play('idle');} });
    });
    const total = events.find(e => e.kind === 'total');
    if (total) this.bridge.after(afterHits + 90, () => {
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
    // Let the last confirmed KO finish its real clip/fade before another turn/result.
    return Math.max(afterHits+retreat,afterHits+535);
  }

  private presentHit(attacker: BattleUnit, hit: BattleEvent, skillId?: string) {
    const victim = this.engine?.units.find(u => u.uid === hit.target);
    const view = victim && this.views.get(victim.uid);
    if (!victim || !view) return;
    if(view.character.dead&&hit.kind!=='heal')return;
    const { x, y } = this.position(victim);
    if (hit.kind === 'dodge') {
      this.floating(x, y - 86, 'NÉ ĐÒN', '#e0eeff', 19);
      return;
    }
    const heals = hit.kind === 'heal';
    const actorView=this.views.get(attacker.uid),facing=attacker.side==='player'?1:-1;
    if(duoActor(attacker.heroId))this.duoVfx.impact(attacker.heroId,{x,y},victim.uid,Boolean(hit.skill));
    else this.combatFeedback.hit(attacker.heroId,{x,y},victim.uid,Boolean(hit.skill),heals,Boolean(hit.critical),attacker.side==='enemy',
      actorView?{x:actorView.art.x+facing*52,y:actorView.art.y-55}:undefined);
    if (!duoActor(attacker.heroId)&&skillId && hit.skillId === skillId) this.skillVfx.impact(skillId,{x,y:y-52},heals,attacker.side==='enemy');
    if (!heals && hit.remainingHp === 0) {
      this.duoVfx.setReady(victim.heroId,victim.uid,view.art,false);
      this.time.delayedCall(600,()=>this.duoVfx.clearOwner(victim.uid));
      this.combatFeedback.death({x,y},victim.uid);
      view.character.die();this.updateCounts();
    } else if (!heals) view.character.react(hit.critical);
    else if(view.character.dead&&(hit.remainingHp??0)>0)view.character.revive();
    if (typeof hit.remainingHp === 'number') {
      this.tweens.killTweensOf(view.hp);
      this.tweens.add({targets:view.hp,scaleX:hit.remainingHp/victim.maxHp,duration:160,ease:'Sine.Out'});
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
    if(!this.reducedMotion){
    if(!heals&&!skillId){
      const spark=this.add.graphics().setPosition(x,y-56).setDepth(12).lineStyle(hit.critical?3:2,0xffe6a0,.95);
      for(let i=0;i<6;i++){const angle=i*Math.PI/3;spark.lineBetween(Math.cos(angle)*5,Math.sin(angle)*5,Math.cos(angle)*17,Math.sin(angle)*17);}
      this.tweens.add({targets:spark,alpha:0,scale:1.3,duration:140,onComplete:()=>spark.destroy()});
    }
    view.hit.setFillStyle(heals ? 0x74ffc3 : 0xffac83, 0.46).setAlpha(1);
    view.sprite.setTintFill(heals ? 0xa7ffd0 : 0xffe0ba);
    this.tweens.add({ targets: view.hit, alpha: 0, duration: hit.critical||hit.skill?180:100,
      onComplete: () => view.sprite.clearTint() });
    }
    if (!heals&&!this.reducedMotion) {
      const dragon = skillId?.replace(/:signature$/, '') === DRAGON_SKILL && hit.skillId === skillId;
      this.cameras.main.shake((dragon ? 145 : hit.skill ? 95 : 45)/this.speed,
        dragon ? 0.0034 : hit.skill ? 0.0022 : 0.0008);
    }
  }

  private floating(x: number, y: number, label: string, color: string, size: number) {
    let popup=this.floatingPool.find(text=>!text.active);
    if(!popup){popup=this.text(0,0,'',size,color,{fontStyle:'bold',stroke:'#261927',strokeThickness:4})
      .setOrigin(.5).setDepth(12);this.floatingPool.push(popup);}
    popup.setPosition(x,y).setText(label).setFontSize(size).setColor(color).setAlpha(1).setVisible(true).setActive(true);
    const activePopup=popup;
    this.tweens.add({ targets: popup, y: y - 49, alpha: 0, duration: 520,
      onComplete: () => activePopup.setVisible(false).setActive(false) });
  }

  private presentStatus(event: BattleEvent, skillId?: string) {
    if (skillId && event.skillId && event.skillId !== skillId) return;
    const target = this.engine?.units.find(u => u.uid === event.target);
    if (!target) return;
    const { x, y } = this.position(target);
    if(event.kind==='shield'||event.kind==='buff')this.combatFeedback.status({x,y},target.uid,event.kind==='shield');
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

  private endBattle(winner: 'player' | 'enemy',skipped=false) {
    if(this.ending)return;
    this.ending = true;
    for(const control of this.controls){control.hit.disableInteractive();control.image.setTint(0x8b8073).setAlpha(.65);control.text.setAlpha(.75);}
    this.bridge.cancel();this.intro?.destroy();this.intro=undefined;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.skillVfx.clear();
    this.combatFeedback.clear();
    this.duoVfx.clear();
    this.cutIn?.destroy();
    this.cutIn = undefined;
    for (const unit of this.engine?.units??[]){
      const view=this.views.get(unit.uid);if(!view)continue;
      if(unit.hp<=0)view.character.die();view.character.settle();
      if(unit.hp>0&&unit.side===winner&&view.animation.supports('victory'))view.animation.play('victory');
    }
    for(const text of this.floatingPool)text.setVisible(false).setActive(false);
    const victory=!skipped&&[...this.views.values()].some(v=>v.animation.supports('victory'));
    if(victory)this.time.delayedCall(800,()=>this.showResult(winner));else this.showResult(winner);
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
