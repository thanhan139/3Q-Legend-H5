# Lobby polish

The palace background, character placement and existing routes are retained. The player panel, navigation medallions and Campaign card now use coordinated red/gold borders, spacing and press/hover feedback. Reward dots still follow existing welfare eligibility.

The whole player panel opens **Hồ Sơ Chúa Công**. Its avatar is the current lead portrait, UID comes from the active CloudRepository owner, and level/power use the same calculations as the Lobby. Server is labelled Staging for the known staging project; other environments show an unconfigured label. No new profile fields are persisted.

The profile links to existing account management and shares its logout handler. Logout requires confirmation, offers cancellation and shows retryable failure feedback. Avatar changes remain unavailable.

**VIP** has its own hit region and modal with status, recharge progress, benefits and gifts. All are explicitly unconfigured/unavailable; no VIP levels, payment thresholds or rewards were invented. Bang Hội and Thế Giới open explanatory coming-soon modals. Existing First Top-up remains its original demo feature.

Native dialogs block the canvas behind them, trap focus, support Escape/close, scroll within the viewport and are removed on scene shutdown. Player text is inserted as text, not HTML. No domain, SaveV2, GameStore, Supabase backend or tutorial targets were changed.

## Validation

- Local typecheck passed. Native Windows test/build commands still hit the environment's `spawn EPERM` restriction.
- On a temporary Linux sandbox, Node 22.23.5/npm 10.9.10: standard typecheck, all 120 regression tests and Vite build passed. The existing large-bundle warning remains.
- Chromium UI smoke checks passed at 1280×720 and 844×390: player panel, avatar loading, avatar placeholder, logout cancellation, VIP/unavailable controls, guild/world placeholders, Escape, repeated opening, modal bounds and horizontal overflow. No page errors or changes to the Save snapshot occurred.
- Additional isolated UI checks passed for long UID/name rendering, text safety, account callback, logout failure/retry controls, cancelled drags and the larger mobile VIP hit area. Character presses now use the same press/release guard as the navigation controls.
- Browser review used an isolated, temporary render harness loading the actual Lobby/assets. It bypassed login only in that harness, with no Supabase credentials or writes. This is UI validation, not a claim of live account/login/logout E2E success. The harness is not part of the shipped source.
- This source update has not been committed, pushed or deployed.
