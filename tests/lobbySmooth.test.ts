import { describe, expect, it } from 'vitest';
import manifestData from '../docs/lobby-smooth/ASSET_MANIFEST.json';
import { LOBBY_DOCK, LOBBY_SMOOTH } from '../src/ui/lobbySmoothAssets';
import { viewportLayout } from '../src/ui/viewport';

type Entry = { path: string; status: string; sha256: string; width: number; height: number; group: string };
const manifest = manifestData as Entry[];

describe('Smooth lobby runtime asset contract', () => {
  it('selects approved runtime entries and valid clean frames, excluding reference/review and baked notification menus', () => {
    for (const asset of Object.values(LOBBY_SMOOTH)) {
      const path = `assets/ui/lobby_smooth/${asset.path}`;
      const entry = manifest.find(item => item.path === path)!;
      expect(entry, path).toBeDefined();
      expect(entry.status).toBe('runtime');
      expect(entry.group).not.toBe('side_nav');
      expect(path).not.toMatch(/reference|review_/);
      if ('crop' in asset) {
        const [x, y, width, height] = asset.crop;
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
        expect(x + width).toBeLessThanOrEqual(Number(entry.width));
        expect(y + height).toBeLessThanOrEqual(Number(entry.height));
      }
    }
  });

  it.each([[1280, 720], [844, 390]])('keeps all four complete dock hit regions within the expanded %ix%i viewport', (width, height) => {
    const scale = Math.min(width / 1280, height / 720);
    const layout = viewportLayout(width / scale, height / scale);
    const bounds = layout.dock.map(x => ({
      left: (x - LOBBY_DOCK.width / 2) * scale,
      right: (x + LOBBY_DOCK.width / 2) * scale,
      top: (layout.dockY - LOBBY_DOCK.height / 2) * scale,
      bottom: (layout.dockY + LOBBY_DOCK.height / 2) * scale,
    }));
    for (const [i, box] of bounds.entries()) {
      expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width);
      expect(box.top).toBeGreaterThanOrEqual(0); expect(box.bottom).toBeLessThan(height - 3);
      if (i) expect(box.left).toBeGreaterThan(bounds[i - 1].right);
    }
  });
});
