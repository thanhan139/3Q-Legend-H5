# PROMPT CHO SOL 6.1 — 3Q Legend H5 Battle UI / 6v6 Animation Integration

Tôi gửi `3Q_Legend_Battle_UI_3x3_Production_Kit_v1.0.zip`. Hãy cập nhật **trực tiếp project Phaser 3 + TypeScript hiện tại**, không chỉ xuất concept.

## A. Đọc asset và kiểm tra hiện trạng
1. Giải nén, đọc README_FOR_SOL.md, ASSET_MANIFEST.csv, PHASER_TEXTURE_MAPPING.json, BATTLE_UI_LAYOUT_SPEC.json và VISUAL_QA_CHECKLIST.md.
2. Kiểm tra BattleScene, Combat/Turn state, HeroView, HP/Nộ bars, mobile canvas scaling, animation assets và test đang chạy. Liệt kê reusable assets.
3. Chỉ dùng `assets/runtime/` như ứng viên runtime. `assets/reference_only/` và `docs/references/` chỉ để đối chiếu, không load làm texture gameplay.
4. Render mọi chữ, HP, Nộ, tên tướng, lượt và state từ code, không dùng chữ/số bake của concept.

## B. Bố cục và mỹ thuật đã duyệt
- **6v6, mỗi bên 2 cột × 3 hàng**: 3 quân trước gần tâm sân và 3 quân sau phía ngoài. Không xếp 6 tướng thành 1 hàng ngang / 1 cột dọc, không xếp 3 cột × 2 hàng.
- Các tướng trưởng thành, trọn toàn thân và bàn chân, không chibi, không phóng quá lớn. Foot-anchor để đứng đúng slot, depth sorting theo Y.
- Đổi flat buttons/header hiện tại sang khung đỏ-vàng trong bộ asset. Giữ thông tin ải, lượt, Về sảnh, HP/Nộ từng tướng, nhật ký chiến đấu, thứ tự hành động.
- **Loại bỏ hoàn toàn các thanh QUÂN TA / QUÂN ĐỊCH.** Không tạo khoảng trống cho hai thanh đó.
- **Bỏ nút TIẾP TỤC và TẠM DỪNG.** Battle chạy tự động theo state machine. **Giữ nút TỐC ĐỘ và BỎ QUA**; tốc độ và trạng thái disabled phải phản ánh logic/VIP thực tế.
- Bỏ qua trận chỉ thực thi khi server/game rules xác nhận điều kiện; không nhận thưởng trùng.

## C. Animation tướng thực sự, không phải PNG lắc lư
- Sử dụng full-body rig/spritesheet có IDLE (thở + tóc/áo choàng nhẹ), READY, MOVE/RUN (chân bước), ATTACK, SKILL, ULTIMATE, HIT, DEATH, VICTORY.
- Khi đánh: chuẩn bị -> lao/rời slot -> ra đòn -> damage tại impact frame -> trúng đòn -> quay về slot.
- Chỉ số, mục tiêu, thứ tự lượt và damage phải do Battle Core xác nhận, animation không tự tính/hack damage.
- Khi HP <= 0: animation tử trận -> ẩn character, nameplate, HP/Nộ, shadow, VFX khỏi mặt sân. Giữ slot trống; không giữ xác/tượng xám/chữ Đã Bại. Hồi sinh nếu có phải re-enter đúng slot.
- Nếu repo chỉ có PNG tĩnh, **không được tuyên bố đã hoàn tất animation** bằng một ảnh trượt hoặc tweens đơn giản. Báo rõ thiếu layer/frame và hoàn thiện trước một hero làm chuẩn rồi mở rộng.

## D. Kỹ thuật và responsive
- Layout theo config (có thể dùng số trong BATTLE_UI_LAYOUT_SPEC.json làm điểm khởi đầu), resize giữ 16:9 hợp lý; 1280×720, 1920×1080, 844×390.
- Texture slots, frames và ornaments không được kéo méo. Bảo đảm tên/HP/Nộ không chồng chân, không mất chữ tiếng Việt, không crop vũ khí/tóc.
- Speed x1/x2/x3/x4 (chỉ mức đã được hệ thống hỗ trợ/mở) phải đồng bộ timeline animation, combat events, VFX và audio. Auto chạy không cần nút pause/continue.
- Không làm mất Battle Core, save/progression, auth, Supabase, Campaign, Summon, VIP, Arena hoặc phần thưởng.

## E. Kiểm thử và nghiệm thu
- Build + typecheck + unit/regression tests hiện có.
- QA thực tế 6v6 hai cột ba hàng; 4v6 với hai slot trống; 6v5 với một địch chết; đánh thường, tuyệt kỹ, bị đánh, hồi sinh (nếu có), auto speed, skip, reward idempotency.
- Ảnh chụp màn hình runtime tại 1280×720 và 844×390, không chỉ show mockup. So với concept.
- Báo cáo file source đã sửa, asset đã dùng, các giới hạn frame animation, FPS kết quả test và lỗi còn lại.

Cập nhật trực tiếp project; không reset dữ liệu người chơi; không deploy Production; không tạo thêm ZIP/video nếu không cần.
