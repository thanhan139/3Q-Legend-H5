# 3Q Legend H5 — Inventory Production Kit v1.0

Bộ asset PNG tách rời dựa trên concept Túi Đồ đã duyệt (header **không có thanh icon danh mục**, bỏ Lò Rèn/Trang Bị). Không dùng ảnh mockup tổng làm scene hoặc texture runtime.

## Cấu trúc
- `assets/background/`: Nền Đại Điện 1920×1080 sạch, không chứa giao diện.
- `assets/panels/`: Khung grid, detail, mô tả và tooltip không có chữ.
- `assets/slots/`: Slot vật phẩm rỗng, viền selected, rarity và disabled.
- `assets/tabs/`, `assets/buttons/`: Nền các tab/nút trống cho dữ liệu động.
- `assets/decor/`, `assets/effects/`: Đường phân cách và highlight không chữ.
- `assets/icons_reference/`: 20 icon cắt tham khảo từ ảnh phẳng; **cần QA viền alpha**, ưu tiên icon sắc nét đang có trong source.
- `docs/APPROVED_CONCEPT_REFERENCE.jpg`: ảnh concept để đối chiếu **không được đưa vào runtime**.

## Quy tắc bắt buộc
1. Dữ liệu vật phẩm (ID, số lượng, icon, khóa, phân loại) lấy từ Inventory / GameStore/Supabase; không dùng các số 3,2550,300,10... trong concept làm dữ liệu thật.
2. Item slot không chứa text và ảnh; render tách các layer: frame → icon → tên → số lượng → highlight, mọi text nằm trong contentRect.
3. `icons_reference` không bảo đảm segmentation perfect do nguồn là ảnh tổng đã raster hóa. Kiểm tra hoặc thay bằng texture gốc từ project trước khi ship.
4. Hàng đầu trong concept xưa ghi Chìa Khóa Vàng, EXP, Đá... **chỉ là các ô lưới**, không phải bộ tài nguyên cố định được bổ sung vào wallet.
5. Giữ Lò Rèn/Trang Bị có thể có ở chức năng khác nhưng KHÔNG tạo nút ở header Túi Đồ này. Menu 13 category mở ở **Sảnh Chính** là tính năng độc lập, không nằm trong screen Đạo Cụ.
6. Trường hợp mục đồ không thể sử dụng phải hiện nút disabled hoặc 'Xem', tuyệt đối không tự tạo phần thưởng.
7. Không có âm thanh/font/hero portrait chính thức trong kit. Lấy từ source hiện hành; không gửi kèm file font.

Đọc `LAYOUT_SPEC.md`, `VISUAL_QA_CHECKLIST.md`, `PROMPT_FOR_CODEX.md`, `ASSET_MANIFEST.csv` và mapping trước khi tích hợp.

## Các phần trang trí cao cấp bổ sung
- `assets/decor/gold_dragon_divider.png`, `left_three_kingdoms_banner.png`, `right_three_kingdoms_banner.png`, `guardian_dragon_left.png`, `guardian_dragon_right.png`: chi tiết tách có alpha thật từ sheet đã duyệt, có thể đặt trang trí xung quanh khung.
- Panel lưới và panel chi tiết đã phủ thêm viền chạm vàng từ art sheet và **loại nội dung icon/số giả khỏi lòng panel**.
- `assets/tabs/*_static.png`, `inventory_title_static.png`, `button_back_static.png`: bản chụp thẩm mỹ có chữ tĩnh, thuộc nhóm `review`, KHÔNG dùng để phủ thêm text Phaser trùng lên.
- Bản runtime khuyến nghị vẫn dùng các texture tên `_blank` và label động của Phaser.
