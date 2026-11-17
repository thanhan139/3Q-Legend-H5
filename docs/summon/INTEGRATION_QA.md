# Summon complete kit integration — staging

> Historical baseline for commit 8d8cea2. The thumbnail-card rendering described below is superseded by `VISUAL_FIDELITY_QA.md` and the current `RUNTIME_SELECTION.json`. The balance/backend checks remain valid; this visual correction makes no backend or economy changes.

## Runtime selection and typography

- Uses separate title, four rarity portrait-frame PNGs, four action PNGs and a clean plate from the supplied kit. The current `assets/summon/hall.webp` stays in place. No reference/concept/sprite-sheet image is a runtime background.
- `src/ui/summonLayout.ts` describes composite cards: image-only portrait area, name (maximum two lines), rarity/faction, then new/duplicate status. `LobbyContent` provides the existing measured typography engine, safe padding, uniform texture fit, bounded font reduction and ellipsis. F8 shows content/text bounds.
- Static baked title/button captions receive no duplicate text. Key counts, both pity counts, hero names, faction, rarity and shard amounts come from the snapshot/confirmed receipt.
- All 57 PNGs were reviewed against the manifest/contact sheet. Tall landscape card frames are excluded: their baked bottom rarity ribbon and narrow SSS+ body do not leave a consistent area for three live rows. The supplied four portrait frames are used within a bordered composite card instead.
- Runtime frame trims remove neighboring sprite-sheet pieces: blank plate `(5,32,284,74)`; heroes button `(17,20,358,81)`; single button `(30,14,259,85)`; ten button `(40,10,289,89)`. The back button uses its original bounds. Original PNG bytes remain unchanged.
- Optional low-alpha FX, the baked `+10` label and static pity labels are excluded. They contain neighboring fragments, fixed quantities, or insufficient room for live counters.
- Existing 256px portrait atlas IDs remain authoritative. Legacy tiles from index 14 onward already contain cut heads; those heroes use their **own** intact battle-atlas head/upper-body crop `(42,0,172,172)` within the corresponding tile. No invented or substituted hero art. All images retain uniform scale and stay inside the portrait region.
- Arial/system sans-serif supports Vietnamese before first render; strings use NFC. Both actual renderer bounds and Vietnamese stress strings are checked. No downloaded font dependency is introduced.

## Balance, persistence and release

- Owner requested rates: R 75%, SR 20%, SSR 4.2%, SSS+ 0.8%. SSR-or-higher at pull **50**, independent SSS+ at pull **100**, not 51/101. Natural SSS+ remains SSS+ at SSR pity.
- Shared config is bundled into the authoritative `game-command`. Each pull consumes one `golden_key` through existing Inventory; duplicates grant the existing ten hero shards. x10 processes sequentially and commits once through the existing revision/ledger transaction.
- Existing repository request IDs and pending-command reconciliation are reused; reveal/skip/recent-result UI never grants rewards. No Auth, Battle Core or unrelated gameplay edits.
- Staging migration `20261116120250_summon_balance_50_100`: audits original counters in a service-only RLS table; only counters >=100 become 99. Those rows alone advance revision. SaveV2 shape, balances, owned heroes, previous results and ledger receipts are retained. A database range check prevents old functions writing an obsolete counter.
- Staging `game-command` ACTIVE **v10**; `arena-command` remains **v5**, unchanged. Bearer JWT is verified with `admin.auth.getUser(token)` as before.
- Staging had two saves, max old legendary pity 10. Both saves/revisions were byte-for-byte unchanged after migration and rollback QA: aggregate hash `815a850d3b6017000dfdc1315dc31339` before/after.

## Verification

- Final `npm test`: **197/197 PASS, 22 files**. Final `npm run build`: **PASS** (existing large-bundle warning only). Standard Windows runner; concurrent Chrome/test runs first timed out, so final checks ran sequentially without changing timeouts or gameplay tests.
- Final `SUMMON_VISUAL_QA_PASS`: all three viewports, nine normal/single/long-name captures plus the mobile bounds-debug capture. Desktop, single result, long Vietnamese names and mobile/debug screenshots were inspected. Every measured field was within its padded content rectangle, all button hitboxes were visible, no Image had nonuniform scale, and no browser runtime error was recorded.
- Regression covers rates/boundaries, exact 50/100, sequential x10, Inventory shards, atomic rejection/write failure, old pity normalization, server x1/x10, replay/lost response, concurrent revisions and UID separation.
- `supabase/tests/summon_balance.sql` passed on staging, entirely rolled back: 0/10/98/99/100/150/199 migration cases, preserved unrelated state/history, atomic ledger save, replay, changed-command request reuse, stale revision, reload, two UIDs, denied client RPC/table grants. No persistent QA account was created or deleted.
- Live Edge negative checks: missing JWT HTTP401; invalid JWT returns unauthorized, with no mutation. Readback of deployed function confirms the approved rates, 100-pull limit and user verification.
- Browser script: `node scripts/qa-summon.mjs` (Playwright development prerequisite, no package changes). Real WebGL scenes/assets at 1920x1080, 1280x720 and 844x390. Screenshots and measured bounds are written under ignored `.vite/summon-qa/`.
- Browser fixtures exercise x1/x10 result layouts, short/long Vietnamese names, R/SR/SSR/SSS+, new/shard rows, reveal skip, recent results and pointer/touch after resize. Offline clicks cannot change resources. This is isolated visual/input QA, **not** a real authenticated player E2E session; no QA credentials were supplied.
- No frontend Preview or Production deployment is performed by this change. Push staging only after the final build, regression and screenshot checks pass.

The portrait frames and supplied captions remain painted source assets, not a pixel-identical recreation of the reference concept. Higher-resolution dedicated close-up portraits would improve the older R/SR/SSS+ art beyond the existing atlas resolution.
