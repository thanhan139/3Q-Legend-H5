import { rect, type ContentRect } from './lobbyContentLayout';

/** Five desktop columns; three readable touch columns and a separate detail overlay on phones. */
export function inventoryLayout(width: number, height: number, compact: boolean) {
  const total = Math.min(width - 96, compact ? 1100 : 1400);
  const left = (width - total) / 2, top = compact ? 194 : 190;
  const gridWidth = compact ? total : total * .707;
  const panelHeight = height - top - 32;
  const grid = rect(left, top, gridWidth, panelHeight);
  const detail = compact ? rect((width - 650) / 2, (height - 620) / 2, 650, 620)
    : rect(left + gridWidth + 12, top, total - gridWidth - 12, panelHeight);
  const viewport = rect(grid.x + 22, grid.y + 23, grid.width - 52, grid.height - (compact ? 98 : 68));
  const columns = compact ? 3 : 5, gap = 12;
  const cellWidth = (viewport.width - gap * (columns - 1)) / columns;
  const cellHeight = cellWidth * 135 / 174, stride = cellHeight + gap;
  return { grid, detail, viewport, columns, gap, cellWidth, cellHeight, stride,
    tabs: INVENTORY_TAB_BOXES(left, total, compact ? 112 : 118, compact ? 72 : 58),
    cell: (index: number) => rect(viewport.x + index % columns * (cellWidth + gap),
      viewport.y + Math.floor(index / columns) * stride, cellWidth, cellHeight),
    maxScroll: (count: number) => Math.max(0, Math.ceil(count / columns) * stride - gap - viewport.height),
  };
}

function INVENTORY_TAB_BOXES(left: number, width: number, y: number, height: number): ContentRect[] {
  const gap = 10, tabWidth = (width - gap * 4) / 5;
  return Array.from({ length: 5 }, (_, i) => rect(left + i * (tabWidth + gap), y, tabWidth, height));
}

/** Source content bounds ignore the ornamental outer edge of the 174x135 slot. */
export const INVENTORY_SLOT_CONTENT = {
  name: rect(12, 8, 150, 25), icon: rect(30, 35, 114, 68), count: rect(15, 106, 144, 25),
};
