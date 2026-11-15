import { FactionConfig, type FactionId } from '../data/factions';
import type { HeroDefinition, HeroRole, Rarity } from '../domain/types';
import type { UiScene } from './UiScene';

export const PORTRAITS = 'hero-portraits';
export const PORTRAIT_TILE = 256;
export const ROLE_LABEL: Record<HeroRole, string> = {
  tank: 'Hộ Vệ', fighter: 'Đấu Sĩ', ranger: 'Xạ Thủ', mage: 'Pháp Sư', support: 'Hỗ Trợ',
};
export const RARITY_COLOR: Record<Rarity, number> = { R: 0x78baff, SR: 0xc19aed, SSR: 0xffcd78, 'SSS+': 0xff6054 };
export const atlasOrder = [
  'zhang-fei', 'guan-yu', 'liu-bei', 'zhao-yun',
  'huang-yueying', 'ma-chao', 'cao-cao', 'xiahou-dun',
  'dian-wei', 'sun-quan', 'gan-ning', 'da-qiao',
  'diao-chan', 'hua-xiong',
  'lu-bu', 'zhuge-liang', 'pan-feng', 'xing-dao-rong', 'cheng-yuan-zhi',
  'pei-yuan-shao', 'guan-ping', 'zhou-cang', 'cao-hong',
];
const frames = new Map(atlasOrder.map((id, index) => [id, index]));

export function portrait(scene: UiScene, x: number, y: number, size: number, hero: HeroDefinition) {
  const border = scene.add.rectangle(x, y, size + 4, size + 4, RARITY_COLOR[hero.rarity]);
  const frame = frames.get(hero.id);
  const art = scene.textures.exists(PORTRAITS) && frame !== undefined
    ? scene.add.image(x, y, PORTRAITS, frame).setDisplaySize(size, size)
    : scene.heroAvatar(x, y, hero.color, size / 160);
  const face = scene.add.container(0, 0, [border, art]);
  if (hero.rarity === 'SSS+') face.add(scene.add.rectangle(x, y, size + 9, size + 9)
    .setStrokeStyle(2, 0xffcc74));
  return face;
}

export function factionBadge(scene: UiScene, x: number, y: number, id: FactionId, size = 26) {
  const faction = FactionConfig[id];
  const crest = scene.add.rectangle(x, y, size, size, 0x271e31)
    .setAngle(45).setStrokeStyle(2, faction.color);
  const emblem = scene.text(x, y, faction.emblem, Math.round(size * 0.72),
    `#${faction.color.toString(16)}`, { fontStyle: 'bold' }).setOrigin(0.5);
  return scene.add.container(0, 0, [crest, emblem]);
}
