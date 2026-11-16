# Full viewport and responsive lobby

The Phaser 3.90 canvas uses `Scale.EXPAND`, retaining the 1280×720 design minimum while extending the logical world to match the parent aspect ratio. Canvas CSS is managed by Phaser; no independent X/Y stretching is applied. See the [Phaser 3.90 scale modes](https://docs.phaser.io/api-documentation/3.90.0/namespace/scale-scalemodes).

`#game` fills the browser viewport. Safe-area insets move controls inward without shrinking the canvas. The palace background uses uniform cover scaling. Profile/VIP, wallet, upper menu, left menu, campaign, characters and each dock item have independent anchors. Text fitting preserves proportions. Existing scenes keep their authored coordinates through camera centering, with full-screen images/overlays expanded to cover the visible world. Tutorial spotlights project world bounds through the active camera and use the actual logical canvas dimensions.

ResizeObserver, window/visual viewport resize, orientation and fullscreen events share a coalesced resize handler that reads final DOM bounds after layout. Fullscreen targets the document element so DOM dialogs and tutorial overlays remain available. Scene resize listeners and observer callbacks are removed on shutdown/destruction.

## Reproduce visual QA

Use a separate QA checkout with no Supabase environment variables:

```sh
npm ci
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/qa-viewport.mjs
```

The fixture loads the actual scenes, assets and local GameStore, without authenticating or writing to Supabase. It exists only under ignored `.vite/viewport-qa/` and is not part of the production Vite entry. Screenshots and JSON results are written there; no screenshot archive or video is required.

Required viewport cases: 1920×1080, 1366×768, 2560×1080, 1280×720, 844×390. Assertions cover full canvas bounds, background cover, complete button bounds, uniform image/sprite scale, profile/VIP opening, mouse/touch navigation, unchanged local save and spotlight alignment. Additional cases exercise portrait/landscape rotation, asymmetric safe insets, settings overlay resizing and fullscreen entry/exit. Campaign, Welfare, PvP, Tutorial and practice Battle are captured at ultrawide and mobile landscape sizes.

This is visual/input regression QA. It does not replace authenticated staging account E2E, server reward validation or save isolation checks between real UIDs. GameStore, SaveV2, Battle Core, Supabase functions/schema and gameplay data/configuration are unchanged.

## Validation environment

Windows typechecking works. Standard local Vitest/Vite subprocesses encounter the existing `spawn EPERM` sandbox restriction. Standard regression tests and production build are therefore run in an isolated Linux Node 22 environment. The in-process runner is available for focused Windows checks. Vite retains its existing large-chunk warning.

Observed on 2026-11-16: standard regression **179/179 PASS** (20 files), typecheck PASS, production build PASS. Chromium visual/input QA completed with `FINAL_EXIT=0` and `VISUAL_QA_PASS` for all five required resolutions, profile/VIP mouse/touch, spotlight alignment, safe area, orientation, settings resize, fullscreen entry/exit and the five other scenes. SHA-256 comparison confirmed all 11 runtime/test/script files in the Linux checkout exactly matched the local source. No Production deployment was performed.

The orientation test initially exposed a stale parent size after portrait→landscape. The resize handler now reads current DOM bounds after layout instead of using an older observer entry; dedicated regression tests cover coalesced notifications and listener cleanup. Full-resolution PNGs and the JSON report were generated under `.vite/viewport-qa/` in the isolated Linux checkout. The local workspace retains a lobby contact sheet; rerun the script to reproduce the original screenshots. These generated artifacts are ignored by Git.
