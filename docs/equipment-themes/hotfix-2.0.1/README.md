# Điêu Thuyền atlas hotfix v2.0.1

Applied the supplied replacement to `public/assets/equipment-themes/fx/dieu_thuyen/fx_loop_4x2.png`. Theme identity, texture key, animation key, playback rate and the eight source PNGs remain unchanged. Only the repaired atlas entry was added to `equipmentThemeAssets.json`; its loader explicitly uses `frameWidth:650`, `frameHeight:464`, `startFrame:0`, `endFrame:7`.

- Full PNG decode PASS: 2600×928 RGBA, 4 columns × 2 rows.
- All eight atlas cells match the original eight source frames pixel for pixel. Alpha is preserved, including the intentional translucent maximum of 140; there is no forced opaque background or alpha editing.
- All 80 pre-existing runtime PNGs, including assets of the other heroes and the individual Điêu Thuyền frames, retain their hashes. [Asset verification](asset-check.json).
- Real Phaser EquipmentScene PASS: actual atlas texture selected, eight frame definitions 0–7, all frame sizes 650×464, sixteen consecutive updates in correct cyclic order. Zero browser exceptions. [Playback report](qa/report.json).
- Visual captures inspected at 1920×1080, 1280×720 and 844×390: no new cropping, opaque box or alpha/checkerboard artifact.
- Typecheck and Vite build PASS; existing large-bundle warning remains.
- First parallel regression run: 261 passed, one Store test timed out at 5 seconds while build/browser were running. No test or gameplay code was changed. After those processes finished, the full suite ran with one worker: **262/262 PASS, 33 files**.

Reproduce browser QA: `node scripts/qa-dieu-thuyen-hotfix.mjs`. Serial regression: `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1`.

No other hero artwork, player data, Battle Core, SaveV2, equipment transactions or Supabase configuration was changed. No production deployment, commit or push was performed.

Screenshots: [1920×1080](qa/1920x1080.jpg), [1280×720](qa/1280x720.jpg), [844×390](qa/844x390.jpg).
