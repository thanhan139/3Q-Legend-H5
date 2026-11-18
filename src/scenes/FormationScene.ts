import { FactionConfig, type FactionId } from '../data/factions';
import { factionSynergy } from '../domain/factionSynergy';
import { formationPower, heroLevel } from '../domain/progression';
import { sampleTexture } from '../data/battleLayout';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { HERO_BY_ID, SLOT_COUNT, heroFaction, heroFamily } from '../data/heroes';
import { gameStore } from '../domain/store';
import { PORTRAITS, atlasOrder, ROLE_LABEL } from '../ui/heroPresentation';
import { HeroAnimationController, heroAnimationTexture } from '../ui/HeroAnimationController';
import { formationKey, formationSlots } from '../ui/formationAssets';
import { UiScene } from '../ui/UiScene';

interface FormationData { fromArena?: boolean; slot?: number; page?: number; notice?: string; selectedHero?: string }
const PAGE_SIZE = 6;
const FLOOR_POSITIONS = [
  { x: 151, y: 518, size: 184 }, { x: 372, y: 518, size: 184 }, { x: 593, y: 518, size: 184 },
  { x: 191, y: 307, size: 157 }, { x: 391, y: 307, size: 157 }, { x: 591, y: 307, size: 157 },
];
const RANK_FRAME = { R: 'r', SR: 'sr', SSR: 'ssr', 'SSS+': 'sss' };
const factionArt = (id: FactionId) => id === 'warlords' ? 'qun' : id;

export class FormationScene extends UiScene {
  constructor() { super('Formation'); }

  create({ slot = 0, page, notice, selectedHero, fromArena = false }: FormationData = {}) {
    const save = gameStore.snapshot;
    const pageCount = Math.max(1, Math.ceil(save.heroes.length / PAGE_SIZE));
    const rosterPage = Math.min(pageCount - 1, Math.max(0, page ?? Math.floor(save.heroes.indexOf(selectedHero ?? '') / PAGE_SIZE)));
    const synergy = factionSynergy(save.formation);
    const saveSlot = (heroId: string | null) => this.saveAction({ type: 'formation', slot, heroId },
      () => gameStore.updateFormation(slot, heroId), ok => {
        if (ok) this.scene.restart({ fromArena, slot, page: rosterPage, notice: 'Đã lưu đội hình' });
      });
    const deployed = save.formation.filter(Boolean).length;
    const current = save.formation[slot];
    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x241522, 0.49);
    this.add.rectangle(640, 40, 1280, 80, 0x251721, 0.86);
    this.add.rectangle(640, 645, 1280, 150, 0x251721, 0.93);
    this.art('frames.title_dragon_red', 158, 38, 278, 54);
    this.text(164, 36, 'BÀY TRẬN', 28, '#ffecb3', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.text(321, 28, `${deployed}/${SLOT_COUNT} tướng`, 19, '#ffdf99');
    this.text(1005, 39, `Lực chiến  ${formationPower(save, synergy).toLocaleString('vi-VN')}`, 22, '#ffdf99').setOrigin(1, 0.5);
    if(fromArena)this.control('buttons.go_back_gold',1147,39,186,55,'Về Đấu Trường',()=>this.go('Arena',{page:'prepare'}),true,18);
    else this.backToLobby(1147,39,192,54);

    for (const [y, label] of [[139, 'TUYẾN SAU'], [346, 'TUYẾN TRƯỚC']] as const) {
      this.art('frames.section_title_teal', 74, y, 129, 30);
      this.text(74, y, label, 13, '#ffe2a9', { fontStyle: 'bold' }).setOrigin(0.5);
    }
    for (const index of [3, 4, 5, 0, 1, 2]) {
      const { x, y, size } = FLOOR_POSITIONS[index];
      const id = save.formation[index];
      const hero = id ? HERO_BY_ID[id] : undefined;
      const selected = index === slot;
      this.art(formationSlots[index], x, y - 55, 154, 134).setAlpha(selected ? 1 : 0.78);
      if (selected) {
        const ring = this.art('vfx.selection_ring_gold', x, y - 4, 132, 43);
        this.tweens.add({ targets: ring, alpha: 0.42, duration: 820, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
      }
      if (hero) {
        const atlas = heroAnimationTexture(hero.id);
        const sample = sampleTexture(hero.id);
        const animated = this.textures.exists(atlas);
        const hasSample = this.textures.exists(sample);
        const sprite = this.add.sprite(x, y + 2, animated ? atlas : hasSample ? sample : BATTLE_SPRITES,
          animated ? 0 : hasSample ? undefined : battleSpriteFrames.get(hero.id)).setOrigin(0.5, 1);
        sprite.setScale(Math.min(size / sprite.width, size / sprite.height));
        if (animated) new HeroAnimationController(sprite, hero.id);
        else this.tweens.add({ targets: sprite, scaleY: sprite.scaleY * 1.015,
          duration: 920 + index * 71, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
      } else this.art('icons.add_diamond', x, y - 49, 35, 35);
      this.text(x, y + 24, `${index + 1} · ${hero?.name ?? 'Ô trống'}`, 17, selected ? '#ffdf97' : '#fff2d7', {
        fontStyle: 'bold', stroke: '#211822', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(1);
      const slotTarget = this.add.zone(x, y - 59, 162, 145).setInteractive({ useHandCursor: true });
      this.tutorialTarget(`formation.slot.${index}`, slotTarget);
      slotTarget.on('pointerup', () => this.scene.restart({ fromArena, slot: index, page: rosterPage }));
    }

    this.art('panels.roster_panel_six_cells', 992, 328, 440, 503);
    this.text(992, 117, `VÕ TƯỚNG · Ô ${slot + 1}`, 21, '#ffe3ac',
      { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    save.heroes.slice(rosterPage * PAGE_SIZE, (rosterPage + 1) * PAGE_SIZE).forEach((id, index) => {
      const hero = HERO_BY_ID[id];
      const x = 902 + index % 2 * 177;
      const y = 218 + Math.floor(index / 2) * 105;
      const existing = save.formation.findIndex(other => other && heroFamily(other) === heroFamily(id));
      const status = existing === slot ? 'Đang ở ô này' : existing >= 0 ? `Chuyển từ ô ${existing + 1}`
        : current ? 'Thay tướng' : 'Thêm vào ô';
      const art = this.add.image(x - 47, y, PORTRAITS, atlasOrder.indexOf(id)).setDisplaySize(49, 62);
      this.art(`rarity.hero_frame_${RANK_FRAME[hero.rarity]}`, x - 47, y, 58, 74);
      this.art(`factions.crest_${factionArt(heroFaction(hero))}`, x - 27, y + 27, 22, 25);
      this.text(x - 11, y - 28, hero.name, 13, '#ffe9c5', { fontStyle: 'bold' });
      this.text(x - 11, y - 7, `${hero.rarity} · Lv.${heroLevel(save.heroExp[id])}`, 13, '#ffe2a4');
      this.text(x - 11, y + 10, ROLE_LABEL[hero.role], 12, '#dcc49e');
      this.text(x - 11, y + 26, status, 12, existing === slot ? '#a9efb9' : '#edddc5');
      const heroTarget = this.add.zone(x, y, 166, 87).setInteractive({ useHandCursor: true })
        .on('pointerover', () => art.setTint(0xffdfab)).on('pointerout', () => art.clearTint());
      this.tutorialTarget(`formation.hero.${id}`, heroTarget);
      heroTarget.on('pointerup', () => saveSlot(id));
    });
    this.pageControl(868, () => this.scene.restart({ fromArena, slot, page: rosterPage - 1 }), rosterPage > 0);
    this.add.rectangle(992, 524, 131, 28, 0x2f160f);
    this.text(992, 524, `Trang ${rosterPage + 1}/${pageCount}`, 16).setOrigin(0.5);
    this.pageControl(1118, () => this.scene.restart({ fromArena, slot, page: rosterPage + 1 }), rosterPage + 1 < pageCount);

    this.text(30, 585, 'CỘNG HƯỞNG PHE', 16, '#ffdc90', { fontStyle: 'bold' });
    synergy.forEach(({ id, count, bonus, next }, index) => {
      const faction = FactionConfig[id];
      const x = 111 + index * 175;
      this.art(`factions.synergy_${factionArt(id)}`, x, 634, 169, 62);
      this.text(x + 18, 626, `${faction.name} · ${count}/6`, 14, '#fff0ce', { fontStyle: 'bold' }).setOrigin(0.5);
      this.text(x + 18, 645, `${faction.label} +${bonus}% · ${next ? `${next}: +${faction.bonuses[next]}%` : 'Tối đa'}`, 12,
        '#fff0ce').setOrigin(0.5);
    });
    this.text(29, 686, notice ?? 'Chọn một ô trên sân rồi chạm tướng bên phải.', 16, '#e8cfac');
    this.control('buttons.small_red_alt', 825, 645, 183, 58, `Gỡ tướng ô ${slot + 1}`, () => saveSlot(null), Boolean(current));
    this.control('buttons.enter_battle_gold', 1102, 645, 244, 76, fromArena ? 'BỐ TRẬN PVP' : 'CHINH CHIẾN', () => fromArena ? this.go('Arena', { page: 'prepare' }) : this.go('Campaign'), true, 30);
  }

  private pageControl(x: number, action: () => void, enabled: boolean) {
    const shade = this.add.rectangle(x, 523, 62, 44, 0x211321, enabled ? 0 : 0.58);
    if (enabled) shade.setInteractive({ useHandCursor: true })
      .on('pointerover', () => shade.setFillStyle(0xffcb73, 0.2))
      .on('pointerout', () => shade.setFillStyle(0x211321, 0))
      .on('pointerdown', () => shade.setFillStyle(0x211321, 0.4))
      .on('pointerup', action);
  }

  private art(id: string, x: number, y: number, width: number, height: number) {
    return this.add.image(x, y, formationKey(id)).setDisplaySize(width, height);
  }

  private control(id: string, x: number, y: number, width: number, height: number, label: string,
    action: () => void, enabled: boolean, textOffset = 0) {
    const image = this.art(id, x, y, width, height).setAlpha(enabled ? 1 : 0.46);
    this.text(x + textOffset, y, label, 16, '#ffe8b2', { fontStyle: 'bold', stroke: '#632f22', strokeThickness: 3 }).setOrigin(0.5);
    if (!enabled) return;
    this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true })
      .on('pointerover', () => image.setTint(0xffe3a0))
      .on('pointerout', () => image.clearTint())
      .on('pointerdown', () => image.setTint(0xc48c63))
      .on('pointerup', () => { image.clearTint(); action(); });
  }
}
