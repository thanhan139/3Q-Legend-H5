import { cloudRepository } from '../cloud/cloudRepository';
import { tutorialActive } from '../domain/tutorial';
import { walletBalance } from '../domain/resources';
import Phaser from 'phaser';
import { FORGE, weeklyWins } from '../domain/forge';
import { EQUIPMENT, STAGE_GEAR } from '../domain/equipment';
import { HERO_MILESTONES, STAGES, stageOpponents } from '../data/campaign';
import { makeStageBattle } from '../domain/battle';
import { combatPower } from '../domain/progression';
import { atlasOrder, PORTRAITS } from '../ui/heroPresentation';
import { HERO_BY_ID } from '../data/heroes';
import { gameStore } from '../domain/store';
import type { CampaignStage } from '../domain/types';
import {
  campaignArt, campaignIcons, campaignKey, campaignLayout, campaignProps,
  campaignTrim, CHAPTER_MAPS, loadCampaignAssets, rewardFrames,
} from '../ui/campaignAssets';
import type { FactionId } from '../data/factions';
import { UiScene } from '../ui/UiScene';

const FLAGS: Record<FactionId, string> = {
  shu: campaignArt.factionFlags.SHU,
  wei: campaignArt.factionFlags.WEI,
  wu: campaignArt.factionFlags.WU,
  warlords: campaignArt.factionFlags.QUN,
};
interface CampaignData { stageId?: string; unlockedId?: string; showDetail?: boolean }

export class CampaignScene extends UiScene {
  constructor() { super('Campaign'); }

  private selectedStage(id?: string) {
    return STAGES.find(stage => stage.id === (id ?? gameStore.nextStageId())) ?? STAGES[0];
  }

  preload() {
    loadCampaignAssets(this.load, this.textures);
  }

  create({ stageId, unlockedId, showDetail = false }: CampaignData = {}) {
    const selected = this.selectedStage(stageId);
    const save = gameStore.snapshot;
    const landscape = this.isCompact();
    const [menuX, menuY, menuWidth] = campaignLayout.chapterMenu;
    const chapterX = landscape ? 64 : menuX + menuWidth / 2;

    this.add.rectangle(640, 360, 1280, 720, 0x291819);
    this.drawMap(selected, unlockedId, landscape);
    this.add.rectangle(640, 34, 1280, 68, 0x211519);
    this.art(campaignArt.title, 163, 34, 313, 61);
    this.text(178, 32, 'CHINH CHIẾN', 25, '#fff3cf', {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', stroke: '#511d12', strokeThickness: 5,
    }).setOrigin(0.5);
    const { copper, gold } = walletBalance(save);
    [['Đồng', copper], ['Vàng', gold]].forEach(([label, value], index) => {
      const x = 451 + index * 205;
      this.art(campaignArt.resourceBar, x, 34, 185, 48);
      this.text(x, 32, `${label} · ${value.toLocaleString('vi-VN')}`, 19, '#fff0cd',
        { fontStyle: 'bold' }).setOrigin(0.5);
    });
    this.assetButton(campaignArt.actionButtons.back, 1173, 34, 170, 62, '‹ Về sảnh', () => this.go('Lobby'));

    STAGES.filter(stage => stage.stage === 1).forEach((entry, index) => {
      const open = gameStore.isUnlocked(entry.id);
      const active = entry.chapter === selected.chapter;
      const stages = STAGES.filter(stage => stage.chapter === entry.chapter);
      const cleared = stages.filter(stage => gameStore.isCleared(stage.id)).length;
      const y = menuY + 59 + index * 135;
      const frame = this.art(campaignArt.chapterCard[!open ? 'locked' : active ? 'selected' : 'idle'],
        chapterX, y, landscape ? 101 : 229, 114);
      if (!landscape) {
        this.cover(campaignArt.chapterBackground[index], chapterX, y - 13, 202, 67)
          .setTint(open ? 0xc7b5a1 : 0x6f6268);
        this.add.rectangle(chapterX, y - 13, 202, 67, 0x1a1014, 0.44);
        this.text(chapterX, y - 9, entry.name, 17, '#fff0cd', {
          fontStyle: 'bold', stroke: '#291513', strokeThickness: 4,
        }).setOrigin(0.5);
      }
      this.text(chapterX, y + (landscape ? -18 : -32), `CHƯƠNG ${entry.chapter}`,
        landscape ? 16 : 14, active ? '#fff0af' : '#ffe2a9',
        { fontStyle: 'bold', stroke: '#291513', strokeThickness: 3 }).setOrigin(0.5);
      this.text(chapterX, y + 37, `${cleared}/${stages.length}`, 17, '#ffe4a6',
        { fontStyle: 'bold' }).setOrigin(0.5);
      if (!open) this.art(campaignIcons.lock, chapterX, y + 12, 29, 29);
      frame.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (!active) this.scene.restart({ stageId: entry.id });
      });
    });

    this.drawProgress(selected.id, save.clearedStages.length);
    if (!landscape) {
      this.drawDetails(selected);
    } else if (showDetail) {
      this.add.rectangle(640, 360, 1280, 720, 0x130b10, 0.59).setInteractive()
        .on('pointerup', () => this.scene.restart({ stageId: selected.id }));
      this.drawDetails(selected, 640, true);
    }
    this.cameras.main.fadeIn(130, 24, 15, 18);
    const updateLayout = () => {
      if (this.isCompact() !== landscape) {
        this.scene.restart({ stageId: selected.id, showDetail });
      }
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, updateLayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, updateLayout));
  }

  private isCompact() {
    return this.scale.displaySize.width < 920;
  }

  private art(asset: string, x: number, y: number, w: number, h: number) {
    return this.add.image(x, y, campaignKey(asset)).setDisplaySize(w, h);
  }

  private cover(asset: string, x: number, y: number, width: number, height: number) {
    const image = this.add.image(x, y, campaignKey(asset));
    const scale = Math.max(width / image.width, height / image.height);
    const cropWidth = width / scale;
    const cropHeight = height / scale;
    return image.setScale(scale).setCrop((image.width - cropWidth) / 2, (image.height - cropHeight) / 2,
      cropWidth, cropHeight);
  }

  private assetButton(asset: string, x: number, y: number, w: number, h: number, label: string,
    action?: () => void, size = 20, labelOffset = 0) {
    const image = this.art(asset, x, y, w, h);
    this.text(x, y + labelOffset, label, size, '#fff0cd', {
      fontStyle: 'bold', stroke: '#4a2118', strokeThickness: 3,
    }).setOrigin(0.5);
    if (!action) return;
    image.setInteractive({ useHandCursor: true });
    image.on('pointerover', () => image.setTint(0xffde9a));
    image.on('pointerout', () => image.clearTint());
    image.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (Math.hypot(pointer.x - pointer.downX, pointer.y - pointer.downY) < 12) action();
    });
    return image;
  }

  private drawMap(selected: CampaignStage, unlockedId: string | undefined, landscape: boolean) {
    const [x, y, width, height] = landscape ? [121, 78, 1143, 501] : campaignLayout.mapViewport;
    const chapter = selected.chapter - 1;
    this.cover(campaignArt.chapterBackground[chapter], x + width / 2, y + height / 2, width, height);
    const nodes = STAGES.filter(stage => stage.chapter === selected.chapter).map(stage => {
      const [nx, ny] = CHAPTER_MAPS[chapter][stage.stage - 1];
      return { stage, x: x + nx * width, y: y + ny * height };
    });

    const positions = [[0.18, 0.67, 69], [0.58, 0.61, 66], [0.85, 0.39, 104]];
    campaignProps[chapter].forEach((prop, index) => {
      const [nx, ny, size] = positions[index];
      const image = this.add.image(x + nx * width, y + ny * height, campaignKey(prop));
      image.setScale(size / image.width).setOrigin(0.5, 1);
    });
    nodes.slice(1).forEach((node, index) => {
      const from = nodes[index];
      const angle = Phaser.Math.Angle.Between(from.x, from.y, node.x, node.y);
      const distance = Phaser.Math.Distance.Between(from.x, from.y, node.x, node.y);
      this.art(campaignArt.effects.marchPath, (from.x + node.x) / 2, (from.y + node.y) / 2,
        distance + 4, 23).setRotation(angle).setAlpha(gameStore.isUnlocked(node.stage.id) ? 1 : 0.53);
    });
    for (const node of nodes) this.drawNode(node.stage, node.x, node.y, selected.id, landscape, unlockedId);
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0, 0).setStrokeStyle(2, 0xb78148);
  }

  private drawNode(stage: CampaignStage, x: number, y: number, selectedId: string, landscape: boolean,
    unlockedId?: string) {
    const cleared = gameStore.isCleared(stage.id);
    const open = gameStore.isUnlocked(stage.id);
    const selected = selectedId === stage.id;
    const boss = stage.stage === 5;
    const state = !open ? 'locked' : selected ? 'selected' : cleared ? 'cleared' : 'available';
    const variants = boss ? campaignArt.bossNode : campaignArt.stageNode;
    const [width, height] = boss ? campaignLayout.bossStageScaleSuggested : campaignLayout.regularStageScaleSuggested;
    if (open && (selected || unlockedId === stage.id)) {
      const glow = this.art(boss ? campaignArt.effects.bossGlow : campaignArt.effects.selectedGlow,
        x, y + 7, width * 1.38, height);
      this.tweens.add({ targets: glow, alpha: 0.35, duration: 700, yoyo: true, repeat: selected ? -1 : 1 });
    }
    const marker = this.art(variants[state], x, y, width, height);
    if (boss && open) {
      const opponents = stageOpponents(stage);
      const hero = HERO_BY_ID[opponents[opponents.length - 1]];
      this.add.image(x, y - 12, PORTRAITS, atlasOrder.indexOf(hero.id)).setDisplaySize(43, 43);
    } else if (boss) {
      this.art(campaignIcons.lock, x, y - 7, 29, 29);
    }
    const labelY = y + (boss ? 45 : 30);
    this.text(x, labelY, `${cleared ? '✓ ' : ''}${stage.id}`, 18, '#fff0cb',
      { fontStyle: 'bold', stroke: '#2e1917', strokeThickness: 6 }).setOrigin(0.5);
    const hit = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    if (open && !boss && !selected && !cleared) {
      hit.on('pointerover', () => marker.setTexture(campaignKey(campaignArt.stageNode.hover)).setDisplaySize(width, height));
      hit.on('pointerout', () => marker.setTexture(campaignKey(variants[state])).setDisplaySize(width, height));
    }
    hit.on('pointerup', () => {
      if (!selected || landscape) this.scene.restart({ stageId: stage.id, showDetail: landscape });
    });
  }

  private drawDetails(stage: CampaignStage, center = campaignLayout.stageDetail[0] + campaignLayout.stageDetail[2] / 2, overlay = false) {
    const open = gameStore.isUnlocked(stage.id);
    const cleared = gameStore.isCleared(stage.id);
    const previous = STAGES[STAGES.indexOf(stage) - 1];
    const enemies = makeStageBattle(stage, ['liu-bei']).units.filter(unit => unit.side === 'enemy');
    const power = enemies.reduce((total, unit) => total + combatPower(unit), 0);
    const boss = stage.stage === 5;
    this.art(campaignArt.stageDetail, center, 339, overlay ? 470 : 316, 514)
      .setInteractive();
    if (overlay) {
      this.assetButton(campaignArt.actionButtons.back, center + 163, 127, 130, 64, '‹ Bản đồ',
        () => this.scene.restart({ stageId: stage.id }), 18);
    }
    this.text(center, 119, `ẢI ${stage.id}${boss ? ' · THÀNH CHỦ' : ''}`, 23, '#fff0cc', {
      fontStyle: 'bold', stroke: '#4a2219', strokeThickness: 4,
    }).setOrigin(0.5);
    this.text(center, 151, cleared ? 'Đã vượt ải' : open ? 'Sẵn sàng xuất trận' : `Vượt ải ${previous?.id} để mở`,
      17, '#59301c', { fontStyle: 'bold' }).setOrigin(0.5);
    this.art(campaignArt.enemySummary, center, 254, 290, 176);
    this.text(center, 186, `ĐỘI HÌNH ĐỊCH · CẤP ${stage.enemyLevel}`, 15,
      '#ffe0a2', { fontStyle: 'bold' }).setOrigin(0.5);
    enemies.forEach((unit, index) => {
      const hero = HERO_BY_ID[unit.heroId];
      const x = center - 90 + index % 3 * 90;
      const y = 225 + Math.floor(index / 3) * 64;
      this.add.image(x, y, PORTRAITS, atlasOrder.indexOf(hero.id)).setDisplaySize(49, 49);
      this.art(campaignArt.portraitFrameByRarity[hero.rarity], x, y, 61, 61);
      this.text(x, y + 25, hero.name, 13, '#fff0d6',
        { fontStyle: 'bold' }).setOrigin(0.5, 0);
      this.art(FLAGS[hero.factionId], x + 23, y - 10, 17, 35);
    });
    this.text(center, 353, `Lực chiến địch  ·  ${power.toLocaleString('vi-VN')}`, 19, '#65321e',
      { fontStyle: 'bold' }).setOrigin(0.5);
    this.art(campaignArt.rewards, center, 449, 286, 146);
    this.art(campaignTrim, center, 401, 233, 13);
    this.text(center, 389, cleared ? 'ĐÃ NHẬN THƯỞNG LẦN ĐẦU' : 'THƯỞNG VƯỢT ẢI LẦN ĐẦU', 14, '#683922',
      { fontStyle: 'bold' }).setOrigin(0.5);

    const rewards = [
      { key: campaignKey(campaignIcons.gold), label: `${stage.goldReward.toLocaleString('vi-VN')} Vàng` },
      { key: campaignKey(campaignIcons.exp), label: `${stage.trainingReward.toLocaleString('vi-VN')} EXP` },
    ];
    if (stage.goldKeysReward) rewards.push({ key: campaignKey(campaignIcons.key), label: `${stage.goldKeysReward} Chìa Vàng` });
    const shards = FORGE.firstClear[stage.id];
    if (shards) rewards.push({ key: campaignKey(campaignIcons.gem), label: `${shards} Mảnh TB` });
    const gearId = STAGE_GEAR[stage.id];
    const gear = gearId ? EQUIPMENT[gearId] : undefined;
    if (gear) rewards.push({ key: `gear-${gear.art}`, label: gear.name });
    const milestone = HERO_MILESTONES[stage.id];
    if (milestone && !gameStore.snapshot.heroes.includes(milestone)) {
      rewards.push({ key: campaignKey(campaignIcons.chest), label: `Mở ${HERO_BY_ID[milestone].name}` });
    }
    rewards.forEach(({ key, label }, index) => {
      const x = center + (index % 3 - (Math.min(3, rewards.length - Math.floor(index / 3) * 3) - 1) / 2) * 90;
      const y = 426 + Math.floor(index / 3) * 57;
      if (gear && key === `gear-${gear.art}`) this.art(rewardFrames[gear.rarity], x, y, 49, 49);
      this.add.image(x, y, key).setDisplaySize(43, 43).setAlpha(cleared ? 0.58 : 1);
      this.text(x, y + 22, label, 13, '#56301e', { align: 'center', wordWrap: { width: 98 } }).setOrigin(0.5, 0);
    });
    if (stage.id === FORGE.weekly.stage) {
      const remaining = Math.max(0, FORGE.weekly.limit - weeklyWins(gameStore.snapshot.forge));
      this.text(center, 527, `Thắng lại: +${FORGE.weekly.shards} mảnh · còn ${remaining}/${FORGE.weekly.limit} lượt tuần`,
        14, '#65401f').setOrigin(0.5);
    }
    const challengeTarget = this.assetButton(open ? campaignArt.actionButtons.challenge : campaignArt.actionButtons.disabled, center - 63, 562, 152, 59,
      cleared ? 'ĐÁNH LẠI' : open ? 'KHIÊU CHIẾN' : 'CHƯA MỞ',
      open ? () => { void this.startCampaignBattle(stage.id); } : undefined, 17);
    if (stage.id === '1-1') this.tutorialTarget('campaign.enter', challengeTarget);
    this.assetButton(campaignArt.actionButtons.sweepDisabled, center + 75, 562, 117, 55, 'CÀN QUÉT', undefined, 14);
  }
  private async startCampaignBattle(stageId: string) {
    try {
      const tutorial = cloudRepository.tutorial;
      if (tutorial && tutorialActive(tutorial)) {
        await cloudRepository.execute({ type: 'tutorial', version: tutorial.tutorialVersion,
          step: 'campaign', action: 'next' });
      }
      this.go('Battle', { stageId });
    } catch (error) { this.toast(error instanceof Error ? error.message : 'Chưa thể mở trận.'); }
  }
  private drawProgress(selectedId: string, clearedCount: number) {
    const [x, y, width, height] = campaignLayout.progressBottom;
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x27171a).setStrokeStyle(2, 0x956339);
    this.text(35, 620, `TIẾN TRÌNH CHINH CHIẾN · ${clearedCount}/${STAGES.length} ẢI`, 17, '#ffdf9e',
      { fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.art(campaignArt.chapterProgress, 640, 656, 1175, 36);
    STAGES.forEach((stage, index) => {
      const x = 95 + index * 1090 / (STAGES.length - 1);
      const open = gameStore.isUnlocked(stage.id);
      const cleared = gameStore.isCleared(stage.id);
      const active = stage.id === selectedId;
      const states = stage.stage === 5 ? campaignArt.bossNode : campaignArt.stageNode;
      const icon = cleared ? states.cleared : open ? (active ? states.selected : states.available) : campaignIcons.lock;
      this.art(icon, x, 658, 31, 31);
      this.text(x, 686, active ? `◆ ${stage.id}` : stage.id, 15,
        active ? '#fff2aa' : open ? '#ffe0ac' : '#c6a6a0').setOrigin(0.5);
    });
  }
}
