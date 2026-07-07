// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { useAuth } from '../shared/auth/useAuth'
import { getAlreadyLoggedInRedirect, getPostLoginRedirect, isSafeRedirect } from '../shared/auth/types'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { Footer } from '../components/layout/Footer'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'

export function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login, register, user } = useAuth()

    // State quản lý chế độ và UX
    const [mode, setMode] = useState<'login' | 'register'>('login')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const { showToast } = useToast()

    const pendingFrom = useMemo(() => {
        const from = (location.state as { from?: string } | null)?.from
        return from && from.startsWith('/') && from !== '/mode-select' && isSafeRedirect(from) ? from : null
    }, [location.state])

    useEffect(() => {
        if (!user) return
        navigate(getAlreadyLoggedInRedirect(user), { replace: true })
    }, [user, navigate])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
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
            const loggedInUser =
                mode === 'login'
                    ? await login({ email, password })
                    : await register({ email, password, displayName })
            const destination = getPostLoginRedirect(loggedInUser, pendingFrom)
            navigate(destination, {
                replace: true,
                state: destination === '/mode-select' && pendingFrom ? { from: pendingFrom } : undefined,
            })
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

                {/* HEADER ĐƠN GIẢN SANG TRỌNG */}
                <header className="w-full top-0 sticky z-50 bg-[#0f1015]/80 backdrop-blur-xl border-b border-white/10 transition-all">
                    <div className="flex justify-between items-center h-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
                        <Link to="/" className="flex items-center gap-3 group">
                            <img src="/brand/icon-192.png" alt="TimeLens Logo" className="w-9 h-9 rounded-full border border-[#fdb438]/60 object-cover shadow-sm" />
                            <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white group-hover:text-[#fdb438] transition-colors">
                  TimeLens
                </span>
                                <span className="text-[9px] font-bold text-[#fe951c] tracking-widest uppercase -mt-1">
                  by HistAR Team
                </span>
                            </div>
                        </Link>

                        <Link
                            to="/explore"
                            className="text-xs sm:text-sm font-bold text-gray-300 hover:text-[#fdb438] transition-colors flex items-center gap-1.5"
                        >
                            <span>Khám phá không cần tài khoản</span>
                            <MaterialIcon name="arrow_forward" className="text-base" />
                        </Link>
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
                                    onClick={() => { setMode('register'); setFieldErrors({}); }}
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
                                        : 'Hoàn tất thông tin bên dưới để bắt đầu hành trình cùng TimeLens.'}
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

                                {/* NÚT SUBMIT CHÍNH */}
                                <div className="pt-3">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] hover:from-[#e07d0b] hover:to-[#fe951c] text-black font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(254,149,28,0.4)] hover:shadow-[0_6px_25px_rgba(254,149,28,0.6)] transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
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
                                onClick={() => showToast({ message: 'Đăng nhập nhanh Google sẽ được mở ở phiên bản Production chính thức.', type: 'info' })}
                                className="w-full h-11 bg-[#1b1e2c] hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Tiếp tục với Google ID</span>
                            </button>

                            {/* Lời khuyên chuyển đổi bên dưới */}
                            <p className="mt-6 text-center text-xs text-gray-400 font-medium">
                                {mode === 'login' ? 'Bạn chưa có tài khoản thành viên?' : 'Bạn đã có tài khoản sẵn sàng?'}{' '}
                                <button
                                    type="button"
                                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setFieldErrors({}); }}
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
            </div>
        </AuthLayout>
    )
}