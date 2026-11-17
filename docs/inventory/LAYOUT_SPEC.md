# Inventory Layout Spec

**Reference**: 1672×941 (16:9 gần đúng), fullscreen responsive.

- Header y=0..182: banner/tiêu đề trái, nút Về sảnh phải. **Không có Lò Rèn/Trang Bị, không có top category popup**.
- Tabs y=228..298: Tất cả, Tài nguyên, Mảnh tướng, Vật phẩm, Thần binh. Render label/active state động.
- Grid outer panel x≈120..1122, y≈285..875. Nội dung 5 cột × 4 hàng ở desktop, dùng `Grid Layout` với scroll để hiển thị thêm nhiều vật phẩm. Không hardcode 20 items.
- Item rect source ≈174×135; contentRect text name x=10..164 y=8..31; icon x=28..146 y=31..103; count x=15..159 y=107..130. Text không chạm viền.
- Detail panel outer x≈1117..1530 y≈286..877; portrait lấy từ registry của tướng/item. Title, count, description và hành động theo itemID thực tế.
- Mobile 844×390: thu gọn header; grid 3 cột có scroll, detail mở overlay/modal để tránh thu nhỏ chữ đến mức không đọc được; bottom controls vẫn trong safe area.
- Phạm vi UX chỉ là screen Đạo Cụ. Khi bấm Túi Đồ ngoài Sảnh: mở popup 13 danh mục như yêu cầu cũ, từ Đạo Cụ vào screen này.

**Rendering**
- Đề xuất 9-slice cho `panel`/`tabs`/`buttons`, không nén texture theo chiều ngang gây méo viền.
- Chữ lấy từ bitmap/dynamic text có font hỗ trợ tiếng Việt, không bao gồm baked text.
- Render texture cover background độc lập với UI camera.
- Validate text bounds by measuring Phaser Text displayWidth/displayHeight vs inner bounds; adapt long names/wrap.
