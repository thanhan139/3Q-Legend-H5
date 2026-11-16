# 3Q Legend H5 — Phaser + TypeScript (M8 source)

**Status:** online-only source with new-player onboarding, account login, Cloud Save and asynchronous PvP. M8 requires its database migration and updated game-command deployment before publishing the frontend. See [M8 onboarding and validation](docs/M8_ONBOARDING.md).

## Requirements

- Node.js >= 20.19 or >= 22.12 (Node 22 recommended)
- npm
- Modern browser with Canvas/WebGL

## Run locally

```bash
npm ci
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

Copy `.env.example` to `.env.local`, set the Supabase URL and publishable key for your environment, and restart Vite. Environment files are excluded from Git. The game requires an authenticated session and a confirmed Cloud Save to enter the lobby. Without Supabase configuration the startup screen explains the connection requirement.

Merge reviewed changes into `main` to update Staging Preview through GitHub Actions. One-time `VERCEL_TOKEN` setup and release checks are documented in [GitHub and Vercel Preview](docs/GITHUB_VERCEL.md). Frontend and Supabase source share this repository; backend deployment remains separate.

Login and session restoration automatically load the character or initialize it once when the server confirms it is missing. No save-source choices are shown. An unfinished M8 tutorial resumes; otherwise the player enters Lobby. See [automatic online login and validation](docs/ONLINE_LOGIN.md).

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

### Walkthrough

1. Log in with a verified email account → resume tutorial or enter Main Lobby (`Lobby`). New accounts follow the advisor through the first battle and hero upgrade. Settings → Trợ Giúp opens a read-only guide.
2. Use the lobby to open Campaign, Heroes, Formation, Summon, Inventory, Missions, Welfare, Check-in, Mail and First Top-up. Check-in shows its release condition.
3. Campaign 1-1 → Auto Battle → Results → back to Campaign or Lobby.
4. Clear 1-3 → unlock Golden Key summon. Use keys via x1/x10; duplicates become shards.
5. Clear 2-1 / 2-4 / 3-1 → unlock guaranteed milestone heroes. Arrange 6 slots in Formation.
6. The top-up page offers a configured one-time demo reward. It saves the wallet, hero reward and claimed flag together. No payment operations are present.

## Project boundaries

- **6v6** = up to 6 heroes on each side. Early game starts with 3 owned, so battles may be uneven on purpose; the remaining slots unlock through progression/summons.
- Battle domain logic is independent of Phaser in `src/domain/battle.ts`.
- Roster and rewards are data-driven (`src/data/*`).
- Save schema v2 stays server-authoritative. Local legacy saves are retained for explicit approved migration; network failures never fall back to local gameplay.
- Summoning odds and pity are configured in `src/data/heroes.ts` and remain **draft balance**, not production-approved monetization.
- Historical Three Kingdoms names only; the lobby uses original generated artwork and the combat, roster, and formation use an original portrait atlas.

## Folder tree

```
3q-legend-h5-scaffold/
├── docs/
│   ├── GDD_v0.1.md
│   ├── TECHNICAL_DESIGN_v0.1.md
│   ├── ACCEPTANCE_CHECKLIST.md
│   └── SOL_HANDOFF.md
├── public/favicon.svg
├── src/
│   ├── data/                # Hero roster & 15 campaign stages
│   ├── domain/              # Battle, summon, save store, model types
│   ├── scenes/              # Boot, Lobby, Campaign, Battle, Result, ...
│   ├── ui/                  # Shared UI primitives / palette
│   ├── main.ts
│   └── style.css
├── tests/                   # Domain tests
├── index.html
├── package.json
└── tsconfig.json
```

## Known limitations / intentional omissions

- Hero animation coverage and audio remain partial. Combat includes rage, status effects, equipment and faction synergy; balance remains provisional.
- No real payment processing, guild system, sweep rewards or live mailbox. PvP is asynchronous, not real-time multiplayer.
- LocalStorage retains caches and legacy saves; it is never accepted as the authority for online balances.
- UI is designed in a 1280x720 landscape coordinate space with Phaser FIT scaling, not a finished small-phone accessibility pass.

## Local validation

If network-interface discovery fails in a restricted environment, use `npm run dev -- --host 127.0.0.1`. The default command still listens on the LAN for mobile testing.

See `docs/VALIDATION_REPORT.md` for the M0–M1 results and `docs/M2_VALIDATION.md` for M2A–M2B. See `docs/M3_VALIDATION.md` for campaign and hero progression.

## Handoff

Give GPT 6.1 Sol the repository plus `docs/SOL_HANDOFF.md` (the handoff prompt). Read `docs/GDD_v0.1.md` and `docs/TECHNICAL_DESIGN_v0.1.md` first.

The v0.1 design and handoff files are historical. Use current source and the M6–M8 documents for account, server-authoritative commands, combat and onboarding behavior.

## Tài khoản và lưu online

Xem [cấu hình Supabase cho M6A](docs/M6A_SUPABASE.md).

## Đấu Trường online

Xem [M7.2 Arena Online](docs/M7_2_ARENA_ONLINE.md) để đăng ký phòng thủ, kiểm tra luật điểm và triển khai Edge Function.
