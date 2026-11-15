# Technical Design — 3Q Legend H5 v0.1

## Scope and stack

Phaser **3.90.0**, TypeScript **5.7.x**, Vite **6.x**, Vitest **3.x**. Fixed logical 1280×720 Canvas, `Phaser.Scale.FIT` and CENTER_BOTH. Node.js 22 recommended. No other frontend framework until there is a clear UI scaling or accessibility need.

## Architecture and responsibility boundaries

```
Browser
 └── Phaser Game (src/main.ts)
      ├── Boot
      ├── Lobby (main navigation hub)
      ├── Campaign ───► Battle ───► Result
      ├── Formation     │
      ├── Heroes        └──► domain/battle.ts (no Phaser dependency)
      ├── Summon ───────────► domain/summon.ts (pure draw logic)
      ├── Inventory, Topup, Info
      └── UI helpers (ui/UiScene.ts)
                            │
         domain/store.ts (save/load/commands + LocalStorage)
                            │
              data/heroes.ts + data/campaign.ts
```

The `domain/` layer must never import Phaser. Scenes only render and invoke commands; no hidden gameplay balance hard-coded in UI.

## Core save schema (`schemaVersion: 1`)

- `playerName`, `coins`, `gems`, `goldKeys`
- `heroes`: unique IDs; `formation`: exactly 6 slots, each null or owned hero ID
- `heroShards`: number per hero ID
- `clearedStages`: unique stage IDs
- `summonPity`: number of consecutive non-SSR draws (0–49)
- `firstTopupDemoClaimed`: dev-mode-only local toggle

The file validates/normalizes basic save data. Migration architecture for v2+, semantic validation, encrypted transport, account auth, cloud-sync, and server-signed inventory are production scope.

## Combat model

`BattleUnit`: uid, heroId, side, slot, name, role, hp/maxHp, atk, def, speed, actions, nextActionAt.

`BattleEngine.step()` advances one action, returns a list of gameplay events (`damage`, `heal`, `ko`, `end`) that Phaser may animate. `BattleEngine.finish()` fast-forwards the same simulation for Skip.

Tests must cover six heroes on each side, empty formation slots, a battle always terminating, target prioritization, no duplicate slots, event ordering, and action frequency. Future improvement: inject a seedable deterministic RNG and serialize battle inputs for match replay and anti-cheat.

## UI scenes

| Scene | Responsibility |
| --- | --- |
| Boot | Entrypoint (later asset preload) |
| Lobby | Palace hub / resource bar / navigation |
| Heroes | Collection cards and ownership indicators |
| Formation | Select hero + place/remove within six slots |
| Campaign | Chapter/stage unlock status and battle launch |
| Battle | Visualizes engine state, speed/skip |
| Result | Rewards idempotently on first clear; restart/navigation |
| Summon | Golden Key draws + pity + inventory updates |
| Inventory | Currency/shards view |
| Topup | DEV mock only, noncommercial |
| Info | Explicit provisional views (Welfare, Missions, Mail, Shop) |

## Assets and UI evolution

Replace `UiScene.heroAvatar()` and code-generated backgrounds with original sprite sheets/Spine animations. Suggested asset directories in next increment: `public/assets/{heroes,backgrounds,ui,vfx,audio}` and a `manifest.json` with asset state/licenses. Render every hero at named anchor points and keep content/data separate from asset paths.

## Security before launch

LocalStorage is **never trusted** as economy authority. For online monetized release, implement authentication, authenticated backend, server-authoritative gacha, verified payment events/webhooks, replay/idempotency protection, order ledger, rate limiting, secure time and server currency balances. Do not expose a mock payment button in production (currently dev-gated).

## Risks and controls

1. UI in 1280×720 may be too dense on mobile: later safe-area/orientation/layout QA.
2. Battle is simplistic: test pacing and stat curves before creating 100+ heroes.
3. Gacha rates and first-topup rewards are DRAFT; get product, policy and legal review before payments.
4. NPC/game art placeholders must not be mistaken for production art: use an original art pipeline.
5. Stage rewards and battle outcome are client-authoritative in v0.1; migrate to server before online release.
6. NPM dependencies couldn't be installed in the initial authoring environment; receiving agent MUST run build/tests and report actual results.

## Architecture decisions

- ADR-001: Phaser 3.90 rather than newest Phaser major for dependable v3 API and TypeScript examples; upgrade only with QA.
- ADR-002: Keep gameplay engine framework-agnostic to enable fast tests and eventual server simulation.
- ADR-003: LocalStorage schema v1 only for offline scaffold.
- ADR-004: All navigation from Lobby uses named scenes; placeholder features show clearly scoped screens.
- ADR-005: Keep 6 slots from Day 1 even if player owns only 3 heroes; owning heroes and deploying heroes are distinct concepts.
