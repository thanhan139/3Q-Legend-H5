import { describe, expect, it } from 'vitest';
import equipmentSource from '../src/scenes/EquipmentScene.ts?raw';
import heroesSource from '../src/scenes/HeroesScene.ts?raw';
import themeSource from '../src/ui/equipmentThemeView.ts?raw';

describe('Equipment modal stays within the approved hero palace', () => {
  it('opens the themed equipment overlay instead of the deprecated three-column screen', () => {
    const guard = equipmentSource.indexOf('if (bag && selectedHero) {');
    const legacy = equipmentSource.indexOf('this.add.image(640, 360, LOBBY_ASSETS.palace.key)');
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(legacy);
    expect(equipmentSource.slice(guard, legacy)).toContain('this.renderBagOverlay(selectedHero, items');
    expect(equipmentSource.slice(guard, legacy)).toContain('return;');
    expect(equipmentSource).toContain('drawEquipmentTheme(this, heroId,');
  });

  it('preserves the chosen hero and the slot filter when managing gear', () => {
    expect(heroesSource).toContain("this.go('Equipment',{heroId:id,bag:true,query:{slot},uid})");
    expect(equipmentSource).toContain('heroNavigation.resolve(save');
    expect(equipmentSource).toContain("restart({ bag: true, query: { slot }, uid, page: 0 })");
    expect(equipmentSource).toContain('selectedHeroId: heroId, query, selectedUid: selected.uid');
    expect(themeSource).toContain('equipment.slot.');
  });

  it('keeps equip, unequip and enhancement under the existing save protocol', () => {
    expect(equipmentSource).toContain("this.saveAction(command, mutate");
    expect(equipmentSource).toContain('gameStore.equipGear(selected.uid, heroId)');
    expect(equipmentSource).toContain('gameStore.unequipGear(selected.uid)');
    expect(equipmentSource).toContain('gameStore.enhanceGear(selected.uid');
    expect(equipmentSource).toContain("this.action(1173, 112, 104, 'Đóng ×', close)");
  });
});
