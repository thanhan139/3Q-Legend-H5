# PROMPT BÀN GIAO CHO GPT 6.1 SOL — 3Q Legend H5

Bạn là senior game engineer / technical lead. Tôi có repository `3q-legend-h5-scaffold` chạy Phaser 3.90 + TypeScript + Vite, dùng làm khung cho game H5 Tam Quốc chibi, tối đa **6v6**, sảnh chính và hệ thống thu thập tướng. Hãy tiếp tục PHÁT TRIỂN REPO NÀY, không tạo lại project hay đổi engine nếu không có blocker rõ ràng.

**Ưu tiên đọc trước khi code:** `README.md`, `docs/GDD_v0.1.md`, `docs/TECHNICAL_DESIGN_v0.1.md`, `docs/ACCEPTANCE_CHECKLIST.md`. Sau đó inspect code thật và thông báo khác biệt nếu phát hiện.

## Việc làm ngay (M0 — Baseline Hardening)

1. Chạy `npm install`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run dev` và thử luồng sảnh → ải → chiến đấu → kết quả → sảnh.
2. Sửa mọi build/runtime error; không lấp lỗi bằng `any`, `@ts-ignore`, tắt strict hoặc xóa test.
3. Tạo hoặc cập nhật unit tests để bảo vệ six-slot formation, stage unlock, gacha pity, duplicate hero shard, replay rewards idempotency và battle victory/defeat.
4. Ghi log thay đổi và báo chính xác lệnh/test pass/fail. Nếu thiếu mạng hoặc tool, nói rõ giới hạn, KHÔNG tự nhận đã chạy test.

## Việc sau khi baseline PASS (M1 — Lobby & UX Polish)

1. Thiết kế sảnh 16:9 phong cách cung điện Tam Quốc chibi 2D: topbar, tài nguyên, tướng chủ lực, nút Campaign/Heroes/Formation/Summon, menu phúc lợi/nạp đầu/hộp thư và bottom dock.
2. Giữ từng nút hoạt động có hướng đi hoặc màn hình giải thích hợp lệ. Không có nút giả hoặc màn hình chết.
3. Tách hệ thống preload asset thành manifest, hỗ trợ placeholder thay sprite/Spine sau này. **Không trích xuất hoặc chép lại sprite, nhạc hay UI của game tham khảo.**
4. Làm UI resize mobile landscape + touch QA; giữ tỷ lệ đúng, safe area, font không tràn.

## M2 — Combat 6v6 MVP (chỉ sau M0/M1)

1. Domain battle độc lập Phaser: 6 vị trí/hệ, 3 trước + 3 sau, targeting, tốc độ, damage, support healing, thắng/thua, skip=xử lý cùng battle state.
2. Thêm visual hit, damage popup, animation placeholders, timeline và battle result scene; tránh race/double rewards.
3. Đưa số liệu balance vào config/data, không hardcode trong scenes.
4. Bổ sung ít nhất test cho: full 6v6, 3v6 early game, formation duplication, death logic, front/back priority, speed/x2, skill frequency, result transitions.

## Phạm vi không được tự ý mở rộng

- Chưa làm nạp tiền thật, backend thu tiền, PvP, bang hội, code server hoặc hệ thống chống cheat production.
- First Top-up là mock DEV; tuyệt đối không quảng bá như giao dịch thật.
- Giữ LocalStorage schema v1 và chuẩn bị migration path nếu đổi schema.
- Đội hình tối đa 6; có thể sở hữu hơn 6 tướng. Người chơi khởi đầu 3 tướng, mở dần qua ải/Chìa Vàng/nạp đầu demo.
- Xác suất gacha hiện là draft; không sửa mà không ghi rõ rationale.
- Không refactor toàn repo trong một lần hay đụng tới Fashion Boutique (đây là dự án độc lập).

## Format báo cáo bắt buộc sau mỗi milestone

- Những file đã thêm/sửa.
- Tính năng thực sự chạy được vs còn placeholder.
- Kết quả lệnh typecheck/test/build + số test pass.
- Bug còn lại, known limitations, ảnh hoặc video demo nếu môi trường có browser.
- Bước kế tiếp rõ ràng, không tự tuyên bố milestone xong khi chưa có evidence.

**Mục tiêu đầu tiên:** baseline project chạy sạch và sảnh điều hướng đầy đủ. Tôi sẽ duyệt kết quả trước khi mở rộng combat/asset.
