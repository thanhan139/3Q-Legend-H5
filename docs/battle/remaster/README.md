# Hero Remaster integration — 2026-11-17

**REJECTED / DISABLED:** the user rejected this articulated adult rig. It is no longer imported, loaded or rendered by BattleScene. Files and assets below are historical records only. Current implementation and QA: [original chibi restoration](../chibi/README.md).

Status: **working five-hero articulated pilot; full roster and final production art acceptance remain PARTIAL**. This replaces the earlier character capability report in `docs/BATTLE_ANIMATION_PIPELINE.md`.

## Inputs and honest asset status

Read both supplied ZIPs: Static Sprites README/PROMPT, manifest/mapping/contact sheet; Animation Blueprint, README, profile/formation/event templates, roster audit, QA matrix and implementation prompt. Original twelve normalized PNGs and source documentation are archived in `source/`; specification files are in `blueprint/`.

The Static kit contains **static 448×448 RGBA images**, not animations or hidden layers. The Blueprint contains **specifications**, not 876 finished frames. Neither kit can be renamed to an animated atlas. Their names/factions are provisional; `INTEGRATION_AUDIT.json` records the actual HeroConfig mapping and hashes.

| Static source | Current HeroConfig ID | Runtime status |
|---|---|---|
| trieu_van | zhao-yun | Adult articulated pilot |
| quan_vu | guan-yu | Adult articulated pilot |
| luu_bi | liu-bei | Adult articulated pilot |
| truong_phi | zhang-fei | Adult articulated pilot |
| dien_vi | dian-wei | Adult articulated pilot, two axes |
| gia_cat_luong | zhuge-liang | Static reference only; old renderer retained |
| ha_hau_don | xiahou-dun | Static reference only; old renderer retained |
| tao_hong | cao-hong | Static reference only; old renderer retained |
| hoa_hung | hua-xiong | Static reference only; old renderer retained |
| hoang_trung | absent | No invented hero or substituted ID |
| truong_lieu | absent | No invented hero or substituted ID |
| tao_nhan | absent | No invented hero or substituted ID |

23 configured heroes exist; **18 still lack an adult rig**. Old character assets are retained for rollback and honest fallback, including Lữ Bố in QA screenshots. Existing three chibi sheets contain idle/attack/hit/death frames; the shared character atlas is otherwise static. Battle UI textures are separate and unchanged. Whole concept/contact sheets are never runtime characters or backgrounds.

## Actual animation source and runtime

Built-in imagegen repainted coherent, separately occluded body parts using the new per-hero static sprites as identity references. Exact prompts/tool/output paths are in `PROMPTS_V2.json`; `PROMPTS.json` records the prior exploratory version. Runtime art is `public/assets/battle/remaster/{heroId}/parts-v2.png` with sixteen named frames, not a full-body PNG being translated. All original generated PNG bytes/alpha are retained; importer only analyzes bounds and writes frame metadata. Trương Phi's first opaque output was rejected and corrected through the image editing tool.

Native Phaser cutout hierarchy: torso/head, shoulder → elbow → hand, hip → knee → boot, separate cape/hair/skirt/beard, attached weapon(s). Polearms use two-bone IK for both hands. Hair follows the head/torso attachment; cloak follows the shoulders, including collapse. Uniform part scaling preserves source aspect ratio. This is an articulated **rigid cutout rig**, not Spine, weighted mesh deformation, or hand-drawn frame animation.

Implemented seven requested states: idle breath/secondary motion; alternating run legs with bending knees; attack windup/contact/recovery; hero-specific skill body/weapon keyposes; hit recoil with alternate expression; jointed death collapse and disappearance; victory pose. Ready, critical hit and secondary attack variants also exist. The current skill and rage/ultimate routes share each hero's skill pose family; no separate cinematic ultimate atlas is claimed. Faces do not have a separately authored blink/lip animation.

- Triệu Vân: spear thrust and directional flourish.
- Quan Vũ: weighted guandao sweep with two-handed grip.
- Lưu Bị: paired blades and commander cast pose.
- Trương Phi: heavy spear strike/braced legs.
- Điển Vi: paired axe lift and heavy strike pose.

`src/data/characterRemaster.ts` and `characterRigs/*.json` register art and provenance. `BattleCharacterRig.ts` assembles it, exposes hand/weapon-tip/head/chest sockets and IK, `characterRigPose.ts` owns keyed motion, and `RigAnimationController.ts` owns state/rate/update lifetime. Import: `python scripts/import-character-rig.py HERO SOURCE.png v2`; only reviewed identities are accepted. Audit: `python scripts/audit-character-remaster.py`. New heroes need authored parts and weapon-specific pivots/poses plus visual review; don't force an unrelated source image into the registry.

## Combat boundary and timing

The existing BattleEngine resolves damage, targeting, rage, deaths, turns and outcome. `BattleAnimationEventBridge` consumes that ordered stream, cancels stale generations and delivers each indexed presentation event once. There is no animation-triggered damage or reward mutation. The rig implements the same character adapter as legacy frame sheets, through `BattleCharacterView`.

Existing Formation Layout Config stays two columns × three rows per side, with the same foot slots and approved UI. No UI redesign, core/stat formula, VIP entitlement, SaveV2 or Supabase changes were made for this remaster. Earlier unrelated uncommitted changes remain in the workspace.

The visual contact keypose is at **64%** of its clip; duration derives from the existing resolved-impact delay instead of changing Core cadence to match the Blueprint's sample coordinates/timings. Scene clock, tween delta, rig/frame updates and VFX all share the current speed/suspend settings. Hand sockets feed skill casting/projectile origins for converted heroes.

Death: terminal until a legitimate view restoration; body collapses during 0–300 ms, fades during 300–650 ms and then body/shadow/HUD are fully hidden. Reduced effects shortens the fade. Slots never reflow. At natural battle end, living winners get 800 ms for victory before the existing result path; Skip cancels and transitions immediately, guarded once. VS remains opening-only. Core currently has no resurrection mechanic: only the existing view restoration contract is tested, no resurrection gameplay was added.

## Verification and remaining acceptance work

Actual Phaser WebGL BattleScene + deterministic BattleEngine, isolated local fixture with Supabase requests blocked. No QA rewards or fake transactions are granted to an online account. Run `node scripts/qa-battle-animation.mjs` and `node scripts/qa-character-rigs.mjs`; generated fixtures/captures live under `.vite/`.

Browser checks: 1920×1080, 1280×720, 844×390; full viewport, head-to-boot visibility, 6v6 slots, ten rigs plus two legacy fallback figures, normal attack approach/impact/return, five rage skills, KO hiding, single-view restoration, **500 actual resolved actions without slot drift (100 per pilot)**, identical Core event logs at forced ×1/×2/×3/×4, Auto, touch speed/Skip, pause/resize, visibility suspension, reduced effects, victory then one result transition, repeated Skip without duplicate transition or local resource mutation. Forced ×3/×4 in the fixture grants no player entitlement. Seven rig states are also captured at enlarged inspection scale, with finite geometry/state assertions. Before/after captures use the actual renderer; no mockups or video are substituted.

`qa/report.json` records observed performance, browser errors and scope. The measured window is 180 frames at 1280×720 with ten active rigs on the reported Intel UHD 620 renderer; it is a short headless desktop sample, **not a mobile-device performance certificate or twelve-rig certification**. Five RGBA atlases consume approximately 30 MiB decoded, excluding UI/legacy textures and driver overhead.

Functional QA passing does not mean final art acceptance. Enlarged rig captures still show areas for artist cleanup: shoulder/armor overlap, duplicated rear hair baked into head pieces, cloth intersections and rigid cutout transitions at extreme poses. There is no weighted cloth/skin deformation or fully authored finger grip animation. Final source layers/mesh or coherent drawn frames are needed before claiming cinematic production quality. Sound completion, all-roster adult animation, twelve distinct simultaneous adult rigs, physical mobile FPS, live server settlement replay and genuine Core resurrection remain unverified/not implemented. Existing regression coverage is not a claim that every visual DOT/counter/boss case has been individually captured.

See `qa/` for gameplay desktop/mobile/1920 captures, legacy baseline, strike, empty KO slot and victory; `INTEGRATION_AUDIT.json` for the missing-source list. Build/typecheck/regression results are recorded after the final run in `QA_RESULTS.md`. No commit, push or deployment was performed.
