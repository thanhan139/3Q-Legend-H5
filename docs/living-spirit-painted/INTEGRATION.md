# Painted Hạc Thiên Cơ / Hoa Nguyệt

The user's two eight-pose reference sheets replace the flat vector spirits for `zhuge-liang` and `diao-chan`. Built-in imagegen background extraction produced RGBA sheets preserving feather detail, gold ornaments, teal astral trails, the pink lotus, moon and butterflies. Generated files were copied into `public/assets/spirits/painted-v2/`; originals and old Phase 2B atlases were retained.

## Runtime and visual alignment

- Both new spirits use detailed painted rendering instead of the former flat crane/moon shapes. Crane white/teal/gold matches Gia Cát Lượng; lotus pink/gold matches Điêu Thuyền. Dark-hall screenshots were inspected for white rectangles, matte fringes and lost white feather detail.
- The sprite stays behind the character and equipment HUD. These two spirits have a dedicated presentation anchor (590,350) and uniformly fitted height of 330 authored pixels; the three dragons retain their existing positions and scale.
- Each source has **eight actual poses**, in 4×2 order. There are no invented 16/12-frame painted clips. Idle loops these eight poses; Selected and confirmed Power Up play the same eight painted poses at the existing 95/85 ms timing before returning to Idle. They are not independently authored cinematic actions.
- A single texture per spirit is shared by its three distinct animation definitions. Versioned texture keys prevent a cached vector sheet from being reused.
- Generated PNGs measure 1774×887. Phaser registers eight equal native 443×443 frames, rounding each ideal cell origin independently. At most a one-pixel gutter is omitted; no asymmetric scaling or pixel repainting occurs in the loader.
- Alpha from imagegen is retained unchanged. Some very low-alpha color values exist at the outer glow; the actual game compositing was reviewed, rather than judging an RGB-only sheet preview.
- Selection, account scoping, server-confirmed enhancement gating, modal deferral, deduplication and cleanup retain the existing Living Spirit implementation. SaveV2, GameStore, Supabase, Battle Core and hero artwork were not modified.

## Actual evidence

Final verification: **typecheck PASS, build PASS (155 modules), 272/272 regression tests PASS** in 35 files. The existing >500 kB bundle warning remains. Browser QA passed with zero page exceptions and 50 switches. After GC, retained JS heap changed from 8,930,196 to 8,469,832 bytes (−460,364 bytes); this is a bounded test, not a long-session memory guarantee. Short desktop frame samples were approximately 60 FPS; physical mobile performance was not measured. Both WebM files decode and play at 1280×720.

| Spirit | Desktop | Mobile | Runtime clip |
|---|---|---|---|
| Hạc Thiên Cơ | [1280×720](qa/zhuge-liang-Equipment-1280x720.jpg) | [844×390](qa/zhuge-liang-Equipment-844x390.jpg) | [WebM](qa/zhuge-liang-runtime.webm) |
| Hoa Nguyệt | [1280×720](qa/diao-chan-Equipment-1280x720.jpg) | [844×390](qa/diao-chan-Equipment-844x390.jpg) | [WebM](qa/diao-chan-runtime.webm) |

[Before/after comparison](qa/comparison.jpg), [browser report](qa/report.json), [asset metadata](ASSET_AUDIT.json).

`node scripts/qa-living-spirit.mjs --painted` exercises both actual Phaser scenes at 1280×720, 1920×1080 and 844×390, frame variation, correct equipment/stat ownership, alpha composition, successful/rejected/pending/network command replies, 50 scene switches, cleanup, retained JS heap and reduced motion. Server replies are controlled local QA stubs; no real account is changed or claimed as tested.

The result is visually more consistent with the supplied character artwork, with illustrated feathers, cloth-like energy trails and detailed lotus petals. It remains an eight-frame VFX cycle behind a static hero illustration, not a full creature rig or new character animation. No Production deployment or push was performed.
