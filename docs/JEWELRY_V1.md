# Trang Sức V1

Mở từ **Võ Tướng → Trang Sức** hoặc **Túi Đồ → Trang Sức**. Màn dùng chung tướng đang chọn với Võ Tướng và Trang Bị. Kho hỗ trợ lọc loại/phẩm chất, phân trang và xem chênh lệch khi thay hoặc tháo.

Mỗi mốc Chinh Chiến cho phép nhận một lần các món được cấu hình, kể cả mốc đã vượt trước khi cập nhật. Có 16 mẫu, mỗi mẫu có UID do server cấp. Mỗi tướng có một Nhẫn và một Dây Chuyền. Khi chuyển món sang tướng khác, slot đích được thay trong cùng giao dịch. Cường hóa đến +50, tiêu hao Vàng và Tinh Hoa Trang Sức. Cấu hình cấp thưởng, giá và chỉ số nằm trong `src/domain/jewelry.ts`.

SaveV2 bổ sung `jewelry` và `jewelryEssence` tùy chọn. Máy chủ lưu giao dịch qua revision và ledger hiện có. Nhập save legacy bỏ qua các trường này. Asset runtime gồm 16 PNG vật phẩm, sáu nhãn chỉ số và bốn huy hiệu. Các lớp khung, nhân vật và linh thú tái dùng từ hệ Võ Tướng.

## Tính chỉ số

- `heroStats` cộng chỉ số món, rồi áp tỷ lệ của bộ nếu đúng Nhẫn và Dây Chuyền cùng bộ. PvE, Arena và lực chiến dùng kết quả này. Các hệ số phe, nội tại và VIP tiếp tục được áp ở các bước hiện có.
- Bạo Kích cộng theo điểm phần trăm. Chính Xác trừ khỏi tỷ lệ né và giảm phòng thủ hiệu dụng 0,5% mỗi điểm, tối đa 15%. Né Tránh cộng vào tỷ lệ né của đòn đánh tay và kỹ năng gây sát thương, tối đa 75% sau đối kháng.
- Arena dùng đội hình phòng thủ đã công bố và trang sức mới nhất của hai UID từ Cloud Save. RPC `arena_settle_jewelry` kiểm tra thêm revision của save phòng thủ trong giao dịch chốt trận. Replay chứa thông số ban đầu của trận để việc đổi đồ sau đó không ảnh hưởng trận đã lưu. Lực chiến trên bảng Arena cập nhật khi công bố đội hình, theo cơ chế hiện tại.

## Kiểm chứng

- `npm test -- tests/jewelry.test.ts` kiểm tra đủ 16 phần thưởng, giao dịch và retry, số máu/sát thương PvE, xác suất trong Battle Core, chỉ số riêng của hai phe PvP và replay.
- `supabase/tests/arena_jewelry_snapshot.sql` kiểm tra quyền RPC, cập nhật SaveV2, từ chối revision cũ của cả hai UID và giữ nguyên replay khi retry. Test chạy trong transaction và rollback.
- `node scripts/qa-jewelry.mjs` cần Playwright. Có thể đặt `CHROME_PATH` để dùng Chrome cài sẵn. Script chụp 1920×1080, 1280×720, 844×390 tại `.vite/jewelry-qa/` và thử chạm, lọc, nhận mốc, đeo/tháo, cường hóa và retry qua handler trong bộ nhớ.
