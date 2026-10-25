# Duyệt phát hành Khung di sản 1968

Tài liệu này là cổng phát hành bắt buộc cho 12 template. Ngày 2026-10-26, Chủ dự án TimeLens xác nhận đã trực tiếp kiểm tra và phê duyệt toàn bộ 24 tài sản background/overlay; 12 template được chuyển sang `published=true` và sử dụng URL asset runtime trong giao diện người dùng.

## Nguyên tắc chung

- Chỉ đổi `published=true` sau khi đủ background, overlay alpha, calibration và chữ ký người duyệt độc lập trong `approval.json`.
- Selfie và dữ liệu nhận diện khuôn mặt chỉ được xử lý trong trình duyệt. Chỉ ảnh composite cuối được upload sau khi người dùng bấm lưu.
- Không suy luận giới tính; người dùng tự chọn biến thể nam/nữ.
- Ảnh phải thể hiện đời sống thiếu thốn, vóc người và tư thế tự nhiên trong hoàn cảnh địa đạo năm 1968; không chỉnh trang kiểu hiện đại hoặc làm nhân vật quá sạch sẽ.
- Nhãn `Ảnh hóa thân kỹ thuật số · tái hiện 1968` và watermark TimeLens phải đọc được ở cả bản vuông và 9:16.
- Sa bàn Cedar Falls phải ghi rõ bối cảnh 1967 trước khi chuyển sang đời sống dưới địa đạo năm 1968.
- Không ký duyệt bằng screenshot WebGL, model low-poly hoặc ảnh placeholder.

## Gate A · ST01

| Template | Vai/hành động cần kiểm chứng | Sử liệu | Tự nhiên/khó khăn | Ghép mặt & sáng | Mobile 390×844 | Người duyệt/ngày | Trạng thái |
|---|---|---|---|---|---|---|---|
| ST01 Nam | Cán bộ liên lạc · chuyển tài liệu/lắng nghe cuộc họp | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST01 Nữ | Cán bộ liên lạc · chuyển tài liệu/lắng nghe cuộc họp | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |

Gate A chỉ được ký khi cả hai biến thể đạt, ảnh không “bảnh tỏn”, trang phục/tóc/vóc dáng phù hợp năm 1968 và khuôn mặt hòa vào ánh sáng phòng họp.

## Gate B · ST02–ST03

| Template | Vai/hành động cần kiểm chứng | Sử liệu | Tự nhiên/khó khăn | Ghép mặt & sáng | Mobile 390×844 | Người duyệt/ngày | Trạng thái |
|---|---|---|---|---|---|---|---|
| ST02 Nam | Cán bộ hậu cần · kiểm đếm/sắp xếp lương thực, vật dụng | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST02 Nữ | Cán bộ hậu cần · kiểm đếm/sắp xếp lương thực, vật dụng | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST03 Nam | Bảo đảm nước/thông khí · lấy nước/ngụy trang lỗ thông hơi | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST03 Nữ | Bảo đảm nước/thông khí · lấy nước/ngụy trang lỗ thông hơi | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |

## Gate C · ST04–ST06

| Template | Vai/hành động cần kiểm chứng | Sử liệu | Tự nhiên/khó khăn | Ghép mặt & sáng | Mobile 390×844 | Người duyệt/ngày | Trạng thái |
|---|---|---|---|---|---|---|---|
| ST04 Nam | Cán bộ quân y · sơ cứu/chăm sóc thương binh | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST04 Nữ | Cán bộ quân y · sơ cứu/chăm sóc thương binh | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST05 Nam | Thợ quân giới · sửa chữa/gia công/kiểm tra dụng cụ | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST05 Nữ | Thợ quân giới · sửa chữa/gia công/kiểm tra dụng cụ | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST06 Nam | Du kích trực gác · quan sát/truyền tín hiệu cảnh giới | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |
| ST06 Nữ | Du kích trực gác · quan sát/truyền tín hiệu cảnh giới | ☑ | ☑ | ☑ | ☑ | Chủ dự án TimeLens · 2026-10-26 | Đã duyệt |

ST06 phải kiểm tra riêng việc camera live vẫn bị khóa; chọn ảnh thư viện, căn mặt, xuất ảnh và quay lại trạm vẫn hoạt động.

## Kiểm tra kỹ thuật trước khi ký từng gate

1. Chạy `npm run test:heritage-studio`, `npm run lint` và `npm run build`.
2. Trên màn hình 390×844, thử một biến thể nam và nữ của gate; không có cuộn ngang.
3. Thử ảnh 12 MP: detector dùng ảnh làm việc tối đa 1280 px, UI không treo và chỉ tải asset của vai đã chọn.
4. Thử không có `FaceDetector`, một khuôn mặt và nhiều khuôn mặt; trường hợp nhiều mặt phải buộc chọn rõ ràng.
5. Trước nút lưu không có request upload; sau nút lưu có đúng một upload composite.
6. Kiểm tra bản vuông, 9:16, chia sẻ và tất cả đường quay lại từ trạm/Cổng thời gian/Sa bàn.
7. Ghi thời gian dựng ảnh và mức dùng bộ nhớ bằng quan sát thực tế; không dùng ngưỡng CI dễ chập chờn.

Nếu một biến thể không đạt, giữ nguyên toàn bộ gate ở trạng thái chưa phát hành. Không dùng asset tạm để “mở trước”.
