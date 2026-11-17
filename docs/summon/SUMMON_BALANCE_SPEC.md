# M7.4 / Summon Balance — proposal to approve and implement

**User target:** a player who spends up to **50 Golden Keys** without an SSR-or-higher is guaranteed SSR-or-higher on pull 50; one who goes up to **100 Golden Keys** without an SSS+ is guaranteed SSS+ on pull 100. Each summon spends **1 key**; x10 spends **10 keys** and advances counters one pull at a time.

## Proposed BASE rarity rates (without pity override)

| Rarity | Base probability |
|---|---:|
| R | 75.0% |
| SR | 20.0% |
| SSR | 4.2% |
| SSS+ | 0.8% |
| **Total** | **100.0%** |

This is a balance suggestion, not yet proven to be the desired production economy. The older supplied snapshot used R=80%, SR=17%, SSR=2.5%, SSS+=0.5%, SSR pity 50 and SSS+ pity 200. The new rates are substantially more generous and should be approved before production. The concept board displays these suggested numbers but the authoritative GameStore/server must be updated consistently.

## Deterministic pity semantics (important: guaranteed AT the 50th/100th, not the 51st/101st)

- `ssrPity` = consecutive pulls since last SSR or SSS+; valid 0..49.
- `sssPity` = consecutive pulls since last SSS+; valid 0..99.
- BEFORE rarity roll for each pull: if `sssPity == 99`, **force SSS+**. Else, if `ssrPity == 49`, guarantee **SSR or higher**. Allow a naturally rolled SSS+; if not SSS+, override to SSR. Do not force SSS+ merely because an SSR pity triggered.
- Regular roll must implement one coherent distribution across R / SR / SSR / SSS+.
- AFTER a rolled rarity: `SSR` resets `ssrPity` only; `SSS+` resets **both**; `R/SR` increment both counters, except a counter reset by preceding result.
- For `x10`: process each of the 10 pulls in sequence inside the server-authoritative command. Never reset counters per batch or treat x10 as a single pull.
- At 50/100 boundary, if the player naturally receives qualifying rarity, that counts and the counter resets normally.
- When player already owns a hero, grant shard compensation using the EXISTING server-validated hero/duplicate configuration. Do not create a second client-side grant.
- Rarity roll does not invent a hero; draw only from `summonable` heroes with matching rarity. Empty pool must fail safely (rollback), not return undefined.
- Because this is online-only, server is authoritative for consuming Golden Keys, RNG, prize, pity, idempotency and saving the same transaction. Client should only render the confirmed result.
- Migration from old SSS+ pity=200 to limit=100: preserve count with a verified, versioned server migration. A reasonable approach is `min(oldCounter, 99)` (user close to or past 100 now guaranteed next pull), but reconcile actual server schema and confirm existing records first. Never reset counters silently.

## Test cases (for Codex to implement)

- 49 misses + next pull => at least SSR.
- 99 misses + next pull => SSS+.
- SSR at 20 -> SSR counter 0, SSS counter continues.
- SSS+ at 20 -> both counters 0.
- x10 crossing 50/100 guarantees on the exact pull.
- At n=50 SSR pity, natural SSS+ must remain SSS+.
- Duplicate reward is granted only once and persisted.
- Insufficient keys rejects entire x10 before any charge.
- Concurrent requests/replay of same transaction ID cannot charge or reward twice.
- Verify UI shows progress from server values and reload/device switch retains them.
- Validate base rates sum to 1 with numeric epsilon; verify RNG boundaries with deterministic fakes.
- `R`, `SR`, `SSR`, `SSS+` hero pools must each contain at least one real summonable hero.
