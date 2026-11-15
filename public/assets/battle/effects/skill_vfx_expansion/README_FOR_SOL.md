# 3Q Legend H5 — Skill VFX Expansion v0.2

## Contents
Four original RGBA PNG **static effect composition sheets** grouped by style; each sheet visually contains multiple isolated effects. This pack does **not** contain animated frame sequences, texture atlas JSON, Phaser code or sound files.

## Integration
1. Copy the contents of `public/assets/battle/effects/skill_vfx_expansion/` into the matching directory of the current Phaser project. Keep existing assets intact.
2. Segment each composite PNG into individual PNG with alpha and transparent padding, or generate a correctly indexed atlas. Avoid treating a whole sheet as a single skill image.
3. Use an explicit `skillId -> effect asset` mapping in your VFX manager; do not infer hero skills from filename. Trigger effects only from `SKILL` events emitted by the Battle Core, not from every third normal attack.
4. For phased ultimate sequences use `anticipation -> cast -> impact -> recovery`; sync hit markers to the authoritative combat event timeline. Use Phaser tween/particle compositing as needed; creating genuine animated frames requires additional art.
5. Check scaling/anchoring, alpha quality, effect cleanup, pause, x1/x2, skip, desktop 1280x720 and mobile 844x390. Keep skill results and rage logic in Battle Core.

## Suggested associations (concept only)
- **Azure dragon**: Quan Vũ (Thanh Long Trảm), Triệu Vân (Long Đảm Thiên Kích), Mã Siêu (Thiết Kỵ Xung Phong).
- **Fire / earth**: Trương Phi (Bá Vương Chấn Địa), Hoa Hùng, Điển Vi.
- **Healing / defense**: Lưu Bị, Đại Kiều, Tôn Quyền.
- **Dark / control**: Điêu Thuyền, Tào Tháo, Hoàng Nguyệt Anh.

No changes have been made to the user's source project. These are art source sheets for GPT 6.1 Sol to integrate.
