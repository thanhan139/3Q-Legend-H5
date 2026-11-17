# 3Q LEGEND H5 — VIP 0–18 ASSET KIT v1.0

## Contents
- `assets/badges/vip_00.png` … `vip_18.png`: all **19 distinct VIP badges**. Baked level numbering is intentional.
- `assets/progress/`: ornate progress header, two bar samples and six-gift ornamental strip. **Six-point strip is an illustration only** and must not be used as a mathematically accurate 19-level progress meter.
- `assets/rewards/`: locked, available, claimed, premium and opened chest variations.
- `assets/buttons`, `assets/tabs`, `assets/panels`, `assets/icons`, `assets/ornaments`: independent PNG textures.
- `assets/runtime_blank/`: **11 clean alpha PNG button/tab/panel/slot/progress textures without baked text**; these are preferred for changing labels and data.
- `source_atlases`: the three original image-generation source sheets for tracing/correcting crops.
- `ASSET_MANIFEST.csv`: dimensions, coordinates, flags, status, SHA256.
- `PHASER_TEXTURE_MAPPING.json`: texture paths and nine-slice recommendations.
- `VIP_BALANCE_PROPOSAL.json`: VIP 0–18 thresholds, 5 approved bonus columns and draft privileges/rewards.
- `PROMPT_FOR_CODEX.md`: integration task prompt.
- `docs/CONTACT_SHEET.jpg`, `docs/SCREEN_LAYOUT_PREVIEW.jpg`: visual reference.

## Important quality note
These graphics originate from generative concept sheets. **The 19 badges are individually cropped, but some fine edge glow/speckles and text rendering require artist QA before production.** Assets marked `review` need edge inspection on both light/dark backdrops. We are NOT claiming this ZIP is a fully polished vector/UI source or that game code was integrated.

Baked words and illustrative quantities on source art are not game state. Use clean runtime_blank graphics and actual live state. Never infer inventory item IDs from the artwork. Do not ship any fake amounts or duplicate screen-size source-sheet backgrounds.

## VIP design contracts
- New accounts VIP 0. Max VIP 18.
- 10,000 VND purchases 1,000 base KNB; only **server-verified paid base KNB**, accumulated per UID, counts toward VIP. Free/bonus KNB and Nạp Đầu Demo do not.
- Core bonuses 5 columns ATK, DEF, HP, crit rate points, crit damage percentages; data table is in JSON. Bonuses do not stack from VIP 1 to VIP N.
- PvE uses 100% bonuses. Proposed PvP multiplier 60%; server battle validation required.
- One-time level rewards must be claimed exactly once per UID per VIP tier; daily reward and weekly reward claim counters server-authored.
- Existing online Auth, SaveV2, Summon 50/100, Campaign and Inventory must remain intact.
