# 3Q Legend H5 — Skill VFX v0.1 imported

## What's new

- `public/assets/battle/effects/skill_vfx/isolated_vfx/`: 29 separate static RGBA PNG VFX elements.
- `public/assets/battle/effects/skill_vfx/original_sheets/`: 3 original visual sheets for reference.
- `public/assets/battle/effects/skill_vfx/ASSET_MANIFEST.json`: asset names, dimensions, grouping and relative paths.
- `public/assets/battle/effects/skill_vfx/README_FOR_SOL.md`: integration guidance.
- `public/assets/battle/effects/skill_vfx/VFX_CATALOG.jpg`: preview contact sheet.
- `vfx-preview.html`: **local asset inspection page**, usable at `/vfx-preview.html` while Vite is running.

## How to inspect

1. In `3q-legend-h5-scaffold`, run `npm install` (if needed), then `npm run dev`.
2. In a browser, open `http://localhost:5173/vfx-preview.html` (or the URL Vite reports).
3. Browse all images, click each one to preview static render and a simple scale/opacity mock animation.
4. The **main game** remains at `http://localhost:5173/` and is unchanged.

## Important: not yet wired to BattleScene

This package **only imports the PNG artwork** and an optional preview page. It does not add skill gameplay logic or alter Battle Core, Scene code, Save, package.json, or existing tests.
You will not see new skills in battle until `SkillVFXManager` is implemented in Phaser and the desired PNGs are loaded and triggered at the appropriate battle events.

### Suggested asset URLs (Vite public)

- `/assets/battle/effects/skill_vfx/isolated_vfx/thanh_long__azure_dragon_arc.png`
- `/assets/battle/effects/skill_vfx/isolated_vfx/chan_dia__fiery_crater.png`
- `/assets/battle/effects/skill_vfx/isolated_vfx/chan_dia__blue_spear_dash.png`

## Notes

These are **static stills with alpha** (one image = one visual element), not frame-by-frame character or VFX animations. Some crops have fringe/halo artifacts and need visual cleanup before production use. See `README_FOR_SOL.md` for recommended effect groupings. No original commercial game assets have been copied.
