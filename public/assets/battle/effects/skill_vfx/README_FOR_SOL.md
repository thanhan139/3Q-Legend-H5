# 3Q Legend H5 — Skill VFX Pack v0.1

## Contents

- `original_sheets/`: 3 generated RGBA sheets (keep as editable source reference).
- `isolated_vfx/`: 29 manually cropped transparent RGBA PNG effects, suitable as overlays; crops may retain neighboring glow and need visual cleanup.
- `ASSET_MANIFEST.json`: file paths and dimensions.

## Suggested skill composition

1. **Quan Vũ — Thanh Long Trảm:** `azure_dragon_arc` + `green_blade_wave` + `blue_crescent_slash` + `blue_star_impact`. Trigger at the attack contact frame.
2. **Trương Phi — Bá Vương Chấn Địa:** `fiery_crater` + `gold_shockwave` + `rock_debris` + `dust_cloud`. Anchor to the target/ground plane.
3. **Triệu Vân — Long Đảm Thiên Kích:** `blue_spear_dash` + `blue_lightning_trail` + `blue_star_impact`. Attach dash trail to weapon/actor and hit flash to target.
4. **SSR summon (optional):** `gold_magic_circle` + `ssr_purple_burst` + `gold_starburst`, and rarity-appropriate effects.

## IMPORTANT: Limitations

- These are **static VFX images / concept elements**, NOT frame-based skill animations or production-ready atlases. There is no real temporal frame sequence or verified particle setup.
- Phaser can render overlays, tween scale/opacity/rotation, combine effects and particles; for high-quality frame animation, create genuine sequential frames in Effekseer/Spine or paint a real sequence. Do not claim that 29 static images are 29 frames of one animation.
- The generated sheets have semi-transparent halo artifacts and some cropped regions may contain adjacent effects. Clean alpha/matting and check composition on both dark and bright battle scenes before shipping.
- Determine anchor, impact timing, blend mode and performance budget in the project; keep Battle Core logic authoritative.

## Example Phaser integration (design direction)

Place PNGs under `public/assets/vfx/`. Load via `this.load.image(assetKey, path)`; display with `this.add.image(x,y,assetKey).setDepth(vfxLayer).setBlendMode(Phaser.BlendModes.ADD)` where appropriate, then tween alpha/scale and destroy on completion. Prevent double triggers and clean up when Scene stops.
