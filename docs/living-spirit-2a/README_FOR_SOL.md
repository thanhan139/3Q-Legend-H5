# 3Q Legend — Living Spirit Animation — Giai đoạn 2A — Thanh Long và Lôi Long (pilot)

**File**: `3Q_Legend_Living_Spirit_Phase_2A_Pilot_v1.0.zip`  
**Hero slugs**: quan_vu, trieu_van  
**Gồm**: 6 atlas spritesheet PNG (384×384/frame), 6 GIF preview và 2 poster PNG.

Đây là phiên bản **runtime nhẹ**, trích nguyên trạng 3 clip mỗi tướng từ `3Q_Legend_Living_Spirit_Animation_Pack_v1.0.zip`. Các PNG frame lẻ được **lược bỏ vì trùng dữ liệu với atlas**, không phải mất animation. Mọi clip vẫn giữ 16/12/12 frame và thời gian 145/95/85 ms/frame.

## Cách dùng

1. Giải nén gói này vào project và copy thư mục `assets/spirits/` sang asset root mà Phaser đang load; giữ đường dẫn trong manifest hoặc sửa loader baseURL.
2. Đọc `config/SPIRIT_ANIMATION_MANIFEST.json` — chỉ chứa những tướng thuộc giai đoạn này.
3. Sử dụng `atlas/*.png` cho Phaser `load.spritesheet`, **không dùng GIF preview**. GIF và poster chỉ để kiểm tra visual.
4. `integration/LivingSpiritView.example.ts` là mẫu chung 5 tướng; lọc key theo manifest đã cài và map slug đúng HeroConfig thực tế.
5. Không hardcode chỉ số/thưởng/vật phẩm từ concept. Chỉ chơi animation `power_up` khi thao tác nâng cấp đã được server xác nhận.
6. Chạy kiểm thử trong `docs/QA_MATRIX.csv`.

## Lưu ý

- Sau khi 2A được nghiệm thu về hình ảnh, mới nhập gói 2B (3 tướng khác).
- Chất lượng visual theo `docs/QUALITY_NOTES.md`: đây là loop VFX theo frame, không phải 5 bộ skeletal animation cinematic.
- **Không xóa hoặc đổi assets đã tồn tại ngoài phạm vi file này**. Không deploy Production.

## Danh sách asset chính

### Quan Vũ (`quan_vu`)
- `assets/spirits/quan_vu/atlas/idle_4x4.png`
- `assets/spirits/quan_vu/atlas/selected_4x3.png`
- `assets/spirits/quan_vu/atlas/power_up_4x3.png`

### Triệu Vân (`trieu_van`)
- `assets/spirits/trieu_van/atlas/idle_4x4.png`
- `assets/spirits/trieu_van/atlas/selected_4x3.png`
- `assets/spirits/trieu_van/atlas/power_up_4x3.png`
