/** Source-art alpha bounds measured in 256 x 256 sprite cells.
 * The atlas cells include wildly different transparent margins. Scaling the
 * whole cell equally made the sample heroes look much smaller than the rest.
 * These metadata values normalize the VISIBLE figure, not the canvas.
 */
interface VisibleFootprint { width: number; height: number }

const VISIBLE_FOOTPRINTS: Readonly<Record<string, VisibleFootprint>> = {
  'zhang-fei': { width: 214, height: 193 },
  'guan-yu': { width: 197, height: 202 },
  'liu-bei': { width: 213, height: 208 },
  'zhao-yun': { width: 249, height: 243 },
  'huang-yueying': { width: 241, height: 250 },
  'ma-chao': { width: 249, height: 242 },
  'cao-cao': { width: 248, height: 250 },
  'xiahou-dun': { width: 241, height: 250 },
  'dian-wei': { width: 249, height: 234 },
  'sun-quan': { width: 229, height: 250 },
  'gan-ning': { width: 249, height: 239 },
  'da-qiao': { width: 226, height: 250 },
  'diao-chan': { width: 243, height: 250 },
  'hua-xiong': { width: 249, height: 240 },
};

// 145px high figures fit the 186px row separation. Allow room for long weapons.
export const TARGET_VISIBLE_HEIGHT = 145;
export const MAX_VISIBLE_WIDTH = 172;
export const SPRITE_CELL_SIZE = 256;

export function battleSpriteDisplaySize(heroId: string): number {
  const { width, height } = VISIBLE_FOOTPRINTS[heroId] ?? { width: 248, height: 248 };
  return Math.round(Math.min(
    TARGET_VISIBLE_HEIGHT * SPRITE_CELL_SIZE / height,
    MAX_VISIBLE_WIDTH * SPRITE_CELL_SIZE / width,
  ));
}
