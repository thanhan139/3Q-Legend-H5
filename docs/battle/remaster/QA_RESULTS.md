# Remaster QA results — 2026-11-17

**Historical rejected experiment, no longer active.** Current runtime uses [original chibi characters](../chibi/README.md). These older logic test results never constitute approval of the rejected anatomy/rig art.

Scope: five-hero articulated pilot. **Functional checks pass; final production art acceptance and full-roster rollout remain partial.** Full implementation/status: [README](README.md).

| Check | Observed result |
|---|---|
| Typecheck | PASS, installed TypeScript `tsc --noEmit` |
| Standard Vite production build | PASS, 150 modules; existing >500 kB chunk warning remains |
| Standard Vitest regression | **251/251 PASS, 30 files**, no fallback runner required |
| Asset audit | PASS: 12 RGBA static references, 5 different transparent 16-part rig atlases; SHA256/frame bounds/provenance verified |
| Required seven rig states | Controller/finite-geometry assertions and actual enlarged Phaser captures for all five heroes |
| Formation and responsive | Actual WebGL renders at 1920×1080, 1280×720, 844×390; two columns × three rows per team, full viewport and uniform actor scaling |
| Attack return stability | **500 resolved Core actions, 100 per pilot**, all twelve views return to original slots with no drift; rendering disabled only during this deterministic stress loop |
| Damage/event boundary | No displayed HP reduction before contact; cancellable/indexed presentation bridge; identical Core streams at ×1–×4 |
| Death | Confirmed lethal Core hit → collapse/fade → body/shadow/HUD invisible; slot vacant, remaining formation unchanged |
| Restoration | Existing view restored without duplicate sprite; Core resurrection feature does not exist and was not invented |
| Skill and victory | Five real rage-skill paths captured; living winners play victory before one result transition |
| Controls | Auto, touch speed/Skip, resize, visibility suspension, reduced effects, intro-only VS; repeated Skip produces one skip transition and no local resource mutation |
| Backend/account scope | Local isolated fixtures only, Supabase requests blocked; no live account or online reward settlement E2E claimed |
| Production deployment | None |

Commands use the installed Node executable on Windows: `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`, `node node_modules/vitest/vitest.mjs run`. Browser QA: `node scripts/qa-battle-animation.mjs`, `node scripts/qa-character-rigs.mjs`. Art audit: `python scripts/audit-character-remaster.py` (Pillow).

See [machine-readable report](qa/report.json) for the latest measured performance sample and environment. It samples 180 frames at 1280×720, ten active rigs plus two legacy figures, on Chrome WebGL / Intel UHD 620. Approximately **60 FPS** was observed in this short window (p95 game delta around 17 ms); physical mobile devices, full twelve-rig load and long sessions remain unverified. Five decoded rig atlases total about 30 MiB excluding UI/legacy assets and GPU overhead.

## Captured evidence

- [Before: legacy characters](qa/before-legacy-1280x720.jpg)
- [After: 1280×720 gameplay](qa/remaster-layout-1280x720.jpg)
- [After: 1920×1080 gameplay](qa/remaster-layout-1920x1080.jpg)
- [After: 844×390 gameplay](qa/remaster-layout-844x390.jpg)
- [Normal strike](qa/normal-strike.jpg), [Triệu Vân skill](qa/ultimate-zhao-yun.jpg), [Điển Vi skill](qa/ultimate-dian-wei.jpg)
- [Empty slot after KO](qa/ko-empty-slot.jpg), [Victory](qa/victory.jpg)
- Enlarged real Phaser joint inspection: [idle](qa/rig-idle.jpg), [run](qa/rig-run.jpg), [attack](qa/rig-attack.jpg), [skill](qa/rig-skill.jpg), [hit](qa/rig-hit.jpg), [death](qa/rig-death.jpg), [victory](qa/rig-victory.jpg). These inspect the actual rig renderer; gameplay evidence above uses BattleScene/BattleEngine.

## Remaining gaps

Final artist review is still required for layered shoulder/armor overlaps, baked rear hair on head pieces, rigid cloth intersections and extreme cutout poses. No weighted mesh deformation, authored finger animation, separate cinematic ultimate atlas or combat sound completion is claimed. Four mapped static-kit heroes still need rigs; three proposed kit identities are absent from HeroConfig. Across the entire 23-hero roster, 18 retain legacy presentation. Twelve distinct fully animated adult heroes are therefore **not accepted as complete**.

AoE/multi-hit is exercised by existing skills and regression; dedicated visual evidence for every DOT/counter/boss-death combination is incomplete. Reward correctness online, real UID restoration, true Core resurrection and physical-device FPS remain outside the verified scope. No player data, server schema or payment state was altered.
