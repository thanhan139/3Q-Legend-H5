# Prompt to Codex — 3Q Legend H5 / Summon Results UI + Pity Update

Use this ZIP: `3Q_Legend_Summon_Complete_Asset_Kit_v1.0.zip`.

1. Read `README_FOR_CODEX.md`, `ASSET_MANIFEST.csv`, `PHASER_TEXTURE_MAPPING.json`, `VISUAL_QA_CHECKLIST.md` and `SUMMON_BALANCE_SPEC.md`.
2. Audit latest `src/scenes/SummonScene.ts`, `src/domain/summon.ts`, `src/data/heroes.ts`, server `game-command`, `GameStore`, Inventory, SaveV2 and tests. The previous code snapshot is only background information: latest source is authoritative.
3. Import only `assets/` PNGs with real texture keys from manifest. Do NOT use full reference images as live UI, do NOT render Phaser text over captions baked into images.
4. Rebuild the 1-pull and 10-pull RESULT screen to match the reference: ornate title, 2×5 results grid, 4 tier-specific frame textures + glows, real hero portraits with correct aspect ratio / crop, live hero names, faction, rarity, state (`Tướng mới` / `+10 mảnh` from server response), bottom buttons. IMPORTANT: no text clipping or broken Vietnamese glyphs. Text must be rendered from correct font loaded in app, use measured bounds / contentRects.
5. Keep `assets/summon/hall.webp` in source if newer/better than the optional background here. Keep current hero art; do not use a constant portrait or upscale low-quality screenshot crops.
6. Add clean animation reveal with rarity-based effects (R blue / SR violet / SSR gold / SSS+ gold-red), support reduced motion and skip reveal. Never run reward code twice during animation.
7. Implement proposed base rates R 75%, SR 20%, SSR 4.2%, SSS+ 0.8% and hard pity SSR-or-higher 50, SSS+ 100 **only after owner approves**. Pity must be enforced by authoritative server action, persisted with inventory and transactions; update client UI to match confirmed server config. User explicitly requested these 50/100 thresholds.
8. Preserve existing user data and update pity migration safely from 200 to 100. No local-only payout and no duplicate claim. One key per pull.
9. Regression tests: 1-pull, 10-pull, 49/50 and 99/100 boundaries, duplicate shard, interrupted animation, reload, wrong UID, insufficient keys, transaction replay, CORS/error handling and reconciliation after reconnect.
10. Visual QA 1280×720, 1920×1080 and mobile 844×390 landscape. Confirm all titles/names inside frames and portraits not pixelated. Inspect screenshots against `reference/APPROVED_results_screen_concept.png`.
11. Build/typecheck/tests; commit to staging only after verification. Do not deploy production or alter unrelated systems. Report concise findings and any asset requiring cleanup. No extra ZIP/video.
