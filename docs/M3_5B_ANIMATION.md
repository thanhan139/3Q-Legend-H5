# M3.5B · Sprite animation · v0.4.7

Lưu Bị, Quan Vũ và Trương Phi dùng 24 pose riêng mỗi tướng, gồm 6 idle, 8 attack, 4 hit và 6 death. Nguồn là sprite sheet tạo từ art v0.4.6. Mỗi pose được tách alpha, đặt trong ô 256×256 và căn đáy về hàng pixel 253. Tất cả 24 frame mỗi atlas có hash pixel riêng. Dáng lấy đà, vung vũ khí, giật lùi và gục thay đổi giữa các frame. Vẫn có sai khác nhỏ về nét vẽ và vị trí ngang giữa một số pose.

| Clip | Frame index | FPS | Lặp |
| --- | --- | --- | --- |
| idle | 0–5 | 8 | Có |
| attack | 6–13 | 16 | Một lần |
| hit | 14–17 | 16 | Một lần |
| death | 18–23 | 14 | Giữ frame cuối |

Mỗi atlas 1536×1024 RGBA WebP lossless, 6 cột × 4 hàng, đọc từ trái sang phải và từ trên xuống. Đường dẫn `public/assets/battle/heroes/{hero_id}/poses.webp`. Source quay phải. Phe địch lật ngang. Origin (0.5,1). Khi thêm asset mới, giữ tỷ lệ và chân trụ ổn định, kiểm tra alpha, vũ khí và cape nằm trong ô, xem clip ở tốc độ thường và 2×.

BattleScene trình bày một hành động Battle Core mỗi lần. Sát thương và HP hiện khi chạm đòn ở frame thứ năm của attack, khoảng 250 ms ở 1×. Tween dùng cho di chuyển đến mục tiêu và về vị trí. Controller chuyển về idle khi attack/hit kết thúc, giữ death cho đến hết scene. Tướng chưa có atlas tiếp tục dùng pose và tween hiện có. Phaser quản lý vòng đời đối tượng và callback khi scene shutdown. Skip kết thúc mô phỏng và dọn phần trình bày trước màn kết quả.

TypeScript và production build pass. 20/20 unit test pass. Cảnh báo kích thước bundle Vite vẫn còn.

Chromium production desktop 1280×720 và mobile landscape 844×390 chạy 6v6, đổi tốc độ, tạm dừng, Skip và quay lại ải 1-1 thành công.
