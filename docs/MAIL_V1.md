# Hộp Thư V1.0

`MailScene` dùng bố cục từ `MAIL_UI_MASTER_CONCEPT.png` và `MAIL_UI_LAYOUT_SPEC.json` trong bộ handoff. Phaser render nội dung tiếng Việt bằng font Noto Serif của game. 844×390 dùng màn danh sách và chi tiết, nút quay lại danh sách riêng. Danh sách hỗ trợ phân trang, cuộn chuột và vuốt. Nội dung thư dài phân trang trong khung giấy để giữ nút nhận thưởng trong vùng nhìn thấy.

## Tài nguyên runtime

| Vai trò từ manifest | Texture hoặc lớp runtime |
|---|---|
| Nền, tiêu đề, phong bì | Nền và tiêu đề sạch Welfare V2.1, phong bì atlas `lobby/menu-icons.webp` |
| Nút về sảnh, nút chính, nút phụ | Texture trống của UI dùng chung, trạng thái hover, press và disabled do Phaser điều khiển |
| Khung danh mục và danh sách, hộp xác nhận | `panel_main_ornate_hd.png`, 9-slice với WebGL |
| Tab, hàng thư | Tab Welfare sạch. Huy hiệu, icon đổi màu và chữ thể hiện chưa đọc, đã đọc, đã nhận hoặc hết hạn |
| Icon danh mục | Bốn frame atlas hiện có: phong bì, cờ thông báo, quà và huy hiệu cá nhân |
| Badge số chưa đọc và trạng thái | Nền pill Phaser, chữ và số từ server |
| Giấy thư, khung quà, đồ đính kèm | `template_parchment_detail_panel.png`, khung vàng/tím Chiêu Mộ, icon Đồng/Vàng/Chìa Khóa/Tinh Hoa hiện có |
| Trống, đang tải, đường phân cách | Phong bì và đường trang trí dùng chung, chữ trạng thái động |

Các biến thể hạng của khung thưởng trong manifest dùng theo bốn loại đính kèm được duyệt. Chúng không biểu thị phẩm chất chưa có trong dữ liệu. Ảnh master chỉ dùng để đối chiếu QA. Không có seed quà cho người chơi trong migration.

## Dữ liệu và giao dịch

- `mail_messages` chứa nội dung bất biến do server tạo. `mail_inbox` giữ UID nhận và thời điểm đọc, nhận, xóa. Cap 50 thư hiển thị mỗi UID. Công cụ vận hành tạo message bằng quyền service role rồi dùng `mail_deliver` để cấp thư. Gọi lại cùng UID/message giữ nguyên trạng thái. Một hộp đầy trả `false` để người vận hành xử lý, không tự xóa thư.
- `mail-command` kiểm tra JWT và chỉ dùng UID trong phiên được Supabase xác thực. Client không có quyền truy cập bảng hay gọi RPC trực tiếp. Không có action gửi thư từ client.
- Nhận đơn và nhận tất cả xác thực sở hữu, hạn sử dụng và loại/số lượng quà đã lưu. RPC khóa save theo UID rồi khóa thư đủ điều kiện. Cập nhật SaveV2, receipt và `claimed_at` nằm trong cùng giao dịch. RequestId giống nhau trả receipt cũ dù thư đã xóa sau khi nhận. Claim-all là một giao dịch toàn bộ. Nếu số dư vượt giới hạn, cả batch giữ nguyên.
- Xóa đã đọc áp dụng cho thư không có quà hoặc đã nhận, sau xác nhận trên UI. Thư còn quà chưa nhận vẫn được giữ, bao gồm thư hết hạn. Cap tính cả thư chưa xóa. Các mốc thưởng và số lượng của Shop/Jewelry không thay đổi.

## Kiểm tra

`npm run typecheck`, `npm test -- --maxWorkers=3`, `npm run build`, `npm run build:cloud`. `supabase/tests/mail_v1.sql` dùng hai UID fixture trong giao dịch rollback. `node scripts/qa-mail.mjs` (Playwright Chromium) ghi ảnh và chạy giao diện thật với dữ liệu fixture trong trình duyệt. Kiểm chứng bằng hai phiên Auth staging là bước riêng.
