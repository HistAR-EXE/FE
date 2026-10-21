# Nâng cấp phim Củ Chi lên Full HD

Bản nguồn: Reels_Dia-dao-Cu-Chi_Media.mp4 (1280x720, ~29.97fps, 663 giây). File resized 443 MB trong Downloads cũng chỉ 720p, không phải bản gốc Full HD.

Đầu ra: public/films/cu-chi-1080p-v2.mp4. Đây là bản upscale từ 720p, không phải bản dựng gốc Full HD và không dùng AI sinh thêm chi tiết lịch sử. Lanczos 1920x1080, unsharp luma 0.25, giữ màu/tỉ lệ/khung hình và sao chép nguyên audio AAC. H.264 Intel Quick Sync, preset slow, global_quality 18; MP4 +faststart cho streaming.

Trình phát mặc định 1080p, có lựa chọn 720p nhẹ hơn. Khi đổi chất lượng, giữ vị trí và trạng thái phát/tạm dừng. URL CDN: VITE_CU_CHI_FILM_URL cho 1080p; VITE_CU_CHI_FILM_720_URL cho 720p. Đây là chọn chất lượng thủ công, không phải HLS thích ứng tự động.

Công cụ FFmpeg 7.1 qua imageio-ffmpeg được cài cục bộ vào .video-tools ngoài repo frontend. Log tiến độ trong .video-work. Không thay đổi bản nguồn trong Downloads. Bản Full HD lớn hơn nguồn, cần CDN đủ băng thông; file >100 MB được lưu bằng Git LFS; upload R2 và cấu hình URL khi phát hành. Hiện vẫn giữ file local để chạy và kiểm tra đầy đủ.

## Kết quả thực tế
- Full HD 1920x1080, 663.021 giây, 327,231,485 bytes (~327 MB), khoảng 3.95 Mbps. Metadata MP4 nằm đầu file.
- FFmpeg giải mã toàn bộ video/audio với -xerror: exit 0, không có lỗi.
- Audio stream SHA256 nguồn và đầu ra trùng nhau: a0682e8696696a5ffbd6b756ad8caadfa22a5326f43692671e600ca001c66727.
- SHA256 file đầu ra và file trong dist trùng nhau: E2DEB168530B90F8AF87F863F2B7FCF0F05B2F5357E602DD9F2117186A4F6D35.
- Unit tests: 2 pass. ESLint, TypeScript, production build: pass.
- Edge production: phát thật 1920x1080; chuyển 720p và trở lại1080p giữ vị trí; đổi chất lượng trước metadata vẫn giữ tiến độ137s; xem lại từ đầu trong lúc tải bản mới hoạt động; HTTP206, lazy download, unmount và mobile overflow: pass.
- Rà soát mã độc lập: các lỗi chuyển chất lượng đã sửa; không còn phát hiện quan trọng.
- Chưa upload CDN/publish production. Cần dùng R2/CDN cho bản Full HD lớn này khi phát hành công khai thay vì đưa vào Git thông thường.
