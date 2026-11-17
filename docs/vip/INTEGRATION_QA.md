# VIP 0–18 source integration — 2026-11-17

## Implemented source

| Files | Behavior |
| --- | --- |
| `src/scenes/VIPScene.ts`, `src/ui/vipAssets.ts`, `src/main.ts` | Dedicated Phaser VIP scene, current badge/paid-base progress, all 19 selectable tiers, five-stat preview, privileges, level/daily/weekly gifts, shop, loading/retry/error states and back/ESC. Native Vietnamese font, bounded live text, viewport resize, uniform native-pixel badge scaling. |
| `src/scenes/LobbyScene.ts` | Existing VIP hitbox now enters VIPScene. Profile VIP and PvE power use the confirmed VIP total, never wallet gold or the demo top-up. Existing M9 inventory menu is preserved. |
| `src/data/vipConfig.ts`, `src/domain/vip.ts` | Exact approved thresholds and five bonus columns, VIP 0 default / VIP 18 cap, non-cumulative bonuses, fractional critical points, actual-tier periodic-gift state. Proposed gift quantities are not made live. |
| `src/domain/battle.ts`, `src/domain/progression.ts`, `src/scenes/BattleScene.ts` | Actual PvE ATK/DEF/HP/critical-rate/critical-damage effects, HP initialized to the new max, and x3 at VIP 5 / x4 at VIP 9. Client playback and server settlement share the same core/config. VIP 0 and existing PvP retain their original rules. |
| `src/scenes/CampaignScene.ts` | Càn Quét remains unavailable and opens a clear development notice; no fabricated sweep/skip reward. |
| `src/cloud/gameProtocol.ts`, `src/cloud/cloudRepository.ts` | Separate optional `CloudSave.vip` metadata and a `vipClaim` intent through the existing UID-scoped pending-request/reconciliation pipeline. SaveV2 stays unchanged. |
| `supabase/functions/game-command/handler.ts`, `edge.ts` | Existing verified JWT/confirmed-email UID boundary; claims delegate to a private SQL transaction. Battle settlement derives VIP from the server row, ignoring a client-supplied VIP level. |
| `supabase/migrations/20261117023940_vip_progression.sql` | Private paid-base ledger, approved-reward catalog, atomic claims, server reset periods, provider-transaction deduplication and terminal full-refund accounting. Adds VIP metadata to the existing online wrappers without resetting saves. |
| `tests/vip.test.ts`, `supabase/tests/vip_progression.sql`, `scripts/qa-vip.mjs` | Threshold/stat/precision/forgery regression, actual PostgreSQL rollback tests and real-scene browser QA with isolated transport. |

Pre-existing uncommitted Summon, font and M9 changes were retained. No changes to `GameStore`, `SaveV2` types, initial resources, Summon rates/pity, or arena-command source.

## Asset audit

Read README, complete CSV/texture mapping, full balance proposal, integration prompt, contact sheet and layout preview. **111 source PNG hashes match the manifest.** `ASSET_AUDIT.json` records dimensions, alpha, source hash and use/exclusion for every entry.

**34 standalone runtime PNGs**: 19 unique VIP badge files, 11 clean blank UI textures, three truthful chest states and the isolated gold-dragon VIP title. `RUNTIME_SELECTION.json` records exact source/runtime paths. The fixed word “VIP” and intentional badge numbering are allowed; dynamic totals, thresholds, gifts and button states are Phaser text. No atlas, illustrative six-gift meter, mockup or fixed fake amount is loaded by the game.

The cropped border-corner asset was rejected because it includes neighboring art/text. Other baked headings/placeholder reward panels are excluded. Badge/title/chest review art was inspected against checkerboard/light/dark backdrops and at runtime sizes. Original fine glow/speckles are not repainted; source alpha is retained, badges are contained and never enlarged beyond displayed native pixels. This is not a claim of vector-clean artwork at arbitrary zoom.

Background and Vietnamese Noto Serif reuse the already integrated project assets. VIP 15–18 retain their distinct dragon/phoenix/crown artwork and a restrained glow; reduced-motion preference disables the decorative pulse.

## Economy and security

- Only `vip_verified_payments` rows with status `paid` contribute their **base_knb**. Bonus KNB is excluded. Wallet gifts, spending, free resources, legacy saves and Nạp Đầu Demo never affect VIP.
- Enforces **10.000 VNĐ = 1.000 base KNB**, every approved tier, VIP 5=300.000, 7=1.000.000, 15=10.000.000, 16=15.000.000, 17=25.000.000, 18=50.000.000.
- All new tables have RLS and no anon/authenticated table or RPC permissions. Functions use `security invoker` and an empty search path; trusted service role only. Existing Edge Auth selects the UID from the verified bearer token.
- Provider+transaction ID is globally unique. A transaction cannot move UID or change original amounts. Duplicate paid/refund events do not advance revision again. Refunded transactions cannot be revived by an older paid-event replay. This is accounting after verification by a future trusted gateway adapter, not a webhook-signature verifier or a browser payment endpoint.
- Player-row lock, expected revision, economy ledger request ID, one-time UID+tier key and one periodic UID+kind+period key prevent duplicate rewards. Daily/weekly periods use the server's `Asia/Ho_Chi_Minh` clock. Upgrading during a period does not create another periodic claim.
- Claims take no quantities from the client. Only approved catalog rewards mapped to existing resources are accepted; unknown IDs, zero/invalid/overflow amounts, wrong periods, insufficient VIP and duplicates reject. All reward keys validate before state is committed. Existing forge materials require a valid forge wallet.
- **The production reward catalog is deliberately empty.** JSON `Suggested` quantities, daily categories and shop discounts are draft proposals. No illustrative Gold Keys, shop prices, cosmetics or free items were activated.
- One-time gifts follow the browsed tier. Daily/weekly gifts always follow the account's actual current tier. Battle bonuses use the single current tier, not the sum of levels.
- VIP fractional critical additions use a deterministic sub-roll so +0,3 points does not round into +1 point. The original integer roll remains exact for VIP 0/current PvP. Positive-VIP HP/ATK/DEF/critical effects apply only in PvE.
- PvP's proposed 60% helper is numerically tested but **not enabled** in ranked/practice squads or arena-command.

No service-role key or game ticket secret appears in the frontend bundle scan.

## Observed verification

- `npm run typecheck`: PASS.
- `npm run build`: PASS, 131 modules; existing bundle-size warning only.
- `npm run build:cloud`: PASS. Generated bundles are local build artifacts, not deployments.
- `npm test`: **230/230 PASS**, 25 files, including **25 VIP tests**. Covers all 19 threshold boundaries and approved columns, cap, max/fractional progress, non-cumulative stats, initialized HP, fractional critical points, baseline/PvP preservation, gift states, authenticated UID delegation and rejected forged recharge. A server-settlement test proves the same client-forged VIP 18 request loses with server VIP 0 and wins only with verified server VIP 18 in the selected scenario.
- Actual staging PostgreSQL: composed the new migration and SQL tests into **one transaction ending ROLLBACK**, obtaining `VIP_SQL_QA_PASS`. Checked verified-paid replay, bonus exclusion, conversion, refund/old-event replay, gifted/spent wallet gold, UID isolation, unpublished/unknown rewards, same/different request replay, level lock, server reset dates, daily/weekly duplicate and upgrade-midday limit. Authenticated direct payment/claim/read attempts were denied.
- Follow-up database query returned `migration_rolled_back=true` and `qa_users_rolled_back=true`. The test did not leave tables, reward configuration, payment rows or QA auth accounts behind. Existing player accounts were not reset or intentionally altered.
- `node scripts/qa-vip.mjs`: `VIP_QA_PASS`, **24 milestone/viewport audit cases** (VIP 0/5/7/10/15/16/17/18 at **1920×1080**, **1280×720**, **844×390**) plus gift/shop screens. Actual touch selection visited **all 19** badge hitboxes. Bounds, Vietnamese rendering, native/uniform badge scaling, no source-atlas loads, full canvas and input after resize checked.
- Additional browser flows: mid-tier 400.000/500.000 progress, ready/claimed/locked/developing gifts, rapid double click, dropped response + same pending-ID retry, fixture UID swap, reload restoration, loading, offline/retry, missing-backend state and real Lobby VIP entry. The real CloudRepository is used with an isolated transport, not real payment/login sessions.
- Focused browser probe: ESC/back/Lobby round trip, no stale native VIP dialog, and a periodic gift correctly claiming VIP 5 while browsing VIP 0. `VIP_FOCUSED_QA_PASS`.
- Visually inspected runtime milestones, mobile layout, reward states, loading/error, badge perimeter audit and side-by-side kit preview comparison. `git diff --check`: PASS.

Local ignored artifacts: `.vite/vip-qa/report.json`, `focused-report.json`, `vip-{tier}-{resolution}.jpg`, `gifts-empty-*`, `shop-*`, `gift-claimed-mobile.jpg`, `progress-mid-mobile.jpg`, `locked-mobile.jpg`, `loading-mobile.jpg`, `offline-mobile.jpg`, `backend-pending-mobile.jpg`, `lobby-vip-entry-mobile.jpg`, `badge-audit.jpg`, `reference-comparison.jpg`. Any high VIP total or ready reward shown in these images is an explicit isolated QA fixture, not a player purchase or a live reward configuration.

## Not deployed / not verified live

1. **Migration and new game-command have NOT been installed/deployed on staging or Production.** SQL rollback verification is not a deployment. Old backend remains compatible; VIPScene displays that the backend update is pending when metadata is absent. No commit/push/deployment was performed.
2. **No actual payment gateway, webhook signature verification, checkout, spendable-KNB fulfillment, partial refund/chargeback integration or real money transaction** was implemented/claimed successful. The private recorder must only be called after verification by a future trusted adapter. Its accounting alone is not a complete payment integration.
3. Level/daily/weekly reward quantities, shop products/prices/discounts and related fulfillment need approved server configuration before release. No rewards are seeded from proposal quantities.
4. Sweep/3-star/stamina limits, auto stage chains, normal-monster/boss eligibility/skip and an EXP bonus amount/backend are missing. They explicitly display **Đang phát triển**. No fake resource grant, quota or skip is substituted. No PvP VIP bonus is enabled.
5. **Real Supabase account login/re-login and real gateway E2E were not tested.** Browser UID/reload/payment/reward fixtures do not replace real-account verification. No authenticated QA sessions were supplied or password-reset shortcut used. No physical-device performance/60 FPS benchmark is claimed.

Release order when staging deployment is separately requested: review the schema/catalog boundary, apply this migration to the existing staging project, deploy the rebuilt game-command, then verify the frontend with real QA sessions. Do not enable payments or seed draft reward amounts as part of an automatic frontend deployment.
