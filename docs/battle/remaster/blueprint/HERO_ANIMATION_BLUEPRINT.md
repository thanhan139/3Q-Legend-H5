# 3Q LEGEND H5 — HERO ANIMATION PRODUCTION BLUEPRINT v1.0

**Project:** 3Q Legend H5 · Phaser 3 + TypeScript · 6v6 online battle  
**Status:** DESIGN SPEC / NOT IMPLEMENTED  
**Scope:** 12 starting hero appearances, animation pipeline, event bridge, character motion, VFX, QA  
**Source:** `3Q_Legend_Hero_Remaster_Static_Sprites_v1.0` (12 static 448×448 PNGs)

> **Truthful asset status:** Current cutout images are static. No fully animated combat sprites, skeletal rigs, body-part layers, or motion clips have been supplied. This package contains a technical blueprint and editable configuration samples, **NOT finished animation assets**. An artist/asset generation workflow must deliver additional motion source art.

## 1. Approved creative direction (LOCK)

- Heroic Three Kingdoms style, cohesive mature proportions (~6.5–7.5 heads, adjusted for character stature). Do not stretch chibi PNGs into fake adult anatomy.
- Strong silhouettes and distinctive weapon, hair, armor, cloak; each hero's characteristic identity and faction must be cross-checked against **actual HeroConfig IDs** before final mapping.
- Full body including **both feet** visible in idle and normal battle state; no clipping behind status bars; face and weapon readable at normal gameplay size.
- 6v6 per team **two columns × three rows**. Inner column is frontline; outer column is backline. Left allies face right; right enemies face left. Do not reorganize survivors when one dies.
- Battle is automatic. Keep existing **Tốc độ** and **Bỏ qua** entitlement/logic. Do not reintroduce Continue or Pause controls, or removed Team banners.
- HP zero -> death performance -> no character, nameplate, HP/Rage bars, shadow, persistent ring or attachment. Slot remains empty until a legitimate revive.
- Animation is **presentation only**. Battle Core / authoritative backend decides damage, targeting, statuses, death, skill costs, rewards and turns.
- Do not render mockup PNGs as battle backgrounds with burned-in heroes or dynamic counts.

## 2. Render layout and anchors

Coordinate system: logical reference 1280×720; design and test full viewport at 1920×1080, 1280×720 and 844×390 landscape. Treat coordinates as sample **layout tokens** in `templates/battle_formation.example.json`, not hard-coded positions inside actor classes.

| Token | Value, reference pixels | Purpose |
|---|---:|---|
| Allies backline X | 170 | Left outer column |
| Allies frontline X | 420 | Left inner column |
| Enemies frontline X | 860 | Right inner column |
| Enemies backline X | 1110 | Right outer column |
| Row feet Y | 240, 395, 550 | Three vertical rows |
| Arena safe top/bottom | 112 / 605 | Protect header and bottom controls |
| Hero visible body height | target 110–135 | Scaled presentation size; tune per viewport |
| Ground origin / foot anchor | `(0.5, 0.933036)` | **Existing normalized 448×448 static images only** |
| Attack facing | ally +1, enemy −1 | Swap weapon orientation only if art can safely be mirrored |

For new animation atlas output, use **metadata anchors** per frame and attach to an invariant `foot_anchor` in actor-local coordinates. Do **not** blindly reuse 0.933036 for newly trimmed frames. Weapon trajectories, afterimages, projectiles and hit sparks should use sockets (`hand_r`, `hand_l`, `weapon_tip`, `chest`, `head`). Runtime changes shape, scale and depth only, never HeroConfig identity.

Responsive: the arena and HUD use separately computed regions. At 844×390, simplify nonessential captions and Battle Log as needed, not the units. Reserve margins for safe area; cap font shrink; never stretch hero independently in X/Y. Center-based stage fit with background cover and responsive UI positioning should avoid black bars.

## 3. Asset production: choose actual art source

**Path A — Frame animation (recommended first shipping route):** Draw/produce sequence of coherent full-body frames for each state; export trimmed frames packed in 2048² or 4096² atlases as GPU allows. Each frame keeps consistent `footAnchor`; width includes sweep of weapon. Use Phaser Sprite animation system. This is straightforward to test and avoids runtime rig/plugin compatibility risks.

**Path B — Genuine 2D skeletal/mesh rig (optional later):** Repaint original static full-body art into coherent separated parts, including occluded anatomy, hands, arms, thighs/shins/feet, hair strands, cloak panels, weapon and joints; define bone hierarchy, weights/deform meshes, IK legs, weapon sockets. Export with an actually integrated compatible runtime (Spine/other verified toolchain). Licensing and Phaser plugin version must be verified before production. A single PNG does not become a real skeletal rig by splitting at arbitrary rectangles.

**Source authoring recommendations:** layered originals at ≥768 px tall / hero (or vector equivalent); runtime display height ~110–135 reference pixels. Frames can use 512×512 logical bounds for compact poses, larger per-move bounding rectangle where long weapons require it; **trim + atlas packing + per-frame anchor correction** are mandatory. Keep lossless RGBA with genuine transparency, no baked checkerboard and no premultiplied-edge artifacts. Use texture sampling/art smoothing appropriate to scale. Exclude labels, damage numbers and HP bars from character textures.

**Art QA gate:** Same face, hair silhouette, anatomy, armor engravings, weapon silhouette and dominant palette across all frames; physical legs and feet animate; both hands grip consistently; no AI-morph artifacts, extra fingers or disconnected joints; blade remains intact at peak swing.

### Rig parts when using B (minimum naming)

```
root > pelvis > torso > chest > neck > head
             > upper_arm_l > forearm_l > hand_l
             > upper_arm_r > forearm_r > hand_r > weapon_grip > weapon_tip
     > thigh_l > shin_l > foot_l
     > thigh_r > shin_r > foot_r
     > cloak_root > cloak_l, cloak_r
     > hair_root > hair_strand_01…
```

Additional weapon-specific attachments: `shield_grip`, `bow_string`, `arrow_spawn`, `fan_tip`, `projectile_spawn`. All joints and bones must be layered so the missing rear/occluded geometry is redrawn, not inferred by crude stretches.

## 4. Canonical clips & minimum frame budget

**First production set (P0)** includes idle, ready, approach, attack_1, skill, hit, death, victory (with visual root movement handled by FormationMovement); **P1** adds attack_2, ultimate, spawn, evade, guard, knockback/launch. A fallback clip may be used temporarily only if explicitly marked partial.

| Clip key | Frames (target) | Playback FPS | Loop | Duration (approx) | Notes |
|---|---:|---:|---|---:|---|
| `idle` | 8 | 10 | yes | 800 ms | Breath, blink, cape secondary motion; smooth loop |
| `ready` | 5 | 12 | no | 417 ms | Set stance before action |
| `run` | 8 | 12 | yes | 667 ms per cycle | Real alternating footfalls, feet contact ground |
| `attack_1` | 12 | 18 | no | 667 ms | Windup → contact → follow-through, see timeline |
| `attack_2` (P1) | 12 | 18 | no | 667 ms | Distinct silhouette, not replay + rotation |
| `skill` | 14 | 16 | no | 875 ms | Cast/weapon skill, impact marker or projectile release |
| `ultimate` (P1) | 20 | 20 | no | 1000 ms | Story/hero-specific heroic strike |
| `hit` | 6 | 15 | no | 400 ms | Push/recover; no attack continuation unless allowed |
| `guard` (P1) | 6 | 15 | no | 400 ms | Brace or parry |
| `evade` (P1) | 8 | 16 | no | 500 ms | Translate body/footwork correctly |
| `death` | 12 | 15 | no | 800 ms | Body drops/fades; slot cleared after completion |
| `victory` | 8 | 10 | no | 800 ms | Subtle post-battle flourish |
| `spawn` (P1) | 8 | 12 | no | 667 ms | Revive/entry animation |

Counts are **targets, not already-created frames**. P0 initial distinct frame count per hero = 8 + 5 + 8 + 12 + 14 + 6 + 12 + 8 = **73 frames** (excluding root movement). Twelve heroes ≈876 frame images before atlas packing; this is a production workload estimate, not existing assets. Prioritize quality over generating the full set at once.

### Weapon-class-specific motion

| Class | Heroes to prototype / verify | Required impact performance |
|---|---|---|
| `spear` | Triệu Vân, Trương Phi | Rear-foot push, hip rotation, spear thrust, strong tip trail |
| `guandao` | Quan Vũ | Weighty 2-handed windup, curved blade arc, leg brace |
| `sword` | Lưu Bị, Hạ Hầu Đôn, Tào Nhân (verify) | Crisp slash, wrist / shoulder follow-through |
| `bow` | Hoàng Trung | Bow draw, elbow tension, arrow release, projectile arrival |
| `fan_caster` | Gia Cát Lượng | Fan gestures, spell windup, projectile/area effect timing |
| `heavy_axes` | Điển Vi | Broad anticipatory lift, heavy strike, delayed recovery |
| `halberd` | Trương Liêu (verify) | Combined cut and thrust, follow-through |
| `onehand_weapon` | Tào Hồng (verify) | Fast slash/hit timing |
| `mace` | Hoa Hùng (verify) | Heavy overhead swing, ground impact |

Each hero must have unique timings and silhouette. Do not simply recolor another hero's action animation.

### Character personality / distinct animation signatures (art concept; verify existing HeroConfig and source artwork)

| Hero | Idle / personality | Attack / skill signature | Hit / death direction |
|---|---|---|---|
| Triệu Vân | Upright, focused, spear lowered then poised | Fast spear thrust, step-through, precise recoil | Short stumble; disciplined recovery |
| Lưu Bị | Composed commander, subtle robe/hand motion | Restrained sword slash; confident pose | Protective brace; light recoil |
| Quan Vũ | Heavy stillness, beard and green cloak inertia | Powerful sweeping guandao arc with hip rotation | Almost immovable block; controlled fall |
| Trương Phi | Aggressive forward weight, loud breathing | Explosive spear thrust/overhead strike | Powerful staggering reaction |
| Hoàng Trung | Calm archer, steady breathing/aim | String draw, arrow release, follow projectile | Small side recoil and defensive lean |
| Gia Cát Lượng | Elegant fan gestures, robe movement | Fan cast, talisman wind, projectile release | Guard with fan and step back |
| Hạ Hầu Đôn | Dominant warrior, sword resting low | Heavy saber diagonal cleave | Rigid shoulder recoil |
| Trương Liêu | Tactical guard, ready stance | Halberd/spear rush and controlled cut | Quick footwork recovery |
| Điển Vi | Heavy planted stance, shoulder/torso motion | Two-axe overhead strike with anticipation | Strong backward momentum, long recovery |
| Tào Hồng | Agile ready pose | Quick one-hand weapon combo | Fast flinch and reset |
| Hoa Hùng | Intimidating weight, weapon held high | Mace/club smash and dust burst | Heavy fall and dust/fade |
| Tào Nhân | Defensive guard, blade/shield posture (verify art) | Guard-break counter / defensive slash | Brace behind guard; collapse if defeated |

Create *secondary idle variants* later (look aside, tighten grip, shift stance, cloak settle), at low frequency and when not acting. Avoid canned synchronized breathing across all 12 heroes. All personality variants are visual only and cannot obscure active states. Do not invent a different weapon for a hero before checking the real art.

## 5. Time line for standard melee attack (combat presentation)

Time is **visual time in milliseconds at x1**, based on an example **1250 ms** action. The complete `attack_1` clip (12 frames at 18 FPS ≈ 667 ms) fits inside the action timeline; moving to/from target is root motion around the frame clip.

| t (ms) | phase | visual | authoritative dependency |
|---:|---|---|---|
| 0 | lock | Read resolved action from Combat Core; actionId & target snapshots | only verified action events |
| 0–80 | ready | Short pose/stance transition; use a ready keypose, not necessarily full ready clip | no gameplay mutation |
| 80–320 | approach | Actual running steps from original slot to attack stop | deterministic target position |
| 320–987 | strike | Play all 12 frames of `attack_1` at 18 FPS, including windup and follow-through | marker-driven visual timing |
| **747** | `impact_visual` | Weapon contact (~64% through attack clip), slash, sound, hit numbers + reaction | display already-resolved `DamageApplied` event **once** |
| 987–1220 | return | Hero runs/steps back to original foot slot | position from FormationLayout |
| 1220–1250 | idle | Settle to idle | signal visual action complete |

Ranged: no approach; weapon release marker spawns projectile then visual impact is triggered at projectile arrival. Projectile is visual-only; if target dies from already-resolved event, do not let it attack between action result and death view. AoE: one resolved action may produce multiple victim results, each applied visually exactly once.

**Combat and visual event contract:** Core owns state; Visual Scheduler consumes result records. Animation marker controls *when effects appear*, **not whether damage occurs**. Sequence timestamp and `actionId` prevent duplicate application. If the core is precomputed, actor state snapshots and visual snapshots can differ temporarily while a sequence plays; they reconcile at completion/skip.

## 6. Visual state machine and priorities

```
SPAWN -> IDLE <-> READY -> RUN_TO_TARGET -> ATTACK/SKILL/ULTIMATE
                                    -> RETURN -> IDLE
IDLE/READY/RETURN <- HIT (after reaction if still alive)
ANY_STATE -> DEATH -> HIDDEN
HIDDEN --authoritative REVIVE--> SPAWN -> IDLE
BATTLE_END -> VICTORY (living winners only)
```

Priority: `DEATH > RESURRECT > HIT/CONTROL > ULTIMATE > SKILL > ATTACK > RUN > READY > IDLE`. Reconcile interrupts by actionId. `DEATH` is terminal until a legitimate revival; disable stale tweens, weapon trails and damage emitters. For DOT/environmental kills, death plays without a direct attacker. On `skip`, cancel all visible animations/tweens/particles and resolve to final authoritative snapshot (no intermediate payouts).

State machine must not trigger gameplay state mutations by itself. Use a single owner (`CharacterAnimationController`) for clip transitions and `BattleVisualScheduler` for inter-actor sequence ordering. A `HeroView` owns body/rig, shadow, name, HP/Rage bars and attachments as separately hideable objects.

## 7. Hit, death, revive, VFX and camera

- **Hit:** 70–120ms contact flash, 8–18 logical-pixel recoil at reference dimensions, weapon hit spark 120–240ms. Stagger movement must preserve foot origin and avoid lateral slot drift. Numbers originate near chest/head and never cover UI bars for long.
- **Critical:** stronger slash and impact sound; optional 30–65ms bounded hit-stop **visual only**. Do not stall server simulation or alter hit ordering. Accessible settings can disable shake.
- **Death:** 0–300ms recoil/drop, 300–650ms disintegrate/fade, 650–800ms all body/hud/shadow/VFX hidden and view detached. Use `HP=0` only as trigger; no corpse, no permanent label, no shifting slots. Death can be shortened with speed or skip.
- **Revive:** restore exact prior slot and UI, set state from core snapshot, play `spawn`; never spawn duplicate views.
- **Ultimate:** reserve full-stage flash/shake for rare moments; AOE should not obscure all 12 figures continuously; ability VFX use sockets, not pixel guesses.
- **Ordering:** smoke/weapon trails behind actor, damage numbers above actor, HUD on UI layer, cut-ins above stage but below modal overlays.

## 8. Integration modules (reference architecture)

```
src/battle/visual/
  HeroVisualRegistry.ts             # heroId -> texture/animation profile
  HeroView.ts                       # runtime actor renderer and HUD
  CharacterAnimationController.ts   # only owner of clip state
  FormationLayout.ts                # 2 cols x 3 rows per team
  BattleVisualScheduler.ts          # read resolved combat events
  CombatEventVisualAdapter.ts       # map actual Core events -> visual events
  AnimationClock.ts                 # unified x1/x2/x3/x4 speed
  VFXPool.ts                        # pooled sparks, numbers, trails
  AnimationAssetValidator.ts        # manifest/sockets/clips QA
```

**Important:** file names are suggestions; Sol must inspect the real repo and reuse correct modules rather than forcing a rewrite. Battle Core decides skill outcomes; UI has no direct authority over HP, rewards, pity, VIP, SaveV2 or Supabase.

Use explicit action sequence `{battleId, actionId, actorId, targetIds, result, visualEvents, durationMs}` and unique per-impact identifiers `{actionId, hitIndex, targetId}`. Never trigger damage in `animationupdate` without idempotency. Phaser `animationcomplete` can close a visual clip; looping idle will never emit completion. Different animation and tween timescales must be driven from one battle-speed controller.

### Speed, auto, skip

- Auto battle always runs independent of manual Continue/Pause buttons.
- Existing entitlement rules dictate whether x1/x2/x3/x4 are available; do not grant VIP-only speed incorrectly. UI rotates only among allowed values.
- `speed` changes both clip duration, movement, VFX and audiovisual pace through a coherent clock; do not update Core results at presentation speed if authoritative logic disagrees.
- Skip: validate permission/result using existing backend logic; atomically cancel visual effects, set all hero views to final alive/dead state, show battle result once, award once. Never simulate rapid clicks to skip.
- Tab suspend/resume: do not replay animation markers or award twice; reconcile visual event cursor.

## 9. Example input/output artifacts

- `templates/hero_animation_profile.example.json` — Triệu Vân example with clips, frame count, sockets, action markers, status fields.
- `templates/battle_formation.example.json` — 6v6 layout tokens and viewport regions.
- `templates/combat_visual_event.example.json` — authoritative visual event contract; sample is illustrative.
- `spec/hero_roster_audit.csv` — 12 source hero mappings with static/animation gap.
- `qa/QA_MATRIX.csv` — explicit tests and acceptance criteria.
- `prompts/PROMPT_FOR_SOL_6_1.md` — paste directly into Sol with this ZIP and existing static kit.

## 10. QA acceptance gate — quality before volume

**Pilot:** Triệu Vân (`spear`) + Điển Vi (`heavy_axes`); weapon class contrasts. Test one opponent actually hitting back. After pass, extend to Lưu Bị/Quan Vũ/Trương Phi/Gia Cát Lượng, then remaining roster. Keep HeroConfig identification checks for all 12.

**Must pass before pilot acceptance:**
1. Replaced hero fully visible head-to-boot in *all* P0 clips; 2 legs alternately move in run, weapon/arms/body articulate during attack.
2. `idle` loop natural, no image rigid bouncing; no extra limbs, cracked weapon/armor or inconsistent face.
3. Target receives one and only one damage display/result, synchronized with resolved Core event and hit reaction.
4. Stable `footAnchor`; attack returns exactly to slot without jitter or accumulated drift after 100 repeated actions.
5. death clears hero body, bar, shadow, VFX; surviving heroes remain in original slots. Revive restores one view only.
6. auto, x1/x2/x3/x4, skip, AoE, DOT, counter, boss death and battle end remain correct; no duplicate rewards.
7. 1280×720 desktop and 844×390 landscape readable and not clipped. 60 FPS target on representative desktop; mobile performance budget must be recorded, not assumed.
8. TypeScript typecheck, build, regression tests, PNG alpha check and before/after **captured gameplay** all pass.

**Definition of done:** A mocked or static image moving with tween is **not** an accepted animation for RUN/ATTACK/HIT. All accepted clips have real changing body/weapon geometry; document any partial/placeholder clips honestly.

## 11. Implementation order / milestones

1. **ANIM-00 Asset audit & baseline capture** — record current sprites, source IDs, HeroConfig links, state of real clips, quality baseline, design sample.
2. **ANIM-01 Pilot art** — produce layered source and P0 atlas for Triệu Vân + Điển Vi; art QA at actual battle scale.
3. **ANIM-02 Playback** — create registry, foot anchors, sockets, state transition controller and fallback view.
4. **ANIM-03 Combat event bridge** — resolved action, hit, death, revive, ultimate, speed/skip idempotency; no Core rewrites.
5. **ANIM-04 Formation & visual QA** — existing 2×3 formation, all feet visible, mobile/desktop and performance pass.
6. **ANIM-05 10-hero rollout** — populate source atlas and mapping for others, validate class variation and 12 simultaneous idles.
7. **ANIM-06 Source cleanup** — only after zero references to outdated hero sprites, QA and safe rollback path; old source archive in version control, no destructive early deletion.

## 12. Constraints / non-goals

- This blueprint does not deliver generated character animation frames or hidden art layers from existing PNGs.
- Do not remove old gameplay code, Hero IDs, battle events or saved data during art integration.
- Do not assume a particular Spine runtime plugin exists or license is available. Verify and document if selected.
- Do not deploy Production without explicit approval and full visual regression evidence.

## Reference API docs (technical background)

- Phaser frame animation concepts: https://docs.phaser.io/phaser/concepts/animations
- Phaser animation events (`animationcomplete`, `animationupdate`): https://docs.phaser.io/api-documentation/namespace/animations-events
- Phaser animation state `timeScale`: https://docs.phaser.io/api-documentation/class/animations-animationstate
- Phaser tween timeScale: https://docs.phaser.io/phaser/concepts/tweens
- Spine asset loading in Phaser Editor: https://docs.phaser.io/phaser-editor/scene-editor/spine-animations/spine-animations-loading
