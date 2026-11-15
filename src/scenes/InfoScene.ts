import { HERO_BY_ID } from '../data/heroes';
import type { GameCommand } from '../cloud/gameProtocol';
import { WELFARE_ART, welfareKey, type WelfareArt } from '../ui/welfareAssets';
import { DUPLICATE_SHARDS } from '../domain/summon';
import { atlasOrder, PORTRAITS } from '../ui/heroPresentation';
import { gameStore } from '../domain/store';
import { CHECK_IN, DAILY_MISSIONS, MISSIONS, TOPUP_HERO, TOPUP_REWARD, welfareStatus, type WalletReward } from '../domain/welfare';
import { UiScene } from '../ui/UiScene';

type Page = 'Welfare' | 'Checkin' | 'Missions' | 'Topup' | 'Mail';
const TABS = [
  ['Checkin', 'Điểm Danh', 'template_welfare_scroll'],
  ['Missions', 'Nhiệm Vụ Ngày', 'template_quest_scroll'],
  [null, 'Quà Đăng Nhập', 'icon_chest_open'],
  ['Topup', 'Nạp Đầu', 'icon_gold'],
  [null, 'Mã Quà', 'icon_gold_key'],
  [null, 'Thưởng Online', 'icon_chest_locked'],
] as const;
const REWARD = [
  ['copper', 'Đồng', 'copper_icon'],
  ['coins', 'Vàng', 'icon_gold'],
  ['trainingExp', 'EXP Tướng', 'icon_exp'],
  ['gems', 'Nguyên Bảo cũ', null],
  ['goldKeys', 'Chìa Vàng', 'icon_gold_key'],
] as const;
const MISSION_ICONS = {
  win: 'icon_mission_battle', upgrade: 'icon_mission_upgrade',
  summon: 'icon_mission_team', battle: 'icon_mission_battle',
} as const;
const HEADINGS: Record<Page, string> = {
  Welfare: 'Phúc Lợi Ngày', Checkin: 'Điểm Danh 7 Ngày', Missions: 'Nhiệm Vụ Ngày',
  Topup: 'Nạp Đầu', Mail: 'Hộp Thư',
};

export class InfoScene extends UiScene {
  constructor() { super('Info'); }

  preload() {
    for (const [id, path] of Object.entries(WELFARE_ART)) {
      const key = welfareKey(id as WelfareArt);
      if (!this.textures.exists(key)) this.load.image(key, `${import.meta.env.BASE_URL}${path}`);
    }
  }

  create({ page = 'Welfare', claimed = false }: { page?: Page; claimed?: boolean } = {}) {
    const save = gameStore.snapshot;
    const status = welfareStatus(save);
    const notice = { Checkin: status.checkIn, Missions: status.missions.length > 0, Topup: status.topup };
    const open = (next: Page) => this.scene.restart({ page: next });
    const claim = (command: GameCommand, callback: () => boolean) =>
      this.saveAction(command, callback, ok => {
        if (ok) this.scene.restart({ page, claimed: true });
        else this.toast('Chưa thể nhận. Kiểm tra điều kiện hoặc dữ liệu lưu.');
      });

    this.art(page === 'Topup' ? 'background_topup' : 'background_palace', 640, 360, 1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x341a25, page === 'Topup' ? 0.07 : 0.19);
    this.slice('main_panel', 149, 376, 278, 672, 48);
    this.art('header', 151, 47, 298, 69);
    this.action(52, 46, 70, 52, '‹', () => page === 'Welfare' || page === 'Mail' ? this.go('Lobby') : open('Welfare'));
    this.title(181, 47, 'Phúc Lợi', 29);
    TABS.forEach(([id, label, icon], index) => {
      const y = 143 + index * 77;
      const selected = page === id;
      const tab = this.art(selected ? 'tab_selected' : 'tab_default', 148, y, 248, 70);
      this.art(icon, 58, y - 1, 36, 35).setAlpha(id ? 1 : 0.7);
      this.title(165, y - 1, label, 21).setAlpha(id ? 1 : 0.72);
      if (id) {
        this.clickable(tab, () => open(id));
        if (notice[id]) this.dot(253, y - 19);
      } else {
        this.clickable(tab, () => this.toast(`${label} chưa mở.`));
      }
    });
    this.art('deco_gold_dragon', 151, 626, 149, 66);
    this.action(149, 666, 191, 48, 'Về sảnh', () => this.go('Lobby'), 'secondary_button');

    if (page === 'Welfare') {
      this.art('hostess_phuc_loi', 558, 313, 463, 541);
      this.heading(984, 137, HEADINGS[page]);
      this.title(982, 197, 'Điểm danh và hoàn thành nhiệm vụ', 23);
      this.art('icon_gift_treasure', 1025, 409, 222, 101);
      const links = [
        ['Checkin', 'Điểm Danh\n7 Ngày', 'template_welfare_scroll'],
        ['Missions', 'Nhiệm Vụ\nNgày', 'template_quest_scroll'],
        [null, 'Quà\nĐăng Nhập', 'icon_chest_open'],
        ['Topup', 'Nạp Đầu\nDemo', 'icon_gold'],
      ] as const;
      links.forEach(([id, label, icon], index) => {
        const x = 432 + index * 226;
        this.slice('main_panel', x, 572, 208, 184, 48);
        const tile = this.add.zone(x, 572, 208, 184).setInteractive({ useHandCursor: true });
        this.art(icon, x, 536, 79, 71);
        this.title(x, 602, label, 23).setAlpha(id ? 1 : 0.82);
        tile.on('pointerup', () => id ? open(id) : this.toast('Quà Đăng Nhập chưa mở.'));
        if (id && notice[id]) this.dot(x + 78, 499);
      });
    } else if (page === 'Checkin') {
      this.heading(787, 136, HEADINGS[page]);
      this.title(787, 200, 'Mỗi ngày nhận một mốc · Chu kỳ mới sau ngày 7', 21);
      const active = status.welfare.checkIns === CHECK_IN.length && status.checkIn ? 0 : status.welfare.checkIns;
      CHECK_IN.forEach((reward, index) => {
        const x = 375 + index * 136;
        const ready = index === active && status.checkIn;
        const received = index < active;
        const special = index === CHECK_IN.length - 1;
        this.slice('reward_blank', x, 463, 125, 365, 34);
        this.art(ready || special ? 'tab_selected' : 'tab_default', x, 286, 132, 57);
        this.title(x, 287, `Ngày ${index + 1}`, 21);
        const entries = this.rewardEntries(reward);
        const first = 439 - (entries.length - 1) * 31;
        entries.forEach((item, i) => this.rewardItem(x, first + i * 62, item, 46, 13, true));
        if (ready || received) this.action(x, 592, 116, 52, received ? 'Đã nhận' : 'Nhận',
          received ? undefined : () => claim({ type: 'checkIn' }, () => gameStore.claimCheckIn()));
        else this.text(x, 591, index === active ? 'Ngày mai' : 'Chưa đến', 17, '#633522',
          { fontStyle: 'bold' }).setOrigin(0.5);
      });
    } else if (page === 'Missions') {
      this.heading(787, 106, HEADINGS[page]);
      this.title(787, 158, 'Làm mới lúc 00:00 giờ Việt Nam', 19);
      const completed = MISSIONS.filter(id => (status.daily.counts[id] ?? 0) >= DAILY_MISSIONS[id].goal).length;
      this.slice('reward_strip', 790, 226, 944, 100, 36);
      this.title(473, 214, 'Nhiệm vụ hoàn thành', 21);
      this.title(473, 244, `${completed}/${MISSIONS.length}`, 21);
      MISSIONS.forEach((_, index) => {
        const x = 651 + 155 * index;
        const done = index < completed;
        this.art(done ? 'icon_chest_open' : 'icon_chest_locked', x, 214, 47, 39);
        this.title(x, 247, String(index + 1), 16);
      });
      this.bar(878, 265, 548, completed / MISSIONS.length);
      MISSIONS.forEach((id, index) => {
        const mission = DAILY_MISSIONS[id];
        const value = status.daily.counts[id] ?? 0;
        const done = status.daily.claimed.includes(id);
        const ready = status.missions.includes(id);
        const y = 324 + index * 98;
        this.add.nineslice(791, y, welfareKey('template_parchment_detail_panel'), undefined, 941, 88, 22, 22, 19, 19);
        this.art(MISSION_ICONS[id], 371, y, 55, 52);
        this.text(412, y - 25, mission.label, 21, '#4a271b', { fontStyle: 'bold' });
        this.bar(557, y + 16, 285, value / mission.goal);
        this.text(711, y + 16, `${value}/${mission.goal}`, 18, '#4a271b', { fontStyle: 'bold' }).setOrigin(0, 0.5);
        this.rewardEntries(mission.reward).forEach((item, i) => this.rewardItem(841 + i * 112, y - 11, item, 41, 13, true));
        this.action(1151, y, 142, 56, done ? 'Đã nhận' : ready ? 'Nhận' : 'Đến',
          done ? undefined : ready ? () => claim({ type: 'daily', mission: id }, () => gameStore.claimDaily(id))
            : () => this.go(mission.scene), ready ? 'primary_button' : 'secondary_button');
        if (ready) this.dot(1211, y - 22);
      });
    } else if (page === 'Topup') {
      const hero = HERO_BY_ID[TOPUP_HERO];
      this.art('trieu_van_dragon', 798, 276, 478, 440);
      this.heading(489, 145, HEADINGS[page], 323);
      this.title(463, 207, 'Quà một lần · Demo', 22);
      this.title(1121, 156, hero.rarity, 47);
      this.title(1121, 203, hero.name, 30);
      this.slice('reward_strip', 787, 548, 835, 112, 36);
      const heroReward: RewardEntry = save.heroes.includes(hero.id) && status.topup
        ? { label: `Mảnh ${hero.name}`, amount: DUPLICATE_SHARDS, art: 'icon_hero_shard' }
        : { label: hero.name, art: null };
      const rewards = [heroReward, ...this.rewardEntries(TOPUP_REWARD)];
      rewards.forEach((item, index) => {
        const columnWidth = 690 / rewards.length;
        const x = 787 + (index - (rewards.length - 1) / 2) * columnWidth;
        const iconY = 539;
        if (item.art) {
          this.art(item.art, x, iconY, 49, 42);
        } else if (index === 0) {
          this.art('hero_ssr_frame', x, iconY, 39, 46);
          this.add.image(x, iconY, PORTRAITS, atlasOrder.indexOf(hero.id)).setDisplaySize(30, 35);
        }
        const label = item.amount === undefined ? item.label : `${item.amount.toLocaleString('vi-VN')} ${item.label}`;
        this.title(x, 570, label, 17);
      });
      this.action(787, 653, 320, 67, status.topup ? 'Nhận quà mô phỏng' : 'Đã nhận quà',
        status.topup ? () => claim({ type: 'firstTopupDemo' }, () => gameStore.claimFirstTopupDemo()) : undefined);
    } else {
      this.heading(787, 136, HEADINGS[page]);
      this.title(787, 355, 'Chưa có thư mới', 26);
    }

    if (claimed) {
      const effect = this.art('template_sparkles', 787, 671, 197, 122).setDepth(2);
      this.tweens.add({ targets: effect, alpha: 0, duration: 800, onComplete: () => effect.destroy() });
      this.toast('Đã nhận thưởng');
    }
  }

  private rewardEntries(reward: WalletReward): RewardEntry[] {
    return REWARD.flatMap(([id, label, art]) => reward[id] ? [{ art, label, amount: reward[id] }] : []);
  }

  private rewardItem(x: number, y: number, item: RewardEntry, size: number, font: number, parchment = false) {
    const { art, label, amount } = item;
    if (art) this.art(art, x, y, size, size * 0.85);
    const caption = amount === undefined ? label : `${amount.toLocaleString('vi-VN')} ${label}`;
    const color = parchment ? '#4a271b' : '#ffe6ae';
    this.text(x, y + (art ? size * 0.49 : 0), caption, font, color,
      { fontStyle: 'bold', align: 'center', wordWrap: { width: parchment ? 110 : 159 } }).setOrigin(0.5, 0);
  }

  private bar(x: number, y: number, width: number, progress: number) {
    this.art('progress_bar_empty', x, y, width + 14, 19);
    if (progress > 0) this.add.rectangle(x - width / 2, y, width * Math.min(1, progress), 7, 0x8fb653).setOrigin(0, 0.5);
  }

  private art(id: WelfareArt, x: number, y: number, width: number, height: number) {
    return this.add.image(x, y, welfareKey(id)).setDisplaySize(width, height);
  }

  private slice(id: WelfareArt, x: number, y: number, width: number, height: number, edge: number) {
    return this.add.nineslice(x, y, welfareKey(id), undefined, width, height, edge, edge, edge, edge);
  }

  private heading(x: number, y: number, label: string, width = 545) {
    this.art('header', x, y + 5, width, 68);
    this.title(x, y, label, 39);
  }

  private dot(x: number, y: number) {
    this.add.circle(x, y, 7, 0xff4141).setStrokeStyle(1, 0xffe2a1);
  }

  private title(x: number, y: number, label: string, size: number) {
    return this.text(x, y, label, size, '#ffe4a4', {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', align: 'center', stroke: '#3b1922', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private clickable(image: Phaser.GameObjects.Image, action: () => void) {
    image.setInteractive({ useHandCursor: true })
      .on('pointerover', () => image.setTint(0xffe7ad))
      .on('pointerout', () => image.clearTint())
      .on('pointerup', action);
  }

  private action(x: number, y: number, w: number, h: number, label: string, action?: () => void,
    art: WelfareArt = 'primary_button') {
    const image = this.art(action ? art : 'template_button_disabled', x, y, w, h);
    this.title(x, y, label, w > 250 ? 24 : 18);
    if (action) this.clickable(image, action);
  }
}

interface RewardEntry { art: WelfareArt | null; label: string; amount?: number }
