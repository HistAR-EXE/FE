# Kiểm duyệt bộ sưu tập AR — 20/10/2026

## Nội dung

Mười mô hình chính thức: mũ cối, đèn dầu, bi đông, la bàn, ống nhòm, xẻng, nồi nấu ăn, AK-47, đèn pin và hộp sơ cứu.

Đã loại ba lô, radio cổ và bộ nồi dã ngoại khỏi catalog, tài sản phát hành và ảnh tổng hợp. Đèn pin cùng hộp sơ cứu được đưa vào bộ sưu tập chính; không còn mục ứng viên dự phòng.

Nguồn, tác giả, giấy phép, SHA-256, kích thước, số mesh/triangle, animation và thay đổi tài sản được ghi trong [ar-assets-audit.json](./ar-assets-audit.json). File GLB giữ nguyên credit nhúng; một số tác giả đổi tên tài khoản nên báo cáo lưu cả tên hiển thị hiện nay và credit gốc. Tất cả mô hình 3D hiện dùng CC BY 4.0 và giữ liên kết ghi công trên giao diện.

Đây là các mô hình minh họa để gợi mở câu chuyện lịch sử. Chưa xác thực từng mẫu là hiện vật số hóa tại bảo tàng Củ Chi. Cần đối chiếu kiểu dáng và niên đại trước khi gắn mô hình với một lực lượng hay thời điểm cụ thể.

## Chạy và trải nghiệm

1. Khởi động FE bằng `powershell -ExecutionPolicy Bypass -File scripts/start-ar-local.ps1` từ thư mục FE. Vào http://127.0.0.1:5175/ar-experience. Trang AR cho phép khách trải nghiệm; không cần đăng nhập chỉ để xem 3D/camera.
2. Chọn hiện vật trong bộ sưu tập có thể cuộn ngang, rồi chọn **Tải mô hình 3D**. Kiểm tra độ lớn, texture, hướng đứng và khả năng xem mọi phía.
3. Dùng **Chuyển động tự động** để phát/tạm dừng. Khi kéo hoặc xoay/phóng bằng nút, tự động xoay sẽ dừng. **Đặt lại góc nhìn** trả về khung mặc định; **Toàn màn hình** mở vùng xem lớn.
4. La bàn và đèn dầu có clip trong file nguồn; các vật thể tĩnh dùng xoay quan sát. Không gán nhãn mọi mô hình là chuyển động cơ khí có sẵn. Thiết bị bật giảm chuyển động sẽ không tự phát khi mới mở.
5. Chọn **AR tại nhà**, mở hoặc in thẻ; trên thiết bị có camera chọn **Bật camera AR**. Hướng camera vào đúng ảnh mục tiêu. Mười mô hình dùng mười ảnh màu riêng do nhóm chụp; xem [bảng ghép ảnh và hướng dẫn](./ar-photo-targets.md). Quét đúng ảnh tương ứng, không tự nhận diện vật thể thật trong phòng.
6. Khi đã nhận diện, điều chỉnh **Kích thước hiện vật AR** từ 0,5× đến 2×, xoay, bật/tắt chuyển động và đặt lại. Các nút không khởi động lại camera. Di chuyển thẻ nhẹ để kiểm tra bám ảnh, đưa thẻ ra khỏi camera để kiểm tra mô hình ẩn.
7. Chọn **Tắt camera**, đổi hiện vật hoặc đổi chế độ; camera phải tắt. Trải nghiệm tại nhà không tự tạo check-in hoặc điểm thưởng.
8. Kiểm tra danh sách đủ 10 mô hình, bao gồm đèn pin và hộp sơ cứu, không cần cờ `review`. Liên kết cũ đến ba mẫu đã bỏ sẽ chuyển về mũ cối; `?review=1` không mở thêm mẫu nào.

Điện thoại không truy cập laptop bằng địa chỉ 127.0.0.1 của laptop. Điện thoại cần đường dẫn HTTPS truy cập được từ bên ngoài; xem [hướng dẫn AR tại nhà và email](./ar-home-ux-email.md).

Ảnh màu, nguồn ảnh gốc và cách biên dịch được mô tả trong [hướng dẫn ảnh AR](./ar-photo-targets.md).

## Tái tạo tài sản và kiểm tra

- `npm run predev` đồng bộ catalog từ `src/features/ar/ar-catalog.json` sang `public/ar-catalog.json`. `prebuild` cũng chạy tự động. Không sửa hai bản riêng lẻ.
- `node scripts/audit-ar-assets.mjs` tái tạo báo cáo hash/kích thước từ file thật.
- `node scripts/render-ar-thumbnails.mjs http://127.0.0.1:5175` render mô hình local và tạo thumbnail; chạy sau khi mã đã ổn định.
- `npm run test:ar` kiểm tra catalog, fit/motion/cleanup, thông điệp camera và UI/nhận diện MindAR bằng camera giả lập. `npm run build` kiểm tra bản production.

Kiểm tra giả lập không thay thế kiểm tra điện thoại thật. Trước khi phát hành cần duyệt nội dung, thử camera trên thiết bị thực, kiểm tra ánh sáng/phản sáng và tốc độ tải trên mạng di động.
