# 3Q Legend H5 — Combat Animation & VFX Pack v1.0

## THẬT SỰ CÓ TRONG ZIP

- **23 hiệu ứng VFX dùng chung**, mỗi hiệu ứng đã có **nhiều frame PNG RGBA** và **spritesheet 4 cột** đúng kích thước 256×256/frame.
- **5 hiệu ứng đặc trưng cho tướng** (Quan Vũ, Triệu Vân, Trương Phi, Gia Cát Lượng, Đại Kiều), mỗi hiệu ứng 12 frame. Đây là **VFX composite animation**, KHÔNG phải animation cơ thể của thần thú 3D/2D được rig riêng.
- **Quan Vũ Attack 8 frame — PILOT ONLY**: chuỗi tư thế attack gốc tạo bằng AI, đã cắt khung và xử lý alpha. PHẢI Visual QA tay/chân/vũ khí/alpha trước khi đưa vào runtime. Không tuyên bố đã có full actor animation cho 5 tướng.
- JSON cấu hình `frameWidth`, `frameHeight`, `frameCount`, FPS và đường dẫn, ảnh xem trước, demo GIF, prompt Sol.

## KHÔNG CÓ TRONG ZIP (CẦN NGUỒN SPRITE/RIG CHUẨN)

- Không có clip `run`, `idle`, `hit`, `death`, `skill`, `victory` chất lượng production cho từng tướng.
- Không có hoàn chỉnh thần thú rồng/hạc nhiều tư thế bay lượn hoặc keyframe xương.
- Không có hệ SFX thu âm hoặc logic Battle Core.
- Đừng gọi các hiệu ứng ảnh sáng là animation tay chân. Đừng bẻ tay chân từ tranh fullbody hiện có.

## Cách dùng

1. Mở `previews/VFX_CONTACT_SHEET.jpg`, `previews/COMBAT_VFX_DEMO.gif`.
2. Import spritesheet ở `assets/vfx/**` và `assets/signature/**` theo `config/VFX_ANIMATION_MANIFEST.json`.
3. Khởi tạo `this.anims.create` với frame index `0..frameCount-1`, `repeat:0` (VFX one-shot).
4. Gắn FX vào impact event xác nhận của Battle Core. Không lấy hiển thị làm nguồn tính damage.
5. Bảo đảm skip/speed/destroy cleanup và không phát clip trùng.
6. Đội hình là **2 cột × 3 hàng mỗi phe**, giữ chibi gốc. Thương/đao thật sự chuyển động phải xuất từ sprite sheet đã kiểm duyệt, không dùng auto rig ảnh tĩnh.

## Nguồn hình ảnh

Ảnh cơ sở VFX tái sử dụng từ `3Q_Legend_Skill_VFX_Pack_v0.1.zip` thuộc bộ dữ liệu dự án của người dùng, được tạo lại thành chuỗi hiệu ứng frame riêng bằng xử lý motion. Các frame clip là motion graphics tạo lập trình (opacity/scale/trail/particle) dùng texture gốc. Pose pilot Quan Vũ được tạo riêng.

**Lưu ý QA:** File đã được xuất thành PNG/atlas hoạt động; chất lượng thị giác, alpha edge và kích thước trên thiết bị thật vẫn cần phê duyệt trước Production.
