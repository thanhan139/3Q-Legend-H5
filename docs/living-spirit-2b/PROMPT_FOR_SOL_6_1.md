# GIAI ĐOẠN 2B — Mở rộng: Lữ Bố + Gia Cát Lượng + Điêu Thuyền

Chỉ triển khai sau khi Giai đoạn 2A (Quan Vũ + Triệu Vân) đã đạt Visual QA.

1. Đọc `README_FOR_SOL.md` và `config/SPIRIT_ANIMATION_MANIFEST.json`.
2. Import 9 atlas PNG thuộc 3 heroId còn lại; KHÔNG ghi đè atlas hai tướng Giai đoạn 2A.
3. Tái sử dụng `LivingSpiritView`/loader từ 2A, bổ sung mapping: Lữ Bố → Hỏa Long; Gia Cát Lượng → Hạc Thiên Cơ; Điêu Thuyền → Hoa Nguyệt.
4. Giữ nguyên heroId của HeroConfig trong source thực; các slug asset chỉ là alias, không tự suy diễn theo tên hiển thị.
5. Animation Idle, Selected, Power Up hoạt động; hiệu ứng nằm sau tướng, không che ô đồ hay chỉ số; Selected khi đổi tướng; Power Up sau thành công server.
6. QA chuyển đổi lặp giữa CẢ NĂM tướng 50 lần, không leak hoặc nhầm linh thú, không nhầm thiết bị của tướng khác.
7. Validate alpha/PNG, spritesheet 384×384, các atlas 4×4 / 4×3, mobile 844×390 và desktop 1280×720, 1920×1080.
8. Typecheck, build, regression tests. Không sửa Battle Core, SaveV2, Supabase, EquipmentConfig; không reset user và không deploy Production.

**Giới hạn art:** Hỏa Long dùng hình dáng rồng nguồn được tái phối màu; Hạc và bướm procedural, chưa phải creature rig cinematic. Báo trung thực khi chưa đạt concept.
