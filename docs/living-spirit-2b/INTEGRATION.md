# Living Spirit Phase 2B

**Painted-art update:** the user subsequently supplied detailed crane/lotus sheets. These now replace the flat Hạc/Hoa Nguyệt runtime visuals; see [current screenshots and implementation](../living-spirit-painted/INTEGRATION.md). The evidence below records the earlier Phase 2B integration.

## Integration

Nine original atlas PNGs were added under `public/assets/spirits/{lu_bo,gia_cat_luong,dieu_thuyen}/atlas`. Hashes match the supplied manifest. All are RGBA with transparent pixels; all 120 new frames are distinct and nonblank. Idle uses row-major indices 0–15, Selected and Power Up use 0–11; frames are 384×384, with unchanged 145 / 95 / 85 ms timing.

The expansion manifest is imported separately and merged at lookup time. The Phase 2A manifest and six atlas files are unchanged; their hashes are recorded in `ASSET_AUDIT.json`. **LivingSpiritView, its loader, lifecycle, positions and server-confirmation hooks were reused without changes for Phase 2B.** The only production logic change is the definition lookup and canonical ID mapping:

| HeroConfig ID | Asset slug | Spirit |
|---|---|---|
| guan-yu | quan_vu | Thanh Long |
| zhao-yun | trieu_van | Lôi Long |
| lu-bu | lu_bo | Hỏa Long |
| zhuge-liang | gia_cat_luong | Hạc Thiên Cơ |
| diao-chan | dieu_thuyen | Hoa Nguyệt |

No GIF/poster is used at runtime. Only three new atlas textures load for the first selected hero. After visiting all five, 15 atlas textures remain cached intentionally (about 112.5 MiB raw RGBA texture data, excluding existing UI assets and GPU overhead); there is still only one live spirit sprite. This is not a texture eviction implementation or a physical low-memory phone certification.

Power Up continues to require the existing successful command callback **and** a confirmed higher level of the same item UID and selected hero owner. Pending, rejected and network-failed requests cannot trigger it; repeated identical confirmed events are deduplicated. An opaque gear modal defers the visual until closed. No player state, Battle Core, SaveV2, EquipmentConfig or Supabase implementation was changed by this expansion.

## Runtime QA

**Final results:** Typecheck PASS; Vite build PASS (154 modules; existing >500 kB chunk warning); **271/271 regression tests PASS in 35 files**. Browser expansion QA PASS, zero page exceptions. After 50 switches, retained JavaScript heap after GC changed from **9,155,064** to **8,678,812 bytes** (−476,252 bytes). Short desktop requestAnimationFrame samples were **56.53–56.92 FPS**, with preserved drawing buffer enabled for captures; no physical mobile performance claim. All five recorded WebM clips decode and play at 1280×720; see [clip-validation.json](qa/clip-validation.json).

Run `node scripts/qa-living-spirit.mjs --expansion`.

The browser script captures actual Heroes and Equipment scenes for all five heroes at 1280×720, 1920×1080 and 844×390. It checks artwork, spirit slug, equipped owner UIDs and combat power against the current isolated save, all 16 idle frames, draw order behind the hero, uniform scale, pending double-click suppression, network/rejected/successful enhancement replies and one-shot return to Idle.

After warming all five heroes, it measures retained JavaScript heap after forced GC before and after 50 switches (10 visits per hero). Every old spirit must be destroyed with zero animation-complete listeners; the active scene must have one spirit and one wheel listener. This is a bounded leak check, not proof against every possible long-session memory issue. Exact samples and browser exceptions are in [report.json](qa/report.json).

Command replies use a controlled local Vite QA boundary. No real Supabase account or online equipment mutation was exercised. The production server command boundary is unchanged.

## Actual clips and screenshots

| Hero | Runtime clip | Desktop screenshot | Mobile screenshot |
|---|---|---|---|
| Quan Vũ | [WebM](qa/guan-yu-runtime.webm) | [1280×720](qa/guan-yu-Equipment-1280x720.jpg) | [844×390](qa/guan-yu-Equipment-844x390.jpg) |
| Triệu Vân | [WebM](qa/zhao-yun-runtime.webm) | [1280×720](qa/zhao-yun-Equipment-1280x720.jpg) | [844×390](qa/zhao-yun-Equipment-844x390.jpg) |
| Lữ Bố | [WebM](qa/lu-bu-runtime.webm) | [1280×720](qa/lu-bu-Equipment-1280x720.jpg) | [844×390](qa/lu-bu-Equipment-844x390.jpg) |
| Gia Cát Lượng | [WebM](qa/zhuge-liang-runtime.webm) | [1280×720](qa/zhuge-liang-Equipment-1280x720.jpg) | [844×390](qa/zhuge-liang-Equipment-844x390.jpg) |
| Điêu Thuyền | [WebM](qa/diao-chan-runtime.webm) | [1280×720](qa/diao-chan-Equipment-1280x720.jpg) | [844×390](qa/diao-chan-Equipment-844x390.jpg) |

Clips record the running canvas, including the controlled confirmation demonstration; they are not the ZIP previews.

## Honest visual assessment

The functional animation, identities, layering and existing UI integration are in place. Hỏa Long matches the painted dragon style of 2A, with the supplied reused silhouette and fire recoloring. Hạc Thiên Cơ and Hoa Nguyệt visibly use simpler, flatter vector-style shapes and particles; they do **not** match the painted character art's level of shading and detail. Both are partially occluded behind the full-body hero by design. These supplied assets need further art work to reach a consistently painted premium concept. Selected and Power Up are staged effect clips, not fully articulated cinematic creature actions. No new rig or character-body animation is claimed.

## Changed files

`src/data/livingSpiritExpansionManifest.json`, `src/ui/livingSpiritState.ts`, `tests/livingSpirit.test.ts`, `scripts/qa-living-spirit.mjs`, the nine PNGs and these QA/source documents. Earlier unified UI and Phase 2A work remain in the working tree. No Production deployment or push was performed.
