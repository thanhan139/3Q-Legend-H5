# Combat asset correction / current roster

**Subsequent actor update:** [Combat v1.1](../combat-duo-v11/INTEGRATION.md) now supplies 16-pose Battle sheets and dedicated FX for Lữ Bố / Điêu Thuyền. Their static-actor and missing-signature notes below describe the earlier pack audit, not the new integration. Gameplay IDs and mechanics remain unchanged.

## Findings

**23 existing heroes are gameplay-defined and executable**, each with explicit HeroConfig stats, normal attack, ultimate, passive, summon eligibility, a nonblank chibi battle tile and acceptance into an owned six-slot formation. The audit executes normal and ultimate actions in BattleEngine for every hero. This establishes implemented gameplay paths, not complete animation production, final balance approval or ownership by every account.

[Full 23-hero list with skills, role, visual mapping and animation coverage](ROSTER.md) · [machine-readable audit](roster.json).

The current roster comprises Triệu Vân, Trương Phi, Quan Vũ, Lưu Bị, Hoàng Nguyệt Anh, Mã Siêu, Tào Tháo, Hạ Hầu Đôn, Điển Vi, Tôn Quyền, Cam Ninh, Đại Kiều, Điêu Thuyền, Hoa Hùng, Lữ Bố, Gia Cát Lượng, Phan Phượng, Hình Đạo Vinh, Trình Viễn Chí, Bùi Nguyên Thiệu, Quan Bình, Chu Thương and Tào Hồng.

Heroes collection uses HeroConfig and current owned IDs. Formation navigation uses owned IDs; GameStore rejects unowned IDs. Summon draws from the existing `summonable` HeroConfig pool. No new heroes, ownership grants, rewards, balancing changes or migrations were introduced.

## Lữ Bố and Điêu Thuyền

| Check | Lữ Bố | Điêu Thuyền |
|---|---|---|
| Canonical ID | lu-bu | diao-chan |
| Config | SSS+, fighter; HP 1430 / ATK 260 / DEF 62 / SPD 116 | SSR, mage; HP 990 / ATK 250 / DEF 38 / SPD 126 |
| Normal | Kích Vô Song | Phi Y |
| Ultimate | Phương Thiên Loạn Vũ | Quốc Sắc Thiên Hương |
| Passive | Vô Song | Điểm Ảnh |
| Actor | Own original chibi tile, frame 14 | Own original chibi tile, frame 12 |
| Body animation | Static actor, no verified pose sheet | Static actor, no verified pose sheet |
| Ownership path | Existing SSS+ summon pool | Existing SSR summon pool |
| New combat pack signature | None; shared melee/death only | None; shared magic/heal/death only |

Read-only inspection of staging `game-command` **ACTIVE v10** confirmed its deployed bundled source contains both IDs, config and their specific skills. [Recorded check](staging-function.json). No player-save rows were queried: this confirms server support, not which account currently owns either hero. Local handler imports the same GameStore/Battle Core; cloud builds bundle those modules. No seed or schema change is required merely to recognize these existing IDs.

The same read-only check of `arena-command` **ACTIVE v5** confirmed both hero IDs and their unique skills in the deployed PvP simulation bundle. [Arena check](staging-arena.json). Neither function was redeployed or modified.

## Correction made

The previous feedback implementation inferred weapon visuals from the balance role. That incorrectly gave bow projectiles to Mã Siêu and Cam Ninh, whose normal skills use a spear/blade; Hoàng Nguyệt Anh's crossbow instead inherited mage presentation.

`src/ui/combatHeroProfiles.ts` now provides an explicit visual style for all 23 canonical IDs. Mã Siêu and Trình Viễn Chí use thrust, Cam Ninh/Lưu Bị/Tào Tháo use their melee presentation, Hoàng Nguyệt Anh and Bùi Nguyên Thiệu use ranged projectiles, and Gia Cát Lượng/Điêu Thuyền/Đại Kiều use magic feedback. This changes presentation movement/effects only; their HeroConfig roles, skills, damage, AI and server simulation remain untouched. Unknown IDs get no inferred visual profile or borrowed signature.

Lữ Bố explicitly uses the warm shared heavy-impact sheet instead of the shared green slash, so he does not acquire a Thanh Long visual identity. His pre-existing fire ultimate VFX remains intact. A final targeted browser pass checks this exclusion along with all six correction heroes: [correction-report.json](../combat-vfx/qa/correction-report.json).

## Asset coverage / gaps

- All **23 shared VFX** can be used by mapped current heroes for melee/thrust, projectile/trail/impact, cast/magic, heal/shield/buff and death. They are shared assets, not ownership-bound hero portraits.
- All **five pack signatures** have existing matching heroes: Quan Vũ, Triệu Vân, Trương Phi, Gia Cát Lượng, Đại Kiều. **No signature in this ZIP lacks its corresponding gameplay hero.**
- Lữ Bố and Điêu Thuyền have existing older ultimate VFX from their own SkillVfx entries, but no dedicated signature sheet in this Combat pack. Their Equipment Living Spirits belong to a separate UI-only pack and are not injected into Battle as substitute combat signatures.
- The Quan Vũ actor pilot corresponds to an existing hero but remains disabled pending hand/weapon/foot-anchor approval. It is not a complete actor set.
- Original verified idle/attack/hit/death sheets exist for Quan Vũ, Trương Phi and Lưu Bị. The other 20 actors are static chibi with safe movement/recoil/fade, not full body animation. Run, dedicated skill/ultimate body clips, victory and additional attack variants still need verified assets. No rig was built from illustration cutouts.
- Concept/roadmap-only figures such as Hoàng Trung, Tư Mã Ý and Chu Du are not added by this task. New heroes still require approved config, complete skills/stats, ownership and reward design, plus verified actors/animations.

## Validation

Final verification: **typecheck PASS, Vite build PASS (158 modules), 274/274 regression tests PASS in 36 files**. Build contains the final Lữ Bố warm-impact override; existing >500 kB bundle warning remains. Browser QA passed 42 action/viewport cases, followed by 18 final correction cases after the Lữ Bố visual adjustment. No browser exceptions; Core-state invariance, x1–x4 KO cleanup and Skip guard passed. One earlier concurrent test run hit the online-only suite's five-second timeout; after closing browser QA, the complete serial suite passed without changing tests/timeouts.

`node scripts/audit-combat-roster.mjs` checks all 23 config/skill/formation/Core/actor mappings. `tests/combatHeroProfiles.test.ts` prevents role-based projectile substitutions and cross-hero signature fallback. `scripts/qa-combat-feedback.mjs` now uses the actual bow hero Bùi Nguyên Thiệu, and adds real Core actions for Lữ Bố, Điêu Thuyền, Mã Siêu, Cam Ninh, Hoàng Nguyệt Anh and Bùi Nguyên Thiệu at desktop/mobile sizes. Fixtures are isolated local data, with Supabase network blocked; no live account actions are claimed.

Gameplay screenshots: [Lữ Bố](../combat-vfx/qa/lu-bu-1280x720.jpg), [Điêu Thuyền](../combat-vfx/qa/diao-chan-1280x720.jpg), [Mã Siêu](../combat-vfx/qa/ma-chao-1280x720.jpg), [crossbow](../combat-vfx/qa/huang-yueying-1280x720.jpg). Existing actor identity, Core-state invariance, five valid signatures, speed x1–x4, death cleanup and Skip are retained in the browser regression.

No online system, SaveV2, Supabase schema, player data or Production deployment was changed. Earlier uncommitted UI/VFX work remains in the working tree.
