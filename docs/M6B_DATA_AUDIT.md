# M6B · Audit dữ liệu game

| Tính năng | Sau audit | Luồng dữ liệu |
| --- | --- | --- |
| Nạp Đầu | BROKEN → REAL (quà demo) | Cờ DEV làm nút nhận bị khóa trong bản release. GameStore và lệnh firstTopupDemo dùng cùng cấu hình thưởng, cập nhật ví và cờ claimed trong một lần lưu. |
| Điểm Danh | REAL | Chu kỳ và mốc ngày trong Welfare; nhận một lần, ví đọc từ SaveV2. |
| Nhiệm Vụ Ngày | PARTIAL → REAL | Tiến độ lấy từ trận, nâng cấp và chiêu mộ; bộ nhớ receipt trận giờ bao gồm cả trận thua và trận thường để tránh tính lại một kết quả. |
| Chinh Chiến, Battle, Kết Quả | REAL | Trạng thái ải, thưởng vượt lần đầu và mốc tướng/trang bị lấy từ cấu hình và SaveV2. |
| Chiêu Mộ | REAL | Số chìa, pity, kết quả, tướng và mảnh cập nhật cùng giao dịch. |
| Võ Tướng, nâng cấp và nâng sao | REAL | Bộ sưu tập, EXP và mảnh tướng từ SaveV2; tính chỉ số từ cấu hình. |
| Đội Hình | REAL | Lưu sáu ô và kiểm tra trùng họ tướng. |
| Trang Bị và Thần Binh | REAL | Đọc kho, kiểm tra cấp và chi phí; gắn, tháo, nâng và rèn dùng GameStore. |
| Túi Đồ | REAL | Hiển thị tài nguyên và mảnh tướng, dẫn đến kho trang bị và Lò Rèn. |
| Sảnh và Cài Đặt | REAL | Ví, tên, lực chiến, tiến độ lấy từ save; tùy chọn âm thanh và hiệu ứng lưu cục bộ. Huy hiệu VIP hiển thị cạnh avatar. Cấp VIP và nhãn máy chủ chỉ hiển thị khi có dữ liệu thực. |
| Phúc Lợi | REAL | Tổng hợp trạng thái Điểm Danh, Nhiệm Vụ và Nạp Đầu. |
| Cloud Save | PARTIAL | API có kiểm tra UID, revision và receipt. Bản sinh offline giữ riêng theo UID. Cần cấu hình staging để kiểm thử online thật. |
| Hộp Thư | MOCK | Màn trống, chưa có nguồn thư hoặc thưởng. |
| Bang Hội, Đấu Trường, Thế Giới | MOCK | Nút khóa, chưa có hệ thống phía sau. |
| Càn Quét | MOCK | Nút khóa; chưa có luật hoặc bảng thưởng càn quét. |
| Gói thử Thần Binh | PARTIAL | Lệnh dev-only, lưu thật khi chơi local; chưa có gói tương đương cho tài khoản cloud. |

Giao dịch offline ghi SaveV2 trước khi báo thành công. Giao dịch online dùng request ID và revision, chờ server xác nhận, và ghi ledger cùng bản lưu. Hai chế độ dùng chung GameStore và cấu hình thưởng.
