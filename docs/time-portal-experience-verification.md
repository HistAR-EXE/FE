# Cổng Thời Gian — kiểm chứng nâng cấp 2026-10-22

## Kết quả
- Giao diện dòng thời gian đổi sang xanh TimeLens, nền trắng/xanh nhạt, điểm nhấn vàng. Thanh chương hiển thị trên mobile phía trên navigation cố định. Thẻ kể chuyện, số liệu, bản đồ và chuyển chương cùng màu sáng. Giữ Premium, câu đố, discovery callbacks, Xưa & Nay và3D.
- Ảnh tư liệu và lightbox dùng filter none. Minh hoạ SVG có vùng trình bày riêng khi mốc không dùng ảnh.
- Nhạc do người dùng cung cấp: Downloads/paulyudin-war-epic-182501.mp3 → public/audio/time-portal/war-epic-v1.mp3; 2985064bytes,93.28325giây; SHA256 12E8CEDB03B3D7BCFD33EEED30FDE524F6560B31200571DA487AE2D280260AF0. File chép nguyên vẹn, không lấy nhạc epic-intro cũ.
- Nhạc lặp, mặc định24%, giảm còn khoảng7% khi đọc. Tắt nhạc giảm dần200ms; pause/ẩn/rời trang dừng ngay. Có điều khiển riêng nhạc/lời/âm lượng/đọc lại và tạm dừng chung, lưu tùy chọn tại thiết bị.
- Mặc định tự thuyết minh tiếng Việt: lời chào, chương/ngày/tiêu đề/nội dung/Bạn có biết. Câu đố chỉ đọc câu hỏi. Chờ hết lời mới chuyển mốc; hover giữ nội dung kể cả khi lời đọc vừa kết thúc. Hủy callback cũ khi đổi mốc nhanh. Khi autoplay bị chặn có nút Bắt đầu trải nghiệm âm thanh.

## Bằng chứng
- npm run test:portal:10/10 tests pass (giọng Việt nạp chậm, voice không phải tiếng Việt, cancel/stale callbacks, pause/resume, watchdog, blocked recovery, ducking, preferences, fade-out race).
- npm run test:portal:browser: Edge cách ly với speech giả lập và MP3 thật: tự gọi giọng Việt, nhạc phát thật, hạ/khôi phục âm lượng, pause/resume không đọc lại, đồng hồ chờ lời, hover giữ mốc, mobile390x844 không tràn ngang và rail không bị navigation che, quiz và chuyển3D dừng nhạc.
- Local thật localhost5173: đăng nhập premium@histar.vn, mở trang, MP3 tăng currentTime và pause chung hoạt động, không mock API. Screenshot test-results/portal-real-local.png.
- npm run ci pass: lint0errors/16warnings có sẵn ngoài thay đổi; TypeScript/build thành công. Rà soát độc lập: đã sửa hai finding (hover gate và filter ảnh), không còn finding quan trọng.

## Giới hạn đã kiểm tra
Giọng đọc Web Speech phụ thuộc giọng vi-VN do thiết bị/trình duyệt cung cấp. Edge headless trên máy kiểm thử không liệt kê giọng Việt, nên các kiểm thử speech là giả lập và chưa xác nhận được chất giọng thật. Trang hiển thị rõ khi thiếu giọng Việt; nhạc và nội dung vẫn hoạt động. Không tạo bản ghi âm/TTS từ dịch vụ ngoài. Chrome/Edge/iOS có thể yêu cầu tương tác đầu tiên để phát tiếng; không cố vượt autoplay policy.

## Vận hành
- npm run dev; mở /time-portal/dia-dao-cu-chi.
- npm run test:portal và npm run test:portal:browser để kiểm tra lại.
- Các file mới và bản sửa đang ở workspace local để xem thử; chưa push/deploy production trong đợt nâng cấp này.

## Điều chỉnh theo yêu cầu tiếp theo
- Bỏ toàn bộ toolbar âm thanh và nút pause của story; không có nút tắt nhạc/lời đọc hay volume. Hook không nạp các lựa chọn mute/volume cũ, luôn bật nhạc và thuyết minh ở mức nền24% (duck khi đọc).
- Chỉ hiển thị nút bắt đầu khi trình duyệt chặn autoplay, hoặc thông báo thiếu giọng Việt. Các trạng thái tạm ngừng do ẩn tab, xem ảnh, chuyển chế độ và rời trang vẫn bảo đảm cleanup.
- Mặc định1948 khi URL không chỉ định năm hoặc năm sai; link có era hợp lệ vẫn được giữ. Quyền Premium không thay đổi: tài khoản không đủ quyền vẫn nhận paywall cho1948.
- npm run test:portal:11/11pass, gồm kiểm tra default1948 và explicit chapter links. Browser smoke pass với localStorage cũ đặt mute=true/volume0 nhưng nhạc/lời vẫn tự phát, không còn nút tắt, rail1948 active, lightbox pause/resume, chuyển3D dừng nhạc.

## Xưa & Nay — đồng bộ giao diện
- XuaNayView dùng nền xanh nhạt, thẻ trắng, chữ navy, nhấn xanh TimeLens và điểm đang chọn vàng; tay kéo và nhãn Hiện nay dùng xanh. Khung ảnh và thanh nút có bố cục riêng; nav5điểm có tên đầy đủ trên desktop và tên gọn dễ đọc trên mobile.
- Giữ nguyên dữ liệu xuaNayData, ảnh gốc, clipPath so sánh, keyboard Home/End/Arrow, kéo pointer, auto hint/reduced-motion, callback ghi nhận tương tác, điều hướng5điểm và quay về đúng dòng thời gian.
- scripts/xua-nay-smoke.mjs: kiểm thử pointer kéo25%, Home0/End100/Arrow95, chia đôi50, đổi điểm reset50, next/prev, các viewport1440x1000,1440x600,768x1024,390x844 không tràn ngang và khung vẫn dùng được; quay lại timeline thành công.
- Ảnh kiểm chứng test-results/xua-nay-desktop.png và xua-nay-mobile.png. TypeScript, ESLint vùng thay đổi và Vite build đạt.

## Sửa mất nhạc khi chuyển chế độ
Nguyên nhân tái hiện: audio session nằm trong TimelineExplorerView nên bị dispose khi chuyển Xưa & Nay; mở thẳng Xưa & Nay không tạo Audio. Đã đưa usePortalAudio lên TimePortalPage, dùng chung một phiên cho Dòng thời gian/Xưa & Nay/3D. Chuyển chế độ hủy lời đọc cũ, không hủy nhạc hay đặt lại currentTime. Chỉ tạo session khi di tích có nội dung. Rời portal cleanup dừng nhạc; ẩn tab/paywall vẫn tạm dừng phù hợp.

Bổ sung khôi phục autoplay qua pointerdown/keydown hợp lệ, giữ nút phục hồi khi trình duyệt cần tương tác. Tách token của nhạc khỏi token lời đọc để voiceschanged không làm mất lỗi play() bị chặn. Xóa trạng thái chặn lời đọc cũ khi chuyển sang chỉ nghe nhạc.

Bằng chứng: test mới Xưa & Nay đỏ trước sửa (không có Audio), sau sửa hai browser suites đều pass; xác nhận cùng Audio và currentTime giữ nguyên qua Xưa & Nay→timeline→Xưa & Nay, nhạc chạy ở3D, dừng khi rời portal, không phát ở di tích chưa có nội dung.13unit tests pass. Kiểm tra localhost5173 bằng premium demo thật, không mockAPI/giọng: MP3 war-epic-v1 tăng currentTime xuyên suốt chuyển chế độ, volume0.24.
