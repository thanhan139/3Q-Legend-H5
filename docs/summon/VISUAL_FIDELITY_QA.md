# Summon Results — visual fidelity correction

> Historical comparison pass. The following user-supplied Đại Kiều reference led to the newer implementation in `SMOOTH_CARD_ASSETS.md`; current atlas mapping and reveal behavior are documented there.

## Cause and replacement

The previous build used `portrait_frames/portrait_*` inside generic rounded rectangles. The tall `cards/frame_*` PNGs were not rendered. That mapping met bounds checks but did not meet the approved card design.

Current runtime selection is audited in `RUNTIME_SELECTION.json`: 14 PNGs rendered; four previously imported square portrait frames retained on disk but neither loaded nor drawn. Full source manifest/mapping and the actual approved concept in the supplied ZIP were reviewed. No concept or sprite sheet is a runtime UI texture.

`SummonCard.ts` composes large exact-ID artwork, the actual rarity card PNG edges, a gold/red PNG nameplate, separate live name/faction/reward rows, then an additive rarity glow. The previous generic rectangle and nested thumbnail frame are removed.

Card geometry uses `CARD_DESIGN`, `CARD_SKIN`, `CARD_TRIMS` and `cardContent` in `summonLayout.ts`. Nine-slice centers adapt to the concept card proportions while preserving corner/crown caps. Portraits always use one uniform scale. Card masks omit the original baked rarity letters from the composited center, retaining the border; live text is never laid over baked lettering. The supplied elliptical FX PNG was rejected after a large-scale screenshot exposed its rectangular matte. Clean code-native additive ellipses provide floor lighting instead; the actual card PNG glow layers remain in use.

Important Phaser detail: adding a named crop changes a texture's default `firstFrame`. The renderer explicitly selects `__BASE` when reading original dimensions and `runtime-border` for every frame/glow. This prevents a landscape crop replacing the card artwork after a scene restart.

Vertical PNG gutters and adjacent slices are excluded with runtime frame metadata. Original PNG bytes are unchanged. Actual 256px hero atlas IDs are reused; older damaged portrait tiles use the same hero's existing battle artwork, cover-cropped around the head/upper body rather than displayed as a small full-body thumbnail. Missing mappings fail explicitly rather than silently showing a different hero.

The x10 crop zooms closer to the head/upper torso; the x1 crop keeps a wider source area at large display size. Their cached texture-frame names include `grid`/`single`, so opening a single result after a grid cannot reuse the wrong crop. Existing atlas resolution still sets the ceiling on portrait detail; no new or invented character artwork is substituted.

## Layout and effects

- x1: one uniformly enlarged centered card; no reveal-all button. SR fade, SSR gold pulse/sparks, SSS+ faster gold/red pulse and twice the sparks. No client reward is granted by effects.
- x10: equal five-column/two-row grid. Three separate measured text regions with safe padding, bounded font reduction, at most two name lines and ellipsis.
- Header: three gold/red PNG panels, actual Inventory keys and current 50/100 counters. Four equally spaced bottom hitboxes with original PNG captions; disabled changes alpha only.
- Reduced motion: immediate reveal, no particle/pulse animations. Reveal-all stops only reveal tweens and preserves ambient rarity effects.
- GameStore, SaveV2, shared summon rates/pity logic, Auth, Supabase schema/functions and account data are unchanged by this correction.

## Verification procedure

Run standard `npm test` and `npm run build`, then `node scripts/qa-summon.mjs` sequentially. The browser fixture uses real production scenes/assets without authentication or server writes. `QA_FAST=1` is an explicitly labeled visual preview and is not a full QA pass.

Full browser cases at 1920x1080, 1280x720 and 844x390: x10 mixed rarity, x1 SR/SSR/SSS+, long Vietnamese names, new/ten-shard rewards and disabled buttons. Checks include actual text bounds, full card texture IDs, large portrait regions, uniform image scale, viewport/hitbox containment, animation alpha changes, different SSR/SSS+ spark counts, reduced motion, reveal-all behavior, recent results and offline resource preservation. The fixture pauses its own render loop only during CDP capture to avoid SwiftShader screenshot contention. Animation checks wait for real tween states/alpha changes rather than assuming wall-clock timing; production frame-rate settings are unchanged.

The script writes runtime JPEGs, a mobile content-bounds image, and three **side-by-side concept/runtime comparisons** to ignored `.vite/summon-qa/`. These comparisons must be inspected; logical tests alone do not establish fidelity. Concept sample counters (including an old 200 placeholder) are references only; live UI still shows the approved server policy 50/100.

No push or deployment is performed as part of this correction.

## Observed final results — 2026-11-16

- Standard Windows `npm test`: **198/198 PASS, 22 files**.
- Final `npm run build`: **PASS**; existing large-bundle warning only.
- Final browser run: **SUMMON_VISUAL_QA_PASS**, 18 cases over the three requested sizes, no runtime errors, no lost WebGL context, all measured text fields inside their padded content rectangles and all image scales uniform (the UI-only gradient is intentionally a generated fill).
- Inspected the final concept/runtime side-by-side images for **1920x1080, 1280x720 and 844x390**, the large SR/SSR/SSS+ results, mixed grid, Vietnamese long-name/mobile and bounds-debug captures. The cards now use their actual ornate borders, large portraits and rarity lighting. The painted kit frames, current character art and four required actions differ in detail from the reference illustration; this is not claimed as pixel-identical.
- Verified actual glow alpha changes, five SSR versus ten SSS+ sparks, reduced-motion suppression and absence of reveal-all for x1. Reveal-all retains ambient glow for x10; disabled buttons keep their shape.
- `git diff -- src/data src/domain src/cloud supabase` is empty. Rates, 50/100 pity, SaveV2, server code/schema, authentication and account data are unchanged.
- Changes remain local and uncommitted. **No push, Preview deployment or Production deployment**.

Artifacts: `.vite/summon-qa/comparison-{1920x1080,1280x720,844x390}.jpg`, `ten-*.jpg`, `single-{sr,ssr,sss}-*.jpg`, `long-*.jpg`, `disabled-*.jpg`, `debug-844x390.jpg` and `report.json`. Fixture data is isolated from Supabase; these are visual/input tests, not authenticated account E2E tests.
