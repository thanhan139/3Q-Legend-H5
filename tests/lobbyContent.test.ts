import { describe, expect, it } from 'vitest';
import selection from '../docs/lobby-smooth/RUNTIME_SELECTION.json';
import { LOBBY_SMOOTH } from '../src/ui/lobbySmoothAssets';
import { compactLobbyAmount, contains, fitLabelledTexture, fitTexture, LOBBY_PANELS, LOBBY_SKIN_CONTENT,
  LOBBY_WIDGETS, rect, skinContent } from '../src/ui/lobbyContentLayout';

const overlaps = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

describe('Lobby content geometry and texture contracts', () => {
  it.each(Object.entries(LOBBY_PANELS))('%s partitions its safe texture body without overlapping fields', (_name, panel) => {
    expect(contains(rect(0, 0, panel.width, panel.height), panel.content)).toBe(true);
    const fields = Object.entries(panel.fields);
    for (const [id, box] of fields) {
      expect(contains(panel.content, box), id).toBe(true);
      for (const [otherId, other] of fields) if (id !== otherId) expect(overlaps(box, other), `${id}/${otherId}`).toBe(false);
    }
  });

  it('keeps currency fields within the blank red body and reserves a separate plus cell', () => {
    const fields = Object.entries(LOBBY_WIDGETS.currencyFields);
    for (const [id, box] of fields) {
      expect(contains(LOBBY_SKIN_CONTENT.red.content, box), id).toBe(true);
      for (const [otherId, other] of fields) if (id !== otherId) expect(overlaps(box, other), `${id}/${otherId}`).toBe(false);
    }
  });

  it('honors the audited baked-label policy for every runtime Smooth PNG', () => {
    for (const [id, asset] of Object.entries(LOBBY_SMOOTH)) {
      const entry = selection.find(item => item.path === `assets/ui/lobby_smooth/${asset.path}`)!;
      expect(LOBBY_SKIN_CONTENT[id as keyof typeof LOBBY_SMOOTH].bakedLabel, id).toBe(entry.label_baked);
    }
  });

  it.each([[1920, 1080], [1846, 864], [1280, 720], [844, 390]])(
    'projects fields inside uniformly scaled artwork at %ix%i', (width, height) => {
      const pixelScale = Math.min(width / 1280, height / 720);
      for (const [id, panel] of Object.entries(LOBBY_PANELS)) {
        const widget = LOBBY_WIDGETS[id as keyof typeof LOBBY_PANELS];
        const geometry = fitTexture(panel, widget);
        expect(geometry.bounds.width / panel.width).toBeCloseTo(geometry.bounds.height / panel.height);
        for (const field of Object.values(panel.fields)) {
          const target = geometry.project(field), body = geometry.project(panel.content);
          expect(contains(body, target)).toBe(true);
          expect(target.width * pixelScale).toBeGreaterThan(0);
        }
      }
      expect(LOBBY_WIDGETS.campaign.y + LOBBY_WIDGETS.campaign.height).toBeLessThan(650 - 112 / 2);
    });

  it('fits labelled canvases into their hitbox and aligns a shared label baseline', () => {
    const slot = rect(0, 0, 168, 112);
    for (const source of [{ width: 300, height: 210 }, { width: 285, height: 224 }]) {
      const label = skinContent('formation', source.width, source.height);
      const fit = fitLabelledTexture(source, slot, label);
      expect(contains(slot, fit.bounds)).toBe(true);
      expect(fit.bounds.y + (label.y + label.height / 2) * fit.scale).toBeCloseTo(112 * 0.82);
    }
  });

  it('formats actual large balances compactly without changing their values', () => {
    expect(compactLobbyAmount(1234567)).toBe((1234567).toLocaleString('vi-VN'));
    expect(compactLobbyAmount(Number.MAX_SAFE_INTEGER).length).toBeLessThan((Number.MAX_SAFE_INTEGER).toLocaleString('vi-VN').length);
  });
});
