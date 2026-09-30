// src/pages/AboutPage.tsx
import React, { useState, useEffect } from 'react'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { resolveMediaUrl } from '../shared/config/env'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'

const EXECUTIVE_TEAM = [
    { name: 'Nguyễn Thái Quân', title: 'Chief Executive Officer (CEO)', role: 'Project Manager', image: '/brand/team/quan-ceo.jpg' },
    { name: 'Đặng Thuận Phát', title: 'Chief Technology Officer (CTO)', role: 'Full-stack Developer', image: '/brand/team/phat-cto.jpg' },
    { name: 'Trần Ngọc Thảo My', title: 'Chief Financial Officer (CFO)', role: 'Finance Analyst', image: '/brand/team/my-cfo.jpg' },
    { name: 'Nguyễn Quốc Huy', title: 'Chief Operating Officer (COO)', role: 'Full-stack Developer', image: '/brand/team/huy-coo.jpg' },
    { name: 'Nguyễn Kỳ Vỹ', title: 'Chief Product Officer (CPO)', role: 'UI/UX & Graphic Designer', image: '/brand/team/vy-cpo.jpg' },
    { name: 'Lê Vĩnh Hảo', title: 'Chief Marketing Officer (CMO)', role: 'Marketing Manager', image: '/brand/team/hao-cmo.jpg' },
]

const ECOSYSTEM = [
    { title: 'PHÒNG TRẢI NGHIỆM THỰC TẾ ẢO (WEBAR 3D)', desc: 'Trải nghiệm không gian di tích được phục dựng bằng công nghệ Parallax 2.5D và WebAR 3D. Hệ thống định vị GPS tự động kích hoạt mô hình tại không gian thực, mang đến cảm giác nhập vai chân thực nhất cho học sinh và du khách mà không cần cài đặt ứng dụng phức tạp.' },
    { title: 'TRỢ LÝ AI CHRONO XUYÊN KHÔNG', desc: 'Được huấn luyện trên kiến trúc RAG với kho tàng sử liệu chính thống, Chrono có khả năng giải đáp mọi thắc mắc lịch sử, cung cấp trích dẫn nguồn tài liệu chuẩn xác, loại bỏ hoàn toàn vấn nạn ảo giác AI (Hallucination).' },
    { title: 'HỆ THỐNG GAMIFICATION & O2O', desc: 'Biến chuyến tham quan thành cuộc truy tìm kho báu thực tế. Thu thập thẻ cổ vật (Pokédex), giải mã mật lệnh lịch sử tại điểm đến và nâng cấp thẻ định danh Digital Passport cá nhân.' },
    { title: 'BẢNG ĐIỀU KHIỂN QUẢN TRỊ (B2B DASHBOARD)', desc: 'Giải pháp toàn diện dành cho Ban giám hiệu nhà trường và Ban quản lý di tích. Hệ thống cung cấp bản đồ nhiệt (Heatmap) về hành vi tương tác, hỗ trợ giao bài tập và chấm điểm tự động.' },
]

export const AboutPage: React.FC = () => {
    // Đã thay đổi thành -1 để đóng tab Hệ sinh thái mặc định khi load trang
    const [activeEcosystem, setActiveEcosystem] = useState<number>(-1)

    // Đảm bảo trang luôn hiển thị từ trên cùng khi mới truy cập
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#0275FB] selection:text-white">

            {/* SỬ DỤNG COMPONENT HEADER CHUẨN */}
            <PublicHeader />

            {/* SECTION 1: HERO GIỚI THIỆU */}
            <section className="relative pt-40 pb-20 overflow-hidden min-h-[60vh] flex items-center justify-center">
                <img
                    src={resolveMediaUrl('/media/about-hero-bg.png')}
                    alt="HistAR Hero Background"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-multiply"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFF2C3]/80 via-[#FAF8F3]/90 to-[#FAF8F3] backdrop-blur-[2px]"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0275FB]/15 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FDC908]/15 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10 w-full mt-8">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-[#0275FB] via-[#1d4ed8] to-[#FDC908] drop-shadow-sm">
                        Tự Hào - Trách Nhiệm - Sẵn Sàng Bứt Phá
                    </h1>

                    <div className="mt-12 flex flex-col items-center justify-center space-y-4 w-full">
                        <div className="w-full max-w-7xl border-t-2 border-[#0275FB]/20 pt-8">
                            <ul className="flex flex-row justify-center items-center gap-3 md:gap-6 lg:gap-10 text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-[#1E293B] w-full px-2">
                                <li>
                                    <a href="#mission" className="hover:text-[#0275FB] transition-colors flex items-center gap-1.5 lg:gap-3 whitespace-nowrap">
                                        <span className="w-2 h-2 lg:w-3.5 lg:h-3.5 rounded-full bg-[#0275FB] shadow-[0_0_10px_#0275FB] animate-pulse shrink-0"></span>
                                        <span className="text-[#0275FB]">01</span> Tầm nhìn - Sứ mệnh - Giá trị cốt lõi
                                    </a>
                                </li>
                                <li>
                                    <a href="#timeline" className="hover:text-[#0275FB] transition-colors flex items-center gap-1.5 lg:gap-3 whitespace-nowrap">
                                        <span className="w-2 h-2 lg:w-3.5 lg:h-3.5 rounded-full bg-[#FDC908] shadow-[0_0_10px_#FDC908] animate-pulse shrink-0"></span>
                                        <span className="text-[#0275FB]">02</span> Hành trình phát triển
                                    </a>
                                </li>
                                <li>
                                    <a href="#team" className="hover:text-[#0275FB] transition-colors flex items-center gap-1.5 lg:gap-3 whitespace-nowrap">
                                        <span className="w-2 h-2 lg:w-3.5 lg:h-3.5 rounded-full bg-[#0275FB] shadow-[0_0_10px_#0275FB] animate-pulse shrink-0"></span>
                                        <span className="text-[#0275FB]">03</span> Đội ngũ sáng lập
                                    </a>
                                </li>
                                <li>
                                    <a href="#ecosystem" className="hover:text-[#0275FB] transition-colors flex items-center gap-1.5 lg:gap-3 whitespace-nowrap">
                                        <span className="w-2 h-2 lg:w-3.5 lg:h-3.5 rounded-full bg-[#FDC908] shadow-[0_0_10px_#FDC908] animate-pulse shrink-0"></span>
                                        <span className="text-[#0275FB]">04</span> Hệ sinh thái Timelens
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2: TẦM NHÌN - SỨ MỆNH - GIÁ TRỊ CỐT LÕI */}
            <section id="mission" className="py-20 bg-white scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

                    <div className="mb-10 text-center lg:text-left">
                        <span className="text-sm sm:text-base font-black text-[#d97706] tracking-widest uppercase inline-block bg-[#FFF2C3] py-2 px-6 rounded-full border border-[#FDC908] shadow-md">
                            01 / Tầm Nhìn - Sứ Mệnh - Giá Trị Cốt Lõi
                        </span>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2 space-y-8">
                            <h2 className="text-4xl sm:text-5xl font-black text-[#1E293B] leading-tight">
                                Xóa bỏ khoảng cách giữa <span className="bg-[#0275FB] text-white px-2 rounded-lg leading-relaxed inline-block mt-1 transform -rotate-1 shadow-md">lịch sử khô khan</span> và thế hệ trẻ.
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-[#D97706] mb-2 flex items-center gap-2"><MaterialIcon name="visibility" /> Tầm Nhìn</h3>
                                    <p className="text-base font-medium text-[#475569] leading-relaxed">
                                        Trở thành nền tảng EdTech tiên phong tại Việt Nam và khu vực trong việc số hóa di sản văn hóa, ứng dụng công nghệ thực tế ảo và AI để định hình lại phương pháp giáo dục lịch sử.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#0275FB] mb-2 flex items-center gap-2"><MaterialIcon name="rocket_launch" /> Sứ Mệnh</h3>
                                    <p className="text-base font-medium text-[#475569] leading-relaxed">
                                        Với sức mạnh của Trí tuệ nhân tạo (AI RAG) kết hợp cùng công nghệ Đồ họa Không gian (WebAR 3D), HistAR Team mang đến một trải nghiệm "xuyên không" hoàn toàn mới, biến mỗi di tích thành một bảo tàng sống động, dễ tiếp cận cho mọi lứa tuổi.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative mt-10 lg:mt-0">
                            <div className="absolute inset-0 bg-[#FDC908]/20 rounded-3xl transform rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
                            <img
                                src={resolveMediaUrl('/media/vision-edtech-ar.png')}
                                alt="Học sinh tương tác với Di sản AR"
                                className="relative z-10 rounded-3xl shadow-2xl object-cover w-full h-[400px] sm:h-[450px] hover:-translate-y-2 transition-transform duration-500"
                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1000&auto=format&fit=crop' }}
                            />
                            <div className="absolute -bottom-6 -left-4 sm:-left-6 bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl shadow-2xl z-20 border-2 border-[#0275FB]/20 flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#0275FB] to-[#1d4ed8] rounded-xl flex items-center justify-center text-white shadow-md">
                                    <MaterialIcon name="school" className="text-2xl"/>
                                </div>
                                <div>
                                    <p className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider mb-0.5">Mô hình giáo dục</p>
                                    <p className="text-sm sm:text-base font-black text-[#1E293B]">EdTech <span className="text-[#FDC908]">x</span> Heritage</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 mt-4 border-t border-[#0275FB]/15">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                                <MaterialIcon name="diamond" /> Giá Trị Cốt Lõi
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="space-y-4 border-t-4 border-[#0275FB] pt-6">
                                <MaterialIcon name="biotech" className="text-4xl text-[#0275FB]" />
                                <h3 className="text-xl font-black text-[#1E293B] uppercase">Công Nghệ Tiên Phong</h3>
                                <p className="text-sm font-medium text-[#475569] leading-relaxed">Ứng dụng AI RAG đột phá để giải quyết ảo giác mô hình ngôn ngữ lớn, kết hợp WebAR định vị GPS tạo ra tương tác trực quan ngay tại thực địa.</p>
                            </div>
                            <div className="space-y-4 border-t-4 border-[#FDC908] pt-6">
                                <MaterialIcon name="verified_user" className="text-4xl text-[#D97706]" />
                                <h3 className="text-xl font-black text-[#1E293B] uppercase">Tôn Trọng Di Sản</h3>
                                <p className="text-sm font-medium text-[#475569] leading-relaxed">Mọi dữ liệu phục dựng không gian và nội dung truyền tải đều được số hóa chặt chẽ, đề cao tính chính xác và tôn trọng cội nguồn văn hóa.</p>
                            </div>
                            <div className="space-y-4 border-t-4 border-emerald-500 pt-6">
                                <MaterialIcon name="diversity_3" className="text-4xl text-emerald-600" />
                                <h3 className="text-xl font-black text-[#1E293B] uppercase">Gamification Tích Cực</h3>
                                <p className="text-sm font-medium text-[#475569] leading-relaxed">Biến hành trình khám phá thành trò chơi giải đố, khuyến khích giới trẻ chủ động vận động, tương tác và học hỏi liên tục.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 3: HÀNH TRÌNH PHÁT TRIỂN */}
            <section id="timeline" className="py-24 bg-[#0275FB] text-white scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="mb-10 text-center lg:text-left">
                        <span className="text-sm sm:text-base font-black text-[#d97706] tracking-widest uppercase inline-block bg-[#FFF2C3] py-2 px-6 rounded-full border border-[#FDC908] shadow-md">
                            02 / Hành trình phát triển
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="space-y-4">
                            <h3 className="text-5xl font-black text-white">04/2026</h3>
                            <p className="text-sm font-medium text-blue-100 leading-relaxed pr-6">Nhen nhóm ý tưởng số hóa văn hóa tại Đại học FPT. Bắt đầu nghiên cứu giải pháp và thiết kế hệ thống Core RAG AI.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-5xl font-black text-white">07/2026</h3>
                            <p className="text-sm font-medium text-blue-100 leading-relaxed pr-6">Chính thức bắt tay xây dựng mã nguồn (Front-end & Back-end). Áp dụng mô hình thiết kế WebAR và Parallax 2.5D.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-5xl font-black text-white">09/2026</h3>
                            <p className="text-sm font-medium text-blue-100 leading-relaxed pr-6">Triển khai & nghiên cứu phát triển dự án. Ra mắt bản Pilot thử nghiệm thực tế với điểm đến hạt nhân là Địa đạo Củ Chi.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 4: ĐỘI NGŨ SÁNG LẬP */}
            <section id="team" className="py-24 bg-white scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <span className="text-sm sm:text-base font-black text-[#d97706] tracking-widest uppercase inline-block bg-[#FFF2C3] py-2 px-6 rounded-full border border-[#FDC908] shadow-md">
                            03 / ĐỘI NGŨ SÁNG LẬP
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1E293B] tracking-tight whitespace-nowrap">
                            Ban Lãnh Đạo HistAR Team
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-5">
                        {EXECUTIVE_TEAM.map((exec, idx) => (
                            <div key={idx} className="group cursor-pointer flex flex-col items-center text-center w-full">
                                <div className="bg-[#FAF8F3] rounded-2xl overflow-hidden aspect-[3/4] w-full relative mb-3 border-2 border-transparent group-hover:border-[#0275FB]/30 transition-all shadow-sm group-hover:shadow-md">
                                    <div className="absolute inset-0 bg-[#0275FB]/5 group-hover:bg-transparent transition-colors z-10"></div>
                                    <img src={exec.image} alt={exec.name} className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + exec.name + '&background=0275FB&color=fff&size=512' }} />
                                </div>

                                <h3 className="text-xs sm:text-sm font-black text-[#1E293B] group-hover:text-[#0275FB] transition-colors leading-tight whitespace-nowrap">
                                    {exec.name}
                                </h3>

                                <p className="text-[8.5px] lg:text-[9px] xl:text-[10px] font-black text-[#D97706] mt-1.5 uppercase tracking-tighter whitespace-nowrap">
                                    {exec.title}
                                </p>

                                <p className="text-[8.5px] lg:text-[9px] xl:text-[10px] font-bold text-[#64748B] mt-0.5 uppercase tracking-tighter whitespace-nowrap">
                                    {exec.role}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5: HỆ SINH THÁI TIMELENS */}
            <section id="ecosystem" className="py-24 bg-[#FAF8F3] border-t border-[#0275FB]/15 scroll-mt-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="mb-8 text-center sm:text-left">
                        <span className="text-sm sm:text-base font-black text-[#d97706] tracking-widest uppercase inline-block bg-[#FFF2C3] py-2 px-6 rounded-full border border-[#FDC908] shadow-md">
                            04 / HỆ SINH THÁI TIMELENS
                        </span>
                    </div>
                    <div className="space-y-2">
                        {ECOSYSTEM.map((item, idx) => (
                            <div key={idx} className="border-b-2 border-[#0275FB]/20 overflow-hidden">
                                <button
                                    onClick={() => setActiveEcosystem(activeEcosystem === idx ? -1 : idx)}
                                    className="w-full py-6 flex items-center justify-between text-left group"
                                >
                                    <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight transition-colors ${activeEcosystem === idx ? 'text-[#0275FB]' : 'text-[#1E293B] group-hover:text-[#0275FB]'}`}>
                                        {item.title}
                                    </h3>
                                    <MaterialIcon name={activeEcosystem === idx ? "expand_less" : "expand_more"} className={`text-3xl transition-transform ${activeEcosystem === idx ? 'text-[#0275FB]' : 'text-[#64748B]'}`} />
                                </button>
                                <div className={`transition-all duration-300 ease-in-out ${activeEcosystem === idx ? 'max-h-60 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-base text-[#475569] font-medium leading-relaxed pr-8">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SỬ DỤNG COMPONENT FOOTER CHUẨN (KHÔNG TRUYỀN PROPS ĐỂ MỞ PAGE RIÊNG) */}
            <PublicFooter />
        </div>
    )
}