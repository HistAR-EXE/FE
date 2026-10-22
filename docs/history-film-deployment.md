# Phim Củ Chi — vận hành

- Mục điều hướng: Tái hiện lịch sử. Giữ URL /diorama/:locationId.
- File tĩnh: FE/public/films/cu-chi-v1.mp4 (64,691,040 bytes). SHA256 C7DE7DB8E5BEE59063E852961DF4D88FDC8C10A2615777A20F70E2ACF0A315BF. Giữ nguyên bản nguồn, không mã hóa lại; moov trước mdat hỗ trợ fast start.
- Bản build chứa phim và chạy ngay khi host hỗ trợ MP4/HTTP Range. Không có autoplay, không precache phim, không cache video qua service worker.
- Để dùng R2/CDN: upload file với Content-Type video/mp4, Cache-Control public,max-age=31536000,immutable; dùng tên có phiên bản. Đặt VITE_CU_CHI_FILM_URL cho file 1080p và VITE_CU_CHI_FILM_720_URL cho file 720p, dùng URL HTTPS rồi build/deploy frontend. URL phải trả MP4 thật, hỗ trợ Range: bytes=0-1023 với HTTP 206, Content-Range và 1024 bytes. Nếu nguồn khác origin, cấu hình quyền phân phối phù hợp. Không đặt khóa R2 trong biến VITE_.
- Phim không đi qua API backend. Cần xác minh thực tế byte-range ở host/CDN sau khi deploy; cấu hình ứng dụng không thay thế kiểm tra hạ tầng.
- Vị trí xem lưu trên thiết bị, không đồng bộ tài khoản; 5 giây cuối được coi là đã xem xong để lần mở sau phát lại từ đầu. Tạm dừng khi chuyển ứng dụng/tab.
- Không có chuyển chất lượng tự động ở bản MP4 này. Nếu cần mạng yếu, chuẩn bị HLS 720p/480p/360p và tích hợp player HLS trong đợt riêng. Theo yêu cầu nâng cấp tiếp theo, đã bổ sung bản upscale 1080p và chọn chất lượng thủ công; xem history-film-upscale.md. Nguồn vẫn là 720p.
- Kiểm tra: node --experimental-strip-types --test scripts/history-film.test.mjs; npm run build; npx eslint src/pages/BattleDioramaPage.tsx src/features/history src/components/layout/SideNav.tsx vite.config.ts.

## Kết quả kiểm tra 2026-10-21
- Unit test tiến độ xem: pass.
- ESLint các file thay đổi và TypeScript: pass.
- Production build (Vite + PWA): pass; có cảnh báo chunk lớn sẵn có của ứng dụng.
- Edge headless trên bản production với profile/API giả lập: mở màn hình chọn, chuyển sa bàn rồi quay lại không còn audio; chưa bấm xem không yêu cầu MP4; phát thật 1280x720 với duration 663.021179; tua tới 120 giây và mở lại tiếp tục đúng vị trí; rời phim tháo video; HTTP Range trả 206 và đúng 1024 bytes; viewport 390x844 không tràn ngang.
- Rà soát độc lập: không phát hiện lỗi quan trọng.
- Chưa upload lên R2, chưa publish website production. Kiểm tra CDN thực tế và mạng di động vẫn cần thực hiện trên bản triển khai công khai.


## Lấy media khi clone repo
Hai file MP4 được lưu bằng Git LFS (bản1080p lớn hơn giới hạn Git thường). Cài Git LFS rồi chạy `git lfs install` và `git lfs pull` trong FE. GitHub Actions checkout đã bật `lfs: true`; không dùng file pointer văn bản làm video. File PNG poster vẫn nằm trong Git thường.

Trước khi deploy công khai, upload hai MP4 lên R2/CDN và cấu hình hai URL VITE_ tương ứng. Git LFS lưu bản nguồn cho nhóm, không thay thế CDN phân phối video. Host không hỗ trợ file327MB cần dùng CDN. Các kiểm thử trình duyệt local dùng Edge và demo account đã seed; không tự chạy các script local này trên production.

## Sửa production 2026-10-22
Production đã trả HTTP206 nhưng body là Git LFS pointer (134 bytes cho1080p,133 bytes cho720p), không phải MP4. Không coi status206 hoặc Content-Type là đủ để xác nhận media.

`npm run build` giờ chạy `scripts/verify-film-assets.mjs`: kiểm tra ftyp, kích thước chính xác và SHA256 cho cả hai bản. Trên Vercel, nếu checkout chỉ có pointer, script tải bản LFS từ media.githubusercontent.com của repo HistAR-EXE/FE tại đúng VERCEL_GIT_COMMIT_SHA, xác minh file tạm rồi mới thay pointer. Nếu tải hoặc xác minh lỗi, build dừng; không xuất bản pointer. Không có token trong frontend, không phát trực tiếp qua GitHub. Bật Git LFS trong Vercel Project Settings > Git vẫn là tùy chọn tối ưu để checkout có sẵn media.

Đường dẫn mới để tránh cache immutable của pointer cũ:
- /films/cu-chi-1080p-v3.mp4:327231485 bytes, SHA256 E2DEB168530B90F8AF87F863F2B7FCF0F05B2F5357E602DD9F2117186A4F6D35.
- /films/cu-chi-v2.mp4:64691040 bytes, SHA256 C7DE7DB8E5BEE59063E852961DF4D88FDC8C10A2615777A20F70E2ACF0A315BF.

Nếu có biến VITE_CU_CHI_FILM_URL/VITE_CU_CHI_FILM_720_URL ghi đè, cần cập nhật URL đó cho phù hợp. Sau deploy cần kiểm tra Range0-1023 trả1024bytes, ftyp tại offset4, Content-Range chứa đúng tổng kích thước; kiểm tra phát, tua và chuyển chất lượng trên production. Không cache MP4 trong service worker.
