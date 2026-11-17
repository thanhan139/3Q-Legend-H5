import { expect, it } from 'vitest';
import { CARD_SKIN, CARD_DESIGN, cardContent, summonCardSlots } from '../src/ui/summonLayout';
import { contains } from '../src/ui/lobbyContentLayout';

it('keeps three text rows separate from the portrait and ornaments for every rarity and grid size', () => {
  for (const count of [1, 10] as const) for (const slot of summonCardSlots(count)) {
    expect(slot.x).toBeGreaterThan(0);
    expect(slot.y + slot.height).toBeLessThan(650);
    for (const rarity of ['R', 'SR', 'SSR', 'SSS+'] as const) {
      const cells = cardContent(rarity, slot);
      for (const cell of [cells.portrait, cells.name, cells.rank, cells.status]) expect(contains(cells.body, cell)).toBe(true);
      expect(cells.portrait.y + cells.portrait.height).toBeLessThan(cells.name.y);
      expect(cells.name.y + cells.name.height).toBeLessThanOrEqual(cells.rank.y + .001);
      expect(cells.rank.y + cells.rank.height).toBeLessThanOrEqual(cells.status.y + .001);
    }
  }
});

it('maps four rarities to distinct cells in the reusable text-free atlas', () => {
  const positions = new Set<string>();
  for (const rarity of ['R','SR','SSR','SSS+'] as const) {
    const { column, row } = CARD_SKIN[rarity];
    expect([0,1]).toContain(column);expect([0,1]).toContain(row);positions.add(`${column}:${row}`);
  }
  expect(positions.size).toBe(4);
  expect(CARD_DESIGN.width/CARD_DESIGN.height).toBeCloseTo(2/3);
});
