import { HEROES } from '../src/data/heroes';
import { describe, expect, it } from 'vitest';
import { battleSpriteDisplaySize, MAX_VISIBLE_WIDTH, TARGET_VISIBLE_HEIGHT } from '../src/data/battleVisuals';
import { SKILL_TEXTURES, SKILL_EFFECTS, SKILL_VFX_ROOT, skillTexturePath } from '../src/data/skillVfx';
import { STAGES } from '../src/data/campaign';
import { makeStageBattle } from '../src/domain/battle';

const footprints: Record<string, { w: number; h: number }> = {
  'zhang-fei': { w: 214, h: 193 },
  'guan-yu': { w: 197, h: 202 },
  'liu-bei': { w: 213, h: 208 },
  'dian-wei': { w: 249, h: 234 },
  'xiahou-dun': { w: 241, h: 250 },
};

describe('Battle asset presentation', () => {
  it('normalizes visible figures regardless of atlas transparent margins', () => {
    for (const [id, bbox] of Object.entries(footprints)) {
      const display = battleSpriteDisplaySize(id);
      expect(display * bbox.h / 256).toBeLessThanOrEqual(TARGET_VISIBLE_HEIGHT + 1);
      expect(display * bbox.h / 256).toBeGreaterThan(135);
      expect(display * bbox.w / 256).toBeLessThanOrEqual(MAX_VISIBLE_WIDTH + 1);
    }
    expect(battleSpriteDisplaySize('zhang-fei')).toBeGreaterThan(battleSpriteDisplaySize('dian-wei'));
  });

  it('maps every roster ultimate to an isolated cast and impact texture', () => {
    for (const hero of HEROES) {
      const effect = SKILL_EFFECTS[`${hero.id}:ultimate`];
      expect(effect).toBeDefined();
      expect(SKILL_TEXTURES.has(effect.cast)).toBe(true);
      expect(SKILL_TEXTURES.has(effect.impact)).toBe(true);
    }
  });

  it('casts special moves only when the acting hero has sufficient rage', () => {
    const stage = STAGES.find(entry => entry.id === '1-2');
    expect(stage).toBeDefined();
    const battle = makeStageBattle(stage!, ['zhang-fei', 'guan-yu', 'liu-bei', null, null, null]);
    let triggered = false;
    for (let i = 0; i < 150 && !battle.winner; i++) {
      const action = battle.step().find(item => item.kind === 'damage' || item.kind === 'heal');
      if (!action || !action.skill) continue;
      expect(action.actionType).toBe('skill');
      expect(action.rageBefore).toBe(100);
      expect(action.rageAfter).toBe(0);
      triggered = true;
      break;
    }
    expect(triggered).toBe(true);
  });

  it('registers isolated PNGs for VFX compositing', () => {
    expect(SKILL_VFX_ROOT).toMatch(/isolated$/);
    expect([...SKILL_TEXTURES].every(id => /^(assets\/battle\/effects\/)(hero_skills|skill_vfx_expansion)\/.+\.png$/.test(skillTexturePath(id)))).toBe(true);
  });
});

it('binds all 23 Ultimate Kit sequences to canonical ultimate IDs', () => {
  const aligned = HEROES.filter(hero => SKILL_EFFECTS[hero.ultimateSkillId]?.icon);
  expect(aligned).toHaveLength(23);
  for (const hero of aligned) {
    const effect = SKILL_EFFECTS[hero.ultimateSkillId];
    expect(effect.icon).toContain('__ultimate');
    expect(effect.cutin).toContain('__cutin_bg');
    expect(effect.travel).toBeTruthy();
    for (const id of [effect.icon!, effect.cutin!, effect.travel!, effect.cast, effect.impact]) expect(SKILL_TEXTURES.has(id)).toBe(true);
  }
});
