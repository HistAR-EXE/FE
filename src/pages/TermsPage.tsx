// src/pages/TermsPage.tsx
export function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f1015] text-white px-6 py-12 max-w-3xl mx-auto font-sans leading-relaxed">
      <h1 className="text-3xl font-black mb-2">Điều khoản sử dụng</h1>
      <p className="text-sm text-gray-400 mb-8">TimeLens (HistAR) · Cập nhật: 2026-07-22</p>
      <section className="space-y-4 text-sm text-gray-200">
        <p>
          Bằng việc sử dụng TimeLens (web hoặc ứng dụng mobile), bạn đồng ý tuân thủ các điều khoản này và
          chính sách quyền riêng tư.
        </p>
        <h2 className="text-lg font-bold text-[#fdb438] pt-2">Dịch vụ</h2>
        <p>
          TimeLens cung cấp trải nghiệm số hóa di sản (Tour 360°, Time Portal, quest, chat AI, thanh toán
          Premium). Nội dung mang tính giáo dục; không thay thế tư vấn chuyên môn.
        </p>
        <h2 className="text-lg font-bold text-[#fdb438] pt-2">Tài khoản</h2>
        <p>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và hoạt động dưới tài khoản của mình.</p>
        <h2 className="text-lg font-bold text-[#fdb438] pt-2">Thanh toán</h2>
        <p>Gói Premium / license trường được xử lý qua SePay. Hoàn tiền theo chính sách công bố tại thời điểm mua.</p>
      </section>
    </div>
  )
}
