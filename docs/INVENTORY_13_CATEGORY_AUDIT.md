# 3Q Legend H5 — Audit Túi Đồ 13 danh mục (2026-11-18)

Nguồn tham chiếu: ảnh Túi Đồ do chủ dự án cung cấp. Đây là phân loại giao diện và trạng thái hiện hữu trong source `main`, **không** khẳng định 13 gameplay loop đã hoàn thiện.

| # | Danh mục | Dữ liệu thực hiện có | Trạng thái |
|---|---|---|---|
| 1 | Đạo Cụ | `inventoryEntries(SaveV2)`: chìa vàng, EXP, đá cường hóa, mảnh tướng và tài nguyên cũ | Xem và đi đến tính năng gốc; chưa có sử dụng trực tiếp ở Túi Đồ |
| 2 | Trang Bị | `SaveV2.equipment` và `EQUIPMENT` | Xem đồ sở hữu, chỉ số, liên kết đến Equipment để thao tác |
| 3 | Trang Sức | Chưa có loại phụ kiện nhẫn/dây chuyền trong `EquipmentSlot` | Chưa triển khai |
| 4 | Bảo Vật | Ô `relic` của `SaveV2.equipment` (ví dụ Bích Ngọc Phù) | Xem đồ sở hữu và thao tác qua Equipment |
| 5 | Chiến Hồn | Chưa có trường state/command/server tương ứng | Chưa triển khai |
| 6 | Pet | Chưa có state/command/server tương ứng | Chưa triển khai |
| 7 | Thần Binh | `SaveV2.forge.shards`, trang bị chữ ký, vũ khí chế tạo tại Forge | Xem và đi đến Forge/Equipment; chưa có kho riêng |
| 8 | Thần Thú | Chưa có state/command/server tương ứng | Chưa triển khai |
| 9 | Cẩm Nang | Chưa có state/command/server tương ứng | Chưa triển khai |
| 10 | Túi Đá Quý | Chưa có kho đá quý riêng; `gems` hiện là Nguyên Bảo cũ, không chuyển thành đá quý | Chưa triển khai |
| 11 | Điện Võ Lệnh | Chưa có currency/transaction tương ứng | Chưa triển khai |
| 12 | Trang Bị Quân Sư | Chưa có ô trang bị/command riêng cho Quân Sư | Chưa triển khai |
| 13 | Huyễn Thú | Chưa có state/command/server tương ứng | Chưa triển khai |

## Đã bổ sung trong PR

- Cả 13 icon mở đúng màn hình danh mục, thay vì trả về thông báo trống.
- Đọc danh sách vật phẩm từ `SaveV2` đã được xác thực; không tự ghi hoặc trừ/cộng tài nguyên.
- Trang Bị/Bảo Vật/Thần Binh hiện đồ thực sở hữu, số lượng, chỉ số và điểm đến xử lý trong hệ thống hiện có.
- Các danh mục chưa có dữ liệu server hiển thị rõ **CHƯA TRIỂN KHAI**; không dựng vật phẩm ảo hay hiệu ứng chiến đấu giả.
- Kiểm thử phân loại, giá trị tài khoản, phiên người dùng và bảo toàn dữ liệu.

## Tiêu chuẩn trước khi triển khai các hệ thống gameplay còn thiếu

1. Thống nhất tính năng/loại vật phẩm/nguồn nhận/chi phí/cấp độ/ảnh hưởng Battle Core cho từng danh mục.
2. Thêm `SaveV2` dưới dạng trường tùy chọn tương thích ngược, migration PostgreSQL và validation theo server.
3. Tất cả hành động mua, dùng, trang bị, nâng cấp, hợp thành phải chạy qua Edge Function có xác thực, transaction/idempotency, RLS; không để frontend tự thay đổi tiền/đồ.
4. Bổ sung test đa tài khoản, kiểm tra rollback, double-click, race condition và reconnect; triển khai staging + kiểm tra mobile thật trước Production.
5. Tránh trùng với `relic`, `signature`, `Forge`, Living Spirit hoặc đơn vị triệu hồi hiện hữu.

Không xóa tài khoản hoặc reset tiến trình khi bổ sung danh mục.
