# P1 Lobby text and asset alignment

Scope: Lobby rendering and its local dialogs only. GameStore, SaveV2, Auth, Supabase, gameplay configuration and assets are unchanged. Original image files are reused byte-for-byte.

## Asset audit

`CONTENT_ASSET_AUDIT.json` records the SHA-256 and text policy of all 18 Smooth Lobby PNGs, plus reused/candidate HUD art. Six feature images, eight bottom-nav state images and two old campaign CTAs have baked labels (16 total). The check-in calendar also has a decorative baked “7”; it is not used as a live check-in count. There are no Phaser labels over these baked words.

| Component | Runtime source | Source-pixel contentRect / policy |
| --- | --- | --- |
| Profile / VIP | Blank red button, clean 307×89 frame | (30,18,247,53); avatar/name/level/power/VIP partitioned in metadata |
| Currency | Same blank red frame | Separate icon, label, value and plus cells; full balance available in the currency dialog |
| Campaign | Existing text-free PvP season-status panel, 420×330 | (38,40,344,254); title/stage/power/progress/CTA rows |
| Campaign CTA | Blank gold button, clean 299×102 frame | (30,24,239,54); dynamic “KHIÊU CHIẾN” fitted into the inner body |
| Upper menu / bottom navigation | Existing labelled PNGs | Texture label rectangles define the baseline; no dynamic label overlay |
| Left menu | Blank red button + icon atlas | Label is fitted to the remaining inner body after reserving the icon cell |

The original campaign CTA PNGs are no longer drawn, preventing accidental duplicate “Chinh Chiến” overlays. The selected summon PNG has a clipped right edge; its hover state now uses the complete default image with tint. The blank Welfare tab was inspected but rejected for the multi-row profile because its internal gold divider consumed the third text row. No rectangles are placed over baked text and no bitmap editing is needed.

## Layout and typography

`lobbyContentLayout.ts` owns texture dimensions, source-pixel content rectangles, component slots and uniform fit/projection functions. `LobbyContent.ts` fits text against both measured dimensions inside a padded rectangle. It changes font size, permits at most two name lines and uses bounded ellipsis only when the minimum readable size cannot fit. Balances above one billion use locale-aware compact display; the full original amount remains visible through the wallet interaction. No player data is changed by formatting.

Uniform texture scale preserves all borders, character proportions and icons. The Lobby no longer stretches skinny button textures into tall panels or uses nine-slice backgrounds. Existing EXPAND viewport anchors move the complete component, including its text, hitboxes and debug geometry, together in Phaser coordinates. Canvas bounds and safe-area handling are unchanged.

## Debug and reproduction

Press **F8**, or add **`?lobbyDebug=1`** to the game URL. Teal outlines show padded dynamic contentRect cells, magenta outlines show measured Phaser text bounds, and gold outlines identify baked-label cells. Debug mode does not alter gameplay, save state or input.

Run in an isolated QA checkout/browser with no real login:

```sh
npm ci
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/qa-lobby-content.mjs
```

On Windows the QA script can use installed Chrome, or a `CHROME_PATH` override. The generated fixture uses actual Lobby scenes, actual assets and a local GameStore. It never authenticates or writes to Supabase. A local-only stress case checks a 24-character wide name and maximum safe balances; these values are not shipped as defaults or sent to the server.

Clean and debug screenshots plus `report.json` are generated in ignored `.vite/lobby-content-qa/` for 1920×1080, 1846×864, 1280×720 and 844×390. Checks include measured text containment, profile/VIP separation, currency row separation, no baked-label overlays, uniform image scale, complete hitboxes, campaign/dock separation, four evenly spaced dock entries, mouse/touch dialogs, unchanged save and navigation to Formation/Campaign/Welfare/Arena.

## Observed validation — 2026-11-16

- Standard `npm test`: **189/189 PASS**, 21 test files, including 10 content geometry/asset-policy cases.
- Standard `npm run build` (TypeScript + Vite): PASS. Existing large-chunk warning remains.
- Installed Chrome/WebGL: all four required resolutions PASS; 20 dynamic text fields fit their padded cells at every size. Normal/debug screenshots and the wide-name/large-wallet stress case were inspected.
- Mouse/touch profile, VIP and full-balance dialogs, Formation/Campaign/Welfare/Arena routes: PASS; normal navigation did not mutate the local snapshot.
- `git diff` confirms no changes under `src/domain`, `src/cloud`, `src/data`, `supabase` or `public`. No deployment is included in this UI change.
