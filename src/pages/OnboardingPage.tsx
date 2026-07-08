// src/pages/OnboardingPage.tsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useAuth } from '../shared/auth/useAuth'

// Dữ liệu Ban Lãnh Đạo C-level chuẩn Sơ đồ Tổ chức HistAR Team
const EXECUTIVE_TEAM = [
    {
        name: 'Nguyễn Thái Quân',
        code: 'SE182247',
        role: 'Chief Executive Officer (CEO)',
        desc: 'Định hướng chiến lược phát triển & quản trị tầm nhìn nền tảng.',
        icon: 'workspace_premium',
        image: '/brand/team/quan-ceo.jpg',
        color: 'from-[#fe951c] to-[#fdb438]',
        badgeText: 'text-[#d97706]',
    },
    {
        name: 'Đặng Thuận Phát',
        code: 'SE194093',
        role: 'Chief Technology Officer (CTO)',
        desc: 'Kiến trúc hệ thống, phát triển Core Engine WebAR & 3D Spatial.',
        icon: 'architecture',
        image: '/brand/team/phat-cto.jpg',
        color: 'from-[#1a79e5] to-[#388cf1]',
        badgeText: 'text-[#1d4ed8]',
    },
    {
        name: 'Trần Ngọc Thảo My',
        code: 'SS180901',
        role: 'Chief Financial Officer (CFO)',
        desc: 'Quản trị mô hình đầu tư bền vững & lập kế hoạch tài chính.',
        icon: 'account_balance_wallet',
        image: '/brand/team/my-cfo.jpg',
        color: 'from-emerald-500 to-teal-400',
        badgeText: 'text-emerald-700',
    },
    {
        name: 'Nguyễn Quốc Huy',
        code: 'SE194044',
        role: 'Chief Operating Officer (COO)',
        desc: 'Điều phối vận hành, tối ưu quy trình & quản lý chất lượng dịch vụ.',
        icon: 'rocket_launch',
        image: '/brand/team/huy-coo.jpg',
        color: 'from-[#fe951c] to-[#e07d0b]',
        badgeText: 'text-[#b45309]',
    },
    {
        name: 'Nguyễn Kỳ Vỹ',
        code: 'SE182452',
        role: 'Chief Product Officer (CPO)',
        desc: 'Thiết kế trải nghiệm UI/UX cao cấp & định hướng chiến lược sản phẩm.',
        icon: 'design_services',
        image: '/brand/team/vy-cpo.jpg',
        color: 'from-[#388cf1] to-cyan-400',
        badgeText: 'text-[#0284c7]',
    },
    {
        name: 'Lê Vĩnh Hào',
        code: 'SS192485',
        role: 'Chief Marketing Officer (CMO)',
        desc: 'Xây dựng thương hiệu di sản & phát triển cộng đồng người dùng.',
        icon: 'campaign',
        image: '/brand/team/hao-cmo.jpg',
        color: 'from-purple-500 to-pink-500',
        badgeText: 'text-purple-700',
    },
]

// Dữ liệu Sáu Tầng Kiến Trúc Nền Tảng chuẩn 6-Layer Architecture
const PLATFORM_6_LAYERS = [
    {
        layer: 'Layer 01',
        title: 'Digital Overlay (Lớp Phủ Số Hóa)',
        desc: 'Công nghệ Parallax 2.5D tận dụng cảm biến Gyroscope trên trình duyệt web, kết hợp thanh trượt dòng thời gian và không gian âm thanh thực tế tái hiện sinh động bối cảnh lịch sử mà không cần tải ứng dụng.',
        icon: 'layers',
        color: 'text-[#FE951C]',
        border: 'hover:border-[#FE951C]',
        bg: 'from-[#FE951C]/10 to-transparent',
    },
    {
        layer: 'Layer 02',
        title: 'O2O Interaction (Tương Tác Kép)',
        desc: 'Cơ chế xác thực bảo mật 2 lớp: định vị hàng rào địa lý GPS Geofencing kết hợp quét mã QR thực tế tại điểm đến, ngăn chặn gian lận và thúc đẩy sự hiện diện thực tế của du khách tại di tích.',
        icon: 'qr_code_scanner',
        color: 'text-[#1A79E5]',
        border: 'hover:border-[#1A79E5]',
        bg: 'from-[#1A79E5]/10 to-transparent',
    },
    {
        layer: 'Layer 03',
        title: 'AI Narrative (Trợ Lý Lịch Sử AI)',
        desc: 'Đối thoại trực tiếp hai chiều cùng nhân vật lịch sử AI được hỗ trợ bởi LLM. Kiến trúc RAG chuẩn hóa kho dữ liệu lịch sử đã xác minh, đảm bảo tính chính xác và minh bạch 100% tài liệu trích dẫn.',
        icon: 'record_voice_over',
        color: 'text-purple-600',
        border: 'hover:border-purple-500',
        bg: 'from-purple-500/10 to-transparent',
    },
    {
        layer: 'Layer 04',
        title: 'Gamification Engine (Trò Chơi Hóa)',
        desc: 'Hệ thống nhiệm vụ hành trình, thăng cấp danh hiệu từ Explorer đến Legend, bộ sưu tập thẻ cổ vật số Pokédex cùng cơ chế mở khóa các câu chuyện bí mật tạo động lực khám phá liên tục.',
        icon: 'emoji_events',
        color: 'text-[#D97706]',
        border: 'hover:border-[#D97706]',
        bg: 'from-[#D97706]/10 to-transparent',
    },
    {
        layer: 'Layer 05',
        title: 'Viral Social Loop (Lan Tỏa MXH)',
        desc: 'Bộ công cụ sáng tạo nội dung ngay tại di tích: khung ảnh lịch sử độc quyền, bộ lọc cổ điển và tự động kết xuất khung dọc 9:16 đóng dấu bản quyền TimeLens, cho phép chia sẻ 1-chạm lên mạng xã hội.',
        icon: 'share_reviews',
        color: 'text-emerald-600',
        border: 'hover:border-emerald-500',
        bg: 'from-emerald-500/10 to-transparent',
    },
    {
        layer: 'Layer 06',
        title: 'Data & Analytics (Dữ Liệu Chuyên Sâu)',
        desc: 'Hệ thống lập bản đồ nhiệt hành vi và biểu đồ tương tác lịch sử, cung cấp bảng điều khiển B2B/B2G giúp nhà trường và ban quản lý di tích tối ưu hóa công tác vận hành và giáo dục.',
        icon: 'analytics',
        color: 'text-[#0284C7]',
        border: 'hover:border-[#0284C7]',
        bg: 'from-[#0284C7]/10 to-transparent',
    },
]

// Sub-component: Widget mô phỏng Radar quét tầng ngầm Địa đạo Củ Chi (Khôi phục & Nâng cấp 3D)
const CuChiRadarWidget: React.FC = () => (
    <div className="relative w-full h-52 sm:h-60 rounded-3xl overflow-hidden bg-[#0f1015] border-2 border-[#FE951C]/50 shadow-2xl flex items-center justify-center group select-none">
        {/* Nền ảnh kiến trúc hào ngầm lót bên dưới màn hình Radar */}
        <img
            src="/media/cu-chi/scenes/bep-hoang-cam-2026.jpg"
            alt="Mô phỏng hầm ngầm Củ Chi"
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity filter contrast-125 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-[#0f1015]/80 to-transparent pointer-events-none" />
        <div className="absolute w-72 h-72 rounded-full border border-[#FE951C]/25 animate-[ping_4s_linear_infinite] pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-[#388CF1]/35 animate-[ping_3s_linear_infinite] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#FE951C_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FE951C]/20 to-transparent animate-[spin_6s_linear_infinite] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-2.5 p-4 max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-[#FE951C]/25 border border-[#FE951C] flex items-center justify-center text-[#FDB438] shadow-[0_0_25px_rgba(254,149,28,0.6)] backdrop-blur-md">
                <MaterialIcon name="radar" className="text-2xl animate-spin" />
            </div>
            <span className="px-3 py-0.5 rounded-full bg-[#1E293B]/90 border border-white/10 text-[11px] font-mono font-black text-[#FDB438] tracking-widest uppercase shadow-sm">
        GEO-LAT: 11.1425° N | 106.4622° E
      </span>
            <p className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">
                Hệ thống định vị ngầm WebAR 3D Địa đạo Củ Chi
            </p>
        </div>
    </div>
)

export const OnboardingPage: React.FC = () => {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 30)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#FE951C] selection:text-white">

            {/* HEADER NAVIGATION (TÍCH HỢP KÉP HISTAR & TIMELENS BRAND) */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? 'bg-[#FAF8F3]/95 backdrop-blur-xl border-b border-[#E2E8F0] py-3.5 shadow-md'
                        : 'bg-gradient-to-b from-[#FAF8F3] to-transparent py-6'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#FE951C] to-[#1A79E5] blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                            <img src="/brand/icon-192.png" alt="TimeLens" className="relative w-10 h-10 rounded-full border-2 border-[#FE951C] object-cover shadow-sm" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl font-black tracking-tight text-[#1E293B]">TimeLens</span>
                                <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-white text-[8px] font-black uppercase tracking-widest">by HistAR</span>
                            </div>
                            <span className="text-[10px] font-black text-[#D97706] tracking-widest uppercase -mt-0.5">Heritage EdTech Platform</span>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-extrabold text-[#475569]">
                        <a href="#about" className="hover:text-[#1A79E5] transition-colors py-1">Về Nền Tảng</a>
                        <a href="#solutions" className="hover:text-[#1A79E5] transition-colors py-1">Giải Pháp Core</a>
                        <a href="#business" className="hover:text-[#1A79E5] transition-colors py-1">Khả Thi Thương Mại</a>
                        <a href="#leadership" className="hover:text-[#1A79E5] transition-colors py-1">Ban Lãnh Đạo</a>
                    </nav>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {isAuthenticated ? (
                            <button
                                type="button"
                                onClick={() => navigate('/home')}
                                className="px-6 py-2.5 rounded-full bg-[#1E293B] text-white font-extrabold text-xs tracking-wider uppercase hover:bg-[#1A79E5] transition-all shadow-lg cursor-pointer flex items-center gap-2"
                            >
                                <span>Vào Bảng Điều Khiển</span>
                                <MaterialIcon name="dashboard" className="text-base" />
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="px-4.5 py-2 rounded-full border-2 border-[#CBD5E1] hover:border-[#1E293B] text-[#1E293B] font-extrabold text-xs tracking-wider uppercase transition-all hidden sm:flex items-center gap-1.5 cursor-pointer"
                                >
                                    <MaterialIcon name="login" className="text-base text-[#1A79E5]" />
                                    <span>Đăng nhập</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FE951C] via-[#FDB438] to-[#e07d0b] text-black font-black text-xs tracking-wider uppercase shadow-[0_4px_15px_rgba(254,149,28,0.35)] hover:shadow-[0_6px_25px_rgba(254,149,28,0.55)] hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <span>Đăng ký trải nghiệm</span>
                                    <MaterialIcon name="person_add" className="text-base font-bold" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO SECTION & VỀ NỀN TẢNG HISTAR */}
            <section id="about" className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden border-b border-[#E2E8F0] scroll-mt-24">
                <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-[#FE951C]/15 via-[#1A79E5]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#9A3412]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-20">

                    {/* LỚP 1: HERO & TUYÊN NGÔN TẦM NHÌN */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FE951C]/15 border border-[#FE951C]/40 text-[#b45309] text-xs font-black uppercase tracking-widest shadow-sm">
                                <MaterialIcon name="hub" className="text-lg text-[#FE951C] animate-spin" />
                                <span>Công Nghệ Di Sản Thế Hệ Mới Từ HistAR Team</span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl font-black text-[#1E293B] tracking-tight leading-[1.15]">
                                Relive History, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D97706] via-[#FE951C] to-[#1A79E5]">
                  Reshape Heritage
                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-[#475569] font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Được sáng lập bởi tập thể kỹ sư trẻ <strong>HistAR Team</strong>, ứng dụng <strong>TimeLens</strong> ra đời với sứ mệnh xóa bỏ sự thụ động của các phương thức truyền đạt lịch sử cũ. Chúng tôi kiến tạo cầu nối công nghệ đưa di sản sống động vào từng phòng học và điểm tham quan.
                            </p>

                            <div className="p-5 rounded-2xl bg-white/80 border border-[#CBD5E1] shadow-sm max-w-2xl text-left space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-[#1A79E5] uppercase tracking-wider">
                                    <MaterialIcon name="lightbulb" className="text-base text-[#FE951C]" />
                                    <span>Triết Lý Sáng Lập (Core Insight)</span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#334155] font-bold italic">
                                    "TimeLens không đơn thuần cung cấp phần mềm — chúng tôi mang đến giải pháp trải nghiệm di sản hấp dẫn, trực quan và tối ưu chi phí vận hành cho nhà trường cùng ban quản lý di tích. Công nghệ tạo nên trải nghiệm; sự thấu hiểu người dùng kiến tạo giá trị."
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/explore')}
                                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FE951C] to-[#e07d0b] text-white font-black text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(254,149,28,0.4)] hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2.5"
                                >
                                    <MaterialIcon name="explore" className="text-xl" />
                                    <span>Khám Phá Bản Đồ Di Sản</span>
                                </button>
                                <a
                                    href="#solutions"
                                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-[#F8FAFC] border-2 border-[#CBD5E1] text-[#1E293B] font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <span>Xem Kiến Trúc Nền Tảng</span>
                                    <MaterialIcon name="arrow_downward" className="text-lg text-[#1A79E5]" />
                                </a>
                            </div>
                        </div>

                        {/* Cột phải: Ghép đôi Radar UI & Thẻ Pilot Củ Chi */}
                        <div className="lg:col-span-5 space-y-6">
                            <CuChiRadarWidget />

                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#1E293B] group min-h-[250px] flex flex-col justify-end">
                                <img
                                    src="/media/banner-main.jpg"
                                    alt="Địa đạo Củ Chi"
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    onError={(e) => { e.currentTarget.style.opacity = '0.3' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-[#0f1015]/40 to-transparent" />
                                <div className="relative z-10 p-6 text-white flex items-end justify-between">
                                    <div className="space-y-1">
                    <span className="px-2.5 py-1 rounded bg-[#FE951C] text-black font-black text-[10px] uppercase tracking-wider">
                      Điểm Đến Hạt Nhân Pilot
                    </span>
                                        <h3 className="text-lg font-bold mt-1">Địa Đạo Củ Chi — Đất Thép Thành Đồng</h3>
                                        <p className="text-xs text-gray-300">Tái hiện hệ thống hầm hào 3 tầng thời kỳ 1968 & 2026</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/explore/cu-chi')}
                                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#FE951C] hover:text-white transition-colors cursor-pointer shrink-0 shadow-md"
                                    >
                                        <MaterialIcon name="arrow_forward" className="text-base font-bold" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* LỚP 2: SÁU TẦNG KIẾN TRÚC NỀN TẢNG (THE 6-LAYER ARCHITECTURE) */}
                    <div className="space-y-8 pt-10 border-t border-[#CBD5E1]">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-black text-[#1A79E5] tracking-widest uppercase block">
                CÔNG NGHỆ TOÀN DIỆN (THE 6-LAYER ARCHITECTURE)
              </span>
                            <h2 className="text-3xl sm:text-4xl font-black text-[#1E293B] tracking-tight">
                                Sáu Tầng Kiến Trúc Độc Quyền TimeLens
                            </h2>
                            <p className="text-[#64748B] text-sm sm:text-base font-medium">
                                Sự dung hòa hoàn hảo giữa đồ họa không gian, trí tuệ nhân tạo và kết nối thực địa O2O để chuyển hóa trọn vẹn chuyến tham quan lịch sử.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {PLATFORM_6_LAYERS.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`p-7 rounded-3xl bg-white border border-[#CBD5E1] transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between space-y-4 group ${item.border}`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-black tracking-widest text-[#64748B] uppercase">
                        {item.layer}
                      </span>
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-b ${item.bg} border border-[#CBD5E1]/60 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
                                                <MaterialIcon name={item.icon} className="text-2xl" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-[#1E293B]">{item.title}</h3>
                                        <p className="text-xs text-[#475569] font-medium leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </section>

            {/* =========================================================================
          3. GIẢI PHÁP CÔNG NGHỆ CORE (TÍCH HỢP ẢNH AI ĐỈNH CAO)
          ========================================================================= */}
            <section id="solutions" className="py-24 bg-white border-b border-[#E2E8F0] scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <span className="text-sm font-black text-[#1A79E5] tracking-widest uppercase block">KIẾN TRÚC NỀN TẢNG CÔNG NGHỆ</span>
                        <h2 className="text-3xl sm:text-5xl font-black text-[#1E293B] tracking-tight">4 Trụ Cột Công Nghệ Cốt Lõi</h2>
                        <p className="text-[#64748B] text-base font-medium">Hệ thống được thiết kế theo tiêu chuẩn doanh nghiệp, tích hợp mượt mà giữa phần cứng di động và công nghệ đồ họa không gian.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                        {/* Trụ cột 1: Tour 360 (Tích hợp ảnh AI tour-360.jpg) */}
                        <div className="lg:col-span-7 p-8 rounded-3xl bg-[#FAF8F3] border-2 border-[#E2E8F0] hover:border-[#FE951C] transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-sm hover:shadow-xl">
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-[#FE951C]/15 border border-[#FE951C]/30 flex items-center justify-center text-[#d97706] group-hover:bg-[#FE951C] group-hover:text-white transition-all shadow-sm">
                                    <MaterialIcon name="view_in_ar" className="text-3xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Không Gian Toàn Cảnh Tour 360°</h3>
                                <p className="text-sm text-[#475569] leading-relaxed font-medium">Khám phá toàn diện kiến trúc di tích với độ phân giải cao. Hệ thống điểm chạm (Hotspot) tương tác tự động cung cấp thông tin kiến trúc, tư liệu hình ảnh và thuyết minh âm thanh theo thời gian thực.</p>
                            </div>

                            {/* Khung ảnh AI Tour 360 */}
                            <div className="rounded-2xl overflow-hidden border-2 border-[#CBD5E1] h-60 relative shadow-inner">
                                <img src="/media/tour-360.jpg" alt="Tour 360 AI Illustration" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <span className="px-3.5 py-1.5 rounded-full bg-black/80 border border-white/20 text-xs font-bold text-[#FDB438] flex items-center gap-2 shadow-lg">
                    <MaterialIcon name="360" className="animate-spin" /> Trải nghiệm không gian ba chiều sống động
                  </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#CBD5E1]/60 flex items-center justify-between text-xs font-black text-[#d97706]">
                                <span>TRẢI NGHIỆM KHÔNG GIỚI HẠN ĐỊA LÝ</span>
                                <MaterialIcon name="arrow_forward" className="text-base transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Trụ cột 2: Time Portal (Tích hợp ảnh AI time-portal.jpg) */}
                        <div className="lg:col-span-5 p-8 rounded-3xl bg-[#FAF8F3] border-2 border-[#E2E8F0] hover:border-[#1A79E5] transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-sm hover:shadow-xl">
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-[#1A79E5]/15 border border-[#1A79E5]/30 flex items-center justify-center text-[#1A79E5] group-hover:bg-[#1A79E5] group-hover:text-white transition-all shadow-sm">
                                    <MaterialIcon name="history_toggle_off" className="text-3xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Cổng Thời Gian Xưa & Nay (Time Portal)</h3>
                                <p className="text-sm text-[#475569] leading-relaxed font-medium">Công nghệ đối chiếu hình ảnh đa lớp thời kỳ cho phép trực quan hóa sự chuyển mình lịch sử qua các mốc thời đại (1968 · 2026).</p>
                            </div>

                            {/* Khung ảnh AI Time Portal Split */}
                            <div className="rounded-2xl overflow-hidden border-2 border-[#CBD5E1] h-60 relative shadow-inner">
                                <img src="/media/time-portal.jpg" alt="Time Portal AI Illustration" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#1A79E5]/90 border border-white/20 text-xs font-bold text-white flex items-center gap-2 shadow-lg">
                    <MaterialIcon name="compare" /> Đối chiếu ranh giới xưa & nay
                  </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#CBD5E1]/60 flex items-center justify-between text-xs font-black text-[#1A79E5]">
                                <span>ĐỐI CHIẾU LỊCH SỬ TRỰC QUAN</span>
                                <MaterialIcon name="arrow_forward" className="text-base transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Trụ cột 3: RAG AI */}
                        <div className="lg:col-span-6 p-8 rounded-3xl bg-[#FAF8F3] border-2 border-[#E2E8F0] hover:border-[#FE951C] transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-sm hover:shadow-xl">
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-[#FE951C]/15 border border-[#FE951C]/30 flex items-center justify-center text-[#d97706] group-hover:bg-[#FE951C] group-hover:text-white transition-all shadow-sm">
                                    <MaterialIcon name="auto_awesome" className="text-3xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Trợ Lý Lịch Sử AI Chuẩn RAG</h3>
                                <p className="text-sm text-[#475569] leading-relaxed font-medium">Tích hợp Trí tuệ Nhân tạo nhập vai các nhân vật lịch sử. Kiến trúc RAG kiểm soát chặt chẽ nguồn dữ liệu đầu vào, tuyệt đối minh bạch tài liệu trích dẫn chuẩn giáo dục.</p>
                            </div>
                            <div className="pt-4 border-t border-[#CBD5E1]/60 flex items-center justify-between text-xs font-black text-[#d97706]">
                                <span>MINH BẠCH 100% NGUỒN TƯ LIỆU</span>
                                <MaterialIcon name="arrow_forward" className="text-base transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Trụ cột 4: O2O Gamification */}
                        <div className="lg:col-span-6 p-8 rounded-3xl bg-[#FAF8F3] border-2 border-[#E2E8F0] hover:border-[#059669] transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-sm hover:shadow-xl">
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#059669] group-hover:bg-[#059669] group-hover:text-white transition-all shadow-sm">
                                    <MaterialIcon name="qr_code_scanner" className="text-3xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Hệ Thống Thực Địa O2O & Gamification</h3>
                                <p className="text-sm text-[#475569] leading-relaxed font-medium">Kết nối liền mạch giữa trải nghiệm số và tham quan thực tế. Quét mã QR hoặc định vị GPS tại điểm di tích để mở khóa cổ vật AR 3D, tích lũy điểm thưởng XP và chinh phục các huy hiệu di sản.</p>
                            </div>
                            <div className="pt-4 border-t border-[#CBD5E1]/60 flex items-center justify-between text-xs font-black text-[#059669]">
                                <span>TƯƠNG TÁC THỰC TẾ TĂNG CƯỜNG</span>
                                <MaterialIcon name="arrow_forward" className="text-base transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* =========================================================================
          4. KHẢ THI THƯƠNG MẠI & B2B SaaS LICENSING MODEL
          ========================================================================= */}
            <section id="business" className="py-24 bg-[#F2EFE9] border-b border-[#E2E8F0] scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <span className="text-sm font-black text-[#D97706] tracking-widest uppercase block">MÔ HÌNH ĐỊNH GIÁ & CẤP PHÉP BỀN VỮNG</span>
                        <h2 className="text-3xl sm:text-5xl font-black text-[#1E293B] tracking-tight">Khả Thi Thương Mại & EdTech Licensing</h2>
                        <p className="text-[#64748B] text-base font-medium">Cung cấp mô hình dịch vụ linh hoạt từ gói cá nhân trải nghiệm đến giải pháp phần mềm toàn diện (SaaS/Licensing Model) dành riêng cho khối trường học và hệ thống giáo dục.</p>
                    </div>

                    <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-[#CBD5E1] shadow-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-7 space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FE951C]/15 text-[#b45309] font-black text-xs uppercase tracking-wider">
                                    <MaterialIcon name="person" className="text-base text-[#FE951C]" />
                                    <span>Phân Khúc Cá Nhân</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-[#1E293B]">Mô Hình Freemium - Premium Thành Viên</h3>
                                <p className="text-sm sm:text-base text-[#475569] leading-relaxed font-medium">Trải nghiệm miễn phí các tính năng bản đồ di sản cơ bản. Nâng cấp tài khoản Premium để mở khóa đặc quyền khám phá sâu không giới hạn và nhận chứng nhận số.</p>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#334155]"><MaterialIcon name="check_circle" className="text-[#FE951C] text-lg" /> Mở khóa toàn bộ dòng thời gian Time Portal</span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#334155]"><MaterialIcon name="check_circle" className="text-[#FE951C] text-lg" /> Trò chuyện Trợ lý AI lịch sử không giới hạn</span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#334155]"><MaterialIcon name="check_circle" className="text-[#FE951C] text-lg" /> Huy hiệu vàng Hộ chiếu Di sản & Khung ảnh độc quyền</span>
                                </div>
                            </div>

                            <div className="lg:col-span-5 bg-[#FAF8F3] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] flex flex-col justify-center items-center text-center space-y-4">
                                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Mức giá trải nghiệm cá nhân</span>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl sm:text-5xl font-black text-[#FE951C]">49.000đ</span>
                                    <span className="text-sm font-bold text-[#64748B]">/ tháng</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="w-full py-3.5 rounded-xl bg-[#1E293B] hover:bg-[#1A79E5] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                >
                                    Đăng Ký Tài Khoản Trải Nghiệm
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CBD5E1]">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A79E5]/15 text-[#1d4ed8] font-black text-xs uppercase tracking-wider mb-2">
                                    <MaterialIcon name="school" className="text-base text-[#1A79E5]" />
                                    <span>Phân Khúc Khối Trường Học</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-[#1E293B]">Software & Service Package Licensing Model</h3>
                            </div>
                            <div className="bg-[#E2E8F0] px-4 py-2 rounded-xl text-xs font-bold text-[#334155]">
                                💡 Áp dụng chính sách <strong className="text-[#1A79E5]">Volume Discount (30 - 40%)</strong> cho hệ thống trường học.
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                            <div className="p-8 rounded-3xl bg-white border border-[#CBD5E1] hover:border-[#FE951C] transition-all flex flex-col justify-between shadow-sm hover:shadow-xl space-y-6">
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="px-3 py-1 rounded-lg bg-[#FE951C]/15 text-[#b45309] font-black text-xs uppercase tracking-wider">Small Sub-plan</span>
                                        <MaterialIcon name="devices" className="text-2xl text-[#64748B]" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-[#1E293B]">Micro Package</h4>
                                        <div className="mt-3 flex items-baseline gap-1"><span className="text-3xl font-black text-[#1E293B]">8.000.000 VNĐ</span><span className="text-xs font-bold text-[#64748B]">/ năm</span></div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2E8F0] space-y-1 text-xs font-bold text-[#334155]">
                                        <div className="flex justify-between"><span>Đồng thời (CCU):</span> <span className="text-[#1E293B] font-black">15 CCU</span></div>
                                        <div className="flex justify-between"><span>Tài khoản định danh:</span> <span className="text-[#1E293B] font-black">Tối đa 100</span></div>
                                    </div>
                                    <ul className="space-y-3 text-xs font-semibold text-[#475569] pt-2">
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#FE951C] text-lg shrink-0 mt-0.5" /><span>Khám phá di sản từ xa & Cổng thời gian Time Portal</span></li>
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#FE951C] text-lg shrink-0 mt-0.5" /><span>Trò chuyện cùng Trợ lý Lịch sử AI Guide (<strong className="text-[#1E293B]">Giới hạn 5.000 queries/tháng</strong>)</span></li>
                                    </ul>
                                </div>
                                <button type="button" onClick={() => navigate('/login')} className="w-full py-3 rounded-xl border-2 border-[#1E293B] hover:bg-[#1E293B] hover:text-white text-[#1E293B] font-black text-xs uppercase tracking-wider transition-all cursor-pointer">Đăng Ký Cấp Phép Gói</button>
                            </div>

                            <div className="p-8 rounded-3xl bg-white border-2 border-[#1A79E5] transition-all flex flex-col justify-between shadow-2xl relative scale-[1.03] z-10 space-y-6">
                                <div className="absolute -top-3.5 right-6 px-4 py-1 rounded-full bg-[#1A79E5] text-white font-black text-[10px] tracking-wider uppercase shadow-md">Hero Product</div>
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="px-3 py-1 rounded-lg bg-[#1A79E5]/15 text-[#1d4ed8] font-black text-xs uppercase tracking-wider">Phổ Biến Nhất</span>
                                        <MaterialIcon name="hub" className="text-2xl text-[#1A79E5]" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-[#1E293B]">Standard Package</h4>
                                        <div className="mt-3 flex items-baseline gap-1"><span className="text-3xl font-black text-[#1A79E5]">15.000.000 VNĐ</span><span className="text-xs font-bold text-[#64748B]">/ năm</span></div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#1A79E5]/10 border border-[#1A79E5]/20 space-y-1 text-xs font-bold text-[#1e293b]">
                                        <div className="flex justify-between"><span>Đồng thời (CCU):</span> <span className="text-[#1A79E5] font-black">40 CCU</span></div>
                                        <div className="flex justify-between"><span>Tài khoản định danh:</span> <span className="text-[#1A79E5] font-black">Tối đa 400</span></div>
                                    </div>
                                    <ul className="space-y-3 text-xs font-semibold text-[#334155] pt-2">
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#1A79E5] text-lg shrink-0 mt-0.5" /><span><strong>Toàn bộ tính năng Core</strong> di sản số hóa của nền tảng</span></li>
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#1A79E5] text-lg shrink-0 mt-0.5" /><span>Tích hợp hoạt động chia đội theo mã phòng <strong>Team-based Quest Room</strong></span></li>
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#1A79E5] text-lg shrink-0 mt-0.5" /><span>Trợ lý Lịch sử AI Guide nâng cao (<strong className="text-[#1E293B]">Giới hạn 30.000 queries/tháng</strong>)</span></li>
                                    </ul>
                                </div>
                                <button type="button" onClick={() => navigate('/login')} className="w-full py-3.5 rounded-xl bg-[#1A79E5] hover:bg-[#1d4ed8] text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer">Triển Khai Gói Tiêu Chuẩn</button>
                            </div>

                            <div className="p-8 rounded-3xl bg-white border border-[#CBD5E1] hover:border-[#059669] transition-all flex flex-col justify-between shadow-sm hover:shadow-xl space-y-6">
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider">Upsell / Toàn Diện</span>
                                        <MaterialIcon name="admin_panel_settings" className="text-2xl text-[#059669]" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-[#1E293B]">Premium Package</h4>
                                        <div className="mt-3 flex items-baseline gap-1"><span className="text-3xl font-black text-[#059669]">25.000.000 VNĐ</span><span className="text-xs font-bold text-[#64748B]">/ năm</span></div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2E8F0] space-y-1 text-xs font-bold text-[#334155]">
                                        <div className="flex justify-between"><span>Đồng thời (CCU):</span> <span className="text-[#059669] font-black">80 CCU</span></div>
                                        <div className="flex justify-between"><span>Tài khoản định danh:</span> <span className="text-[#059669] font-black">Tối đa 1.000</span></div>
                                    </div>
                                    <ul className="space-y-3 text-xs font-semibold text-[#475569] pt-2">
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#059669] text-lg shrink-0 mt-0.5" /><span><strong>Toàn bộ quyền truy cập</strong> không giới hạn hệ sinh thái</span></li>
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#059669] text-lg shrink-0 mt-0.5" /><span>Hệ thống quản lý chuyên biệt <strong>Teacher Dashboard (Management System)</strong></span></li>
                                        <li className="flex items-start gap-2.5"><MaterialIcon name="check_circle" className="text-[#059669] text-lg shrink-0 mt-0.5" /><span><strong>Hỗ trợ tùy biến bài giảng riêng</strong> theo lộ trình đào tạo của từng trường</span></li>
                                    </ul>
                                </div>
                                <button type="button" onClick={() => navigate('/login')} className="w-full py-3 rounded-xl border-2 border-[#059669] hover:bg-[#059669] hover:text-white text-[#059669] font-black text-xs uppercase tracking-wider transition-all cursor-pointer">Đăng Ký Gói Toàn Diện</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* BAN LÃNH ĐẠO C-LEVEL */}
            <section id="leadership" className="py-24 bg-white border-b border-[#E2E8F0] scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <span className="text-sm font-black text-[#D97706] tracking-widest uppercase block">ĐỘI NGŨ QUẢN TRỊ DỰ ÁN</span>
                        <h2 className="text-3xl sm:text-5xl font-black text-[#1E293B] tracking-tight">Ban Lãnh Đạo HistAR Team</h2>
                        <p className="text-[#64748B] text-base font-medium">Sự hội tụ giữa năng lực công nghệ, quản trị kinh doanh và tư duy thiết kế từ các sinh viên ưu tú Đại học FPT TP.HCM.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {EXECUTIVE_TEAM.map((exec, idx) => (
                            <div
                                key={idx}
                                className="p-6 rounded-3xl bg-[#FAF8F3] border border-[#CBD5E1] hover:border-[#1A79E5] transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between group"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${exec.color} p-0.5 shadow-md shrink-0`}>
                                            <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={exec.image}
                                                    alt={exec.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => { e.currentTarget.style.opacity = '0.2' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-base font-black text-[#1E293B] group-hover:text-[#1A79E5] transition-colors">
                                                {exec.name}
                                            </h4>
                                            <span className="inline-block px-2.5 py-0.5 rounded bg-[#E2E8F0] text-[10px] font-mono font-black text-[#475569] mt-1">
                        {exec.code}
                      </span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-[#CBD5E1]/60 space-y-1.5">
                                        <p className={`text-xs font-black tracking-wide uppercase ${exec.badgeText}`}>
                                            {exec.role}
                                        </p>
                                        <p className="text-xs text-[#475569] font-medium leading-relaxed">
                                            {exec.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-8 rounded-3xl bg-[#1E293B] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                        <div className="space-y-1 text-center sm:text-left">
                            <h4 className="text-lg font-black">Sẵn Sàng Triển Khai Cho Doanh Nghiệp & Nhà Trường</h4>
                            <p className="text-xs text-gray-300 font-medium">Liên hệ ban điều hành để nhận bản trình diễn hệ thống đầy đủ hoặc tư vấn giải pháp số hóa riêng.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/explore')}
                            className="px-8 py-4 rounded-xl bg-[#FE951C] hover:bg-[#e07d0b] text-white font-black text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-md"
                        >
                            Vào Khám Phá Ngay
                        </button>
                    </div>
                </div>
            </section>

            {/* FOOTER (TÍCH HỢP HISTAR BRAND) */}
            <footer className="bg-[#1E293B] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
                    <div className="space-y-4 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <img src="/brand/icon-192.png" alt="Logo" className="w-8 h-8 rounded-full border border-[#FE951C]" />
                            <span className="text-xl font-black tracking-tight">TimeLens <span className="text-xs text-[#FE951C] font-normal">by HistAR</span></span>
                        </div>
                        <p className="text-xs leading-relaxed max-w-sm text-gray-300 font-medium">Nền tảng công nghệ số hóa di sản và du lịch tương tác. Định hình phương thức kết nối mới giữa cộng đồng hiện đại và các giá trị lịch sử văn hóa.</p>
                        <p className="text-[11px] text-gray-400 pt-2 font-semibold">© 2026 HistAR Team (TimeLens Platform). All rights reserved.</p>
                    </div>

                    <div className="space-y-3 text-sm">
                        <h4 className="text-[#FE951C] font-black tracking-wider uppercase text-xs">Hệ Thống Nền Tảng</h4>
                        <ul className="space-y-2 text-xs font-semibold text-gray-300">
                            <li><Link to="/explore" className="hover:text-white transition-colors">Bản Đồ Di Sản Số</Link></li>
                            <li><Link to="/quests" className="hover:text-white transition-colors">Hành Trình Tương Tác</Link></li>
                            <li><Link to="/leaderboard" className="hover:text-white transition-colors">Bảng Xếp Hạng Cộng Đồng</Link></li>
                            <li><Link to="/login" className="hover:text-white transition-colors">Cổng Quản Trị Hệ Thống</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-3 text-sm">
                        <h4 className="text-[#FE951C] font-black tracking-wider uppercase text-xs">Liên Hệ & Hợp Tác</h4>
                        <ul className="space-y-2 text-xs font-semibold text-gray-300">
                            <li className="flex items-center gap-2"><MaterialIcon name="mail" className="text-sm text-[#FE951C]" /> contact@histar.vn</li>
                            <li className="flex items-center gap-2"><MaterialIcon name="business" className="text-sm text-[#388CF1]" /> TP. Hồ Chí Minh, Việt Nam</li>
                            <li className="pt-2"><a href="#" className="hover:underline text-gray-400">Chính Sách Bảo Mật</a></li>
                            <li><a href="#" className="hover:underline text-gray-400">Điều Khoản Dịch Vụ</a></li>
                        </ul>
                    </div>
                </div>
            </footer>

        </div>
    )
}