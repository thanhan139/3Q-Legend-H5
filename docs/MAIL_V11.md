# Hộp Thư V1.1

Bản này mở rộng [Hộp Thư V1.0](MAIL_V1.md) và giữ texture rời, nền cung điện, khung đỏ và giấy thư. Tất Cả hiển thị thư nhận. Đã Gửi là lịch sử riêng của tác giả thư cá nhân. Mở thư nhận cập nhật số chưa đọc. MailScene và badge ở Sảnh truy vấn server lại mỗi 20 giây khi đang mở. Mobile landscape dùng danh sách/chi tiết tách hai bước và popup soạn có nút chạm tối thiểu 44 CSS px.

## Quản trị và System

- Quyền mail lưu trong `mail_roles` do quản trị DB cấp cho từng UID QA. `author` tạo bản nháp và đề nghị duyệt. `approver` xem nội dung rồi duyệt/phát. Hai UID phải khác nhau ngay cả khi một UID có cả hai role. Server kiểm tra quyền trong mỗi RPC. Không có role nào được cấp sẵn bởi migration.
- Console có xem trước nội dung, đính kèm, người nhận và lịch. Gửi 1–100 UID hoặc toàn server. `adminHistory` giữ 50 mục gần nhất trong console, lịch sử cơ sở dữ liệu giữ theo draft. Thời điểm lưu ở UTC, trình duyệt nhập theo giờ thiết bị. Thư hẹn giờ xuất hiện khi đến hạn. Broadcast áp dụng cho profile tồn tại tại thời điểm phát, gồm profile được tạo sau khi lên lịch và trước giờ phát.
- `mail_publish_system(workflow, event_id, payload)` chỉ service role. Dùng event ID ổn định từ hệ thống vận hành. Các workflow hỗ trợ bảo trì, cập nhật, mở/kết thúc sự kiện, bồi thường và workflow đã xác nhận. `mail_notify_arena_settlement(uid, season)` đọc bảng Arena đã chốt rồi gửi thông báo một lần. Vàng vẫn được cấp qua giao dịch Arena hiện tại.
- Đính kèm hỗ trợ Đồng, Vàng, Chìa Khóa Vàng, Tinh Hoa, Đá Cường Hóa, Mảnh Thần Binh và EXP Võ Tướng. Các mục khác cần mapping SaveV2 riêng. Claim/claim-all khóa theo UID và ghi trạng thái thư, SaveV2, economy ledger trong cùng giao dịch. Broadcast lưu một nội dung chung và chỉ tạo trạng thái cho mỗi UID khi đọc, nhận hoặc xóa.

## Thư người chơi

- Tìm chính xác theo UID hoặc tên nhân vật, tối đa 10 kết quả để chọn khi trùng tên. UID và tên người gửi đến từ phiên xác thực và SaveV2 server. Danh sách Đã Gửi chỉ hiển thị thư của chính người gửi. Xóa ở Đã Gửi chỉ ẩn bản của người gửi.
- Tối đa 10 thư/ngày theo giờ Việt Nam, cách nhau ít nhất 20 giây. Nội dung tối đa 500 ký tự. Server kiểm tra giới hạn, người nhận chặn, reply hợp lệ, UUID retry và nội dung. Thư cá nhân chỉ chứa văn bản. UI hiển thị text thuần, server chặn markup, URL và ký tự điều khiển nguy hiểm.
- Báo cáo có lý do và chống ghi lặp theo UID/thư. Chặn giữ thư cũ và từ chối thư mới từ người gửi đó. Thư còn quà chưa nhận không xóa được. Quyền truy cập bảng dữ liệu thuộc service role; Edge dùng JWT xác thực và phạm vi UID do backend quyết định.

## Kiểm tra và triển khai

`supabase/tests/mail_v1.sql` và `supabase/tests/mail_v11.sql` dùng fixture rollback, bao gồm RBAC, broadcast, claim, giới hạn cá nhân, lịch gửi, chặn, báo cáo và thông báo Arena sau settlement. `node scripts/qa-mail.mjs` kiểm tra UI Phaser thật và popup với dữ liệu QA trong trình duyệt. Migration không seed thư, quà hay role. Triển khai staging theo thứ tự migration, `mail-command`, `arena-command`, rồi Preview. Luồng đăng nhập thực tế cần hai phiên Supabase Auth QA được cấp quyền tương ứng.
