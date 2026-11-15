import { arenaRequest, challengeArena } from '../cloud/arenaRepository';
import type { ArenaResult, ArenaView, ArenaOpponent } from '../cloud/arenaProtocol';
import { cloudRepository } from '../cloud/cloudRepository';
import { HERO_BY_ID, SLOT_COUNT } from '../data/heroes';
import { gameStore } from '../domain/store';
import { formationPower, heroLevel } from '../domain/progression';
import { walletBalance } from '../domain/resources';
import { portrait } from '../ui/heroPresentation';
import assets from '../ui/pvpTextures.json';
import aliases from '../ui/pvpAliases.json';
import { UiScene } from '../ui/UiScene';

type Page = 'arena' | 'rank' | 'rewards' | 'history' | 'shop' | 'prepare' | 'result';
const tabs = [
  ['arena', 'Đấu Trường', 'crossed_swords'], ['rank', 'Xếp Hạng', 'trophy'],
  ['rewards', 'Thưởng Hạng', 'gift'], ['history', 'Lịch Sử', 'history'],
  ['shop', 'Tiệm Đấu', 'shop'],
] as const;
const titles = { arena: 'ĐẤU TRƯỜNG', rank: 'XẾP HẠNG', rewards: 'THƯỞNG HẠNG',
  history: 'LỊCH SỬ', shop: 'TIỆM ĐẤU', prepare: 'CHUẨN BỊ CHIẾN ĐẤU', result: 'KẾT QUẢ LUYỆN TẬP' };
const tiers = [['chi_ton', 'Chí Tôn'], ['kim_cuong', 'Kim Cương'], ['bach_kim', 'Bạch Kim'],
  ['vang', 'Vàng'], ['bach_ngan', 'Bạch Ngân'], ['dong', 'Đồng']] as const;
const gold = '#ffe8af';
const number = (value: number) => value.toLocaleString('vi-VN');

export class ArenaScene extends UiScene {
  constructor() { super('Arena'); }

  preload() {
    for (const [key, path] of Object.entries(assets)) {
      if (!this.textures.exists(key)) this.load.image(key, import.meta.env.BASE_URL + path.slice(1));
    }
  }

  private operation = false;

  create({ page = 'arena', tier = 0, winner, ranked, opponent, view, message }: {
    page?: Page; tier?: number; winner?: 'player' | 'enemy'; ranked?: ArenaResult;
    opponent?: ArenaOpponent; view?: ArenaView; message?: string;
  } = {}) {
    this.operation = false;
    let active = true;
    this.events.once('shutdown', () => { active = false; });
    const run = async (work: () => Promise<void>) => {
      if (this.operation) return;
      this.operation = true;
      try { await work(); }
      catch (error) {
        if (active) this.toast(error instanceof Error ? error.message : 'Chưa xác nhận được yêu cầu.');
      } finally { if (active) this.operation = false; }
    };
    const fresh = async (next: Page) => {
      const updated = await arenaRequest<ArenaView>({ action: 'view' });
      if (active) this.scene.restart({ page: next, tier, view: updated });
    };
    const playRanked = async (id?: string) => {
      const result = await challengeArena(id);
      if (active && result) this.go('Battle', { rankedArena: result });
    };
    if (page === 'arena' && !view && !message && cloudRepository.active) {
      void (async () => {
        try { await fresh('arena'); }
        catch (error) { if (active) this.scene.restart({ page, message: error instanceof Error ? error.message : 'Mất kết nối.' }); }
      })();
    }
    const save = gameStore.snapshot;
    const funds = walletBalance(save);
    const power = number(formationPower(save));
    const open = (next: Page, selected = tier) => this.scene.restart({ page: next, tier: selected, view, message });
    this.art('bg_pvp_arena_courtyard_hd', 640, 360, 1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x170c1a, 0.18);
    this.art('panel_arena_nav', 124, 401, 215, 600);
    this.art('title_arena', 280, 47, 535, 67);
    this.label(290, 47, page === 'result' && ranked ? 'KẾT QUẢ XẾP HẠNG' : titles[page], 30);
    this.action('return', 57, 47, 73, '‹', () => page === 'arena' ? this.go('Lobby') : open('arena'));
    [[899, 'icon_dong_wallet', 'Đồng', funds.copper], [1095, 'reward_gold_ingot', 'Vàng', funds.gold]].forEach(
      ([x, icon, label, amount]) => {
        this.art('score_display', Number(x), 48, 174, 49);
        this.art(String(icon), Number(x) - 62, 48, 30, 29);
        this.label(Number(x) + 12, 48, `${label} ${number(Number(amount))}`, 17);
      });
    tabs.forEach(([id, label, icon], index) => {
      const y = 161 + index * 83;
      this.action(page === id ? 'tab_selected' : 'tab_default', 124, y, 193, label, () => open(id), false, 20);
      this.art(`icon_${icon}`, 56, y, 32, 32);
    });

    if (page === 'arena') {
      this.art('panel_arena_main', 758, 280, 956, 359).setAlpha(0.85);
      this.art('icon_shield', 745, 254, 110, 110);
      this.label(745, 339, view?.rank ? `Hạng ${view.rank}` : 'Chưa có hạng được xác thực', 26);
      this.art('panel_season_status', 438, 245, 258, 133);
      this.label(438, 214, save.playerName, 23);
      this.label(438, 247, `Lực chiến · ${power}`, 20);
      this.label(438, 277, `Hạng ${view?.rank ?? '—'}   Điểm ${view?.points ?? '—'}`, 19);
      this.art('panel_season_status', 1074, 245, 257, 133);
      this.label(1074, 228, 'Mùa giải', 22);
      this.label(1074, 267, view ? `Kết thúc ${new Date(view.endsAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : 'Chưa có dữ liệu', 18);
      this.action('view_rewards', 1074, 377, 228, 'Xem thưởng', () => open('rewards'));
      this.art('panel_opponents', 758, 566, 956, 217);
      this.label(758, 491, 'Danh sách đối thủ', 24);
      if (view?.opponents.length) {
        view.opponents.forEach((enemy, i) => {
          const x = 428 + i * 218;
          this.art('frame_opponent_card', x, 580, 199, 124);
          const name = this.label(x, 544, enemy.name, 19);
          if (name.width > 170) name.setScale(170 / name.width, 1);
          this.label(x, 571, `${number(enemy.power)} lực chiến · ${enemy.points}đ`, 15);
          this.action('challenge', x, 613, 150, 'Khiêu chiến', view.enrolled && view.remaining > 0
            ? () => this.scene.restart({ page: 'prepare', opponent: enemy, view }) : undefined);
        });
      } else {
        for (const x of [428, 646, 864]) this.art('frame_opponent_card', x, 580, 192, 124).setAlpha(0.4);
        this.label(646, 580, view ? 'Chưa có đối thủ phù hợp' : 'Đăng nhập để xem đối thủ online', 22);
      }
      this.action('challenge', 1100, 545, 201, 'Luyện tập', () => open('prepare'));
      this.action('refresh', 1100, 619, 201, 'Tải lại', () => void run(() => fresh('arena')));
      this.label(745, 387, view ? `Lượt hôm nay: ${view.remaining}/5` : (message ?? ''), 17);
      if (view) {
        this.action('challenge', 438, 377, 245, view.enrolled ? 'Cập nhật phòng thủ' : 'Đăng ký phòng thủ',
          () => void run(async () => {
            await arenaRequest({ action: 'publish' });
            await fresh('arena');
          }));
        this.action('refresh', 745, 432, 244, 'Khôi phục trận đã gửi', () => void run(async () => {
          const result = await challengeArena();
          if (active && result) this.go('Battle', { rankedArena: result });
          else if (active) this.toast('Không có trận đang chờ.');
        }));
      }
    } else if (page === 'rank') {
      this.art('panel_leaderboard', 758, 399, 953, 563);
      [2, 1, 3].forEach((place, index) => {
        const x = 523 + index * 235;
        this.art('frame_podium_card', x, 272, 208, 238);
        this.art(`podium_place_${place}`, x, 236, 81, 81);
        const player = view?.board[place - 1];
        const name = this.label(x, 305, player?.name ?? '—', 22);
        if (name.width > 190) name.setScale(190 / name.width, 1);
        if (player) this.label(x, 337, `${player.points} điểm`, 18);
      });
      this.art('frame_leaderboard_row', 758, 430, 851, 60);
      this.label(421, 430, 'Hạng', 20);
      this.label(744, 430, 'Người chơi', 20);
      this.label(1081, 430, 'Điểm', 20);
      if (!view?.board.length) this.label(758, 526, 'Chưa có bảng xếp hạng từ máy chủ.', 23);
      view?.board.slice(3, 7).forEach((player, index) => {
        const y = 474 + index * 34;
        this.art('frame_leaderboard_row', 758, y, 851, 30);
        this.label(421, y, String(player.rank), 18);
        const name = this.label(744, y, player.name, 18);
        if (name.width > 395) name.setScale(395 / name.width, 1);
        this.label(1081, y, String(player.points), 18);
      });
      this.label(758, 635, `${save.playerName} · Lực chiến ${power} · Hạng ${view?.rank ?? '—'}`, 22);
    } else if (page === 'rewards') {
      this.art('panel_rewards', 758, 399, 953, 563);
      tiers.forEach(([id, label], index) => {
        const y = 170 + 79 * index;
        this.action(index === tier ? 'tab_selected' : 'tab_default', 411, y, 224, label, () => open('rewards', index), false);
        this.art(`rank_${id}`, 335, y, 44, 44);
      });
      this.art('frame_reward_tier_card', 891, 361, 510, 359);
      this.art(`rank_${tiers[tier][0]}`, 891, 279, 131, 131);
      this.label(891, 373, tiers[tier][1], 28);
      this.label(891, 430, 'Thưởng mùa dựa trên điểm chốt mùa.', 21);
      const reward = view?.reward;
      this.label(891, 478, reward ? `Mùa ${reward.season} · ${number(reward.gold)} Vàng` : 'Chưa có thưởng mùa để nhận', 20);
      this.action('claim', 891, 595, 250, reward?.claimed ? 'Đã nhận' : 'Nhận thưởng mùa',
        reward && !reward.claimed ? () => void run(async () => {
          await arenaRequest({ action: 'claim', season: reward.season });
          await cloudRepository.refresh();
          await fresh('rewards');
        }) : undefined);
    } else if (page === 'prepare') {
      this.art('panel_battle_prepare', 758, 399, 953, 563);
      [526, 985].forEach((x, side) => {
        this.label(x, 182, side ? (opponent?.name ?? 'Đội mô phỏng') : 'Đội hình tấn công', 25);
        for (let slot = 0; slot < SLOT_COUNT; slot++) {
          const heroId = side && opponent ? opponent.formation[slot] : save.formation[slot];
          const sx = x + (slot % 3 - 1) * 116;
          const sy = 277 + Math.floor(slot / 3) * 127;
          this.art('frame_battle_hero', sx, sy, 105, 116);
          if (heroId && HERO_BY_ID[heroId]) {
            portrait(this, sx, sy - 9, 68, HERO_BY_ID[heroId]);
            if (!side || !opponent) this.label(sx, sy + 42, `Cấp ${heroLevel(save.heroExp[heroId])}`, 17);
          } else this.label(sx, sy, 'Ô trống', 18);
        }
      });
      if (opponent) this.label(985, 500, `${number(opponent.power)} lực chiến · ${opponent.points} điểm`, 21);
      this.label(opponent ? 526 : 758, 500, opponent ? `Lực chiến đội ta · ${power}` :
        `Lực chiến · ${power}   |   Mô phỏng với bản sao đội hình hiện tại`, 21);
      this.action('refresh', 530, 592, 264, 'Chỉnh đội hình', () => this.go('Formation', { fromArena: true }));
      this.action('enter_battle', 984, 592, 270, opponent ? 'Vào khiêu chiến' : 'Vào luyện tập', save.formation.some(Boolean) ?
        () => opponent ? void run(() => playRanked(opponent.uid)) : this.go('Battle', { arenaPractice: true }) : undefined);
    } else if (page === 'result') {
      this.art('panel_result', 758, 393, 820, 490);
      this.art(winner === 'player' ? 'banner_victory' : 'banner_defeat', 758, 272, 534, 89);
      this.label(758, 272, ranked ? (ranked.won ? 'THẮNG XẾP HẠNG' : 'THUA XẾP HẠNG') : winner === 'player' ? 'THẮNG LUYỆN TẬP' : 'THUA LUYỆN TẬP', 31);
      this.label(758, 410, ranked ? `${ranked.delta > 0 ? '+' : ''}${ranked.delta} điểm · Tổng ${ranked.points} điểm` : 'Trận mô phỏng · Điểm và phần thưởng giữ nguyên.', 22);
      this.action('return', 758, 539, 260, 'Về Đấu Trường', () => this.scene.restart({ page: 'arena' }));
    } else {
      this.art(page === 'history' ? 'panel_history' : 'panel_shop', 758, 399, 953, 563);
      if (page === 'history' && view?.history.length) {
        view.history.forEach((match, index) => {
          const y = 160 + 47 * index;
          this.art('frame_leaderboard_row', 758, y, 840, 41);
          const name = this.label(522, y, match.defender_name, 20);
          if (name.width > 320) name.setScale(320 / name.width, 1);
          this.label(840, y, match.won ? 'Thắng' : 'Thua', 20);
          this.label(1074, y, `${match.delta > 0 ? '+' : ''}${match.delta} điểm`, 20);
        });
      } else this.label(758, 385, page === 'history' ? 'Chưa có lịch sử PvP được xác thực.' : 'Tiệm Đấu chưa mở.', 26);
    }
  }

  private art(id: string, x: number, y: number, width: number, height: number) {
    const key = `pvp_${id}`;
    const canonical = (aliases as Record<string, string>)[key] ?? key;
    return this.add.image(x, y, canonical).setDisplaySize(width, height);
  }

  private label(x: number, y: number, value: string, size: number) {
    const label = this.text(x, y, value, size, gold, { fontStyle: 'bold', stroke: '#33181d', strokeThickness: 3 }).setOrigin(0.5);
    return label;
  }

  private action(id: string, x: number, y: number, width: number, label: string, action?: () => void,
    button = true, size = 20) {
    const art = this.art(action ? (button ? `btn_${id}` : id) : 'btn_disabled', x, y, width, 59);
    this.label(x + (button ? 0 : 15), y, label, size);
    if (action) art.setInteractive({ useHandCursor: true }).on('pointerup', action);
  }
}
