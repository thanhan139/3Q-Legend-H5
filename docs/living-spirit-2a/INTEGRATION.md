# Living Spirit Phase 2A

**Current status:** Phase 2B is now integrated on the same controller; see [expansion report](../living-spirit-2b/INTEGRATION.md). The Phase 2A evidence and exclusion notes below record the original pilot milestone.

## Runtime

- Imported only six original PNG atlases, byte-for-byte verified against `FILE_MANIFEST.csv`. Every image decodes as RGBA, each frame is nonblank and distinct. No GIF or poster is loaded by the game.
- Canonical mapping: `guan-yu` → `quan_vu` (Thanh Long), `zhao-yun` → `trieu_van` (Lôi Long). Quan Vũ was integrated and reviewed first; `qa/pilot.json` records that gate before Triệu Vân was enabled. No Phase 2B mappings were added.
- Shared Heroes / Equipment renderer is unchanged in layout. The pilot spirit replaces the previous back/spirit-loop layers for these two heroes; the existing foreground aura remains. One uniformly scaled 384×384 sprite is inserted before the pedestal, hero and gear slots.
- Idle: 16 frames, 145 ms/frame, loop. Selected: 12 frames, 95 ms/frame. Power Up: 12 frames, 85 ms/frame. One-shot clips return to Idle on Phaser's animation-complete event.
- Selection is scoped to the shared selectedHeroId and account. Changing tabs, opening the bag and restarting the same hero do not replay Selected. Both atlases remain cached after visiting both heroes; only the selected hero's three new atlases load initially. Maximum six new atlas textures, one active spirit sprite.
- Reduced motion, disabled effects and low quality display static idle frame 0. The media preference is observed while the scene is active. Sprite and media listeners are released on scene shutdown.

## Confirmed enhancement boundary

`EquipmentScene` and the signature enhancement tab in `HeroesScene` enqueue Power Up only inside the successful existing `saveAction` callback. In addition to the receipt, the confirmed snapshot must contain the same item UID, item ID and hero owner, with a strictly higher level than before the request. Rejections, network errors, pending requests, equipping, skin changes and unchanged retries cannot trigger it.

Presentation events are deduplicated per account, hero, item UID and confirmed level. Nothing is written into SaveV2 or Supabase. A confirmed effect waits while the opaque bag modal covers the hero, then plays once after closing it. The signature panel is unobstructed, so its effect plays after the confirmed refresh.

## QA evidence

Final checks: **typecheck PASS, Vite build PASS (153 modules), 270/270 regression tests PASS in 35 files**. Existing >500 kB bundle-size warning remains. Runtime browser QA: **PASS**, zero page exceptions; 50 switches. Both WebM files decode and play at 1280×720 without media errors (`qa/clip-validation.json`). Desktop requestAnimationFrame samples over ~2.2 seconds: Quan Vũ **56.70 FPS**, Triệu Vân **56.52 FPS** with preserved drawing buffer for capture. These short samples do not establish sustained 60 FPS on physical mobile hardware.

`scripts/qa-living-spirit.mjs` runs the actual Phaser scenes. Its local Vite plugin replaces only the command boundary in that QA server to control pending/success/rejection/network responses. The production command path is unchanged. No Supabase account was accessed or mutated. Live payment/equipment transactions are not claimed as verified.

Screens cover both Heroes and Equipment at 1280×720, 1920×1080 and 844×390. The browser test checks 16 distinct idle frames, owner mapping, render order, uniform scale, one sprite and completion listener, successful/rejected/network command flow, pending double-click suppression, one-shot return, 50 switches and live reduced-motion changes. Desktop frame sampling is recorded in `qa/report.json`; it is not a physical phone performance measurement.

- [Quan Vũ screenshot](qa/guan-yu-Equipment-1280x720.jpg) / [runtime clip](qa/guan-yu-runtime.webm)
- [Triệu Vân screenshot](qa/zhao-yun-Equipment-1280x720.jpg) / [runtime clip](qa/zhao-yun-runtime.webm)
- [Quan Vũ mobile](qa/guan-yu-Equipment-844x390.jpg), [Triệu Vân mobile](qa/zhao-yun-Equipment-844x390.jpg)
- [Selected](qa/guan-yu-selected.jpg), [Power Up](qa/guan-yu-power-up.jpg)

The clips are canvas recordings of the running game, including the QA command-boundary demonstration; they are not the supplied GIF previews.

## Art limitations and release gate

These are frame-based illustrated spirit VFX. The two dragons share the supplied base silhouette; Triệu Vân adds recoloring and lightning. Selected / Power Up use the supplied staged effect frames, not separate cinematic dragon rigs. Character artwork, equipment values, Battle Core, SaveV2 and Supabase are unchanged by Phase 2A. Phase 2B and Production deployment remain excluded pending visual approval.

## Changed modules

`src/data/livingSpiritManifest.json`, `src/ui/livingSpiritState.ts`, `src/ui/LivingSpiritView.ts`, `src/ui/equipmentThemeView.ts`, `src/ui/heroNavigation.ts`, `src/scenes/HeroesScene.ts`, `src/scenes/EquipmentScene.ts`, unit tests and the runtime QA script. Earlier unified UI edits remain in the working tree.
