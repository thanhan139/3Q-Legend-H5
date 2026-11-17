# Original chibi restoration and battle polish — 2026-11-17

**Active runtime: original chibi characters, all 23 canonical hero IDs.** The adult articulated remaster was rejected and removed from the gameplay import/loading/render path. Its files and assets remain intact as historical records; no rig fallback or option is offered to players.

## Original assets and sizing

The original assets already existed, so a Git checkout/reset was unnecessary. `python scripts/audit-chibi-battle.py` verifies these files against Git HEAD byte for byte, records SHA256, and measures alpha bounds without repainting or modifying raster pixels:

- `public/assets/heroes/battle-sprites.webp`: original 23-hero atlas, 256×256 cells.
- `public/assets/battle/heroes/{guan-yu,liu-bei,zhang-fei}/poses.webp`: original 24-frame sheets.

Existing `idle.png` and assets used by other scenes are retained. See [source audit](ASSET_AUDIT.json). Triệu Vân, Quan Vũ, Lưu Bị, Trương Phi, Điển Vi, Lữ Bố and the other IDs map to their own original atlas frames. Awakened family IDs resolve to their canonical art rather than another hero's first frame.

The rollout first enabled enlargement only for Triệu Vân and Quan Vũ. Their real BattleScene captures and Attack/Hit/Death checks passed at 1920×1080, 1280×720 and 844×390 before enlargement was applied to the remaining roster. [Pilot report](qa/pilot-report.json) preserves that gate.

Normal target is **+15% over the pre-remaster chibi display size**, with per-hero requests of +18% for Điển Vi and +12% for Lữ Bố. Whole-clip alpha bounds cap visible height at 128 logical pixels and width at 170; the resulting actual enlargement stays within 10–20% for every current hero. One uniform X/Y scale is retained through approach, strike, hit, return and death; no limbs are stretched and no body-part transformation is used. Source scaling remains ≤1 at logical size; the 256 px sources are sufficient for the tested 1920×1080 output.

`chibiBattleAssets.json` stores measured frame/foot bounds. Static art uses measured lower-foot registration; real clip frames share their authored X registration and measured sole Y. `HeroAnimationController` updates origin on frame changes without changing scale. The art container stays on the configured formation anchor and carries the ground ring, sprite and attached flash.

The existing two columns × three rows per side remain, with frontline toward the center. Row anchors and the existing name/HP/rage stack spacing were adjusted together in `BATTLE_LAYOUT` to accommodate the larger art. Names sit below soles; subsequent rows clear the previous HUD and the final row clears the footer. The same red/gold textures and aspect ratios are preserved. No Continue/Pause buttons or visible team-counter banners were added.

## Honest animation capability

| Heroes | Idle | Attack | Hit | Death |
|---|---|---|---|---|
| Quan Vũ, Lưu Bị, Trương Phi | Original frames 0–5 | Original frames 6–13 | Original frames 14–17 | Original frames 18–23, then complete fade/hide |
| Other 20, including Triệu Vân, Điển Vi, Lữ Bố | Original still image | Safe whole-sprite approach/return and timed impact feedback | Short whole-sprite recoil/flash | Short dissolve, fully hidden |

No original run clips exist. Locomotion therefore moves the complete neutral sprite; a frozen strike pose is not carried home, and no running gait is claimed. Skill/ultimate for the three animated heroes reuses their original strike frames with existing hero VFX; dedicated skill, run, attack-2, critical, victory and facial/cloth clips remain missing. Static heroes are not described as having real idle/weapon/body animation. No separated anatomy, cutout rig, mesh deformation or generated adult art is used at runtime.

Normal attacks stop at a configured approach gap to leave room between bodies. The original strike contact frame is timed to the resolved Core impact. Short contact sparks and 100 ms normal hit flash add feedback; skill/critical flash lasts 180 ms. HP decreases over 160 ms; damage text remains pooled. Hit reactions never change scale or disassemble the character.

On confirmed HP zero, HUD hides, existing death frames finish where available, then sprite/ring/flash disappear completely. Static heroes dissolve. Slots remain empty and survivors do not move. Existing view restoration creates no duplicate sprite; no resurrection mechanic was invented. Natural result entry no longer waits for an unavailable victory clip. Skip keeps the existing immediate result path and single-transition guard.

## Changed modules

- `src/scenes/BattleScene.ts`: chibi-only actor creation, original identity mapping, HUD spacing and impact presentation; removed all rig loaders/adapters/socket branches.
- `src/ui/HeroAnimationController.ts`: original clip playback, per-frame foot alignment, safe neutral fallback for missing run frames.
- `src/ui/BattleCharacterView.ts`: Sprite-only lifecycle and original frame/static death behavior; no rig branch.
- `src/data/chibiBattle.ts`, `chibiBattleAssets.json`, `battleVisuals.ts`, `battleLayout.ts`: sizing/alpha/foot/layout metadata. Lobby sizing remains unchanged.
- `scripts/audit-chibi-battle.py`, `scripts/qa-chibi-battle.mjs`; `qa-battle-animation.mjs` now delegates to the active chibi QA.
- `tests/chibiBattle.test.ts`: canonical identities, bounded 10–20% enlargement, real-frame capabilities/feet and row/HUD clearance.

No Battle Core formulas, hero stats, rage, AI, VIP modifiers, campaign progression, rewards, SaveV2, Auth or Supabase schema/data were rolled back or changed for this restoration. Earlier unrelated uncommitted changes are retained.

## Verification

- Typecheck and standard Vite build PASS; the existing large-chunk warning remains.
- Standard regression: **255/255 PASS, 31 files**. Retained experimental unit tests do not mean the rejected rig is enabled or artistically approved.
- Actual Phaser WebGL + deterministic BattleEngine, isolated local fixture with Supabase requests blocked. No real account or online settlement E2E is claimed.
- 1920×1080, 1280×720, 844×390: full viewport, consistent scale, original silhouettes, feet/HUD separation, 6v6 mirrored layout, accurate touch/resize.
- Triệu Vân and Quan Vũ Attack/Hit/Death captures; six-hero gameplay including Lưu Bị, Trương Phi, Điển Vi and Lữ Bố. Additional desktop/mobile roster pages cover **all 23 original identities**, long names, source bounds and HUD clearance.
- **500 resolved actions, 100 per tested hero**, no formation drift; identical Core event streams at ×1–×4, auto combat, lethal disappearance, view restoration, reduced effects, visibility suspension and repeated Skip yielding one transition without local resource mutation.
- No adult rig/module/asset requests in the browser. The production JS bundle contains no remaster texture-path references. No deleted assets.

The exact performance sample/environment and browser assertions are in [full QA report](qa/report.json). It measures 180 frames at 1280×720; physical mobile hardware FPS is not certified.

Commands: `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`, `node node_modules/vitest/vitest.mjs run`, `node scripts/qa-chibi-battle.mjs`. Asset audit needs Python/Pillow; browser QA uses Playwright and installed Chrome. QA fixtures and additional captures stay under `.vite/chibi-*-qa`.

## Gameplay captures

- [1920×1080](qa/idle-1920x1080.jpg), [1280×720](qa/idle-1280x720.jpg), [844×390](qa/idle-844x390.jpg)
- [Quan Vũ strike](qa/pilot-guan-yu-attack-1280x720.jpg), [Triệu Vân hit](qa/pilot-zhao-yun-hit-1280x720.jpg)
- [Quan Vũ slot after death](qa/pilot-guan-yu-death-1280x720.jpg), [Triệu Vân slot after death](qa/pilot-zhao-yun-death-844x390.jpg)
- [Additional roster and long names](qa/roster-18-1280x720.jpg)

No commit, push, deployment, ZIP or video was created for this task.
