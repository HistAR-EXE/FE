# Điều chỉnh sidebar và menu tài khoản — 2026-10-22

- Logo và toàn bộ khối thương hiệu TimeLens là Link tới / (trang chủ giới thiệu), áp dụng desktop mở rộng/thu gọn và tablet; giữ nguyên tỷ lệ ảnh, slogan một dòng, focus rõ khi dùng bàn phím.
- Tên rõ chức năng hơn: Khám phá di tích; Tham quan360°; Tái hiện lịch sử; Cổng Thời Gian; Trợ lý lịch sử AI; Trải nghiệm AR; Nhiệm vụ; Bảo tàng3D; Bảng xếp hạng. Mobile giữ nhãn ngắn, đổi Cổ vật thành Bảo tàng để khớp trang BẢO TÀNG SỐ3D. Không thay URL, quyền hay trạng thái active.
- Menu tài khoản384px, hai cột, link40px, thông tin gọn ở đầu, logout ở cuối. Bỏ maxHeight34rem và overflow-y-auto gây cuộn ngay cả trên desktop. Giữ mọi link cá nhân/role và hoạt động Escape, ngoài menu, focus, navigation, logout. Email/tên dài có title đầy đủ.
- Kiểm thử node scripts/sidenav-account-smoke.mjs: đỏ trước sửa do logo không có href; xanh sau sửa. Menu không tràn/nằm ngoài viewport ở520/600/720/900px; nav vẫn fit; Profile/Settings hoạt động; logo thực sự tới /; logout xóa token. Expanded/collapsed/tablet/short layouts đạt. TypeScript và ESLint vùng thay đổi đạt.
- Screenshot test-results/sidenav-account-expanded.png, sidenav-account-collapsed.png, sidenav-account-tablet.png, sidenav-account-short.png.
