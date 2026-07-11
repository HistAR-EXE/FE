// src/pages/CheckoutB2BPage.tsx
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

const PLANS = ['MICRO', 'STANDARD', 'PREMIUM'] as const

export function CheckoutB2BPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user, updateUser } = useAuth()
    const { showToast } = useToast()
    const [orgName, setOrgName] = useState(user?.orgName ?? '')
    const [contactEmail, setContactEmail] = useState(user?.email ?? '')
    const [planType, setPlanType] = useState(
        PLANS.includes((searchParams.get('plan') ?? '').toUpperCase() as (typeof PLANS)[number])
            ? (searchParams.get('plan')!.toUpperCase() as (typeof PLANS)[number])
            : 'STANDARD',
    )
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [payment, setPayment] = useState<Awaited<ReturnType<typeof billingApi.createOrgPayment>> | null>(null)
    const [status, setStatus] = useState<'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | null>(null)
    const [planPrices, setPlanPrices] = useState<Record<string, number>>({})
    const [licenseCount, setLicenseCount] = useState(Math.max(1, Number.parseInt(searchParams.get('licenses') ?? '1', 10) || 1))
    const [volumePreview, setVolumePreview] = useState<Awaited<ReturnType<typeof billingApi.getOrgVolumePreview>> | null>(null)

    const returnTo = useMemo(() => {
        const next = searchParams.get('next')
        return next && isSafeRedirect(next) ? next : '/teacher'
    }, [searchParams])

    useEffect(() => {
        billingApi.getOrgPlans().then((plans) =>
            setPlanPrices(plans.reduce<Record<string, number>>((acc, item) => {
                acc[item.planType] = item.priceVnd
                return acc
            }, {}))
        ).catch(() => undefined)
    }, [])

    useEffect(() => {
        billingApi.getOrgVolumePreview(planType, licenseCount)
            .then(setVolumePreview)
            .catch(() => setVolumePreview(null))
    }, [planType, licenseCount])

    const completeUpgrade = async (nextPath: string) => {
        const profile = await profileApi.me()
        updateUser({
            tier: profile.tier,
            orgId: profile.orgId,
            orgName: profile.orgName,
            orgSubscription: profile.orgSubscription,
            orgRole: profile.orgRole,
            role: profile.role,
        })
        showToast({ message: `Thanh toán thành công. Đã kích hoạt bản quyền!`, type: 'success' })
        navigate(nextPath)
    }

    const refreshPaymentStatus = async (orderCode: string, silent = false) => {
        try {
            if (!silent) setChecking(true)
            const nextStatus = await billingApi.getOrgPaymentStatus(orderCode)
            setStatus(nextStatus.status)
            if (nextStatus.status === 'PAID' && nextStatus.activated) {
                await completeUpgrade(nextStatus.returnToPath || returnTo)
            }
        } catch (e) {
            if (!silent) showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        } finally {
            if (!silent) setChecking(false)
        }
    }

    const handleCheckout = async () => {
        if (!orgName.trim() || !contactEmail.trim()) {
            showToast({ message: 'Vui lòng điền đủ Tên cơ sở và Email Quản trị', type: 'error' })
            return
        }
        try {
            setLoading(true)
            const result = await billingApi.createOrgPayment({
                orgName: orgName.trim(),
                planType,
                contactEmail: contactEmail.trim(),
                organizationId: user?.orgId ?? undefined,
                returnToPath: returnTo,
                licenseCount,
            })
            setPayment(result)
            setStatus(result.status)
        } catch (e) {
            showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!payment || status === 'PAID' || status === 'EXPIRED' || status === 'FAILED') return
        const timer = window.setInterval(() => { void refreshPaymentStatus(payment.orderCode, true) }, 5000)
        return () => window.clearInterval(timer)
    }, [payment, status])

    return (
        <AuthLayout>
            {/* ĐỔI h-screen -> min-h-screen ĐỂ CHO PHÉP TRANG CUỘN NẾU MÀN HÌNH NHỎ BỊ CHẠM ĐÁY */}
            <div className="relative z-10 flex flex-col min-h-screen overflow-y-auto overflow-x-hidden bg-[#0f1015] text-white font-sans selection:bg-[#388cf1] selection:text-white custom-scrollbar">

                {/* NỀN HIỆU ỨNG TỔNG THỂ CỦA TRANG */}
                <div className="absolute inset-0 z-0 pointer-events-none fixed">
                    <div className="absolute inset-0 bg-cover bg-center opacity-15 scale-105 filter blur-[2px]" style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0B1120]/90 via-[#0B1120]/95 to-[#161824]/90" />
                    <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#388cf1]/15 rounded-[100%] blur-[120px] animate-pulse" />
                    <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#388cf1]/10 rounded-[100%] blur-[120px]" />
                </div>

                <header className="w-full top-0 h-20 shrink-0 flex justify-between items-center px-6 sm:px-12 relative z-20">
                    <div className="flex items-center gap-3">
                        <MaterialIcon name="school" className="text-[#388cf1] text-2xl drop-shadow-[0_0_10px_rgba(56,140,241,0.8)]" />
                        <span className="text-sm font-black tracking-widest uppercase text-white drop-shadow-md">Cổng Cấp Phép Bản Quyền</span>
                    </div>
                    <button
                        onClick={() => navigate('/pricing#b2b')}
                        className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/20 hover:border-red-500/60 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer group"
                    >
                        <MaterialIcon name="close" className="text-xl group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </header>

                {/* KHUNG MAIN CHÍNH GIỮA MÀN HÌNH - PY-8 ĐỂ ĐẢM BẢO CÓ KHOẢNG TRỐNG TRÊN DƯỚI */}
                <main className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                    {/* BỎ CHIỀU CAO CỐ ĐỊNH, ĐỂ THẺ TỰ ÔM VỪA NỘI DUNG */}
                    <div className="w-full bg-gradient-to-br from-[#1b1e2c]/95 to-[#12141f]/95 backdrop-blur-3xl rounded-[2rem] border border-white/20 border-t-white/30 shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_30px_rgba(56,140,241,0.1)] flex flex-col md:flex-row overflow-hidden relative">

                        <div className="absolute -top-32 -left-32 w-[350px] h-[350px] bg-[#388cf1]/25 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] bg-[#388cf1]/20 rounded-full blur-[80px] pointer-events-none" />

                        {/* ========================================================= */}
                        {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN TỔ CHỨC */}
                        {/* ========================================================= */}
                        <div className={`w-full ${payment ? 'md:w-[40%] lg:w-[35%]' : 'md:w-[50%] lg:w-[45%]'} px-6 lg:px-10 py-8 border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent flex flex-col relative z-10 transition-all duration-500`}>

                            <div className="mb-5">
                                <span className="inline-block px-3 py-1.5 rounded-lg bg-[#388cf1]/20 border border-[#388cf1]/50 text-cyan-300 text-[10px] font-black uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(56,140,241,0.3)]">
                                    THIẾT LẬP HỆ THỐNG
                                </span>
                                <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md whitespace-nowrap">
                                    Cấp Phép Tổ Chức
                                </h1>
                            </div>

                            {/* CHUYỂN ĐỔI FORM THÀNH THÔNG TIN CHỈ ĐỌC KHI ĐÃ TẠO MÃ QR */}
                            {!payment ? (
                                <div className="space-y-4 flex-1">
                                    <label className="block space-y-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tên cơ sở giáo dục <span className="text-red-400">*</span></span>
                                        <input
                                            value={orgName} onChange={(e) => setOrgName(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 focus:border-[#388cf1] rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner placeholder:text-gray-600"
                                            placeholder="VD: THPT Nguyễn Du"
                                        />
                                    </label>
                                    <label className="block space-y-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Quản trị (Master) <span className="text-red-400">*</span></span>
                                        <input
                                            type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 focus:border-[#388cf1] rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner placeholder:text-gray-600"
                                            placeholder="admin@truong.edu.vn"
                                        />
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gói Bản Quyền</span>
                                            <select
                                                value={planType} onChange={(e) => setPlanType(e.target.value as (typeof PLANS)[number])}
                                                className="w-full bg-black/40 border border-white/10 focus:border-[#388cf1] rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none transition-all appearance-none shadow-inner"
                                            >
                                                <option value="MICRO">Micro</option>
                                                <option value="STANDARD">Standard</option>
                                                <option value="PREMIUM">Premium</option>
                                            </select>
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Số Cơ Sở</span>
                                            <input
                                                type="number" min={1} max={99} value={licenseCount} onChange={(e) => setLicenseCount(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                                                className="w-full bg-black/40 border border-white/10 focus:border-[#388cf1] rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none shadow-inner"
                                            />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col justify-center animate-[fadeIn_0.5s_ease-out]">
                                    <div className="bg-[#0B1120]/60 border border-white/10 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl backdrop-blur-md">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Cơ sở đăng ký</span>
                                            <span className="text-sm font-black text-white truncate">{orgName}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Master Account</span>
                                            <span className="text-sm font-black text-white truncate">{contactEmail}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Gói cấp phép</span>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-base font-black text-[#388cf1] drop-shadow-[0_0_8px_rgba(56,140,241,0.5)] uppercase whitespace-nowrap">{planType} PKG</span>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white border border-white/20 whitespace-nowrap w-max">{licenseCount} License</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BẢNG GIÁ MINI TÍNH TỔNG (WHITESPACE-NOWRAP & THU NHỎ SIZE CHỮ ĐỂ VỪA VẶN) */}
                            <div className="bg-[#0B1120]/60 rounded-xl px-5 py-4 border border-white/10 shadow-inner mt-5 backdrop-blur-md">
                                <div className="flex justify-between items-center text-[11px] sm:text-xs text-gray-300 font-medium mb-1.5">
                                    <span className="whitespace-nowrap">Đơn giá {planType}:</span>
                                    <span className="whitespace-nowrap font-bold text-white">{(planPrices[planType] ?? 0).toLocaleString('vi-VN')}đ</span>
                                </div>
                                {volumePreview && volumePreview.discountPercent > 0 && (
                                    <div className="flex justify-between items-center text-[11px] text-emerald-400 font-bold mb-2">
                                        <span className="flex items-center gap-1.5 whitespace-nowrap"><MaterialIcon name="savings" className="text-[13px]" /> Chiết khấu ({volumePreview.discountPercent}%):</span>
                                        <span className="whitespace-nowrap">- {volumePreview.discountAmountVnd.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end border-t border-white/10 pt-3 mt-2">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap mr-2">Tổng chi phí</span>
                                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                                        <span className="text-2xl sm:text-3xl font-black text-[#388cf1] drop-shadow-[0_0_10px_rgba(56,140,241,0.5)]">{volumePreview ? volumePreview.totalVnd.toLocaleString('vi-VN') : '0'}</span>
                                        <span className="text-[10px] font-bold text-gray-300 uppercase">VND</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* ========================================================= */}
                        {/* CỘT PHẢI: XỬ LÝ THANH TOÁN (MÃ QR & INFO NGÂN HÀNG TRẢI RỘNG) */}
                        {/* ========================================================= */}
                        <div className={`w-full ${payment ? 'md:w-[60%] lg:w-[65%]' : 'md:w-[50%] lg:w-[55%]'} px-6 lg:px-12 py-8 bg-gradient-to-tl from-[#12141f] to-transparent flex flex-col items-center justify-center relative z-10 transition-all duration-500`}>

                            {!payment ? (
                                <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                                    <div className="w-20 h-20 mb-5 rounded-full bg-gradient-to-br from-[#388cf1]/20 to-transparent border border-[#388cf1]/50 flex items-center justify-center shadow-[0_0_40px_rgba(56,140,241,0.3)] relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#388cf1]/80 animate-[spin_10s_linear_infinite]" />
                                        <MaterialIcon name="corporate_fare" className="text-4xl text-[#388cf1] drop-shadow-[0_0_10px_rgba(56,140,241,0.8)]" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-3 tracking-tight drop-shadow-md">Khởi Tạo Hóa Đơn</h3>
                                    <p className="text-xs text-gray-300 mb-8 font-medium leading-relaxed">
                                        Điền đầy đủ thông tin bên trái để tạo mã QR. Hệ thống sẽ tự động khởi tạo không gian quản trị trường học ngay sau khi nhận được thanh toán.
                                    </p>
                                    <Button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => void handleCheckout()}
                                        className="w-full max-w-[300px] h-12 rounded-xl bg-gradient-to-r from-[#1a79e5] via-[#388cf1] to-[#1a79e5] hover:from-[#388cf1] hover:to-[#1a79e5] text-white font-black text-xs uppercase tracking-wider shadow-[0_5px_25px_rgba(56,140,241,0.5)] hover:shadow-[0_8px_35px_rgba(56,140,241,0.8)] hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {loading ? <><MaterialIcon name="hourglass_empty" className="animate-spin text-lg" /> Đang khởi tạo...</> : <>Khởi Tạo Mã QR Thanh Toán</>}
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col xl:flex-row items-center justify-center gap-6 lg:gap-10 animate-[fadeIn_0.5s_ease-out] max-w-[900px] mx-auto">

                                    {/* BÊN TRÁI CỦA CỘT PHẢI: MÃ QR (THU NHỎ LẠI ĐỂ TIẾT KIỆM CHIỀU CAO) */}
                                    <div className="flex flex-col items-center shrink-0 w-full xl:w-[260px]">
                                        <div className="flex justify-between items-center w-full max-w-[240px] mb-3">
                                            <span className="text-[10px] font-mono text-gray-300 font-bold bg-black/40 px-3 py-1 rounded-lg border border-white/10 whitespace-nowrap">ID: {payment.orderCode.slice(0, 10)}</span>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${
                                                status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
                                                    status === 'EXPIRED' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                                                        'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                                            }`}>
                                                {status === 'PAID' ? 'Đã Nhận Tiền' : status === 'EXPIRED' ? 'Đã Hết Hạn' : 'Đang Chờ...'}
                                            </span>
                                        </div>

                                        <div className="bg-white p-3 rounded-2xl shadow-[0_0_50px_rgba(56,140,241,0.2)] relative group mb-2 xl:mb-0">
                                            <div className="absolute inset-0 border-[3px] border-dashed border-gray-200 rounded-2xl pointer-events-none group-hover:border-[#388cf1] transition-colors duration-500" />
                                            <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] relative z-10 flex items-center justify-center bg-white rounded-xl">
                                                <img src={payment.qrUrl} alt="QR Code" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* BÊN PHẢI CỦA CỘT PHẢI: INFO NGÂN HÀNG & NÚT */}
                                    <div className="flex flex-col justify-center w-full max-w-[420px]">
                                        <div className="bg-[#0B1120]/60 border border-white/10 rounded-xl p-5 sm:p-6 space-y-3 shadow-xl backdrop-blur-md mb-5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Ngân hàng thụ hưởng</span>
                                                <span className="text-sm sm:text-base font-black text-white">{payment.bankCode}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Chủ tài khoản</span>
                                                <span className="text-sm sm:text-base font-black text-white">{payment.accountName}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Số tài khoản</span>
                                                <span className="text-lg sm:text-xl font-mono font-black text-[#388cf1] drop-shadow-[0_0_8px_rgba(56,140,241,0.5)]">{payment.accountNumber}</span>
                                            </div>

                                            <div className="flex flex-col gap-1.5 pt-3 mt-1.5 border-t border-white/10">
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                                                    <MaterialIcon name="warning" className="text-xs" /> Nội Dung CK (Bắt buộc đúng)
                                                </span>
                                                <div className="w-full bg-[#388cf1]/10 border border-[#388cf1]/40 rounded-lg px-3 py-2 text-center shadow-inner">
                                                    <span className="text-base sm:text-lg font-mono font-black text-cyan-300 drop-shadow-md break-all">
                                                        {payment.transferContent}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            disabled={checking || status === 'PAID'}
                                            onClick={() => void refreshPaymentStatus(payment.orderCode)}
                                            className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <MaterialIcon name="sync" className={checking ? "animate-spin text-base" : "text-base"} />
                                            {checking ? 'Đang kiểm tra...' : status === 'PAID' ? 'Đang cấp phép...' : 'Tôi Đã Chuyển Khoản'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>
                </main>
            </div>
        </AuthLayout>
    )
}