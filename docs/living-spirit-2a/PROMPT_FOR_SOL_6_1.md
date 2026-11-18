# GIAI ĐOẠN 2A — Pilot: Quan Vũ + Triệu Vân

Đính kèm ZIP này cho Sol 6.1. Đây là bản gọn từ Living Spirit Animation v1.0, không phải asset được vẽ lại.

1. Đọc `README_FOR_SOL.md` và `config/SPIRIT_ANIMATION_MANIFEST.json`.
2. Import 6 atlas PNG: Quan Vũ (Thanh Long), Triệu Vân (Lôi Long). Không import GIF preview làm runtime texture.
3. Chỉ triển khai **Quan Vũ trước** trong UI Võ Tướng / Trang Bị đang hoạt động; xem trước Idle, Selected, Power Up.
4. Chạy QA các lớp: nền → thần thú sau → bệ → nhân vật → UI. Tuyệt đối không che mặt, chân, ô trang bị, chỉ số.
5. Khi Quan Vũ đạt visual QA, triển khai Triệu Vân và kiểm tra đổi tướng 50 lần không lẫn asset/tween.
6. Dữ liệu trang bị, cấp, chỉ số và slot đọc theo `selectedHeroId` + backend thực; không dùng số liệu trong concept.
7. Chỉ kích hoạt `power_up` khi backend xác nhận cường hóa/trang bị thành công.
8. Kiểm tra 1280×720, 1920×1080, 844×390; chạy typecheck, build và regression.
9. Giữ nguyên Battle Core, SaveV2, Supabase; không khôi phục UI cũ, không reset người chơi, không deploy Production.
10. Báo cáo ảnh/clip runtime, frame-rate và chất lượng nghệ thuật; xác nhận 2A trước khi import 2B.

**Không báo full cinematic/rig dragon**: đây là frame-based spirit VFX; Lôi Long tái sử dụng hình dáng rồng gốc cùng ánh điện.
