# Nâng cấp Cổng Thời Gian — bản thiết kế đề xuất

Ngày: 2026-10-22. Trạng thái: đã được người dùng duyệt, triển khai với nhạc mới do người dùng cung cấp.

## Phạm vi
Trang /time-portal/dia-dao-cu-chi, trọng tâm chế độ dòng thời gian. Giữ nội dung lịch sử, ảnh, khóa Premium, quiz, tiến độ nhiệm vụ và các lối mở Xưa & Nay/3D. Không thay đổi API hay dữ liệu lịch sử.

## Giao diện
Hướng đề xuất: triển lãm lịch sử sáng, nền xanh rất nhạt, thẻ trắng, chữ xanh navy, điểm nhấn vàng và xanh TimeLens. Bỏ lớp phủ đen trên vùng đọc; giữ ảnh tư liệu nguyên vẹn, không làm sáng/chỉnh sai màu tư liệu. Tiêu đề Cổng Thời Gian và phụ đề hành trình; khối năm/chương rõ ràng. Desktop chia nội dung kể chuyện, ảnh lớn và số liệu; tablet rút bảng số liệu; mobile xếp dọc, nội dung có thể cuộn, không cắt điều khiển. Thanh bốn chương nổi bật chương hiện tại bằng vàng thống nhất. Điều khiển âm thanh có nhãn, trạng thái và focus rõ.

## Âm thanh và lời dẫn
Sử dụng file Downloads/paulyudin-war-epic-182501.mp3, sao chép vào /audio/time-portal/war-epic-v1.mp3 có sẵn trong dự án làm nhạc nền sử thi, không thêm hiệu ứng súng/bom. Phát vòng lặp nhẹ, vào/ra âm lượng từ từ. Giọng đọc được ưu tiên; tự giảm nhạc khi đang đọc và khôi phục khi đọc xong. Có bật/tắt riêng nhạc và lời đọc, âm lượng nhạc, đọc lại, tạm dừng và trạng thái thuyết minh; lưu lựa chọn người dùng trên thiết bị.

Bật thuyết minh mặc định cho người chưa đặt lựa chọn. Lần đầu có lời chào ngắn giới thiệu Cổng Thời Gian, sau đó đọc tên chương, ngày tháng, tiêu đề, nội dung và phần Bạn có biết. Khi đổi khoảnh khắc hủy lời đọc cũ trước khi đọc mới; chờ đọc xong rồi mới chuyển nội dung, không chồng giọng. Quiz chỉ đọc câu hỏi; chờ người dùng trả lời.

Dùng giọng vi-VN qua Web Speech hiện có, đợi voiceschanged để không bỏ lỡ giọng tải chậm. Nếu thiết bị không có giọng Việt, thông báo ngay và tiếp tục hiển thị nội dung/nhạc, không đọc bằng giọng ngôn ngữ khác. Không hứa giọng máy có cảm xúc như nghệ sĩ thuyết minh.

Cố gắng tự phát khi vào trang. Nếu trình duyệt chặn autoplay, hiển thị dải gọn thông báo và nút Bắt đầu trải nghiệm âm thanh; có thể tiếp tục từ tương tác hợp lệ đầu tiên với trang. Không yêu cầu người dùng bật lại ở từng thẻ. Không lách chính sách trình duyệt.

Dừng tiếng khi rời trang hoặc chuyển Xưa & Nay/3D. Khi ẩn tab, mở ảnh lớn hay tạm dừng thì ngừng lời và nhạc, đồng bộ với đồng hồ chuyển thẻ. Hover chỉ hỗ trợ đọc nội dung, không làm khởi động lại lời đọc liên tục. Chuyển chương nhanh không để callback cũ chuyển nhầm thẻ.

## Phương án thay thế
1. Đề xuất: giọng Việt trình duyệt + nhạc sẵn có. Không có phí API, triển khai gọn; chất giọng phụ thuộc thiết bị.
2. Thu âm/TTS dựng sẵn cho từng khoảnh khắc. Giọng nhất quán hơn nhưng cần nguồn giọng, media và quy trình dựng lại khi sửa nội dung. Có thể bổ sung sau.
3. Chỉ đổi giao diện và giữ nút nghe thủ công. Ít thay đổi nhưng không đáp ứng trải nghiệm tự thuyết minh yêu cầu.

## Kiểm chứng
Kiểm thử lời đọc với giọng nạp chậm, autoplay bị chặn, bật/tắt, chuyển thẻ/chương nhanh, hết lời mới chuyển, ẩn tab và unmount. Kiểm thử nhạc bị lỗi vẫn đọc được, giảm nhạc khi đọc. Chạy lint, TypeScript/build, kiểm tra desktop/mobile và không tràn ngang. TTS giả lập dùng kiểm tra logic; nghe giọng Việt thật riêng trên thiết bị có hỗ trợ, không coi mock là bằng chứng chất giọng.


## Thay đổi đã được người dùng duyệt tiếp theo
Bỏ toolbar và khả năng tắt nhạc/lời đọc trong UI; luôn bật khi mở trang, không sử dụng preferences mute cũ. Bỏ nút pause của story; tạm ngừng do ẩn tab, modal, chuyển chế độ/rời trang vẫn giữ. Mốc vào trang mặc định1948; vẫn tôn trọng URL có năm hợp lệ và các khóa Premium hiện có. Đây là yêu cầu mới thay thế phần điều khiển/lưu tùy chọn ở thiết kế ban đầu.
