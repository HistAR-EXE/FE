// src/pages/HeritagePortfolioPage.tsx
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import { Link } from 'react-router-dom'

const SERVICES = [
  {
    icon: '360',
    title: 'Tour Thực Tế Ảo 360°',
    description: 'Số hóa di tích bằng công nghệ chụp toàn cảnh chuyên nghiệp. Du khách trải nghiệm từ xa trước khi đến tham quan.',
    highlights: ['Chụp drone + mặt đất', 'Tích hợp âm thanh thực tế', 'Tương thích mọi thiết bị'],
  },
  {
    icon: 'layers',
    title: 'Sa Bàn Lịch Sử Số',
    description: 'Tái hiện di tích qua các thời kỳ với hiệu ứng Parallax 2.5D. Thanh trượt thời gian giúp du khách nhìn thấy sự thay đổi.',
    highlights: ['Dữ liệu khảo cổ chính xác', 'Timeline tương tác', 'Lớp phủ thông tin'],
  },
  {
    icon: 'record_voice_over',
    title: 'Trợ Lý AI Chuyên Biệt',
    description: 'Xây dựng kho tri thức RAG riêng cho di tích. AI thuyết minh viên trả lời mọi câu hỏi bằng nguồn tài liệu xác minh.',
    highlights: ['RAG từ tài liệu BQL', 'Đa ngữ (VI/EN/KO/ZH)', 'Trích dẫn nguồn minh bạch'],
  },
  {
    icon: 'analytics',
    title: 'Dashboard Quản Lý & Phân Tích',
    description: 'Heatmap hành vi du khách, thời gian lưu trú, luồng tham quan. Dữ liệu giúp tối ưu hóa vận hành và marketing.',
    highlights: ['Bản đồ nhiệt realtime', 'Báo cáo tự động', 'API tích hợp hệ thống'],
  },
] as const

const PROCESS_STEPS = [
  { step: '01', title: 'Khảo Sát', description: 'Đội ngũ đến di tích để chụp ảnh, thu thập tài liệu lịch sử và hiểu nhu cầu BQL.', icon: 'location_searching' },
  { step: '02', title: 'Số Hóa', description: 'Xử lý dữ liệu, xây dựng mô hình 3D/360°, huấn luyện AI với kho tri thức riêng.', icon: 'construction' },
  { step: '03', title: 'Triển Khai', description: 'Tích hợp lên nền tảng TimeLens, cấu hình branding riêng, đào tạo nhân viên BQL.', icon: 'rocket_launch' },
  { step: '04', title: 'Vận Hành', description: 'Theo dõi dữ liệu, cập nhật nội dung theo mùa, hỗ trợ kỹ thuật liên tục.', icon: 'monitoring' },
] as const

export function HeritagePortfolioPage() {
  return (
    <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#0275FB] selection:text-white">
      <PublicHeader />

      {/* HERO */}
      <section className="relative pt-36 sm:pt-44 pb-24 overflow-hidden bg-gradient-to-b from-[#0275FB]/5 via-[#FAF8F3] to-[#FAF8F3]">
        <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#0275FB]/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#FDC908]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white border border-[#0275FB]/20 text-[#0275FB] text-xs font-black uppercase tracking-widest shadow-sm">
            <MaterialIcon name="museum" className="text-lg" />
            <span>Giải Pháp Số Hóa Di Sản (B2G)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Biến Di Tích Thành{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0275FB] to-[#FDC908]">
              Điểm Đến Số
            </span>
          </h1>

          <p className="text-lg text-[#475569] font-medium max-w-2xl mx-auto leading-relaxed">
            TimeLens cung cấp giải pháp chuyển đổi số toàn diện cho Ban quản lý Di tích, Bảo tàng và Khu du lịch văn hóa. Tăng doanh thu vé, kéo dài thời gian tham quan, và thu hút thế hệ du khách mới.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/checkout/b2g"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] text-white font-black text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(2,117,251,0.4)] hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>Liên Hệ Tư Vấn</span>
              <MaterialIcon name="arrow_forward" className="text-lg" />
            </Link>
            <a
              href="#services"
              className="px-8 py-4 rounded-2xl bg-white border-2 border-[#0275FB]/20 text-[#0275FB] font-black text-sm uppercase tracking-wider hover:bg-[#0275FB]/5 transition-all flex items-center gap-2 shadow-sm"
            >
              <span>Xem Dịch Vụ</span>
              <MaterialIcon name="arrow_downward" className="text-lg" />
            </a>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-sm font-black text-[#0275FB] tracking-widest uppercase block">Dịch Vụ</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Hệ Sinh Thái Số Hóa Di Sản</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SERVICES.map((svc) => (
              <div key={svc.title} className="p-8 rounded-3xl bg-[#FAF8F3] border border-[#E2E8F0] hover:border-[#0275FB]/40 hover:shadow-xl transition-all space-y-5 group">
                <div className="w-14 h-14 rounded-2xl bg-[#0275FB]/10 flex items-center justify-center group-hover:bg-[#0275FB] group-hover:text-white transition-colors text-[#0275FB]">
                  <MaterialIcon name={svc.icon} className="text-3xl" />
                </div>
                <h3 className="text-xl font-black text-[#1E293B]">{svc.title}</h3>
                <p className="text-sm text-[#475569] leading-relaxed">{svc.description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {svc.highlights.map((h) => (
                    <span key={h} className="px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-xs font-bold text-[#64748B]">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-24 bg-[#FAF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-sm font-black text-[#FDC908] tracking-widest uppercase block">Quy Trình</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Từ Ý Tưởng Đến Vận Hành</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PROCESS_STEPS.map((ps) => (
              <div key={ps.step} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0275FB] to-[#1d4ed8] flex items-center justify-center mx-auto text-white shadow-lg">
                  <MaterialIcon name={ps.icon} className="text-2xl" />
                </div>
                <p className="text-xs font-black text-[#0275FB] tracking-widest">BƯỚC {ps.step}</p>
                <h4 className="text-lg font-black text-[#1E293B]">{ps.title}</h4>
                <p className="text-sm text-[#475569] leading-relaxed">{ps.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Sẵn Sàng Số Hóa Di Sản Của Bạn?</h2>
          <p className="text-lg font-medium text-white/80 max-w-2xl mx-auto">
            Đội ngũ TimeLens sẽ đến tận nơi khảo sát miễn phí. Nhận báo giá chi tiết trong 48 giờ.
          </p>
          <Link
            to="/checkout/b2g"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-[#FDC908] text-[#0F1B33] font-black text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(253,201,8,0.4)] hover:scale-105 transition-all"
          >
            <MaterialIcon name="mail" className="text-lg" />
            <span>Liên Hệ Ngay</span>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
