# Welfare layout polish — 2026-11-17

The Welfare/Checkin/Missions/Topup/Mail pages are implemented by `src/scenes/InfoScene.ts` under the existing `Info` scene key. Routing remains compatible.

## UI changes

- `src/ui/welfareLayout.ts`: shared 4/8/12/16/24/32/48 spacing tokens; responsive sidebar, hostess and function panel. The baseline full-body hostess box is 444px high versus the previous 541px, about 18% smaller, using uniform contain scaling. Sidebar rows have a common 60px hit height and 16px gap.
- Welfare now opens the actual seven-day check-in view. Seven configured days use a 4+3 grid; daily missions show actual counts, claim state and configured rewards. Four duplicate navigation cards and the decorative claim-like treasure chest are removed.
- All six sidebar items open a panel. Login gifts, gift codes, online rewards and mail have explicit unavailable/developing states; they do not fabricate rewards or expose claim buttons.
- Blank approved panel, tab, reward-card, header and button textures are reused. Nine-slice corners are preserved at a smaller uniform source scale rather than stretching ornament into labels. Local Vietnamese Noto Serif and bounded text fitting replace ad hoc Georgia labels.
- `src/ui/sharedUi.ts`: common back-to-lobby, gold and red buttons, font loader and spacing tokens. The visible lobby label is exactly **← Về sảnh**. Welfare has one top-right lobby button, no sidebar duplicate or auxiliary header arrow.
- Shared lobby buttons are also used by Inventory, VIP, Summon, Campaign, Heroes, Formation, Result, Tutorial and Campaign Battle. Arena has the shared lobby action alongside its wallet HUD; contextual returns to Arena/Inventory retain their existing destinations. Boot preloads shared art, and standalone scene loaders have compatible preload/fallback handling.

## Data boundary

No changes to `src/domain/welfare.ts`, reward amounts, welfare dates/cycles, mission goals, GameStore, SaveV2, Supabase schema or authentication. Claims still use the existing `saveAction`/online command pipeline with its pending-command guard. Nạp Đầu remains the existing explicit demo and is labelled as such; no payment success is simulated. Resource labels remain mapped to the existing configuration, including legacy inventory materials.

## Verification

- Typecheck: PASS.
- Regression: **237/237 tests**, 27 files, including three new viewport-layout tests. Existing seven-day reward-cycle, online-only, persistence and UID/session regressions pass.
- Production Vite build: PASS; existing bundle-size warning remains.
- Before images captured with the original scene at 1920×1080, 1280×720 and 844×390, covering Welfare, Checkin, Missions, Topup and Mail.
- `scripts/qa-welfare.mjs`: **WELFARE_AFTER_QA_PASS** at all three viewports. It renders the real scene/assets with isolated local saves and blocks Supabase traffic. The fixture uses 8 FPS for static headless screenshots with Chrome's automatic GPU/fallback selection; production FPS is unchanged. Content bounds, a single lobby button and proportional hostess passed; all sidebar hitboxes, rejection of a sessionless claim without resource changes, and touch navigation back to Lobby passed. This is not a real-account/server reward E2E or hardware performance certification.
- The final three viewport-layout tests were rerun after the ornament/header refinements: 3/3 PASS. Final Vite build and `git diff --check` passed. Before/after comparison images were inspected, including check-in on mobile and the daily-missions panel on desktop.

Artifacts: `.vite/welfare-qa/before/`, `.vite/welfare-qa/after/`, including `comparison-{resolution}.jpg` and `report.json`. Screenshot figures are explicit isolated QA save values, not a player account.

No commit, push, deployment, account reset or ZIP/video created.
