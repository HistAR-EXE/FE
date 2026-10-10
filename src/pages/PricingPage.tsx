// src/pages/PricingPage.tsx
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { resolveMediaUrl } from '../shared/config/env'
import mascotImg from '../assets/mascot.png'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import { billingApi } from '../features/billing/api'
import { useAuth } from '../shared/auth/useAuth'

export const PricingPage: React.FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [b2cPrice, setB2cPrice] = useState(49_000)
    const [journeyPassPrice, setJourneyPassPrice] = useState(29_000)
    const [startingTrial, setStartingTrial] = useState(false)
    const [trialError, setTrialError] = useState<string | null>(null)
    const { isAuthenticated, user, updateUser } = useAuth()
    const next = searchParams.get('next')
    const site = searchParams.get('site') || 'cu-chi'

    const checkoutB2cHref = next
        ? `/checkout/b2c?site=${encodeURIComponent(site)}&next=${encodeURIComponent(next)}`
        : `/checkout/b2c?site=${encodeURIComponent(site)}`
    const checkoutJourneyHref = next
        ? `/checkout/b2c?plan=journey_pass&site=${encodeURIComponent(site)}&next=${encodeURIComponent(next)}`
        : `/checkout/b2c?plan=journey_pass&site=${encodeURIComponent(site)}`
    const checkoutB2bHref = (planId: string) => {
        const returnTo = next || '/teacher'
        return `/checkout/b2b?plan=${planId}&next=${encodeURIComponent(returnTo)}`
    }

    useEffect(() => {
        window.scrollTo(0, 0)
        billingApi.getPublicPricing().then((data) => {
            setB2cPrice(data.b2cPremiumPriceVnd)
            setJourneyPassPrice(data.b2cJourneyPassPriceVnd ?? 29_000)
        }).catch(() => undefined)
    }, [])

    const startClassroomTrial = async () => {
        if (!isAuthenticated || !user) {
            navigate('/login?returnTo=%2Fpricing%23b2b')
            return
        }
        setStartingTrial(true)
        setTrialError(null)
        try {
            const trial = await billingApi.createOrgTrial({
                orgName: `Lớp học của ${user.displayName}`,
                contactEmail: user.email,
            })
            updateUser({
                role: 'TEACHER',
                orgId: trial.organizationId,
                orgName: trial.orgName,
                orgSubscription: 'STANDARD',
            })
            navigate('/teacher')
        } catch {
            setTrialError('Không thể khởi tạo lớp học dùng thử. Vui lòng thử lại hoặc liên hệ hỗ trợ.')
        } finally {
            setStartingTrial(false)
        }
    }

    return (
        <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#0275FB] selection:text-white">
            {/* HEADER NAVIGATION CHUẨN TỪ COMPONENT */}
            <PublicHeader />

            {/* HERO BANNER - NÂNG CẤP ĐỒ HỌA & COPYWRITING (TẬP TRUNG B2C) */}
            <section className="relative pt-36 sm:pt-44 pb-24 overflow-hidden bg-gradient-to-b from-[#FFF2C3]/60 via-[#FAF8F3] to-[#FAF8F3]">
                {/* Background Graphics */}
                <div className="absolute top-10 right-10 w-[600px] h-[600px] bg-[#0275FB]/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FDC908]/15 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(2,117,251,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(2,117,251,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">

                    {/* Cột Trái: Nội dung Text */}
                    <div className="lg:w-3/5 space-y-6 text-center lg:text-left">
                        {/* Nhãn Tagline */}
                        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white border border-[#FDC908] text-[#d97706] text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-shadow cursor-default">
                            <MaterialIcon name="explore" className="text-lg text-[#0275FB] animate-pulse" />
                            <span>Mở Khóa Giới Hạn Không Gian & Thời Gian</span>
                        </div>

                        {/* Tiêu đề chính - Gom trọn vẹn 1 dòng */}
                        <h1 className="text-[1.65rem] sm:text-4xl md:text-5xl lg:text-[3.15rem] xl:text-[3.5rem] font-black text-[#1E293B] tracking-tight leading-[1.2]">
                            {/* Ép toàn bộ câu này nằm trên 1 dòng duy nhất */}
                            <span className="block whitespace-nowrap">
                                Đầu tư vào thế hệ <span className="text-[#0275FB]">tương lai</span>
                            </span>
                            {/* Dòng 2 */}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0275FB] via-[#1d4ed8] to-[#FDC908] inline-block mt-2 sm:mt-4 drop-shadow-sm">
                                Thông Qua Di Sản Số
                            </span>
                        </h1>

                        {/* Mô tả - Hướng đến cá nhân khám phá (B2C) */}
                        <p className="text-[#475569] text-base sm:text-lg font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            TimeLens mang đến đặc quyền du hành xuyên thời gian dành cho những người yêu văn hóa, lịch sử và du lịch. Tận hưởng trọn vẹn không gian thực tế ảo và trợ lý AI thông minh với gói trải nghiệm cá nhân, hoặc khám phá giải pháp số hóa toàn diện cho doanh nghiệp.
                        </p>

                        {/* CHÚ THÍCH CỦA ĐỒNG ĐỘI (Đã được CSS lại cho đẹp mắt và chuẩn UI) */}
                        <p className="text-sm text-[#64748B] font-semibold max-w-2xl mx-auto lg:mx-0 mt-3 italic border-l-4 border-[#FDC908] pl-3 bg-[#FFF2C3]/40 py-2 pr-3 rounded-r-lg shadow-sm">
                            * Lưu ý: Cổng Thời Gian & phòng nhóm chạy trên web; app tập trung tour onsite và check-in AR.
                        </p>

                        
                        <div className="mt-6 max-w-xl mx-auto lg:mx-0 rounded-2xl border border-emerald-500/40 bg-emerald-50 px-5 py-4 text-left shadow-sm">
                            <Link
                                to={checkoutJourneyHref}
                                className="inline-flex items-center gap-2 text-emerald-700 text-sm font-black"
                                data-testid="pricing-journey-pass"
                            >
                                Journey Pass 72h · {journeyPassPrice.toLocaleString('vi-VN')}đ · site {site}
                            </Link>
                            <ul className="mt-3 space-y-1.5 text-xs text-emerald-800/90 font-medium">
                                <li>Mở chương truyện 3–6 và nguồn trích dẫn RAG tại site đã mua</li>
                                <li>Chat vẫn theo hạn mức miễn phí/ngày — không phải chat không giới hạn</li>
                                <li>Muốn chat vô hạn + mọi pilot: chọn Premium bên dưới</li>
                            </ul>
                            <Link to="/checkout/b2b2c" className="mt-3 inline-flex text-xs font-bold uppercase tracking-wider text-[#0275FB] hover:underline" data-testid="pricing-b2b2c-link">
                                Hợp tác BQL / trường học (B2B2C)
                            </Link>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                            <a href="#b2c-pricing" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] text-white font-black text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(2,117,251,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer">
                                <span>Xem Gói Cá Nhân</span>
                                <MaterialIcon name="arrow_downward" className="text-lg" />
                            </a>
                            <a href="#b2b-pricing" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border-2 border-[#0275FB]/20 text-[#0275FB] font-black text-sm uppercase tracking-wider hover:bg-[#0275FB]/5 hover:border-[#0275FB]/50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                                <MaterialIcon name="business" className="text-lg text-[#FDC908]" />
                                <span>Giải Pháp Tổ Chức</span>
                            </a>
                        </div>
                    </div>

                    {/* Cột Phải: Mascot Bay */}
                    <div className="lg:w-2/5 flex justify-center lg:justify-end relative mt-12 lg:mt-0">
                        {/* Vòng sáng hào quang động phía sau Mascot */}
                        <div className="absolute w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] bg-gradient-to-tr from-[#FDC908]/50 to-[#0275FB]/40 rounded-full blur-[70px] animate-[pulse_4s_ease-in-out_infinite]"></div>

                        {/* Hình ảnh Mascot bay */}
                        <img
                            src={resolveMediaUrl('/mascot-2.png')}
                            alt="Chrono Mascot Bay"
                            className="w-72 h-72 sm:w-96 sm:h-96 object-contain relative z-20 drop-shadow-[0_20px_40px_rgba(2,117,251,0.3)] animate-[bounce_5s_ease-in-out_infinite]"
                            onError={(e) => { e.currentTarget.src = mascotImg }}
                        />
                    </div>
                </div>
            </section>

            {/* PHÂN KHÚC KHÁCH HÀNG CÁ NHÂN (B2C) - SẢN PHẨM TRỌNG TÂM */}
            <section id="b2c-pricing" className="py-24 bg-[#FAF8F3] relative z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <span className="text-sm font-black text-[#0275FB] tracking-widest uppercase block bg-[#0275FB]/10 py-1.5 px-5 rounded-full w-max mx-auto border border-[#0275FB]/20 shadow-sm">
                            KHÁM PHÁ CÁ NHÂN (B2C)
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-[#1E293B] tracking-tight leading-tight">
                            Hành Trình Dành Cho <span className="whitespace-nowrap text-[#0275FB]">Đam Mê Khám Phá Di Sản</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                        {/* GÓI MIỄN PHÍ - BÊN TRÁI (Nhỏ hơn một chút để tôn gói Premium) */}
                        <div className="lg:col-span-5 p-8 sm:p-10 rounded-3xl bg-white border border-[#CBD5E1] shadow-md flex flex-col justify-between hover:shadow-xl hover:border-[#0275FB]/40 transition-all duration-300 group">
                            <div className="space-y-6">
                                <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-[#64748B] group-hover:bg-[#0275FB]/10 group-hover:text-[#0275FB] transition-colors">
                                    <MaterialIcon name="volunteer_activism" className="text-3xl" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#1E293B]">Bản Miễn Phí (Freemium)</h3>
                                    <p className="text-[#64748B] mt-2 font-medium text-sm">Trải nghiệm không gian văn hóa số ở mức độ cơ bản.</p>
                                </div>
                                <div className="mt-4 flex items-baseline gap-1.5">
                                    <span className="text-4xl font-black text-[#1E293B]">0đ</span>
                                    <span className="text-sm font-bold text-[#64748B]">/ mãi mãi</span>
                                </div>
                                <ul className="space-y-5 text-sm font-medium text-[#475569] pt-4 border-t border-[#F1F5F9]">
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="ar_on_you" className="text-[#94A3B8] text-xl shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">Quét và xem mô phỏng AR giới hạn (tối đa 3 địa danh).</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="chat" className="text-[#94A3B8] text-xl shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">Trò chuyện cùng AI Chrono (tối đa 5 câu hỏi/ngày), không kèm trích dẫn nguồn.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="groups" className="text-[#94A3B8] text-xl shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">Đọc bài viết chia sẻ từ cộng đồng lịch sử.</span>
                                    </li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/login')} className="mt-8 w-full py-3.5 rounded-xl bg-[#F1F5F9] text-[#475569] font-black text-sm uppercase tracking-wider hover:bg-[#E2E8F0] transition-colors">
                                Bắt Đầu Miễn Phí
                            </button>
                        </div>

                        {/* GÓI PREMIUM - BÊN PHẢI (To hơn, rực rỡ hơn) */}
                        <div className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-white via-[#FFF2C3]/40 to-[#0275FB]/5 border-2 border-[#FDC908] shadow-[0_15px_50px_rgba(2,117,251,0.15)] relative overflow-hidden transform lg:scale-105 z-10 flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-500">
                            {/* Ruy băng "Khuyên Dùng" */}
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#FDC908] to-[#d97706] text-white text-[11px] font-black uppercase tracking-widest px-6 py-2 rounded-bl-2xl shadow-md">Đặc Quyền Vô Hạn</div>

                            {/* Hiệu ứng chìm */}
                            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#0275FB]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#0275FB]/10 transition-colors"></div>

                            <div className="space-y-6 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0275FB] to-[#1d4ed8] flex items-center justify-center text-white shadow-lg shadow-[#0275FB]/30">
                                    <MaterialIcon name="workspace_premium" className="text-3xl text-[#FDC908]" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-[#0275FB]">Đặc Quyền Premium</h3>
                                    <p className="text-[#475569] mt-2 font-medium text-base">Hành trang hoàn hảo cho những chuyến du lịch và khám phá kiến thức chuyên sâu.</p>
                                </div>
                                <div className="mt-4 flex items-baseline gap-1.5">
                                    <span className="text-5xl font-black text-[#0275FB] drop-shadow-sm">{`${b2cPrice.toLocaleString('vi-VN')}đ`}</span>
                                    <span className="text-base font-bold text-[#64748B]">/ tháng</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm font-semibold text-[#1E293B] pt-6 border-t border-[#0275FB]/15">
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5 drop-shadow-sm" />
                                        <span className="leading-relaxed"><strong>Mở khóa toàn bộ</strong> kho tàng bản đồ di sản 3D & Time Portal.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5 drop-shadow-sm" />
                                        <span className="leading-relaxed"><strong>Hỏi đáp AI 24/7 vô hạn</strong> kèm minh chứng tài liệu xác thực.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5 drop-shadow-sm" />
                                        <span className="leading-relaxed">Tham gia <strong>Nhiệm vụ (Quests)</strong> thực địa để nhận phần thưởng.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5 drop-shadow-sm" />
                                        <span className="leading-relaxed">Tích lũy <strong>Hộ chiếu số (Digital Passport)</strong> và thẻ Cổ vật Độc quyền.</span>
                                    </li>
                                </div>
                            </div>
                            <button onClick={() => navigate(checkoutB2cHref)} className="mt-10 w-full py-4 rounded-xl bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] hover:scale-[1.02] text-white font-black text-sm uppercase tracking-wider transition-all shadow-[0_8px_25px_rgba(2,117,251,0.4)] cursor-pointer relative z-10">
                                Đăng Ký Premium Ngay
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* B2B Segment: Software/Service Package Licensing Model */}
            <section id="b2b-pricing" className="py-24 bg-white border-t border-[#0275FB]/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-2 border-[#0275FB]/10">
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center justify-center lg:justify-start gap-2 px-4 py-2 rounded-full bg-[#FDC908]/10 border border-[#FDC908]/30 text-[#d97706] font-black text-xs uppercase tracking-wider w-max mx-auto lg:mx-0 mb-4 shadow-sm">
                                <MaterialIcon name="business" className="text-base" />
                                <span>Giải Pháp Doanh Nghiệp & Giáo Dục (B2B)</span>
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-[#1E293B]">Software Package Licensing Model</h3>
                            <p className="text-base text-[#475569] mt-3 max-w-3xl font-medium leading-relaxed">Giải pháp phần mềm chuyển đổi số toàn diện dành cho Ban quản lý Di tích, Bảo tàng và Hệ thống Trường học. Cấp phát hàng loạt tài khoản Sub-accounts quản lý dễ dàng.</p>
                        </div>
                        <div className="relative shrink-0 group mx-auto lg:mx-0">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0275FB] to-[#FDC908] rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                            <div className="relative px-6 py-4 bg-white rounded-xl flex items-center text-sm font-bold text-[#334155] shadow-lg border border-[#0275FB]/20">
                                <span>
                                    Chính sách <strong className="text-transparent bg-clip-text bg-gradient-to-r from-[#0275FB] to-[#D97706] font-black text-lg px-1.5 drop-shadow-sm">Volume Discount (30 - 40%)</strong> cho chuỗi hệ thống.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#0275FB]/20 bg-[#0275FB]/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="font-black text-[#1E293B]">Dành cho giáo viên muốn thử nghiệm cùng lớp</p>
                            <p className="text-sm text-[#475569]">Kích hoạt Standard trong 14 ngày; bạn có thể dừng trước khi mua gói tổ chức.</p>
                            {trialError && <p role="alert" className="mt-1 text-sm font-semibold text-red-700">{trialError}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={() => void startClassroomTrial()}
                            disabled={startingTrial}
                            className="shrink-0 rounded-xl bg-[#0275FB] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                        >
                            {startingTrial ? 'Đang khởi tạo…' : 'Dùng thử lớp học 14 ngày'}
                        </button>
                    </div>

                    {/* 3 Pricing Cards B2B */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
                        {/* GÓI 1: MICRO */}
                        <div className="p-8 rounded-3xl bg-[#FAF8F3] border border-[#CBD5E1] hover:border-[#0275FB]/50 transition-all flex flex-col justify-between shadow-sm hover:shadow-xl space-y-8 group">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1.5 rounded-lg bg-white text-[#64748B] font-black text-xs uppercase tracking-wider border border-[#E2E8F0]">Small Sub-plan</span>
                                    <MaterialIcon name="devices" className="text-3xl text-[#64748B] group-hover:text-[#0275FB] transition-colors" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-[#1E293B]">Micro Package</h4>
                                    <div className="mt-2 flex items-baseline gap-1.5"><span className="text-3xl font-black text-[#1E293B]">8.000.000đ</span><span className="text-xs font-bold text-[#64748B]">/ năm</span></div>
                                </div>
                                <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 text-sm font-bold text-[#334155]">
                                    <div className="flex justify-between border-b border-[#F1F5F9] pb-2"><span>Tài khoản Member:</span> <span className="text-[#0275FB] font-black">Tối đa 100</span></div>
                                    <div className="flex justify-between pt-1"><span>Đồng thời (CCU):</span> <span className="text-[#0275FB] font-black">15 CCU</span></div>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs font-black text-[#64748B] uppercase mb-4 tracking-wide">Tính năng & Giới hạn:</p>
                                    <ul className="space-y-4 text-sm font-semibold text-[#475569]">
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#94A3B8] group-hover:text-[#0275FB] text-xl shrink-0 mt-0.5 transition-colors" />
                                            <span className="leading-snug"><strong>Thừa hưởng B2C Premium:</strong> Khám phá di sản, tương tác AR & Cổng thời gian.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#94A3B8] group-hover:text-[#0275FB] text-xl shrink-0 mt-0.5 transition-colors" />
                                            <span className="leading-snug">Hệ thống AI RAG: Giới hạn tổng <strong className="text-[#1E293B]">5.000 queries/tháng</strong> cho toàn tổ chức.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <button onClick={() => navigate(checkoutB2bHref('MICRO'))} className="mt-8 w-full py-4 rounded-xl bg-white border-2 border-[#CBD5E1] group-hover:border-[#0275FB] group-hover:bg-[#0275FB] group-hover:text-white text-[#475569] font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-sm">Chọn Gói</button>
                        </div>

                        {/* GÓI 2: STANDARD (HERO B2B) */}
                        <div className="p-8 rounded-3xl bg-gradient-to-b from-[#0275FB]/5 via-white to-white border-2 border-[#0275FB] transition-all flex flex-col justify-between shadow-xl relative scale-100 md:scale-105 z-10 space-y-8 hover:-translate-y-2 duration-500">
                            <div className="absolute -top-4 inset-x-0 flex justify-center">
                                <span className="px-5 py-1.5 rounded-full bg-[#0275FB] text-white font-black text-[11px] tracking-widest uppercase shadow-md border border-[#0275FB]">
                                    Tiêu Chuẩn Doanh Nghiệp
                                </span>
                            </div>
                            <div className="space-y-6 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1.5 rounded-lg bg-white text-[#0275FB] font-black text-xs uppercase tracking-wider border border-[#0275FB]/30 shadow-sm">The Hero Product</span>
                                    <MaterialIcon name="hub" className="text-3xl text-[#0275FB]" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-[#1E293B]">Standard Package</h4>
                                    <div className="mt-2 flex items-baseline gap-1.5"><span className="text-4xl font-black text-[#0275FB]">15.000.000đ</span><span className="text-xs font-bold text-[#64748B]">/ năm</span></div>
                                </div>
                                <div className="p-5 rounded-xl bg-white border border-[#0275FB]/20 shadow-sm space-y-2 text-sm font-bold text-[#1e293b]">
                                    <div className="flex justify-between border-b border-[#0275FB]/10 pb-2"><span>Tài khoản Member:</span> <span className="text-[#0275FB] font-black">Tối đa 400</span></div>
                                    <div className="flex justify-between pt-1"><span>Đồng thời (CCU):</span> <span className="text-[#0275FB] font-black">40 CCU</span></div>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs font-black text-[#0275FB] uppercase mb-4 tracking-wide">Tính năng nâng cao:</p>
                                    <ul className="space-y-4 text-sm font-semibold text-[#334155]">
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5" />
                                            <span className="leading-snug">Sở hữu <strong>toàn bộ tính năng Core</strong> di sản số hóa của nền tảng.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5" />
                                            <span className="leading-snug">Hoạt động nhóm <strong>Multiplayer (Quest Room):</strong> Lập đội giải đố lịch sử thực địa.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#0275FB] text-xl shrink-0 mt-0.5" />
                                            <span className="leading-snug">Bể phóng AI Pool Mở rộng: Nâng lên <strong className="text-[#1E293B]">30.000 queries/tháng</strong>.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <button onClick={() => navigate(checkoutB2bHref('STANDARD') + '&licenses=3')} className="mt-8 w-full py-4 rounded-xl bg-[#0275FB] hover:bg-[#1d4ed8] text-white font-black text-sm uppercase tracking-wider transition-all shadow-[0_5px_20px_rgba(2,117,251,0.3)] cursor-pointer">
                                Triển Khai Tiêu Chuẩn
                            </button>
                        </div>

                        {/* GÓI 3: PREMIUM B2B (UPSELL) */}
                        <div className="p-8 rounded-3xl bg-[#FAF8F3] border border-[#CBD5E1] hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-sm hover:shadow-xl space-y-8 group">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1.5 rounded-lg bg-white text-emerald-700 font-black text-xs uppercase tracking-wider border border-emerald-200">The Upsell Product</span>
                                    <MaterialIcon name="admin_panel_settings" className="text-3xl text-[#64748B] group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-[#1E293B]">Premium Package</h4>
                                    <div className="mt-2 flex items-baseline gap-1.5"><span className="text-3xl font-black text-emerald-600">25.000.000đ</span><span className="text-xs font-bold text-[#64748B]">/ năm</span></div>
                                </div>
                                <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 text-sm font-bold text-[#334155]">
                                    <div className="flex justify-between border-b border-[#F1F5F9] pb-2"><span>Tài khoản Member:</span> <span className="text-emerald-600 font-black">Tối đa 1.000</span></div>
                                    <div className="flex justify-between pt-1"><span>Đồng thời (CCU):</span> <span className="text-emerald-600 font-black">80 CCU</span></div>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs font-black text-[#64748B] group-hover:text-emerald-600 transition-colors uppercase mb-4 tracking-wide">Tính năng tối thượng:</p>
                                    <ul className="space-y-4 text-sm font-semibold text-[#475569]">
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#94A3B8] group-hover:text-emerald-500 text-xl shrink-0 mt-0.5 transition-colors" />
                                            <span className="leading-snug"><strong>Mở khóa 100% quyền truy cập</strong> không giới hạn hệ sinh thái hiện tại & tương lai.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#94A3B8] group-hover:text-emerald-500 text-xl shrink-0 mt-0.5 transition-colors" />
                                            <span className="leading-snug">Hệ thống quản lý <strong>B2B Dashboard</strong>: Giao nhiệm vụ, xem heatmap & xuất báo cáo.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="check_circle" className="text-[#94A3B8] group-hover:text-emerald-500 text-xl shrink-0 mt-0.5 transition-colors" />
                                            <span className="leading-snug"><strong>LMS Premium</strong>: giao bài quest, theo dõi tiến độ và xuất báo cáo lớp học.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <button onClick={() => navigate(checkoutB2bHref('PREMIUM'))} className="mt-8 w-full py-4 rounded-xl bg-white border-2 border-[#CBD5E1] group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white text-[#475569] font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-sm">
                                Đăng Ký Toàn Diện
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* SỬ DỤNG COMPONENT FOOTER CHUẨN ĐỒNG NHẤT */}
            <PublicFooter />
        </div>
    )
}
