# v0.1 Acceptance Checklist

## Environment / build
- [ ] `npm install` succeeds on Node 22.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm run test` passes all Battle and Summon tests.
- [ ] `npm run build` emits `dist/`.
- [ ] `npm run dev` loads canvas without console exceptions.

## Navigation and UI
- [ ] Lobby displays currencies & current stage correctly.
- [ ] All advertised Lobby links open functional scenes or an explanatory not-yet-implemented screen with Back.
- [ ] Campaign → Battle → Result → Lobby works without a dead end.
- [ ] Layout remains readable at 1280×720, desktop window resized, and mobile landscape.

## Game logic
- [ ] 3 starter heroes; 6 slots; no hero can occupy 2 slots.
- [ ] Player and enemy can each reach six deployed heroes.
- [ ] Dead units cannot act; frontline is targeted first; end condition is handled.
- [ ] Battle x2 and skip give consistent results for the same battle state.
- [ ] First-clear rewards are paid only once, even on replay/refresh.
- [ ] Stage unlocks happen in the right order; 1-3 unlocks summon.
- [ ] Milestones 2-1/2-4/3-1 unlock their heroes without duplicate roster entries.
- [ ] Summon consumes exactly 1 or 10 keys, enforces 50-pity and converts duplicate to shards.
- [ ] Reload retains currencies, roster, formation, cleared stages, pity and first-topup demo flag.
- [ ] Payment mock cannot be invoked in production build.

## Agent handoff
- [ ] Existing architecture and files reviewed before edits.
- [ ] Known bugs and build errors logged separately from feature requests.
- [ ] Incremental PRs/commits, plus changelog/tests/screenshots or video evidence.
