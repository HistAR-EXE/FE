// src/pages/CheckoutB2CPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { isSafeRedirect } from '../shared/auth/types'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { billingApi } from '../features/billing/api'
import { profileApi } from '../features/profile/api'
import { useAuth } from '../shared/auth/useAuth'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function CheckoutB2CPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { updateUser, user } = useAuth()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [payment, setPayment] = useState<Awaited<ReturnType<typeof billingApi.createB2CPayment>> | null>(null)
    const [status, setStatus] = useState<'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | null>(null)
    const [priceVnd, setPriceVnd] = useState(79_000)
    const [emailVerified, setEmailVerified] = useState<boolean | undefined>(user?.emailVerified)

    const returnTo = useMemo(() => {
        const next = searchParams.get('next')
        return next && isSafeRedirect(next) ? next : '/home'
    }, [searchParams])

    useEffect(() => {
        billingApi.getPublicPricing().then((data) => setPriceVnd(data.b2cPremiumPriceVnd)).catch(() => undefined)
        profileApi.me()
            .then((profile) => setEmailVerified(profile.emailVerified))
            .catch(() => undefined)
    }, [])

    const completeUpgrade = async (nextPath: string) => {
        const profile = await profileApi.me()
        updateUser({
            tier: profile.tier,
            orgId: profile.orgId,
            orgSubscription: profile.orgSubscription,
            role: profile.role,
        })
        showToast({ message: 'Thanh toán thành công. Premium đã được kích hoạt!', type: 'success' })
        navigate(nextPath)
    }

    const refreshPaymentStatus = async (orderCode: string, silent = false) => {
        try {
            if (!silent) setChecking(true)
            const nextStatus = await billingApi.getB2CPaymentStatus(orderCode)
            setStatus(nextStatus.status)
            if (nextStatus.status === 'PAID' && nextStatus.upgraded) {
                await completeUpgrade(nextStatus.returnToPath || returnTo)
            }
        } catch (e) {
            if (!silent) showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        } finally {
            if (!silent) setChecking(false)
        }
    }

    const handleCheckout = async () => {
        if (loading) return
        try {
            setLoading(true)
            const next = await billingApi.createB2CPayment(returnTo)
            setPayment(next)
            setStatus(next.status)
        } catch (e) {
            showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!payment || status === 'PAID' || status === 'EXPIRED' || status === 'FAILED') return
        const timer = window.setInterval(() => {
            void refreshPaymentStatus(payment.orderCode, true)
        }, 5000)
        return () => window.clearInterval(timer)
    }, [payment, status])

    return (
        <AuthLayout>
            <div className="relative z-10 flex flex-col h-screen overflow-hidden bg-[#0f1015] text-white font-sans selection:bg-[#fe951c] selection:text-black">

                {/* NỀN HIỆU ỨNG TỔNG THỂ CỦA TRANG */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-cover bg-center opacity-15 scale-105 filter blur-[2px]" style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0B1120]/90 via-[#0B1120]/95 to-[#161824]/90" />

                    <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#fe951c]/15 rounded-[100%] blur-[120px] animate-pulse" />
                    <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#388cf1]/15 rounded-[100%] blur-[120px]" />
                </div>

                <header className="w-full top-0 h-20 shrink-0 flex justify-between items-center px-6 sm:px-12 relative z-20">
                    <div className="flex items-center gap-3">
                        <MaterialIcon name="verified_user" className="text-emerald-400 text-2xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        <span className="text-sm font-black tracking-widest uppercase text-white drop-shadow-md">Cổng Thanh Toán Trực Tuyến</span>
                    </div>
                    <button
                        onClick={() => navigate(searchParams.get('from') === 'pricing' ? '/pricing' : '/pricing')}
                        className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/20 hover:border-red-500/60 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer group"
                    >
                        <MaterialIcon name="close" className="text-2xl group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </header>

                {/* KHUNG MAIN CHÍNH GIỮA MÀN HÌNH - ĐÃ ĐIỀU CHỈNH PADDING LẠI ĐỂ TẠO KHOẢNG TRỐNG */}
                <main className="flex-1 min-h-0 flex items-center justify-center w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">

                    <div className="w-full bg-gradient-to-br from-[#1b1e2c]/95 to-[#12141f]/95 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 border-t-white/30 shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_30px_rgba(254,149,28,0.1)] flex flex-col md:flex-row overflow-hidden relative">

                        <div className="absolute -top-32 -left-32 w-[350px] h-[350px] bg-[#fe951c]/25 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] bg-[#388cf1]/25 rounded-full blur-[80px] pointer-events-none" />

                        {/* ========================================================= */}
                        {/* CỘT TRÁI: THÔNG TIN GÓI & THÔNG TIN CHUYỂN KHOẢN (NẾU CÓ) */}
                        {/* ĐÃ THU GỌN PADDING & KÍCH THƯỚC CHỮ */}
                        {/* ========================================================= */}
                        <div className="w-full md:w-[45%] lg:w-1/2 p-6 md:p-8 lg:p-10 border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent flex flex-col justify-center relative z-10">

                            <div className="mb-4">
                                <span className="inline-block px-3 py-1.5 rounded-lg bg-[#fe951c]/20 border border-[#fe951c]/50 text-[#fdb438] text-[10px] font-black uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(253,180,56,0.3)]">
                                    NÂNG CẤP TÀI KHOẢN
                                </span>
                                {/* Ép chữ trên 1 dòng với whitespace-nowrap và size text nhỏ lại một chút */}
                                <h1 className="text-2xl md:text-[1.75rem] font-black text-white tracking-tight drop-shadow-md whitespace-nowrap">
                                    Gói Đặc Quyền Premium
                                </h1>
                            </div>

                            <div className="bg-[#0B1120]/60 rounded-xl px-4 py-3 border border-white/10 shadow-inner mb-4 backdrop-blur-md">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tổng thanh toán</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-[#fdb438] drop-shadow-[0_0_10px_rgba(253,180,56,0.5)]">{priceVnd.toLocaleString('vi-VN')}</span>
                                    <span className="text-xs font-bold text-gray-300 uppercase">VND</span>
                                    <span className="text-xs font-bold text-gray-400 ml-1">/tháng</span>
                                </div>
                            </div>

                            {!payment ? (
                                <ul className="space-y-3 text-sm font-medium text-gray-200 mt-2">
                                    <li className="flex items-center gap-3 bg-white/5 py-2 px-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <MaterialIcon name="check_circle" className="text-[#fe951c] text-lg drop-shadow-[0_0_5px_rgba(254,149,28,0.6)]" />
                                        RAG AI Không giới hạn
                                    </li>
                                    <li className="flex items-center gap-3 bg-white/5 py-2 px-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <MaterialIcon name="check_circle" className="text-[#fe951c] text-lg drop-shadow-[0_0_5px_rgba(254,149,28,0.6)]" />
                                        Mở khóa Time Portal 3 kỷ nguyên
                                    </li>
                                    <li className="flex items-center gap-3 bg-white/5 py-2 px-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <MaterialIcon name="check_circle" className="text-[#fe951c] text-lg drop-shadow-[0_0_5px_rgba(254,149,28,0.6)]" />
                                        Gamification toàn diện
                                    </li>
                                </ul>
                            ) : (
                                <div className="flex-1 flex flex-col justify-center animate-[fadeIn_0.5s_ease-out]">
                                    {/* Thu gọn các khoảng cách padding và margin bên trong bảng thông tin */}
                                    <div className="bg-[#0B1120]/60 border border-white/10 rounded-2xl p-4 md:p-5 space-y-3 shadow-xl backdrop-blur-md">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ngân hàng thụ hưởng</span>
                                            <span className="text-sm md:text-base font-black text-white">{payment.bankCode}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chủ tài khoản</span>
                                            <span className="text-sm md:text-base font-black text-white">{payment.accountName}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Số tài khoản</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg sm:text-xl font-mono font-black text-[#388cf1] drop-shadow-[0_0_8px_rgba(56,140,241,0.5)]">{payment.accountNumber}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5 pt-3 mt-1.5 border-t border-white/10">
                                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                                                <MaterialIcon name="warning" className="text-[10px]" /> Nội dung Chuyển khoản (Bắt buộc)
                                            </span>
                                            <div className="w-full bg-[#fe951c]/10 border border-[#fe951c]/40 rounded-xl px-3 py-2.5 text-center shadow-inner">
                                                <span className="text-base md:text-lg font-mono font-black text-[#fdb438] drop-shadow-md break-all">
                                                    {payment.transferContent}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ========================================================= */}
                        {/* CỘT PHẢI: XỬ LÝ THANH TOÁN (NÚT BẤM / MÃ QR KHỔNG LỒ) */}
                        {/* ========================================================= */}
                        <div className="w-full md:w-[55%] lg:w-1/2 p-6 md:p-8 lg:p-10 bg-gradient-to-tl from-[#12141f] to-transparent flex flex-col items-center justify-center relative z-10">

                            {!payment ? (
                                <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                                    <div className="w-20 h-20 mb-5 rounded-full bg-gradient-to-br from-[#388cf1]/20 to-transparent border border-[#388cf1]/50 flex items-center justify-center shadow-[0_0_40px_rgba(56,140,241,0.3)] relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#388cf1]/80 animate-[spin_10s_linear_infinite]" />
                                        <MaterialIcon name="qr_code_scanner" className="text-4xl text-[#388cf1] drop-shadow-[0_0_10px_rgba(56,140,241,0.8)]" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-3 tracking-tight drop-shadow-md">Tạo Mã QR Tự Động</h3>
                                    <p className="text-xs text-gray-300 mb-8 font-medium leading-relaxed">
                                        Hệ thống sẽ tạo mã QR bảo mật riêng cho bạn. Chỉ cần mở ứng dụng Ngân hàng (hoặc Momo) để quét. Tài khoản sẽ được <strong>kích hoạt tự động sau 5 giây</strong>.
                                    </p>
                                    <Button
                                        type="button"
                                        disabled={loading}
                                        title={emailVerified === false ? 'Email chưa xác minh — vẫn có thể thanh toán' : undefined}
                                        onClick={() => void handleCheckout()}
                                        className="w-full max-w-[280px] h-12 rounded-2xl bg-gradient-to-r from-[#1a79e5] via-[#388cf1] to-[#1a79e5] hover:from-[#388cf1] hover:to-[#1a79e5] text-white font-black text-xs uppercase tracking-wider shadow-[0_5px_25px_rgba(56,140,241,0.5)] hover:shadow-[0_8px_35px_rgba(56,140,241,0.8)] hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {loading ? <><MaterialIcon name="hourglass_empty" className="animate-spin text-lg" /> Đang khởi tạo...</> : <>Tiến Hành Lấy Mã QR</>}
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
                                    <div className="flex justify-between items-center w-full max-w-[260px] mb-3">
                                        <span className="text-[10px] font-mono text-gray-300 font-bold bg-black/40 px-3 py-1 rounded-lg border border-white/10">ID: {payment.orderCode.slice(0, 10)}</span>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                            status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
                                                status === 'EXPIRED' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                                                    'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                                        }`}>
                                            {status === 'PAID' ? 'Đã Nhận Tiền' : status === 'EXPIRED' ? 'Đã Hết Hạn' : 'Đang Chờ Quét...'}
                                        </span>
                                    </div>

                                    {/* ĐÃ THU NHỎ KÍCH THƯỚC QR (220px) ĐỂ TIẾT KIỆM CHIỀU CAO */}
                                    <div className="bg-white p-4 rounded-[1.5rem] shadow-[0_0_60px_rgba(56,140,241,0.3)] relative group mb-6">
                                        <div className="absolute inset-0 border-[4px] border-dashed border-gray-200 rounded-[1.5rem] pointer-events-none group-hover:border-[#388cf1] transition-colors duration-500" />
                                        <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] relative z-10 flex items-center justify-center bg-white rounded-xl">
                                            <img src={payment.qrUrl} alt="QR Code" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        disabled={checking || status === 'PAID'}
                                        onClick={() => void refreshPaymentStatus(payment.orderCode)}
                                        className="w-full max-w-[260px] h-12 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <MaterialIcon name="sync" className={checking ? "animate-spin text-lg" : "text-lg"} />
                                        {checking ? 'Đang kiểm tra...' : status === 'PAID' ? 'Hệ thống đang mở khóa...' : 'Tôi Đã Chuyển Khoản'}
                                    </Button>
                                </div>
                            )}

                        </div>

                    </div>
                </main>
            </div>
        </AuthLayout>
    )
}