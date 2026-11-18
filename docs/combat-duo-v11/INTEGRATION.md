# Lữ Bố / Điêu Thuyền Combat v1.1

## Imported assets and identity

The existing `lu-bu` and `diao-chan` records are used unchanged. Two 384×384-cell actor sheets and 14 FX sheets were decoded, checked for RGBA/grid dimensions and verified byte-for-byte against the supplied SHA-256 manifest. Runtime uses the 12 hero-specific FX sheets; the two optional common hit/contact sheets are retained but not required by the current presentation. Full-body UI art and preview GIFs were not imported into Battle. See `ASSET_AUDIT.json`.

New actor textures use `combat.duo.actor.*`. They do not replace the legacy `battle-poses-*` namespace used by Lobby and Formation, so visiting Battle cannot make those scenes assume the new 16-pose sheets use the old 24-frame layout.

## Real actor coverage

Each hero has exactly **Idle 4, Run 4, Attack 4, Skill 2, Hit 1, Death 1** authored poses. HeroAnimationController accepts a clip map, a fixed authored foot origin and a Battle-only texture override. No body parts are cut or rigged. Uniform scale is fitted from measured alpha bounds to the existing formation limits. Every side retains two columns × three rows and enemy actors mirror toward their opponents.

Normal attack: ready → 400 ms approach with real run poses → attack poses 8–11, authored contact pose 10 aligned to the existing confirmed event → impact / damage number / HP presentation → follow-through → return to the same slot. These timings are presentation milliseconds and share the central speed rate.

Skill body motion has only two poses. Hit uses one pose plus safe whole-sprite recoil. Death uses one defeat pose, a short hold and fade, then hides the actor, shadow, HP/Nộ and attached effects. There is no multi-frame collapse, dedicated critical reaction, second attack or victory animation supplied. These remain asset gaps, not completed rigs.

## Rage and gameplay contract

- `rage_ready` is an attached loop while displayed Core rage meets `RAGE_CONFIG.skillThreshold` and the character is alive. It does not start the full skill effect.
- `rage_charge` / `rage_full` require a resolved action with `kind: action`, `actionType: skill`, `skill: true`, sufficient `rageBefore` and the selected hero's actual configured ultimate ID. Mere full rage, normal attacks, status skips or another hero's skill fail the cast gate.
- The full effect plays all 20 frames at 16 FPS. It starts 11 frame intervals before the scheduled contact and travels from caster to the first confirmed recipient, reaching that recipient at the impact milestone. Own `rage_impact` plays on confirmed contacts, including additional recipients.
- Lữ Bố uses his red/orange halberd FX. Điêu Thuyền uses pink lotus/petals. Her actual ultimate heals allies and applies the existing control/cleanse effects; no damage skill was invented.
- Old generic cast/travel/impact visuals are suppressed for these two actors, avoiding green-slash or unrelated signature overlap. Existing HP, healing amounts, status badges and damage numbers remain driven by Core events.
- FX completion only removes presentation objects; it never mutates HP, rage, rewards or equipment. Central speed/pause/visibility controls scale actor animations, effect FPS, timers and tweens. Ready is removed on cast/death; ending/Skip/shutdown clears all owned FX. Death-target effects finish within 600 presentation ms.

Battle Core, HeroConfig, SaveV2, Supabase and player data were not changed. No Production deployment or push was performed.

## Runtime evidence

Final checks: **typecheck PASS, Vite build PASS (161 modules), 277/277 regression tests PASS in 37 files**. Existing >500 kB bundle warning remains. Browser QA passed 18 state/viewport captures, confirmed-only rage gating, Core-state invariance, x1–x4 slot return, death disappearance and Skip-once, with zero page exceptions. A final repeat after isolating the actor texture namespace also passed. GIFs were decoded successfully: Lữ Bố 69 frames / 1.97 MB, Điêu Thuyền 68 frames / 1.69 MB, both 844×390; repeated identical source captures are consolidated by GIF encoding.

| Hero | Gameplay GIF | Normal contact | Ready only | Confirmed skill | Death / empty slot |
|---|---|---|---|---|---|
| Lữ Bố | [GIF](qa/lu-bu-gameplay.gif) | [image](qa/lu-bu-attack-1280x720.jpg) | [image](qa/lu-bu-ready-1280x720.jpg) | [image](qa/lu-bu-skill-1280x720.jpg) | [image](qa/lu-bu-death.jpg) |
| Điêu Thuyền | [GIF](qa/diao-chan-gameplay.gif) | [image](qa/diao-chan-attack-1280x720.jpg) | [image](qa/diao-chan-ready-1280x720.jpg) | [image](qa/diao-chan-skill-1280x720.jpg) | [image](qa/diao-chan-death.jpg) |

The GIFs capture actual manually stepped Phaser/BattleEngine scenarios: normal attack, full-rage waiting, confirmed skill. They are test segments with controlled local fixture rage/HP, not continuous online progression or the ZIP previews. Frames are uniformly fitted to the 844×390 viewport and encoded with an indexed GIF palette; they do not replace runtime art.

`scripts/qa-combat-duo.mjs` captures both heroes at 1280×720, 1920×1080 and 844×390. It checks exact actor identity, uniform scale, ready-without-full, confirmed cast events, Core-state invariance across playback, return to slots at speeds x1–x4, death disappearance and duplicate Skip result guard. It blocks Supabase requests and never touches a live account. `--no-gif` repeats the runtime validation without regenerating PNG capture frames. Browser evidence: [report.json](qa/report.json).

Changed production files: `src/data/combatDuoManifest.json`, `src/ui/combatDuoConfig.ts`, `src/ui/CombatDuo.ts`, `src/ui/HeroAnimationController.ts`, `src/scenes/BattleScene.ts`, runtime PNGs. Tests, QA scripts and reports are separate. Earlier authorized changes remain in the working tree.
