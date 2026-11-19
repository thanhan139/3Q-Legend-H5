# 3Q Legend H5 — Thần Binh 5 Sao Vàng · Star Progression V1

## Phạm vi
Quy tắc 25 cánh sao trên **một instance Thần Binh độc quyền**; 5 cánh hoàn thành 1 sao vàng. Phí bằng Mảnh Thần Binh trong kho chung; không có currency riêng cho từng vũ khí. Thay đổi này là bản cân bằng thử nghiệm trên feature branch, **không tự động mở gói nạp và không kích hoạt Production**.

## Nguyên tắc kinh tế và tương thích save
- Tổng 3.000 mảnh từ chưa có vũ khí đến 5★ (50 mảnh đầu dùng để **rèn và nhận cánh số 1**; không thu lần nữa).
- Sao 1: 50/50/50/50/100 = 300 mảnh; sao 2: 75/75/75/75/150 = 450; sao 3: 100/100/100/100/200 = 600; sao 4: 125/125/125/125/250 = 750; sao 5: 150/150/150/150/300 = 900.
- Nâng cánh thành công **100%**, không mất cấp khi thất bại giao dịch. 25/25 là tối đa.
- Gear cũ đã sở hữu mà không có `signatureNodes` mặc định ở **1 cánh** (giả định lần rèn trước đã chi 50 mảnh). Đồ không phải Thần Binh không có trường này.
- `expectedNodes` + `rulesVersion: 1`, UID, revision và request ID được xác nhận qua giao dịch game-command server; save và trừ mảnh cùng một commit. Retry dùng receipt cũ.
- Ví dụ quy đổi gói trả tiền trong kế hoạch: 300 mảnh / 5.000.000 VNĐ ⇒ 3.000 mảnh tương đương 50 triệu nếu không kiếm mảnh miễn phí. **Đây là giá trị quy đổi, không phải yêu cầu chi tiền để được buff.**

## Chỉ số theo từng sao hoàn thành (tăng so với cấu hình base)

| Sao hoàn thành | Chi phí sao | Cộng dồn | HP tướng sở hữu | Công tướng sở hữu | Thủ tướng sở hữu | Sát thương tuyệt kỹ | Hào quang HP/Công/Thủ đội |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1★ | 300 | 300 | +12% | +18% | +10% | +12 điểm % | +3% |
| 2★ | 450 | 750 | +30% | +40% | +25% | +25 điểm % | +8% |
| 3★ | 600 | 1.350 | +60% | +75% | +45% | +45 điểm % | +15% |
| 4★ | 750 | 2.100 | +105% | +125% | +70% | +70 điểm % | +25% |
| 5★ | 900 | 3.000 | +155% | +190% | +100% | +110 điểm % | +40% |

Chỉ số của các cánh chưa hoàn thành sao được **nội suy tuyến tính**, nên mỗi cánh đều tăng sức mạnh; cánh 5 hoàn thành ngôi sao.

- **Owner buff**: nhân HP/Công/Thủ cuối của tướng **đúng chủ** và đang trang bị vũ khí; không buff tướng khác, không buff vũ khí trong kho.
- **Tuyệt kỹ**: tăng thêm điểm phần trăm sát thương ultimate của vũ khí đang trang bị đúng chủ, cộng với bonus cũ ở `SignatureConfig`.
- **Hào quang đội**: nếu có nhiều Thần Binh trong đội 6 người, chỉ lấy **mức cao nhất** (không cộng dồn). Áp dụng lên HP/Công/Thủ toàn đội trên cả Campaign và Arena, không thêm Tốc Độ để tránh phá tốc độ lượt.
- Không đọc số tiền nạp, không tự gán thắng, không đổi Battle Core từ chiến đấu 6v6 thành đấu lực chiến.

## Chi tiết 25 cánh sao

| Mốc | Vị trí | Mảnh bước này | Mảnh tích lũy | HP chủ | Công chủ | Thủ chủ | Tuyệt kỹ | Aura đội |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1★ · cánh 1/5 | 50 | 50 | +2.4% | +3.6% | +2.0% | +2.4% | +0.6% |
| 2 | 1★ · cánh 2/5 | 50 | 100 | +4.8% | +7.2% | +4.0% | +4.8% | +1.2% |
| 3 | 1★ · cánh 3/5 | 50 | 150 | +7.2% | +10.8% | +6.0% | +7.2% | +1.8% |
| 4 | 1★ · cánh 4/5 | 50 | 200 | +9.6% | +14.4% | +8.0% | +9.6% | +2.4% |
| 5 | 1★ · cánh 5/5 | 100 | 300 | +12.0% | +18.0% | +10.0% | +12.0% | +3.0% |
| 6 | 2★ · cánh 1/5 | 75 | 375 | +15.6% | +22.4% | +13.0% | +14.6% | +4.0% |
| 7 | 2★ · cánh 2/5 | 75 | 450 | +19.2% | +26.8% | +16.0% | +17.2% | +5.0% |
| 8 | 2★ · cánh 3/5 | 75 | 525 | +22.8% | +31.2% | +19.0% | +19.8% | +6.0% |
| 9 | 2★ · cánh 4/5 | 75 | 600 | +26.4% | +35.6% | +22.0% | +22.4% | +7.0% |
| 10 | 2★ · cánh 5/5 | 150 | 750 | +30.0% | +40.0% | +25.0% | +25.0% | +8.0% |
| 11 | 3★ · cánh 1/5 | 100 | 850 | +36.0% | +47.0% | +29.0% | +29.0% | +9.4% |
| 12 | 3★ · cánh 2/5 | 100 | 950 | +42.0% | +54.0% | +33.0% | +33.0% | +10.8% |
| 13 | 3★ · cánh 3/5 | 100 | 1050 | +48.0% | +61.0% | +37.0% | +37.0% | +12.2% |
| 14 | 3★ · cánh 4/5 | 100 | 1150 | +54.0% | +68.0% | +41.0% | +41.0% | +13.6% |
| 15 | 3★ · cánh 5/5 | 200 | 1350 | +60.0% | +75.0% | +45.0% | +45.0% | +15.0% |
| 16 | 4★ · cánh 1/5 | 125 | 1475 | +69.0% | +85.0% | +50.0% | +50.0% | +17.0% |
| 17 | 4★ · cánh 2/5 | 125 | 1600 | +78.0% | +95.0% | +55.0% | +55.0% | +19.0% |
| 18 | 4★ · cánh 3/5 | 125 | 1725 | +87.0% | +105.0% | +60.0% | +60.0% | +21.0% |
| 19 | 4★ · cánh 4/5 | 125 | 1850 | +96.0% | +115.0% | +65.0% | +65.0% | +23.0% |
| 20 | 4★ · cánh 5/5 | 250 | 2100 | +105.0% | +125.0% | +70.0% | +70.0% | +25.0% |
| 21 | 5★ · cánh 1/5 | 150 | 2250 | +115.0% | +138.0% | +76.0% | +78.0% | +28.0% |
| 22 | 5★ · cánh 2/5 | 150 | 2400 | +125.0% | +151.0% | +82.0% | +86.0% | +31.0% |
| 23 | 5★ · cánh 3/5 | 150 | 2550 | +135.0% | +164.0% | +88.0% | +94.0% | +34.0% |
| 24 | 5★ · cánh 4/5 | 150 | 2700 | +145.0% | +177.0% | +94.0% | +102.0% | +37.0% |
| 25 | 5★ · cánh 5/5 | 300 | 3000 | +155.0% | +190.0% | +100.0% | +110.0% | +40.0% |

## Các mốc đầu tư quy đổi (không gồm mảnh miễn phí)
- 20 triệu ⇒ 1.200 mảnh ⇒ **14/25 cánh**, 2 sao hoàn chỉnh + 4/5 cánh của sao thứ 3; Công chủ +68%, hào quang đội +13,6%.
- 45 triệu ⇒ 2.700 mảnh ⇒ **24/25 cánh**, 4 sao hoàn chỉnh + 4/5 cánh sao 5; Công chủ +177%, hào quang đội +37%.
- 50 triệu ⇒ 3.000 mảnh ⇒ **25/25**, 5 sao hoàn chỉnh; Công chủ +190%, hào quang đội +40%.

**Lưu ý về PvP:** Đây là lợi thế chỉ số rất lớn trong điều kiện đội hình tương đương nhưng **không bảo đảm tuyệt đối kết quả PvP** khi chênh lệch tướng, đội hình, nâng cấp các hệ thống khác. Mục tiêu 99% khi đấu mốc 20 triệu chỉ có thể công bố nếu mô phỏng Battle Core với nhiều đội hình chứng minh được. Không hardcode kết quả theo lịch sử thanh toán.

## Đầu việc để Sol hợp nhất với local V2
Commit local `3b69cb6` (feature/divine-forge-v2) chưa xuất hiện trên GitHub tại thời điểm viết. Hãy đưa nhánh `feature/divine-forge-stars-v1` vào nhánh local sau khi đối chiếu conflict, đặc biệt `ForgeScene.ts` và `HeroesScene.ts`. Bảo toàn 53 PNG và layout V2; chỉ nhận logic stat/command/save và bổ sung UI 25 cánh.

## Nghiệm thu bắt buộc trước Production
1. Typecheck, build, regression; SQL transaction/retry/idempotency thật.
2. Hai UID staging thật: đồng thời, đăng nhập lại, offline/online, retry mất phản hồi.
3. Mỗi mốc 0,1,4,5,9,10,14,15,19,20,24,25; không được trừ mảnh khi lỗi.
4. Đối chiếu PvE, Arena attack và defense snapshot; combatPower hiển thị nhất quán.
5. Mô phỏng ít nhất 10.000 trận với đội hình tương đương, các mức 20/45/50 triệu quy đổi và các đội hình phản công; kiểm tra không vô tình gây 100% thắng do lỗi RNG.
6. Đánh giá cân bằng khi có 2–6 Thần Binh trong đội; aura chỉ lấy max.
7. Không hợp nhất `main` hoặc deploy Production khi chưa có nghiệm thu.

## Kết quả mô phỏng bản tích hợp local

Chạy `node scripts/simulate-signature-stars.mjs`. Mô phỏng 100.000 trận 6v6 bằng Battle Core hiện có, 10.000 trận mỗi cặp mốc trong mỗi nhóm. Seed `0x3f627` chọn đội hình, cấp EXP/sao tướng và đảo vị trí. Mỗi kịch bản chạy ở cả hai phía tấn công và phòng thủ. Mỗi phe dùng một Thần Binh đúng chủ; không giả lập thanh toán hay mảnh miễn phí.

| Mốc quy đổi | Ngân sách mảnh | Cánh đạt | Mảnh đã dùng | Còn dư |
|---|---:|---:|---:|---:|
| 20 triệu | 1.200 | 14 | 1.150 | 50 |
| 45 triệu | 2.700 | 24 | 2.700 | 0 |
| 50 triệu | 3.000 | 25 | 3.000 | 0 |

| Mốc phía được đo / đối thủ | Cùng danh sách tướng, xáo trộn vị trí | Đối thủ dùng đội hình khống chế, chống chịu và hồi phục |
|---|---:|---:|
| 45 / 20 | 99,10% | 99,36% |
| 50 / 20 | 99,51% | 99,55% |
| 50 / 45 | 57,71% | 63,09% |
| 20 / 20 | 49,70% | 64,63% |
| 50 / 50 | 50,00% | 56,23% |

Đội hình đối chứng thứ hai là một mẫu cụ thể, không đại diện cho mọi đội phản công. Chênh lệch giữa hai cột ở cùng mốc thể hiện ảnh hưởng của đội hình. Các tỷ lệ là kết quả của mẫu mô phỏng, chưa phải tỷ lệ thắng trên staging.

### Bàn giao kỹ thuật

- Nguồn đối chiếu là `62a520a`; giữ giao diện, texture và điều hướng từ `3b69cb6`. Forge nâng đúng UID món hiện chọn, kể cả khi có nhiều bản cùng loại.
- PvP giữ đội và món đã công bố trên phòng thủ. Trước trận mới, số cánh được lấy từ Save đã xác thực khi định danh món và mẫu vũ khí trùng bản công bố. Replay đã lưu tiếp tục dùng snapshot tại thời điểm đánh.
- `signatureNodes` nằm trong JSON SaveV2. Bản lưu cũ được chuẩn hóa ở lớp đọc; tái sử dụng RPC và ledger hiện có nên không cần migration schema.
- `supabase/tests/signature_stars.sql` kiểm tra ghi cấp và trừ mảnh cùng một giao dịch, retry, revision cũ, request ID đổi nội dung và cách ly UID.
- `node scripts/qa-signature-navigation.mjs` xuất ảnh Phaser trong `.vite/signature-stars-qa/`. E2E dùng handler thật với hai UID cô lập; QA đăng nhập qua Supabase Auth staging là bước nghiệm thu riêng.
- E2E cục bộ bổ sung nối handler với RPC PostgreSQL thật và hai kết nối đồng thời trên cùng revision. Một yêu cầu thành công, yêu cầu còn lại báo conflict; retry giữ cùng receipt. Hai UID có đúng hai ledger entries và tải lại được số cánh riêng. Xác thực UID dùng dữ liệu QA cô lập.
