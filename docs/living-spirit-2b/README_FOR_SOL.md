# 3Q Legend — Living Spirit Animation — Giai đoạn 2B — Hỏa Long, Thiên Cơ, Hoa Nguyệt

**File**: `3Q_Legend_Living_Spirit_Phase_2B_Expansion_v1.0.zip`  
**Hero slugs**: lu_bo, gia_cat_luong, dieu_thuyen  
**Gồm**: 9 atlas spritesheet PNG (384×384/frame), 9 GIF preview và 3 poster PNG.

Đây là phiên bản **runtime nhẹ**, trích nguyên trạng 3 clip mỗi tướng từ `3Q_Legend_Living_Spirit_Animation_Pack_v1.0.zip`. Các PNG frame lẻ được **lược bỏ vì trùng dữ liệu với atlas**, không phải mất animation. Mọi clip vẫn giữ 16/12/12 frame và thời gian 145/95/85 ms/frame.

## Cách dùng

1. Giải nén gói này vào project và copy thư mục `assets/spirits/` sang asset root mà Phaser đang load; giữ đường dẫn trong manifest hoặc sửa loader baseURL.
2. Đọc `config/SPIRIT_ANIMATION_MANIFEST.json` — chỉ chứa những tướng thuộc giai đoạn này.
3. Sử dụng `atlas/*.png` cho Phaser `load.spritesheet`, **không dùng GIF preview**. GIF và poster chỉ để kiểm tra visual.
4. `integration/LivingSpiritView.example.ts` là mẫu chung 5 tướng; lọc key theo manifest đã cài và map slug đúng HeroConfig thực tế.
5. Không hardcode chỉ số/thưởng/vật phẩm từ concept. Chỉ chơi animation `power_up` khi thao tác nâng cấp đã được server xác nhận.
6. Chạy kiểm thử trong `docs/QA_MATRIX.csv`.

## Lưu ý

- Bổ sung sau 2A; giữ nguyên các file và mapping đã hoàn thành của 2A.
- Chất lượng visual theo `docs/QUALITY_NOTES.md`: đây là loop VFX theo frame, không phải 5 bộ skeletal animation cinematic.
- **Không xóa hoặc đổi assets đã tồn tại ngoài phạm vi file này**. Không deploy Production.

## Danh sách asset chính

### Lữ Bố (`lu_bo`)
- `assets/spirits/lu_bo/atlas/idle_4x4.png`
- `assets/spirits/lu_bo/atlas/selected_4x3.png`
- `assets/spirits/lu_bo/atlas/power_up_4x3.png`

### Gia Cát Lượng (`gia_cat_luong`)
- `assets/spirits/gia_cat_luong/atlas/idle_4x4.png`
- `assets/spirits/gia_cat_luong/atlas/selected_4x3.png`
- `assets/spirits/gia_cat_luong/atlas/power_up_4x3.png`

### Điêu Thuyền (`dieu_thuyen`)
- `assets/spirits/dieu_thuyen/atlas/idle_4x4.png`
- `assets/spirits/dieu_thuyen/atlas/selected_4x3.png`
- `assets/spirits/dieu_thuyen/atlas/power_up_4x3.png`
