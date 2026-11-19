# Trang Sức V2 — Cường hóa Hardcore

Tài liệu lịch sử. [Hardcore V3](JEWELRY_V3.md) thay chi phí, phí Đồng và báo cáo kinh tế; công cụ mô phỏng hiện dùng V3.

| Cấp mục tiêu | Thành công | Tụt cấp nếu thất bại | Hệ số Vàng | Tinh Hoa SSR |
|---|---:|---:|---:|---:|
| +1 đến +9 | 100% | 0 | ×1 | 1 |
| +10 | 70% | 1 | ×2 | 2 |
| +11 đến +19 | 75% | 1 | ×2 | 2 |
| +20 | 45% | 2 | ×3 | 5 |
| +21 đến +29 | 65% | 1 | ×3 | 5 |
| +30 | 20% | 2 | ×5 | 12 |
| +31 đến +39 | 55% | 1 | ×5 | 12 |
| +40 | 8% | 3 | ×8 | 30 |
| +41 đến +49 | 45% | 1 | ×8 | 30 |
| +50 | 1% | 2 | ×15 | 90 |

Các lần thử có tỷ lệ cố định. Món đã đạt +10, +20, +30 hoặc +40 sẽ giữ mốc đó làm sàn. Theo bảng và mẫu thông báo giao diện, trượt ở lần thử +50 đưa món từ +49 về **+47**. Save trước V2 suy ra checkpoint từ cấp đang lưu. Chi phí Vàng cơ sở giữ nguyên, nhân theo cấp mục tiêu. Tinh Hoa R/SR/SSR bằng 50%/75%/100% giá SSR, làm tròn lên. Khi trượt, Vàng vẫn mất toàn bộ và Tinh Hoa mất một nửa, làm tròn lên từ lượng đã báo giá. Nút xác nhận yêu cầu đủ chi phí thành công. Thưởng từ Chinh Chiến giữ nguyên 100 Tinh Hoa mỗi món, tổng 1.600.

Edge Function dùng HMAC với khóa bí mật phía server để sinh mẫu ngẫu nhiên 48 bit theo UID tài khoản, UID món và requestId. Hai bản của cùng request cho cùng mẫu. Ledger lưu receipt, revision, hai số dư và cấp sau giao dịch trong một lần commit; trượt vẫn là giao dịch thành công ở tầng lưu trữ. Client gửi phiên bản quy tắc 2 trước khi máy chủ chấp nhận một lần thử mới. SaveV2 dùng trường JSON tùy chọn `highestCheckpoint`, không cần DDL cho V2.

## Kinh tế

Chạy `node scripts/simulate-jewelry.mjs 10000` để tái lập **30.000 hành trình từ +0 đến +50**, mỗi phẩm chất 10.000. Mô hình giải thời gian chạm mốc trên chuỗi Markov bằng các bước tiến một cấp hoặc lùi theo bảng. Bảng dưới ghi trung bình mô phỏng, với P50/P90/P99 của lượt. Tệp [dữ liệu đầy đủ](jewelry-v2-simulation.json) có kỳ vọng toán học và phân vị cho cả Vàng, Tinh Hoa, số lần tụt và số lần khóa mốc.

| Phẩm | Mốc | Lượt TB | Lượt P50/P90/P99 | Vàng TB | Tinh Hoa TB |
|---|---:|---:|---:|---:|---:|
| R | +10 | 10,86 | 10 / 12 / 16 | 1.186 | 11 |
| R | +20 | 34,84 | 32 / 50 / 72 | 8.488 | 38 |
| R | +30 | 92,59 | 82 / 148 / 241 | 44.721 | 196 |
| R | +40 | 432,69 | 334 / 859 / 1.548 | 466.939 | 1.826 |
| R | +50 | 9.680,03 | 6.837 / 21.579 / 44.219 | 21.653.215 | 106.135 |
| SR | +10 | 10,85 | 10 / 12 / 16 | 1.806 | 12 |
| SR | +20 | 35,05 | 32 / 50 / 73 | 12.722 | 57 |
| SR | +30 | 92,49 | 82 / 146 / 236 | 65.352 | 259 |
| SR | +40 | 432,87 | 338 / 848 / 1.556 | 677.835 | 2.781 |
| SR | +50 | 9.867,50 | 7.094 / 21.928 / 44.723 | 31.852.920 | 164.456 |
| SSR | +10 | 10,85 | 10 / 12 / 16 | 2.739 | 12 |
| SSR | +20 | 34,98 | 32 / 50 / 73 | 18.957 | 59 |
| SSR | +30 | 92,72 | 82 / 148 / 241 | 96.949 | 322 |
| SSR | +40 | 439,25 | 340 / 874 / 1.555 | 1.010.228 | 3.631 |
| SSR | +50 | 9.680,41 | 6.830 / 21.711 / 42.903 | 45.593.504 | 206.982 |

Kỳ vọng lý thuyết tới +10/+20/+30/+40/+50 là **10,86 / 34,97 / 92,62 / 432,29 / 9.697,33 lượt** cho cả ba phẩm. Sai lệch lớn nhất của trung bình mô phỏng +50 so với kỳ vọng là 1,76% (SR). Kỳ vọng Vàng/Tinh Hoa ở +50 là **21.693.845/106.336** cho R, **31.293.005/161.557** cho SR và **45.691.746/207.451** cho SSR.

| Phẩm | Số lần tụt TB đến +50 | Tụt P50/P90/P99 | Khóa mốc TB | Tần suất khóa mỗi lượt |
|---|---:|---:|---:|---:|
| R | 4.184 | 2.950 / 9.350 / 19.144 | 1.134 | 11,72% |
| SR | 4.265 | 3.066 / 9.498 / 19.363 | 1.158 | 11,74% |
| SSR | 4.185 | 2.960 / 9.397 / 18.611 | 1.134 | 11,71% |

Khoảng 76,5% lượt trượt làm món tụt một cấp; khoảng 2% tụt hai cấp và 0,2% tụt ba cấp. Phần còn lại được khóa mốc. Tỷ lệ đến +50 theo ngân sách dưới đây kiểm tra cả số dư cần có trước mỗi lần xác nhận. 0% nghĩa là 0 trong 10.000 mẫu, không phải xác suất toán học bằng 0.

| Vàng / Tinh Hoa | R | SR | SSR |
|---|---:|---:|---:|
| 100.000 / 1.600 | 0% | 0% | 0% |
| 1.000.000 / 10.000 | 2,35% | 1,16% | 0,56% |
| 10.000.000 / 100.000 | 36,05% | 25,52% | 17,93% |
| 50.000.000 / 500.000 | 90,52% | 79,81% | 66,80% |

## Battle Core

Mô phỏng 600 đội hình đối chiếu trên Battle Core. Các lần chạy giữ nguyên từng kịch bản, với cùng ải hoặc cùng đội thủ Arena đeo bộ Thanh Long SSR +40. Mỗi tướng phe công đeo cùng bộ ở cấp được so sánh.

| Trang sức phe công | Lực chiến TB | Thắng PvE | Thắng PvP |
|---|---:|---:|---:|
| Không trang sức | 6.194 | 394/600 (65,67%) | 125/600 (20,83%) |
| +0 | 6.945 | 431/600 (71,83%) | 228/600 (38,00%) |
| +40 | 7.446 | 454/600 (75,67%) | 301/600 (50,17%) |
| +50 | 7.567 | 461/600 (76,83%) | 324/600 (54,00%) |

+40 → +50 tăng khoảng **10,47% chỉ số riêng của món trước làm tròn**, **1,63% lực chiến đội** và **3,83 điểm phần trăm tỷ lệ thắng PvP** trong mẫu này. Đây là kết quả kiểm thử cân bằng, không phải số liệu xếp hạng thực tế. Công thức tăng trưởng 1,8% mỗi cấp được giữ nguyên. So với mức tăng sức mạnh quan sát, chi phí +50 rất cao. Ngân sách Tinh Hoa của cả 15 mốc Chinh Chiến chỉ bằng khoảng 0,77% chi phí trung bình mô phỏng của một món SSR +50.
