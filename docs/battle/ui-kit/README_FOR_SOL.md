# 3Q Legend H5 — Battle UI 3×3 vs 3×3 Production Kit v1.0

## Nội dung
- `assets/runtime/`: các PNG được tách riêng từ concept, ưu tiên tích hợp. Một số đã được làm trống vùng chữ mẫu để Phaser render động.
- `assets/reference_only/`: ảnh chứa chữ/số mẫu hoặc fill cố định — **KHÔNG** đưa vào runtime.
- `docs/references/`: ảnh atlas, concept và ảnh build cũ — dùng để đối chiếu, **không** hiển thị như một texture toàn màn hình.
- `ASSET_MANIFEST.csv`, `PHASER_TEXTURE_MAPPING.json`, `BATTLE_UI_LAYOUT_SPEC.json`, `PROMPT_FOR_SOL.md`, `VISUAL_QA_CHECKLIST.md`.

## Các quyết định được chủ dự án duyệt
1. Đội hình 6v6: **mỗi bên 2 cột × 3 hàng** = 3 tuyến trước gần giữa + 3 tuyến sau ở ngoài.
2. Tướng trưởng thành, không chibi, **thấy toàn thân/chân**, nhân vật có animation thực, chân di chuyển, vũ khí ra đòn.
3. Khi HP=0, tướng **biến mất khỏi bản đồ** sau hoạt ảnh tử trận; slot vẫn trống, không giữ xác, tượng xám hay chữ Đã Bại trên mặt sân.
4. **Không có** bảng tiêu đề Quân ta/Quân địch, **không có** Tiếp tục/Tạm dừng. **Giữ** Tốc độ (x1..x4 tùy logic hiện có/VIP) và Bỏ qua (phải hợp lệ).
5. Giữ nhật ký trận, thanh HP/Nộ và thứ tự hành động. Battle Core là nguồn dữ liệu; Phaser UI chỉ phản ánh event.

## Trạng thái asset / giới hạn
- Texture được **cắt từ ảnh concept** chứ không phải các layer gốc vẽ tay; có thể còn viền glow/đốm alpha và artefact ở góc nhỏ. Kiểm tra trực tiếp trên canvas sáng/tối trước khi duyệt production.
- Các vùng chữ trên ảnh runtime đã làm trống theo cách tái tạo màu nền, có thể cần mỹ thuật dặm lại trước phát hành.
- Các nút/khung có hoa văn góc: **không dùng scale méo theo X/Y**; giữ tỷ lệ hoặc nine-slice chỉ ở vùng giữa phẳng. Không sử dụng ảnh sprite nhân vật lấy từ mockup làm animation.
- Các mô tả động trong mapping là hướng dẫn. KNB/VIP, tên tướng, chỉ số, trạng thái, phần thưởng đều đến từ dữ liệu thật.

## Tích hợp ưu tiên
1. Đọc code scene hiện tại rồi refactor layout, không bỏ Battle Core hoặc auth/cloud save.
2. Dùng riêng từng PNG dưới `assets/runtime`, render font tiếng Việt bằng Phaser Text/BitmapText có kiểm thử glyph.
3. Làm `BattleCharacterView` và animation cho hero từ atlas/rig thật (nếu source chưa đủ frame, ghi rõ block và làm một tướng mẫu đúng).
4. Chạy visual QA desktop + mobile và kiểm thử chết/skip/reload/speed.

**Lưu ý:** file ZIP này là **bộ UI asset + hướng dẫn**, không tự sửa source và không chứa đủ frame animate của toàn bộ tướng.
