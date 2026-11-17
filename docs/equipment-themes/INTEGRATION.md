# Equipment UI Themes v2.0

**v2.0.1 update:** the repaired Điêu Thuyền atlas is now active with 650×464 frames, indices 0–7. The older truncated-atlas/fallback description below records v2.0 history. All eight source images remain unchanged. Current verification: [hotfix report](hotfix-2.0.1/README.md).

The hero equipment overview now uses one shared view for the entire roster. Five supplied themes are mapped explicitly to existing HeroConfig IDs: `guan-yu` → Thanh Long, `zhao-yun` → Lôi Long, `lu-bu` → Hỏa Long, `zhuge-liang` → Thiên Cơ, `diao-chan` → Hoa Nguyệt. Other heroes retain their own original artwork with a neutral pedestal; no unrelated full-body fallback is used. Battle retains its existing chibi sprites and animation path.

Read the supplied README, manifest, theme/layout JSON, prompt, example view contract and concept references. Only individual runtime PNGs under `assets/` are imported. Reference concepts and cropped demo item icons are never used as UI or item data. The validated copied PNGs and hashes are in `ASSET_AUDIT.json`.

## UI and data

- Left: owned heroes from the current save, selected avatar, roster paging and wheel selection.
- Center: current hero name/rarity/faction/level and real hero stars; full-body art, separate background spirit/loop, ground pedestal and foreground aura.
- Six actual backend slots arranged 3 + 3. Icons come from existing EquipmentConfig art; rarity and enhancement are real. Empty slots remain empty. No item star rating exists in the current Gear model, so fake item stars are not drawn. Special signature items are not reclassified into ordinary slots; their equipped count remains visible when present.
- Bottom: real combat-power calculation and equipped count; icon actions open the existing bag/equip/enhance management and Forge flow. Other unavailable functions clearly report development status.
- Right: real HP/ATK/DEF/speed, actual normal/ultimate/passive names, existing ultimate icon where available and generic manual icons otherwise; current formation faction synergy. No illustrative UR, +25, six-star rating, enormous balances or invented magic-defense stat is copied from concept.

`selectedHeroId` is the source for the view model, hero art, theme, owned gear, power, skills and stats. Hero switching recreates those fields together and clears old UI data. A stale item UID is dropped on hero change; bag default selection prefers that hero's items, then unowned items. Explicit global-bag inspection still shows the true item owner. Existing server-backed equip/unequip/enhance/skin commands are reused in the bag view, not reimplemented in the renderer. No player inventory mutations are performed by opening or switching this view.

The equipment bag management view remains available for existing actions. This integration replaces the hero overview and its navigation, without rewriting inventory transactions or making a second InventoryScene.

## Animation and asset limitations

All five themes play the supplied **8-frame spirit-energy loop at 8 FPS**, behind the hero. Static spirit art is a separate rear layer; front aura remains above the full-body image and below equipment/UI. The characters themselves are static illustrations. No skeletal rig, fake limb animation or completed dragon/crane/butterfly creature animation is claimed.

The source file `assets/fx/dieu_thuyen/fx_loop_4x2.png` fails PNG decoding because it is truncated. It is excluded from runtime. The eight valid separate Điêu Thuyền frames from the same kit supply that animation instead. All other imported PNGs decode successfully and match the ZIP byte for byte.

The supplied spirit effects are illustrative and simpler than the painted creatures in the concept. Detailed creature flight/body motion needs additional coherent animation art. Tướng outside the five supplied artwork sets still need dedicated high-resolution equipment illustrations/themes for equal visual detail; the fallback preserves identity and source proportions rather than borrowing Quan Vũ.

## Verification

- Typecheck and standard Vite build PASS (existing large-bundle warning remains).
- Regression: **262/262 PASS, 33 files**. New tests cover hero/theme/owner/slot/stat binding, foreign selection reset, separate save snapshots and non-mutation.
- Actual Phaser WebGL scene: six heroes × three viewports = **18 gameplay screenshots**, at 1920×1080, 1280×720 and 844×390.
- QA verifies theme loop playback, uniform character scaling, correct fallback texture, per-hero owned item IDs, 20 switches, bounded scene object count and one roster wheel listener.
- Actual slot click enters the existing bag; changing to Trương Phi while passing Quan Vũ's old item UID displays Trương Phi's item/owner. Save snapshot remains unchanged. Browser errors: zero.
- Fixture uses isolated local saves and blocks Supabase requests. Live authenticated logout/login, real server rejection/replay and physical-device performance have not been newly verified. Battle Core, HeroConfig, EquipmentConfig, SaveV2, Supabase schema/accounts and player data were not changed for this task.

Run `node scripts/qa-equipment-themes.mjs` with the existing Playwright/Chrome setup. Full report: [qa/report.json](qa/report.json). No commit, push, production deployment, account reset, ZIP or video was produced.

## Changed files

- `src/scenes/EquipmentScene.ts`: overview integration, selected hero state, stale selection clearing, reuse of existing bag actions.
- `src/ui/equipmentHeroModel.ts`: pure selected-hero view model.
- `src/ui/equipmentThemeView.ts`: loader and shared themed overview.
- `src/data/equipmentThemes.json`, `src/data/equipmentThemeAssets.json`: supplied presets, reviewed identity mapping and alpha bounds.
- `public/assets/equipment-themes/`: validated individual PNGs.
- `tests/equipmentHeroModel.test.ts`, `scripts/qa-equipment-themes.mjs`, this documentation and captured evidence.

## Captures

At 1280×720: [Quan Vũ](qa/guan-yu-1280x720.jpg), [Triệu Vân](qa/zhao-yun-1280x720.jpg), [Lữ Bố](qa/lu-bu-1280x720.jpg), [Gia Cát Lượng](qa/zhuge-liang-1280x720.jpg), [Điêu Thuyền](qa/diao-chan-1280x720.jpg), [Trương Phi/default](qa/zhang-fei-1280x720.jpg).

Mobile: [Điêu Thuyền 844×390](qa/diao-chan-844x390.jpg), [Trương Phi 844×390](qa/zhang-fei-844x390.jpg). Full HD: [Quan Vũ 1920×1080](qa/guan-yu-1920x1080.jpg). All eighteen captures are retained in `qa/`.
