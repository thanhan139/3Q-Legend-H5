import { walletBalance, inventoryQuantity, ITEM_IDS, heroShardId } from '../domain/resources';
import type { GameCommand } from '../cloud/gameProtocol';
import { HERO_UI_RANK, heroUiKey } from '../ui/heroUiAssets';
import { isSignature, SignatureConfig, signatureIds, type SignatureId } from '../data/signatureConfig';
import { FORGE } from '../domain/forge';
import { EQUIPMENT, canEnhance, enhancement, enhanceCost, gearRarity, gearStats, signaturePassive } from '../domain/equipment';
import { FACTION_IDS, FactionConfig } from '../data/factions';
import { heroFaction } from '../data/heroes';
import { HERO_BY_ID, heroFamily, HEROES, HERO_RARITIES } from '../data/heroes';
import { HERO_MILESTONES, SUMMON_UNLOCK_STAGE } from '../data/campaign';
import { LOBBY_ASSETS } from '../data/lobbyAssets';
import { sampleTexture } from '../data/battleLayout';
import { ATTACK_SKILLS, describePassive, describeSkill, PASSIVE_SKILLS } from '../data/heroSkills';
import { SKILL_EFFECTS, skillTextureKey } from '../data/skillVfx';
import { HERO_PROGRESSION, heroLevel, heroStats, MAX_HERO_STARS, starCost } from '../domain/progression';
import { gameStore } from '../domain/store';
import type { HeroDefinition, SaveV2 } from '../domain/types';
import { HeroAnimationController, heroAnimationTexture } from '../ui/HeroAnimationController';
import { BATTLE_SPRITES, battleSpriteFrames } from '../ui/battleSprites';
import { portrait, RARITY_COLOR, ROLE_LABEL } from '../ui/heroPresentation';
import { UiScene } from '../ui/UiScene';

type Filter = 'faction' | 'rarity' | 'role';
interface HeroesData {
  page?: number;
  heroId?: string;
  collection?: boolean;
  filter?: Partial<Record<Filter, string>>;
  ascended?: boolean;
  signatureTab?: boolean;
  skillTab?: boolean;
  skillIndex?: number;
  signatureId?: SignatureId;
  signatureUid?: string;
}
const PAGE_SIZE = 6;
const GOLD = 0xeac07e;
const FILTERS = [
  { key: 'faction', label: 'Phe', options: FACTION_IDS },
  { key: 'rarity', label: 'Phẩm', options: HERO_RARITIES },
  { key: 'role', label: 'Vai trò', options: Object.keys(ROLE_LABEL) },
] as const;

export class HeroesScene extends UiScene {
  constructor() { super('Heroes'); }

  create({ page, heroId, collection = false, filter = {}, ascended = false, signatureTab = false, skillTab = false, skillIndex = 0, signatureId, signatureUid }: HeroesData = {}) {
    const save = gameStore.snapshot;
    const roster = HEROES.filter(hero => (collection || save.heroes.includes(hero.id)) &&
      FILTERS.every(({ key }) => !filter[key] || (key === 'faction' ? heroFaction(hero) : hero[key]) === filter[key]));
    const requested = roster.findIndex(hero => hero.id === heroId);
    const pages = Math.max(1, Math.ceil(roster.length / PAGE_SIZE));
    const current = Math.min(pages - 1, Math.max(0, page ?? Math.floor(requested / PAGE_SIZE)));
    const visible = roster.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    const selected = visible.find(hero => hero.id === heroId) ?? visible[0];
    const navigate = (change: HeroesData) => this.scene.restart({ collection, filter, ...change });

    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x1d101b, 0.73);
    this.add.rectangle(640, 36, 1280, 72, 0x321822, 0.88);
    this.add.image(124, 37, heroUiKey('ribbon')).setDisplaySize(218, 59);
    this.text(124, 36, 'VÕ TƯỚNG', 26, '#ffe4a3', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.text(251, 27, `${save.heroes.length}/${HEROES.length} tướng`, 17);
    this.ribbon(1162, 36, 160, 'Về sảnh', () => this.go('Lobby'));
    this.add.image(155, 389, heroUiKey('roster')).setDisplaySize(294, 620);
    this.ribbon(85, 125, 130, 'Sở hữu', () => navigate({ collection: false, signatureTab, skillTab }), !collection);
    this.ribbon(223, 125, 130, 'Bộ sưu tập', () => navigate({ collection: true, signatureTab, skillTab }), collection);
    FILTERS.forEach(({ key, label, options }, index) => {
      const value = filter[key];
      const choices: readonly string[] = ['', ...options];
      const display = key === 'faction' && value ? FactionConfig[value as keyof typeof FactionConfig].name :
        key === 'role' && value ? ROLE_LABEL[value as keyof typeof ROLE_LABEL] : value;
      this.ribbon(154, 176 + index * 44, 258, `${label} · ${display || 'Tất cả'}  ›`, () => {
        const next = choices[(choices.indexOf(value ?? '') + 1) % choices.length];
        navigate({ filter: { ...filter, [key]: next }, signatureTab, skillTab });
      }, Boolean(value));
    });

    visible.forEach((hero, index) => {
      const x = 86 + index % 2 * 136;
      const y = 325 + Math.floor(index / 2) * 118;
      this.drawCard(x, y, hero, save, hero.id === selected?.id, () =>
        navigate({ page: current, heroId: hero.id, signatureTab, skillTab, skillIndex }));
    });
    if (!visible.length) this.text(154, 375, 'Không có tướng phù hợp', 16).setOrigin(0.5);
    this.ribbon(70, 650, 77, '‹ Trước', () => navigate({ page: current - 1, signatureTab, skillTab }), false, current > 0);
    this.text(154, 650, `${current + 1} / ${pages}`, 17).setOrigin(0.5);
    this.ribbon(239, 650, 77, 'Sau ›', () => navigate({ page: current + 1, signatureTab, skillTab }), false, current + 1 < pages);

    if (!selected) return;
    const update = (change: HeroesData) => navigate({ page: current, heroId: selected.id, ...change });
    this.heroStage(selected, save, ascended);
    if (signatureTab) this.signatureDetail(selected, save, update, signatureId, signatureUid);
    else if (skillTab) this.skillDetail(selected, save, skillIndex, update);
    else this.detail(selected, save, update);
    this.ribbon(675, 665, 153, 'Chi tiết', () => update({}), !signatureTab && !skillTab);
    this.ribbon(838, 665, 153, 'Kỹ Năng', () => update({ skillTab: true }), skillTab);
    this.ribbon(1001, 665, 153, 'Trang Bị', () => this.go('Equipment', { heroId: selected.id }), false,
      save.heroes.includes(selected.id));
    this.ribbon(1164, 665, 153, 'Thần Binh', () => update({ signatureTab: true }), signatureTab);
  }

  private frame(x: number, y: number, width: number, height: number, ink: number, metal: number) {
    const g = this.add.graphics({ x, y });
    const w = width / 2, h = height / 2;
    const corners = [
      { x: -w + 12, y: -h }, { x: w - 12, y: -h }, { x: w, y: -h + 12 },
      { x: w, y: h - 12 }, { x: w - 12, y: h }, { x: -w + 12, y: h },
      { x: -w, y: h - 12 }, { x: -w, y: -h + 12 },
    ];
    g.fillStyle(ink, 0.96).fillPoints(corners, true);
    g.lineStyle(2, metal, 0.92).strokePoints(corners, true);
    return g;
  }

  private ribbon(x: number, y: number, width: number, label: string, action: () => void, selected = false, enabled = true) {
    const panel = this.add.image(x, y, heroUiKey('ribbon')).setDisplaySize(width, 42);
    if (!selected) panel.setTint(0xc49c92);
    if (!enabled) panel.setAlpha(0.52);
    const text = this.text(x, y, label, 16, enabled ? '#ffe9c1' : '#b7a9b8', { fontStyle: 'bold' }).setOrigin(0.5);
    if (!enabled) return;
    const zone = this.add.zone(x, y, width, 44).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => text.setColor('#ffffff'));
    zone.on('pointerout', () => text.setColor('#ffe9c1'));
    zone.on('pointerup', action);
    return zone;
  }

  private drawCard(x: number, y: number, hero: HeroDefinition, save: SaveV2, selected: boolean, action: () => void) {
    const owned = save.heroes.includes(hero.id);
    if (selected) this.add.rectangle(x, y, 121, 111, 0xffb250, 0.19).setStrokeStyle(2, 0xffd387);
    portrait(this, x, y - 11, 69, hero).setAlpha(owned ? 1 : 0.58);
    this.add.image(x, y - 11, heroUiKey(HERO_UI_RANK[hero.rarity])).setDisplaySize(82, 82);
    this.add.image(x + 37, y + 12, heroUiKey(`crest-${heroFaction(hero)}`)).setDisplaySize(26, 29);
    this.text(x, y + 32, hero.name, 13, '#fff0cf', { fontStyle: 'bold' }).setOrigin(0.5);
    this.text(x, y + 47, owned ? `Lv.${heroLevel(save.heroExp[hero.id])} · ${'★'.repeat(save.heroStars?.[hero.id] ?? 1)}` :
      'Chưa sở hữu', 12, '#ffd784').setOrigin(0.5);
    const card = this.add.zone(x, y, 121, 112).setInteractive({ useHandCursor: true }).on('pointerup', action);
    this.tutorialTarget(`hero.card.${hero.id}`, card);
  }

  private heroStage(hero: HeroDefinition, save: SaveV2, ascended: boolean) {
    const tint = RARITY_COLOR[hero.rarity];
    this.add.image(451, 383, heroUiKey('stage')).setDisplaySize(310, 613);
    this.text(451, 150, hero.name, 23, '#fff0cb',
      { fontFamily: 'Georgia, serif', fontStyle: 'bold', stroke: '#351120', strokeThickness: 3 }).setOrigin(0.5);
    this.add.image(369, 195, heroUiKey(`crest-${heroFaction(hero)}`)).setDisplaySize(46, 51);
    this.text(405, 181, `${hero.rarity}  ·  ${ROLE_LABEL[hero.role]}`, 17, `#${tint.toString(16)}`, { fontStyle: 'bold' });
    const stars = this.text(407, 205, '★'.repeat(save.heroStars?.[hero.id] ?? 1), 19, '#ffda82');
    this.add.ellipse(451, 553, 174, 29, 0x200d19, 0.68).setStrokeStyle(2, tint, 0.5);
    const atlas = heroAnimationTexture(hero.id);
    const animated = this.textures.exists(atlas);
    const pose = sampleTexture(hero.id);
    const hasPose = this.textures.exists(pose);
    const sprite = this.add.sprite(451, 554, animated ? atlas : hasPose ? pose : BATTLE_SPRITES,
      animated ? 0 : hasPose ? undefined : battleSpriteFrames.get(hero.id)).setOrigin(0.5, 1);
    const scale = Math.min(315 / sprite.width, 348 / sprite.height);
    sprite.setScale(scale).setAlpha(save.heroes.includes(hero.id) ? 1 : 0.7);
    if (animated) new HeroAnimationController(sprite, hero.id);
    else this.tweens.add({ targets: sprite, scaleY: scale * 1.014, yoyo: true, repeat: -1, duration: 980 });
    this.text(451, 599, `${FactionConfig[heroFaction(hero)].name}  ·  Lv.${heroLevel(save.heroExp[hero.id])}`, 17,
      '#ffe3a9').setOrigin(0.5);
    if (ascended) this.tweens.add({ targets: stars, scale: 1.25, duration: 240, yoyo: true });
  }

  private skillDetail(hero: HeroDefinition, save: SaveV2, index: number, navigate: (change: HeroesData) => void) {
    const normal = ATTACK_SKILLS.get(hero.normalAttackId)!;
    const ultimate = ATTACK_SKILLS.get(hero.ultimateSkillId)!;
    const passive = PASSIVE_SKILLS.get(hero.passiveSkillId)!;
    const effect = SKILL_EFFECTS[hero.ultimateSkillId];
    const cards = [
      { label: 'Đánh thường', name: normal.name, text: describeSkill(normal, false), icon: heroUiKey(`${hero.id}-normal`) },
      { label: 'Tuyệt kỹ nộ', name: ultimate.name, text: describeSkill(ultimate, true), icon: effect.icon ? skillTextureKey(effect.icon) : heroUiKey(`${hero.id}-ultimate`) },
      { label: 'Nội tại', name: passive.name, text: describePassive(passive), icon: heroUiKey(`${hero.id}-passive`) },
    ];
    const card = cards[index] ?? cards[0];
    this.add.image(943, 364, heroUiKey('roster')).setDisplaySize(640, 566);
    this.text(943, 133, 'KỸ NĂNG', 21, '#ffe1a9', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    cards.forEach((entry, i) => {
      const x = 743 + i * 200;
      this.frame(x, 208, 185, 98, index === i ? 0x702e21 : 0x351c29, index === i ? 0xffd280 : GOLD);
      this.add.image(x, 194, entry.icon).setDisplaySize(54, 54);
      this.text(x, 240, entry.label, 16, '#ffe5b7').setOrigin(0.5);
      this.add.zone(x, 208, 185, 98).setInteractive({ useHandCursor: true })
        .on('pointerup', () => navigate({ skillTab: true, skillIndex: i }));
    });
    this.add.image(943, 425, heroUiKey('paper')).setDisplaySize(609, 319);
    this.text(943, 295, card.label, 15, '#ffe6b0').setOrigin(0.5);
    this.add.image(697, 358, card.icon).setDisplaySize(48, 48);
    this.text(731, 339, card.name, 22, '#522820', { fontStyle: 'bold' });
    this.text(731, 366, 'Cấp kỹ năng cố định', 14, '#774937');
    this.text(681, 405, card.text, 17, '#522a22', { wordWrap: { width: 524 }, lineSpacing: 5 });
    const bonus = signaturePassive(save.equipment, hero.id);
    const signature = Object.values(SignatureConfig).find(entry => entry.hero === heroFamily(hero.id));
    const status = bonus ? `Thần Binh đang kích hoạt · +${Math.round(bonus * 100)}% sát thương tuyệt kỹ trước DEF.` :
      signature ? `Thần Binh chưa kích hoạt · ${signature.name}.` : 'Tướng này chưa có Thần Binh chuyên thuộc.';
    this.text(665, 586, index === 1 ? status : 'Thần Binh áp dụng cho tuyệt kỹ.', 15, '#ffdb9b', {
      wordWrap: { width: 565 },
    });
  }

  private signatureDetail(hero: HeroDefinition, save: SaveV2, navigate: (change: HeroesData) => void,
    requested?: SignatureId, uid?: string) {
    const gear = save.equipment ?? [];
    const equipped = gear.find(item => item.heroId === hero.id && isSignature(item.itemId));
    const exclusive = signatureIds.find(id => SignatureConfig[id].hero === heroFamily(hero.id));
    const id = requested ?? exclusive ?? (equipped && isSignature(equipped.itemId) ? equipped.itemId : signatureIds[0]);
    const config = SignatureConfig[id];
    const items = gear.filter(item => item.itemId === id);
    const item = items.find(entry => entry.uid === uid) ?? items.find(entry => entry.uid === equipped?.uid) ??
      items.find(entry => !entry.heroId) ?? items[0];
    const owned = save.heroes.includes(hero.id);
    const matching = heroFamily(hero.id) === config.hero;
    const active = item?.heroId === hero.id && matching;
    const wallet = save.forge!;
    const update = (change: HeroesData = {}) => navigate({ signatureTab: true, signatureId: id, signatureUid: item?.uid, ...change });
    const run = (command: GameCommand, offline: () => boolean) => this.saveAction(command, offline, ok => {
      if (ok) update();
      else this.toast('Chưa thể lưu thao tác Thần Binh.');
    });

    this.frame(940, 374, 648, 550, 0x281723, GOLD);
    this.text(940, 122, config.name, 29, '#ffdc99', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.text(940, 161, `Chuyên thuộc ${HERO_BY_ID[config.hero].name} · ${item ? 'Đã sở hữu' : 'Đang khóa'}`,
      18, '#e4ba8c').setOrigin(0.5);
    const halo = this.add.circle(778, 316, 89, config.color, 0.09).setStrokeStyle(2, config.color, 0.65);
    const icon = this.add.image(778, 310, `gear-${EQUIPMENT[id].art}`).setDisplaySize(230, 230).setAlpha(item ? 1 : 0.65);
    this.tweens.add({ targets: icon, y: 299, yoyo: true, duration: 1050, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: halo, scale: 1.14, alpha: 0.45, yoyo: true, duration: 980, repeat: -1 });
    this.frame(1091, 306, 304, 242, 0x523021, GOLD);
    const stats = gearStats(item ?? { uid: '', itemId: id, level: 1 });
    const cap = gearRarity(item ?? { uid: '', itemId: id, level: 1 }).cap;
    this.text(958, 200, `Cường hóa +${item ? enhancement(item) : 0}/+${cap}
HP +${stats.hp}  ·  ATK +${stats.atk}  ·  DEF +${stats.def}`,
      17, '#ffedc5', { lineSpacing: 12 });
    this.text(958, 275, 'NỘI TẠI CHUYÊN THUỘC', 17, '#ffca75', { fontStyle: 'bold' });
    this.text(958, 309, `Đúng chủ: +${Math.round(config.bonus * 100)}% sát thương tuyệt kỹ trước DEF.`,
      17, '#f8dec1', { wordWrap: { width: 270 }, lineSpacing: 4 });
    this.text(958, 378, active ? 'Đã kích hoạt' : matching ? 'Kích hoạt khi trang bị' : 'Tướng này chỉ nhận chỉ số cơ bản',
      15, active ? '#aaffbd' : '#f2bd91');
    this.text(655, 437, `Ô Thần Binh của ${hero.name}: ${equipped ? EQUIPMENT[equipped.itemId].name : 'Trống'}`,
      16, '#ffdf9c');
    const source = item ? `Lò Rèn · ${FORGE.shardsRequired} mảnh · ${item.heroId ? 'Đang dùng: ' + HERO_BY_ID[item.heroId].name : 'Trong kho'}`
      : `Lò Rèn · ${wallet.shards}/${FORGE.shardsRequired} Mảnh Thần Binh · Boss 2-5 và 3-5`;
    this.text(655, 466, source, 16, '#edc9a0');

    if (!item) this.ribbon(939, 520, 287, `Rèn · ${FORGE.shardsRequired} mảnh`,
      () => run({ type: 'forge', itemId: id, expectedCrafted: wallet.crafted }, () => gameStore.forgeWeapon(id, wallet.crafted)), true, wallet.shards >= FORGE.shardsRequired);
    else {
      this.ribbon(771, 520, 238, item.heroId ? 'Tháo khỏi tướng' : equipped ? 'Thay Thần Binh' : 'Trang bị Thần Binh',
        () => item.heroId
          ? run({ type: 'unequip', uid: item.uid }, () => gameStore.unequipGear(item.uid))
          : run({ type: 'equip', uid: item.uid, heroId: hero.id }, () => gameStore.equipGear(item.uid, hero.id)),
        true, Boolean(item.heroId) || owned);
      this.ribbon(1104, 520, 267, canEnhance(item) ? `Nâng cấp · ${enhanceCost(item)} Vàng` : 'Đã đạt cấp tối đa',
        () => run({ type: 'enhance', uid: item.uid, useStone: false }, () => gameStore.enhanceGear(item.uid)), true, canEnhance(item) && walletBalance(save).gold >= enhanceCost(item));
      if (items.length > 1) this.ribbon(775, 402, 186, `Bản ${items.indexOf(item) + 1}/${items.length} ›`,
        () => update({ signatureUid: items[(items.indexOf(item) + 1) % items.length].uid }));
    }
    signatureIds.forEach((weapon, index) => {
      const x = 673 + index * 103;
      const entry = SignatureConfig[weapon];
      this.frame(x, 592, 90, 64, 0x461e20, weapon === id ? GOLD : entry.color);
      this.add.image(x, 583, `gear-${EQUIPMENT[weapon].art}`).setDisplaySize(48, 48);
      this.text(x, 612, HERO_BY_ID[entry.hero].name, 12, '#ffdd9e').setOrigin(0.5);
      this.add.zone(x, 592, 90, 64).setInteractive({ useHandCursor: true })
        .on('pointerup', () => update({ signatureId: weapon, signatureUid: undefined }));
    });
  }

  private detail(hero: HeroDefinition, save: SaveV2, navigate: (change: HeroesData) => void) {
    const owned = save.heroes.includes(hero.id);
    const stars = save.heroStars?.[hero.id] ?? 1;
    const shards = inventoryQuantity(save, heroShardId(hero.id));
    const exp = save.heroExp[hero.id] ?? 0;
    const stats = heroStats(hero, exp, stars, save.equipment);
    const cost = HERO_PROGRESSION.expPerLevel - exp % HERO_PROGRESSION.expPerLevel;
    this.add.image(943, 360, heroUiKey('roster')).setDisplaySize(640, 558);
    this.text(943, 133, 'THÔNG TIN', 21, '#ffe1a9', { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.image(943, 316, heroUiKey('paper')).setDisplaySize(600, 314);
    this.text(943, 190, 'Thuộc tính', 18, '#ffe1a9').setOrigin(0.5);
    const attributes = [['Sinh lực', stats.hp], ['Tấn công', stats.atk], ['Phòng thủ', stats.def], ['Tốc độ', stats.speed]] as const;
    attributes.forEach(([label, value], i) => {
      const y = 232 + i * 52;
      this.text(689, y, label, 21, '#694031');
      this.text(1182, y, value.toLocaleString('vi-VN'), 21, '#512920', { fontStyle: 'bold' }).setOrigin(1, 0);
      this.add.graphics().lineStyle(1, 0xa67844, 0.35).lineBetween(689, y + 32, 1182, y + 32);
    });
    this.text(665, 486, `Mảnh tướng  ${shards}${stars < MAX_HERO_STARS ? ' / ' + starCost(stars) : ''}`, 17);
    this.ribbon(1111, 498, 181, stars === MAX_HERO_STARS ? 'Đã đủ 5 sao' : 'Nâng sao', () => {
      void this.saveAction({ type: 'star', heroId: hero.id }, () => gameStore.upgradeHeroStar(hero.id), ok => {
        if (ok) navigate({ ascended: true });
        else this.toast('Chưa thể nâng sao. Kiểm tra mảnh tướng hoặc bộ nhớ lưu.');
      });
    }, true, owned && stars < MAX_HERO_STARS && shards >= starCost(stars));
    if (owned) {
      this.text(665, 525, `EXP Tướng  ${inventoryQuantity(save, ITEM_IDS.heroExp)}`, 17);
      const upgradeTarget = this.ribbon(776, 567, 235, stats.level >= HERO_PROGRESSION.maxLevel ? 'Cấp tối đa' : `Tăng cấp · ${cost} EXP`, () => {
        void this.saveAction({ type: 'upgrade', heroId: hero.id }, () => gameStore.upgradeHero(hero.id), ok => {
          if (ok) navigate({});
        });
      }, true, stats.level < HERO_PROGRESSION.maxLevel && inventoryQuantity(save, ITEM_IDS.heroExp) >= cost);
      this.tutorialTarget('hero.upgrade', upgradeTarget);
      this.ribbon(1091, 567, 219, 'Xếp đội hình', () => this.go('Formation', { selectedHero: hero.id }));
    } else {
      const milestone = Object.entries(HERO_MILESTONES).find(([, id]) => id === hero.id)?.[0];
      this.text(943, 568, milestone ? `Vượt ải ${milestone} hoặc chiêu mộ` : `Chiêu mộ sau ải ${SUMMON_UNLOCK_STAGE}`,
        18).setOrigin(0.5);
    }
  }
}
