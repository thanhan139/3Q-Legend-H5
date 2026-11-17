# Battle UI kit integration — 2026-11-17

Read: README_FOR_SOL, PROMPT_FOR_SOL, ASSET_MANIFEST, PHASER_TEXTURE_MAPPING, BATTLE_UI_LAYOUT_SPEC and VISUAL_QA_CHECKLIST. Copies are under `docs/battle/ui-kit/`. All source manifest SHA-256 hashes were verified before importing. PNG alpha bounds/ranges are recorded in `ui-kit/AUDIT.json`.

## Runtime selection

Loaded fourteen isolated PNGs from the kit: stage/turn plaques; back/speed/skip buttons; opening VS; ally/enemy nameplates; HP/rage tracks; journal/footer frame; ally/enemy ground rings; gold divider. Enemy nameplate, rage track and VS have explicit source frames excluding disconnected neighboring artwork. The divider is preloaded but reserved for future separators; it is not drawn over text.

The fixed-sample HP/rage bars, example labels and defeated marker are not runtime assets. The five-cell turn-order strip is unsuitable for a dynamic six-position queue, and the supplied standalone queue cell is an incomplete corner crop. Neither is rendered. Six individual queue cells are drawn in code instead; portrait/HP/rage values come from the current units. Blue/active ground rings and the other divider alternatives are unused. Source PNGs remain unchanged. The kit is extracted concept artwork, so some fine edge/glow imperfections remain in the source; this is not a claim that they are original layered production art.

The stage crest contains decorative Chinese lettering, and buttons retain the source arrow ornament; all actual labels and numbers are Phaser text. No concept, source atlas, reference-only texture, fixed sample resource or fixed HP fill is loaded as gameplay.

## Layout and behavior

- `src/ui/battleUiAssets.ts`: selected preload namespace, local Vietnamese font and clean frames.
- `src/ui/BattleUi.ts`: proportional texture fitting, content bounds/auto-fit text, button states and center-only footer nine-slicing. Decorative corners retain uniform source scaling.
- `src/scenes/BattleScene.ts`: kit headers, backdrop, individual HUDs, red/gold footer, speed and skip controls. Team headers and the pause/continue button are removed according to this kit's explicit requirements. Internal pause/visibility handling remains for lifecycle correctness. Controls disable when result transition begins.
- `src/ui/battleTurnQueue.ts`: forecasts both teams using copied next-action scheduling fields, including repeated fast actors and the Core tie-break order. It never mutates the engine or computes damage. The queue refreshes after confirmed actions; later deaths/statuses can change the forecast.
- `src/data/battleLayout.ts` / `battleVisuals.ts`: retain mirrored two-column/three-row formation and foot anchors, with enough vertical space for the decorated name/HP/rage stack. Lobby sizing is unchanged.

All data remains from the current engine/account: hero identity, names, HP/maxHP, rage, stage, turn and entitled playback rates. Skip keeps the existing result/server-settlement path and duplicate-transition guard. No gameplay formulas, SaveV2, Supabase schema or authentication changes were made for this integration.

## Background asset

The ZIP has no clean battlefield background. A separate **background-only** asset was created with the built-in imagegen edit tool from the user's reference: `public/assets/battle/backgrounds/courtyard-premium-v1.png`. It contains fortress, paving, sky and scenery only—no character or UI. The exact prompt is saved in `docs/battle/BACKGROUND_PROMPT.md`. It is fitted with uniform cover scaling and reused by Campaign/practice/ranked Battle scenes. The original reference is not a runtime texture.

## Verification and limits

- Typecheck and Vite build pass; existing large-bundle warning remains.
- Regression: **234/234 tests**, 26 files, including a queue-vs-Core ordering and non-mutation check.
- Browser QA uses real BattleScene, real BattleEngine and the actual runtime PNGs with isolated local fixtures; Supabase network is blocked. Captures cover 1920×1080, 1280×720 and 844×390, full 6v6, two empty/dead ally slots (4v6), a confirmed enemy KO (6v5), attack/contact/return, all three available frame heroes' ultimates, x1–x4 presentation, Auto, touch speed/skip, resize, visibility and reduced effects. Header/button text is checked against content bounds. No team/pause/continue UI remains. VS is opening-only.
- The 4v6 capture represents two confirmed dead ally slots, not a new server deployment. Revival tests the existing view contract only; no resurrection mechanic was added.
- Still missing: adult full-body animation/rig assets for the roster. Existing three chibi frame sheets and twenty static heroes are preserved. This UI kit does not solve that prior asset limitation.
- No real account/server reward E2E or hardware 60 FPS certification is claimed. The browser tests use software rendering and controlled clock steps for the pre-impact check.

Artifacts: `.vite/battle-animation-qa/idle-{resolution}.jpg`, `4v6-{resolution}.jpg`, `ko-empty-slot.jpg`, `normal-strike.jpg`, `ultimate-*.jpg`, `report.json`, and `ui-reference-comparison.jpg`.

No commit, push, deployment or account reset performed.
