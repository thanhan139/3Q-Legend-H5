/** Logical viewport used by Phaser EXPAND; artwork always keeps a uniform scale. */
export const DESIGN = { width: 1280, height: 720 } as const;
export interface Insets { left: number; right: number; top: number; bottom: number }
export const NO_INSETS: Insets = { left: 0, right: 0, top: 0, bottom: 0 };

export function viewportLayout(width: number, height: number, inset: Insets = NO_INSETS) {
  const left = inset.left, top = inset.top;
  const right = width - DESIGN.width - inset.right;
  const bottom = height - DESIGN.height - inset.bottom;
  return {
    left, right, top, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2,
    contentWidth: width - inset.left - inset.right,
    dock: [0, 1, 2, 3].map(i => left + (width - inset.left - inset.right) * (i + 0.5) / 4),
    dockY: height - inset.bottom - 70,
  };
}

export function coverScale(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  return Math.max(width / sourceWidth, height / sourceHeight);
}

export function screenBounds(
  bounds: { x: number; y: number; width: number; height: number },
  camera: { scrollX: number; scrollY: number; zoom: number; x: number; y: number;
    width?: number; height?: number; originX?: number; originY?: number },
) {
  const originX = (camera.width ?? 0) * (camera.originX ?? 0.5) * (1 - camera.zoom);
  const originY = (camera.height ?? 0) * (camera.originY ?? 0.5) * (1 - camera.zoom);
  return { x: (bounds.x - camera.scrollX) * camera.zoom + camera.x + originX,
    y: (bounds.y - camera.scrollY) * camera.zoom + camera.y + originY,
    width: bounds.width * camera.zoom, height: bounds.height * camera.zoom };
}

export function readSafeInsets(scale: number): Insets {
  const css = getComputedStyle(document.documentElement);
  const value = (side: string) => (parseFloat(css.getPropertyValue(`--safe-${side}`)) || 0) / scale;
  return { left: value('left'), right: value('right'), top: value('top'), bottom: value('bottom') };
}
