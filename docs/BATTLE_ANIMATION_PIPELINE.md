# Battle character presentation — 2026-11-17

**Historical report.** Current runtime has returned to original chibi characters; see [battle/chibi/README.md](battle/chibi/README.md). The adult articulated rig was rejected by the user and is disabled. Earlier limitations/test counts below are retained as history.

Follow-up UI integration: see `docs/battle/UI_KIT_INTEGRATION.md`. The new kit intentionally removes visible team counters and pause/continue controls; internal living counts and pause/visibility synchronization remain. It adds the premium backdrop, decorated HUD and a dynamic forecast queue without altering combat.

## Delivery status

The presentation/lifecycle changes run in the real BattleScene. **The supplied adult-body art target is not met by the existing runtime assets.** The three existing frame sheets are chibi, and the other twenty roster heroes are single full-body illustrations. No adult character art, articulated rig, running gait, dedicated ultimate pose or sound set was supplied. Static illustrations have not been relabelled as complete character animation.

## Runtime modules

- `src/data/battleLayout.ts`: mirrored two-column/three-row positions, indexed by the existing Core slots. Slots 0–2 stay the front line; slots 3–5 stay the back line. Origins are foot anchors. Empty/dead slots never compact.
- `src/data/battleVisuals.ts`: separate Battle-only visible-art limits; the shared Lobby sizing is preserved. The three animated heroes use the maximum footprint across their clips to reserve room for weapons. Characters retain uniform X/Y scale.
- `src/ui/HeroAnimationController.ts`: state controller and sprite adapter. Same-state playback does not restart each frame; death is terminal until an explicit visual restoration. A `CharacterClipSet` can supply dedicated ready/run/attack2/skill/ultimate/criticalHit/victory clips without changing Battle Core. `supports(state)` distinguishes a dedicated clip from a reused pose.
- `src/ui/BattleCharacterView.ts`: foot anchoring, grounded hit recoil, death/fade, hiding the entire character/shadow and HUD, and restoring one existing view to its original slot. Static heroes dissolve; frame heroes play the existing death clip and then disappear. No permanent gray statue or KO label remains.
- `src/ui/BattleAnimationEventBridge.ts`: cancellable generation and one-time event delivery on the scaled Phaser clock. A Core step resolves the ordered event stream first; the bridge never computes or applies combat damage. Skip/shutdown cancels pending delivery.
- `src/ui/BattlePresentationClock.ts`: feeds the same game delta to the scene's TweenManager. Phaser 3.90 otherwise uses `Date.now()` for tweens, which can diverge from smoothed timer/sprite deltas. The original tween clock is restored on scene shutdown.
- `src/ui/SkillVFXManager.ts`: reused VFX manager with reduced-effects/quality settings and synchronized particle rates. Projectiles originate near the hand/weapon area rather than below the feet.
- `src/scenes/BattleScene.ts`: ready, approach, strike, confirmed impact, reaction, return; smooth HP changes; living counts; pooled damage text. Scene clock, tweens, sprite clips and particle emitters share pause/rate changes. Document visibility suspends presentation and further Core steps. VS is a short opening overlay and is destroyed before the first action.

No damage formula, hero stats, AI, rage, campaign result, VIP modifier, Summon, SaveV2, database schema or authentication changes were made for this task. Existing earlier uncommitted VIP/backend work remains separate. Reward settlement still belongs to the existing Result/server path.

## Asset capability audit

Runtime audit scope: `public/assets/battle/heroes/**`, `public/assets/heroes/battle-sprites.webp`, and the 23 IDs in `src/ui/heroPresentation.ts`. See `docs/battle/CHARACTER_ASSET_AUDIT.json` for file hashes and capabilities.

| Characters | Real clips now available | Limitations |
|---|---|---|
| Lưu Bị, Quan Vũ, Trương Phi | IDLE frames 0–5, ATTACK frames 6–13, HIT frames 14–17, DEATH frames 18–23 | Existing 6×4 sheets, 256 px cells, chibi art |
| Other 20 roster IDs | Static full-body frame only | No limb, cloth, hair or gait animation |

READY uses the first strike pose when no dedicated clip exists. SKILL/ULTIMATE reuse the strike clip plus the existing hero-specific VFX; CRITICAL_HIT reuses the hit clip with stronger grounded recoil. These are **not dedicated new character clips**. RUN currently moves the character root while holding a pose; it is **not a running cycle**. ATTACK_2 and VICTORY have state hooks but no dedicated art. No breathing-scale tween is applied to static heroes.

To complete the requested art direction, supply adult 7–8-head full-body atlases or a properly segmented/weighted rig for all 23 heroes, preserving costume/weapon identity. Required clips: idle, ready, run, strike/contact/recovery, secondary strike if used, skill, ultimate, hit, critical hit, death and victory. Include stable foot/pelvis registration, weapon/hand sockets and contact markers. Export transparent sRGB frames with equal canvas dimensions, 2–4 px padding/extrusion and no baked text/UI/shadow. Add preload entries and pass each hero's clip ranges/contactFrame via `CharacterClipSet`; never substitute another hero's portrait. A future rig adapter can implement the same state/rate/lifecycle boundary.

## Verification

- Typecheck and production build pass. The existing Vite bundle-size warning remains.
- Regression after UI integration: **234/234 tests**, 26 files. New tests verify mirrored front/back slots, cancellation/duplicate-impact isolation, tween-clock binding/restoration and queue scheduling/non-mutation.
- `node scripts/qa-battle-animation.mjs`: actual Phaser WebGL scene and actual deterministic BattleEngine with explicit isolated local fixtures; Supabase network is blocked. Screenshots are gameplay renders, not mockups. No account resources are granted.
- The software-rendered QA fixture disables delta smoothing to avoid the warm-up clamp causing wall-clock timeouts. The pre-contact screenshot uses twenty controlled 60 Hz game steps and verifies both approach movement and unchanged HP. Production FPS/smoothing configuration is unchanged; this is a correctness test, not a 60 FPS performance certification.
- Layout captures at 1920×1080, 1280×720 and 844×390. Twelve views in two columns/three rows per side; six views have real sprite animation in the selected symmetric six-hero fixture. Static heroes remain an asset limitation, so **twelve fully animated characters is not passed**.
- Checks cover idle frame advancement, attack approach/return, unchanged displayed HP before contact, confirmed KO and complete HUD/art hiding, 5/6 count, view restoration without duplicate sprites, the three existing animated heroes' ultimates, identical Core streams at forced presentation rates x1–x4, automatic battle updates, touch speed/pause controls, pause/resize, synthetic visibility suspend/resume, reduced-effects mode, opening-only VS, and two skip touches yielding one result transition. Practice UI still exposes only its existing x1/x2 choices; forced x3/x4 is an isolated presentation test, not a VIP unlock.
- Visual restoration is tested through the view contract only. Battle Core has no resurrection mechanic, and none was added. No real Supabase login, server settlement replay, payment or live account E2E is claimed.
- Rendering remains configured for 60 FPS. The earlier SwiftShader/software-rendered sample reported about 40 FPS; this is not a controlled hardware benchmark. Desktop/mobile hardware 60 FPS remains unverified. No real-device touch/performance, art fidelity to the adult reference, dedicated running/ultimate/victory animation or combat audio completion is claimed.

Local ignored artifacts: `.vite/battle-animation-qa/report.json`, `intro-vs.jpg`, `idle-{width}x{height}.jpg`, `normal-strike.jpg`, `ko-empty-slot.jpg`, `ultimate-dragon.jpg`, `ultimate-liu-bei.jpg`, `ultimate-zhang-fei.jpg`. The frame contact sheet `.vite/battle-pose-audit.jpg` is an audit artifact only and is never loaded into gameplay.

No commit, push or deployment performed.
