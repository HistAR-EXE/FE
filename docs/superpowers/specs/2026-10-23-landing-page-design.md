# Landing page TimeLens — thiết kế và nội dung đề xuất

Ngày: 2026-10-23. Trạng thái: đã rà soát mã nguồn và TVC, đã được người dùng duyệt để triển khai giao diện.

## Mục tiêu
Trang / phải trả lời được: TimeLens là gì, ai sử dụng, khám phá được gì, bắt đầu như thế nào, công nghệ tạo nên trải nghiệm và nội dung nào đã có. Hướng thị giác là triển lãm di sản số hiện đại với nhiều tương tác có ích; giữ xanh #0275FB, vàng #FDC908, navy #0F1B33, nền trắng/xanh nhạt và slogan Relive History, Reshape Heritage. TimeLens là sản phẩm; HistAR Team là đội ngũ phát triển. Trang không phải tài liệu pitch tài chính.

## Ba hướng cân nhắc
1. Đề xuất: triển lãm công nghệ có dẫn chuyện. Hero nổi bật, demo tương tác, TVC sớm, mô tả tính năng rõ, phần công nghệ sâu hơn và lộ trình sử dụng. Cân bằng hiệu ứng với khả năng đọc, điện thoại và tốc độ.
2. Trải nghiệm3D tràn toàn màn hình: ấn tượng nhưng tải nặng, phụ thuộcGPU và dễ che lấp lời giới thiệu. Không chọn làm toàn bộ trang; chỉ dùng một phần ở hero/showcase.
3. Trang giới thiệu doanh nghiệp tĩnh: nhẹ nhưng không thể hiện đủ thế mạnh sản phẩm. Không chọn.

## Trình tự nội dung và thiết kế

### 1. Header và hero
Header gọn với logo chính xác, các liên kết Trải nghiệm/Công nghệ/Dành cho ai/TVC, đường tới Về HistAR và Gói trải nghiệm. Có điều hướng mobile, đăng nhập và trạng thái tài khoản thật. CTA chính Khám phá TimeLens; CTA phụ Xem TVC2:38. Giữ các đường đăng nhập hiện có, không tạo flow giả.

Hero đề xuất: “Lịch sử không chỉ để đọc. Hãy bước vào.” Giải thích ngay bên dưới: TimeLens là nền tảng trải nghiệm di sản số của HistAR Team, kết hợp khám phá trên web với tương tác khi tham quan di tích, phục vụ người học, du khách và nhà trường. Một sân khấu không gian số bên cạnh dùng hình Củ Chi thật/tư liệu dự án, các lớp cảnh và đường nét3D tương tác chuột. Nhãn minh hoạ rõ nếu dùng tranh phục dựng. Motion có tiết chế; chữ và CTA không bị cảnh động che.

Số liệu được phép dùng là quy mô nội dung đã kiểm chứng:4mốc lịch sử,5điểm Xưa & Nay ở Củ Chi,10mô hình trong bộ AR chính thức. Không dùng số người dùng, số trường đối tác, mức tăng hiệu quả học tập, doanh thu hay chứng nhận không có bằng chứng.

### 2. TVC giới thiệu/hướng dẫn
Khối video lớn xuất hiện sớm ngay sau phần mở đầu, poster trích đúng TVC, có tiêu đề và mô tả rõ. Bấm chủ động mới tải/phát, không autoplay có tiếng, không kéo cả video về khi mới mở landing. Có loading, lỗi/thử lại, toàn màn hình và phụ đề/chú thích tĩnh hỗ trợ hiểu nội dung xung quanh video. Không tạo phụ đề lời thoại nếu chưa đối chiếu bản gốc.

Nguồn: C:/Users/PC/Downloads/TVC TIMELENS FULL.mp4;206188168bytes;158.08giây;2560x1440/30fps;HEVC hvc1, AAC stereo. SHA256 69F79066A92445C5C69027DD37EE21CB9A937CBE64411A6A9EA872CEBE510C38.

Tạo bản H.264/AAC phục vụ web: giữ lựa chọn1440p chất lượng cao và có1080p nhẹ hơn, faststart, không sửa file gốc. Chọn bản mặc định phù hợp thiết bị, cho đổi chất lượng nếu cần. Không gắn URL Downloads hoặc dùng HEVC làm nguồn duy nhất. Ẩn nút download theo quy ước video của dự án. File có phiên bản trong public/films, được Git LFS quản lý; mở rộng manifest kiểm tra size/hash/MP4 và phục hồi LFS trong prebuild để không lặp lỗi production trả pointer134bytes. Xác minh phát/tua/byte-range thực tế ở bản build; chưa tuyên bố production thành công trước khi deploy và kiểm tra.

### 3. Cửa sổ trải nghiệm sản phẩm
Một showcase lớn với các tab/điểm chọn có ảnh hoặc preview thực tế thay đổi theo lựa chọn và CTA tới đúng route:
- Cổng Thời Gian:4chương1948/1968/1975/Hiện nay; kể chuyện, câu đố; Xưa & Nay ở5điểm. Nêu đúng sự khác biệt giữa tranh tái hiện và ảnh hiện trạng.
- Tái hiện lịch sử: sa bàn tương tác và phim3D Củ Chi11:03, có chọn chất lượng/tiếp tục xem.
- Tham quan360°: kéo xoay, quan sát không gian, khám phá điểm tương tác.
- AR và bảo tàng3D: xem/xoay mô hình trên web, nhận diện ảnh mục tiêu để đặt mô hình qua camera, có hướng dẫn QR/ảnh mẫu. Không nói camera tự nhận diện mọi cổ vật thật.
- Trợ lý lịch sử AI: đặt câu hỏi theo ngữ cảnh lịch sử; có hiển thị nguồn khi luồng/tài khoản hỗ trợ. Không hứa AI luôn đúng hoặc luôn có trích dẫn.
- Nhiệm vụ và hành trình: trạm khám phá, câu đố, điểm thưởng/huy hiệu, bộ sưu tập, nhóm/biệt đội, bảng xếp hạng và chia sẻ hành trình.
Các quyền tài khoản/Premium được tôn trọng; CTA không hứa mọi nội dung miễn phí.

### 4. Hai cách khám phá, một hành trình
Từ xa: mở web → chọn di tích/tính năng → xem, tìm hiểu, đặt câu hỏi. Tại di tích: mở trên điện thoại → cho phép quyền phù hợp khi cần → làm theo QR/trạm/ảnh mục tiêu → lưu hành trình. Phân biệt check-inQR/GPS với image-trackingAR; không nói GPS hoạt động định vị dưới lòng đất. Web dùng được cho các trải nghiệm được hỗ trợ; cameraAR cầnHTTPS và thiết bị tương thích. Không hứa toàn bộ tính năng hoạt độngoffline hoặc mọi thiết bị đều hỗ trợAR.

### 5. Hậu trường công nghệ và mỹ thuật số
Một khu vực navy tương phản có sơ đồ/lớp công nghệ tương tác, thông tin thứ cấp mở theo lựa chọn:
- React/TypeScript và hệ thống giao diện responsive; chuyển độngCSS/RAF và tải theo nhu cầu.
- Three.js/WebGL, mô hìnhGLB, khung cảnh3D và thể hiện chuyển động/ánh sáng.
- MindAR/A-Frame: nhận diện ảnh mục tiêu bằng camera, định vị mô hình theo ảnh.
- Panorama360°, compositing/tranh tái hiện, ảnh thực địa và thiết kế âm thanh/kể chuyện.
- AI theo ngữ cảnh; backend có các tuyến phục vụ tri thức/RAG và kiểm soát nguồn, mức khả dụng phụ thuộc cấu hình. Không quảng cáo mọi tuyến RAG/pgvector đang bật vì application.yml mặc định RAG_ENABLED=false.
- Nền tảng Spring Boot/PostgreSQL phục vụ tài khoản, nội dung, hành trình, nhiệm vụ, tổ chức/lớp học và thống kê. Không công khai khóa, endpoint nội bộ, thông tin đăng nhập hoặc topology hạ tầng nhạy cảm.
Chỉ liệt kê công nghệ có trong code, trình bày ý nghĩa với người dùng trước tên công nghệ. Không tự đặt chứng nhận hoặc tuyên bố kiến trúc độc quyền6tầng.

### 6. Trải nghiệm trọng tâm Củ Chi và bản đồ di tích
Củ Chi là showcase/pilot cụ thể: ảnh thật, các lối tới tour360, thời gian, sa bàn/phim, AR. Danh mục di tích quốc gia lấy từ nguồn chuẩn heritageSites; tách rõ danh mục giới thiệu với nơi đã có đầy đủ gói trải nghiệm. Bản đồ/chức năng nặng chỉ tải khi người dùng mở hoặc gần vùng hiển thị; không tải thư viện bản đồ/3D cho toàn trang ngay lúc đầu.

### 7. Người dùng và đội ngũ
Ba nhóm nhu cầu: người học/du khách, giáo viên/nhà trường, đơn vị quản lý di tích. Mô tả lợi ích gắn với chức năng hiện có; đường tới gói phù hợp thay cho tự bịa giá. Hiển thị HistAR Team và các năng lực sản phẩm/thiết kế/đồ họa3D/lập trình/vận hành theo AboutPage; có liên kết Về HistAR để xem đội ngũ, không tự thêm khách hàng/đối tác, giải thưởng hay nguồn lực chưa xác minh. Giữ các kênh liên hệ công khai của dự án.

### 8. FAQ, CTA cuối và footer
FAQ: TimeLens là gì? Có cần càiapp? Có phải đến Củ Chi mới dùng được? WebAR cần gì? Phần nào cần tài khoản/gói? Ảnh tái hiện khác ảnh tư liệu thế nào? Thuyết minh tự động có yêu cầu gì? Nội dung ở di tích khác đã đầy đủ chưa? Trả lời ngắn, rõ và đúng các giới hạn trên. Kết thúc bằng CTA khám phá và xemTVC, liên kết gói/Về HistAR/liên hệ thật.

## Motion, chất lượng và hiệu năng
Có hiệu ứng xuất hiện theo cuộn, trình diễn lớp cảnh, chuyển tab, điểm nhấn vàng, chiều sâu theo con trỏ và cảnh3D nhỏ tải muộn khi đủ điều kiện. Không dùng nhiều video autoplay, không chặn cuộn, không ép mở camera, không thêm loader dài để phô diễn. Reduced-motion có bản tĩnh; WebGL thất bại vẫn có ảnh thay thế. Tắt vòng render khi tab ẩn hoặc cảnh ngoài viewport; giới hạnDPR và tải trên mobile. Mọi CTA, tab, menu, video dùng được bằng bàn phím, có focus rõ; chữ tiếng Việt đọc được trên390px. Giữ style tách riêng landing, không thay đổi các tính năng đang phát triển khác.

## Nguồn đối chiếu
- FE/src/routes/AppRoutes.tsx: route công khai/protected, giáo viên/admin, cá nhân/nhóm.
- FE/src/features/time-portal/availability.ts, eraLabels.ts, timeline/storyData.ts, xuaNay/xuaNayData.ts: Củ Chi,4chương,5cặp cảnh.
- FE/src/features/ar/ar-catalog.json và docs/ar-center.md:10mô hình, ảnh mục tiêu, giới hạn/nguồn minh hoạ.
- FE/src/features/history/HistoryFilm.tsx, docs/history-film-deployment.md: phim11:03, nguồn và pipelineLFS.
- FE/src/shared/config/heritageSites.ts: danh mục và vị trí di tích.
- FE/src/pages/AboutPage.tsx:6thành viên và vai trò; cần diễn đạt năng lực thay cho thêm số liệu kinh doanh.
- FE/src/shared/access/contentAccess.ts: quyền cơ bản/Premium và tổ chức.
- BE/src/main/resources/application.yml, chat/service/impl/ChatServiceImpl.java, lms/controller/: cấu hìnhAI/RAG và tính năng lớp học.
- TVC nguồn như thông số đã ghi; tham chiếu tương thích codec: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs .

## Điều kiện nghiệm thu
Build/lint/TypeScript đạt; không có linkgiả, số liệu bịa hoặc mediaDownloads trong URL phát. Kiểm thử khách/tài khoản, CTA/tab/mobilemenu, TVC tải muộn/phát/tua/đổi chất lượng/lỗi/phímEscape nếumodal;4kích thước390/768/1280/1920, không tràn ngang; reduced-motion/WebGLfallback. Kiểm tra poster đúngTVC, MP4thật/size/hash/range; nếu có pushproduction phải xác minh publicbytes/phát thật thay vì chỉstatus206. Chụp ảnh từng phần để đánh giá độ cân đối và khả năng đọc, báo rõ điều gì chỉ kiểm tra mô phỏng.
