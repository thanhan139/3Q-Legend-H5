# M3.5 · v0.4.5 · Giai đoạn A chờ nghiệm thu

Bàn giao hướng art và layout trước khi triển khai B/C theo yêu cầu nghiệm thu từng giai đoạn. Có sân riêng, ba mẫu cel-shaded, alpha, anchor và layout tập trung. Các tướng còn lại dùng atlas cũ. Hai ảnh tham chiếu mới không có attachment trong lượt yêu cầu, nên áp dụng mô tả và các ảnh trước trong hội thoại.

TypeScript, 20 unit tests và production build pass. Cảnh báo bundle lớn của Vite vẫn còn.

Animation thật theo frame: chưa có.
Placeholder: idle breathing, lao tới, nghiêng vũ khí, flash/hit, heal, death dùng tween/geometry.
Chưa triển khai: state controller đầy đủ, pause, victory sequence, portrait dock sáu tướng, animation spritesheet, chuẩn hóa roster còn lại. Đây chưa phải nghiệm thu toàn bộ M3.5.

Chromium production desktop chạy 6v6, x2, skip, kết quả và quay lại ải 1-1 thành công, không ghi nhận lỗi console/page/HTTP. Chưa QA mobile cho bản Stage A này.
