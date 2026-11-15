import { initialAccount } from '../cloud/accountDialog';
import { cloudRepository } from '../cloud/cloudRepository';
import { tutorialActive } from '../domain/tutorial';
import { loadFormationUi } from '../ui/formationAssets';
import { loadHeroUi } from '../ui/heroUiAssets';
import { EQUIPMENT } from '../domain/equipment';
import { heroAnimationTexture } from '../ui/HeroAnimationController';
import { skillTexturePath, SKILL_TEXTURES, skillTextureKey } from '../data/skillVfx';
import Phaser from 'phaser';
import { SAMPLE_HERO_IDS, sampleTexture } from '../data/battleLayout';
import { BATTLE_SPRITES, BATTLE_TILE } from '../ui/battleSprites';
import { PORTRAITS, PORTRAIT_TILE } from '../ui/heroPresentation';
import { LOBBY_ASSETS } from '../data/lobbyAssets';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    loadHeroUi(this.load);
    loadFormationUi(this.load);
    for (const id of new Set(Object.values(EQUIPMENT).map(item => item.art))) {
      this.load.image(`gear-${id}`, `${import.meta.env.BASE_URL}assets/equipment/${id}`);
    }
    for (const id of SKILL_TEXTURES) {
      this.load.image(skillTextureKey(id),
        `${import.meta.env.BASE_URL}${skillTexturePath(id)}`);
    }
    this.load.image('battle-courtyard', `${import.meta.env.BASE_URL}assets/battle/backgrounds/courtyard.webp`);
    for (const id of SAMPLE_HERO_IDS) {
      this.load.spritesheet(heroAnimationTexture(id), `${import.meta.env.BASE_URL}assets/battle/heroes/${id}/poses.webp`,
        { frameWidth: 256, frameHeight: 256 });
      this.load.image(sampleTexture(id), `${import.meta.env.BASE_URL}assets/battle/heroes/${id}/idle.png`);
    }
    this.load.spritesheet(BATTLE_SPRITES, `${import.meta.env.BASE_URL}assets/heroes/battle-sprites.webp`, {
      frameWidth: BATTLE_TILE, frameHeight: BATTLE_TILE,
    });
    this.load.spritesheet(PORTRAITS, `${import.meta.env.BASE_URL}assets/heroes/portraits.webp`, {
      frameWidth: PORTRAIT_TILE, frameHeight: PORTRAIT_TILE,
    });
    for (const asset of Object.values(LOBBY_ASSETS)) {
      this.load.image(asset.key, asset.url);
    }
  }

  async create() {
    await initialAccount();
    const tutorial = cloudRepository.tutorial;
    this.scene.start(tutorial && tutorialActive(tutorial) ? 'Tutorial' : 'Lobby');
  }
}
