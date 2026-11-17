# 3Q Legend H5 — Bộ icon menu Túi Đồ (13 danh mục) v1.0

## Mục đích
Bộ asset cho **menu nổi Túi Đồ ngay trên Lobby**, KHÔNG đặt dải danh mục này trong InventoryScene. 13 icon có nguồn ảnh thống nhất từ concept đã được duyệt.

## Nội dung
- `assets/icons_320/`: **13 PNG RGBA trên canvas 320×320**, đề xuất làm texture Phaser. Chữ hiển thị động trong Phaser.
- `assets/icons_tight/`: **13 PNG RGBA cắt sát nội dung**, dành cho người thiết kế tinh chỉnh.
- `assets/icons_labeled_reference/`: **13 PNG có tên tiếng Việt được vẽ vào ảnh**, chỉ dùng tham chiếu; tránh dùng runtime vì chữ khó responsive.
- `docs/ICON_CONTACT_SHEET.jpg`: ảnh tổng kiểm tra hình và danh mục.
- `docs/SOURCE_ICONS_*`: hai ảnh nguồn để đối chiếu; KHÔNG dùng nguyên sheet làm texture menu.
- `PHASER_CATEGORY_MAPPING.json`, `ASSET_MANIFEST.csv`, `PROMPT_FOR_SOL.md`.

## Các danh mục (thứ tự cố định)
1. Đạo Cụ (`dao_cu`)
2. Trang Bị (`trang_bi`)
3. Trang Sức (`trang_suc`)
4. Bảo Vật (`bao_vat`)
5. Chiến Hồn (`chien_hon`)
6. Pet (`pet`)
7. Thần Binh (`than_binh`)
8. Thần Thú (`than_thu`)
9. Cẩm Nang (`cam_nang`)
10. Túi Đá Quý (`tui_da_quy`)
11. Điện Võ Lệnh (`dien_vo_lenh`)
12. Trang Bị Quân Sư (`trang_bi_quan_su`)
13. Huyễn Thú (`huyen_thu`)

## Giới hạn chất lượng
- PNG tách từ image-generation concept, vẫn có thể còn glow/viền halo trong các texture gốc. Kiểm tra overlay trên nền tối, nền sáng và mobile; xử lý lại nếu thấy lộ quầng.
- Chưa phải animation; không có trạng thái hover/pressed được vẽ riêng. Dùng scale/tint/tween có kiểm soát trong Phaser để làm tương tác.
- Nguồn có phần tử có thể chạm sát rìa ô; đã cắt theo grid và alpha. Kiểm tra không mất chi tiết ở từng icon; trong trường hợp viền bất thường, sử dụng source để tinh chỉnh.
- Không chứa dữ liệu vật phẩm, không thêm chức năng gameplay chưa triển khai.

## Tiêu chí nghiệm thu
- 13 icon hiển thị đúng thứ tự, không mất góc/khung/chạm nhau.
- Đạo Cụ mở InventoryScene với dữ liệu thật.
- Các mục chưa xây dựng chỉ báo Đang phát triển (không tạo đồ giả).
- Mở/đóng ở Lobby bằng Túi Đồ, ESC và click ngoài; không làm hỏng thanh menu dưới.
- Responsive 1920×1080, 1280×720, 844×390; không tràn chữ, nút chạm đủ lớn.
