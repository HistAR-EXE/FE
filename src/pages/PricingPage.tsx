// src/pages/PricingPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { billingApi, type OrgPlanInfo } from '../features/billing/api'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'

function formatCurrency(amount: number) {
    return `${amount.toLocaleString('vi-VN')}đ`
}

function formatAi(limit: number | null) {
    return limit == null ? 'Không giới hạn' : `${limit.toLocaleString('vi-VN')}/tháng`
}

// Bỏ các từ B2C, B2B thay bằng ngôn từ hướng người dùng (User-centric)
const ORG_EXTRAS: Record<string, { icon: string, color: string, text: React.ReactNode }[]> = {
    MICRO: [
        { icon: 'check_circle', color: 'text-[#FE951C]', text: <span className="leading-snug"><strong>Học sinh hưởng Đặc Quyền Premium:</strong> Khám phá di sản, tương tác AR & mở khóa Cổng thời gian.</span> },
        { icon: 'check_circle', color: 'text-[#FE951C]', text: <span className="leading-snug">Bể phóng AI Pool: Giới hạn tổng <strong className="text-white">5.000 queries/tháng</strong> cho toàn bộ trường.</span> }
    ],
    STANDARD: [
        { icon: 'check_circle', color: 'text-[#1A79E5]', text: <span className="leading-snug">Sở hữu <strong>toàn bộ tính năng Core</strong> di sản số hóa của nền tảng.</span> },
        { icon: 'check_circle', color: 'text-[#1A79E5]', text: <span className="leading-snug">Học nhóm <strong>Multiplayer (Quest Room):</strong> Lập đội trong AR giải đố lịch sử sinh động.</span> },
        { icon: 'check_circle', color: 'text-[#1A79E5]', text: <span className="leading-snug">Bể phóng AI Pool Mở rộng: Nâng lên <strong className="text-white">30.000 queries/tháng</strong>.</span> }
    ],
    PREMIUM: [
        { icon: 'check_circle', color: 'text-[#059669]', text: <span className="leading-snug"><strong>Mở khóa 100% quyền truy cập</strong> không giới hạn hệ sinh thái hiện tại & tương lai.</span> },
        { icon: 'check_circle', color: 'text-[#059669]', text: <span className="leading-snug">Hệ thống quản lý <strong>Teacher Dashboard</strong>: Giao bài tập AR, chấm điểm tự động & báo cáo.</span> }
    ]
}

export function PricingPage() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [searchParams] = useSearchParams()
    const [b2cPrice, setB2cPrice] = useState(79_000)
    const [chatDailyLimit, setChatDailyLimit] = useState(10)
    const [orgPlans, setOrgPlans] = useState<OrgPlanInfo[]>([])
    const [trialLoading, setTrialLoading] = useState(false)
    const next = searchParams.get('next')

    const goBackPath = next ? next : '/home'

    const checkoutB2cHref = next ? `/checkout/b2c?next=${encodeURIComponent(next)}` : '/checkout/b2c'
    const checkoutB2bHref = (planId: string) =>
        next ? `/checkout/b2b?plan=${planId}&next=${encodeURIComponent(next)}` : `/checkout/b2b?plan=${planId}`

    useEffect(() => {
        window.scrollTo(0, 0);
        billingApi.getPublicPricing().then((data) => {
            setB2cPrice(data.b2cPremiumPriceVnd)
            setChatDailyLimit(data.chatFreeDailyLimit ?? 10)
            setOrgPlans(data.orgPlans)
        }).catch(() => undefined)
    }, [])

    const plans = useMemo(() => orgPlans.map((plan) => ({
        ...plan,
        hero: plan.planType === 'STANDARD',
        cta: plan.planType === 'STANDARD' ? 'Triển khai gói tiêu chuẩn' : 'Đăng ký cấp phép',
        extras: ORG_EXTRAS[plan.planType] ?? [],
    })), [orgPlans])

    const createClassroomTrial = async () => {
        try {
            setTrialLoading(true)
            const trialName = `Classroom Trial ${new Date().toLocaleDateString('vi-VN')}`
            await billingApi.createOrgTrial({ orgName: trialName })
            showToast({ message: 'Đã tạo lớp học dùng thử 14 ngày', type: 'success' })
            navigate('/teacher')
        } catch {
            showToast({ message: 'Không thể tạo lớp học. Vui lòng kiểm tra điều kiện tài khoản.', type: 'error' })
        } finally {
            setTrialLoading(false)
        }
    }

    return (
        <AuthLayout>
            <div className="relative z-10 flex flex-col bg-[#0f1015] text-white font-sans selection:bg-[#fe951c] selection:text-black min-h-screen">
                {/* NỀN HIỆU ỨNG */}
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center opacity-20 scale-105 filter blur-[2px]" style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0f1015] via-[#0f1015]/95 to-[#141620]/90" />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#fe951c]/10 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#388cf1]/10 rounded-full blur-[150px]" />
                </div>

                {/* HEADER ẨN (Nút THOÁT) */}
                <header className="w-full top-0 sticky z-50 transition-all pt-6 px-4 sm:px-12 flex justify-between items-center relative">
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                        <MaterialIcon name="workspace_premium" className="text-[#fe951c] text-lg sm:text-xl drop-shadow-[0_0_8px_rgba(254,149,28,0.8)]" />
                        <span className="text-xs sm:text-sm font-black tracking-widest uppercase">Cổng Dịch Vụ</span>
                    </div>
                    <button
                        onClick={() => navigate(goBackPath)}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-red-500/50 transition-all backdrop-blur-md shadow-lg cursor-pointer group"
                    >
                        <MaterialIcon name="close" className="text-xl group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </header>

                <main className="flex-grow flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">

                    {/* TYPOGRAPHY CHỐT SALE */}
                    <header className="text-center mb-12 flex flex-col items-center">
                        <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-[#fdb438]/20 border border-[#fdb438]/50 text-[#fdb438] text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(253,180,56,0.3)] animate-pulse">
                            NÂNG TẦM TRẢI NGHIỆM DI SẢN
                        </span>

                        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-black tracking-tight text-white drop-shadow-md mb-6 md:whitespace-nowrap">
                            Mở Khóa Toàn Bộ <br className="md:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#fff2a1]">Sức Mạnh TimeLens</span>
                        </h1>

                        <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
                            Đột phá giới hạn không gian và thời gian. Nâng cấp đặc quyền Premium để tận hưởng trọn vẹn hệ sinh thái RAG AI và Công nghệ đồ họa không gian của chúng tôi.
                        </p>
                    </header>

                    <div className="w-full space-y-16">

                        {/* ===================================== */}
                        {/* GÓI CÁ NHÂN (XÓA BỎ CHỮ B2C)          */}
                        {/* ===================================== */}
                        <section className="relative w-full rounded-[2.5rem] bg-gradient-to-br from-[#1b1e2c]/90 to-[#0f1015]/95 border border-[#fe951c]/40 shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(254,149,28,0.15)] backdrop-blur-2xl overflow-hidden group">

                            {/* Hào quang nền bên trong thẻ */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-[#fe951c]/20 rounded-full blur-[80px] pointer-events-none transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#fdb438]/10 rounded-full blur-[60px] pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row items-stretch">
                                {/* Cột Trái: Lợi ích */}
                                <div className="flex-1 p-8 md:p-12 md:pr-10 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-center">
                                    <div className="flex items-center gap-3 mb-6">
                                        <MaterialIcon name="workspace_premium" className="text-4xl text-[#fe951c] drop-shadow-[0_0_15px_rgba(254,149,28,0.8)]" />
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Thành Viên Premium</h2>
                                            <p className="text-xs text-[#fdb438] font-bold uppercase tracking-widest mt-1">Gói Trải Nghiệm Cá Nhân</p>
                                        </div>
                                    </div>

                                    <ul className="space-y-5 text-sm md:text-base font-medium text-gray-200">
                                        <li className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <MaterialIcon name="motion_photos_on" className="text-[#fe951c] text-2xl shrink-0 drop-shadow-md" />
                                            <span className="leading-snug"><strong>Cổng Thời Gian Đa Lớp:</strong> Mở khóa đối chiếu toàn bộ không gian di sản qua 3 kỷ nguyên lịch sử (1948 - 1968 - 2026).</span>
                                        </li>
                                        <li
                                            className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                            title={`Gói Free hiện tại: ${chatDailyLimit} câu AI/ngày`}
                                        >
                                            <MaterialIcon name="forum" className="text-[#fe951c] text-2xl shrink-0 drop-shadow-md" />
                                            <span className="leading-snug"><strong>Trợ Lý RAG AI Vô Hạn:</strong> Trò chuyện không giới hạn số câu hỏi, đính kèm nguồn tài liệu học thuật 100% minh bạch.</span>
                                        </li>
                                        <li className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <MaterialIcon name="military_tech" className="text-[#fe951c] text-2xl shrink-0 drop-shadow-md" />
                                            <span className="leading-snug"><strong>Đặc Quyền Vinh Danh:</strong> Đua TOP Bảng xếp hạng toàn cầu, sưu tầm Huy hiệu hiếm và hoàn thiện Hộ Chiếu Di Sản.</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Cột Phải: Giá & Nút Call To Action */}
                                <div className="w-full md:w-[350px] shrink-0 p-8 md:p-10 flex flex-col justify-center items-center text-center bg-black/20">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Chi phí duy trì</p>

                                    {/* Gom chung Giá tiền, chữ "đ" và "/ tháng" vào một flex box, dùng whitespace-nowrap để cấm rớt dòng */}
                                    <div className="flex items-baseline justify-center gap-1 mb-8 whitespace-nowrap">
                                        <span className="text-5xl font-black text-white drop-shadow-lg">{formatCurrency(b2cPrice).replace('đ', '')}</span>
                                        <span className="text-xl font-bold text-[#fdb438]">đ</span>
                                        <span className="text-sm text-gray-400 font-bold ml-1">/ tháng</span>
                                    </div>

                                    <Link to={checkoutB2cHref} className="w-full relative group/btn block">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-[#fe951c] to-[#e07d0b] rounded-2xl blur opacity-70 group-hover/btn:opacity-100 transition duration-300"></div>
                                        <Button type="button" className="relative w-full h-14 rounded-xl bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] text-black font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                                            <MaterialIcon name="bolt" className="text-xl" />
                                            Kích Hoạt Premium
                                        </Button>
                                    </Link>
                                    <p className="text-[10px] text-gray-500 mt-4 font-medium">Hỗ trợ thanh toán tự động qua mã QR SePay</p>
                                </div>
                            </div>
                        </section>

                        {/* ===================================== */}
                        {/* GÓI TRƯỜNG HỌC (XÓA BỎ CHỮ B2B)       */}
                        {/* ===================================== */}
                        <section className="bg-[#161824]/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-[2rem] p-6 md:p-10">

                            {/* HEADER VÀ NÚT ĐĂNG KÝ GIÁO VIÊN ĐƯỢC THIẾT KẾ LẠI TUYỆT ĐẸP */}
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A79E5]/15 text-[#388cf1] border border-[#388cf1]/30 font-black text-xs uppercase tracking-wider mb-3 shadow-sm">
                                        <MaterialIcon name="school" className="text-base" />
                                        <span>Phân Khúc Khối Trường Học</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white">Cấp Phép Gói Giáo Dục</h3>
                                    <p className="text-sm text-gray-400 mt-2 max-w-2xl font-medium">Hệ thống cấp tài khoản quản trị cho trường học và phân quyền học sinh.</p>
                                </div>

                                <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                                    <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-[#1a79e5]/15 text-[#388cf1] border border-[#388cf1]/30 tracking-widest uppercase shadow-sm">
                                        Volume Discount 30–40% khi mua từ 3 license
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => void createClassroomTrial()}
                                        disabled={trialLoading}
                                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                                    >
                                        <MaterialIcon name="play_lesson" className="text-lg" />
                                        {trialLoading ? 'Đang Khởi Tạo...' : 'Dùng Thử 14 Ngày Miễn Phí'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 items-stretch">
                                {plans.map((plan) => (
                                    <div
                                        key={plan.planType}
                                        className={`rounded-[2rem] border p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                                            plan.hero
                                                ? 'border-[#388cf1] bg-gradient-to-b from-[#388cf1]/10 to-[#0B1120] shadow-[0_15px_40px_rgba(56,140,241,0.2)] scale-100 md:scale-[1.05] z-10'
                                                : 'border-white/10 bg-[#161824]/60 backdrop-blur-xl hover:border-white/30'
                                        }`}
                                    >
                                        {plan.hero && <div className="absolute top-0 right-0 w-40 h-40 bg-[#388cf1]/20 rounded-full blur-[50px] pointer-events-none" />}

                                        <div className="relative z-10 mb-8">
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className={`text-2xl font-black ${plan.hero ? 'text-white' : 'text-gray-200'}`}>{plan.label}</h4>
                                                {plan.hero && (
                                                    <span className="inline-block px-3 py-1 bg-[#388cf1] text-white text-[9px] font-black uppercase tracking-widest rounded-md shadow-md">
                                                        Phổ Biến
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mb-6 whitespace-nowrap">
                                                <span className={`text-3xl font-black ${plan.hero ? 'text-[#388cf1] drop-shadow-md' : 'text-white'}`}>{formatCurrency(plan.priceVnd).replace('đ', '')}</span>
                                                <span className="text-sm font-bold text-gray-400 ml-1">đ / năm</span>
                                            </div>

                                            <div className={`p-4 rounded-2xl mb-6 space-y-1.5 text-xs font-bold border ${plan.hero ? 'bg-[#388cf1]/10 border-[#388cf1]/30 text-cyan-100 shadow-inner' : 'bg-black/30 border-white/5 text-gray-300'}`}>
                                                <div className="flex justify-between border-b border-white/10 pb-1.5"><span>Tài khoản Học sinh:</span> <span className="font-black">Tối đa {plan.maxVerifiedAccounts}</span></div>
                                                <div className="flex justify-between pt-1"><span>Lưu lượng CCU:</span> <span className="font-black">{plan.maxCcu} Users</span></div>
                                                <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1.5"><span>AI Pool Queries:</span> <span className="font-black">{formatAi(plan.maxAiQueriesPerMonth)}</span></div>
                                            </div>

                                            <ul className="space-y-3 text-xs font-medium text-gray-300">
                                                {plan.extras.map((extra, idx) => (
                                                    <li key={idx} className="flex items-start gap-2.5">
                                                        <MaterialIcon name={extra.icon} className={`${extra.color} text-[18px] shrink-0`} />
                                                        {extra.text}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <Link to={checkoutB2bHref(plan.planType) + (plan.planType === 'STANDARD' ? '&licenses=3' : '')} className="relative z-10 mt-auto">
                                            <Button type="button" className={`w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${plan.hero ? 'bg-[#388cf1] hover:bg-[#1a79e5] text-white shadow-[0_4px_20px_rgba(56,140,241,0.4)] hover:scale-105' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                                {plan.hero ? <MaterialIcon name="rocket_launch" className="text-sm" /> : <MaterialIcon name="shopping_cart" className="text-sm" />}
                                                {plan.cta}
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ===================================== */}
                        {/* GÓI BẢO TÀNG (XÓA BỎ CHỮ B2B2C)       */}
                        {/* ===================================== */}
                        <section className="bg-gradient-to-r from-[#1b1e2c] to-[#0f1015] border border-emerald-500/30 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />
                            <div className="relative z-10">
                                <h2 className="text-lg font-black flex items-center gap-3 mb-2 text-white">
                                    <MaterialIcon name="museum" className="text-emerald-400 text-2xl drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    Dành Cho Ban Quản Lý Di Tích & Bảo Tàng
                                </h2>
                                <p className="text-sm text-gray-400 font-medium">
                                    Giải pháp số hóa toàn diện: Chụp Panorama 360°, Dựng WebAR, Clone AI Nhân vật. Hỗ trợ triển khai theo dự án hoặc thuê bao.
                                </p>
                            </div>
                            <Link to="/checkout/b2b2c" className="w-full md:w-auto shrink-0 relative z-10">
                                <Button type="button" className="w-full h-12 px-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs uppercase tracking-wider cursor-pointer transition-all hover:scale-105 flex items-center justify-center gap-2">
                                    <MaterialIcon name="headset_mic" className="text-sm" />
                                    Liên Hệ Chuyên Gia
                                </Button>
                            </Link>
                        </section>

                    </div>
                </main>
            </div>
        </AuthLayout>
    )
}