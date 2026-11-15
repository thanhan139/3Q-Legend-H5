# Game Design Document — 3Q Legend H5 v0.1

**Status:** Skeleton specification / not final game design. **Genre:** collectible Three Kingdoms chibi RPG, semi-idle battle, H5 landscape. **Target:** PC and mobile browsers, 1280×720 logical scene, responsive canvas.

## Vision

Create an original 2D chibi Three Kingdoms RPG with a lively palace lobby, memorable heroes, accessible auto-combat and long-term roster progression. Inspiration may come from classic 3Q H5 titles, but do not copy another game's copyrighted UI/assets/music/design verbatim.

## Core loop

1. Enter Lobby; view latest progress and resources.
2. Open Campaign; choose unlocked stage.
3. Review Formation (up to six slots: 3 frontline + 3 backline).
4. Play automated battle, optionally x2/skip.
5. See Results and first-clear rewards; persist progress.
6. Recruit/update heroes and return to Campaign.

## Battle rules (prototype baseline)

| Rule | v0.1 |
| --- | --- |
| Team size | Max 6 vs 6, not necessarily full in early campaign |
| Formation | Positions 1–3 frontline; 4–6 backline |
| Turn priority | Individual speed / next-action time |
| Targeting | Frontline targets first; after frontline falls, backline is targetable |
| Attack | Physical-equivalent single-target damage, defense reduction |
| Special | Every third action: 1.72× damage, or support healing |
| End condition | All alive units on one side defeated; safety cap at 500 actions |
| Speed | x1 / x2 button, auto-battle; skip finishes deterministic simulation |
| Victory | First clear stage pays first-clear rewards once |

Later: distinct active/passive skills, mana, buffs/debuffs, battle formations, counterattack, controlled RNG & deterministic replay, elemental/faction synergy and polished animation. Do **not** implement these until the core loop is stable.

## Staged unlocks

- Start: Trương Phi, Quan Vũ, Lưu Bị; 3 heroes deployed.
- Clear 1-3: unlock Golden Key Summon and obtain five keys.
- Clear 2-1: obtain Triệu Vân.
- Clear 2-4: obtain Hoàng Nguyệt Anh.
- Clear 3-1: obtain Mã Siêu.
- Summons can grant new heroes earlier; milestone duplicates should not give a duplicate roster item.
- Campaign has 3 chapters × 5 placeholder stages; expand after playtesting.
- Heroes are owned separately from the six formation slots. More than six owned heroes are allowed.

## Summon: Golden Key

- Demo rates: R 80%, SR 17%, SSR 3%; SSR guaranteed no later than 50th summon.
- x1 / x10 consume 1 / 10 keys; no free key debt or negative currency.
- Duplicate hero => 10 shards; shards upgrading is out of scope for v0.1.
- Provide visible odds and pity counter; rates are subject to balancing.
- Backend must own RNG, inventory and transactional idempotency once the game is online.

## First top-up

- Concept reward: Triệu Vân SSR + 5 Golden Keys + 1,000 coins, one claim per user.
- In v0.1 this is a local DEV-only mock grant; NO REAL PAYMENT.
- Live design later requires verified provider receipt/webhook, server-side idempotency, audit trail, abuse controls, refunds policy, region/legal review and disclosure. Free players can unlock a full six-hero formation.

## Lobby: primary hub

- Topbar: player level/name placeholder, server, coins, gems, golden keys.
- Center: featured/lead chibi hero and palace environment (procedural placeholder in v0.1).
- Left-side events/quests: Welfare, Missions, First Top-up, Mail.
- Right: Campaign, Summon, Formation, Hero Collection.
- Bottom dock: Lobby, Heroes, Formation, Bag, Summon, Shop.
- Empty/locked features must show a status or real destination, never swallow clicks silently.
- Final art wishlist: imperial courtyard, banners, lanterns, clouds, animated lead hero, dynamic button glow.

## MVP acceptance

A player can follow: **Lobby → Campaign → Battle → Result → Lobby → Formation → Summon → Heroes**, and progression survives a page reload. See `ACCEPTANCE_CHECKLIST.md` for technical checks.

## Future roadmap (not in v0.1)

Character story, guilds, arena, expeditions, faction affinity (e.g., Lưu Bị + Quan Vũ + Trương Phi), boss events, daily quests, seasonal events, live economy, production shop/payment, server saves, anti-cheat, analytics, accessibility and art/SFX pipeline.
