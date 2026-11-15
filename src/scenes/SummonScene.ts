import { inventoryQuantity, ITEM_IDS } from '../domain/resources';
import { playCommand } from '../cloud/cloudRepository';
import { FactionConfig } from '../data/factions';
import { heroFaction } from '../data/heroes';
import { HERO_BY_ID, HERO_RARITIES, LEGENDARY_PITY_LIMIT, PITY_LIMIT, SUMMON_RATES } from '../data/heroes';
import { gameStore } from '../domain/store';
import { DUPLICATE_SHARDS, type SummonReward } from '../domain/summon';
import { portrait, RARITY_COLOR } from '../ui/heroPresentation';
import { UiScene } from '../ui/UiScene';

const HALL = 'summon-hall';
const GOLD = 0xffd38b;
const INK = 0x211829;
const BUTTON = 0x754630;
const PORTAL_Y = 344;

export class SummonScene extends UiScene {
  private busy = false;

  constructor() { super('Summon'); }

  preload() {
    if (!this.textures.exists(HALL)) {
      this.load.image(HALL, `${import.meta.env.BASE_URL}assets/summon/hall.webp`);
    }
  }

  create({ draws, instant = false }: { draws?: SummonReward[]; instant?: boolean } = {}) {
    this.busy = false;
    this.add.rectangle(640, 360, 1280, 720, INK);
    if (this.textures.exists(HALL)) this.add.image(640, 360, HALL).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x110d1d, draws ? 0.79 : 0.33);
    this.add.rectangle(640, 55, 1280, 110, INK, 0.94);
    const save = gameStore.snapshot;
    this.text(36, 24, draws ? 'KẾT QUẢ CHIÊU MỘ' : 'ĐIỆN CHIÊU MỘ', 34, '#ffe0a1',
      { fontFamily: 'Georgia, serif', fontStyle: 'bold' });
    const stats = this.text(38, 73, this.balance(inventoryQuantity(save, ITEM_IDS.goldenKey), save.summonPity, save.legendaryPity), 18, '#ead6b7');
    const back = this.button(1148, 54, 180, 53, '← Về sảnh', () => {
      this.busy = true;
      this.go('Lobby');
    }, BUTTON, true, true);
    if (draws) {
      this.showResults(draws, instant);
      return;
    }

    const portal = this.drawPortal();
    const unlocked = gameStore.isSummonUnlocked();
    this.panel(36, 152, 302, 185, INK, 0.95);
    this.text(56, 174, 'TỶ LỆ CHIÊU MỘ', 22, '#ffe0a1', { fontStyle: 'bold' });
    HERO_RARITIES.forEach((rarity, index) => this.text(56 + index % 2 * 135, 215 + Math.floor(index / 2) * 26,
      `${rarity} ${SUMMON_RATES[rarity] * 100}%`, 17, `#${RARITY_COLOR[rarity].toString(16)}`));
    this.text(56, 290, `Tướng trùng đổi ${DUPLICATE_SHARDS} mảnh`, 16, '#dcc8b9');
    if (save.lastSummon) {
      this.button(186, 373, 264, 50, 'Kết quả gần nhất', () => {
        if (!this.busy) {
          this.busy = true;
          this.scene.restart({ draws: save.lastSummon, instant: true });
        }
      }, INK, true, true);
    }
    this.panel(380, 544, 520, 146, INK, 0.96);
    const status = this.text(640, 572, unlocked
      ? inventoryQuantity(save, ITEM_IDS.goldenKey) < 10 ? 'Cần 10 chìa để quay ×10' : 'Dùng Chìa Khóa Vàng để chiêu mộ'
      : 'Vượt ải 1-3 để mở Chiêu Mộ', 19, '#ffe0a1').setOrigin(0.5);
    const once = this.button(518, 638, 222, 63, 'QUAY ×1 · 1 CHÌA', () => summon(1),
      BUTTON, unlocked && inventoryQuantity(save, ITEM_IDS.goldenKey) >= 1, true);
    const ten = this.button(762, 638, 222, 63, 'QUAY ×10 · 10 CHÌA', () => summon(10),
      BUTTON, unlocked && inventoryQuantity(save, ITEM_IDS.goldenKey) >= 10, true);
    if (unlocked && inventoryQuantity(save, ITEM_IDS.goldenKey) === 0) status.setText('Chưa có Chìa Khóa Vàng');

    const summon = async (count: 1 | 10) => {
      if (this.busy) return;
      this.busy = true;
      let active = true;
      const stop = () => { active = false; };
      this.events.once('shutdown', stop);
      let outcome: ReturnType<typeof gameStore.summon>;
      try {
        outcome = await playCommand({ type: 'summon', count }, () => gameStore.summon(count));
      } catch (error) {
        if (active) {
          this.busy = false;
          status.setText(error instanceof Error ? error.message : 'Chưa thể lưu lượt quay.')
            .setWordWrapWidth(490);
        }
        return;
      } finally { this.events.off('shutdown', stop); }
      if (!active) return;
      if (!outcome.ok) {
        status.setText(outcome.reason);
        this.busy = false;
        return;
      }
      const updated = gameStore.snapshot;
      stats.setText(this.balance(inventoryQuantity(updated, ITEM_IDS.goldenKey), updated.summonPity, updated.legendaryPity));
      for (const control of [once, ten, back]) {
        control.background.disableInteractive().setVisible(false);
        control.text.setVisible(false);
      }
      status.setText('Đang mở cổng triệu hồi…');
      const rarity = outcome.draws.some(draw => draw.rarity === 'SSS+') ? 'SSS+'
        : outcome.draws.some(draw => draw.rarity === 'SSR') ? 'SSR'
        : outcome.draws.some(draw => draw.rarity === 'SR') ? 'SR' : 'R';
      const light = this.add.circle(640, PORTAL_Y, 99, RARITY_COLOR[rarity], 0.72).setScale(0.2);
      this.tweens.add({ targets: portal, scale: 1.25, duration: 970, ease: 'Sine.inOut' });
      this.tweens.add({ targets: light, scale: 2.2, alpha: 0, duration: 1050 });
      if (rarity === 'SSS+') {
        this.cameras.main.flash(520, 255, 156, 104);
        const halo = this.add.circle(640, PORTAL_Y, 112).setStrokeStyle(7, 0xffd475);
        this.tweens.add({ targets: halo, scale: 3, alpha: 0, duration: 1150, onComplete: () => halo.destroy() });
      }
      let revealed = false;
      const reveal = (instant: boolean) => {
        if (revealed) return;
        revealed = true;
        timer.remove();
        this.scene.restart({ draws: outcome.draws, instant });
      };
      const timer = this.time.delayedCall(1150, () => reveal(false));
      this.button(640, 638, 230, 60, 'Bỏ qua hiệu ứng »', () => reveal(true), BUTTON, true, true);
    };
  }

  private balance(keys: number, pity: number, legendary = 0) {
    return `Chìa Khóa Vàng  ${keys}     ·     SSR trở lên  ${pity}/${PITY_LIMIT}     ·     SSS+  ${legendary}/${LEGENDARY_PITY_LIMIT}`;
  }

  private drawPortal() {
    const core = this.add.circle(0, 0, 104, 0x592c65, 0.67).setStrokeStyle(2, 0xe5afff, 0.8);
    const runes = this.add.graphics();
    runes.lineStyle(3, GOLD, 0.9).strokeCircle(0, 0, 129);
    runes.lineStyle(1, GOLD, 0.5).strokeCircle(0, 0, 143);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      runes.fillStyle(GOLD, 0.9).fillCircle(Math.cos(angle) * 136, Math.sin(angle) * 136, 3);
      runes.lineBetween(Math.cos(angle) * 116, Math.sin(angle) * 116,
        Math.cos(angle + Math.PI / 2) * 116, Math.sin(angle + Math.PI / 2) * 116);
    }
    this.tweens.add({ targets: runes, angle: 360, duration: 15000, repeat: -1 });
    this.tweens.add({ targets: core, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });
    const portal = this.add.container(640, PORTAL_Y, [core, runes]);
    for (let i = 0; i < 18; i++) {
      const x = 492 + (i * 73) % 296;
      const y = 263 + (i * 41) % 220;
      const spark = this.add.circle(x, y, 2 + i % 3, i % 2 ? GOLD : 0xe9b3ff, 0.78);
      this.tweens.add({ targets: spark, y: y - 64, alpha: 0, duration: 700 + i * 51,
        repeat: -1, delay: i * 36 });
    }
    return portal;
  }

  private showResults(draws: SummonReward[], instant: boolean) {
    const single = draws.length === 1;
    draws.forEach((draw, index) => {
      const x = single ? 640 : 208 + (index % 5) * 216;
      const y = single ? 350 : 246 + Math.floor(index / 5) * 214;
      const hero = HERO_BY_ID[draw.heroId];
      const color = RARITY_COLOR[draw.rarity];
      const width = single ? 336 : 192;
      const height = single ? 356 : 194;
      const card = this.add.rectangle(x, y, width, height, INK, 0.97).setStrokeStyle(2, color);
      const face = portrait(this, x, y - (single ? 38 : 27), single ? 186 : 84, hero);
      const name = this.text(x, y + (single ? 74 : 29), hero.name, single ? 27 : 17).setOrigin(0.5);
      const rank = this.text(x, y + (single ? 108 : 54), `${draw.rarity} · ${FactionConfig[heroFaction(hero)].name}`,
        17, `#${color.toString(16)}`).setOrigin(0.5);
      const reward = this.text(x, y + (single ? 138 : 78),
        `${draw.guaranteed ? 'Bảo hiểm · ' : ''}${draw.shards ? `+${draw.shards} mảnh` : 'Tướng mới'}`,
        15, '#eed7b1').setOrigin(0.5);
      if (instant) return;
      const delay = index * 45 + (draw.rarity === 'SSS+' ? 250 : draw.rarity === 'SSR' ? 150 : 0);
      const elements = [card, face, name, rank, reward];
      elements.forEach(object => object.setAlpha(0));
      this.tweens.add({ targets: elements, alpha: 1, duration: 200, delay });
      if (draw.rarity === 'SSR' || draw.rarity === 'SSS+') {
        const ring = this.add.circle(x, y - (single ? 38 : 27), single ? 97 : 44, GOLD, 0)
          .setStrokeStyle(draw.rarity === 'SSS+' ? 7 : 4, draw.rarity === 'SSS+' ? color : GOLD).setAlpha(0).setDepth(2);
        this.time.delayedCall(delay, () => {
          ring.setAlpha(1);
          this.tweens.add({ targets: ring, scale: 1.65, alpha: 0, duration: 650,
            onComplete: () => ring.destroy() });
        });
      }
    });
    this.button(509, 638, 230, 58, 'Về điện chiêu mộ', () => this.scene.restart({}), BUTTON, true, true);
    this.button(771, 638, 230, 58, 'Xem Võ Tướng', () => this.go('Heroes'), 0x365b52, true, true);
  }
}
