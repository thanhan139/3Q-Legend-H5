# Battle 6v6 với sprite toàn thân · v0.3.1

Hai đội đứng trực tiếp trên sân. Mỗi tướng có sprite chibi riêng, hướng về đội đối diện, cùng tên, HP và nhịp tuyệt kỹ. Khi đánh, tướng lao tới mục tiêu, nghiêng người lúc ra đòn rồi lùi về ô. Trúng đòn có vệt chém, chớp sáng và số sát thương. Hồi máu có hiệu ứng xanh. Tướng tử trận ngừng idle và mờ đi.

Battle Core và save v1 giữ nguyên. Chân dung vẫn dùng trong Võ Tướng và Đội Hình. Chuyển động trong trận dùng tween Phaser trên một pose toàn thân mỗi tướng, chưa có bộ frame riêng cho từng động tác hoặc tuyệt kỹ.

Thay đổi: `BattleScene.ts` điều khiển sprite và hiệu ứng. `BootScene.ts` preload atlas mới. `battleSprites.ts` và `heroPresentation.ts` ánh xạ ID tướng. `public/assets/heroes/battle-sprites.webp` chứa 14 sprite sử dụng. `package.json` và lockfile cập nhật phiên bản.

Kiểm tra: typecheck và build thành công, 15/15 test pass. Vite vẫn cảnh báo bundle JS lớn hơn 500 kB trước gzip.

Chromium bản production đã chạy ải 3-1 đủ 6v6 bằng save kiểm thử, chuyển tốc độ, bỏ qua, về sảnh và vượt ải 1-1. Không ghi nhận lỗi trang, console hay HTTP trong lượt kiểm tra. Video được ghi từ canvas đang chạy.
