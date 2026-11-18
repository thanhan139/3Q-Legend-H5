# Unified Hero / Equipment UI

## Implementation

- `HeroesScene` is the only hero route. The old roster/stage/paper renderer has been removed from that scene.
- `EquipmentScene` always renders the same equipment-theme shell. `bag: true`, slot selection and inventory links open a modal inside this shell; the previous three-column screen has been removed.
- `equipmentThemeView` supplies the shared header, four tabs, roster, character artwork, equipped slots, power and theme effects. Detail, skills and signature content occupy its right panel.
- `heroNavigation` holds transient `selectedHeroId` and tab state, scoped to the connected cloud UID. Scene arguments are validated against the current roster. Collection previews cannot open equipment for an unowned hero.
- Gear selection is reset on hero changes. Incoming foreign item IDs are discarded; selecting another owner's gear explicitly inside the bag remains supported for the existing unequip command.
- Upgrade, star, signature forging/equipping, enhancement, enhancement stones and prestige skin actions still use `UiScene.saveAction` and existing server commands. No SaveV2, GameStore, Supabase schema or combat changes.

## Entry routes checked

Lobby hero dock and hero showcase, Summon results, Battle results, Inventory/category navigation and Tutorial all retain the canonical `Heroes` / `Equipment` scene keys. Only one of each is registered in `main.ts`. Old `skillTab` / `signatureTab` arguments are translated to the new tabs, never to a legacy renderer.

## Artwork

The existing Equipment Themes v2 textures are reused, including the repaired eight-frame Điêu Thuyền atlas. Quan Vũ, Triệu Vân, Lữ Bố, Gia Cát Lượng and Điêu Thuyền use their full-body artwork and distinct effects on every tab. Other heroes retain their own available artwork; no substitute hero is used. No new character artwork was generated. Legacy hero UI textures remain on disk because ResultScene still references several of them; Heroes and Equipment no longer render them.

## Verification

- Typecheck: PASS.
- Vite build: PASS (150 modules; existing >500 kB chunk warning).
- Regression: 265 / 265 tests, 34 files, PASS.
- `scripts/qa-hero-system.mjs`: actual Phaser scenes in Chrome, 1920×1080, 1280×720, 844×390; before/after captures; six heroes × four tab transitions; expected power and owner-specific gear; foreign UID reset; modal close with ESC; resize; mobile touch; signature text bounds; save unchanged; zero browser exceptions.
- `tests/heroNavigation.test.ts`: selection across tabs, UID changes, collection restrictions and equipment identity.
- Screens use isolated local QA fixtures and block Supabase requests. Live account login and server mutations were not exercised by this UI task. No deployment or push performed.

## Actual screenshots

- [Hero 1280×720](qa/after-Heroes-1280x720.jpg)
- [Equipment 1280×720](qa/after-Equipment-1280x720.jpg)
- [Mobile equipment](qa/after-Equipment-844x390.jpg)
- [New gear manager](qa/after-manager-1280x720.jpg)
- [Before / after comparison](qa/comparison-before-after.jpg)
- [Skills](qa/after-skills.jpg), [Signature](qa/after-signature.jpg)
- [Browser QA report](qa/after-report.json)

Run `node scripts/qa-hero-system.mjs` to regenerate after captures. `--before` is intended only against the earlier source revision; the existing before screenshots were taken before editing these scenes.
