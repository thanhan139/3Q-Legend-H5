# 3Q Legend H5 — Điêu Thuyền FX Atlas Repair v2.0.1

## Đã sửa
- `assets/fx/dieu_thuyen/fx_loop_4x2.png` trong gói v2.0 bị truncated PNG (file có nhưng thiếu byte nội dung).
- Cả 8 file `fx_loop_00.png` ... `fx_loop_07.png` trong v2.0 đều tốt. Atlas 4×2 đã được tái dựng trực tiếp từ 8 frame này, **không sinh lại art**.
- Kích thước: atlas **2600×928**, frame **650×464**, 4 cột × 2 hàng, RGBA.
- Tên và đường dẫn giữ nguyên; không cần đổi mapping.

## Prompt ngắn cho Sol 6.1
Dùng `3Q_Legend_Hero_Equipment_Themes_v2.0.1_FIXED.zip` thay gói v2.0. Lỗi PNG truncated tại `assets/fx/dieu_thuyen/fx_loop_4x2.png` đã được sửa; giải nén và thay thế đúng file ở cùng đường dẫn project. Cấu hình Phaser `frameWidth:650, frameHeight:464` và 8 frame từ 0 đến 7 theo thứ tự hàng ngang rồi hàng dưới. Kiểm tra texture decode, phát loop 8 frame, alpha và lệch frame, rồi build, regression và Visual QA màn Trang Bị của Điêu Thuyền. Không đổi heroId, asset các tướng khác, Battle Core, SaveV2 hoặc Supabase. Không deploy Production.

## QA
- PIL decode toàn bộ PNG của gói: PASS
- So sánh từng ô atlas với 8 PNG nguồn: PASS
- ZIP CRC check + giải nén: PASS
