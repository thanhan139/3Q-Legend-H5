# SOL 6.1 / CODEX — TRIỂN KHAI TRANG BỊ THEO PHONG THÁI RIÊNG TỪNG TƯỚNG

Tôi gửi `3Q_Legend_Hero_Equipment_Themes_v2.0.zip` gồm 5 màn hình mẫu đã duyệt, 5 hero art fullbody tách nền, portrait, hiệu ứng theo theme, khung UI và tài liệu mapping.

**Yêu cầu cập nhật trực tiếp source Phaser 3 + TypeScript hiện tại, không dùng ảnh concept full screen làm Scene.** Đọc `README_FOR_SOL.md`, `ASSET_MANIFEST.csv`, `config/HERO_EQUIPMENT_THEMES.json`, `config/EQUIPMENT_LAYOUT_V2.json`, `examples/EQUIPMENT_HERO_VIEW_CONTRACT.ts`.

## 1. Giao diện Trang Bị chung cho toàn bộ hero
- Sidebar trái là danh sách avatar tướng có thể chọn, render thật từ HeroConfig/roster của UID.
- Tướng toàn thân (không cắt chân) ở trung tâm, hiệu ứng thần thú/linh khí *đằng sau* tướng, aura *phía trước* tướng; kết hợp bệ và light FX vừa phải.
- Các trang bị hiện có xếp hai cột hai bên nhân vật, bản concept 3+3 (sáu ô). Hiển thị đúng mức nâng cấp, sao, phẩm chất, slot, tình trạng rỗng, số lượng đang mặc, người sở hữu theo server.
- Panel bên phải lấy level, phẩm, stats, skill, liên kết từ Battle/Hero data thật, không sử dụng giá trị demo trong ảnh.
- Giữ hành động trang bị/cường hóa/tinh luyện/khảm/tẩy luyện theo chức năng đã có; chức năng chưa có phải ẩn hoặc ghi đang phát triển (không cho fake reward/currency).
- UI theme đỏ-vàng dùng chung; mỗi hero có riêng palette, spirit FX, aura, fullbody/portrait. Tướng khác 5 mẫu áp dụng neutral theme + avatar thực của chính tướng, không clone hình Quan Vũ.

## 2. MAPPING 5 phong thái đã duyệt
- Quan Vũ → fullbody `quan_vu_512x768.png`, **Thanh Long xanh ngọc** (dùng back/front FX, green glow và vòng linh khí).
- Triệu Vân → `trieu_van_512x768.png`, **Lôi Long lam**, tia sét/long hồn xanh.
- Lữ Bố → `lu_bo_512x768.png`, **Hỏa Long đỏ**, hỏa khí và dấu hiệu chiến thần.
- Gia Cát Lượng → `gia_cat_luong_512x768.png`, **Thiên Cơ**, hạc trắng/tinh tú/phù văn.
- Điêu Thuyền → `dieu_thuyen_512x768.png`, **Hoa Nguyệt**, hoa đào/bướm hồng/ánh trăng.
- Các PNG `fx_loop` là hiệu ứng linh khí **mẫu** có chuyển động, không phải rồng/hạc 3D hoặc rig full animation; nếu concept đòi chuyển động phức tạp hơn thì phải làm asset animation bổ sung, không tuyên bố hoàn thành giả.

## 3. Bug nghiêm trọng phải sửa
- Chỉ có một `selectedHeroId` làm source of truth, truy ra hero instance + equipped items từ store/server.
- Khi bấm chọn Trương Phi, Quan Vũ, Triệu Vân..., thay tướng ở giữa, avatar active, tên, tổng số món đang mặc, owner item, chỉ số, skill, liên kết và action label **đồng bộ cùng frame/update**.
- Nếu một item đang mặc trên Trương Phi mà đang xem Quan Vũ, không được hiển thị nó như trang bị của Quan Vũ; nếu hiển thị trong kho toàn cục phải chỉ rõ owner và quy trình đổi tướng hợp lệ.
- Bỏ cached hero snapshot. Reset selection khi item đang chọn không thuộc hero/không còn hợp lệ.
- Không giao dịch cường hóa nếu server reject hoặc owner mismatch, tránh nhận quà/trừ tiền trùng.

## 4. UX/Visual QA
- Không khung chữ nhật thô cho các action category; dùng icon + nhãn nhỏ + hover/glow/selected, vẫn giữ khung chức năng khi cần khả năng đọc.
- Giữ một nút về sảnh/quay lại theo flow thực tế, không tạo hai điều hướng giống nhau.
- Không thay background Lobby hoặc gameplay Battle. Không thay battle sprites/rig đang hoạt động bằng ảnh tĩnh từ gói equipment này.
- Kiểm tra 1920×1080, 1280×720, 844×390 landscape; không cắt đầu/chân/tóc/vũ khí, không chồng số với icon.
- Chạy typecheck, build, regression. Chụp ảnh sau tích hợp ở cả năm tướng + tối thiểu một tướng ngoài danh sách mẫu. Không triển khai Production và không reset dữ liệu người dùng.

## 5. Nghiệm thu
- Chọn Quan Vũ: Thanh Long xanh ngọc ở phía sau tướng. Chọn Triệu Vân: Lôi Long lam, v.v.; chuyển liên tiếp 20 lần không rò tween/event/mix dữ liệu.
- Trang bị thật, chỉ số thật; Không dùng mock screenshot làm giao diện tĩnh.
- Cần kiểm thử chuyển tướng khi đang xem item được trang bị bởi hero khác, logout-login và sau refresh SaveV2.
- Báo cáo file đã sửa, nguồn asset đã thay, lỗi còn thiếu và ảnh Visual QA. Nếu một hero thiếu animation riêng phải nói rõ, không giả bằng mesh tay chân sai khớp.
