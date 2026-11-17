# Gửi Codex — Inventory Art Integration

Tích hợp `3Q_Legend_Inventory_Production_Kit_v1.0.zip` vào source 3Q Legend H5 hiện tại. Đọc `README_FOR_CODEX.md`, `ASSET_MANIFEST.csv`, `PHASER_TEXTURE_MAPPING.json`, `LAYOUT_SPEC.md`, `VISUAL_QA_CHECKLIST.md`.

Yêu cầu: Dựng giao diện Đạo Cụ/Túi Đồ giống `docs/APPROVED_CONCEPT_REFERENCE.jpg` bằng các texture **riêng**. Background sạch, khung/tabs/button/slot dùng texture blank, render tên vật phẩm, số lượng, hình tướng và mô tả từ GameStore/Inventory. Grid chứa nhiều item, scroll khi vượt số ô; click item mở detail theo ID, không hardcode 20 item trong ảnh.

Bỏ nút Lò Rèn và Trang Bị khỏi header; giữ về Sảnh. Thanh 13 danh mục Túi Đồ là **popup trong Lobby**, không được đưa vào màn Đạo Cụ. Có thể giữ category tabs lọc vật phẩm như ảnh, không đụng logic của hệ thống khác.

20 PNG trong `icons_reference` là cutout từ raster reference; kiểm tra viền và ưu tiên asset hiện có nếu tốt hơn. Không dùng nguyên ảnh concept làm runtime scene; không dùng chữ/số vẽ sẵn, không tự cấp tài nguyên. Chú ý tooltip, số 0, lượng lớn, tiếng Việt có dấu, responsive desktop 1280×720 và mobile landscape 844×390.

Giữ nguyên GameStore, SaveV2, Supabase, gameplay và UI đã hoàn thiện khác. Chạy build/typecheck/regression/visual QA, chụp đối chiếu nếu có khả năng. Không cần ZIP/video từ Codex; chỉ cập nhật source và báo cáo các sai khác concept còn tồn tại.
