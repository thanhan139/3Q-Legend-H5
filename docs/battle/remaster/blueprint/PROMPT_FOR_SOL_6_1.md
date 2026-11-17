# PROMPT FOR SOL 6.1 — 3Q Legend H5 Hero Animation Pilot + Full Rollout

**Input attachments:**
1. `3Q_Legend_Hero_Animation_Blueprint_v1.0.zip` (this package).
2. `3Q_Legend_Hero_Remaster_Static_Sprites_v1.0.zip` (existing 12 adult static references).
3. Current 3Q Legend H5 Phaser 3 + TypeScript source, current Battle screenshots and any already-approved character art.

## Task

Read `HERO_ANIMATION_BLUEPRINT.md`, templates and QA matrix carefully. Make the characters **genuinely animate** in the real Battle scene, in adult heroic style, while preserving 6v6 combat gameplay.

**Do not assert animation is complete because a static PNG has a tween.** Current 12 images are static 448×448 references. They do not include true motion frames or rig source. Distinguish art tasks requiring new source assets from implementable code tasks. If authoring tools or artwork are missing, report the exact missing deliverables and complete the architecture, pilot integration and validation possible now; do not fabricate final animations.

## Work steps

1. Audit repo Battle Core event flow, sprite/atlas/rig assets, current art mappings and animation mechanism; identify broken remaster and stale textures.
2. Verify the 12 provisional Hero keys and align against real HeroConfig IDs. Do not replace hero identities by position alone.
3. Build real P0 animation source first for **Triệu Vân (spear)** and **Điển Vi (heavy axes)**; commission/create unique coherent full-body frame sequences or a supported skeletal rig. Required P0: idle, ready, run, attack_1, skill, hit, death, victory. Acceptability requires visible alternating leg movement and weapon/body articulation, not whole-image bouncing.
4. Implement real `HeroView`, `CharacterAnimationController`, `BattleVisualScheduler`, `FormationLayout`, `VFXPool` following existing architecture, using animation marker sockets and core's already resolved actions. Preserve authoritative results.
5. Use 2 columns × 3 rows per side, frontline toward center; full feet visible, character sizes balanced. When HP reaches 0: play death clip -> remove all visuals/status HUD -> empty slot; no reflow. Revive goes to original slot.
6. Preserve automatic battle; **Tốc độ** and **Bỏ qua** only; no Continue/Pause, no Quân ta / Quân địch banners. Speed only cycles values allowed by existing VIP entitlements. Skip must not double-award.
7. Capture actual before/after gameplay for both pilot heroes at x1/x4 and mobile 844×390. Run QA-01 through QA-18, typecheck/build/regression and combat event consistency tests. Report test failures accurately.
8. After pilot approval, expand same pipeline to remaining 10 heroes in distinct weapon archetypes, preserving faces and silhouettes, without blindly copy-pasting pose loops.
9. Replace old character textures only after safe reference audit and regression. Preserve rollback. Do not modify SaveV2, Supabase data, Summon, VIP economy, battle math or deploy Production.

## Deliverables

- List of file changes and exact animation asset paths actually created.
- Pilot spritesheets/rigs (only if genuinely produced), atlas metadata, clip registration, animation markers.
- Before/after real Battle screenshots + at least short captured motion evidence if available.
- Audit of missing animation frames/rig data per hero.
- Typecheck/build/tests results and frame-rate measurements.
- Honest milestone status: DONE / PARTIAL / BLOCKED with evidence.

**Quality gate:** A working expressive 2-hero pilot with real anatomy and weapon movement is better than 12 fake moving PNGs. No production deployment without explicit approval.
