# AR tại nhà: hướng dẫn và email ảnh đang chọn

Đã thực hiện theo thiết kế người dùng duyệt: giải thích QR/ảnh nhận diện, tải ảnh, phân biệt webcam/điện thoại, nhận ảnh đang chọn qua email. Giao diện giữ phong cách hiện tại.

## Cách dùng

- Laptop: chọn hiện vật → AR tại nhà. Giữ ảnh màu trên màn hình, dùng điện thoại quét QR để mở trang tương ứng, chọn Bật camera AR, rồi quét ảnh màu trên laptop. QR chỉ điều hướng; ảnh màu mới làm hiện mô hình.
- Tải ảnh nhận diện lưu bản web màu đầy đủ khung hình, dung lượng vừa phải. Mở ảnh gốc vẫn cho bản chụp không sửa. Mở ảnh lớn / In ảnh giữ ảnh màu và chiều đúng.
- Dùng camera trên laptop? mở hướng dẫn webcam: cần bản in hoặc ảnh mở trên điện thoại đưa trước webcam. Chọn Dùng webcam laptop rồi Bật camera AR; trang không tự xin camera khi chỉ mở hướng dẫn.
- Điện thoại: có nút Bắt đầu quét AR và nhắc chuẩn bị ảnh trên màn hình khác hoặc bản in. Không thể tự quét ảnh trên màn hình của chính thiết bị.
- Nhận ảnh qua email là lựa chọn phụ: chọn hiện vật → mở Nhận ảnh qua email → bấm Gửi ảnh [tên hiện vật] vào email. Thư chỉ chứa 01 ảnh màu nhận diện của hiện vật đang chọn, tên hiện vật và liên kết tải/in/mở đúng camera AR. Không gửi ảnh của chín hiện vật còn lại. Cần đăng nhập và xác minh email.

## Backend và triển khai

- API có xác thực: GET /api/ar/cards/email/status và POST /api/ar/cards/email với body duy nhất `{requestId: UUID, artifactId: "lamp"}`. Người nhận lấy từ tài khoản đã xác minh; không nhận email tùy ý, link từ client hay file upload.
- Migration: V89__ar_card_mail_attempts.sql và V90__ar_card_mail_artifact.sql trong BE/src/main/resources/db/migration. V90 thêm artifact_id, giữ NULL cho thư bộ thẻ lịch sử; không gán lịch sử cũ thành ảnh mới. Request ID đã dùng cho hiện vật khác hoặc thư lịch sử bị từ chối 409 REQUEST_ID_REUSED. Flyway tự áp dụng khi khởi động. Lưu request ID và trạng thái CREATED/ACCEPTED/UNKNOWN để tránh gửi trùng; 60 giây giữa hai yêu cầu, tối đa 3 yêu cầu trong 24 giờ. Không thay đổi XP hoặc check-in.
- Dùng MAIL_PROVIDER và MAIL_FROM hiện có. Bật MAIL_ENABLED và cấu hình provider/địa chỉ gửi hợp lệ trên môi trường triển khai. FRONTEND_URL phải là origin HTTPS công khai của FE; localhost không được gửi link email cho người dùng. HISTAR_AR_CARD_MAIL_ENABLED=false tắt riêng chức năng. Test hooks bật cũng làm email không khả dụng.
- Các provider có phương thức sendHtmlBounded riêng cho ảnh AR (HTTP 20 giây, SMTP giới hạn thời gian kết nối/đọc/ghi). Không thay đổi luồng HTML OTP hiện có. ACCEPTED chỉ xác nhận provider tiếp nhận, không cam kết thư đã đến Inbox.
- Manifest email trong BE/src/main/resources/ar/photo-cards.tsv phải đi cùng catalog FE. Chạy `node scripts/sync-ar-mail-cards.mjs --check` trong FE để đối chiếu; bỏ --check để đồng bộ sau khi đổi catalog. Deploy đồng bộ FE (ảnh/bundle/catalog) và BE (manifest/API/migration).
- Local launcher scripts/start-ar-local.ps1 của BE giữ MAIL_ENABLED=false. Vì vậy localhost vẫn tải/in/quét được; email hiển thị chưa sẵn sàng thay vì báo gửi thành công. Không có email thật nào được tự gửi trong quá trình triển khai/kiểm tra.

## Kiểm tra

- FE: `node --test scripts/ar-experience.test.mjs scripts/ar-viewer-math.test.mjs scripts/ar-runtime.test.mjs`, ESLint các file AR thay đổi, Playwright cấu hình playwright.ar.config.ts và npm run build.
- BE: Maven test cho ArCardMailServiceTest, ArCardMailControllerTest, ArCardHtmlProviderTest và các kiểm tra provider hiện có.
- PostgreSQL: RUN_AR_CARD_POSTGRES_IT=true cùng AR_TEST_DB_URL/AR_TEST_DB_USER/AR_TEST_DB_PASSWORD chạy ArCardMailPostgresTest. Test dùng schema ngẫu nhiên ar_card_test_* rồi tự dọn, không gửi email. Kiểm tra V89/V90, khóa profile khi gửi đồng thời, idempotency, trạng thái UNKNOWN, FK và XP giữ nguyên.
- Camera điện thoại thật và việc thư vào hộp thư production cần được kiểm tra trên HTTPS với cấu hình provider thực, qua thao tác người dùng.

## Kết quả xác minh phiên trước (trước thay đổi gửi một ảnh)

- FE: 20 kiểm tra Node đạt, gồm luồng quay lại AR sau đăng nhập và chặn redirect ngoài site. ESLint các file thay đổi đạt. Build production và PWA đạt; cảnh báo chunk lớn hiện có vẫn còn.
- Trình duyệt: 9 ca chấp nhận đầu đạt (camera controls, 10 ảnh/thẻ, QR/in, thẻ dọc, desktop download/webcam, mobile, guest, accepted, disabled). Sau sửa bộ mô phỏng HTTPS và bổ sung thao tác tạo yêu cầu mới, 4 ca email/HTTPS đạt lại. Kiểm tra riêng mobile 390px đạt, không tràn ngang.
- BE: các kiểm tra service/controller/provider và hồi quy provider SMTP/Brevo/Resend đạt. PostgreSQL integration đạt trên schema ngẫu nhiên đã dọn: migration, khóa profile, gửi đồng thời, idempotency, UNKNOWN, FK và XP.
- Rà soát độc lập phát hiện và đã sửa: cần Qualifier chọn đúng bean emailSender, và cần thao tác tạo request ID mới có xác nhận sau UNKNOWN. Sau kết quả chưa rõ, nút gửi thường bị khóa; người dùng kiểm tra hộp thư, chờ cooldown/quota rồi chọn Tạo yêu cầu mới, sau đó chủ động bấm Gửi. Không tự gửi lại.
- Local thực tế: health 200, đăng nhập demo 200, guest email status 401/no-store, tài khoản xác minh đọc status 200/available=false, gửi local nhận 503 MAIL_UNAVAILABLE. V88 thành công, bảng ar_card_mail_attempts có sẵn và không còn schema test. Không gửi email thật.

Kiểm tra wiring Spring với bốn bean EmailSender đã đạt sau khi bổ sung EntityManagerFactory giả lập cho context test. Backend thực tế khởi động thành công với @Qualifier("emailSender").

## Cập nhật 21/10/2026: email theo hiện vật

GET status thêm unavailableReason: MAIL_DISABLED, FEATURE_DISABLED, TEST_MODE hoặc PUBLIC_URL_REQUIRED; null khi sẵn sàng. POST trả artifactId để FE chỉ thông báo tiếp nhận đúng ảnh đã yêu cầu. Đổi hiện vật sẽ tạo form mới, không giữ thông báo thành công hoặc mã yêu cầu của hiện vật trước. Quota 3 lượt/24 giờ áp dụng chung tài khoản, không phải riêng mỗi hiện vật.

Localhost không tự cấm gửi email: launcher local chủ động đặt MAIL_ENABLED=false. Production cần MAIL_ENABLED=true, provider hoạt động, địa chỉ gửi được xác minh, FRONTEND_URL HTTPS công khai và test hooks tắt. Triển khai lên production tự nó không bảo đảm gửi thành công; phải kiểm tra provider và hộp thư thật. Người dùng luôn tải/in được ảnh khi email bị tắt.

## Xác minh cập nhật gửi một ảnh (21/10/2026)

- FE: 20/20 Node tests đạt; ESLint các component email/home và spec đạt; production build (TypeScript/Vite/PWA) đạt. Cảnh báo chunk lớn hiện có vẫn còn.
- Trình duyệt: đủ 6 ca email đạt sau chạy lại ca guest bị timeout tải trang ở lượt đầu; gồm payload hiện vật, đổi hiện vật, khóa nút/lý do cụ thể, guest, tài khoản xác minh và UNKNOWN không tự gửi lại. Dịch vụ gửi mail được giả lập.
- BE: 8 service tests, 2 controller tests và 1 wiring test đạt; vòng kiểm tra 10 hiện vật xác nhận mỗi HTML chỉ có đúng một ảnh tương ứng. PostgreSQL integration đạt với V89/V90, UUID theo hiện vật, gửi đồng thời, UNKNOWN và dữ liệu hồ sơ.
- Rà soát độc lập không phát hiện lỗi cần sửa trong thay đổi theo hiện vật.
- Local thực tế: đăng nhập demo 200; email status available=false/unavailableReason=MAIL_DISABLED; POST lamp nhận 503; guest status 401. Flyway V89 thành công, cột artifact_id tồn tại, schema test đã dọn hết. Không gửi email thật; chưa xác minh hộp thư production.

## Tích hợp master của nhóm — 21/10/2026

V88__repair_vietnamese_content.sql là migration dữ liệu tiếng Việt của đồng đội và được giữ nguyên. Các migration AR phát hành chính thức là V89__ar_card_mail_attempts.sql và V90__ar_card_mail_artifact.sql. Các số V88/V89 trong kết quả thử nghiệm lịch sử phía trên là phiên bản local chưa phát hành, không áp dụng cho production. Database cũ timelens_ar_local được giữ; launcher BE dùng database mới timelens_ar_release có chuỗi migration chính thức.

Production mặc định bật Flyway để tạo bảng trước khi Hibernate validate. Nếu Render đang đặt riêng FLYWAY_ENABLED=false, cần bật lại hoặc chạy migration đầy đủ đến V90 trước khi khởi động bản mới. Không sửa checksum/lịch sử Flyway của database dùng chung để khớp các số local cũ.

ScanPage giữ UI AR và thay đổi mới của nhóm: gói Lite là tùy chọn, không hiện confirm chặn quét QR; luồng check-in/QR, lưu offline và mini-game vẫn theo máy chủ. Cache gói offline của nhóm giữ histar-media-v2.

Thông tin 3D lấy từ đúng bản ghi catalog theo hiện vật, không suy đoán Đèn pin là Đèn dầu theo tên. Hiển thị tác giả, nguồn Sketchfab, giấy phép và giới hạn mô hình minh họa.
