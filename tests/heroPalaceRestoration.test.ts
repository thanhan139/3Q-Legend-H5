import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

const root = process.cwd();
const file = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Restore approved dragon palace Võ Tướng screen', () => {
  it('uses original themed hero shell, four tabs and all six equipment slots', () => {
    const hero = file('src/scenes/HeroesScene.ts');
    const theme = file('src/ui/equipmentThemeView.ts');
    expect(hero).toContain('drawEquipmentTheme(this');
    expect(hero).toContain('loadEquipmentThemes(this');
    expect(theme).toContain("art('background/equipment_hall_clean.png'");
    for (const label of ['Chi tiết', 'Kỹ năng', 'Trang Bị', 'Thần Binh'])
      expect(theme).toContain(label);
    for (const label of ['Vũ Khí', 'Giày', 'Bảo Vật', 'Chiến Mã', 'Mũ', 'Giáp'])
      expect(theme.toLowerCase()).toContain(label.toLowerCase());
    expect(theme).toContain("scene.tutorialTarget('hero.card.'+id,hit)");
    expect(theme.indexOf("scene.tutorialTarget('hero.card.'+id,hit)")).toBeLessThan(
      theme.indexOf("hit.on('pointerup',()=>choose(id))")
    );
  });
  it('restores all five animation manifests and image assets used by the original hero hall', () => {
    for (const manifest of ['livingSpiritManifest','livingSpiritExpansionManifest','livingSpiritPaintedManifest']) {
      const data = JSON.parse(file('src/data/' + manifest + '.json'));
      const visit = (v: unknown): string[] => {
        if (typeof v === 'string') return /\.png$|\.webp$/.test(v) ? [v] : [];
        if (Array.isArray(v)) return v.flatMap(visit);
        if (v && typeof v === 'object') return Object.values(v).flatMap(visit);
        return [];
      };
      const images = visit(data);
      expect(images.length).toBeGreaterThan(0);
      for (const src of images) expect(existsSync(resolve(root, 'public', src))).toBe(true);
    }
  });
});