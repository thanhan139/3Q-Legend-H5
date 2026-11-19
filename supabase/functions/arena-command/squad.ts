import { isSignature } from '../../../src/data/signatureConfig';
import { signatureNodes } from '../../../src/domain/signatureStars';
﻿import { normalizeJewelry } from '../../../src/domain/jewelry';
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
  // Keep the published formation and gear slots. Refresh petals for the same confirmed instance.
  const equipment = published.equipment?.map(item => {
    if (!isSignature(item.itemId)) return item;
    const confirmed = confirmedSave.equipment?.find(entry => entry.uid === item.uid && entry.itemId === item.itemId);
    return confirmed ? { ...item, signatureNodes: signatureNodes(confirmed.signatureNodes) } : item;
  });
  return { ...published, equipment, jewelry: equippedJewelry(confirmedSave, published.formation) };
}
