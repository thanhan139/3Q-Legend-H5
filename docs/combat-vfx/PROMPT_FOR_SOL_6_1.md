# PROMPT — SOL 6.1 / CODEX — 3Q Legend Combat Feedback VFX v1.0

Tôi gửi `3Q_Legend_Combat_Animation_VFX_Pack_v1.0.zip`.

**Ưu tiên:** sửa hiện tượng tướng chỉ chạy đến, địch mất máu, không có cảm giác tương tác.

### Import
- Đọc `README_FOR_SOL.md`, `ASSET_MANIFEST.csv`, `config/VFX_ANIMATION_MANIFEST.json`.
- Import **23 VFX nhiều frame** theo nhóm melee/ranged/mage/heal/death và **5 signature FX** riêng tướng.
- Dùng frame PNG hoặc spritesheet 4 cột, mỗi ô 256×256. Không nhét nguyên contact sheet vào game.
- Dùng đúng FPS config, phát one-shot, tự hủy khi kết thúc.

### Chuỗi combat
- Attack event → Windup → Approach/Projectile → Visual impact tại keyframe → Defender hit react → Damage text + HP update từ Battle Core → Return/Death.
- Mọi hiệu ứng VFX bám `weaponTip`, `targetCenter`, hoặc `footAnchor` đúng metadata; không bám vào góc ảnh.
- Đánh melee dùng slash/thrust/spark; ranged projectile phải di chuyển giữa attacker và target; mage cast/circle/impact; heal glow/shield; death dissolve rồi hide sprite/HP/Nộ; empty slot sau death.
- Crit có vệt sáng mạnh hơn, shake nhẹ; giới hạn hitstop ngắn không làm chậm logic Battle Core.
- Kết quả combat server/Battle Core xác định trước, animation chỉ trình diễn; 1 event không được gây damage 2 lần.
- Đồng bộ Speed x1/x2/x3/x4 và Bỏ qua; Skip ngắt tween/animation, không nhân đôi thưởng.
- Đội hình đúng 2 cột × 3 hàng mỗi phe, giữ chibi sprite nguyên bản ở runtime.

### Hero signature mapping
- Quan Vũ: quan_vu_green_dragon_slash (xanh lục).
- Triệu Vân: trieu_van_thunder_spear (lôi điện lam).
- Trương Phi: truong_phi_war_roar (hỏa/địa chấn).
- Gia Cát Lượng: gia_cat_luong_bagua_cast (phù văn pháp trận).
- Đại Kiều: dai_kieu_blossom_heal (hoa và chữa lành).
- Hero chưa có VFX riêng dùng bộ VFX chung đúng vũ khí/lớp nhân vật, không hiển thị VFX tướng khác.

### Animation cơ thể
`assets/actors/pilot_guan_yu` chỉ là **8-frame attack pilot cần QA**, không phải source chuẩn cho toàn bộ actor animations. Không dùng auto-ghép khớp/cắt ảnh tĩnh thành rig lỗi. Kiểm tra sprite sheet/rig có sẵn trong source cho idle/run/attack/hit/death; nếu thiếu thì báo chính xác các clip còn thiếu, không giả vờ đã hoàn thành.

### QA/Deliverables
- Verify 23+5 spritesheets PNG, anim events, all 5 signature FX, fade death, missing target, hit/miss, crit, skill, 6v6 x2 x3 x4, Skip, return to slot, 844×390, 1280×720, 1920×1080.
- Chạy typecheck, build, regression, screenshot/video gameplay nếu môi trường cho phép.
- Không reset account, không đổi SaveV2/Supabase, không deploy Production.
