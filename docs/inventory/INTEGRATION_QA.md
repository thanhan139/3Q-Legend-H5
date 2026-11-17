# M9 Inventory integration — 2026-11-17

## Source changes

- `src/scenes/InventoryScene.ts`: replaced the fixed resource panels and shard list with a data-driven scrolling inventory. Desktop has five columns and a persistent detail panel. Phone landscape uses three readable columns and a detail overlay, as specified by the kit's mobile layout. Header contains only the title/subtitle and return to Lobby.
- `src/ui/inventoryModel.ts`: read-only presentation adapter over existing ItemId/inventoryQuantity/SaveV2 fields, exact hero identities, five filters, descriptions and navigation destinations. Zero quantities are omitted; an empty inventory gets a real empty state. Copper/Gold are not added as items. Unknown hero IDs are not rendered as invented characters.
- `src/ui/inventoryLayout.ts`: viewport-driven geometry, slot content bounds, row/column placement and scroll limits. No item-count limit or hardcoded twenty-item list.
- `src/ui/inventoryAssets.ts`: selected kit textures and reused project icons; local Vietnamese Noto Serif loading completes before text is measured. Portraits come from the existing hero registry. Icon scaling is capped in both Phaser and displayed CSS pixels.
- `src/ui/inventoryMenu.ts`, `src/scenes/LobbyScene.ts`, `src/style.css`: Lobby-only floating menu with thirteen categories, native accessible buttons/focus handling, close control, Escape, repeated dock click and outside click. Đạo Cụ opens the new scene. The twelve other category-menu integrations display “đang hoàn thiện”; existing specialized scenes remain unchanged.
- `src/ui/LobbyContent.ts`: added record reset for responsive view rebuilds; other scenes retain their existing behavior.
- `tests/inventoryUi.test.ts`, `scripts/qa-inventory.mjs`: model/layout invariants and isolated browser QA.

## Asset decisions

Read all six kit documents, CSV manifest and complete texture mapping. Audited **67 PNGs**, including alpha extrema and native dimensions. `ASSET_AUDIT.json` records every decision; `RUNTIME_SELECTION.json` records exact hashes of the **15** copied runtime PNGs.

Active kit art: clean hall background; blank title, grid, detail, plaque and parchment; portrait frame; dragon divider; default/selected slots; normal/selected tabs; back/gold buttons; gold glow. The selected slot has an opaque center, so it renders below icons and labels. Nine-slice keeps ornamental corners intact; backgrounds and icons scale uniformly.

All twenty `icons_reference` cutouts were visually reviewed on checkerboard backgrounds and excluded. Their flattened rectangular halos/cropped edges and sample-art content are unsuitable for runtime. Five existing project item icons/weapon textures and the exact hero portrait atlas are reused. Static title/tab/button alternatives are excluded to prevent baked text duplication and adjacent-art contamination. For example, the static title still includes pieces of neighboring tab art below it. No approved concept image is loaded by the game.

The runtime preserves the kit's blank frames rather than trying to reproduce the flattened illustration's baked header ribbon, solid gold tab fills or fake item roster. These decorative details differ from the concept. Existing hero/item source art remains the resolution limit; it is not enlarged beyond native displayed pixels.

## Data boundary

No edits to GameStore/domain, SaveV2, Supabase schema/functions, Auth, Battle Core, Campaign, Summon, Welfare or PvP for M9. Existing uncommitted Summon/font work was preserved.

The scene reads the latest GameStore snapshot, rebuilds when inventory or the active UID changes, and clears selection/filter/modal/scroll state on owner change. It neither grants nor consumes items. Existing item-consuming actions remain in their original authenticated/idempotent command flows. Detail controls navigate to those flows and are labeled accordingly; no direct “Sử dụng” transaction is invented for this screen. Legacy Nguyên Bảo has no action button.

## Observed validation

- `npm run typecheck`: PASS.
- `npm run build`: PASS; existing large-bundle warning only.
- `npm test`: **205/205 PASS**, 24 files, including six M9 tests.
- `node scripts/qa-inventory.mjs`: **INVENTORY_QA_PASS**, WebGL with production scene/assets; **12 screenshot/audit cases** across **1920×1080**, **1280×720**, **844×390**, plus interaction checks.
- Checked populated (>20), few and empty inventories; every tab; item selection and exact portrait ID; desktop detail/mobile overlay; wheel and drag; no accidental selection during drag; resize; all named hitboxes inside the canvas; text bounds; long accented Vietnamese names; uniformly scaled icons with native-pixel caps.
- Verified fixture UID swap, reload restoration, offline read-only browsing and unchanged resource snapshots after interactions. Lobby menu: all thirteen labels, unfinished notices, Escape, repeated dock click, outside click, Đạo Cụ entry. The full pointer gesture is consumed before removing the menu backdrop, preventing click-through/reopening.
- Visually reviewed desktop grid/detail, mobile grid/detail/empty state, the Lobby category menu, optional icon audit and side-by-side concept/runtime comparison.
- `git diff --check`: PASS. No M9 domain/cloud/schema diffs. No commit, push or deployment.

Artifacts (ignored, local only): `.vite/inventory-qa/report.json`, `many-*`, `fragment-*`, `scrolled-*`, `few-*`, `empty-*`, `offline-detail.jpg`, `long-vietnamese-mobile.jpg`, `lobby-menu-mobile.jpg`, `optional-icons-audit.jpg`, `reference-comparison.jpg`.

## Remaining scope / limits

- **Two real Supabase QA accounts were not tested.** No authenticated QA sessions were supplied. UID/reload/network cases above use isolated fixture-owned snapshots, not real registration or server login. The fixture aborts Supabase network requests and performs no remote writes. Existing Auth/persistence regression tests pass; they do not replace real-account E2E.
- Twelve category-menu integrations remain explicitly unfinished; no fake item-use/payment/reward behavior is provided.
- No direct-use inventory command or new item catalog/economy was added. Future real item definitions can extend the presentation adapter without changing grid code.
- Build screenshots are not a claim of pixel-identical reproduction of the illustration or a performance benchmark.
