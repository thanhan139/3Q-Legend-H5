# Lò Rèn Thần Binh V2

## Tích hợp

- `src/scenes/ForgeScene.ts` dựng bố cục ba vùng trên desktop và dải chọn ngang trên mobile landscape. Bố cục dùng tọa độ Phaser, tính theo vùng an toàn và giữ tỷ lệ ảnh vũ khí.
- `src/ui/divineForgeAssets.ts` nạp texture riêng cho từng lớp. Thư mục `public/assets/ui/divine-forge-v2/` chứa đủ 53 PNG nguyên bản từ `runtime_assets/`.
- Dùng trực tiếp bộ sáu artwork và sáu thumbnail, skin nút và trạng thái nút, thẻ lựa chọn/sở hữu/đang đeo/khóa, khung trung tâm, banner tên, huy hiệu phẩm chất, khung số dư, thanh tiến độ, bệ, họa tiết phân cách, icon thao tác, hạt lửa và khung rèn thành công.
- Dùng lại nền Đại Điện từ Trang Bị, khung tiêu đề rồng từ Đội Hình, khung và thẻ thưởng từ Phúc Lợi, giấy vàng từ Túi Đồ, icon mảnh từ Shop, ánh sáng và phù văn từ Trang Bị/Chiến Đấu. Những texture này có chiều sâu tốt hơn nền/khung prototype và quầng sáng nguyên bản có viền cứng.
- Mặc định mở bộ sáu Thần Binh. Mục Vũ khí SSR khác tiếp tục dẫn đến hai công thức rèn đã tồn tại. Trở về từ Võ Tướng khôi phục tab Thần Binh và lựa chọn vũ khí.
- Số mảnh chung đọc từ Inventory. Chi phí, nguồn thưởng và tiến độ tuần đọc từ `FORGE`, thuộc tính từ `EQUIPMENT` và cấp món đồ đã lưu, hiệu lực kỹ năng từ `SignatureConfig`.

## Giao dịch

Nút rèn mở hộp thoại xác nhận. Trong khi chờ máy chủ, giao diện khóa thao tác tiếp theo. Nếu mất phản hồi, Thử lại gửi lại cùng nội dung `forge` để Cloud Repository dùng request ID đang lưu. Nếu máy chủ xác nhận xung đột revision, người chơi xem lại bản lưu mới và xác nhận yêu cầu mới. Thành công chỉ hiển thị sau receipt của server.

## QA và mỹ thuật

Chạy `node scripts/qa-signature-navigation.mjs` để tái tạo ảnh trong `.vite/divine-forge-v2-qa/`. Harness chạy các scene Phaser thật, cùng handler `game-command` và bản lưu cô lập cho hai UID thử nghiệm. Luồng đến Chinh Chiến xác minh chuyển scene, còn dữ liệu trận PvE/Arena kiểm tra bằng Battle Core tại máy cục bộ. Giao dịch Supabase staging và màn hình trên điện thoại thật cần được xác minh riêng.

So với master, bản runtime dùng đúng bố cục ba vùng, vũ khí trung tâm, thanh mảnh chung, thông tin trang bị và nguồn thưởng theo hai nhóm. Phần mỹ thuật còn thiếu texture lò rèn riêng có rèm đỏ, cặp rồng 3D và bệ chạm rồng. Kho tài nguyên dùng chung nên mỗi thẻ vũ khí hiển thị trạng thái sở hữu/trang bị thay cho số dư riêng trên concept.
