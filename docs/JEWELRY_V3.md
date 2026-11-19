# Hardcore Trang Sức V3 · Báo cáo kinh tế staging

Tỷ lệ, tụt cấp, checkpoint và tăng trưởng 1,8%/cấp giữ nguyên. Trượt +50 từ +49 về +47. Phí cơ sở và hệ số theo mốc giống V2, nay tính bằng **Đồng** cho cả thành công và thất bại. Phí tiền của Trang Bị và Thần Binh dùng cùng đường cường hóa đã chuyển sang Đồng. Lựa chọn dùng Đá Cường Hóa, EXP nâng cấp tướng, mảnh nâng sao và nguyên liệu Lò Rèn giữ cách tiêu hao hiện có. Save cũ thiếu `copper` được hiểu là 0; không chuyển từ Vàng/Nguyên Bảo.

| Mục tiêu | Tỷ lệ | Tinh Hoa SSR khi thành công | Tỷ lệ Tinh Hoa khi trượt |
|---|---:|---:|---:|
| +1–9 | 100% | 1 | — |
| +10 | 70% | 2 | 50% |
| +11–19 | 75% | 3 | 50% |
| +20 | 45% | 8 | 60% |
| +21–29 | 65% | 8 | 60% |
| +30 | 20% | 18 | 75% |
| +31–39 | 55% | 20 | 75% |
| +40 | 8% | 40 | 100% |
| +41–49 | 45% | 45 | 100% |
| +50 | 1% | 120 | 100% |

Làm tròn lên theo phẩm trước, sau đó nhân tỷ lệ thất bại và làm tròn lên lần nữa. Ví dụ SR tại +30 cần 14 Tinh Hoa, mất 11 nếu trượt. Server từ chối yêu cầu mới với phiên bản V2, nhưng vẫn trả receipt V2 đã lưu khi retry cùng ID. Không có bù nguyên liệu bằng Vàng.

## Phương pháp và nguồn thu

`node scripts/simulate-jewelry.mjs 10000` mô phỏng 10.000 món mỗi phẩm và đối chiếu kỳ vọng lần đầu đạt mốc bằng chuỗi Markov. [Kết quả đầy đủ](jewelry-v3-simulation.json) lưu trung bình, P50/P90/P99 cho Tinh Hoa, Vàng, Đồng và lượt tại cả năm mốc. Giá giả định Shop staging là 100 Vàng/Tinh Hoa; cột Vàng gộp giả định mua toàn bộ nguyên liệu, còn JSON có thêm chi phí sau trợ cấp Chinh Chiến.

Nguồn Tinh Hoa đã xác minh là **1.600 một lần** từ 16 món ở mốc Chinh Chiến. Không thấy Tinh Hoa trong nhiệm vụ ngày, và không thấy nguồn Đồng định kỳ từ Chinh Chiến/nhiệm vụ trong cấu hình hiện tại. Tài khoản có 0 Đồng không cường hóa được cho đến khi có nguồn Đồng được duyệt. Các kịch bản có vốn Đồng, hoặc 100.000 Đồng/ngày, chỉ là giả định phân tích; không tự cấp thêm Đồng, Tinh Hoa hay đổi phần thưởng.

Mô hình thời gian tính từ ngày đầu với toàn bộ 1.600 Tinh Hoa đã mở, tích lũy số dư qua ngày và phải đủ chi phí thành công trước mỗi lần thử. Mỗi kịch bản dành ngân sách của mình cho **một món**. Trần 999/ngày áp dụng cho cả UID nên cường hóa nhiều món sẽ chia ngân sách này.

| Phẩm | Mốc | Kỳ vọng Tinh Hoa | Kỳ vọng Đồng | Kỳ vọng Vàng nếu mua hết |
|---|---:|---:|---:|---:|
| R | +10 | 10,86 | 1.186 | 1.086 |
| R | +20 | 56,83 | 8.526 | 5.683 |
| R | +30 | 285,99 | 44.690 | 28.599 |
| R | +40 | 3.513,32 | 466.350 | 351.332 |
| R | +50 | 220.309,25 | 21.693.845 | 22.030.925 |
| SR | +10 | 11,86 | 1.807 | 1.186 |
| SR | +20 | 82,94 | 12.689 | 8.294 |
| SR | +30 | 419,97 | 65.515 | 41.997 |
| SR | +40 | 5.260,97 | 676.669 | 526.097 |
| SR | +50 | 325.872,34 | 31.293.005 | 32.587.234 |
| SSR | +10 | 11,86 | 2.740 | 1.186 |
| SSR | +20 | 86,16 | 18.934 | 8.616 |
| SSR | +30 | 526,06 | 96.751 | 52.606 |
| SSR | +40 | 6.833,49 | 992.147 | 683.349 |
| SSR | +50 | 431.260,31 | 45.691.746 | 43.126.031 |

Kỳ vọng lượt tới +10/+20/+30/+40/+50 là 10,86 / 34,97 / 92,62 / 432,29 / 9.697,33. Với SSR +50, số lượt mô phỏng P50/P90/P99 là **6.830 / 21.711 / 42.903**.

## Rủi ro nhóm có nhiều Vàng

Giả định mua đủ 999 mỗi ngày và đã có đủ Đồng:

| Phẩm | Trung vị đến +50 | Trong 90 ngày | Trong 180 ngày | Trong 365 ngày |
|---|---:|---:|---:|---:|
| R | 152 ngày | 33,39% | 56,61% | 81,57% |
| SR | 235 ngày | 22,93% | 41,61% | 66,86% |
| SSR | 299 ngày | 17,70% | 33,26% | 57,53% |

Với SSR, trung vị đến +40 là 4 ngày trong kịch bản tối đa. Trong 7 ngày đầu, 2,01% R, 1,06% SR và 0,62% SSR đạt +50; riêng SSR có 3/10.000 mẫu đạt ngay ngày đầu. Trần ngày giới hạn số lần thử qua nguyên liệu, song vẫn có đuôi xác suất đạt sớm. Ở kịch bản 300 Tinh Hoa/ngày và 100.000 Đồng/ngày giả định, SSR trung vị đến +50 là 996 ngày, với 4,94% / 10,58% / 21,05% đạt trong 90/180/365 ngày. Giá và quota chỉ dành cho QA; nên duyệt nguồn Đồng và chênh lệch tiến độ trước khi mở mua công khai.

## Sức mạnh

600 kịch bản Battle Core, giữ nguyên cặp đội và ải khi thay mức Trang Sức; đối thủ Arena đeo SSR +40. Kết quả đo theo một đội được gắn bộ Thanh Long cho toàn bộ thành viên.

| Mức | Lực chiến TB | Thắng PvE | Thắng PvP |
|---|---:|---:|---:|
| +30 | 7.316 | 446/600 | 289/600 |
| +40 | 7.446 | 454/600 | 301/600 |
| +50 | 7.567 | 461/600 | 324/600 |

V3 cập nhật tiêu hao, không thay công thức chiến đấu. Thay đổi cấp ghi vào save xác nhận; trận đã có replay giữ snapshot lúc chốt.
