import { WELFARE_ART, welfareKey } from '../ui/welfareAssets';
import Phaser from 'phaser';
import { walletBalance } from '../domain/resources';
import { openAccount, logoutAccount } from '../cloud/accountDialog';
import { cloudRepository, supabase } from '../cloud/cloudRepository';
import { mailRepository } from '../cloud/mailRepository';
import { welfareStatus } from '../domain/welfare';
import { HeroAnimationController, heroAnimationTexture } from '../ui/HeroAnimationController';
import { battleSpriteDisplaySize } from '../data/battleVisuals';
import { makeStageBattle } from '../domain/battle';
import { readLobbySettings, writeLobbySettings, type LobbySettings } from '../ui/lobbySettings';
import { STAGES } from '../data/campaign';
import { HERO_BY_ID } from '../data/heroes';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { sampleTexture } from '../data/battleLayout';
import { combatPower, formationPower } from '../domain/progression';
import { gameStore } from '../domain/store';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { openLobbyDialog } from '../ui/lobbyDialog';
import { openInventoryMenu } from '../ui/inventoryMenu';
import { vipLevel } from '../domain/vip';
import { portrait, PORTRAITS, atlasOrder } from '../ui/heroPresentation';
import { UiScene } from '../ui/UiScene';
import { LOBBY_DOCK, loadLobbySmooth, prepareLobbySmooth, smoothKey, SMOOTH_FRAME, type LobbySkin } from '../ui/lobbySmoothAssets';
import { coverScale, readSafeInsets, viewportLayout } from '../ui/viewport';
import { LobbyContent } from '../ui/LobbyContent';
import { compactLobbyAmount, fitLabelledTexture, fitTexture, LOBBY_PANELS, LOBBY_SKIN_CONTENT,
  LOBBY_WIDGETS, rect, skinContent } from '../ui/lobbyContentLayout';

const GOLD = 0xe7b761;
const INK = 0x211723;
const CREAM = '#fff0c6';
const format = (amount: number) => amount.toLocaleString('vi-VN');

export class LobbyScene extends UiScene {
  private preferences = readLobbySettings();
  private audio?: AudioContext;
  private settingsOpen = false;
  private closePopup?: () => void;
  private closeInventoryMenu?: () => void;
  private musicTimer?: Phaser.Time.TimerEvent;
  private anchors: (() => void)[] = [];
  private content!: LobbyContent;

  private layout() {
    const { width, height } = this.scale.gameSize;
    return viewportLayout(width, height, readSafeInsets(this.game.canvas.getBoundingClientRect().width / width));
  }

  private anchor(draw: () => void, locate: (layout: ReturnType<typeof viewportLayout>) => { x: number; y: number }) {
    const start = this.children.length;
    draw();
    const content = this.children.list.slice(start);
    const group = this.add.container(0, 0, content);
    this.anchors.push(() => { const point = locate(this.layout()); group.setPosition(point.x, point.y); });
  }

  constructor() { super('Lobby'); }

  preload() {
    loadLobbySmooth(this);
    for (const panel of Object.values(LOBBY_PANELS)) {
      if (panel.key !== smoothKey('red') && !this.textures.exists(panel.key)) this.load.image(panel.key, `${import.meta.env.BASE_URL}${panel.path}`);
    }
    const copper = welfareKey('copper_icon');
    if (!this.textures.exists(copper)) this.load.image(copper, `${import.meta.env.BASE_URL}${WELFARE_ART.copper_icon}`);
    if (!this.textures.exists('lobby-icons')) {
      this.load.spritesheet('lobby-icons', `${import.meta.env.BASE_URL}assets/lobby/menu-icons.webp`,
        { frameWidth: 256, frameHeight: 256 });
    }
  }

  create({ settings = false }: { settings?: boolean } = {}) {
    this.content = new LobbyContent(this);
    this.anchors = [];
    const resize = () => { for (const place of this.anchors) place(); };
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once('shutdown', () => this.scale.off(Phaser.Scale.Events.RESIZE, resize));
    prepareLobbySmooth(this);
    if (cloudRepository.active) {
      let active = true;
      const refresh = async () => {
        try {
          if (await cloudRepository.refresh() && active && !this.settingsOpen) this.scene.restart({ settings });
        } catch { /* Allow viewing the last confirmed snapshot when offline. */ }
      };
      const announce = () => { if (active) this.toast(cloudRepository.status); };
      const reconnect = async () => { await refresh(); announce(); };
      window.addEventListener('online', reconnect);
      this.events.once('shutdown', () => { active = false; window.removeEventListener('online', reconnect); });
      void refresh();
    }
    this.settingsOpen = settings;
    this.input.once('pointerdown', () => this.enableAudio());
    this.events.once('shutdown', () => {
      this.closePopup?.(); this.closePopup = undefined;
      this.closeInventoryMenu?.(); this.closeInventoryMenu = undefined;
      this.musicTimer = undefined;
      void this.audio?.close().catch(() => undefined);
      this.audio = undefined;
    });
    const save = gameStore.snapshot;
    const deployed = save.formation.flatMap(id => id ? [HERO_BY_ID[id]] : []);
    const lead = deployed[0] ?? HERO_BY_ID[save.heroes[0]] ?? HERO_BY_ID['zhang-fei'];
    const power = formationPower(save, undefined, vipLevel(cloudRepository.vip?.paidBaseKnbTotal));
    const stage = STAGES.find(entry => entry.id === gameStore.nextStageId());
    const recommended = stage ? makeStageBattle(stage, [lead.id]).units
      .filter(unit => unit.side === 'enemy')
      .reduce((total, unit) => total + combatPower({ ...unit, hp: unit.maxHp }), 0) : 0;

    this.add.rectangle(640, 360, 1280, 720, INK);
    const palace = LOBBY_ASSETS.palace.key;
    if (this.textures.exists(palace)) {
      const background = this.add.image(640, 360, palace);
      const cover = () => {
        const { width, height } = this.scale.gameSize;
        background.setPosition(width / 2, height / 2)
          .setScale(coverScale(background.frame.width, background.frame.height, width + 8, height + 8));
      };
      this.anchors.push(cover);
      if (this.preferences.effects && this.preferences.quality === 'Cao') {
        // Animate opacity, keeping cover edges stable during browser resizing.
        this.tweens.add({ targets: background, alpha: 0.94, duration: 5200, yoyo: true, repeat: -1 });
      }
    }
    this.anchor(() => { if (this.preferences.effects) this.ambientEffects(); }, l => ({ x: l.centerX, y: l.centerY }));
    this.add.rectangle(640, 360, 1280, 720, 0x1a0f28, 0.16);
    const header = this.add.rectangle(640, 51, 1280, 102, INK, 0.75);
    this.anchors.push(() => header.setPosition(this.scale.width / 2, 51).setSize(this.scale.width, 102));
    const dockFrame = this.add.graphics();
    this.anchors.push(() => {
      const l = this.layout(), width = l.contentWidth;
      dockFrame.clear().setPosition(l.left, l.bottom);
      dockFrame.fillGradientStyle(0x6d252c, 0x6d252c, 0x281421, 0x281421, 0.96);
      dockFrame.fillRoundedRect(18, 620, width - 36, 92, 34);
      dockFrame.lineStyle(2, GOLD, 0.85).strokeRoundedRect(18, 620, width - 36, 92, 34);
      dockFrame.lineStyle(1, 0xffe2a2, 0.3).strokeRoundedRect(25, 627, width - 50, 78, 28);
    });

    this.anchor(() => {
      const spec = LOBBY_PANELS.profile;
      const profile = this.content.frame('profile', spec.key, LOBBY_WIDGETS.profile, spec.frame);
      const avatar = profile.project(spec.fields.avatar);
      const x = avatar.x + avatar.width / 2, y = avatar.y + avatar.height / 2;
      this.add.circle(x, y, avatar.width / 2 + 2, 0x3d1e25).setStrokeStyle(2, GOLD);
      const face = portrait(this, x, y, avatar.width, lead);
      const avatarClip = this.make.graphics({ x: 0, y: 0 });
      avatarClip.fillStyle(0xffffff).fillCircle(x, y, avatar.width / 2);
      const avatarMask = avatarClip.createGeometryMask(); face.setMask(avatarMask);
      this.anchors.push(() => { const l = this.layout(); avatarClip.setPosition(l.left, l.top); });
      this.events.once('shutdown', () => { avatarMask.destroy(); avatarClip.destroy(); });
      this.content.field('profile.name', profile.project(spec.fields.name), save.playerName,
        { size: 22, minSize: 12, wrap: true, maxLines: 2 });
      this.content.field('profile.level', profile.project(spec.fields.level), `Cấp ${save.clearedStages.length + 1}`,
        { size: 16, padding: 1, color: '#e8cfaf', bold: false });
      this.content.field('profile.power', profile.project(spec.fields.power), `LỰC CHIẾN  ${format(power)}`,
        { size: 18, color: '#ffce75' });
      const profileHit = this.add.zone(profile.image.x, profile.image.y, profile.bounds.width, profile.bounds.height)
        .setName('lobby.profile').setInteractive({ useHandCursor: true });
      this.bindLobbyHit(profileHit, () => this.popup('profile'), value => {
        profile.image.setAlpha(value === 'press' ? 0.78 : 1);
      });
      const vip = this.content.frame('vip', smoothKey('red'), profile.project(spec.fields.vip), SMOOTH_FRAME);
      // VIP has separate server accounting; wallet balances and the demo top-up never count.
      this.content.field('profile.vip', vip.project(LOBBY_SKIN_CONTENT.red.content), `VIP ${vipLevel(cloudRepository.vip?.paidBaseKnbTotal)}`,
        { size: 13, minSize: 10, padding: 1, align: 'center', color: '#ffe19b' });
      const vipSlot = profile.project(spec.fields.vip);
      const vipHit = this.add.zone(vip.image.x, vip.image.y, vipSlot.width, vipSlot.height)
        .setName('lobby.vip').setInteractive({ useHandCursor: true });
      this.bindLobbyHit(vipHit, () => this.go('VIP'), value => {
        vip.image.setAlpha(value === 'press' ? 0.75 : 1);
      });
    }, l => ({ x: l.left, y: l.top }));

    this.anchor(() => {
      const { copper, gold } = walletBalance(save);
      const resources = [['Đồng', copper], ['Vàng', gold]] as const;
      resources.forEach(([label, value], index) => {
        const id = index === 0 ? 'copper' : 'gold';
        const frame = this.content.frame(`currency.${id}`, smoothKey('red'), LOBBY_WIDGETS.currencies[index], SMOOTH_FRAME);
        const fields = LOBBY_WIDGETS.currencyFields, icon = frame.project(fields.icon);
        const art = index === 0 ? this.add.image(0, 0, welfareKey('copper_icon')) : this.add.image(0, 0, 'lobby-icons', 12);
        art.setPosition(icon.x + icon.width / 2, icon.y + icon.height / 2).setScale(Math.min(icon.width / art.frame.width, icon.height / art.frame.height));
        this.content.field(`currency.${id}.label`, frame.project(fields.label), label,
          { size: 12, minSize: 10, padding: 1, align: 'center', color: '#ebc891' });
        this.content.field(`currency.${id}.value`, frame.project(fields.value), compactLobbyAmount(value),
          { size: 16, minSize: 12, padding: 1, align: 'center' });
        const plus = frame.project(fields.plus);
        this.add.circle(plus.x + plus.width / 2, plus.y + plus.height / 2, plus.width / 2, 0x355e39).setStrokeStyle(1, GOLD);
        this.content.field(`currency.${id}.plus`, plus, '+', { size: 18, padding: 1, align: 'center' });
        const hit = this.add.zone(frame.image.x, frame.image.y, frame.bounds.width, frame.bounds.height)
          .setName(`lobby.currency.${id}`).setInteractive({ useHandCursor: true });
        this.bindLobbyHit(hit, () => this.popup('currency', { name: label, balance: format(value) }),
          state => frame.image.setAlpha(state === 'press' ? 0.8 : 1));
      });
    }, l => ({ x: l.right, y: l.top }));

    this.anchor(() => {
      const companions = deployed.filter(hero => hero.id !== lead.id);
      this.showHero(440, 552, 246, companions[0]?.id, 0x68dacd);
      this.showHero(840, 552, 246, companions[1]?.id, 0xd991ff);
      this.showHero(640, 584, 282, lead.id, 0xffc764);
      this.content.field('hero.name', LOBBY_WIDGETS.heroName, lead.name,
        { size: 23, align: 'center', stroke: '#261526' });
    }, l => ({ x: l.centerX, y: l.centerY }));

    this.anchor(() => {
      const upper = [
        [0, 'Phúc Lợi', () => this.go('Info', { page: 'Welfare' })],
        [1, 'Nạp Đầu', () => this.go('Info', { page: 'Topup' })],
        [2, 'Điểm Danh', () => this.go('Info', { page: 'Checkin' })],
        [3, 'Hộp Thư', () => this.go('Mail')],
        [4, 'Nhiệm Vụ', () => this.go('Info', { page: 'Missions' })],
        [14, 'Cài Đặt', () => this.scene.restart({ settings: true })],
      ] as const;
      const welfare = welfareStatus(save);
      const rewardDots = [welfare.checkIn || welfare.missions.length > 0 || welfare.topup,
        welfare.topup, welfare.checkIn, false, welfare.missions.length > 0];
      upper.forEach(([icon, label, action], index) => {
        const skins: LobbySkin[] = ['welfare', 'topup', 'checkin', 'mail', 'missions', 'settings'];
        this.skinButton(687 + index * 105, 133, 100, 92, skins[index], skins[index], action,
          `lobby.${icon}`, false, rewardDots[index], label);
      });
      const owner=mailRepository.uid;
      if(owner){
        const x=687+3*105+37,y=101;
        const unreadBadge=this.add.circle(x,y,13,0xb81b24).setStrokeStyle(2,0xffdf8d).setVisible(false);
        const unreadLabel=this.text(x,y,'',13,'#fff4cc',{fontStyle:'bold'}).setOrigin(.5).setVisible(false);
        const refreshBadge=()=>void mailRepository.list(owner,'all',0).then(inbox=>{
          if(!unreadBadge.scene||mailRepository.uid!==owner) return;
          const unread=inbox.unread.all;
          unreadBadge.setVisible(unread>0); unreadLabel.setText(String(unread)).setVisible(unread>0);
        }).catch(()=>undefined);
        refreshBadge(); this.time.addEvent({delay:20_000,loop:true,callback:refreshBadge});
        window.addEventListener('focus',refreshBadge);
        this.events.once('shutdown',()=>window.removeEventListener('focus',refreshBadge));
      }
    }, l => ({ x: l.right, y: l.top }));

    this.anchor(() => {
      this.sideButton(228, 6, 'Bang Hội', () => this.popup('guild'), true);
      this.sideButton(343, 7, 'Đấu Trường', () => this.go('Arena'), false);
      this.sideButton(458, 8, 'Thế Giới', () => this.popup('world'), true);
      this.sideButton(552, 11, 'Vạn Bảo Các', () => this.go('Shop'), false, 'lobby.shop');
    }, l => ({ x: l.left, y: l.centerY }));

    this.anchor(() => {
      const spec = LOBBY_PANELS.campaign;
      const frame = this.content.frame('campaign', spec.key, LOBBY_WIDGETS.campaign);
      this.content.field('campaign.title', frame.project(spec.fields.title), 'CHINH CHIẾN',
        { size: 19, align: 'center', color: '#ffda98' });
      const clearedAll = save.clearedStages.length === STAGES.length;
      this.content.field('campaign.stage', frame.project(spec.fields.stage), clearedAll ? 'Đã vượt toàn bộ ải'
        : `Chương ${stage?.chapter} · Ải ${stage?.id}`, { size: 17, align: 'center' });
      this.content.field('campaign.power', frame.project(spec.fields.power), clearedAll ? 'Hành trình đã hoàn thành'
        : `Lực chiến đề xuất  ${format(recommended)}`, { size: 13, minSize: 11, padding: 1, align: 'center', bold: false });
      const cleared = STAGES.filter(entry => save.clearedStages.includes(entry.id)).length;
      const track = frame.project(spec.fields.progress);
      this.add.rectangle(track.x, track.y, track.width, track.height, 0x1c111c).setOrigin(0).setStrokeStyle(1, GOLD, 0.5);
      if (cleared) this.add.rectangle(track.x, track.y, track.width * cleared / STAGES.length, track.height, GOLD).setOrigin(0);
      this.content.field('campaign.progress', frame.project(spec.fields.caption), `Tiến trình ${cleared}/${STAGES.length} ải`,
        { size: 12, minSize: 10, padding: 1, align: 'center', color: '#e8cfaf', bold: false });
      const cta = frame.project(spec.fields.cta);
      this.skinButton(cta.x + cta.width / 2, cta.y + cta.height / 2, cta.width, cta.height, 'gold', 'gold',
        () => this.go('Campaign'), 'lobby.campaign', false, false, 'KHIÊU CHIẾN');
    }, l => ({ x: l.right, y: l.bottom }));

    const dock = [
      [9, 'Đội Hình', () => this.go('Formation')],
      [10, 'Võ Tướng', () => this.go('Heroes')],
      [11, 'Túi Đồ', () => this.toggleInventoryMenu()],
      [5, 'Chiêu Mộ', () => this.go('Summon')],

    ] as const;
    const dockSkins: [LobbySkin, LobbySkin][] = [['formation', 'formationActive'], ['heroes', 'heroesActive'],
      ['inventory', 'inventoryActive'], ['summon', 'summonActive']];
    dock.forEach(([icon, label, action], i) => {
      this.anchor(() => {
        const locked = i === 3 && !gameStore.isSummonUnlocked();
        this.skinButton(LOBBY_DOCK.centers[i], LOBBY_DOCK.y, LOBBY_DOCK.width, LOBBY_DOCK.height,
          ...dockSkins[i], action, `lobby.${icon}`, locked, false, label);
        if (locked) this.content.field(`dock.${icon}.lock`, rect(LOBBY_DOCK.centers[i] + 48, 600, 20, 20), '🔒',
          { size: 17, align: 'center', padding: 1 });
      }, l => ({ x: l.dock[i] - LOBBY_DOCK.centers[i], y: l.dockY - LOBBY_DOCK.y }));
    });
    if (settings) this.anchor(() => this.drawSettings(), l => ({ x: l.centerX, y: l.centerY }));
    resize();
    this.cameras.main.fadeIn(180, 17, 14, 20);
  }

  private toggleInventoryMenu() {
    if (this.closeInventoryMenu) { this.closeInventoryMenu(); return; }
    const layout = this.layout(), canvas = this.game.canvas.getBoundingClientRect();
    const ratio = canvas.width / this.scale.width;
    this.input.enabled = false;
    this.closeInventoryMenu = openInventoryMenu(this, { x: canvas.left + layout.dock[2] * ratio,
      y: canvas.top + (layout.dockY - 55) * ratio }, () => this.go('Inventory'), () => {
      this.closeInventoryMenu = undefined; this.input.enabled = true;
    }, scene => this.go(scene, { bag: true }));
  }

  private skinButton(x: number, y: number, width: number, height: number, normal: LobbySkin, active: LobbySkin,
    action: () => void, target: string, locked = false, reward = false, label = '') {
    const art = this.add.image(x, y, smoothKey(normal), SMOOTH_FRAME).setName(label);
    const slot = rect(x - width / 2 + 2, y - height / 2 + 2, width - 4, height - 4);
    const spec = LOBBY_SKIN_CONTENT[normal];
    const geometry = fitTexture(art.frame, slot);
    const dynamic = spec.bakedLabel ? undefined : this.content.field(`${target}.label`,
      geometry.project(skinContent(normal, art.frame.width, art.frame.height)), label,
      { size: 21, minSize: 14, padding: 3, align: 'center', color: '#fff3ce' });
    const paint = (state: 'rest' | 'hover' | 'press') => {
      // The kit's selected summon crop has a clipped right edge. Tint the complete default instead.
      const selected = active === 'summonActive' ? normal : active;
      const skin = state === 'rest' ? normal : selected;
      art.setTexture(smoothKey(skin), SMOOTH_FRAME);
      const frame = art.frame;
      const fit = spec.bakedLabel ? fitLabelledTexture(frame, slot, skinContent(skin, frame.width, frame.height))
        : fitTexture(frame, slot);
      art.setPosition(fit.bounds.x + fit.bounds.width / 2, fit.bounds.y + fit.bounds.height / 2)
        .setScale(fit.scale * (state === 'press' ? 0.95 : 1)).setAlpha(locked ? 0.58 : 1);
      dynamic?.setScale(state === 'press' ? 0.95 : 1);
      if (state === 'hover' && normal === selected) art.setTint(0xffe4b4); else art.clearTint();
    };
    paint('rest');
    if (spec.bakedLabel) {
      const sourceLabel = skinContent(normal, art.frame.width, art.frame.height);
      const body = rect(art.x - art.displayWidth / 2 + sourceLabel.x * art.scaleX,
        art.y - art.displayHeight / 2 + sourceLabel.y * art.scaleY, sourceLabel.width * art.scaleX, sourceLabel.height * art.scaleY);
      this.content.region(`${target}.baked`, body); this.content.outline(body, 0xf6bc4a);
    }
    if (reward) this.add.circle(x + width * 0.3, y - height * 0.32, 7, 0xe83c45).setStrokeStyle(2, GOLD);
    const hit = this.add.zone(x, y, width, height).setName(target).setInteractive({ useHandCursor: true });
    this.tutorialTarget(target, hit);
    this.bindLobbyHit(hit, action, paint);
  }

  private sideButton(y: number, frame: number, label: string, action: () => void, locked: boolean, target = `lobby.${frame}`) {
    // Kit side-nav default/selected PNGs contain baked red dots. Use a clean blank frame instead.
    const panel = this.content.frame(`side.${frame}`, smoothKey('red'), rect(9, y - 36, 204, 72), SMOOTH_FRAME);
    panel.image.setAlpha(locked ? 0.76 : 1);
    const inner = panel.project(LOBBY_SKIN_CONTENT.red.content);
    const iconSize = inner.height - 4;
    const icon = this.add.image(inner.x + iconSize / 2, inner.y + inner.height / 2, 'lobby-icons', frame);
    icon.setScale(iconSize / icon.frame.width).setAlpha(locked ? 0.65 : 1);
    this.content.field(`side.${frame}.label`, rect(inner.x + iconSize + 5, inner.y, inner.width - iconSize - 7, inner.height),
      label, { size: 17, minSize: 13, align: 'center', padding: 2 });
    const hit = this.add.zone(111, y, 210, 76).setName(target).setInteractive({ useHandCursor: true });
    this.tutorialTarget(target, hit);
    this.bindLobbyHit(hit, action, state => panel.image.setAlpha(state === 'press' ? 0.65 : locked ? 0.76 : 1));
  }

  private bindLobbyHit(hit: Phaser.GameObjects.Zone | Phaser.GameObjects.Sprite, action: () => void,
    visual: (state: 'rest' | 'hover' | 'press') => void) {
    let pressed = false;
    hit.on('pointerover', () => { if (!this.settingsOpen) visual('hover'); });
    hit.on('pointerout', () => { pressed = false; visual('rest'); });
    hit.on('pointerdown', () => { if (!this.settingsOpen) { pressed = true; visual('press'); } });
    hit.on('pointerup', () => {
      const activate = pressed; pressed = false; visual('rest');
      if (activate && !this.settingsOpen) this.activate(action);
    });
  }

  private popup(kind: 'profile' | 'vip' | 'guild' | 'world' | 'currency', currency?: { name: string; balance: string }) {
    if (this.settingsOpen) return;
    const save = gameStore.snapshot;
    const lead = save.formation.find(id => id) ?? save.heroes[0] ?? 'zhang-fei';
    this.settingsOpen = true;
    this.closePopup = openLobbyDialog(kind, {
      name: save.playerName,
      uid: cloudRepository.uid ?? 'Chưa có phiên đăng nhập',
      server: import.meta.env.VITE_SUPABASE_URL?.trim() === 'https://ovvlhcpwothevvoblybx.supabase.co' ? 'Staging' : 'Chưa cấu hình',
      level: save.clearedStages.length + 1, power: format(formationPower(save)),
      avatar: this.textures.getBase64(PORTRAITS, atlasOrder.indexOf(lead)),
      currency,
    }, {
      account: async () => { await openAccount(); if (this.sys.isActive()) this.scene.restart({}); },
      logout: logoutAccount,
      closed: () => { this.settingsOpen = false; this.closePopup = undefined; },
    });
  }

  private showHero(x: number, y: number, size: number, id: string | undefined, color: number) {
    if (!id) return;
    this.add.ellipse(x, y, size * 0.65, 34, 0x1a1223, 0.6).setStrokeStyle(3, color, 0.7);
    const halo = this.add.ellipse(x, y - size * 0.42, size * 0.86, size * 0.82, color, 0.12);
    if (this.preferences.effects) this.tweens.add({ targets: halo, alpha: 0.5, duration: 1300, yoyo: true, repeat: -1 });
    const sample = sampleTexture(id);
    const custom = this.textures.exists(sample);
    const atlas = heroAnimationTexture(id);
    const hasIdle = this.textures.exists(atlas);
    const display = size * battleSpriteDisplaySize(id) / 180;
    const sprite = this.add.sprite(x, y, hasIdle ? atlas : custom ? sample : BATTLE_SPRITES,
      hasIdle ? 0 : custom ? undefined : battleSpriteFrames.get(id))
      .setOrigin(0.5, 1).setDisplaySize(display, display).setInteractive({ useHandCursor: true });
    if (hasIdle) new HeroAnimationController(sprite, id);
    else this.tweens.add({ targets: sprite, y: y - 2, duration: 950, yoyo: true, repeat: -1 });
    this.bindLobbyHit(sprite, () => this.go('Heroes', { heroId: id }), state => {
      if (state === 'rest') sprite.clearTint();
      else sprite.setTint(state === 'press' ? 0xd9b88a : 0xffe6bd);
    });
  }

  private ambientEffects() {
    const count = this.preferences.quality === 'Cao' ? 11 : 4;
    for (let i = 0; i < count; i++) {
      const x = 115 + i * 103;
      const leaf = this.add.ellipse(x, -20, 11, 5, i % 2 ? 0xe98548 : 0xe4b063, 0.65);
      this.tweens.add({ targets: leaf, x: x + 70, y: 612, angle: 280,
        duration: 4500 + i * 230, delay: i * 440, repeat: -1 });
    }
    for (const x of [302, 532, 748, 976]) {
      const glow = this.add.circle(x, 268, 28, 0xffa242, 0.11).setBlendMode('ADD');
      this.tweens.add({ targets: glow, alpha: 0.29, duration: 1000 + x, repeat: -1, yoyo: true });
    }
  }

  private activate(action: () => void) {
    if (this.settingsOpen) return;
    this.enableAudio();
    if (this.preferences.sfx) this.tone(650, 0.11, 0.055);
    action();
  }

  private enableAudio() {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume().catch(() => undefined);
      if (!this.preferences.music || this.musicTimer) return;
      const notes = [262, 330, 392, 440, 392, 330, 294, 330];
      let index = 0;
      this.musicTimer = this.time.addEvent({ delay: 680, loop: true,
        callback: () => this.tone(notes[index++ % notes.length], 0.6, 0.027) });
    } catch { /* Audio can be unavailable on the device. */ }
  }

  private tone(hz: number, duration: number, volume: number) {
    if (!this.audio) return;
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    const now = this.audio.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private drawSettings() {
    const shade = this.add.rectangle(640, 360, this.scale.width, this.scale.height, 0x100a18, 0.81).setInteractive();
    this.anchors.push(() => {
      const l = this.layout();
      shade.setPosition(this.scale.width / 2 - l.centerX, this.scale.height / 2 - l.centerY)
        .setSize(this.scale.width, this.scale.height);
    });
    this.panel(385, 134, 510, 520, INK, 0.99);
    this.text(640, 178, 'CÀI ĐẶT SẢNH', 29, CREAM, { fontStyle: 'bold' }).setOrigin(0.5);
    const options: [string, keyof LobbySettings][] = [
      ['Music', 'music'], ['SFX', 'sfx'], ['Hiệu ứng môi trường', 'effects'], ['VFX Quality', 'quality'],
    ];
    options.forEach(([label, key], index) => {
      const y = 248 + index * 68;
      this.text(435, y, label, 19, CREAM).setOrigin(0, 0.5);
      const value = this.preferences[key];
      this.button(788, y, 116, 48, typeof value === 'boolean' ? value ? 'Bật' : 'Tắt' : value, () => {
        if (key === 'quality') this.preferences.quality = this.preferences.quality === 'Cao' ? 'Thấp' : 'Cao';
        else this.preferences[key] = !this.preferences[key];
        writeLobbySettings(this.preferences);
        this.scene.restart({ settings: true });
      }, 0x724735, true, true);
    });
    this.button(640, 599, 300, 48, 'Trợ Giúp', () => this.go('Tutorial', { help: true }), 0x724735, true, true);
    this.button(supabase ? 553 : 640, 537, 154, 48, 'Đóng', () => this.scene.restart({}), 0x385a50, true, true);
    if (supabase) this.button(727, 537, 154, 48, 'Tài khoản', async () => {
      await openAccount();
      this.scene.restart({});
    }, 0x724735, true, true);
  }
}
