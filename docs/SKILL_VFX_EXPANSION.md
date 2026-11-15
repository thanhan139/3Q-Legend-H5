# Skill VFX Expansion v0.2 · 3Q Legend H5 v0.5.1

Nguồn là bốn sheet RGBA trong gói gửi kèm. Đã tách 48 PNG theo lưới 4×3, giữ alpha, làm mềm biên vùng cắt và thêm đệm trong suốt. Chỉ nạp các texture được sử dụng. Chỉ số 01–12 đọc từ trái sang phải, từ trên xuống.

| Tướng | Tên trong Battle Core | Skill ID | Khi xuất chiêu | Khi trúng |
| --- | --- | --- | --- | --- |
| Quan Vũ | Thanh Long Trảm | `guan-yu:ultimate` | `azure_dragon-05` | `azure_dragon-06` |
| Triệu Vân | Long Đảm Thiên Kích | `zhao-yun:ultimate` | `azure_dragon-03` | `azure_dragon-12` |
| Mã Siêu | Tuyệt Kỹ | `ma-chao:ultimate` | `azure_dragon-08` | `azure_dragon-10` |
| Trương Phi | Bá Vương Chấn Địa | `zhang-fei:ultimate` | `fire_earth-12` | `fire_earth-01` |
| Hoa Hùng | Tuyệt Kỹ | `hua-xiong:ultimate` | `fire_earth-07` | `fire_earth-08` |
| Điển Vi | Tuyệt Kỹ | `dian-wei:ultimate` | `fire_earth-03` | `fire_earth-05` |
| Hạ Hầu Đôn | Tuyệt Kỹ | `xiahou-dun:ultimate` | `fire_earth-04` | `fire_earth-02` |
| Lưu Bị | Nhân Đức Chi Quang | `liu-bei:ultimate` | `healing_defense-02` | `healing_defense-01` |
| Đại Kiều | Cam Lộ Ngọc Vũ | `da-qiao:ultimate` | `healing_defense-11` | `healing_defense-07` |
| Tôn Quyền | Tuyệt Kỹ | `sun-quan:ultimate` | `healing_defense-04` | `healing_defense-08` |
| Điêu Thuyền | Tuyệt Kỹ | `diao-chan:ultimate` | `dark_control-05` | `dark_control-09` |
| Tào Tháo | Tuyệt Kỹ | `cao-cao:ultimate` | `dark_control-01` | `dark_control-03` |
| Hoàng Nguyệt Anh | Tuyệt Kỹ | `huang-yueying:ultimate` | `dark_control-12` | `dark_control-04` |
| Cam Ninh | Tuyệt Kỹ | `gan-ning:ultimate` | `azure_dragon-07` | `azure_dragon-02` |

Khiên dùng healing_defense-03. Tăng công dùng healing_defense-05. Tăng bạo kích dùng healing_defense-06. Tôn Quyền có hiệu ứng ánh vàng cho đòn đánh theo Battle Core. Hai tướng hỗ trợ có hiệu ứng hồi máu riêng. Các lớp hiệu ứng là PNG tĩnh được điều khiển bằng tween và hạt Phaser. Khung hình nhân vật dùng controller hiện có.

Battle Core M3.8 gắn actionType, skillId và rageBefore vào sự kiện damage/heal. BattleScene kiểm tra các trường này trước khi phát hiệu ứng tuyệt kỹ. Sự kiện từng hit, buff, khiên và hấp thụ điều khiển hiệu ứng tương ứng. M4A vẫn dùng store và schema hiện có.

Kiểm thử: 44/44 unit test, TypeScript và Vite build pass. Chromium desktop 1280×720 và mobile landscape 844×390 pass luồng 6v6, x1/x2, pause/resume, Skip và Chiêu Mộ x10. Video desktop có Long Đảm Thiên Kích ở khoảng 23 giây.
