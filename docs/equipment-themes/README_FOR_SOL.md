# 3Q Legend H5 — Hero Equipment Themes v2.0

## NỘI DUNG GÓI

Gói asset hiển thị 5 nhân vật theo 5 phong thái đã duyệt: Quan Vũ (Thanh Long), Triệu Vân (Lôi Long), Lữ Bố (Hỏa Long), Gia Cát Lượng (Thiên Cơ), Điêu Thuyền (Hoa Nguyệt). Kiến trúc theme có thể mở rộng cho TẤT CẢ tướng còn lại, không được tái sử dụng chân dung hoặc theme sai nhân vật.

- `reference/approved_concepts/`: **5 ảnh giao diện đã duyệt**, chỉ dùng làm đối chiếu Visual QA. Có dữ liệu cấp, số sao, số dư giả lập minh họa, KHÔNG NẠP làm nền UI thật.
- `assets/heroes/full_body/`: **5 PNG nhân vật tĩnh riêng, nền trong suốt** (có bản trim và bản 512×768); nguồn tách riêng nhân vật mới, không cắt nhân vật lẫn với panel.
- `assets/heroes/portraits/`: **5 ảnh avatar 256×256** từ artwork nhân vật.
- `assets/fx/<hero>/`: `spirit_back_static.png`, `aura_front_static.png`, 8 ảnh vòng lặp VFX độc lập và 1 sheet 4×2; đây là **hiệu ứng linh khí minh họa** có thể chạy bằng Phaser, KHÔNG phải bone animation của Rồng Xanh bay hoàn chỉnh. Cần polishing nếu muốn đạt độ sinh động giống concept.
- `assets/ui`, `assets/equipment`, `assets/background`: texture UI nền và khung tái sử dụng từ Equipment Kit v1.0, KHÔNG bake cấp/sao.
- `reference/demo_item_icons/`: **item art chỉ dùng demo** (một số được cắt từ concept và có thể dính dấu +). Không map item thật nếu chưa kiểm tra metadata/quality.
- `config/`: theme theo tướng + layout sáu ô hiển thị + single source of truth.
- `docs/`: preview năm tướng và 5 ảnh lắp thử từ texture tách riêng.

## QUY TẮC QUAN TRỌNG

1. Ảnh concept chứa giá trị giả: không hiển thị hoặc ghi đè vào state thật.
2. Tướng cũ KHÔNG ĐƯỢC XÓA khỏi source trước khi audit texture references và kiểm thử. Chỉ thay art trong Scene trang bị; giữ ảnh battle chibi/animation nếu người dùng chưa duyệt thay.
3. Mọi hero render từ `selectedHeroId` duy nhất; kiểm tra owner của từng item. Tuyệt đối tránh lỗi chọn Trương Phi nhưng UI vẫn hiện Quan Vũ.
4. Danh sách hero/stats/skills/equipment count phải lấy từ SaveV2 / GameStore / HeroConfig / EquipmentConfig hiện có, không seed tài khoản.
5. Bản concept có **6 ô trang bị** (3 trái + 3 phải). Backend có số slot khác phải tuân theo backend, phân trang/scroll nếu cần, tuyệt đối không xóa bớt đồ.
6. Phiên bản này là **art pack + cấu hình mẫu**, không bao gồm mã source project đã sửa hoặc rig animation nhân vật.
7. Để làm rồng xanh bay đúng concept: dùng spirit back riêng, animation loop có điều chỉnh vị trí/alpha và đặt sau tướng; artwork linh khí này mang tính giản lược, cần tiếp tục sản xuất dragon 2D frame/bone nếu đòi hỏi rồng uốn mình đầy đủ.

## TRIỂN KHAI

Đọc `docs/PROMPT_FOR_SOL_6_1.md` và `config/HERO_EQUIPMENT_THEMES.json`. Kiểm tra hình trong `docs/HERO_THEME_CONTACT_SHEET.jpg` và ảnh màn hình `reference/approved_concepts/` để đối chiếu.
