# Vạn Bảo Các V1.4

Master duy nhất `concepts/shop_alt_categories.png` (1672×941) trong pack đã duyệt. Scene Phaser dựng từ texture rời, lớp nền riêng và dữ liệu động. PR Shop tiếp tục dựa trên PR #10 với Hardcore V3.

## Giá thử nghiệm chờ duyệt

Mọi giá dưới đây chỉ dành cho QA staging và chờ duyệt. `coins` là Vàng dùng để mua toàn bộ mặt hàng. Đồng (`copper`) xuất hiện cùng Vàng trong ví và dùng cho cường hóa, nâng cấp. Số dư Nguyên Bảo (`gems`) tồn tại riêng trong SaveV2. Không đổi số dư cũ hay cấu hình thanh toán ngoài game.

| Mặt hàng | Lượng mỗi lượt | Giá đề xuất | Giới hạn mỗi UID |
|---|---:|---:|---|
| Chìa Khóa Vàng | 1 | 2.000 Vàng | 4/ngày |
| Tinh Hoa Trang Sức | 1 | 100 Vàng | 999 đơn vị/ngày |
| Đá Cường Hóa | 1 | 900 Vàng | 5/ngày |
| Mảnh Thần Binh | 3 | 2.400 Vàng | 4/tuần |
| EXP Võ Tướng | 100 | 725 Vàng | 10 vĩnh viễn |

Toàn bộ catalog là `testOnly`. Checkout yêu cầu đúng project Supabase staging, tutorial đã hoàn tất hoặc bỏ qua hợp lệ, và UID nằm trong `SHOP_STAGING_QA_UIDS` hoặc bảng cấp quyền bổ sung `shop_staging_checkout_grants`. Mỗi dòng trong bảng cấp cho đúng một UID; thêm dòng không thay đổi secret hoặc quyền Economy V1.4 của UID khác. Bảng chỉ cho `service_role` đọc và quản trị DB staging cấp quyền. Các thẻ Sắp mở và danh mục gói/VIP chỉ hiển thị trạng thái.

## Giao dịch

- `shopCatalog` trả số dư, sở hữu, số đã mua, Max và thời điểm reset từ server. Ngày reset lúc 00:00 giờ Việt Nam, tuần vào thứ Hai 00:00.
- Tinh Hoa dùng `priceVersion: 2`. Các nút 1/10/100/Max chọn số lượng trước khi xác nhận. Max lấy giá trị nhỏ nhất giữa lượng mua được theo số dư, hạn mức còn lại và giới hạn request 999. Mua 1/10/20/100/999 tốn 100/1.000/2.000/10.000/99.900 Vàng.
- Khi chuyển từ gói 20 sang mua lẻ, server cộng số đơn vị thực cấp trong ngày từ receipt Nguyên Bảo cũ. Counter ngày chỉ tích lũy đơn vị mua theo báo giá mới để mỗi đơn vị đều được tính đúng một lần. Receipt cũ được giữ nguyên và vẫn đối chiếu được khi retry.
- Chìa Khóa Vàng và Mảnh Thần Binh nâng lên báo giá v2. Lượt đã mua trong cùng kỳ vẫn được tính vào quota. Báo giá Nguyên Bảo chưa thanh toán yêu cầu xác nhận giá mới. Giao dịch Nguyên Bảo đã hoàn tất vẫn đối chiếu được từ receipt cũ.
- `shopQuote` phát request ID có MAC từ UID, revision, offer, lượng, phiên bản/đơn giá và kỳ mua. `shopBuy` gửi đúng `offerId`, `quantity` cùng revision/request ID. Server đối chiếu báo giá trước khi tính số dư và giới hạn. Giá hoặc kỳ đổi trả `staleOffer` và yêu cầu báo giá mới.
- Wallet, tài nguyên và counter theo offer nằm chung trong SaveV2. RPC `game_commit_online` khóa hàng save theo UID và commit save cùng receipt trong một transaction. Migration V1.3 thêm RPC đọc ledger theo ngày Việt Nam dành riêng cho service role. Retry dùng đúng request ID. Phiên mới của UID khác có trạng thái giao dịch riêng.
- `tests/shop.test.ts` kiểm tra cả năm tài nguyên qua hệ thống tiêu hao thật của domain, thời điểm reset, giá thay đổi, thiếu tiền, request đồng thời và cách ly UID. `supabase/tests/shop_purchase.sql` kiểm tra RPC, ledger và quyền truy cập trong transaction rollback. `scripts/qa-shop.mjs` chạy Phaser với handler thật và fixture in-memory, chặn request đến Supabase và mô phỏng mất phản hồi sau commit.

## Art handoff cho Creative Director

**Visual QA đối chiếu master còn chờ art.** Layout đã có header, 10 danh mục theo đúng thứ tự, banner nữ thương nhân, 4 bộ lọc, 8 thẻ xếp 4×2 và panel mua bên phải. Bản Preview dùng art có sẵn trong game trong lúc chờ các lớp tách đúng master. Không dùng crop dính chữ/giá hoặc ảnh master làm texture runtime.

| Tài nguyên | Kích thước | Trạng thái / nơi dùng |
|---|---:|---|
| `icons/{golden_key,hero_exp,enhancement_stone,forge_shard,jewelry_essence}.png` | 256×256 mỗi file | Có trong ZIP, RGBA prototype. Hiện vùng alpha khoảng 100×100 px. Cần nguồn sạch chi tiết hơn cho thẻ và panel bên phải. |
| `icons/{coin_pouch,jewelry_chest,treasure_chest}.png` | 256×256 mỗi file | Có trong ZIP, prototype. Túi Vàng chỉ làm thẻ khóa; hai rương giữ tham chiếu, không có offer. |
| `assets/ui_reference/fixed_{shop_title,daily_offer_banner,buy_button}.png` | Theo ZIP | Có chữ gắn vào ảnh, chỉ tham chiếu. |
| `market_night_clean.png`, `market_lantern_overlay.png` | 1920×1080, 1920×1080 | Thiếu nền chợ đêm và lớp lồng đèn. Preview dùng nền Điện Chiêu Mộ có sẵn. |
| `shop_title_dragon_blank.png` | 650×144 | Thiếu đầu rồng đúng master. Preview tái dùng `title_dragon_red.png` (591×115) của Đội Hình. |
| `shop_wallet_gold.png`, `shop_wallet_ingot.png`, `shop_wallet_plus_states.png`, `shop_back_states.png` | 300×72 mỗi counter, 3×64×64, 3×240×72 | Thiếu bộ khung ví, hai icon tiền đúng master và trạng thái nút. Preview dùng plaque và icon tiền hiện có. |
| `shop_category_rail.png`, `shop_category_tab_states.png`, `shop_category_icons.png` | 320×960, 3×256×72, atlas 10×96×96 | Thiếu khung dọc, ba trạng thái và đủ 10 icon riêng. Preview dùng khung Túi Đồ, icon vật phẩm/tính năng có sẵn. |
| `shop_merchant_bust.png`, `shop_banner_clean.png`, `shop_banner_treasure.png` | 550×295, 1150×224, 310×220 | Thiếu nữ thương nhân đúng master, hậu cảnh banner và cụm rương vàng. Preview dùng nhân vật Phúc Lợi và rương game đã tách lớp. |
| `shop_filter_states.png`, `shop_hot_ribbon.png`, `shop_discount_ribbon_blank.png` | 3×250×64, 110×78, 110×78 | Thiếu bộ lọc và ribbon đúng master. Badge Hot render từ catalog; chưa hiển thị giảm giá. |
| `shop_card_states.png`, `shop_rarity_glow_atlas.png`, `shop_price_plate.png`, `shop_limit_strip.png` | 3×280×320, 3×240×240, 250×66, 240×44 | Thiếu bộ thẻ, viền rarity và nền giá/limit. Preview dùng khung Túi Đồ và nút vàng có sẵn. |
| `shop_detail_ornate.png`, `shop_detail_item_slot.png`, `shop_detail_title_blank.png` | 430×900, 175×175, 440×65 | Thiếu khung chi tiết chạm góc và panel ảnh đúng master. Preview dùng khung chi tiết Túi Đồ. |
| `shop_qty_minus_states.png`, `shop_qty_plus_states.png`, `shop_qty_max_states.png`, `shop_buy_states.png`, `shop_confirm_frame.png` | 3×64×64 mỗi dấu, 3×126×64, 3×342×94, 760×400 | Thiếu bộ nút thường/nhấn/khóa và khung xác nhận mua đặc trưng. |
| `shop_dragon_corner_tl.png`, `shop_dragon_corner_br.png`, `shop_divider_gold.png`, `shop_soft_glow.png` | 192×170 mỗi góc, 1100×30, 512×256 | Thiếu ornament riêng. Preview dùng dải trang trí Túi Đồ. |
| `icons/refine_stone_locked.png`, `icons/advanced_summon_seal_locked.png` | 256×256 mỗi file | Thiếu họa tiết orb và lệnh xanh đúng concept. Chỉ minh họa cho ô khóa, không định nghĩa tài nguyên mới. |
