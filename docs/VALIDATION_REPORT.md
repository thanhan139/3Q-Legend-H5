# M0–M1 · Báo cáo nghiệm thu 3Q Legend H5 v0.2

## Kiểm tra

| Lệnh | Kết quả |
| --- | --- |
| `npm install` | Thành công sau khi chạy lại. Có lockfile. |
| `npm run typecheck` | Thành công với TypeScript strict. |
| `npm run test` | 15/15 test qua, gồm 9 test sẵn có và 6 test bổ sung. |
| `npm run build` | Thành công với Vite 6.4.6. Bundle JS ~1,512 kB, ~352 kB gzip. Vite cảnh báo chunk lớn hơn 500 kB. |
| `npm run dev -- --host 127.0.0.1` | Chạy được. Host mặc định 0.0.0.0 vấp lỗi `uv_interface_addresses` trong môi trường kiểm thử. |
| `npm run preview -- --host 127.0.0.1` | Chạy được. Kiểm tra Chromium xác nhận bản production khóa quà Nạp Đầu mô phỏng, Chiêu Mộ trừ đúng một chìa và ải 3-1 mở đủ 6v6 với save kiểm thử. |

Môi trường Node 24.22.1, npm 11.9.0, Phaser 3.90.0, TypeScript 5.7.3, Vitest 3.2.7. Trận ở ải 1-1 dùng ba tướng ban đầu. Ải 3-1 được kiểm tra với save nạp sẵn sáu tướng. Test domain kiểm tra thắng, thua, tính nhất quán của Skip, đội hình sáu vị trí, mở ải, tướng mốc, pity, mảnh trùng, thưởng một lần và khôi phục save v1.

## Thay đổi

| File | Thay đổi |
| --- | --- |
| `package.json`, `package-lock.json` | Phiên bản 0.2.0 và khóa dependency. |
| `index.html`, `src/style.css`, `src/main.ts` | Khung 16:9 với viewport và safe area. |
| `src/data/lobbyAssets.ts`, `src/scenes/BootScene.ts` | Manifest và preload ảnh sảnh. |
| `public/assets/lobby/palace.webp`, `public/assets/lobby/zhang-fei.webp` | Nền cung điện và sprite Trương Phi tạo cho bản thử. |
| `src/scenes/LobbyScene.ts` | Sảnh, idle, thông tin người chơi, trạng thái khóa và điều hướng. Cấp hiển thị bằng số ải đã vượt + 1. |
| `src/ui/UiScene.ts` | Sửa lỗi TypeScript do accent bị suy diễn thành một literal, thêm hover, nhấn và chuyển cảnh. |
| `src/scenes/InfoScene.ts`, `src/scenes/TopupScene.ts`, `src/scenes/InventoryScene.ts` | Trang thông tin có trạng thái, giới hạn quà mô phỏng và tên tài nguyên nhất quán. |
| `src/scenes/CampaignScene.ts`, `src/scenes/BattleScene.ts`, `src/scenes/ResultScene.ts` | Điều kiện mở ải, hiển thị đủ 12 ô, xử lý đội hình rỗng, chuyển kết quả một lần và lối về sảnh ở cả hai kết quả. |
| `src/domain/store.ts` | Chuẩn hóa save v1 thiếu đội hình, bỏ ID kế thừa của object. |
| `tests/store.test.ts`, `tests/battle.test.ts` | Kiểm thử hồi quy tiến trình và kết quả trận. |
| `README.md`, `docs/VALIDATION_REPORT.md` | Hướng dẫn chạy và kết quả thực tế. |

`src/domain/battle.ts` giữ nguyên và độc lập Phaser. Save tiếp tục dùng LocalStorage schema v1. Nạp Đầu có quà mô phỏng ở dev. Điểm Danh chờ lịch phát hành, Hộp Thư hiện trạng thái trống và Nhiệm Vụ hiện tiến trình ải. Battle, màn hình phụ và asset tướng phụ vẫn dùng hình mẫu. Backend, thanh toán thật, art cuối, âm thanh và combat mở rộng thuộc các mốc sau.

Chromium dev đã mở Boot, Lobby, Campaign, Battle, Result, Heroes, Formation, Summon, Inventory, Topup và các trang Phúc Lợi, Điểm Danh, Nhiệm Vụ, Hộp Thư của Info. Kiểm tra ải 1-1 bằng chuột và cảm ứng ngang, về sảnh, reload giữ tiến trình, chơi lại không trả vàng lần hai. Quà demo DEV cộng đúng 1.000 vàng. Xoay từ 844×390 sang 390×844 giữ nguyên tỷ lệ và căn giữa. Không ghi nhận lỗi JavaScript, console error hoặc HTTP 4xx/5xx trong lượt kiểm tra dev. Kiểm tra mobile bằng mô phỏng Chromium, chưa chạy trên thiết bị thật.
