import { describe, expect, it } from 'vitest';
import { coverScale, screenBounds, viewportLayout } from '../src/ui/viewport';

// Reference logical sizes for Phaser EXPAND; the browser suite checks actual ScaleManager output.
const expandedSize = (width: number, height: number) => {
  const scale = Math.min(width / 1280, height / 720);
  return { width: width / scale, height: height / scale, scale };
};

describe('full viewport layout', () => {
  it.each([[1920, 1080], [1366, 768], [2560, 1080], [1280, 720], [844, 390], [390, 844]])(
    'covers %ix%i without cropping controls or distorting artwork', (width, height) => {
      const size = expandedSize(width, height);
      expect(size.width * size.scale).toBeCloseTo(width);
      expect(size.height * size.scale).toBeCloseTo(height);
      expect(size.width).toBeGreaterThanOrEqual(1280);
      expect(size.height).toBeGreaterThanOrEqual(720);
      const l = viewportLayout(size.width, size.height);
      expect(20 + l.left).toBeGreaterThanOrEqual(0);
      expect(1258 + l.right).toBeLessThanOrEqual(size.width);
      for (const x of l.dock) {
        expect(x - 84).toBeGreaterThan(0);
        expect(x + 84).toBeLessThan(size.width);
      }
      expect(l.dockY + 56).toBeLessThanOrEqual(size.height - 14);
      const cover = coverScale(1672, 941, size.width, size.height);
      expect(1672 * cover).toBeGreaterThanOrEqual(size.width);
      expect(941 * cover).toBeGreaterThanOrEqual(size.height);
    });

  it('keeps edge controls inside safe insets without shrinking the canvas', () => {
    const l = viewportLayout(1600, 740, { left: 42, right: 28, top: 16, bottom: 10 });
    expect(l.left).toBe(42); expect(l.right + 1280).toBe(1572);
    expect(l.top).toBe(16); expect(l.dockY + 56).toBe(716);
    expect(l.dock[1] - l.dock[0]).toBe(l.dock[2] - l.dock[1]);
  });

  it('projects legacy camera targets to the expanded tutorial surface', () => {
    expect(screenBounds({ x: 100, y: 150, width: 200, height: 60 },
      { scrollX: -200, scrollY: -40, zoom: 1, x: 0, y: 0 }))
      .toEqual({ x: 300, y: 190, width: 200, height: 60 });
    expect(screenBounds({ x: 80, y: 50, width: 20, height: 10 },
      { scrollX: 10, scrollY: 5, zoom: 2, x: 3, y: 4 }))
      .toEqual({ x: 143, y: 94, width: 40, height: 20 });
    expect(screenBounds({ x: 80, y: 50, width: 20, height: 10 },
      { scrollX: 10, scrollY: 5, zoom: 2, x: 3, y: 4, width: 1280, height: 720 }))
      .toEqual({ x: -497, y: -266, width: 40, height: 20 });
  });
});
