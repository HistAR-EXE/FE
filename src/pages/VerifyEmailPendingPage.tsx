// src/pages/VerifyEmailPendingPage.tsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { profileApi } from '../features/profile/api'
import { useAuth } from '../shared/auth/useAuth'
import { getPostLoginRedirect } from '../shared/auth/types'
import { EMAIL_VERIFIED_EVENT, markEmailVerifiedInStorage } from '../shared/auth/session'
import { peekReturnTo, popReturnTo } from '../shared/router/returnTo'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { httpClient } from '../shared/api/httpClient'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function VerifyEmailPendingPage() {
    const navigate = useNavigate()
    const { user, updateUser, logout } = useAuth()
    const { showToast } = useToast()

    const [checking, setChecking] = useState(false)
    const [isResending, setIsResending] = useState(false)

    // State cho đếm ngược thời gian gửi lại email
    const [countdown, setCountdown] = useState(60)

    // Logic Đếm ngược 60 giây
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const advanceAfterVerified = useCallback(async () => {
        const profile = await profileApi.me()
        if (!profile.emailVerified) return false
        markEmailVerifiedInStorage()
        updateUser({ emailVerified: true })
        const returnTo = peekReturnTo() ?? popReturnTo()
        navigate(getPostLoginRedirect({ ...user!, emailVerified: true }, returnTo), { replace: true })
        return true
    }, [navigate, updateUser, user])

    useEffect(() => {
        const onVerified = () => {
            void advanceAfterVerified().catch(() => undefined)
        }
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'timelens_email_verified' && e.newValue === '1') {
                onVerified()
            }
        }
        window.addEventListener(EMAIL_VERIFIED_EVENT, onVerified)
        window.addEventListener('storage', onStorage)
        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void advanceAfterVerified().catch(() => undefined)
            }
        }, 30_000)
        return () => {
            window.removeEventListener(EMAIL_VERIFIED_EVENT, onVerified)
            window.removeEventListener('storage', onStorage)
            window.clearInterval(interval)
        }
    }, [advanceAfterVerified])

    const handleContinue = async () => {
        try {
            setChecking(true)
            const ok = await advanceAfterVerified()
            if (!ok) {
                showToast({
                    message: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư hoặc bấm gửi lại.',
                    type: 'info',
                })
            }
        } finally {
            setChecking(false)
        }
    }

    const handleResend = async () => {
        if (countdown > 0 || isResending) return
        try {
            setIsResending(true)
            await httpClient.post('/api/auth/verify-email/resend')
            showToast({ message: 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.', type: 'success' })
            setCountdown(60) // Reset lại 60 giây sau khi gửi thành công
        } catch (error) {
            showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
        } finally {
            setIsResending(false)
        }
    }

    const handleLogout = async () => {
        try {
            if (logout) await logout()
            navigate('/login', { replace: true })
        } catch (e) {
            navigate('/login', { replace: true })
        }
    }

    return (
        <AuthLayout>
            <div className="relative z-10 flex flex-col min-h-screen bg-[#0f1015] text-white font-sans selection:bg-[#fe951c] selection:text-black">

                {/* NỀN HIỆU ỨNG AMBIENT LIGHTING HUYỀN ẢO */}
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-20 scale-105 filter blur-[2px]"
                        style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0f1015] via-[#0f1015]/90 to-[#141620]/80" />
                    <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-[#fe951c]/15 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#388cf1]/15 rounded-full blur-[150px]" />
                </div>

                {/* HEADER */}
                <header className="w-full top-0 sticky z-50 bg-[#0f1015]/80 backdrop-blur-xl border-b border-white/10 transition-all">
                    <div className="flex justify-between items-center h-20 px-4 sm:px-6 lg:px-12 w-full mx-auto">
                        <Link to="/" className="flex items-center gap-3 sm:gap-4 group">
                            <div className="relative flex items-center">
                                <img src="/brand/logo-histar.png" alt="HistAR Logo" className="relative h-12 sm:h-14 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="h-8 w-[2px] bg-white/20 rounded-full hidden sm:block"></div>
                            <div className="flex flex-col justify-center">
                                <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none group-hover:text-[#fdb438] transition-colors">TimeLens</span>
                                <span className="text-[10px] font-black text-[#D97706] tracking-widest uppercase mt-1">Heritage EdTech Platform</span>
                            </div>
                        </Link>

                        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-400 border border-white/10 bg-white/5 px-4 py-2 rounded-full backdrop-blur-md shadow-sm">
                            <MaterialIcon name="lock" className="text-[#fe951c] text-sm" />
                            <span>Bảo mật hệ thống</span>
                        </div>
                    </div>
                </header>

                {/* KHỐI NỘI DUNG CHÍNH - HORIZONTAL SPLIT (MỞ RỘNG CHIỀU NGANG) */}
                <main className="flex-grow flex items-center justify-center w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 relative z-10">
                    <div className="w-full grid grid-cols-1 md:grid-cols-12 rounded-[2rem] overflow-hidden border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.8)] bg-[#12141f]/90 backdrop-blur-2xl">

                        {/* CỘT TRÁI: THÔNG TIN TÀI KHOẢN & HƯỚNG DẪN */}
                        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center relative border-b md:border-b-0 md:border-r border-white/10 bg-[#0f1015]/60">
                            {/* Glow nền mờ sau icon */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#388cf1]/10 rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative z-10">
                                <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-[#1a79e5]/20 to-[#388cf1]/10 border border-[#388cf1]/40 flex items-center justify-center shadow-[0_0_30px_rgba(56,140,241,0.2)]">
                                    <MaterialIcon name="mark_email_unread" className="text-3xl text-[#388cf1] animate-bounce" />
                                </div>

                                <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">Xác thực tài khoản</h1>

                                <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">
                                    Mã truy cập hệ thống đã được gửi đến địa chỉ email: <br/>
                                    <span className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-white/10 to-transparent border border-white/10 text-white font-bold text-base shadow-inner">
                                        {user?.email || 'email của bạn'}
                                    </span>
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <MaterialIcon name="verified_user" className="text-[#fe951c] text-xl shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-gray-200">Tại sao cần xác thực?</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">Việc này giúp bảo vệ tiến độ tham quan Tour 360°, huy hiệu Hộ chiếu Di sản và dữ liệu hỏi đáp RAG AI của riêng bạn.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <MaterialIcon name="help_outline" className="text-gray-500 text-xl shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-gray-200">Không tìm thấy Email?</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">Hãy kiểm tra kỹ thư mục <strong>Spam (Thư rác)</strong> hoặc mục Quảng cáo. Có thể email đang nằm ở đó.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CỘT PHẢI: KHỐI HÀNH ĐỘNG & ĐẾM NGƯỢC */}
                        <div className="md:col-span-5 p-8 sm:p-12 flex flex-col justify-center relative bg-gradient-to-br from-[#161824] to-[#0f1015]">

                            {/* Vòng Radar Waiting */}
                            <div className="flex flex-col items-center justify-center text-center mb-10">
                                <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                                    <div className="absolute inset-0 rounded-full border border-[#fdb438]/30 animate-[ping_3s_linear_infinite]" />
                                    <div className="absolute inset-2 rounded-full border border-dashed border-[#fe951c]/50 animate-[spin_10s_linear_infinite]" />
                                    <div className="w-12 h-12 rounded-full bg-[#fe951c]/20 border border-[#fe951c] flex items-center justify-center shadow-[0_0_20px_rgba(254,149,28,0.5)]">
                                        <MaterialIcon name="hourglass_empty" className="text-[#fdb438] text-2xl animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-white">Đang chờ xác nhận...</h3>
                                <p className="text-xs text-gray-400 mt-1 font-medium">Hệ thống sẽ tự động làm mới khi bạn bấm vào link trong email.</p>
                            </div>

                            <div className="space-y-4 w-full">
                                {/* NÚT KIỂM TRA TRẠNG THÁI */}
                                <Button
                                    type="button"
                                    disabled={checking}
                                    onClick={() => void handleContinue()}
                                    className="w-full h-14 rounded-xl bg-gradient-to-r from-[#1a79e5] to-[#388cf1] hover:from-[#388cf1] hover:to-[#1a79e5] text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_25px_rgba(56,140,241,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {checking ? (
                                        <>
                                            <MaterialIcon name="progress_activity" className="animate-spin text-lg" />
                                            <span>Đang kiểm tra...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Tôi Đã Xác Thực — Vào App</span>
                                            <MaterialIcon name="arrow_forward" className="text-lg font-bold" />
                                        </>
                                    )}
                                </Button>

                                {/* NÚT GỬI LẠI EMAIL (CÓ ĐẾM NGƯỢC) */}
                                <button
                                    type="button"
                                    disabled={countdown > 0 || isResending}
                                    onClick={handleResend}
                                    className={`w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                                        countdown > 0
                                            ? 'bg-white/5 border-transparent text-gray-500 cursor-not-allowed'
                                            : 'bg-white/10 hover:bg-[#388cf1]/20 border-white/20 hover:border-[#388cf1]/50 text-white cursor-pointer shadow-sm'
                                    }`}
                                >
                                    <MaterialIcon name="send" className="text-sm" />
                                    {isResending
                                        ? 'Đang gửi...'
                                        : countdown > 0
                                            ? `Gửi lại email sau ${countdown}s`
                                            : 'Chưa nhận được? Gửi lại email'}
                                </button>
                            </div>

                            {/* NÚT THOÁT RA */}
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-8 text-xs font-bold text-gray-500 hover:text-[#ef4444] transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto group"
                            >
                                <MaterialIcon name="logout" className="text-sm group-hover:-translate-x-1 transition-transform" />
                                Đăng xuất / Nhập email khác
                            </button>

                        </div>
                    </div>
                </main>

            </div>
        </AuthLayout>
    )
}