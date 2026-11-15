# M7.2 · Đấu Trường bất đồng bộ

- Đăng nhập tài khoản có email xác minh, bật Cloud Save, vào Đấu Trường và đăng ký đội hình phòng thủ. Dùng nút cập nhật sau khi đổi đội hình. Đối thủ là tối đa ba UID có đội hình phòng thủ trong cùng mùa, theo độ gần điểm.
- Mùa dài 28 ngày, tính theo mốc Unix UTC. Máy chủ chốt ngày khiêu chiến lúc 00:00 giờ Việt Nam. Mỗi ngày tối đa 5 lượt và tối đa một lượt với mỗi đối thủ. Điểm bắt đầu 1.000; thắng +25, thua −15, sàn 0. Chỉ người tấn công đổi điểm; khi bằng điểm, UID là tiêu chí xếp thứ tự ổn định. Có ít nhất một trận mới lên bảng.
- Máy chủ tính trận bằng Battle Core 6v6 từ bản lưu đang xác nhận và đội hình phòng thủ đã đăng ký. Client nhận kết quả cùng dữ liệu phát lại. Luyện Tập vẫn chạy riêng và không ghi kinh tế, thứ hạng hay dữ liệu trận online.
- Thưởng mùa cho người đã đánh ít nhất một trận. Sau khi mùa kết thúc, thưởng là 100 + phần điểm vượt 1.000, tối đa 500 Vàng. Giao dịch ghi vào economy_ledger và đánh dấu đã nhận cùng transaction. Thẻ huy hiệu là hình minh họa; thưởng hiện tính trực tiếp theo điểm chốt mùa.
- Nếu rớt mạng sau khi bấm khiêu chiến, client giữ mã yêu cầu theo UID. Về Đấu Trường, tải lại bảng rồi dùng Khôi phục trận đã gửi. Máy chủ trả cùng biên nhận nếu trận đã chốt. Reload không cấp thêm điểm hoặc thưởng.
- Áp dụng theo thứ tự `20261115073332_arena_online.sql` và `20261115073441_arena_history.sql`, rồi chạy npm run build:cloud và deploy riêng arena-command. Function cần GAME_ALLOWED_ORIGINS và các biến Supabase mặc định của Edge Runtime. RLS và quyền execute chỉ cho service role truy cập bảng và RPC; client gọi Edge Function với phiên đăng nhập.
- Tiệm Đấu, thưởng từng trận và phát lại từ lịch sử chưa mở. Bảng UI hiện hiển thị ba vị trí bục và tối đa bốn dòng tiếp theo.
