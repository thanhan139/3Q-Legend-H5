import { ArenaScene } from './scenes/ArenaScene';
import { TutorialScene } from './scenes/TutorialScene';
import { OnboardingController } from './ui/OnboardingController';
import { ForgeScene } from './scenes/ForgeScene';
import { EquipmentScene } from './scenes/EquipmentScene';
import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { HeroesScene } from './scenes/HeroesScene';
import { FormationScene } from './scenes/FormationScene';
import { CampaignScene } from './scenes/CampaignScene';
import { BattleScene } from './scenes/BattleScene';
import { ResultScene } from './scenes/ResultScene';
import { SummonScene } from './scenes/SummonScene';
import { TopupScene } from './scenes/TopupScene';
import { InventoryScene } from './scenes/InventoryScene';
import { InfoScene } from './scenes/InfoScene';
import { bindViewportResize } from './ui/resizeViewport';

const config:Phaser.Types.Core.GameConfig={
  type:Phaser.AUTO,
  parent:'game',
  width:1280,height:720,
  backgroundColor:'#14213a',
  scale:{mode:Phaser.Scale.EXPAND,autoCenter:Phaser.Scale.CENTER_BOTH,fullscreenTarget:document.documentElement},
  render:{antialias:true,pixelArt:false},
  callbacks: { postBoot: game => { new OnboardingController(game); } },
  scene:[BootScene,LobbyScene,HeroesScene,FormationScene,CampaignScene,
    BattleScene,ResultScene,SummonScene,TopupScene,InventoryScene,EquipmentScene,ForgeScene,InfoScene,ArenaScene,TutorialScene]
};
const game = new Phaser.Game(config);
const parent = document.getElementById('game');

if (parent) bindViewportResize(game, parent);
