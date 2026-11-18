# Combat Animation & VFX integration

**Mapping correction:** feedback now follows explicit canonical hero weapon profiles instead of balance roles; Lữ Bố avoids the green shared slash. See [current roster/server audit and corrected screenshots](../combat-audit/INTEGRATION_CORRECTION.md).

## Runtime changes

28 original RGBA spritesheets are loaded from the supplied manifest: 23 shared clips and five hero signatures. Frames are native 256×256 with configured frame counts/FPS and one-shot playback. Atlas dimensions, alpha and frame variation were audited in `ASSET_AUDIT.json`. Some source clips intentionally contain transparent startup/end frames; those indices are recorded rather than silently removed.

`CombatFeedbackVfx` owns only presentation sprites and projectile tweens. It has no BattleEngine, Store or command access. BattleScene's existing confirmed-event bridge schedules effects alongside damage numbers and HP presentation; animation-complete handlers only remove sprites. The Core step is never called from an FX callback.

- Melee: existing ready / approach / attack / retreat sequence, slash or thrust at the attacker weapon-tip approximation, target spark, stronger critical impact and ground shock. Existing verified actor attack sheets remain active.
- Ranged: a real projectile tween from the attacker's hand to the target, ending at the scheduled contact time. Arrow trail, impact and multi-shot variants are available through the shared helper.
- Mage/support normal attacks: remain on their formation slot, cast circle/charge and a moving magic projectile with impact. Existing ultimate-specific travel/cut-ins are retained, augmented with the imported signature/impact layers.
- Heal: cast circle, target glow and particles; existing green numbers use Core's confirmed healing amount. Shield and buff events use the matching sheets.
- Death: clears prior target-owned FX, plays flash/dissolve/particles/shadow fade, then clears remaining target FX within 600 presentation milliseconds. Existing character death handling hides the art, shadow and HP/Nộ HUD, preserving the empty formation slot.
- Active FX animations receive the same pause/speed rate as timers, tweens and actor animations. Skip/end/shutdown clears all owned FX and tweens. Visibility suspension and reduced effects reuse the current BattleScene settings. Active feedback instances are capped at 48.

Five canonical signatures: `guan-yu`, `zhao-yun`, `zhang-fei`, `zhuge-liang`, `da-qiao`. Other heroes use role-appropriate shared feedback; they do not borrow another hero's signature.

## Actor pilot and missing assets

The supplied Quan Vũ eight-frame pilot was inspected from its pose contact sheet and individual alpha/bounds metadata (`PILOT_AUDIT.json`). Hand/weapon continuity and foot-anchor consistency are not sufficiently verified for replacing the approved original animation. It is **not enabled or shipped as a runtime actor**. The original Quan Vũ chibi attack remains in use. No cutout body rig was added.

The ZIP supplies no production per-hero run, idle, hit, death, skill-body or victory clips beyond that attack pilot. In the existing project, Quan Vũ / Lưu Bị / Trương Phi have their original frame-based idle, attack, hit and death sheets. Most other heroes retain a complete static sprite with safe movement/recoil/fade. They do **not** gain real footstep or weapon-swing body animation from these VFX. Per-hero run, dedicated skill/ultimate body motion, attack variants and victory assets still need authoring/validation. See the supplied `ACTOR_ANIMATION_GAP_MATRIX.csv` and existing `docs/battle/chibi/README.md`.

## QA

Final results: **typecheck PASS; Vite build PASS (157 modules); 272/272 regression tests PASS in 35 files**. Existing bundle-size warning (>500 kB) remains. Browser QA PASS: 24 real action captures, all 28 clips exercised, zero page exceptions, x1–x4 KO cleanup and duplicate-Skip result guard passed. No physical mobile FPS or live Supabase transaction claim is made.

Run `node scripts/qa-combat-feedback.mjs`. The fixture uses actual BattleScene and BattleEngine with local isolated roster/save data and blocked Supabase requests. It captures melee, projectile, magic, healing and all five signature actions at 1280×720, 1920×1080 and 844×390. Every resolved Core state must remain identical before and after visual playback, and surviving actors must return to their slots. Speeds x1/x2/x3/x4 verify KO art/HUD disappearance and empty feedback ownership. All 28 imported animations are separately exercised for finite lifetime. Duplicate Skip calls must reach the result scene once.

This is an automated local playback check, not physical phone or live-account certification. Gameplay formulas, hero stats, formation layout, SaveV2, Supabase and rewards are unchanged. No Production deployment or push performed.

## Actual gameplay screenshots

- [Melee](qa/melee-1280x720.jpg), [projectile in flight](qa/projectile-1280x720.jpg), [magic](qa/magic-1280x720.jpg)
- [Quan Vũ](qa/quan-vu-1280x720.jpg), [Triệu Vân](qa/trieu-van-1280x720.jpg), [Trương Phi](qa/truong-phi-1280x720.jpg), [Gia Cát Lượng](qa/gia-cat-luong-1280x720.jpg), [Đại Kiều healing](qa/heal-1280x720.jpg)
- [Mobile healing](qa/heal-844x390.jpg), [mobile melee](qa/melee-844x390.jpg)
- [Browser evidence](qa/report.json)

Changed production files: `src/data/combatVfxManifest.json`, `src/ui/CombatFeedbackVfx.ts`, `src/scenes/BattleScene.ts` and 28 runtime PNGs. QA script and documentation are separate. Earlier UI and spirit changes remain in the working tree.
