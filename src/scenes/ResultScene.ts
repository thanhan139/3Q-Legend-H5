import { cloudRepository } from '../cloud/cloudRepository';
import type { BattleTicket } from '../cloud/gameProtocol';
import { HERO_BY_ID } from '../data/heroes';
import type { Rarity } from '../domain/types';
import { formationKey } from '../ui/formationAssets';
import { HERO_UI_RANK, heroUiKey } from '../ui/heroUiAssets';
import { atlasOrder, PORTRAITS } from '../ui/heroPresentation';
import { EQUIPMENT, STAGE_GEAR } from '../domain/equipment';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { HERO_MILESTONES, nextStage, STAGES } from '../data/campaign';
import { gameStore } from '../domain/store';
import { UiScene } from '../ui/UiScene';

interface ResultData {
  stageId: string;
  winner: 'player' | 'enemy';
  turns?: number;
  battleId?: string;
  ticket?: BattleTicket;
  tutorialReview?: boolean;
  summary?: { deployed: number; survivors: number; damage: number };
}

export class ResultScene extends UiScene {
  constructor() { super('Result'); }

  private readonly settled = new WeakMap<ResultData, ReturnType<typeof gameStore.completeStage>>();

  async create(data: ResultData) {
    let reward = this.settled.get(data);
    const tutorial = cloudRepository.tutorial;
    if (data.tutorialReview && tutorial?.tutorialStep === 'rewards' && tutorial.battleReceipt) {
      reward = { firstClear: tutorial.battleReceipt.firstClear, rewards: tutorial.battleReceipt.rewards };
    }
    if (!reward && data.ticket && cloudRepository.active) {
      let active = true;
      const stop = () => { active = false; };
      this.events.once('shutdown', stop);
      const loading = this.text(640, 297, 'Đang xác nhận kết quả với máy chủ…', 27).setOrigin(0.5);
      try {
        const result = await cloudRepository.execute<ReturnType<typeof gameStore.completeStage> & {
          winner: ResultData['winner'];
        }>({ type: 'battle', ticket: data.ticket });
        if (!active) return;
        data.winner = result.winner;
        reward = result;
      } catch (error) {
        if (active) {
          loading.setWordWrapWidth(800).setText(error instanceof Error ? error.message : 'Chưa xác nhận được kết quả.');
          this.button(486, 391, 220, 53, 'Thử lại xác nhận', () => this.scene.restart(data));
          this.button(778, 391, 220, 53, '← Chinh Chiến', () => this.go('Campaign', { stageId: data.stageId }));
        }
        return;
      } finally { this.events.off('shutdown', stop); }
      loading.destroy();
    }
    reward ??= { firstClear: false, rewards: [] };
    this.settled.set(data, reward);
    if (data.winner === 'player') this.victory(data, reward);
    else this.defeat(data);
  }

  private defeat({ stageId, turns, summary }: ResultData) {
    const stage = STAGES.find(candidate => candidate.id === stageId);
    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x241222, 0.58);
    const board = this.panel(217, 74, 846, 582, 0x181722, 0.98);
    board.lineStyle(2, 0xc48b55, 0.86).strokeRoundedRect(217, 74, 846, 582, 14);

    const glow = this.add.image(640, 157, formationKey('vfx.selection_ring_gold'))
      .setDisplaySize(650, 100).setTint(0xcf4a37).setAlpha(0.33);
    this.tweens.add({ targets: glow, alpha: 0.13, duration: 1250, yoyo: true, repeat: -1 });
    const emblem = this.add.rectangle(640, 87, 56, 56, 0x35313a).setAngle(45).setStrokeStyle(2, 0xe7b977);
    const mark = this.text(640, 85, '敗', 31, '#ffe9bd', { fontFamily: 'Georgia, serif' }).setOrigin(0.5);
    const heading = this.text(640, 159, 'THẤT BẠI', 62, '#ffd28e', {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', stroke: '#712d28', strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [emblem, mark, heading], alpha: { from: 0, to: 1 }, duration: 390, ease: 'Cubic.Out' });

    const info = [stage && `Chương ${stage.chapter}`, `Ải ${stageId}`, stage?.name,
      turns !== undefined && `${turns} lượt`].filter(Boolean).join('  ·  ');
    this.text(640, 218, info, 20, '#f3dcc0').setOrigin(0.5);
    this.text(640, 250, 'Đội hình chưa đủ mạnh để vượt ải này', 19, '#e9c6a8',
      { fontFamily: 'Georgia, serif', fontStyle: 'italic' }).setOrigin(0.5);

    this.panel(250, 277, 780, 115, 0x2b202b);
    this.defeatHeading(296, 'TỔNG KẾT');
    const metrics = [
      ['Tướng sống sót', summary ? `${summary.survivors}/${summary.deployed}` : '—'],
      ['Sát thương lên địch', summary ? summary.damage.toLocaleString('vi-VN') : '—'],
      ['Phần thưởng', 'Không có'],
    ];
    metrics.forEach(([label, value], index) => {
      const x = 389 + index * 251;
      this.panel(x - 118, 317, 236, 61, 0x493039);
      this.text(x, 332, label, 16, '#ebccae').setOrigin(0.5);
      this.text(x, 356, value, 20, '#ffe3aa', { fontStyle: 'bold' }).setOrigin(0.5);
    });

    this.panel(250, 405, 780, 149, 0x2b202b);
    this.defeatHeading(426, 'GỢI Ý TĂNG LỰC');
    const tips = [
      { label: 'Nâng tướng', texture: `gear-${EQUIPMENT.helmet.art}`, scene: 'Heroes' },
      { label: 'Trang bị', texture: `gear-${EQUIPMENT.armor.art}`, scene: 'Equipment' },
      { label: 'Đổi đội hình', texture: formationKey('slots.formation_front_01'), scene: 'Formation' },
    ];
    tips.forEach(({ label, texture, scene }, index) => {
      const x = 389 + index * 251;
      this.add.rectangle(x, 481, 46, 46, 0x543235, 0.74).setAngle(45).setStrokeStyle(1, 0xc79157);
      const icon = this.add.image(x, 481, texture).setDisplaySize(64, 64);
      this.text(x, 529, label, 17, '#ffdb9f', { fontStyle: 'bold' }).setOrigin(0.5);
      this.add.zone(x, 490, 216, 105).setInteractive({ useHandCursor: true })
        .on('pointerover', () => icon.setTint(0xffd79c)).on('pointerout', () => icon.clearTint())
        .on('pointerup', () => this.go(scene));
    });

    this.button(389, 605, 226, 56, 'Về Sảnh', () => this.go('Lobby'), 0x3b404d, true, true);
    this.button(640, 605, 226, 56, 'Bày Trận Lại', () => this.go('Formation'), 0x72502f, true, true);
    const retry = this.victoryButton('buttons.small_red_alt', 891, 'Thử Lại', () => this.go('Battle', { stageId }), 0, 605);
    this.tutorialTarget('result.retry', retry);
    this.cameras.main.fadeIn(280, 26, 15, 22);
  }

  private defeatHeading(y: number, label: string) {
    const line = this.add.graphics().lineStyle(1, 0xc89863, 0.72);
    line.lineBetween(376, y, 492, y).lineBetween(788, y, 904, y);
    for (const x of [492, 788]) this.add.rectangle(x, y, 7, 7, 0xc89863).setAngle(45);
    this.text(640, y, label, 20, '#ffc980', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
  }

  private victory({ stageId, turns }: ResultData, reward: ReturnType<typeof gameStore.completeStage>) {
    const stage = STAGES.find(candidate => candidate.id === stageId);
    const following = nextStage(stageId);
    const next = following && gameStore.isUnlocked(following.id) ? following.id : stageId;
    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x23131c, 0.33);
    this.add.image(640, 402, heroUiKey('roster')).setDisplaySize(980, 558);
    const light = this.add.image(640, 165, formationKey('vfx.selection_ring_gold')).setDisplaySize(624, 115).setAlpha(0.6);
    this.tweens.add({ targets: light, alpha: 0.23, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    const ribbon = this.add.image(640, 119, formationKey('frames.title_dragon_red')).setDisplaySize(780, 140);
    const title = this.text(664, 119, 'CHIẾN THẮNG', 57, '#ffea9c', {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', stroke: '#65250f', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [ribbon, title], alpha: { from: 0, to: 1 }, y: { from: 98, to: 119 },
      duration: 450, ease: 'Cubic.Out' });

    const summary = [stage && `Chương ${stage.chapter}`, `Ải ${stageId}`, stage?.name,
      turns !== undefined && `${turns} lượt`].filter(Boolean).join('  ·  ');
    this.add.rectangle(640, 232, 650, 44, 0x35171c, 0.98).setStrokeStyle(2, 0xe8ae67);
    this.text(640, 232, summary, 22, '#fff1c8', { fontStyle: 'bold' }).setOrigin(0.5);
    this.panel(218, 291, 844, 249, 0x2e1419, 0.94);
    this.tutorialTarget('result.rewards', this.add.zone(640, 415, 844, 249));
    this.add.image(640, 294, heroUiKey('ribbon')).setDisplaySize(385, 53);
    const heading = reward.firstClear ? 'THƯỞNG VƯỢT ẢI LẦN ĐẦU' : 'THƯỞNG ĐÁNH LẠI';
    this.text(640, 294, heading, 21, '#ffdda0', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    if (!reward.rewards.length) {
      const message = gameStore.isCleared(stageId)
        ? 'Trận này không có phần thưởng. Thưởng lần đầu đã nhận.'
        : 'Chưa ghi nhận phần thưởng cho trận này.';
      this.text(640, 419, message, 22, '#ffe2bd').setOrigin(0.5);
    }
    reward.rewards.forEach((item, index) => {
      const spacing = Math.min(192, 812 / reward.rewards.length);
      this.rewardCard(640 + (index - (reward.rewards.length - 1) / 2) * spacing, spacing, stageId, item, index);
    });

    this.victoryButton('buttons.go_back_gold', 348, 'Về Sảnh', () => this.go('Lobby'), 17);
    this.victoryButton('buttons.small_red_alt', 640, 'Chọn Ải', () => this.go('Campaign', {
      stageId: next, unlockedId: reward.firstClear ? following?.id : undefined,
    }));
    this.victoryButton('buttons.enter_battle_gold', 932, next === stageId ? 'Đánh Lại' : `Đánh Tiếp · ${next}`,
      () => this.go('Battle', { stageId: next }), 25);
    this.cameras.main.fadeIn(280, 26, 15, 22);
  }

  private rewardCard(x: number, spacing: number, stageId: string, receipt: string, index: number) {
    const gearId = STAGE_GEAR[stageId];
    const gear = gearId && EQUIPMENT[gearId].name === receipt ? EQUIPMENT[gearId] : undefined;
    const milestone = HERO_BY_ID[HERO_MILESTONES[stageId]];
    const hero = milestone && receipt === `Mở tướng ${milestone.name}` ? milestone : undefined;
    const amount = receipt.match(/^(\d+) (vàng|EXP luyện tướng|chìa vàng|Mảnh Thần Binh)$/);
    const resource = amount?.[2];
    const frame = resource === 'vàng' ? 12 : resource === 'EXP luyện tướng' ? 14 : resource === 'chìa vàng' ? 5 : resource === 'Mảnh Thần Binh' ? 13 : undefined;
    const rarity: Rarity = gear?.rarity ?? hero?.rarity ?? 'R';
    const premium = rarity === 'SSR' || rarity === 'SSS+';
    const glow = premium ? this.add.image(x, 459, formationKey('vfx.selection_ring_gold')).setDisplaySize(128, 40) : undefined;
    const portrait = hero ? this.add.image(x, 403, PORTRAITS, atlasOrder.indexOf(hero.id)).setDisplaySize(82, 82) : undefined;
    const border = this.add.image(x, 403, heroUiKey(HERO_UI_RANK[rarity])).setDisplaySize(110, 110);
    const icon = gear ? this.add.image(x, 403, `gear-${gear.art}`).setDisplaySize(76, 76)
      : frame !== undefined ? this.add.image(x, 403, 'lobby-icons', frame).setDisplaySize(76, 76)
      : undefined;
    const quantity = this.text(x, 485, amount ? Number(amount[1]).toLocaleString('vi-VN') : '×1', 21, '#ffdda0',
      { fontStyle: 'bold' }).setOrigin(0.5);
    const label = this.text(x, 514, resource === 'vàng' ? 'Vàng' : resource === 'chìa vàng' ? 'Chìa vàng' : resource ?? receipt,
      15, '#fff1d3', { align: 'center', wordWrap: { width: spacing - 8 } }).setOrigin(0.5);
    const elements = [glow, portrait, border, icon, quantity, label].filter(value => value !== undefined);
    elements.forEach(element => element.setAlpha(0));
    this.tweens.add({ targets: elements, alpha: 1, y: '-=7', duration: premium ? 450 : 290,
      delay: 250 + index * 175, ease: 'Cubic.Out', onComplete: () => {
        if (glow) this.tweens.add({ targets: glow, alpha: 0.28, duration: 750, yoyo: true, repeat: -1 });
      } });
  }

  private victoryButton(asset: string, x: number, label: string, action: () => void, offset = 0, y = 601) {
    const image = this.add.image(x, y, formationKey(asset)).setDisplaySize(238, 65).setInteractive({ useHandCursor: true });
    this.text(x + offset, y, label, 20, '#ffedba', { fontStyle: 'bold', stroke: '#542017', strokeThickness: 3 }).setOrigin(0.5);
    image.on('pointerover', () => image.setTint(0xffdf97));
    image.on('pointerdown', () => image.setTint(0xd1955f));
    image.on('pointerout', () => image.clearTint());
    image.on('pointerup', () => { image.clearTint(); action(); });
    return image;
  }
}
