// src/pages/PrivacyPage.tsx
export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f1015] text-white px-6 py-12 max-w-3xl mx-auto font-sans leading-relaxed">
      <h1 className="text-3xl font-black mb-2">Chính sách quyền riêng tư</h1>
      <p className="text-sm text-gray-400 mb-8">TimeLens (HistAR) · Cập nhật: 2026-07-22</p>
      <section className="space-y-4 text-sm text-gray-200">
        <p>
          Ứng dụng TimeLens thu thập và xử lý dữ liệu để cung cấp trải nghiệm khám phá di sản (tài khoản,
          nhiệm vụ, check-in, chat AI, thanh toán).
        </p>
        <h2 className="text-lg font-bold text-[#fdb438] pt-2">Dữ liệu chúng tôi thu thập</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Email, tên hiển thị, mật khẩu (đã băm) khi đăng ký.</li>
          <li>Vị trí gần đúng khi bạn chủ động check-in GPS tại di tích.</li>
          <li>Ảnh / camera khi bạn quét QR hoặc dùng khung ảnh (chỉ khi bạn cấp quyền).</li>
          <li>Nhật ký tương tác (discovery, quest) để tính XP và mở khóa nội dung.</li>
          <li>Thông tin thanh toán qua đối tác SePay (không lưu số thẻ trên server HistAR).</li>
        </ul>
        <h2 className="text-lg font-bold text-[#fdb438] pt-2">Mục đích</h2>
        <p>Vận hành dịch vụ, bảo mật tài khoản, cải thiện sản phẩm, tuân thủ pháp luật.</p>
        <h2 className="text-lg font-bold text-[#fdb438] pt-2">Liên hệ</h2>
        <p>Email hỗ trợ: support@histar.vn (thay bằng email đội ngũ khi publish store).</p>
      </section>
    </div>
  )
}
