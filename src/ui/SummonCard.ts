import Phaser from 'phaser';
import type { HeroDefinition } from '../domain/types';
import { atlasOrder, PORTRAITS } from './heroPresentation';
import { BATTLE_SPRITES } from './battleSprites';
import { CARD_DESIGN, CARD_SKIN, cardContent, SMOOTH_ATLAS, DAI_QIAO_PORTRAIT } from './summonLayout';
import type { ContentRect } from './lobbyContentLayout';

/** One portrait clip and one transparent frame image; no layered inverse stencil masks. */
export function summonCardArt(scene: Phaser.Scene, hero: HeroDefinition, box: ContentRect, index: number) {
  const skin = CARD_SKIN[hero.rarity], cells = cardContent(hero.rarity, box);
  const scale = box.width / CARD_DESIGN.width;
  const atlas = scene.textures.get(SMOOTH_ATLAS), original = atlas.get('__BASE');
  const cellWidth = original.width / 2, cellHeight = original.height / 2;
  if (!atlas.has(hero.rarity)) atlas.add(hero.rarity, 0, skin.column * cellWidth, skin.row * cellHeight, cellWidth, cellHeight);
  const maskShape = new Phaser.GameObjects.Graphics(scene).fillStyle(0xffffff)
    .fillRoundedRect(cells.portrait.x, cells.portrait.y, cells.portrait.width, cells.portrait.height, 9 * scale);
  const mask = maskShape.createGeometryMask();
  const backKey = `summon-soft-back-${hero.rarity}`;
  if (!scene.textures.exists(backKey)) {
    const canvas = scene.textures.createCanvas(backKey, 128, 128)!;
    const gradient = canvas.context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, `#${skin.color.toString(16).padStart(6,'0')}`);gradient.addColorStop(1, '#20122c');
    canvas.context.fillStyle = gradient;canvas.context.fillRect(0,0,128,128);canvas.refresh();
  }
  const background = scene.add.image(cells.portrait.x + cells.portrait.width / 2,
    cells.portrait.y + cells.portrait.height / 2, backKey).setDisplaySize(cells.portrait.width,cells.portrait.height)
    .setTint(0x6f6085).setMask(mask).setName('summon.ui-gradient');
  const tile = atlasOrder.indexOf(hero.id), useBattle = tile >= 14;
  const dedicated = hero.id === 'da-qiao';
  if (tile < 0) throw new Error(`Missing exact summon hero mapping: ${hero.id}`);
  const texture = scene.textures.get(dedicated ? DAI_QIAO_PORTRAIT : useBattle ? BATTLE_SPRITES : PORTRAITS);
  if (!dedicated && !texture.has(String(tile))) throw new Error(`Missing exact summon hero art: ${hero.id}`);
  const source = texture.get(dedicated ? '__BASE' : tile);
  const single = box.width > CARD_DESIGN.width;
  const available = dedicated ? { x: 0, y: 0, width: source.width, height: source.height }
    : !useBattle ? { x: 0, y: 0, width: 256, height: 256 }
    : single ? { x: 20, y: 0, width: 236, height: 195 }
    : hero.rarity === 'SSS+' ? { x: 50, y: 0, width: 186, height: 180 }
    : { x: 58, y: 0, width: 154, height: 160 };
  const aspect = cells.portrait.width / cells.portrait.height;
  const cropWidth = Math.min(available.width, available.height * aspect), cropHeight = cropWidth / aspect;
  const crop = `summon-smooth-${hero.id}-${single?'single':'grid'}`;
  if (!texture.has(crop)) texture.add(crop, 0, source.cutX + available.x + Math.floor((available.width-cropWidth)/2),
    source.cutY+available.y,Math.floor(cropWidth),Math.floor(cropHeight));
  const portrait = scene.add.image(cells.portrait.x+cells.portrait.width/2,cells.portrait.y+cells.portrait.height/2,
    texture.key,crop).setScale(Math.min(cells.portrait.width/Math.floor(cropWidth),cells.portrait.height/Math.floor(cropHeight)))
    .setMask(mask).setName(`summon.portrait.${hero.id}`);
  const frame = scene.add.image(box.x+box.width/2,box.y+box.height/2,SMOOTH_ATLAS,hero.rarity)
    .setScale(box.width/cellWidth).setName(`summon.card.${index}`);
  const glow = scene.add.graphics().lineStyle(1.2*scale,skin.color,.65)
    .strokeRoundedRect(box.x+4*scale,box.y+10*scale,box.width-8*scale,box.height-17*scale,11*scale)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(hero.rarity==='SSS+'?.45:hero.rarity==='SSR'?.38:.16)
    .setName(`summon.glow.${index}`).setData('rarity', hero.rarity);
  scene.events.once('shutdown',()=>{mask.destroy();maskShape.destroy();});
  return { cells, portrait, frame, glow, maskShape, color: skin.color, visuals: [background,portrait,frame,glow] };
}
