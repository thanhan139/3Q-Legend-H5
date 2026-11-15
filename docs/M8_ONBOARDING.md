# M8 · Tân thủ và Online-Only

## Hành vi

Game yêu cầu tài khoản email đã xác minh và Cloud Save được tải thành công. Không tạo khách mới; khách cũ liên kết email trên cùng UID. Tài khoản chưa có save được khởi tạo online rồi gặp quân sư. Chỉ phản hồi `missing` mới cho phép khởi tạo; lỗi mạng không được coi là thiếu dữ liệu.

Tutorial dẫn qua đặt tên, ba tướng khởi đầu, xác nhận đội hình, 1-1, giải thích chiến đấu, thưởng lần đầu, Túi Đồ, nâng Trương Phi và giới thiệu tính năng Sảnh. Chiêu Mộ vẫn khóa đến 1-3; không tự quay tướng hoặc tham gia PvP.

Các bước được lưu trong `player_tutorials`, tách khỏi SaveV2. Cloud Save, tutorial và ledger được cập nhật trong cùng transaction, dùng cùng revision và request ID. Tài khoản có save trước migration hoặc nhập legacy được miễn tutorial. Hoàn thành và bỏ qua là hai trạng thái kết thúc riêng biệt; Cài Đặt Sảnh → Trợ Giúp chỉ xem lại, không gửi giao dịch.

Không có quà tutorial bổ sung. Tài nguyên khởi đầu không đổi: 5.000 Vàng (`coins`), 300 Nguyên Bảo cũ trong Inventory (`gems`), 2 Chìa Khóa, 0 EXP; Đồng mặc định 0. EXP nâng tướng lấy từ thưởng 1-1 hiện có. Đánh lại, reload, hoàn thành, bỏ qua và Trợ Giúp không cấp thêm thưởng.

Mất mạng khóa gameplay và cho thử lại. Cache giữ giao dịch chờ xác nhận theo project/UID, không cho chơi local. Bản lưu legacy và nhánh offline trước đây được giữ nguyên trên thiết bị, không tự xóa hoặc hợp nhất.

## Migration chủ động và triển khai

- Migration legacy chỉ còn trong quy trình quản trị với công cụ `legacy:digest`, cấu hình `GAME_LEGACY_APPROVALS` và endpoint backend đã được bảo vệ. Frontend không còn giao diện nhập save hoặc xử lý URL để kích hoạt migration. Không cho phép ghi đè Cloud Save đã tồn tại. Xem [luồng đăng nhập hiện tại](ONLINE_LOGIN.md).
- Áp dụng migration `20261115130220_m8_onboarding.sql` sau các migration M6/M7. Migration bổ sung metadata, không chỉnh tài nguyên hoặc SaveV2.
- Chạy `npm run build:cloud`, deploy `game-command`; các luật và endpoint PvP giữ nguyên. Sau đó build/publish frontend. Client M8 từ chối save thiếu metadata M8 để tránh tự suy đoán tài khoản mới/cũ.
- RPC mới `game_load_online`, `game_create_online`, `game_commit_online` chỉ cho service role. Bảng tutorial bật RLS và không cấp quyền trực tiếp cho client. Các RPC cũ được giữ để tương thích với PvP và migration legacy.
- Supabase CLI không có sẵn và npm không tải được gói trong môi trường triển khai source này; filename migration được tạo từ thời gian UTC. Chưa áp dụng SQL hoặc deploy lên staging.

## Kiểm tra trong phiên triển khai

- `npm run typecheck`: PASS.
- `node scripts/test-in-process.mjs`: 104/104 test PASS, 14 file, gồm 13 test M8 mới. Đây là cùng bộ Vitest, dùng worker threads và TypeScript trong tiến trình thay native esbuild.
- `npm run test` / chế độ threads thông thường: bị `spawn EPERM` trước khi chạy test do Vite/esbuild hoặc tiến trình worker.
- `npm run build` và `npm run build:cloud`: bị `spawn EPERM` trong công cụ build. Đã kiểm tra bundle bằng Vite/Rollup API với TypeScript trong tiến trình: frontend không nén tại `.vite/m8-preview`; hai Edge Function đã được bundle vào các `index.js` bị gitignore. Kết quả thay thế không được coi là lệnh build chuẩn đã pass.
- `supabase/tests/m8_onboarding.sql` bổ sung kiểm tra transaction, retry, revision, phân tách UID và quyền truy cập; chưa chạy vì không có local Postgres/Docker khả dụng.
- Chrome thử khởi động để QA 1280×720 và 844×390 nhưng bị từ chối quyền IPC (`Access is denied`). Chưa xác nhận visual hoặc luồng E2E trên browser/staging. Cần QA hai kích thước, bàn phím đặt tên, click xuyên spotlight, hoàn thành/bỏ qua, reload giữa trận và phục hồi giao dịch khi mất mạng.

## Asset

Tái sử dụng chân dung Gia Cát Lượng trong atlas, nền cung điện và UI đang có. Spotlight, mũi tên và hiệu ứng nhấn được tạo bằng CSS. Không thiếu asset bắt buộc; tranh quân sư toàn thân và giọng thoại chưa có, là phần bổ sung tùy chọn.

## Staging deployment update (2026-11-15)

The validation notes above describe the earlier local source session. Staging migration history now records M8 as `20261115130220`; the local filename matches that version. M8 has already been applied, `game-command` deployed as v5 and `arena-command` retained as v1. Do not reapply the migration. Standard Node 22 typecheck, 120 regression tests and frontend build passed in the remote Linux build environment; real player E2E and viewport QA remain pending. See [GitHub and Vercel Preview](GITHUB_VERCEL.md) for the Git deployment workflow.
