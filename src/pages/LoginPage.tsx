// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../shared/auth/useAuth'
import {
    getPostLoginRedirect,
    needsEmailVerification,
    type AuthUser,
} from '../shared/auth/types'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'
import { signInWithPopup, signOut } from 'firebase/auth'
import { firebaseAuth, firebaseEnabled, googleProvider } from '../shared/auth/firebase'
import { popReturnTo, peekReturnTo, readReturnTo, resolveReturnTo, stashReturnTo } from '../shared/router/returnTo'

// Kế thừa các Component giao diện chuẩn
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import mascotImg from '../assets/mascot.png'

type LoginPageProps = {
    defaultMode?: 'login' | 'register'
}

export function LoginPage({ defaultMode = 'login' }: LoginPageProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const { login, register, loginWithGoogle } = useAuth()

    const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const { showToast } = useToast()

    const [termsAccepted, setTermsAccepted] = useState(false)

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const pendingFrom = useMemo(() => {
        const legacyFrom = (location.state as { from?: string } | null)?.from
        return resolveReturnTo(searchParams, legacyFrom)
    }, [location.state, searchParams])

    useEffect(() => {
        if (pendingFrom) {
            stashReturnTo(pendingFrom)
        }
    }, [pendingFrom])

    const navigateAfterAuth = (loggedInUser: AuthUser) => {
        const returnTo = readReturnTo(searchParams) ?? pendingFrom ?? peekReturnTo() ?? popReturnTo()
        if (needsEmailVerification(loggedInUser)) {
            stashReturnTo(returnTo)
            navigate('/verify-email/pending', { replace: true })
            return
        }
        navigate(getPostLoginRedirect(loggedInUser, returnTo), { replace: true })
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (mode === 'register' && !termsAccepted) {
            showToast({ message: 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.', type: 'error' })
            return
        }

        const formData = new FormData(event.currentTarget)
        const email = String(formData.get('email') ?? '').trim()
        const password = String(formData.get('password') ?? '')
        const displayName = String(formData.get('displayName') ?? '').trim()

        const nextErrors: Record<string, string> = {}
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(email)) nextErrors.email = 'Email không đúng định dạng'
        if (password.length < 6) nextErrors.password = 'Mật khẩu phải chứa tối thiểu 6 ký tự'
        if (mode === 'register' && !displayName) nextErrors.displayName = 'Vui lòng nhập họ và tên hiển thị'

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors)
            return
        }

        if (!email || !password || (mode === 'register' && !displayName)) return

        try {
            setLoading(true)
            setFieldErrors({})
            const returnTo = readReturnTo(searchParams) ?? pendingFrom
            stashReturnTo(returnTo)
            const loggedInUser =
                mode === 'login'
                    ? await login({ email, password })
                    : await register({ email, password, displayName })
            navigateAfterAuth(loggedInUser)
            if (mode === 'register') {
                showToast({
                    message: 'Kiểm tra email để kích hoạt tài khoản trước khi khám phá TimeLens.',
                    type: 'info',
                })
            }
        } catch (e) {
            if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && e.fieldErrors) {
                setFieldErrors(e.fieldErrors)
            }
            const message = e instanceof ApiError ? e.message : 'Xác thực không thành công. Vui lòng kiểm tra lại thông tin.'
            showToast({ message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        if (!firebaseEnabled || !firebaseAuth) {
            showToast({
                message: 'Chưa cấu hình Firebase. Xem docs/FIREBASE_AUTH_SETUP.md để bật đăng nhập Google.',
                type: 'info',
            })
            return
        }
        try {
            setLoading(true)
            const returnTo = readReturnTo(searchParams) ?? pendingFrom
            stashReturnTo(returnTo)
            await signOut(firebaseAuth).catch(() => undefined)
            const credential = await signInWithPopup(firebaseAuth, googleProvider)
            const idToken = await credential.user.getIdToken()
            const loggedInUser = await loginWithGoogle(idToken)
            navigateAfterAuth({ ...loggedInUser, emailVerified: true, provider: 'google' })
        } catch (e) {
            const message =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                        ? e.message
                        : 'Đăng nhập Google thất bại.'
            showToast({ message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans select-none overflow-x-hidden selection:bg-[#0275FB] selection:text-white">

            {/* THÊM CSS KEYFRAME MỚI CHO MASCOT (LẮC LƯ LƠ LỬNG) */}
            <style>
                {`
                    @keyframes float-tilt {
                        0%, 100% { transform: translateY(0) rotate(-4deg); }
                        50% { transform: translateY(-18px) rotate(4deg); }
                    }
                    .animate-float-tilt {
                        animation: float-tilt 5s ease-in-out infinite;
                    }
                `}
            </style>

            {/* COMPONENT HEADER CHUẨN */}
            <PublicHeader />

            {/* KHỐI NỘI DUNG CHÍNH */}
            <main className="flex-grow flex items-center justify-center w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10 mt-8">

                {/* HIỆU ỨNG ÁNH SÁNG NỀN */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#FDC908]/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#0275FB]/15 rounded-full blur-[100px] pointer-events-none" />

                {/* WRAPPER BAO BỌC FORM VÀ MASCOT ĐỂ MASCOT CÓ THỂ TRÀN RA NGOÀI */}
                <div className="relative w-full">

                    {/* MASCOT CHRONO "PHÁ KHUNG" NẰM Ở GÓC TRÁI TRÊN CÙNG */}
                    <div className="hidden lg:block absolute -top-24 -left-20 z-30 animate-float-tilt group cursor-pointer">
                        {/* Hào quang chìm phía sau Mascot */}
                        <div className="absolute inset-0 bg-[#FDC908]/30 blur-[40px] rounded-full scale-110 group-hover:bg-[#0275FB]/30 transition-colors duration-500 pointer-events-none"></div>
                        <img
                            src={mascotImg}
                            alt="Mascot Chrono"
                            className="w-64 h-64 object-contain relative z-10 drop-shadow-[0_20px_30px_rgba(2,117,251,0.35)] group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                    </div>

                    {/* FORM CONTAINER CHÍNH */}
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-[2.5rem] overflow-hidden bg-white shadow-[0_20px_70px_rgba(2,117,251,0.08)] border border-[#0275FB]/10 relative z-20">

                        {/* CỘT TRÁI: BANNER (Chỉ hiển thị trên PC) */}
                        <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-[#0275FB] via-[#1A79E5] to-[#0275FB]">
                            {/* Hiệu ứng Background Pattern */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

                            {/* Khối Text (được đẩy xuống một chút để nhường chỗ cho Mascot ở trên) */}
                            <div className="relative z-20 space-y-6 mt-32">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-[10px] font-black tracking-widest text-[#FDC908] uppercase shadow-sm">
                                    <MaterialIcon name="explore" className="text-sm" />
                                    <span>Cổng Kết Nối Di Sản</span>
                                </div>
                                <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
                                    Mở Khóa Cánh Cổng <br />
                                    <span className="text-[#FDC908] drop-shadow-md">Xuyên Thời Gian</span>
                                </h2>
                                <p className="text-sm text-blue-50 leading-relaxed font-medium max-w-[95%]">
                                    Đăng nhập để lưu trữ tiến trình tương tác Tour 360°, thu thập Hộ chiếu Di sản và đồng bộ toàn bộ dữ liệu trò chuyện cùng Trợ lý Lịch sử AI.
                                </p>
                            </div>

                            {/* BIỂU TƯỢNG CHIẾC CHÌA KHÓA VẼ BẰNG CSS */}
                            <div className="absolute bottom-16 right-10 transform -rotate-[25deg] group hover:rotate-12 transition-all duration-700 cursor-pointer z-20">
                                <div className="relative flex items-center drop-shadow-[0_15px_15px_rgba(0,0,0,0.25)]">
                                    {/* Hào quang nhấp nháy phát sáng sau chìa khóa */}
                                    <div className="absolute inset-0 bg-[#FDC908]/40 blur-3xl rounded-full scale-[2] animate-pulse"></div>

                                    {/* Vòng cung chìa khóa (Bow) */}
                                    <div className="w-16 h-16 rounded-full border-[6px] border-[#FDC908] flex items-center justify-center relative z-10 bg-gradient-to-br from-[#FFF2C3] to-[#d97706] shadow-[inset_0_0_10px_rgba(0,0,0,0.3)]">
                                        {/* Lỗ hổng bên trong */}
                                        <div className="w-6 h-6 rounded-full bg-[#1A79E5] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)]"></div>
                                    </div>

                                    {/* Thân chìa khóa (Shaft) */}
                                    <div className="w-28 h-4 bg-gradient-to-r from-[#FDC908] to-[#b45309] relative -ml-2 rounded-r-md shadow-md border-y border-r border-[#FFF2C3]/30">
                                        {/* Răng chìa khóa 1 */}
                                        <div className="absolute right-3 top-4 w-4 h-8 bg-gradient-to-b from-[#b45309] to-[#92400e] rounded-b-md shadow-sm border-x border-b border-[#FFF2C3]/20"></div>
                                        {/* Răng chìa khóa 2 */}
                                        <div className="absolute right-10 top-4 w-4 h-5 bg-gradient-to-b from-[#b45309] to-[#92400e] rounded-b-md shadow-sm border-x border-b border-[#FFF2C3]/20"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
                        <div className="col-span-1 lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative z-20">

                            {/* SLIDING TAB SWITCHER */}
                            <div className="flex p-1.5 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] mb-8">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setFieldErrors({}); }}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                                        mode === 'login'
                                            ? 'bg-white text-[#0275FB] shadow-md scale-[1.02]'
                                            : 'text-[#64748B] hover:text-[#1E293B]'
                                    }`}
                                >
                                    Đăng Nhập
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('register'); setFieldErrors({}); setTermsAccepted(false); }}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                                        mode === 'register'
                                            ? 'bg-white text-[#0275FB] shadow-md scale-[1.02]'
                                            : 'text-[#64748B] hover:text-[#1E293B]'
                                    }`}
                                >
                                    Tạo Tài Khoản
                                </button>
                            </div>

                            {/* Tiêu đề Form */}
                            <div className="mb-8">
                                <h1 className="text-3xl font-black text-[#1E293B] tracking-tight">
                                    {mode === 'login' ? 'Chào Mừng Trở Lại!' : 'Bắt Đầu Hành Trình'}
                                </h1>
                                <p className="text-sm text-[#64748B] mt-2 font-medium">
                                    {mode === 'login'
                                        ? 'Đăng nhập vào tài khoản của bạn để tiếp tục khám phá.'
                                        : 'Thiết lập thông tin để cá nhân hóa trải nghiệm lịch sử của riêng bạn.'}
                                </p>
                            </div>

                            {/* FORM XÁC THỰC */}
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* Trường Tên hiển thị (Chỉ xuất hiện khi Đăng ký) */}
                                {mode === 'register' && (
                                    <div className="space-y-2 animate-[fadeInUp_0.3s_ease-out]">
                                        <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                                            Họ và Tên hiển thị <span className="text-[#0275FB]">*</span>
                                        </label>
                                        <div className="relative">
                                            <MaterialIcon name="badge" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none" />
                                            <input
                                                name="displayName"
                                                placeholder="Ví dụ: Nguyễn Quốc Huy"
                                                required
                                                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0275FB] focus:bg-white focus:ring-4 focus:ring-[#0275FB]/10 transition-all font-semibold shadow-sm"
                                            />
                                        </div>
                                        {fieldErrors.displayName && (
                                            <p className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 mt-1.5">
                                                <MaterialIcon name="error" className="text-sm" /> {fieldErrors.displayName}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Trường Email */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                                        Địa chỉ Email <span className="text-[#0275FB]">*</span>
                                    </label>
                                    <div className="relative">
                                        <MaterialIcon name="mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none" />
                                        <input
                                            name="email"
                                            placeholder="email@example.com"
                                            type="email"
                                            required
                                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0275FB] focus:bg-white focus:ring-4 focus:ring-[#0275FB]/10 transition-all font-semibold shadow-sm"
                                        />
                                    </div>
                                    {fieldErrors.email && (
                                        <p className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 mt-1.5">
                                            <MaterialIcon name="error" className="text-sm" /> {fieldErrors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Trường Mật khẩu */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                                            Mật khẩu <span className="text-[#0275FB]">*</span>
                                        </label>
                                        {mode === 'login' && (
                                            <a href="#" className="text-xs font-bold text-[#0275FB] hover:text-[#1d4ed8] transition-colors">
                                                Quên mật khẩu?
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <MaterialIcon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none" />
                                        <input
                                            name="password"
                                            placeholder="Tối thiểu 6 ký tự"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0275FB] focus:bg-white focus:ring-4 focus:ring-[#0275FB]/10 transition-all font-semibold shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0275FB] transition-colors cursor-pointer"
                                            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        >
                                            <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                                        </button>
                                    </div>
                                    {fieldErrors.password && (
                                        <p className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 mt-1.5">
                                            <MaterialIcon name="error" className="text-sm" /> {fieldErrors.password}
                                        </p>
                                    )}
                                </div>

                                {/* Checkbox Điều khoản & Chính sách */}
                                {mode === 'register' && (
                                    <div className="flex items-start gap-3 mt-4 mb-2 animate-[fadeInUp_0.3s_ease-out]">
                                        <div className="flex items-center h-5 mt-0.5">
                                            <input
                                                id="terms"
                                                type="checkbox"
                                                checked={termsAccepted}
                                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                                className="w-4 h-4 bg-white border border-[#CBD5E1] rounded accent-[#0275FB] focus:ring-[#0275FB]/30 cursor-pointer"
                                                required
                                            />
                                        </div>
                                        <label htmlFor="terms" className="text-xs text-[#64748B] leading-snug cursor-pointer font-medium">
                                            Tôi đã đọc và đồng ý với{' '}
                                            <Link to="/terms" className="text-[#0275FB] hover:text-[#1d4ed8] font-bold underline transition-colors cursor-pointer">
                                                Điều khoản dịch vụ
                                            </Link>
                                            {' '}và{' '}
                                            <Link to="/privacy" className="text-[#0275FB] hover:text-[#1d4ed8] font-bold underline transition-colors cursor-pointer">
                                                Chính sách bảo mật
                                            </Link>
                                            {' '}của TimeLens.
                                        </label>
                                    </div>
                                )}

                                {/* NÚT SUBMIT CHÍNH */}
                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={loading || (mode === 'register' && !termsAccepted)}
                                        className={`w-full h-14 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                            (mode === 'register' && !termsAccepted)
                                                ? 'bg-[#CBD5E1] shadow-none cursor-not-allowed'
                                                : 'bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] shadow-[0_8px_25px_rgba(2,117,251,0.35)] hover:shadow-[0_10px_30px_rgba(2,117,251,0.5)] hover:-translate-y-0.5 cursor-pointer'
                                        }`}
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <MaterialIcon name="progress_activity" className="animate-spin text-xl" />
                                                <span>Đang xử lý dữ liệu...</span>
                                            </span>
                                        ) : (
                                            <>
                                                <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản & Bắt Đầu'}</span>
                                                <MaterialIcon name="arrow_forward" className="text-lg" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>

                            {/* Đường phân cách */}
                            <div className="flex items-center my-8">
                                <div className="flex-grow h-px bg-[#E2E8F0]" />
                                <span className="px-4 text-[11px] font-black text-[#94A3B8] uppercase tracking-widest">Hoặc xác thực qua</span>
                                <div className="flex-grow h-px bg-[#E2E8F0]" />
                            </div>

                            {/* Social Login Button */}
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => void handleGoogleLogin()}
                                className="w-full h-12 bg-white border-2 border-[#E2E8F0] hover:border-[#0275FB]/50 rounded-xl text-sm font-bold text-[#475569] hover:text-[#0275FB] hover:bg-[#F8FAFC] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-60"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Tiếp tục với Google</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* SỬ DỤNG COMPONENT FOOTER CHUẨN */}
            <PublicFooter />

        </div>
    )
}