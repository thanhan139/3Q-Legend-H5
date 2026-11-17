# SOL 6.1 — Replace Battle Hero Static Assets Safely (3Q Legend H5)

Attach `3Q_Legend_Hero_Remaster_Static_Sprites_v1.0.zip` and use this instruction.

## Objective
Replace the ugly/deformed/chibi **battle character visual textures** with the 12 individual full-body PNGs in `sprites/normalized/`, without changing combat logic. The asset sheet MUST NOT be used as a single runtime texture; every character has its own alpha PNG and a mapping. This is an art replacement and staging QA, NOT a claim that sprite-body animation has been completed.

## Checklist
1. Inspect repo, current BattleScene/BattleCharacterView, asset loader, HeroConfig IDs, existing animation controller and tests. Read `README_FOR_SOL.md`, `ASSET_MANIFEST.csv`, and `HERO_MAPPING.json`.
2. Compare each provisional hero label to HeroConfig and source character identity. Do not guess hero IDs or accidentally replace heroes with the wrong artwork. If mismatch, document and keep fallback.
3. Import the individual `sprites/normalized/*.png` as separate textures (and optionally trimmed versions for performance). Preserve correct aspect ratio, avoid texture bleeding and pixelated downscales; do not stretch only the legs. Use a common ground foot anchor (0.5, 418/448); tune **visible artwork** height consistently, adapt to different slot size and mobile landscape.
4. Maintain formation left vs right, 2 columns × 3 rows per side, 6v6; feet visible, no overlap with nameplate or HP/Nộ, no character covering bottom combat controls. Ground shadows are separate game objects; draw order according to feet.
5. Sync characters to actual combat events. On `dead`, clear full character view, HP/Nộ bars, nameplate and attached VFX. Empty slot remains empty. Revive only if Battle Core supports it. Battle Core must decide event outcomes.
6. For these **static** sprites, do NOT invent true run/attack/skill animations. Any temporary idle/impact tween must be explicitly identified as placeholder. If genuine rig/sprite-sheet animations are missing, produce a specific asset task list (per hero: idle/run/attack/hit/death) and leave compatible adapter hooks.
7. Do not delete old texture files at the start. Update references, build and test, confirm fallback compatibility, then remove only demonstrably unused files after dependency search. No save reset and no Supabase data change.
8. Preserve gold-red Battle UI and approved controls: speed x1/x2/x3/x4 according to current rules, Skip with eligibility, no Continue/Pause or Quân Ta/Quân Địch banners.
9. Test 1920×1080, 1280×720, 844×390 landscape. Verify every full-body sprite from head to toe, large/short silhouettes, alpha edges, nameplate separation, and performance. Run typecheck/build/regression. Take actual gameplay screenshot; compare against preview contact sheet (not only a composite mockup).
10. Report precise files changed, 12 hero mappings, QA issues, actual animation coverage. Do NOT claim full animation is delivered by this ZIP. No production deploy. No extra ZIP or video.

**Acceptance:** User sees 12 distinct readable full-body adult hero sprites in correct slots, no shredded faces/armor/legs. Hero art may remain still pending animation production; avoid falsely claiming completion.
