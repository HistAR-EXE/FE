# Runbook: chuyến tham quan trường — tạo, xác nhận, tham gia, báo cáo

English summary: a teacher plans a visit, the site manager confirms the schedule, learners join with one shared device or their own, and the teacher closes a frozen group report. The site never sees student email, name, or photo. There is no payment and no ticketing.

Workspace: teacher `/teacher/trips`. Site `/site-workspace`, tab **Vận hành**, khối **Chuyến đi**. Learner `/trip/join/{code}`.

## 1. Giáo viên tạo chuyến

Đăng nhập tài khoản `TEACHER` thuộc một tổ chức. Mở `/teacher/trips`.

1. Chọn tổ chức, nhập mã di tích (ví dụ `cu-chi`), tiêu đề, giờ đến, giờ về.
2. Dán mã nhiệm vụ và mã chiến dịch đã có. Màn này không mở trình tạo nhiệm vụ.
3. Bấm **Tạo chuyến**.

Chuyến mới là **Nháp**. Sửa tiêu đề, di tích, khung giờ, mã nhiệm vụ và mã chiến dịch rồi bấm **Lưu thay đổi** khi còn nháp.

## 2. Nhóm: cá nhân hoặc một thiết bị

Trên chi tiết chuyến, khi chuyến chưa bắt đầu:

- **Cá nhân**: mỗi học sinh tự tham gia và có một dòng tiến độ.
- **Một thiết bị**: cả nhóm dùng một máy. Bắt buộc **Sĩ số dự kiến**. Live board và báo cáo dùng sĩ số này, không đếm từng email.

Bấm **Tạo nhóm**. Có thể tạo nhiều nhóm trước khi chuyến bắt đầu.

## 3. Liên kết và QR

Khối **Mã tham gia** hiện URL `/trip/join/{code}` và mã QR. **Sao chép liên kết** đưa cho lớp. QR chỉ chứa mã tham gia, không chứa email hay ảnh học sinh.

## 4. Gửi xác nhận, bắt đầu, theo dõi, kết thúc

1. Bấm **Gửi xác nhận di tích** khi di tích yêu cầu xác nhận. Trạng thái thành **Chờ di tích xác nhận**. **Bắt đầu chuyến** ẩn cho đến khi di tích xác nhận.
2. Sau khi di tích xác nhận, bấm **Bắt đầu chuyến**.
3. Mở **Live board**. Bảng chỉ của chuyến đang chọn. Nhóm một thiết bị hiện tên nhóm, nhãn **Một thiết bị**, sĩ số dự kiến, số trạm và điểm. Check-in của chuyến khác không cộng vào bảng này.
4. Bấm **Kết thúc chuyến**, rồi mở **Báo cáo**.
5. **Tải CSV** hoặc **In / Lưu PDF**. Bản in ẩn điều hướng. Số liệu nhóm trên báo cáo là ảnh chụp lúc kết thúc. Check-in sau đó không đổi báo cáo.

## 5. Di tích xác nhận hoặc từ chối

Quản lý di tích (`SITE_MANAGER`) mở `/site-workspace`, tab **Vận hành**, khối **Chuyến đi**.

Danh sách là lịch: tiêu đề, khung giờ, trạng thái, trạng thái xác nhận, số nhóm, và `rowVersion` để xác nhận/từ chối. Không có email, tên, hay ảnh học sinh.

- **Xác nhận** gọi `POST /api/site-workspaces/{siteCode}/field-trips/{tripId}/confirm` với `{ "rowVersion": <số trên dòng> }`.
- **Từ chối** cần ghi chú, gọi `POST .../decline` với `{ "rowVersion": <số>, "note": "..." }`. Chuyến về nháp, xác nhận là **Di tích từ chối**, và **Bắt đầu chuyến** vẫn ẩn.

Biên tập viên và người duyệt không thấy hai nút này. Nếu dòng lịch không có `rowVersion`, nút cũng không hiện: API xác nhận bắt buộc đúng phiên bản, và gọi sai phiên bản sẽ bị từ chối.

## 6. Học sinh tham gia

Mở `/trip/join/{code}`, chọn nhóm, bấm **Tham gia nhóm**.

Không vào được nhóm khi trang báo:

- `Chuyến đi đã bị hủy`
- `Chuyến đi đã kết thúc`
- `Chuyến đi đã hết hạn` (đã qua giờ về)

Sau khi vào nhóm một thiết bị, học sinh quét trạm trên `/scan` (ví dụ QR tĩnh `cu-chi:ST01:0:...`). Điểm và trạm chỉ cộng vào chuyến của nhóm đó.

## 7. Hủy chuyến

Giáo viên bấm **Hủy chuyến** khi chuyến còn nháp, đang chờ di tích, hoặc đã xác nhận nhưng chưa bắt đầu. Trạng thái thành **Đã hủy**. Không hủy chuyến đang diễn ra hoặc đã kết thúc từ nút này. Học sinh mở link cũ sẽ thấy chuyến đã bị hủy.

## Riêng tư

- Site list và khối **Chuyến đi** không nhận và không vẽ email, tên, hay ảnh học sinh.
- Báo cáo nhóm không có cột email hay ảnh. CSV cùng nội dung bảng đó.
- Không có thanh toán, không có bán vé, không có mã vé.

## Gate 2

- [ ] Giáo viên tạo chuyến `cu-chi` với mã nhiệm vụ và chiến dịch có sẵn.
- [ ] Có nhóm **Một thiết bị** với sĩ số dự kiến, link `/trip/join/{code}` và QR.
- [ ] **Gửi xác nhận di tích** chuyển chuyến sang chờ xác nhận.
- [ ] Quản lý di tích xác nhận trên tab **Vận hành**. JSON lịch không có `@`, email, hay ảnh.
- [ ] Học sinh vào đúng nhóm. Giáo viên bắt đầu chuyến.
- [ ] Check-in ST01 làm live board của chuyến đó có sĩ số dự kiến và trạm/điểm lớn hơn 0. Chuyến kia trên cùng di tích vẫn 0.
- [ ] **Kết thúc chuyến**. Báo cáo giữ số đã đóng băng sau một check-in muộn.
- [ ] Hủy được chuyến nháp. Từ chối sau khi gửi xác nhận thì **Bắt đầu chuyến** không hiện.
