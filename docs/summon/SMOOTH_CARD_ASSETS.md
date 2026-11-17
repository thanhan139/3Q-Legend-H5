# Reference-style summon cards and synchronized reveal

Supersedes the renderer in `VISUAL_FIDELITY_QA.md`. User reference: `98fa54bf-729c-40d5-9155-8a20eecf14c9.png` (Đại Kiều).

## Runtime assets

Generated with built-in **image_gen**, using the user's reference. No CLI/API-key fallback.

- `public/assets/summon/smooth/card-atlas.png`: RGBA **1024x1536**; four separate **512x768** cells: blue R, purple SR, gold SSR, red/gold SSS+. Transparent portrait windows, blank crest/nameplate/lower panel; no baked text.
- `public/assets/summon/smooth/da-qiao.png`: **1254x1254**, same woman, hairstyle, pink dress and palace setting. Bound only to `hero.id === 'da-qiao'`; other heroes retain their own artwork.

Original reference/generated files remain intact. Six legacy title/plate/button PNGs remain active. Twelve old card/portrait-frame PNGs remain on disk but are not loaded. Current mapping: `RUNTIME_SELECTION.json`.

## Smoothness

- One positive portrait clip per card replaces three stencil masks and layered NineSlice frames.
- One reveal timeline per whole card keeps portrait/frame/text together: opacity, 9px rise, uniform 0.985-to-1 scale, Sine-out; 460ms single / 360ms grid, 55ms staggering. The clip follows the same transform.
- Slower ambient Sine pulses; three SSR / five SSS+ lights. Skip completes only reveal; reduced motion disables animation. No reveal-all control for x1.
- Summon opts into canvas-only font candidate measurement, avoiding repeated text repaint/GPU upload at every binary-search step. Final Phaser bounds stay authoritative. Other scenes retain their existing defaults.
- Georgia/serif typography, separate live rarity/name/faction/reward regions and distinct x1/x10 portrait crop keys.
- Rates, 50/100 pity, GameStore, SaveV2, Supabase, Auth and transactions are unchanged.

## Prompt set (verbatim)

### Frame atlas

Create a production GAME UI FRAME ATLAS based faithfully on the supplied Vietnamese Three Kingdoms SR card. Output one transparent PNG, portrait aspect 2:3, ideally 2048x3072. It is an exactly aligned 2-column by 2-row atlas of FOUR COMPLETE separate tall 2:3 cards. Each card occupies exactly one quarter, no overlap, no margins between atlas cells except each frame's own narrow glow gutter. Top-left BLUE rarity R frame, top-right PURPLE rarity SR frame matching reference, bottom-left GOLD SSR frame, bottom-right RED/GOLD SSS+ dragon frame. Every card: polished rounded gold ornamental full border; blank crest at top center (NO LETTERS); a large fully TRANSPARENT portrait window at x=6%..94%, y=10%..62%; elaborate EMPTY dark-red gold nameplate y=62%..73%; luxurious dark tier-colored lower information panel y=73%..96% with subtle cloud engraving and a fine gold divider at 83%; small lotus or dragon ornament at bottom. The portrait window MUST be truly alpha transparent, not black, white or checkerboard. Opaque lower info panel and nameplate. Outside the card transparent, all four complete frames inside cells. NO characters, NO faces, NO landscapes, NO text, NO numbers, NO watermark. Preserve smooth rich gold bevels, small floral corners and restrained neon halo from reference. This is reusable runtime UI art with live game text added separately, NOT a screenshot, not an illustration of a card lying on a surface. All four cards identical component placement. Blank text regions must remain uncluttered. Atlas is divided precisely at 50% width/height; don't draw cell borders.

### Dai Qiao portrait

Edit reference into a clean high-resolution square CHARACTER PORTRAIT asset of exactly the SAME Dai Qiao / Đại Kiều woman. Keep her exact face identity, brown eyes, elaborate brown updo and long brown hair, pink plum-blossom hairpins, gold jewelry, pink flowing Three Kingdoms dress, gentle smile, hand pose, elegant chibi/anime illustration. Keep the atmospheric purple dusk palace, plum blossoms and lantern behind her. Remove ALL card frame borders, nameplate, badges and ALL writing. Compose a square 1024x1024 or larger portrait, head and upper torso centered, generous safe margin above hair ornament; nothing cuts off her head. The actual character illustration should fill most of the square. Match the reference's polished commercial mobile RPG art, soft light and crisp fine detail. No additional people. No text, no logo, no UI frame. This is an identity-preserving extraction/recomposition of the supplied character, not a different character.

## Verification

`node scripts/qa-summon.mjs` uses real scene/assets in an isolated WebGL fixture at 1920x1080, 1280x720 and 844x390. Eighteen visual cases check one mask/at most one reveal tween per card, text containment, uniform scaling, pulse changes, reduced motion, disabled buttons and input after resize. SR single uses Đại Kiều's actual GameConfig identity. Cropped runtime/reference comparisons: `.vite/summon-qa/reference-comparison-*.jpg`. No Supabase writes, commit, push or deployment.

## Observed results ? 2026-11-16

- Standard `npm run build`: PASS (TypeScript + Vite, 123 modules). Existing bundle-size warning remains.
- Standard `npm test`: PASS, 199 tests across 23 files.
- Full visual runner: `SUMMON_VISUAL_QA_PASS`, 18 cases at 1920x1080, 1280x720 and 844x390. Actual screenshots reviewed for the mixed grid, mobile single card and side-by-side Dai Qiao reference comparison; all audited text bounds fit.
- Focused `node scripts/qa-summon-motion.mjs`: PASS. Samples on Phaser poststep rather than an external polling window. At sampled alpha 0.42948, portrait clip and whole-card position/scale agree, scaleX equals scaleY (0.99144), all child labels use parent opacity, and exactly one reveal tween controls the card. Mid-reveal screenshot reviewed: `.vite/summon-qa/reveal-mid.png`; details in `motion-report.json`.
- Isolated browser fixture retained the exact resource snapshot; no server-account E2E or production FPS benchmark is claimed.
- `git diff --check`: PASS. No edits to domain/data/cloud/Supabase paths. No commit, push or deployment performed.

## Vietnamese font correction

Summon now preloads a bundled Noto Serif bold Vietnamese face before measuring text, avoiding per-platform Georgia/fallback glyph differences. Runtime needs no Google Fonts connection. The licensed WOFF2 is 40,456 bytes; source, derivation and OFL license are in `public/assets/fonts/`. Live Summon labels use 2x canvas resolution and height-aware accent padding. Font candidate measurement now saves/restores the canvas context, keeping the render font consistent after fitting. Other scene fonts retain their defaults.

Validation: standard build PASS; regression 199/199 PASS. Desktop and mobile screenshots were visually inspected: the name, faction and reward labels keep their accents and fit the card. A dedicated browser check in `scripts/qa-summon-font.mjs` verifies the loaded face, weight 700, text canvas resolution, correct NFC name, restored context font, content bounds and unchanged fixture resources. QA outputs remain under `.vite/summon-qa/`. No commit, push or deployment.

Final font QA: `SUMMON_VISUAL_QA_PASS` (18 cases, all three viewports), `SUMMON_FONT_QA_PASS` (loaded bold face, 2x text, correct NFC name, matching measurement/render font, all bounds fit). The comparison-page writer now ignores its own output in Vite watch to prevent artifact-generation reloads. Standard final build PASS; existing bundle-size warning only.
