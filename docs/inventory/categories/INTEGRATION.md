# Inventory category icon-first popup v2

Implemented directly in Lobby. The former DOM rectangular-button grid and its production CSS are removed. A separate Phaser overlay Scene now draws one translucent rounded panel, a 44% dim layer, thirteen independent PNG images, dynamic Vietnamese Text labels and invisible touch zones. It does not create thirteen panels or add a Back to Lobby button.

Read the supplied README, prompt, manifest, mapping and contact sheet. All thirteen `assets/icons_320` PNGs are copied byte for byte to `public/assets/inventory/categories/`; their original alpha is retained. Reference sheets and labeled images are never loaded. Alpha bounds normalize visual size without cropping or stretching the images.

Desktop: seven icons above six horizontally centered icons, approximately 98 px visible icon bounds and 16 px labels. Mobile landscape: two rows scroll together horizontally, approximately 74 px visible icons, 14 px text, controlled wrapping for long names and touch zones larger than 44 CSS px. Popup coordinates compensate for Phaser/CSS scale; the close button stays visible. Resize rebuilds the layout and mask without leaving listeners on a destroyed scene.

One generic icon interaction handles normal, hover (1.05), press (.96) and selected states. Tween replacement avoids stacking; one shared gold halo and highlighted label mark selection. Opening fades in over 160 ms. Outside click, X, ESC and tapping the dock again close the popup. Lobby input stays blocked while open; close cleanup removes the Scene and restores input after the current gesture.

## Routes

- Đạo Cụ → existing InventoryScene and its existing UID-bound store/save flow.
- Trang Bị → existing EquipmentScene, bag view.
- Other eleven categories → “Tính năng đang phát triển”. They remain interactive. No fake items, claim buttons, payments or rewards were created. The existing Forge crafting scene was not substituted for a dedicated Thần Binh inventory-category view.

No GameStore, inventory quantities, SaveV2, Supabase, Battle, VIP, Welfare, Campaign or Summon logic was changed. No account reset, commit, push or deployment was performed.

## Files

- `src/ui/inventoryMenu.ts`: Phaser overlay, icon views, scroll/input/micro-animation/lifecycle.
- `src/ui/inventoryCategoryConfig.ts`: stable IDs, labels, texture keys, feature state and destination.
- `src/ui/inventoryCategoryLayout.ts`: shared responsive geometry.
- `src/data/inventoryCategoryAssets.json`: supplied mapping and measured alpha metadata.
- `src/scenes/LobbyScene.ts`: modal Scene integration, real navigation, resize behavior.
- `src/style.css`: removal of old rectangular-menu CSS.
- `tests/inventoryCategories.test.ts`, `scripts/qa-category-icons.mjs`.

`legacy-menu.*.txt` are historical files used only to reproduce the before screenshot in the isolated QA fixture. They are not imported by production UI.

## Observed verification

- Typecheck and standard Vite build PASS. Existing large-chunk warning remains.
- Standard regression: **259/259 tests PASS, 32 files**.
- Real Lobby + Phaser popup captured at 1920×1080, 1280×720 and 844×390. Thirteen images are present at each resolution, in the supplied order. Inspected desktop and mobile screenshots for alpha, aspect ratio, label spacing, wrapping and the absence of individual boxes.
- Browser QA PASS: ESC/close/outside/dock toggle; resize while open; touch selection; mobile horizontal drag to the last category; eleven development actions; bounded active tween count; actual InventoryScene and EquipmentScene entry. No browser exceptions.
- QA uses isolated local save fixtures and blocks Supabase requests. Live authenticated UID/server E2E and physical-device performance were not newly tested for this UI change.

Reproduce with `node scripts/qa-category-icons.mjs` (existing Playwright + Chrome installation). Screenshots use the actual game renderer, not a mockup.

## Captures

- [Before](qa/before.jpg)
- [Desktop 1280×720](qa/after-1280x720.jpg)
- [Full HD 1920×1080](qa/after-1920x1080.jpg)
- [Mobile 844×390](qa/after-844x390.jpg)
- [Mobile scrolled/selected](qa/mobile-scrolled.jpg)
