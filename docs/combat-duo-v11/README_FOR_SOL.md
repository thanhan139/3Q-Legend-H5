# 3Q Legend H5 — Lữ Bố & Điêu Thuyền Combat Animation + VFX v1.1

Bộ tài nguyên **thật sự được đóng gói** gồm 2 sprite chibi 4×4 (16 pose/tướng), PNG frame rời, texture atlas; hiệu ứng đánh thường, va chạm tay/vũ khí, tụ Nộ, viền báo đầy Nộ, và chuỗi tuyệt kỹ nổ **20 frame/tướng**; showcase 2 tướng, mapping Phaser 3 và GIF QA.

## Điểm phân biệt bắt buộc
- 16 actor poses là các **tư thế chuyển động** do thiết kế (idle 4, run 4, attack 4, skill 2, hit 1, defeat 1), không phải full rig xương hay 8/12 frame cho mọi state. Các pose hit/death cần motion polish bổ sung.
- Rage FX là **hiệu ứng nhiều frame** tạo bằng cách chuyển đổi/cấu hình các phần VFX đã vẽ, không phải rồng/lụa được vẽ động từng khung. Có nổ + charge + impact độc lập.
- `previews/*.gif` là preview của tài nguyên, không phải video QA trong game.
- Artwork full-body nằm trong `assets/heroes`, dành cho UI Võ Tướng/Trang Bị, KHÔNG thay thế actor chibi lúc chiến đấu.
- PNG/JSON trong `assets/` có thể sử dụng trực tiếp, không dùng infographic/concept như texture runtime.

## Quy cách
- `assets/actors/lu_bo/lu_bo_poses_4x4.png`: 1536×1536; 384×384/frame; 16 frame.
- `assets/actors/dieu_thuyen/dieu_thuyen_poses_4x4.png`: tương tự.
- `assets/vfx/{hero}/clips/{clip}/*_sheet.png`: atlas 4 cột; frameWidth 384, 512, hoặc 256 ghi rõ ở `config/ANIMATION_MAPPING.json`.
- Rage Nộ 20 frame, 16 FPS, các mốc tụ lực→phóng→nổ→tan.
- Không burn-in text, tên tướng, chỉ số hoặc giá trị Nộ lên spritesheet.

## Logic gameplay
- Đội hình mỗi phe 2 cột × 3 hàng; tướng bên trái hướng phải, bên phải hướng trái (đối chiếu độ thuận vũ khí).
- Nộ đầy dùng **điều kiện trong Battle Core / HeroConfig**, không đọc ngưỡng từ ảnh.
- Mọi hiệu ứng chỉ trình diễn sự kiện chiến đấu đã được server/Battle Core chấp nhận.
- Không áp sát hai lần, không cộng/trừ HP từ callback VFX, không tự thay sát thương.
- `rage_ready` loop khi và chỉ khi được Battle Core báo đủ Nộ; `rage_full` chỉ chạy khi đã thật sự cast kỹ năng.
- Nếu Bỏ qua hay tử trận, dọn toàn bộ FX/tweens/timers liên quan.

## Không có trong ZIP
- Không có rig xương sạch, 8-frame hit hoặc 12-frame death thật cho hai tướng; các state chỉ có số pose như đã ghi.
- Chưa tích hợp source runtime dự án. Sol 6.1 cần kiểm tra trực tiếp mapping các heroId chính xác.

## QA trước production
1. Alpha PNG không hiện nền trắng/caro; 2. Full body, thấy chân; 3. Không ghép tay chân/đè sai vũ khí; 4. Attack FX đánh trúng đúng event; 5. Nộ chưa đầy không phát Rage; 6. Nộ đầy chỉ phát khi cast; 7. Speed/Bỏ qua đồng bộ; 8. 844×390 và 1280×720 không che nhân vật; 9. Không đổi save, data và các heroId.
