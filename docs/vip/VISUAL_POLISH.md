# VIP reference layout polish — 2026-11-17

Badge consistency follow-up: each badge uses an explicit source-pixel frame around its main alpha component. VIP 8/14 exclude disconnected neighboring artwork on the left. All badges share a common visible width while preserving their aspect ratios, with enough vertical space reserved for VIP 18's ornament. Original PNGs are unchanged. Browser QA additionally asserts rail width variation below 2% at every target viewport/tier.

The overview now follows the supplied kit layout preview: proportional dragon banner, open badge rail, outside panel headings, two-column combat statistics and the level gift alongside privileges. Daily/weekly gifts and the shop remain separate tabs. The darker maroon treatment and fine gold perimeter retain the existing hall artwork.

Runtime addition: `public/assets/vip/vip_header_progress.png`, copied from the isolated kit progress banner. Only the fixed VIP title is baked in. KNB totals, progress, thresholds, bonuses, gift state and labels remain dynamic. The entire concept image is never loaded as a game texture.

Changed UI: `src/scenes/VIPScene.ts`, `src/ui/vipAssets.ts`. The overview reuses the existing server-validated claim handler; no economy, authentication, schema or gameplay changes. Production reward catalogs remain empty/unpublished. No illustrative five-key gift or avatar-frame entitlement was enabled.

Verification: TypeScript and Vite production build pass; regression suite passes 230/230 tests across 25 files. Browser QA uses real Phaser rendering and the real repository with isolated transport fixtures, not real payments/accounts. It covers VIP 0/5/7/10/15/16/17/18 at 1920×1080, 1280×720 and 844×390, all 19 badge hitboxes, text bounds, proportional badges, empty/locked/claimed states, reload, separate UIDs, offline, dropped reply/retry and duplicate claims. The regression script now claims the level gift directly from the redesigned overview. Focused QA also verifies the overview claim, back/ESC/Lobby navigation and periodic claims while browsing an older tier.

Screenshots: `.vite/vip-qa/vip-5-1280x720.jpg`, `vip-18-844x390.jpg`, `overview-claim-mobile.jpg`, `reference-comparison.jpg`; machine report: `.vite/vip-qa/report.json`. These are local ignored QA artifacts; high VIP totals and rewards shown are isolated fixtures. No commit, push or deployment performed.
