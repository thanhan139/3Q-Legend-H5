# Economy V1.4 · Đề xuất staging

Nguồn Đồng chỉ bật cho UID thuộc `SHOP_STAGING_QA_UIDS` trên đúng project Supabase staging. Không bù thưởng cho ải đã vượt, không reset tiến trình và không chuyển đổi số dư Vàng hay Nguyên Bảo. Thưởng Vàng và Nguyên Bảo hiện hành của gameplay không đổi. Hardcore V3 giữ nguyên công thức.

| Nguồn Đồng | Mức đề xuất | Điều kiện |
|---|---:|---|
| Vượt ải lần đầu | 2.000 / 4.000 / 6.000 theo chương 1 / 2 / 3 | 1 lần mỗi ải, tổng 60.000 cho 15 ải hiện có |
| Đánh lại | 1.000 / 1.500 / 2.500 theo chương | Tối đa 3 trận thắng đánh lại mỗi ngày, dùng chung giữa các ải |
| Nhiệm vụ ngày | 1.000 vượt ải, 2.000 hoàn thành ba trận, 1.200 nâng cấp tướng, 1.000 chiêu mộ | 1 lần mỗi nhiệm vụ đã hoàn thành |
| Đấu Trường | 4.000 | 1 lần/ngày khi tài khoản có trận thắng xếp hạng do server lưu; luyện tập và trận phòng thủ không tính |

Trần lặp ở chương 3 là 16.700 Đồng/ngày. Ngày hành động chốt theo giờ server và reset lúc 00:00 Việt Nam. Phát thưởng qua giao dịch SaveV2 có khóa revision và receipt. Chinh Chiến dùng ticket trận và trạng thái đã vượt. Nhiệm vụ kiểm tra tiến độ và lần nhận. PvP kiểm tra `arena_matches` xác nhận kết quả, chỉ đọc theo UID người tấn công, rồi dùng cờ nhận theo ngày trong cùng save. Không cần migration schema mới.

## Mô phỏng với Đồng hữu hạn

`node scripts/simulate-jewelry.mjs 10000 economy-v14` dùng luật V3 thật và chạy **10.000 hành trình cho mỗi phẩm chất trong mỗi nhóm**. Mỗi hành trình dành ngân sách cho một món. Nhóm miễn phí chơi 3 ngày/tuần, đánh lại 1 trận và nhận nhiệm vụ vượt ải. Nhóm tích cực chơi 6 ngày/tuần, đánh lại 3 trận, nhận ba nhiệm vụ và thắng xếp hạng mỗi hai ngày hoạt động. Nhóm chi tiêu cao chơi hằng ngày, nhận đủ nguồn và giả định có sẵn 12 triệu Vàng. Khoản này là giả định số dư, không phải phần thưởng mới hay nạp tiền thật. Chinh Chiến mở theo tiến độ và người chơi nhận đủ mốc trang sức đã mở. Toàn bộ Vàng khả dụng trong mô hình dành cho Tinh Hoa; phí Trang Bị và chi tiêu khác nằm ngoài mô hình. Mua Tinh Hoa khi thiếu, tối đa 999/ngày, giá 100 Vàng.

| Nhóm · SSR | Ngày | Đã đạt +30 / +40 / +50 | Đồng tiêu TB | Vàng tiêu TB | Lượt thử TB |
|---|---:|---:|---:|---:|---:|
| Miễn phí | 90 | 90,44% / 4,06% / 0% | 170.204 | 0 | 120 |
| Miễn phí | 180 | 99,32% / 14,90% / 0% | 286.929 | 29.859 | 165 |
| Miễn phí | 365 | 99,90% / 17,70% / 0% | 315.177 | 50.536 | 175 |
| Tích cực | 90 | 99,97% / 23,08% / 0,02% | 367.270 | 89.250 | 193 |
| Tích cực | 180 | 100% / 32,90% / 0,03% | 468.507 | 166.103 | 228 |
| Tích cực | 365 | 100% / 48,24% / 0,18% | 668.744 | 323.731 | 292 |
| Chi tiêu cao | 90 | 100% / 80,95% / 1,25% | 1.517.655 | 1.065.706 | 513 |
| Chi tiêu cao | 180 | 100% / 97,09% / 3,85% | 2.983.071 | 2.425.660 | 839 |
| Chi tiêu cao | 365 | 100% / 99,92% / 10,30% | 5.854.489 | 5.146.082 | 1.438 |

0% là không ghi nhận trong mẫu. [Dữ liệu đầy đủ](jewelry-v14-simulation.json) có kết quả cả R/SR/SSR, trung bình, P50/P90/P99, tổng phát và số ngày bị chặn bởi ngân sách.

Ở ngày 365, nhóm tích cực phát 4,313 triệu Đồng nhưng còn trung bình 3,644 triệu Đồng khi chỉ nuôi một món SSR. Nhóm này thiếu Vàng/Tinh Hoa hơn thiếu Đồng. Cường hóa Trang Bị hoặc chia ngân sách cho nhiều món có thể hấp thụ lượng dư đó. Ngược lại, nhóm chi tiêu cao dùng 5,854/6,118 triệu Đồng và đạt +40 rất sớm. Vàng dự trữ tạo chênh lệch mạnh giữa các nhóm. Theo dõi Đồng phát/tiêu và tỷ lệ đạt +40 thực tế trên staging trước khi duyệt mức phát hay mở bán công khai.
