# M3.5D — Đồng bộ tỷ lệ tướng + kết nối Skill VFX (v0.4.8)

## Phản hồi được xử lý

1. Các tướng trông to nhỏ khác nhau dù BattleScene đều gọi `setDisplaySize(160, 160)`.
2. 29 PNG đã có trong ZIP nhưng Battle không `preload` hoặc phát chúng; vì thế không có tuyệt kỹ mới.

## Cách sửa

- `src/data/battleVisuals.ts`: bảng alpha-bounds đo từ spritesheet 256×256 của từng hero. Tính kích thước hiển thị theo chiều cao nhân vật thực 145px (giới hạn rộng 172px). Các sprite sheet ba tướng mẫu có khoảng trống lớn hơn các tile cũ, nên khung hiển thị **lớn hơn** nhưng phần thân nhân vật bằng nhau. Asset thay mới phải đo lại bounds để cập nhật bảng.
- `src/data/skillVfx.ts`: danh sách 13 lớp VFX được chọn trong pack, cùng ánh xạ tướng → phong cách kỹ năng.
- `src/ui/SkillVFXManager.ts`: phối hợp nhiều lớp PNG tĩnh bằng Tween để tạo hiệu ứng di chuyển, phát sáng, chém, đập đất, đâm thương. Hiệu ứng được tạo và hủy theo vòng đời Scene.
- `BootScene.ts`: tải 13 ảnh VFX dùng trong Battle, không tải cả 29 khi chưa cần.
- `BattleScene.ts`: phát cast khi Battle Core trả `event.skill === true`, phát impact đồng thời cập nhật HP + số damage. Đòn thường giữ hiệu ứng cũ. Ở mỗi tướng, tuyệt kỹ được kích hoạt **hành động thứ 3, 6, 9... của riêng tướng đó**, theo domain logic hiện tại.
- Dừng/tăng tốc: VFX dùng Scene Tweens/Time nên chịu pause và x1/x2 của Battle. Skip kết thúc trận và đóng Scene, không thay đổi log/kết quả.

## Skill có hình ảnh riêng

| Tướng | Hiệu ứng | Các lớp chính |
| --- | --- | --- |
| Quan Vũ | Thanh Long Trảm | blue magic seal → green blade wave → azure dragon + blue impact |
| Trương Phi | Bá Vương Chấn Địa | ground ring → fire slash → crater + đá, camera shake |
| Triệu Vân | Long Đảm Thiên Kích | spear dash → blue lightning + blue impact |
| Tướng khác | Tuyệt kỹ chung (tạm) | golden magic circle → purple slash → golden starburst |

> Các ảnh VFX là PNG **tĩnh** có alpha đã được tạo từ bộ art riêng. Phần chuyển động kỹ năng là phối hợp nhiều ảnh/tween, **không phải** sprite-sheet animation của chính VFX. Frame animation nhân vật 3 tướng mẫu vẫn giữ nguyên, không ảnh hưởng Battle Core.

## Cách chạy thử trong Windows

```powershell
cd "<thư mục chứa package.json của bản v0.4.8>"
npm install
npm run dev
```

- Vào Sảnh → Chinh Chiến → trận có Quan Vũ và/hoặc Trương Phi. Không có skill ngay ở đòn đầu; Battle Core kích hoạt skill tại **lần hành động thứ ba của mỗi tướng**.
- Để xem VFX tức thì trong **DEV mode**, mở Battle và bấm **Q** (Quan Vũ), **W** (Trương Phi), **E** (Triệu Vân). Chỉ hoạt động nếu tướng đó có mặt và còn sống trong đội hình người chơi; kỹ năng preview **không gây damage/không tốn tài nguyên**. Các phím này không xuất hiện trong bản production `npm run build`.
- Khi test mobile production, để skill tự kích hoạt theo nhịp Battle. Các dev hotkey không phải điều khiển dành cho mobile.
- Chọn `npm run build` và `npm test` để chạy lại kiểm thử trên máy có đầy đủ dependency. Kiểm tra thử x2/pause/skip và trên mobile thật trước khi nghiệm thu production.

## Giới hạn & validation

- Đã kiểm tra tất cả đường dẫn 13 VFX, alpha PNG, metadata và cú pháp TypeScript của source mới; kiểm thử runtime domain ải 1-2 cho thấy Quan Vũ tung tuyệt kỹ ở hành động toàn trận thứ 13 (lần hành động riêng thứ ba).
- Có thêm unit tests cho bảng tỷ lệ hiển thị và ánh xạ kỹ năng. **Chưa thể xác nhận npm build / Vitest / gameplay trên trình duyệt ở môi trường đóng gói** vì thiếu các dependency npm (npm ci offline: ENOTCACHED). Không tuyên bố đã pass các kiểm thử này.
- VFX chỉ là composite/tween tĩnh; để đẹp như hoạt ảnh thương mại, cần bổ sung frame-based VFX, đồng bộ sound/skill cut-in và hoàn thiện 11 tướng còn lại.
