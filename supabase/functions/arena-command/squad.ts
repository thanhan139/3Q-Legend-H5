import { normalizeJewelry } from '../../../src/domain/jewelry';
import type { ArenaSquad } from '../../../src/domain/battle';
import type { SaveV2 } from '../../../src/domain/types';

function equippedJewelry(save: SaveV2, formation: ArenaSquad['formation']) {
  return normalizeJewelry(save.jewelry, save.heroes)
    .filter(item => item.heroId && formation.includes(item.heroId));
}

export function arenaSquad(save: SaveV2): ArenaSquad {
  return {
    formation: save.formation, heroExp: save.heroExp, heroStars: save.heroStars,
    equipment: save.equipment?.filter(item => item.heroId && save.formation.includes(item.heroId)),
    jewelry: equippedJewelry(save, save.formation),
  };
}

export function arenaDefense(published: ArenaSquad, confirmedSave: SaveV2): ArenaSquad {
  return { ...published, jewelry: equippedJewelry(confirmedSave, published.formation) };
}
