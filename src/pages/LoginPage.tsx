// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { useAuth } from '../shared/auth/useAuth'
import {
    getPostLoginRedirect,
    needsEmailVerification,
    type AuthUser,
} from '../shared/auth/types'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { Footer } from '../components/layout/Footer'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'
import { signInWithPopup, signOut } from 'firebase/auth'
import { firebaseAuth, firebaseEnabled, googleProvider } from '../shared/auth/firebase'
import { popReturnTo, peekReturnTo, readReturnTo, resolveReturnTo, stashReturnTo } from '../shared/router/returnTo'

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

    // --- STATES MỚI CHO UI/UX ĐĂNG KÝ ---
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
    const [isTermsOpen, setIsTermsOpen] = useState(false)

    // Khóa cuộn trang khi mở Popup Modal
    useEffect(() => {
        if (isPrivacyOpen || isTermsOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [isPrivacyOpen, isTermsOpen])

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

        // Chặn submit nếu đang ở mode Đăng ký mà chưa check đồng ý điều khoản
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
            const message = e instanceof ApiError ? e.message : 'Xác thực không thành công. Vui lòng kiểm tra lại thông định.'
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
        <AuthLayout>
            <div className="relative z-10 flex flex-col min-h-screen bg-[#0f1015] text-white font-sans selection:bg-[#fe951c] selection:text-black">

                {/* Nền hiệu ứng Ambient Lighting */}
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 filter blur-[2px]"
                        style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0f1015] via-[#0f1015]/90 to-[#141620]/80" />
                    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#fe951c]/15 rounded-full blur-[130px]" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#1a79e5]/15 rounded-full blur-[130px]" />
                </div>

                {/* HEADER ĐƠN GIẢN SANG TRỌNG - Đã đẩy w-full ra sát mép */}
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

                        <div className="text-xs sm:text-sm font-bold text-gray-300">
                            Đăng nhập để tiếp tục hành trình
                        </div>
                    </div>
                </header>

                {/* KHỐI NỘI DUNG CHÍNH */}
                <main className="flex-grow flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8)] bg-[#141620]/90 backdrop-blur-2xl relative z-10">

                        {/* CỘT TRÁI: BẢNG GIỚI THIỆU DI SẢN (Chỉ hiển thị trên PC) */}
                        <div className="hidden lg:flex lg:col-span-6 relative overflow-hidden flex-col justify-between p-10 bg-[#181a26]">
                            {/* Ảnh nền bảng di sản */}
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-1000 hover:scale-105"
                                style={{ backgroundImage: `url('${images.loginPanel || '/media/cu-chi/cover.jpg'}')` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-[#0f1015]/60 to-transparent" />
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#fe951c]/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Huy hiệu đỉnh */}
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-xs font-bold text-[#fdb438]">
                                    <span className="w-2 h-2 rounded-full bg-[#fe951c] animate-ping" />
                                    <span>Nền tảng Số hóa Di sản #1</span>
                                </div>
                            </div>

                            {/* Nội dung thông điệp */}
                            <div className="relative z-10 space-y-4 my-auto py-8">
                                <div className="w-12 h-1 bg-gradient-to-r from-[#fe951c] to-[#388cf1] rounded-full" />
                                <h2 className="text-3xl font-black tracking-tight text-white leading-snug">
                                    Mở Khóa Cánh Cổng <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#388cf1]">
                    Du Hành Thời Gian
                  </span>
                                </h2>
                                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                                    Đăng nhập để lưu trữ tiến độ tham quan Tour 360°, sưu tầm huy hiệu Hộ chiếu Di sản và đồng bộ các cuộc đối thoại cùng Trợ lý Lịch sử AI.
                                </p>
                            </div>

                            {/* Thẻ trạng thái hệ thống ngầm */}
                            <div className="relative z-10 p-4 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <MaterialIcon name="verified_user" className="text-emerald-400 text-lg" />
                                    <div>
                                        <p className="font-bold text-white">Bảo mật chuẩn RAG & JWT</p>
                                        <p className="text-[11px] text-gray-400">Dữ liệu được mã hóa an toàn</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                  ONLINE
                </span>
                            </div>
                        </div>

                        {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
                        <div className="col-span-1 lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center relative z-10">

                            {/* SLIDING TAB SWITCHER */}
                            <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/10 mb-8">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setFieldErrors({}); }}
                                    className={`py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                                        mode === 'login'
                                            ? 'bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black shadow-md scale-[1.02]'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Đăng Nhập
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('register'); setFieldErrors({}); setTermsAccepted(false); }}
                                    className={`py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                                        mode === 'register'
                                            ? 'bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black shadow-md scale-[1.02]'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Đăng Ký Mới
                                </button>
                            </div>

                            {/* Tiêu đề Form */}
                            <div className="mb-6">
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    {mode === 'login' ? 'Chào Mừng Trở Lại!' : 'Tạo Tài Khoản Trải Nghiệm'}
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1 font-medium">
                                    {mode === 'login'
                                        ? 'Nhập email và mật khẩu của bạn để vào không gian di sản.'
                                        : 'Hoàn tất thông tin để bắt đầu hành trình cùng TimeLens.'}
                                </p>
                            </div>

                            {/* FORM XÁC THỰC */}
                            <form onSubmit={handleSubmit} className="space-y-4">

                                {/* Trường Tên hiển thị (Chỉ xuất hiện khi Đăng ký) */}
                                {mode === 'register' && (
                                    <div className="space-y-1.5 animate-[fadeInUp_0.3s_ease-out]">
                                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                                            Họ và Tên hiển thị <span className="text-[#fe951c]">*</span>
                                        </label>
                                        <div className="relative">
                                            <MaterialIcon name="badge" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none" />
                                            <input
                                                name="displayName"
                                                placeholder="Ví dụ: Nguyễn Quốc Huy"
                                                required
                                                className="w-full bg-[#1b1e2c] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#fe951c] focus:ring-1 focus:ring-[#fe951c] transition-all"
                                            />
                                        </div>
                                        {fieldErrors.displayName && (
                                            <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-1">
                                                <MaterialIcon name="error" className="text-sm" /> {fieldErrors.displayName}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Trường Email */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                                        Địa chỉ Email <span className="text-[#fe951c]">*</span>
                                    </label>
                                    <div className="relative">
                                        <MaterialIcon name="mail" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none" />
                                        <input
                                            name="email"
                                            placeholder="email@example.com"
                                            type="email"
                                            required
                                            className="w-full bg-[#1b1e2c] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#fe951c] focus:ring-1 focus:ring-[#fe951c] transition-all"
                                        />
                                    </div>
                                    {fieldErrors.email && (
                                        <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-1">
                                            <MaterialIcon name="error" className="text-sm" /> {fieldErrors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Trường Mật khẩu có nút nhìn/ẩn */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                                            Mật khẩu <span className="text-[#fe951c]">*</span>
                                        </label>
                                        {mode === 'login' && (
                                            <a href="#" className="text-xs font-bold text-[#388cf1] hover:text-[#fdb438] transition-colors">
                                                Quên mật khẩu?
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <MaterialIcon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none" />
                                        <input
                                            name="password"
                                            placeholder="Tối thiểu 6 ký tự"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            className="w-full bg-[#1b1e2c] border border-white/10 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#fe951c] focus:ring-1 focus:ring-[#fe951c] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        >
                                            <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} className="text-lg" />
                                        </button>
                                    </div>
                                    {fieldErrors.password && (
                                        <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-1">
                                            <MaterialIcon name="error" className="text-sm" /> {fieldErrors.password}
                                        </p>
                                    )}
                                </div>

                                {/* THÊM MỚI: Checkbox Điều khoản & Chính sách (Chỉ hiện khi Đăng ký) */}
                                {mode === 'register' && (
                                    <div className="flex items-start gap-3 mt-4 mb-2 animate-[fadeInUp_0.3s_ease-out]">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="terms"
                                                type="checkbox"
                                                checked={termsAccepted}
                                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                                className="w-4 h-4 bg-[#1b1e2c] border border-white/20 rounded accent-[#fe951c] text-[#fe951c] focus:ring-[#fe951c] cursor-pointer"
                                                required
                                            />
                                        </div>
                                        <label htmlFor="terms" className="text-xs text-gray-400 leading-snug cursor-pointer">
                                            Tôi đã đọc và đồng ý với{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setIsTermsOpen(true); }}
                                                className="text-[#388cf1] hover:text-[#fdb438] font-bold underline transition-colors cursor-pointer"
                                            >
                                                Điều khoản dịch vụ
                                            </button>
                                            {' '}và{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setIsPrivacyOpen(true); }}
                                                className="text-[#388cf1] hover:text-[#fdb438] font-bold underline transition-colors cursor-pointer"
                                            >
                                                Chính sách bảo mật
                                            </button>
                                            {' '}của TimeLens.
                                        </label>
                                    </div>
                                )}

                                {/* NÚT SUBMIT CHÍNH */}
                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={loading || (mode === 'register' && !termsAccepted)}
                                        className={`w-full h-12 rounded-xl text-black font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(254,149,28,0.4)] transition-all flex items-center justify-center gap-2 ${
                                            (mode === 'register' && !termsAccepted)
                                                ? 'bg-gray-600 text-gray-400 shadow-none cursor-not-allowed opacity-70'
                                                : 'bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] hover:from-[#e07d0b] hover:to-[#fe951c] hover:shadow-[0_6px_25px_rgba(254,149,28,0.6)] transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                        }`}
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                        <MaterialIcon name="progress_activity" className="animate-spin text-lg" />
                        <span>Đang xử lý dữ liệu...</span>
                      </span>
                                        ) : (
                                            <>
                                                <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản & Bắt Đầu'}</span>
                                                <MaterialIcon name="arrow_forward" className="text-lg font-bold" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>

                            {/* Đường phân cách */}
                            <div className="flex items-center my-6">
                                <div className="flex-grow h-px bg-white/10" />
                                <span className="px-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Hoặc xác thực qua</span>
                                <div className="flex-grow h-px bg-white/10" />
                            </div>

                            {/* Social Login Button */}
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => void handleGoogleLogin()}
                                className="w-full h-11 bg-[#1b1e2c] hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-60"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Tiếp tục với Google</span>
                            </button>

                            {/* Lời khuyên chuyển đổi bên dưới */}
                            <p className="mt-6 text-center text-xs text-gray-400 font-medium">
                                {mode === 'login' ? 'Bạn chưa có tài khoản thành viên?' : 'Bạn đã có tài khoản sẵn sàng?'}{' '}
                                <button
                                    type="button"
                                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setFieldErrors({}); setTermsAccepted(false); }}
                                    className="text-[#fdb438] hover:underline font-bold cursor-pointer ml-1"
                                >
                                    {mode === 'login' ? 'Đăng ký miễn phí ngay' : 'Đăng nhập tại đây'}
                                </button>
                            </p>

                        </div>

                    </div>
                </main>

                {/* FOOTER */}
                <Footer variant="login" />

                {/* MODAL CHÍNH SÁCH BẢO MẬT (COPY TỪ ONBOARDING PAGE) */}
                {isPrivacyOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#0B1120]/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
                        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative text-[#1E293B]">
                            {/* Header Modal */}
                            <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1A79E5]/10 border border-[#1A79E5]/30 flex items-center justify-center text-[#1A79E5]">
                                        <MaterialIcon name="shield" className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#1E293B] uppercase tracking-wide">Chính Sách Bảo Mật</h3>
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Cập nhật lần cuối: 09/07/2026</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPrivacyOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#EF4444] transition-colors cursor-pointer shadow-sm"
                                >
                                    <MaterialIcon name="close" className="text-xl" />
                                </button>
                            </div>

                            {/* Body Modal (Scrollable) */}
                            <div className="overflow-y-auto p-6 md:p-8 space-y-8 text-[#334155] custom-scrollbar bg-white">
                                <section className="space-y-3">
                                    <h4 className="text-base font-black text-[#1A79E5] uppercase tracking-wider flex items-center gap-2">
                                        <MaterialIcon name="data_usage" className="text-lg text-[#FE951C]" /> 1. Thu Thập Dữ Liệu
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed">Khi bạn sử dụng nền tảng EdTech <strong>TimeLens</strong>, chúng tôi có thể thu thập các loại dữ liệu sau nhằm cá nhân hóa và nâng cao trải nghiệm học tập:</p>
                                    <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-[#475569]">
                                        <li><strong>Thông tin định danh:</strong> Tên, địa chỉ email, mã số học sinh (đối với Sub-accounts B2B) khi bạn tạo tài khoản.</li>
                                        <li><strong>Dữ liệu định vị (GPS & Geofencing):</strong> Được yêu cầu cấp quyền khi bạn sử dụng tính năng <em>Khám phá thực địa (O2O Interaction)</em> để mở khóa các mô hình AR 3D tại các di tích lịch sử. Chúng tôi chỉ thu thập vị trí tại thời điểm bạn "Check-in" hoặc quét mã QR.</li>
                                        <li><strong>Dữ liệu tương tác AI:</strong> Các đoạn hội thoại (prompts) giữa bạn và Trợ lý Lịch sử AI được lưu trữ nhằm mục đích cải thiện mô hình RAG và đánh giá mức độ tiếp thu kiến thức.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-base font-black text-[#1A79E5] uppercase tracking-wider flex items-center gap-2">
                                        <MaterialIcon name="insights" className="text-lg text-[#FE951C]" /> 2. Mục Đích Sử Dụng
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed">Chúng tôi cam kết chỉ sử dụng dữ liệu của bạn cho các mục đích phát triển giáo dục:</p>
                                    <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-[#475569]">
                                        <li>Đo lường tiến độ học tập và hiển thị trên Bảng xếp hạng (Leaderboard) của nền tảng.</li>
                                        <li>Cung cấp dữ liệu báo cáo thống kê chuyên sâu (Teacher Dashboard) dành cho quản trị viên nhà trường đối với hệ thống tài khoản B2B.</li>
                                        <li>Tối ưu hóa các điểm mù kiến thức dựa trên lịch sử tương tác với Cổng thời gian (Time Portal).</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-base font-black text-[#1A79E5] uppercase tracking-wider flex items-center gap-2">
                                        <MaterialIcon name="gpp_good" className="text-lg text-[#FE951C]" /> 3. Bảo Vệ Dữ Liệu & Quyền Người Dùng
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed">Toàn bộ dữ liệu cá nhân được mã hóa chuẩn công nghiệp và lưu trữ an toàn trên máy chủ đám mây. <strong>HistAR Team tuyệt đối không bán hoặc trao đổi dữ liệu cá nhân của học sinh cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.</strong></p>
                                    <p className="text-sm font-medium leading-relaxed">Bạn có quyền yêu cầu trích xuất toàn bộ dữ liệu học tập (Digital Passport) hoặc yêu cầu xóa vĩnh viễn tài khoản khỏi hệ thống bằng cách liên hệ với chúng tôi qua email hỗ trợ.</p>
                                </section>
                            </div>

                            {/* Footer Modal */}
                            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
                                <button onClick={() => setIsPrivacyOpen(false)} className="px-6 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#1A79E5] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md">Tôi Đã Hiểu</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL ĐIỀU KHOẢN DỊCH VỤ (COPY TỪ ONBOARDING PAGE) */}
                {isTermsOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#0B1120]/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
                        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative text-[#1E293B]">
                            {/* Header Modal */}
                            <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#FE951C]/10 border border-[#FE951C]/30 flex items-center justify-center text-[#d97706]">
                                        <MaterialIcon name="gavel" className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#1E293B] uppercase tracking-wide">Điều Khoản Dịch Vụ</h3>
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Hiệu lực từ: 09/07/2026</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsTermsOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#EF4444] transition-colors cursor-pointer shadow-sm"
                                >
                                    <MaterialIcon name="close" className="text-xl" />
                                </button>
                            </div>

                            {/* Body Modal (Scrollable) */}
                            <div className="overflow-y-auto p-6 md:p-8 space-y-8 text-[#334155] custom-scrollbar bg-white">
                                <div className="p-4 rounded-xl bg-[#FE951C]/10 border border-[#FE951C]/30 text-sm font-medium text-[#b45309]">
                                    Việc bạn truy cập và sử dụng nền tảng <strong>TimeLens</strong> đồng nghĩa với việc bạn đồng ý hoàn toàn với các điều khoản dưới đây do <strong>HistAR Team</strong> quy định.
                                </div>

                                <section className="space-y-3">
                                    <h4 className="text-base font-black text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                                        <MaterialIcon name="extension" className="text-lg text-[#1A79E5]" /> 1. Quyền Sở Hữu Trí Tuệ
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed">
                                        Tất cả nội dung trên nền tảng bao gồm nhưng không giới hạn ở: <strong>Mô hình 3D (AR Models), không gian Tour 360°, nội dung thuyết minh lịch sử, thiết kế giao diện (UI/UX) và mã nguồn</strong> đều thuộc sở hữu trí tuệ độc quyền của HistAR Team và các đơn vị đối tác cấp phép.
                                    </p>
                                    <p className="text-sm font-medium leading-relaxed text-red-600 font-bold">
                                        Nghiêm cấm mọi hành vi sao chép, trích xuất (scraping) mô hình 3D, dữ liệu API hoặc sử dụng tài sản nền tảng vào mục đích thương mại khi chưa có sự cho phép bằng văn bản.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-base font-black text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                                        <MaterialIcon name="psychology" className="text-lg text-[#1A79E5]" /> 2. Giới Hạn Trách Nhiệm Về Trí Tuệ Nhân Tạo (AI)
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed">
                                        Hệ thống <strong>Trợ Lý Lịch Sử AI</strong> của TimeLens được xây dựng dựa trên kiến trúc RAG (Retrieval-Augmented Generation) kết hợp với các nguồn sử liệu chính thống đã được số hóa. Tuy nhiên:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-[#475569]">
                                        <li>AI có thể thỉnh thoảng sinh ra các câu trả lời không chính xác tuyệt đối. Người dùng (đặc biệt là học sinh) cần tham chiếu các nguồn tài liệu (Cited Sources) đính kèm trong câu trả lời để kiểm chứng.</li>
                                        <li>Nền tảng không chịu trách nhiệm pháp lý nếu người dùng sử dụng nội dung do AI tạo ra để phục vụ cho các kỳ thi học thuật chính quy có yếu tố bắt buộc về tính tuyệt đối.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-base font-black text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                                        <MaterialIcon name="receipt_long" className="text-lg text-[#1A79E5]" /> 3. Thanh Toán, Cấp Phép & Hoàn Tiền
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-[#475569]">
                                        <li><strong>Đối với tài khoản cá nhân (B2C Premium):</strong> Phí duy trì được tính theo tháng/năm. Không hỗ trợ hoàn tiền cho chu kỳ thanh toán đang diễn ra nếu bạn hủy dịch vụ giữa chừng.</li>
                                        <li><strong>Đối với tài khoản trường học (B2B Licensing):</strong> Master Account chịu trách nhiệm cấp phát và thu hồi Sub-account đúng với giới hạn của gói (Micro/Standard/Premium). Nếu số lượng CCU (người dùng đồng thời) vượt mức cho phép, hệ thống sẽ tự động đưa người dùng vào hàng chờ.</li>
                                    </ul>
                                </section>
                            </div>

                            {/* Footer Modal */}
                            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
                                <button onClick={() => setIsTermsOpen(false)} className="px-6 py-2.5 rounded-xl bg-[#FE951C] hover:bg-[#e07d0b] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md">Tôi Đã Hiểu</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AuthLayout>
    )
}