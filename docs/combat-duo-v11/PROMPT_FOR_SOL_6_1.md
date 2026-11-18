# PROMPT FOR SOL 6.1 — COMBAT-ANIM-03 (Lữ Bố + Điêu Thuyền)

Tôi đính kèm **3Q_Legend_Lu_Bo_Dieu_Thuyen_Combat_Animation_VFX_v1.1.zip**. Cập nhật trực tiếp project 3Q Legend H5 (Phaser 3 + TypeScript), không tạo ZIP/video mới, không deploy Production.

1. Đọc README_FOR_SOL.md, ASSET_MANIFEST.csv và config/ANIMATION_MAPPING.json. Kiểm tra docs/combat-audit/ROSTER.md và HeroConfig để xác định chính xác hai heroId hiện có; không tạo thêm hero trùng.
2. Import 16 actor pose chibi cho từng tướng, đúng full-body và có chân, giữ battle 2 cột × 3 hàng mỗi phe; đồng bộ attack/skill/run/hit/death theo states đã kê (đừng báo có nhiều frame hơn số ảnh thật). Không rig/cắt tay chân từ splash art.
3. Lữ Bố: đánh thường bằng Phương Thiên Họa Kích + basic_swing, basic_hit, có thể dùng common punch_hit cho phản ứng va chạm; Nộ đủ thì chỉ bật rage_ready; Battle Core phát SkillCast mới chạy rage_charge, rage_full / rage_impact, Hỏa Kích nổ tại vị trí mục tiêu.
4. Điêu Thuyền: đánh thường quạt/hoa bằng basic_swing + basic_hit; Nộ đủ bật rage_ready; khi cast sử dụng rage_charge, rage_full, rage_impact theo hướng Hoa Nguyệt/hồng liên. Mê hoặc, hồi máu hoặc sát thương tùy kỹ năng đang định nghĩa trong HeroConfig; không tự đổi mechanics.
5. Đồng bộ toàn bộ timing/scale khi x1/x2/x3/x4. Kiểm tra hồi chiêu, nhiều mục tiêu và AoE. FX không tự gọi applyDamage(), trừ HP, hoặc phát thưởng. Trừ HP/số damage dựa trên Battle Core events.
6. Với basic attack cần đủ wind-up → bước tới có chuyển động chân → vung tay/vũ khí → FX chạm mục tiêu → defender hit reaction → về slot; không chỉ lướt sprite và tụt máu.
7. Nếu đánh trúng, phát VFX ảnh và hit reaction đúng điểm contact. Nếu bạo kích, scale mạnh hơn trong giới hạn; tránh lạm dụng camera shake. Nếu chết, play defeat + fade rồi xoá actor, HP/Nộ và attached FX.
8. Với Bỏ qua: cancel active tweens/timers/VFX và hiển thị kết quả Battle Core; không duplicate damage. Khi Nộ đầy nhưng chưa cast tuyệt kỹ, chỉ hiện ready glow, KHÔNG tự nổ.
9. Vì hit 1 pose và death 1 pose, triển khai an toàn bằng fade/FX rồi báo rõ animation cơ thể còn thiếu; không ghép rig giả hoặc tự phát biểu đã full actor motion.
10. Screenshot/GIF QA in-game của **cả hai tướng** ở attack thường, Nộ đầy, ultimate nổ, hit/death; so sánh source concept. Typecheck, build, 274 regression tests hiện có và các test mới phải PASS (không giả định kết quả trước khi chạy); QA 1280×720, 844×390.

Ràng buộc: giữ nguyên Battle Core, SaveV2, Supabase và gameplay thực; tránh trùng hai hệ Võ Tướng/Trang Bị; chỉ làm runtime battle actor từ chibi, artwork full-body chỉ dùng ngoài trận.
