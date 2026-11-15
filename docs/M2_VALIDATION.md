# 3Q Legend H5 v0.3 · M2A và M2B

## Phạm vi

- Battle có hai hàng ba cột mỗi bên, chân dung theo võ tướng, HP hiện tại/tối đa và thanh vàng phản ánh số hành động trước tuyệt kỹ. Tên, HP và hiệu ứng được cập nhật từ Battle Core.
- Đòn đánh có chuyển động ngắn, chớp màu và số sát thương nổi. Hồi máu có màu xanh riêng. Tướng bị hạ mờ đi và có nhãn Tử trận. Nhật ký hiện ba hành động gần nhất.
- Tốc độ ×1/×2 cập nhật ngay trên nút. Bỏ qua chạy tiếp cùng bộ mô phỏng tới kết quả. Kết quả hiện ải, lượt, thưởng lần đầu và lối sang ải tiếp, chọn ải, thử lại, chỉnh đội hình hoặc về sảnh tùy kết quả.
- Võ Tướng có danh sách sở hữu và bộ sưu tập, phẩm chất, phe, vai trò, cấp và bốn chỉ số. Điều kiện nhận tướng chưa sở hữu hiển thị trong chi tiết.
- Đội Hình dùng sáu ô. Thao tác thêm, thay, chuyển, gỡ lưu ngay bằng GameStore. Khi chuyển một tướng, ô cũ được giải phóng. Battle đọc trực tiếp đội hình đã lưu.
- Battle Core, GameStore và schema save v1 giữ nguyên. Sáu vị trí có sẵn từ đầu, số võ tướng sở hữu tăng theo tiến trình.

## File thay đổi

| File | Thay đổi |
| --- | --- |
| `src/scenes/BattleScene.ts` | Bố cục, điều khiển trận, sự kiện và nhật ký. |
| `src/scenes/ResultScene.ts` | Kết quả thắng/thua, thưởng và điều hướng. |
| `src/scenes/HeroesScene.ts` | Danh sách, bộ sưu tập và bảng chỉ số. |
| `src/scenes/FormationScene.ts` | Chọn ô, bố trí, gỡ và phản hồi khi lưu. |
| `src/scenes/BootScene.ts` | Preload atlas chân dung. |
| `src/ui/heroPresentation.ts` | Khung chân dung, thứ tự atlas, vai trò và phẩm chất. |
| `public/assets/heroes/portraits.webp` | Atlas minh họa chibi mới, 14 chân dung được sử dụng. |
| `package.json`, `package-lock.json` | Phiên bản 0.3.0. |
| `README.md`, `docs/M2_VALIDATION.md` | Hướng dẫn và báo cáo. |

## Kết quả kiểm tra

- `npm run typecheck`: pass với TypeScript strict.
- `npm run test`: 15/15 pass. Các test hiện có bao gồm 6v6, thắng/thua, Skip cho cùng kết quả với từng bước mô phỏng và lưu tiến trình.
- `npm run build`: pass. Bundle JS khoảng 354 kB gzip. Vite vẫn cảnh báo chunk JS vượt 500 kB trước gzip.
- Chromium desktop: Võ Tướng, thêm/thay/chuyển/gỡ tướng, save/reload, đội hình xuất trận, tốc độ và Skip, thắng 1-1, nhận đúng 200 vàng, đánh tiếp 1-2, trận 6v6 bằng save kiểm thử, màn thua, xử lý đội hình rỗng. Không ghi nhận lỗi JS, console hoặc HTTP trong lượt chạy.
- Chromium mobile giả lập 844×390, bản production: cảm ứng chọn tướng, chỉnh đội hình, reload, vào trận, thắng 1-1 và đánh tiếp 1-2.
- So sánh trực tiếp xác nhận `src/domain/battle.ts` giống bản v0.2.

## Giới hạn

- Cấp tướng hiển thị cố định ở cấp 1. Nâng cấp tướng và tăng chỉ số theo cấp nằm ngoài bản này.
- Battle dùng chân dung và tween. Hoạt ảnh toàn thân theo từng kỹ năng, âm thanh và cân bằng lại các ải về sau còn để ngỏ.
- Mobile được kiểm tra bằng Chromium giả lập, chưa thử trên thiết bị thật.
