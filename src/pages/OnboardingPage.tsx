// src/pages/OnboardingPage.tsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { resolveMediaUrl } from '../shared/config/env'
import mascotImg from '../assets/mascot.png'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'

// Dữ liệu Sáu Tầng Kiến Trúc Nền Tảng chuẩn 6-Layer Architecture
const PLATFORM_6_LAYERS = [
    {
        layer: 'Layer 01',
        title: 'Digital Overlay (Lớp Phủ Số Hóa)',
        desc: 'Công nghệ Parallax 2.5D tận dụng cảm biến Gyroscope trên trình duyệt web, kết hợp thanh trượt dòng thời gian và không gian âm thanh thực tế tái hiện sinh động bối cảnh lịch sử mà không cần tải ứng dụng.',
        icon: 'layers',
        color: 'text-[#0275FB]',
        border: 'hover:border-[#0275FB]',
        bg: 'from-[#0275FB]/10 to-transparent',
    },
    {
        layer: 'Layer 02',
        title: 'O2O Interaction (Tương Tác Kép)',
        desc: 'Cơ chế xác thực bảo mật 2 lớp: định vị hàng rào địa lý GPS Geofencing kết hợp quét mã QR thực tế tại điểm đến, ngăn chặn gian lận và thúc đẩy sự hiện diện thực tế của du khách tại di tích.',
        icon: 'qr_code_scanner',
        color: 'text-[#FDC908]',
        border: 'hover:border-[#FDC908]',
        bg: 'from-[#FDC908]/15 to-transparent',
    },
    {
        layer: 'Layer 03',
        title: 'AI Narrative (Trợ Lý Lịch Sử AI)',
        desc: 'Đối thoại trực tiếp hai chiều cùng nhân vật lịch sử AI được hỗ trợ bởi LLM. Kiến trúc RAG chuẩn hóa kho dữ liệu lịch sử đã xác minh, đảm bảo tính chính xác và minh bạch 100% tài liệu trích dẫn.',
        icon: 'record_voice_over',
        color: 'text-[#0275FB]',
        border: 'hover:border-[#0275FB]',
        bg: 'from-[#0275FB]/10 to-transparent',
    },
    {
        layer: 'Layer 04',
        title: 'Gamification Engine (Trò Chơi Hóa)',
        desc: 'Hệ thống nhiệm vụ hành trình, thăng cấp danh hiệu từ Explorer đến Legend, bộ sưu tập thẻ cổ vật số Pokédex cùng cơ chế mở khóa các câu chuyện bí mật tạo động lực khám phá liên tục.',
        icon: 'emoji_events',
        color: 'text-[#FDC908]',
        border: 'hover:border-[#FDC908]',
        bg: 'from-[#FDC908]/15 to-transparent',
    },
    {
        layer: 'Layer 05',
        title: 'Viral Social Loop (Lan Tỏa MXH)',
        desc: 'Bộ công cụ sáng tạo nội dung ngay tại di tích: khung ảnh lịch sử độc quyền, bộ lọc cổ điển và tự động kết xuất khung dọc 9:16 đóng dấu bản quyền TimeLens, cho phép chia sẻ 1-chạm lên mạng xã hội.',
        icon: 'share_reviews',
        color: 'text-[#0275FB]',
        border: 'hover:border-[#0275FB]',
        bg: 'from-[#0275FB]/10 to-transparent',
    },
    {
        layer: 'Layer 06',
        title: 'Data & Analytics (Dữ Liệu Chuyên Sâu)',
        desc: 'Hệ thống lập bản đồ nhiệt hành vi và biểu đồ tương tác lịch sử, cung cấp bảng điều khiển B2B/B2G giúp nhà trường và ban quản lý di tích tối ưu hóa công tác vận hành và giáo dục.',
        icon: 'analytics',
        color: 'text-[#FDC908]',
        border: 'hover:border-[#FDC908]',
        bg: 'from-[#FDC908]/15 to-transparent',
    },
]

// Sub-component: Widget mô phỏng Radar quét tầng ngầm Địa đạo Củ Chi
const CuChiRadarWidget: React.FC = () => (
    <div className="relative w-full h-52 sm:h-60 rounded-3xl overflow-hidden bg-gradient-to-br from-[#0f1015] via-[#1E293B] to-[#0f1015] border-2 border-[#FDC908]/50 shadow-2xl flex items-center justify-center group select-none">
        <img
            src={resolveMediaUrl('/media/cu-chi/scenes/bep-hoang-cam-2026.jpg')}
            alt="Mô phỏng hầm ngầm Củ Chi"
            className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity filter contrast-125 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-[#0f1015]/80 to-transparent pointer-events-none" />
        <div className="absolute w-72 h-72 rounded-full border border-[#FDC908]/30 animate-[ping_4s_linear_infinite] pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-[#0275FB]/40 animate-[ping_3s_linear_infinite] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#FDC908_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0275FB]/20 to-transparent animate-[spin_6s_linear_infinite] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-2.5 p-4 max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-[#0275FB]/30 border border-[#0275FB] flex items-center justify-center text-[#FDC908] shadow-[0_0_25px_rgba(2,117,251,0.5)] backdrop-blur-md">
                <MaterialIcon name="radar" className="text-2xl animate-spin" />
            </div>
            <span className="px-3.5 py-1 rounded-full bg-[#0275FB]/20 border border-[#FDC908]/40 text-[11px] font-mono font-black text-[#FDC908] tracking-widest uppercase shadow-sm backdrop-blur-md">
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

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#0275FB] selection:text-white">

            {/* SỬ DỤNG COMPONENT HEADER CHUẨN */}
            <PublicHeader />

            {/* HERO SECTION & VỀ NỀN TẢNG HISTAR */}
            <section id="about" className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden border-b border-[#0275FB]/15 scroll-mt-24 bg-gradient-to-b from-[#FFF2C3]/30 via-[#FAF8F3] to-[#FAF8F3]">
                <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-[#0275FB]/15 via-[#FDC908]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#0275FB]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-[#FFF2C3] border border-[#FDC908] text-[#92400e] text-xs font-black uppercase tracking-widest shadow-sm">
                                <MaterialIcon name="hub" className="text-lg text-[#0275FB] animate-spin" />
                                <span>Công Nghệ Di Sản Thế Hệ Mới Từ HistAR Team</span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl font-black text-[#1E293B] tracking-tight leading-[1.15]">
                                Relive History, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0275FB] via-[#1d4ed8] to-[#FDC908] drop-shadow-sm">
                  Reshape Heritage
                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-[#475569] font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Được sáng lập bởi tập thể kỹ sư trẻ <strong>HistAR Team</strong>, ứng dụng <strong>TimeLens</strong> ra đời với sứ mệnh xóa bỏ sự thụ động của các phương thức truyền đạt lịch sử cũ. Chúng tôi kiến tạo cầu nối công nghệ đưa di sản sống động vào từng phòng học và điểm tham quan.
                            </p>
                            <p className="text-sm text-[#64748B] max-w-2xl mx-auto lg:mx-0">
                                Cổng Thời Gian và phòng nhóm dùng trên web; app mobile tập trung tour tại chỗ và check-in AR.
                            </p>

                            <div className="p-6 rounded-3xl bg-white/90 border-2 border-[#0275FB]/20 shadow-md max-w-2xl text-left space-y-2.5 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-xs font-black text-[#0275FB] uppercase tracking-wider">
                                    <MaterialIcon name="lightbulb" className="text-base text-[#FDC908]" />
                                    <span>Triết Lý Sáng Lập</span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#334155] font-bold italic leading-relaxed">
                                    "TimeLens không đơn thuần cung cấp phần mềm — chúng tôi mang đến giải pháp trải nghiệm di sản hấp dẫn, trực quan và tối ưu chi phí vận hành cho nhà trường cùng ban quản lý di tích. Công nghệ tạo nên trải nghiệm; sự thấu hiểu người dùng kiến tạo giá trị."
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-5 space-y-6">
                            <CuChiRadarWidget />

                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#1E293B] group min-h-[250px] flex flex-col justify-end">
                                <img
                                    src={resolveMediaUrl('/media/banner-main.jpg')}
                                    alt="Địa đạo Củ Chi"
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    onError={(e) => { e.currentTarget.style.opacity = '0.3' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-[#0f1015]/40 to-transparent" />
                                <div className="relative z-10 p-6 text-white flex items-end justify-between">
                                    <div className="space-y-1">
                                        <span className="px-3 py-1 rounded-full bg-[#FDC908] text-black font-black text-[10px] uppercase tracking-wider shadow">Điểm Đến Hạt Nhân Pilot</span>
                                        <h3 className="text-lg font-bold mt-1">Địa Đạo Củ Chi — Đất Thép Thành Đồng</h3>
                                        <p className="text-xs text-gray-300">Tái hiện hệ thống hầm hào 3 tầng thời kỳ 1968 & 2026</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/explore/cu-chi')}
                                        className="w-10 h-10 rounded-full bg-[#0275FB] text-white flex items-center justify-center hover:bg-[#1d4ed8] transition-colors cursor-pointer shrink-0 shadow-lg"
                                    >
                                        <MaterialIcon name="arrow_forward" className="text-base font-bold" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 pt-12 border-t border-[#0275FB]/20">
                        <div className="text-center max-w-3xl mx-auto space-y-3">
                            <span className="text-xs font-black text-[#0275FB] tracking-widest uppercase block bg-[#0275FB]/10 py-1.5 px-4 rounded-full w-max mx-auto border border-[#0275FB]/30">CÔNG NGHỆ TOÀN DIỆN</span>
                            <h2 className="text-3xl sm:text-4xl font-black text-[#1E293B] tracking-tight">Sáu Tầng Kiến Trúc Độc Quyền TimeLens</h2>
                            <p className="text-[#64748B] text-sm sm:text-base font-medium">Sự dung hòa hoàn hảo giữa đồ họa không gian, trí tuệ nhân tạo và kết nối thực địa O2O để chuyển hóa trọn vẹn chuyến tham quan lịch sử.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {PLATFORM_6_LAYERS.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`p-7 rounded-3xl bg-white border-2 border-[#0275FB]/15 transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#0275FB] flex flex-col justify-between space-y-4 group ${item.border}`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="px-2.5 py-1 rounded bg-[#FFF2C3] text-[#92400e] text-[10px] font-mono font-black tracking-widest uppercase border border-[#FDC908]/50">{item.layer}</span>
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-b ${item.bg} border border-[#0275FB]/30 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
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

            {/* MASCOT ĐẠI SỨ THƯƠNG HIỆU */}
            <section className="relative py-24 bg-gradient-to-b from-[#FAF8F3] via-[#FFF2C3]/20 to-[#FAF8F3] border-b border-[#0275FB]/15 overflow-hidden">
                <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-[#FDC908]/15 to-transparent rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-tr from-[#0275FB]/15 to-transparent rounded-full blur-[80px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-5xl mx-auto space-y-4 mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1E293B] tracking-tight leading-tight">
                            Gặp Gỡ <span className="whitespace-nowrap">Sứ Giả Xuyên Không</span> <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] inline-block whitespace-nowrap mt-2">Chrono</span>
                        </h2>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        <div className="w-full lg:w-1/2 flex justify-center items-center min-h-[400px] relative group cursor-pointer">
                            <div className="absolute w-[350px] h-[350px] bg-gradient-to-r from-[#FDC908]/40 to-[#0275FB]/40 rounded-full blur-[70px] animate-pulse"></div>
                            <div className="absolute w-[320px] h-[320px] border-[3px] border-dashed border-[#FDC908]/50 rounded-full animate-[spin_20s_linear_infinite]"></div>
                            <div className="absolute w-[260px] h-[260px] border-[2px] border-dotted border-[#0275FB]/60 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

                            <div className="absolute -top-10 sm:-top-16 bg-white border-2 border-[#0275FB] px-6 py-3.5 rounded-2xl rounded-br-none shadow-[0_10px_25px_rgba(2,117,251,0.3)] opacity-0 group-hover:opacity-100 group-hover:-translate-y-3 transition-all duration-500 z-30 pointer-events-none">
                                <p className="text-sm font-extrabold text-[#1E293B] whitespace-nowrap">
                                    Xin chào! Mình là Chrono 👋 <br/>
                                    <span className="text-[#0275FB]">Mình sẽ đồng hành cùng bạn trong mọi hành trình</span>
                                </p>
                                <div className="absolute -bottom-[9px] right-6 w-4 h-4 bg-white border-b-2 border-r-2 border-[#0275FB] transform rotate-45"></div>
                            </div>

                            <img
                                src={mascotImg}
                                alt="Sứ Giả Xuyên Không Chrono"
                                className="w-80 h-80 sm:w-96 sm:h-96 object-contain drop-shadow-[0_25px_25px_rgba(2,117,251,0.2)] animate-[bounce_4s_ease-in-out_infinite] relative z-20 group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649605.png'
                                }}
                            />
                        </div>

                        <div className="w-full lg:w-1/2 text-center lg:text-left space-y-7 relative z-10">
                            <p className="text-base sm:text-lg text-[#334155] font-medium leading-relaxed">
                                Mang trên mình thiết kế tinh giản, đậm chất công nghệ tương lai nhưng vẫn giữ nét thân thiện, đáng yêu. <strong className="text-[#0275FB]">Chrono</strong> của TimeLens không chỉ là biểu tượng thương hiệu, mà là một 'Người dẫn đường' thực thụ. Được tiếp sức mạnh bởi lõi AI RAG, <strong className="text-[#0275FB]">Chrono</strong> sẽ cùng bạn xuyên không về quá khứ, giải mã các mật lệnh lịch sử và kể cho bạn nghe những câu chuyện hào hùng theo cách hiện đại và chân thực nhất.
                            </p>

                            <div className="p-6 rounded-2xl bg-white/70 border border-[#0275FB]/20 shadow-lg shadow-[#0275FB]/5 backdrop-blur-md text-left relative overflow-hidden group hover:border-[#FDC908]/50 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FFF2C3]/60 to-transparent rounded-bl-full pointer-events-none"></div>
                                <div className="flex items-center gap-2 text-xs font-black text-[#d97706] uppercase tracking-widest mb-3">
                                    <MaterialIcon name="psychology" className="text-xl text-[#0275FB] group-hover:rotate-12 transition-transform" />
                                    <span>Hạt Nhân Sức Mạnh AI RAG</span>
                                </div>
                                <p className="text-sm text-[#475569] leading-relaxed font-semibold relative z-10">
                                    Được truyền năng lượng từ <strong className="text-[#1E293B]">kiến trúc AI RAG (Retrieval-Augmented Generation)</strong>, Chrono sở hữu khả năng truy xuất hàng vạn trang sử liệu đã qua kiểm duyệt gắt gao. Loại bỏ hoàn toàn vấn nạn "ảo giác AI" (hallucination), mọi câu chuyện Chrono kể đều tuyệt đối chuẩn xác, minh bạch nguồn gốc và mang đậm hơi thở của thời đại.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* GIẢI PHÁP CÔNG NGHỆ CORE */}
            <section id="solutions" className="py-24 bg-white border-b border-[#0275FB]/15 scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <span className="text-sm font-black text-[#0275FB] tracking-widest uppercase block bg-[#0275FB]/10 py-1.5 px-4 rounded-full w-max mx-auto border border-[#0275FB]/30">KIẾN TRÚC NỀN TẢNG CÔNG NGHỆ</span>
                        <h2 className="text-3xl sm:text-5xl font-black text-[#1E293B] tracking-tight">Bốn Trụ Cột Công Nghệ Cốt Lõi</h2>
                        <p className="text-[#64748B] text-base font-medium">Hệ thống được thiết kế theo tiêu chuẩn doanh nghiệp, tích hợp mượt mà giữa phần cứng di động và công nghệ đồ họa không gian.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                        <div className="p-10 rounded-3xl bg-gradient-to-br from-[#FAF8F3] to-[#FFF2C3]/30 border-2 border-[#0275FB]/20 hover:border-[#0275FB] transition-all duration-300 flex flex-col justify-between space-y-8 group shadow-sm hover:shadow-2xl hover:-translate-y-1">
                            <div className="space-y-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#0275FB]/15 border border-[#0275FB]/30 flex items-center justify-center text-[#0275FB] group-hover:bg-[#0275FB] group-hover:text-white transition-all shadow-sm">
                                    <MaterialIcon name="view_in_ar" className="text-4xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Không Gian Toàn Cảnh Tour 360°</h3>
                                <p className="text-base text-[#475569] leading-relaxed font-medium">Khám phá toàn diện kiến trúc di tích với độ phân giải cao. Hệ thống điểm chạm (Hotspot) tương tác tự động cung cấp thông tin kiến trúc, tư liệu hình ảnh và thuyết minh âm thanh theo thời gian thực.</p>
                            </div>
                            <div className="pt-6 border-t border-[#0275FB]/20 flex items-center justify-between text-sm font-black text-[#0275FB]">
                                <span>TRẢI NGHIỆM KHÔNG GIỚI HẠN ĐỊA LÝ</span>
                                <MaterialIcon name="arrow_forward" className="text-lg transform group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        <div className="p-10 rounded-3xl bg-gradient-to-br from-[#FAF8F3] to-[#FFF2C3]/30 border-2 border-[#0275FB]/20 hover:border-[#FDC908] transition-all duration-300 flex flex-col justify-between space-y-8 group shadow-sm hover:shadow-2xl hover:-translate-y-1">
                            <div className="space-y-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#FDC908]/20 border border-[#FDC908]/50 flex items-center justify-center text-[#d97706] group-hover:bg-[#FDC908] group-hover:text-black transition-all shadow-sm">
                                    <MaterialIcon name="history_toggle_off" className="text-4xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Cổng Thời Gian Xưa & Nay (Time Portal)</h3>
                                <p className="text-base text-[#475569] leading-relaxed font-medium">Công nghệ đối chiếu hình ảnh đa lớp thời kỳ cho phép trực quan hóa sự chuyển mình lịch sử qua các mốc thời đại (1968 · 2026).</p>
                            </div>
                            <div className="pt-6 border-t border-[#0275FB]/20 flex items-center justify-between text-sm font-black text-[#D97706]">
                                <span>ĐỐI CHIẾU LỊCH SỬ TRỰC QUAN</span>
                                <MaterialIcon name="arrow_forward" className="text-lg transform group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        <div className="p-10 rounded-3xl bg-gradient-to-br from-[#FAF8F3] to-[#FFF2C3]/30 border-2 border-[#0275FB]/20 hover:border-[#0275FB] transition-all duration-300 flex flex-col justify-between space-y-8 group shadow-sm hover:shadow-2xl hover:-translate-y-1">
                            <div className="space-y-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#0275FB]/15 border border-[#0275FB]/30 flex items-center justify-center text-[#0275FB] group-hover:bg-[#0275FB] group-hover:text-white transition-all shadow-sm">
                                    <MaterialIcon name="auto_awesome" className="text-4xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Trợ Lý Lịch Sử AI Chuẩn RAG</h3>
                                <p className="text-base text-[#475569] leading-relaxed font-medium">Tích hợp Trí tuệ Nhân tạo nhập vai các nhân vật lịch sử. Kiến trúc RAG kiểm soát chặt chẽ nguồn dữ liệu đầu vào, tuyệt đối minh bạch tài liệu trích dẫn chuẩn giáo dục.</p>
                            </div>
                            <div className="pt-6 border-t border-[#0275FB]/20 flex items-center justify-between text-sm font-black text-[#0275FB]">
                                <span>MINH BẠCH 100% NGUỒN TƯ LIỆU</span>
                                <MaterialIcon name="arrow_forward" className="text-lg transform group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        <div className="p-10 rounded-3xl bg-gradient-to-br from-[#FAF8F3] to-[#FFF2C3]/30 border-2 border-[#0275FB]/20 hover:border-[#FDC908] transition-all duration-300 flex flex-col justify-between space-y-8 group shadow-sm hover:shadow-2xl hover:-translate-y-1">
                            <div className="space-y-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#FDC908]/20 border border-[#FDC908]/50 flex items-center justify-center text-[#d97706] group-hover:bg-[#FDC908] group-hover:text-black transition-all shadow-sm">
                                    <MaterialIcon name="qr_code_scanner" className="text-4xl" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1E293B]">Hệ Thống Thực Địa O2O & Gamification</h3>
                                <p className="text-base text-[#475569] leading-relaxed font-medium">Kết nối liền mạch giữa trải nghiệm số và tham quan thực tế. Quét mã QR hoặc định vị GPS tại điểm di tích để mở khóa cổ vật AR 3D, tích lũy điểm thưởng XP và chinh phục các huy hiệu di sản.</p>
                            </div>
                            <div className="pt-6 border-t border-[#0275FB]/20 flex items-center justify-between text-sm font-black text-[#D97706]">
                                <span>TƯƠNG TÁC THỰC TẾ TĂNG CƯỜNG</span>
                                <MaterialIcon name="arrow_forward" className="text-lg transform group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SỬ DỤNG COMPONENT FOOTER CHUẨN ĐỒNG NHẤT */}
            <PublicFooter />
        </div>
    )
}