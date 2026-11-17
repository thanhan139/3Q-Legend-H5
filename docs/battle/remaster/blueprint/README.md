# 3Q Legend H5 — Hero Animation Blueprint v1.0

A **technical design/production specification**, not playable character animations.

## START HERE

1. Read `HERO_ANIMATION_BLUEPRINT.md`.
2. Review `spec/hero_roster_audit.csv` (all 12 current sprites are static).
3. Use `prompts/PROMPT_FOR_SOL_6_1.md` in Sol 6.1 with the **existing static sprite ZIP** and current source repo.
4. Use JSON templates to specify animation profiles and formation geometry, **after inspecting real source IDs**.
5. Follow `qa/QA_MATRIX.csv`; first deliver 2-hero pilot, then expand to 12.

## Included

- Complete blueprint (Vietnamese)
- 12-hero asset audit (based on `HERO_MAPPING.json` from prior static sprite ZIP)
- JSON schema and valid Triệu Vân profile example
- 6v6 2-column x 3-row formation tokens
- Battle visual event example
- Minimal TypeScript timing/bridge reference (framework-agnostic; not a drop-in patch)
- QA matrix and Sol production prompt

## Non-included

- No new motion frame PNGs, no layered PSD, no rig binaries, no skeletal animations.
- No changes to actual game source or deployment.

**Existing sprite source:** `3Q_Legend_Hero_Remaster_Static_Sprites_v1.0.zip` (12 normalized RGBA 448×448 reference poses). Keep it as a visual reference, not proof of playable animation.
