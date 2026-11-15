import { WELFARE_ART, welfareKey } from '../ui/welfareAssets';
import { walletBalance } from '../domain/resources';
import { openAccount } from '../cloud/accountDialog';
import { cloudRepository, supabase } from '../cloud/cloudRepository';
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
import { portrait } from '../ui/heroPresentation';
import { UiScene } from '../ui/UiScene';

const GOLD = 0xe7b761;
const INK = 0x211723;
const CREAM = '#fff0c6';
const format = (amount: number) => amount.toLocaleString('vi-VN');

export class LobbyScene extends UiScene {
  private preferences = readLobbySettings();
  private audio?: AudioContext;
  private settingsOpen = false;
  private musicTimer?: Phaser.Time.TimerEvent;

  constructor() { super('Lobby'); }

  preload() {
    const copper = welfareKey('copper_icon');
    if (!this.textures.exists(copper)) this.load.image(copper, `${import.meta.env.BASE_URL}${WELFARE_ART.copper_icon}`);
    if (!this.textures.exists('lobby-icons')) {
      this.load.spritesheet('lobby-icons', `${import.meta.env.BASE_URL}assets/lobby/menu-icons.webp`,
        { frameWidth: 256, frameHeight: 256 });
    }
  }

  create({ settings = false }: { settings?: boolean } = {}) {
    if (cloudRepository.active) {
      let active = true;
      const refresh = async () => {
        try {
          if (await cloudRepository.refresh() && active) this.scene.restart({ settings });
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
      this.musicTimer = undefined;
      void this.audio?.close().catch(() => undefined);
      this.audio = undefined;
    });
    const save = gameStore.snapshot;
    const deployed = save.formation.flatMap(id => id ? [HERO_BY_ID[id]] : []);
    const lead = deployed[0] ?? HERO_BY_ID[save.heroes[0]] ?? HERO_BY_ID['zhang-fei'];
    const power = formationPower(save);
    const stage = STAGES.find(entry => entry.id === gameStore.nextStageId());
    const recommended = stage ? makeStageBattle(stage, [lead.id]).units
      .filter(unit => unit.side === 'enemy')
      .reduce((total, unit) => total + combatPower({ ...unit, hp: unit.maxHp }), 0) : 0;

    this.add.rectangle(640, 360, 1280, 720, INK);
    const palace = LOBBY_ASSETS.palace.key;
    if (this.textures.exists(palace)) {
      const background = this.add.image(640, 360, palace).setDisplaySize(1288, 726);
      if (this.preferences.effects && this.preferences.quality === 'Cao') {
        this.tweens.add({ targets: background, x: 643, duration: 5200, yoyo: true, repeat: -1 });
      }
    }
    if (this.preferences.effects) this.ambientEffects();
    this.add.rectangle(640, 360, 1280, 720, 0x1a0f28, 0.16);
    this.add.rectangle(640, 51, 1280, 102, INK, 0.75);
    this.add.rectangle(640, 672, 1280, 96, INK, 0.96).setStrokeStyle(2, GOLD, 0.6);

    this.panel(20, 16, 446, 130, INK, 0.96);
    this.add.rectangle(79, 75, 98, 98, 0x744528).setStrokeStyle(4, GOLD);
    portrait(this, 79, 75, 85, lead);
    const name = this.text(143, 29, save.playerName, 23, CREAM, { fontStyle: 'bold' });
    if (name.width > 212) name.setScale(212 / name.width, 1);
    this.add.rectangle(408, 44, 79, 34, 0x744528).setStrokeStyle(1, GOLD);
    this.text(408, 44, 'VIP', 19, '#ffe19b', { fontStyle: 'bold' }).setOrigin(0.5);
    this.text(143, 63, `Lv ${save.clearedStages.length + 1}`, 17, '#e8cfaf');
    this.text(143, 98, `LỰC CHIẾN  ${format(power)}`, 22, '#ffce75', { fontStyle: 'bold' });

    const { copper, gold } = walletBalance(save);
    const resources = [['Đồng', copper], ['Vàng', gold]] as const;
    resources.forEach(([label, value], index) => {
      const x = 923 + index * 168;
      this.panel(x, 22, 153, 57, INK, 0.94);
      if (index === 0) this.add.image(x + 25, 50, welfareKey('copper_icon')).setDisplaySize(36, 36);
      else this.add.image(x + 25, 50, 'lobby-icons', 12).setDisplaySize(36, 36);
      this.text(x + 91, 38, label, 15, '#ebc891').setOrigin(0.5);
      const amount = this.text(x + 91, 61, format(value), 19, CREAM, { fontStyle: 'bold' }).setOrigin(0.5);
      if (amount.width > 110) amount.setScale(110 / amount.width, 1);
    });

    const companions = deployed.filter(hero => hero.id !== lead.id);
    this.showHero(440, 552, 246, companions[0]?.id, 0x68dacd);
    this.showHero(840, 552, 246, companions[1]?.id, 0xd991ff);
    this.showHero(640, 584, 282, lead.id, 0xffc764);
    this.text(640, 606, lead.name, 23, CREAM,
      { fontFamily: 'Georgia, serif', fontStyle: 'bold', stroke: '#261526', strokeThickness: 6 }).setOrigin(0.5);

    const upper = [
      [0, 'Phúc Lợi', () => this.go('Info', { page: 'Welfare' })],
      [1, 'Nạp Đầu', () => this.go('Info', { page: 'Topup' })],
      [2, 'Điểm Danh', () => this.go('Info', { page: 'Checkin' })],
      [3, 'Hộp Thư', () => this.go('Info', { page: 'Mail' })],
      [4, 'Nhiệm Vụ', () => this.go('Info', { page: 'Missions' })],
      [14, 'Cài Đặt', () => this.scene.restart({ settings: true })],
    ] as const;
    const welfare = welfareStatus(save);
    const rewardDots = [welfare.checkIn || welfare.missions.length > 0 || welfare.topup,
      welfare.topup, welfare.checkIn, false, welfare.missions.length > 0];
    upper.forEach(([icon, label, action], index) => {
      this.medallion(687 + index * 105, 133, icon, label, action,
        false, rewardDots[index]);
    });

    this.medallion(75, 228, 6, 'Bang Hội', () => this.toast('Bang Hội mở khi có máy chủ bang hội.'), true);
    this.medallion(75, 343, 7, 'Đấu Trường', () => this.go('Arena'), false);
    this.medallion(75, 458, 8, 'Thế Giới', () => this.toast('Thế Giới mở khi có bản đồ thế giới.'), true);

    this.panel(989, 430, 263, 176, INK, 0.93);
    const clearedAll = save.clearedStages.length === STAGES.length;
    this.text(1120, 453, clearedAll ? 'Đã vượt toàn bộ ải'
      : `Chương ${stage?.chapter} · Ải ${stage?.id}`, 19, '#ffda98').setOrigin(0.5);
    if (!clearedAll) this.text(1120, 488, `Lực chiến đề xuất  ${format(recommended)}`,
      16, CREAM).setOrigin(0.5);
    const campaign = this.button(1120, 554, 223, 65, 'CHINH CHIẾN',
      () => this.activate(() => this.go('Campaign')), 0x863a2e, true, true);
    campaign.text.setX(1144);
    this.add.image(1034, 554, 'lobby-icons', 15).setDisplaySize(54, 54);

    const dock = [
      [9, 'Đội Hình', () => this.go('Formation')],
      [10, 'Võ Tướng', () => this.go('Heroes')],
      [11, 'Túi Đồ', () => this.go('Inventory')],
      [5, 'Chiêu Mộ', () => this.go('Summon')],

    ] as const;
    dock.forEach(([icon, label, action], i) => this.medallion(172 + 310 * i, 663, icon, label, action,
      i === 3 && !gameStore.isSummonUnlocked()));
    if (settings) this.drawSettings();
  }

  private medallion(x: number, y: number, frame: number, label: string, action: () => void, locked: boolean, reward = false) {
    this.add.ellipse(x, y + 13, 58, 14, 0x180f20, 0.5);
    const art = this.add.image(x, y - 11, 'lobby-icons', frame).setDisplaySize(67, 67)
      .setAlpha(locked ? 0.65 : 1);
    this.text(x, y + 27, locked ? `🔒 ${label}` : label, 16, CREAM,
      { fontStyle: 'bold', stroke: '#211523', strokeThickness: 5 }).setOrigin(0.5);
    if (reward) this.add.circle(x + 25, y - 33, 7, 0xe83c45).setStrokeStyle(2, GOLD);
    const hit = this.add.zone(x, y, 98, 81).setInteractive({ useHandCursor: true });
    this.tutorialTarget(`lobby.${frame}`, hit);
    const scale = art.scaleX;
    hit.on('pointerover', () => art.setScale(scale * 1.09));
    hit.on('pointerout', () => art.setScale(scale));
    hit.on('pointerup', () => { if (!this.settingsOpen) this.activate(action); });
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
    else this.tweens.add({ targets: sprite, scaleY: sprite.scaleY * 1.012, duration: 950, yoyo: true, repeat: -1 });
    sprite.on('pointerup', () => {
      if (!this.settingsOpen) this.activate(() => this.go('Heroes', { heroId: id }));
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
    this.add.rectangle(640, 360, 1280, 720, 0x100a18, 0.81).setInteractive();
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
