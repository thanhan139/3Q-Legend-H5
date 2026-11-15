# 3Q Legend H5 — M3.7 Rage Combat v0.4.9

## Objective

Replace the temporary **ultimate skill every third action** rule with **per-hero rage**. Gameplay is still auto-battle (up to 6v6). This is our own configurable OMG 3Q-inspired design, not a claim about the original game's numerical rules.

## Implemented

| Rule | Default | Implementation |
| --- | ---: | --- |
| Starting rage (each battle) | 0 | `src/data/rageConfig.ts` |
| Maximum rage | 100 | `src/domain/battle.ts` |
| Basic attack gain | +30 | acting hero only |
| Incoming nonlethal damage gain | +10 | damaged hero only, once per hit |
| Ultimate threshold | 100 | evaluated when that hero's next action is due |
| Ultimate cost | 100 | consumed once; ultimate does **not** also give +30 |
| Skill lock | No unit initially locked | `skillLocked` field reserved for future effects; while locked, acts normally without spending full rage |
| Support ultimate | Heal lowest-HP% living ally | consumes rage exactly like damage ultimates |
| KO | No rage gain from the killing blow | a dead hero cannot act |

The Battle Engine remains standalone TypeScript. Damage/heal events contain `actionType`, `skill`, optional `skillId`, `rageBefore`, and `rageAfter`. Separate `rage` events capture meter changes on both attacker and defender. The Phaser Scene only consumes the simulation result; it **never** decides when an ultimate becomes available.

## UI & effects

- Gold **NỘ x/100** bars appear beneath each unit's HP.
- A full bar displays **✦ TUYỆT KỸ** when not skill-locked.
- Existing Quan Vũ / Trương Phi / Triệu Vân VFX play only for true `skill` actions emitted by Battle Core; default effects remain available for other heroes.
- Development-only Q/W/E preview keys still preview art without damage or rage changes.
- x1/x2, pause, skip, result, formation, campaign, summon, progression, and Save V2 are unchanged.

## Files changed

- `src/data/rageConfig.ts` (new)
- `src/domain/battle.ts` (rage simulation, event metadata)
- `src/scenes/BattleScene.ts` (real rage meter, ready state; removed third-action UI)
- `tests/rage.test.ts` (new: 9 rage tests)
- `tests/visuals.test.ts` (remove obsolete third-action test)
- `package.json` and `package-lock.json` (version number only, 0.4.9)

## Verification carried out in this environment

- All 36 TypeScript source/test files passed **syntax transpilation** diagnostics with TypeScript.
- Battle domain and related modules passed **strict `tsc` compilation** independently of Phaser.
- Deterministic Node.js simulations validated rage gain, threshold/consumption, skill lock behavior, support healing, rage caps, and skip versus normal play; 15 existing campaign stage encounter simulations completed without throwing.
- The **full `npm run build` and Vitest tests could not be executed here** because the container does not contain the Phaser/Vite/Vitest packages and npm installation was unavailable. The attempted build stops at the missing `vite/client` type definition, *before compiling the app*. These checks are pending on the user's Windows machine; the previous 20/20 test result is not a new v0.4.9 test result.

## Windows verification commands

From the directory containing `package.json`:

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Manual QA: enter any battle, observe a normal hit increasing the attacker's rage by +30 and a living target's rage by +10; wait for 100/100 on the actor and verify the next eligible action is the ultimate with the appropriate VFX, dropping that actor's rage back to 0. Test x2, pause, skip, and return to lobby. Save data should remain intact.

## Known limitations

- Skill effects remain composites of isolated PNGs animated by Phaser Tween; these are not authored multi-frame skill sprite animations.
- Received-damage rage currently grants a fixed +10 for any **survived** hit, not proportional to damage and not per target hit in multi-target skills (not yet implemented).
- Only skill-lock *support in the core* is wired; no status-inflicting hero skill is being added here.
- Exact balance numbers are intentionally provisional and can be adjusted in one config file.
