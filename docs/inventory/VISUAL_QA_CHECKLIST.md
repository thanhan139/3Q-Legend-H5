# Visual QA checklist

- [ ] 1920×1080 và 1280×720: nền phủ kín, lưới cân đối, 5 cột ổn định, có thể scroll khi >20 item.
- [ ] 844×390 landscape: không tràn/hide thanh điều khiển, chi tiết dạng overlay hoặc thu gọn hợp lý, touch hitbox đủ lớn.
- [ ] Tên dài, số lớn, dấu tiếng Việt không cắt và không chạm viền.
- [ ] Asset không bị méo; 9-slice corner giữ tỷ lệ.
- [ ] Portrait đúng ID; item icon sắc nét, không có viền vuông/bakery artifact.
- [ ] Đã review 20 icons_reference; file nào kém thì dùng icon gốc từ source, không bắt buộc 20/20.
- [ ] Không sử dụng approved concept JPG trong runtime.
- [ ] Bỏ Lò Rèn, Trang Bị khỏi header; nút Về sảnh duy trì.
- [ ] Categories từ lobby riêng biệt không chèn vào screen; dữ liệu hiển thị thật, không mock.
- [ ] Click tab, scroll, select item, disabled item, back, reload, mất mạng hoạt động đúng.
- [ ] Không thay đổi Inventory/save/transaction logic; không tạo vật phẩm hoặc tài nguyên giả.
