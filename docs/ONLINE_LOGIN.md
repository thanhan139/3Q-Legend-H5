# Đăng nhập online và tự động vào game

## Luồng hiện tại

- Mở game với session hợp lệ: xác thực, tải Cloud Save theo UID, đối chiếu giao dịch đang chờ và tự vào game. Không hiển thị màn quản lý tài khoản hoặc yêu cầu bấm vào game.
- Chưa có session: hiển thị đăng nhập/đăng ký. Sai mật khẩu ở lại form; đăng ký cần xác minh email hiển thị hướng dẫn xác minh. Session đã xác minh tự tiếp tục qua callback hoặc lần mở game tiếp theo.
- Chỉ khởi tạo nhân vật khi game-command trả rõ `missing`. SQL M8 vẫn bảo đảm tạo đúng một lần; retry sau khi mất phản hồi trả nhân vật hiện có, không ghi đè dữ liệu.
- Tutorial M8 đang dở tiếp tục đúng bước. Tài khoản hoàn thành, bỏ qua hoặc được miễn tutorial vào Sảnh.
- Mất kết nối hiển thị **Không thể kết nối máy chủ** và **Thử lại**. Lỗi mạng không xóa session, tạo nhân vật hoặc mở chế độ offline.
- Cài Đặt → Tài khoản chỉ phục vụ quản lý và đăng xuất. Đăng xuất dừng quyền dùng tiến trình hiện tại và reload về startup. Liên kết khách cũ giữ nguyên UID; không tạo khách mới.

`SessionEntry` điều phối khôi phục phiên, đăng nhập, đăng ký và đăng xuất. `CloudRepository.connect(session)` không còn callback chọn nguồn save. Phản hồi đến muộn khi đăng xuất hoặc đổi UID không được áp dụng. Các thao tác trên UI được khóa khi đang xử lý để tránh gửi lặp.

## Migration và tương thích

Frontend không còn đọc save legacy để quyết định startup, không xử lý `legacy-import` và không có lựa chọn nhập/tạo/chọn nguồn save. Dữ liệu legacy vẫn được giữ trên thiết bị. Công cụ `legacy:digest` và endpoint import được kiểm tra UID/fingerprint vẫn được giữ cho quy trình quản trị; game không cung cấp giao diện gọi chúng.

Không thay đổi SaveV2, tài nguyên khởi đầu, Battle Core, Campaign, Welfare, PvP hay schema tutorial. Không thêm migration hoặc thay đổi endpoint backend. Môi trường chạy vẫn cần migration và game-command M8 đã có từ milestone trước; thay đổi đăng nhập này không tự deploy lên staging.

## Kết quả kiểm tra

- `npm run typecheck`: PASS.
- `node scripts/test-in-process.mjs`: **120/120 test PASS**, 15 file. Gồm 12 test điều phối xác thực mới, 8 test client online và toàn bộ regression domain/server hiện có.
- Đã kiểm tra bằng fixture Supabase: tài khoản mới/cũ, session reload, email chưa xác minh, sai mật khẩu, đăng xuất, hai UID, phản hồi cũ đến muộn, mất mạng, mất phản hồi sau khởi tạo và phục hồi giao dịch chờ trước khi vào game.
- `npm run test`, `npm run build`, `npm run build:cloud`: bị môi trường chặn tạo subprocess (`spawn EPERM`). Không ghi nhận các lệnh này là PASS.
- Bundle thay thế với TypeScript trong tiến trình và Vite/Rollup: frontend 112 module, thành công tại `.vite/m8-preview`; hai Edge Function bundle thành công. Công cụ và artifact kiểm tra trong `.vite` bị gitignore; pipeline build chuẩn giữ nguyên.
- Chưa kiểm thử E2E trên Supabase staging hoặc trình duyệt. Môi trường hiện tại từng từ chối IPC của Chrome trong QA M8; không có kết quả visual mới được xác nhận trong lần thay đổi này.
