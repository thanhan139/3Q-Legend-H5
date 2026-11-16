# 3Q Legend H5 — Lobby Smooth UI Production Kit v1.0

**Bản bàn giao texture tách riêng cho Phaser 3 + TypeScript.**

Nguồn phong cách: `reference/APPROVED_LOBBY_CONCEPT.png` — concept Sảnh đỏ-vàng với đường nét bo cong, huy hiệu treo, hiệu ứng nhẹ.

## Số lượng và phạm vi

- **48 PNG runtime-candidate** được tách riêng từ 3 asset sheet có nền trong suốt; hãy QA từng texture (có các nút chứa nhãn hoặc chấm đỏ cố định).
- **36 PNG cần QA/retouch** tách từ sheet có nền màu be, được đặt trong `review_*`, **KHÔNG dùng runtime tự động**.
- **18 PNG tham khảo** có chữ/số/portrait hardcode, tách khỏi `assets` để tránh gắn nhầm.
- Đính kèm 4 sheet gốc và concept chuẩn ở `reference/` (chỉ tham khảo).
- `ASSET_MANIFEST.csv` / `.json`, `docs/PHASER_TEXTURE_MAPPING.json`, `VISUAL_COVERAGE_AUDIT.csv`.
- Xem trước bằng `docs/RUNTIME_CONTACT_SHEET.jpg` và `docs/REVIEW_CUTOUTS_CONTACT_SHEET.jpg`.

**Thành thật về chất lượng:** Các PNG được cắt từ sheet ImageGen, không phải tập tin vector/layer tác giả. Một số còn glow/viền mềm hoặc text vẽ sẵn. Không cam kết tái tạo pixel-perfect toàn bộ concept; các file review cần kiểm tra alpha trên nền tối. Nhiều hình chỉ thích hợp overlay hoặc tham chiếu.

## Hướng tích hợp

1. Không dùng cả contact sheet, concept hay sheet gốc làm giao diện. Import từng texture trong `assets/ui/lobby_smooth/`.
2. `runtime` là nhóm PNG có thể tích hợp sau QA; `needs_visual_review` cần sửa matte/beige. Nhiều nút menu trái có chấm đỏ **vẽ sẵn**: chỉ sử dụng khi có thông báo thật hoặc làm phiên bản không badge riêng, không hiển thị chấm đỏ giả.
3. Không lấy số 12.345.678/98.760, level 120, VIP8, tên ChúaCông999, power 28.456.780 hoặc số Chương 12 từ PNG tham khảo. Vẽ số liệu từ GameStore/Supabase bằng Phaser text.
4. Giữ logic Avatar→Profile, VIP→Popup, Chinh Chiến, Phúc Lợi, Login, Cloud Save theo source hiện tại.
5. Lobby chỉ hiển thị **Đồng và Vàng**; chìa, EXP và nguyên liệu nằm ở túi.
6. Giữ nền, tướng và đội hình thực của người chơi. Không ghép cả bức concept thành nền.
7. Render theo 1280×720; dùng safe margin và cân chỉnh viewport 844×390 / resize. Dùng scale hợp lý, tránh pixelation do phóng lớn.
8. Không xóa asset cũ khi còn đường dẫn sử dụng. Đối chiếu Visual Coverage Audit trước khi nghiệm thu.

## Kết quả kiểm tra artifact

- Mỗi asset ở manifest là PNG RGBA, có alpha và kích thước dương.
- Không khẳng định alpha hoàn hảo: kiểm tra ở dark background trước khi đưa vào UI.
- Source/scene game chưa bị thay đổi, bộ này chỉ là package ảnh cho Work tích hợp.

## Layout gợi ý

Top-left: profile anchored to safe(14,12). Top-right: wallet capsule Đồng/Vàng. Top row: reusable shortcuts with text baked (Vietnamese) and Phaser-managed dynamic red dot; spacing uniform. Left: 3 hanging-button navigation. Center: 3 real hero sprites. Right: frame + CTA Chinh Chiến; stage/current power dynamic. Bottom: 4 separated rounded icons inside curved border with safe bottom padding.

Lưu ý: concept ảnh là mẫu chất lượng hình ảnh, không phải ảnh source thật; ưu tiên tính động & data integrity.
