import { describe, expect, it } from 'vitest';
import heroSource from '../src/scenes/HeroesScene.ts?raw';
import themeSource from '../src/ui/equipmentThemeView.ts?raw';
import baseManifest from '../src/data/livingSpiritManifest.json';
import expansionManifest from '../src/data/livingSpiritExpansionManifest.json';
import paintedManifest from '../src/data/livingSpiritPaintedManifest.json';

describe('Approved Võ Tướng dragon-palace presentation', () => {
  it('renders original four-tab hero hall with data-driven equipment slots', () => {
    expect(heroSource).toContain('drawEquipmentTheme(this');
    expect(heroSource).toContain('loadEquipmentThemes(this');
    expect(themeSource).toContain("art('background/equipment_hall_clean.png'");
    for (const label of ['Chi tiết', 'Kỹ năng', 'Trang Bị', 'Thần Binh'])
      expect(themeSource).toContain(label);
    expect(themeSource).toContain('EQUIPMENT_SLOTS');
    expect(themeSource).toContain('equipment.hero.');
  });
  it('advances tutorial on portrait touch before switching heroes', () => {
    const registration = themeSource.indexOf("scene.tutorialTarget('hero.card.'+id,hit)");
    const navigation = themeSource.indexOf("hit.on('pointerup',()=>choose(id))");
    expect(registration).toBeGreaterThan(-1);
    expect(navigation).toBeGreaterThan(registration);
  });
  it('includes the original spirit manifests and referenced image assets', () => {
    const images = import.meta.glob('../public/assets/spirits/**/*.png');
    const visit = (value: unknown): string[] => {
      if (typeof value === 'string') return /\.png$|\.webp$/.test(value) ? [value] : [];
      if (Array.isArray(value)) return value.flatMap(visit);
      if (value && typeof value === 'object') return Object.values(value).flatMap(visit);
      return [];
    };
    for (const manifest of [baseManifest, expansionManifest, paintedManifest]) {
      const refs = visit(manifest);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) expect(images['../public/' + ref]).toBeDefined();
    }
  });
});
