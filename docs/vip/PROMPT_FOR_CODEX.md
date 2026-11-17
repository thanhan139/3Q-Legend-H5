# CODEX / WORK TASK — 3Q Legend H5 — VIP 0–18 UI + validated online reward flow

Tôi gửi file `3Q_Legend_VIP_0-18_Asset_Kit_v1.0.zip`. Hãy cập nhật trực tiếp project Phaser 3 + TypeScript hiện tại, **không thay ảnh concept thành một background tĩnh** và KHÔNG push Production.

### 1) Kiểm tra nguồn
1. Giải nén, đọc `README_FOR_CODEX.md`, `ASSET_MANIFEST.csv`, `PHASER_TEXTURE_MAPPING.json`, `VIP_BALANCE_PROPOSAL.json`, hai ảnh `docs/` và các PNG.
2. Sử dụng ảnh từ `assets/` theo texture key có namespace, KHÔNG dùng các source_atlases nguyên khối trong runtime.
3. Các texture `review` phải QA alpha fringe, mép rồng, sắc nét, chữ vẽ sẵn. Texture có chữ thì chỉ dùng nếu label khớp; ưu tiên các texture `assets/runtime_blank/` để render text động. Chưa đủ chất lượng thì báo và giữ fallback UI, đừng âm thầm ship.

### 2) Tái thiết kế VIPScene
- Sảnh chính: chạm huy hiệu VIP ở hồ sơ/avatar để mở VIPScene riêng; người mới hiển thị VIP 0.
- Head: huy hiệu đang sở hữu, KNB nạp tích lũy, thanh tiến trình tới cấp kế (min/max dựa trên thresholds của JSON); VIP 18 hiển thị 'Đã đạt cấp tối đa', không có chia 0.
- Có trình duyệt đầy đủ 19 mốc VIP 0–18 (cuộn/chuyển cấp), hiển thị badge tương ứng. VIP 15–18 nổi bật với rồng, hiệu ứng cao cấp nhưng tránh ảnh hưởng FPS.
- Ba khu vực nội dung: Đặc Quyền (năm chỉ số Công/Thủ/Máu/Tỷ lệ Bạo Kích/ST Bạo Kích + tiện ích đi ải), Quà VIP (quà thăng cấp một lần, quà ngày/tuần theo cấu hình có dữ liệu thật), Cửa Hàng VIP (chỉ gói có trong backend).
- Quà hiển thị các trạng thái: Chưa đủ cấp / Có thể nhận / Đã nhận / Chưa triển khai. Có xác nhận sau khi server trả kết quả.
- Các số, quà, giá, tên và tiến trình phải được game render bằng font tiếng Việt và dữ liệu thật; không dùng số liệu minh họa dính trên PNG.
- Layout đúng 1280x720, 1920x1080 và 844x390 mobile landscape; full viewport, không đen viền, không crop badge, không để chữ tràn khỏi khung. Hỗ trợ touch và ESC/back.

### 3) Logic VIP server-authoritative
- Đọc `VIP_BALANCE_PROPOSAL.json` như design spec; mapping sang schema/server API hiện có, không tự đoán item IDs. Trước khi thay đổi migration, kiểm tra hệ thống VIP hiện tại và account persistence.
- VIP tính từ tổng `paidBaseKnbTotal` có chứng thực thanh toán và chống ghi đúp (idempotency transaction ID), KHÔNG dùng số dư vàng hoặc tổng vàng từng nhận miễn phí.
- Quy đổi 10.000 VNĐ = 1.000 base KNB, mốc VIP 5=300.000 KNB, VIP 7=1.000.000 KNB, VIP 18=50.000.000 KNB. Mỗi tài khoản VIP 0 mặc định.
- Chưa có payment gateway thật: chỉ hiển thị các mốc; KHÔNG tạo luồng giả thanh toán thật, KHÔNG tự cộng VIP bằng click.
- Quà VIP 1 lần theo UID+tier: giao dịch server duy nhất, kiểm tra đã đạt tier, chống double-click và retry. Quà ngày/tuần có ngày reset theo timezone server nhất quán, không tự đếm client.
- Các bonus đã được duyệt gồm ATK, DEF, HP, crit chance theo **điểm phần trăm** và crit damage; chỉ dùng cấu hình cấp VIP hiện tại, tránh cộng dồn tầng, PvE 100%, PvP dự kiến 60%, kiểm thử Battle Core, xử lý HP max/current đúng.
- Phần quét nhanh, chạy ải tự động, skip quái, auto-battle, tốc độ và giới hạn lượt: kết nối hệ thống thực nếu có; nếu chưa có thì trạng thái 'Đang phát triển', không fake reward. Bỏ qua quái chỉ khi server tính đủ lực chiến, không bypass boss, lượt và thể lực.
- Giữ nguyên Summon tỷ lệ và bảo hiểm SSR 50/SSS+ 100, Cloud Save, Supabase UID, Inventory, Campaign, Battle Core, PvP hiện có.

### 4) QA bắt buộc
- Tests mốc 0, 1, 4, 5, 6, 7, 14, 15, 16, 17, 18; threshold-1, threshold, threshold+1; cap VIP 18.
- Test không tăng VIP khi vàng được tặng hoặc tiêu vàng; purchase trùng, retry, refund, auth khác UID; quà thăng cấp 1 lần; daily/weekly duplicate.
- Test số học bonus 5 chỉ số PvE/PvP, crit rate points, UI names and long Vietnamese strings.
- QA screenshot ở 1280x720, 1920x1080, 844x390; trang Badge/Đặc Quyền/Quà VIP/Cửa Hàng; trạng thái empty/loading/error.
- Chạy typecheck, build, regression tests. Báo cáo file đã sửa, ảnh QA, kiểm thử chạy được, trường hợp chưa xác minh. Không cần ZIP mới/video và không push Production.
