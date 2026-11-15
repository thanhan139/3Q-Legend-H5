# M6A · Supabase Auth và Cloud Save

## Cấu hình

1. Tạo hoặc chọn dự án Supabase. Bật Email/Password, Confirm Email, Anonymous Sign-Ins và Allow Manual Linking. Cài SMTP cho email ngoài phạm vi thử nghiệm của dự án.
2. Đặt Site URL của game và thêm cả URL phát triển vào danh sách Redirect URLs. Thêm cả URL có query ?auth=recovery nếu dùng allowlist chính xác. URL phải bao gồm đường dẫn gốc của game nếu game được phát hành trong thư mục con. Với PKCE, mở link xác minh/khôi phục trong trình duyệt đã gửi yêu cầu.
3. Điền VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY trong .env.local. Dùng publishable key, hoặc public anon key của dự án cũ. Frontend chỉ dùng hai biến công khai này.
4. Chạy npm ci và npm run build:cloud. Dùng Supabase CLI để liên kết dự án, chạy supabase db push rồi supabase functions deploy game-command. Thư mục supabase dùng entry point được tạo bởi build:cloud.
5. Đặt secrets GAME_ALLOWED_ORIGINS (danh sách origin phân cách bằng dấu phẩy) và GAME_TICKET_SECRET (chuỗi ngẫu nhiên tối thiểu 32 ký tự) cho Edge Function. Supabase cung cấp SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong môi trường Edge Function. Với local CLI, dùng tệp secrets riêng ở ngoài public, rồi chạy supabase functions serve game-command --env-file <path>.
6. Để chuyển save offline, lấy JSON từ khóa localStorage 3q-legend-h5-save-v1 để vận hành kiểm tra. Sau đó đăng ký secret GAME_LEGACY_APPROVALS dạng JSON { "<UID>": "<sha256>" }. Hash SHA-256 tính trên JSON compact, sắp xếp đệ quy các key theo thứ tự từ điển JavaScript, giữ nguyên thứ tự array, mã hóa UTF-8. Chỉ UID và snapshot chính xác đã duyệt mới được nhập. Save offline lịch sử thiếu chữ ký và nhật ký giao dịch server để tự xác minh nguồn gốc. Khi tài khoản đã có save cloud, thao tác chuyển sẽ giữ save đó.