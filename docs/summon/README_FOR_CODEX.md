# 3Q Legend H5 — Summon Complete Asset Kit v1.0

This is a **real ZIP of individual PNG files**, not just a concept collage.

## Included
- 57 individual PNG texture files with transparent alpha wherever available (plus an optional existing summon hall background).
- Source 1448×1086 summon sheet (reference only), approved art direction/reference results screen, and the user's original flawed screenshot.
- `ASSET_MANIFEST.csv`, `PHASER_TEXTURE_MAPPING.json`, proposed rate/pity config, `SUMMON_BALANCE_SPEC.md`, `CODEX_TASK.md`, and `VISUAL_QA_CHECKLIST.md`.

## Structure
- `assets/cards` 8 rarity card art frames (R, SR, SSR, SSS+, normal + glow)
- `assets/portrait_frames` 4 standalone frames
- `assets/banners` title, pity labels, result labels
- `assets/buttons` 4 fixed-caption main actions
- `assets/badges` 4 rarity emblems
- `assets/fx` portal, reveal, burst, rings, glows
- `assets/ui` progress tracker and supporting decor
- `assets/background` original hall from an earlier user-provided source ZIP as an optional fallback, not newly invented art
- `reference` review-only screenshots and the original sprite sheet

## Mandatory integration rules
1. **Use individual PNGs**, not the whole sprite sheet or full concept screenshot, for live UI.
2. Portrait, name, faction, quantity, pity counter, and new/duplicate state must come from **live user data**.
3. Several PNGs intentionally have **baked STATIC Vietnamese captions** (e.g. title, 'Về điện chiêu mộ'). Do NOT overlay duplicate Phaser Text on baked caption artwork. If localization/dynamic display is required, recreate a text-free frame in art pipeline first.
4. Keep current real hero artwork (do not make up hero portrait), avoid stretching tiny 84-px crops from the old result scene. Preserve aspect ratio and clipping.
5. The concept is a **visual target**; sheet cutouts may contain soft AI-generated glow/artifacts. Source PNGs are for QA and need cleanup if artifacts show in build. Do not claim 100% pixel-identical.
6. The illustrated pity state is sample text, **not a database balance**. `config` proposal must be reviewed then applied through the authoritative server pathway, not changed only in Phaser UI.
7. Never overwrite the existing Battle Core, Supabase save, hero collection, item ownership or transaction IDs.

## Technical QA
- Confirm alpha after importing PNG, no black/checkerboard around texture.
- Check every card at 10-pull grid, 1-pull single-card display, mobile landscape and resize.
- Keep font family loaded before first Text render and verify Vietnamese marks.
- Check card data mismatches, guarantee logic and persistence.

`reference/` must NEVER be imported as runtime textures.
