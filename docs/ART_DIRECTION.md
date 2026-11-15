# Art Bible · M3.5 · Giai đoạn A

Mục tiêu là Tam Quốc chibi 2D với đầu bằng khoảng 1/2,3 chiều cao toàn thân. Dùng góc nhìn 3/4 sang phải cho source, flip ngang cho phe địch. Ba mẫu là Lưu Bị song kiếm, Quan Vũ thanh long đao, Trương Phi xà mâu.

Palette gồm jade #355F43, vermilion #A8392B, gold #EBC168, ivory #F4E4BC và outline #30231F. Nền sân dùng slate #88979A với tương phản thấp. Outline mục tiêu 2–3 px ở source 256 px, shading 2–3 cấp với một hướng sáng phía trên trái. Silhouette nhận biết bằng vũ khí, mũ và râu.

Sprite RGBA 256×256, chân ở đáy, anchor (0.5,1). Render 160×160 logical pixels. Cấu hình layout tập trung trong src/data/battleLayout.ts. Nền riêng 1280×720. Shadow ellipse độc lập, neo tại chân.

QA kiểm tra alpha thật, đủ vũ khí và bàn chân, so chiều cao đầu và thân của cả ba mẫu, xem ở 1280×720 và 844×390, xác minh nhãn HP không giao nhau ở vị trí nghỉ. Art tạo mới bằng image generation và dùng làm mẫu nghiệm thu.

Giai đoạn A cung cấp một pose mỗi mẫu. Chuyển động hiện có là tween placeholder. Giai đoạn B cần API animation có vòng đời rõ, pause, speed và sequencing. Các bộ frame idle/attack/hit/skill/victory/death chưa được sản xuất. Giai đoạn C cần chuẩn hóa các tướng còn lại theo mẫu đã duyệt.

## Cập nhật v0.4.6

Ảnh tham chiếu mới xác định tư thế thủ thấp, giáp phân lớp với viền vàng, vải và tóc tạo silhouette chéo. Ba sprite mẫu được thay trong Battle và Bày Trận. Mỗi sprite vẫn dùng một pose RGBA 256×256 với neo dưới chân. Chân dung và các tướng khác tiếp tục dùng atlas hiện có.
