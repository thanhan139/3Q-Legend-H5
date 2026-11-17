# PROMPT FOR SOL 6.1 — Lobby Túi Đồ 13 icon

Tôi gửi `3Q_Legend_Inventory_Category_Icons_v1.0.zip`.

Hãy kiểm tra và tích hợp các **13 PNG category icons** mới vào **menu Túi Đồ nổi trên Sảnh Chính (LobbyScene)** của 3Q Legend H5 (Phaser 3 + TypeScript).

### Bắt buộc
1. Đọc `README_FOR_SOL.md`, `ASSET_MANIFEST.csv`, `PHASER_CATEGORY_MAPPING.json` và xem `docs/ICON_CONTACT_SHEET.jpg`.
2. Load các file `assets/icons_320/NN_*.png` riêng bằng Phaser Loader, ánh xạ chính xác từng category ID / label Việt. Không dùng nguyên icon sheet làm texture UI.
3. Khi nhấn Túi Đồ trong Lobby: mở popup gọn đẹp, nền tối trong suốt + viền đỏ vàng. Dùng các icon mới thay cho 13 nút chữ hình hộp hiện tại. Text tên danh mục render bằng Phaser Text; không burn tên từ PNG.
4. Bố cục desktop landscape: ưu tiên 2 hàng (7 + 6 icon), responsive mobile landscape có thể 4 cột/scroll, vùng touch ≥ 44px và không che menu Lobby.
5. Mục Đạo Cụ mở màn Inventory hiện tại có lưới vật phẩm, các danh mục chưa triển khai hiển thị 'Đang phát triển', không tạo dữ liệu hay scene giả.
6. Click Túi Đồ lần nữa, click ngoài popup, ESC đóng menu; cleanup input events khi đổi scene. Không để menu nằm trong InventoryScene.
7. Hiển thị active/hover/tap nhất quán, có thể dùng scale/tint/tween nhẹ; đừng làm icon nhòe/méo.
8. Không thay đổi Supabase, SaveV2, VIP, Summon, Inventory data, Battle Core; không xóa asset cũ nếu còn tham chiếu.
9. Kiểm tra màu nền để tránh quầng alpha, icon không bị cắt; kiểm tra screenshot ở 1920×1080, 1280×720 và 844×390.
10. Chạy typecheck, build, regression tests. Cập nhật source trực tiếp, không deploy Production.

### Deliverable
- Danh sách file sửa, sprite được dùng, tình trạng 13 category, ảnh chụp runtime trên desktop/mobile, QA pass/fail và hạn chế còn lại.
