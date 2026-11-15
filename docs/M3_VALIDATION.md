# 3Q Legend H5 v0.4 · M3 Campaign & Hero Progression

## Triển khai

- Bản đồ 2D có 3 chương, mỗi chương 5 ải, đường hành quân, thành chủ ở ải cuối và trạng thái khóa/mở/đã vượt. Bảng chi tiết dùng cùng danh sách địch với Battle Core.
- Sảnh → Bản đồ → Xuất trận → Kết quả → Bản đồ. Kết quả hiện thưởng lần đầu theo nhịp và bản đồ làm nổi bật ải vừa mở. Có thể xem thông tin ải khóa và đánh lại ải đã vượt.
- Thưởng EXP luyện tướng lần đầu theo chương là 300/400/500, cộng thêm 200 ở ải thành chủ. Mỗi lần nâng dùng 100 EXP và cộng EXP riêng cho tướng, tối đa cấp 15. Chỉ số theo công thức tuyến tính từ chỉ số gốc, +9% HP/ATK/DEF và +2,5% SPD mỗi cấp, làm tròn số nguyên. Địch dùng hệ số chiến dịch cũ; tướng người chơi dùng chỉ số đã nâng.
- Save v2 dùng cùng khóa lưu với v1. Khi đọc v1, game giữ đội hình, tài nguyên, danh sách tướng và tiến trình, đồng thời cấp bù một lần EXP luyện tướng theo các ải đã vượt. Tướng bắt đầu cấp 1. Replay không cấp lại thưởng cũ hoặc mới.
- Battle Core độc lập với Phaser. Đội hình tối đa 6v6, sprite toàn thân từ v0.3.1. Chiêu Mộ và Nạp Đầu giữ cơ chế cũ.

## File đã sửa hoặc thêm

| File | Thay đổi |
| --- | --- |
| `src/scenes/CampaignScene.ts` | Bản đồ, điểm ải, thành chủ và bảng chi tiết. |
| `src/data/campaign.ts` | Cấu hình thưởng EXP và danh sách địch/thành chủ. |
| `public/assets/campaign/map.webp`, `src/data/lobbyAssets.ts`, `src/scenes/BootScene.ts` | Nền bản đồ và preload. |
| `src/scenes/HeroesScene.ts`, `src/ui/heroPresentation.ts` | Nâng cấp, cấp tướng và chỉ số thực. |
| `src/domain/progression.ts` | Cấu hình cấp/EXP và công thức chỉ số thuần TypeScript. |
| `src/domain/types.ts`, `src/domain/store.ts` | Save v2, migration, cấp EXP và giao dịch nâng cấp. |
| `src/domain/battle.ts`, `src/scenes/BattleScene.ts` | Sử dụng EXP của đội hình khi tạo đơn vị chiến đấu. |
| `src/scenes/ResultScene.ts` | Hiệu ứng thưởng và điều hướng trở về bản đồ. |
| `tests/store.test.ts`, `tests/progression.test.ts` | Kiểm thử migration, chi tiêu, giới hạn, mốc ải và chỉ số chiến đấu. |
| `package.json`, `package-lock.json`, `README.md`, `docs/M3_VALIDATION.md` | Phiên bản v0.4 và báo cáo. |

## Kiểm tra và giới hạn

- TypeScript strict, Vitest **20/20**, Vite production build đều pass.
- Chromium production desktop 1280×720: xem 15 điểm ải, ải khóa, vượt và chơi lại 1-1, thưởng chỉ trả lần đầu, nâng Trương Phi lên cấp 2, reload giữ 100 EXP của tướng và 200 EXP luyện, xuất trận 1-2 có HP tối đa 1700 thay cho 1560, về sảnh. Không ghi nhận lỗi trang, console hay HTTP.
- Chromium production mobile giả lập 844×390: chạm chọn ải, kiểm tra khóa, vượt và đánh lại, nâng cấp, reload và xuất trận. Không ghi nhận lỗi trang, console hay HTTP.
- Mô phỏng tuần tự bằng Battle Core và GameStore đã thắng đủ 15 ải từ save mới bằng EXP chiến dịch và tướng mốc. Chưa chơi thủ công toàn bộ 15 ải.
- Ba chương dùng chung nền bản đồ. Thành chủ dùng tướng có sẵn trong roster và độ khó theo cấu hình ải.
- Vite cảnh báo bundle JS lớn hơn 500 kB trước gzip (~356 kB gzip). Chưa thử trên điện thoại thật.
