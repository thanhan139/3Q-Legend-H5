# 3Q Legend H5 · M3.8 Ultimate Skill Combat (v0.4.10)

## What actually changed

Base: the **v0.4.9 Rage Combat + Skill VFX** ZIP from this conversation. Phaser 3 + TypeScript + Vite; the six-unit cap and save schema remain unchanged. **No M4A files were present in the base archive**; this update should be merged into Sol's newer branch if that branch contains Summon work not in v0.4.9.

### BattleEngine (Phaser-independent)

- Preserved per-unit rage accumulation (normal attack +30, surviving defender +10 per action, maximum 100; ultimate costs 100). No fixed three-actions trigger.
- Added `shield`, `attackBuffActions`, `criticalBuffActions` per battle unit (battle-only; not saved).
- Added explicit battle events: `shield`, `buff`, `total` in addition to damage, heal, rage, ko and end. Damage events contain actual HP loss, shield absorption, remaining HP/shield, deterministic critical flag, hit order and action ID.
- Quan Vũ: crescent cleave targets up to 3 frontline opponents. Trương Phi: up-to-three-target ground impact, gains a self shield and attack buff. Triệu Vân: three separate physical hits against one target (stops when killed). Lưu Bị and Đại Kiều: heal the two most injured allies plus attack/crit buffs. Mage ultimates: up to 3 targets. Other tank ultimates grant shields.
- Shields reduce incoming damage before HP. Critically buffed attacks deal genuinely more damage. Multi-hit grants rage to the surviving target **at most once per action**, regardless of the number of hits. Summed skill damage uses the actual HP loss, not shield absorption or fabricated UI numbers.
- Deterministic, seedless pseudo-roll for criticals is an **offline prototype balance rule** to keep Skip and manual playback identical; not a server-secure randomness mechanism.
- All numbers are prototype balance constants in `src/data/skillCombat.ts` and `src/data/rageConfig.ts` (not asserted to be the official values of OMG 3Q).

### Presentation

- Added staged ultimate presentation: skill title / aura / caster movement / asset VFX / sequential damage-heal impacts / status effects / total-damage flourish / return.
- Existing sprite `attack` clip is a **fallback** when a dedicated ultimate frame animation is unavailable; this does not pretend to be a real skill animation.
- Existing 13 referenced PNG VFX assets combined with extra Phaser procedural sparks, a shield ring and buff feedback. PNG layers themselves are static, combined through Tweens. These are not multi-frame Spine/VFX assets.
- Bottom HUD shows 6 player portrait slots and HP/rage bars; status labels on battlefield show shield, attack and crit buffs. Floating labels include `HẤP THỤ`, `BẠO KÍCH`, `TĂNG CÔNG`, `TĂNG BẠO`, `KHIÊN`, and actual damage or healing.
- `×2` and Pause control Phaser Time and Tween timeScale; Skip resolves all remaining events through the independent BattleEngine and enters Results without replaying a skill twice. Scene shutdown removes its display objects via Phaser.
- DEV-only Q/W/E preview still shows static skill VFX, without changing BattleEngine or HP.

## Verification actually performed in this environment

- **Battle Core compiled with `tsc` under strict mode** using isolated type roots: PASS.
- **13/13 independent Node-based Battle Core assertions**: PASS, including 6v6, AoE, multi-hit, shield absorption, support buffs, critical damage, rage, skill lock, Skip deterministic event stream, ending and normal attack.
- **31 source TS files parsed and transpiled with global TypeScript**: PASS, 0 syntax errors.
- **Full Vite production build / Vitest could not run**: the environment lacks available `vite/client`, Phaser and other npm registry dependencies. Installation attempted but failed; **not claimed pass**.
- **Browser video/UI inspection of this changed build could not be completed here**. Validate the layout in 1280×720 and 844×390 landscape on the actual dev machine, especially 6 portrait HUD slots and long Vietnamese status labels.

## Validate on Windows (within the inner `3q-legend-h5-scaffold` directory)

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

For quick manual action tests, use a DEV save with the indicated hero in formation and 6v6 campaign stage 3-1, then allow combat until rage reaches 100. Use `Q`, `W`, `E` only for VFX preview; these debug keys do **not** prove rage-funded casting.

Checklist:

1. Normal attacks increase the casting hero's rage; receiving real HP damage increases the target rage once.
2. Full rage becomes ready, and the following legal action casts a skill and deducts 100 rage.
3. Quan Vũ shows 3 **actual target** hits; Trương Phi deals AoE and grants a real shield; Triệu Vân repeats 3 distinct impact numbers.
4. Shield absorbs HP damage before HP decreases; its number updates after impact.
5. Lưu Bị heals and creates real buffs. Critical buff modifies damage, not just visual appearance.
6. Pause mid-cast, resume and x2 remain synchronized. Skip mid-cast does not double damage or payout.
7. Old save v2, Campaign, Summon, Formation and hero EXP remain intact.
8. Test 1280×720 desktop and 844×390 mobile landscape; confirm no overlapping HUD.

## Limitations and follow-up

- Ultimate frame-by-frame body animations and dedicated audio clips are not included; current project reuses attack clips plus layered PNG/Tween/particle VFX.
- Balance is intentionally provisional and should be validated by playtesting.
- Status icon design and separate spell visuals for other heroes need a polished asset pass.
- Production multiplayer/real-money game must resolve rewards, gacha, battle state and secure randomness on a server; this build is offline/local-first.
