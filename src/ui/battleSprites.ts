import { atlasOrder, PORTRAIT_TILE } from './heroPresentation';

export const BATTLE_SPRITES = 'battle-sprites';
export const BATTLE_TILE = PORTRAIT_TILE;
export const battleSpriteFrames = new Map(atlasOrder.map((id, index) => [id, index]));
