// src/pages/VerifyEmailPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { emailVerificationApi, type VerifyEmailStatus } from '../features/auth/emailVerificationApi'
import { profileApi } from '../features/profile/api'
import { useAuth } from '../shared/auth/useAuth'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { markEmailVerifiedInStorage } from '../shared/auth/session'
import { popReturnTo } from '../shared/router/returnTo'
import { getPostLoginRedirect } from '../shared/auth/types'
import { ApiError } from '../shared/api/contracts'

/** Survives StrictMode remount so one-time tokens are only confirmed once. */
const confirmPromises = new Map<string, Promise<VerifyEmailStatus>>()

function confirmTokenOnce(token: string): Promise<VerifyEmailStatus> {
    const existing = confirmPromises.get(token)
    if (existing) return existing
    const promise = emailVerificationApi.confirm(token).catch((err) => {
        confirmPromises.delete(token)
        throw err
    })
    confirmPromises.set(token, promise)
    return promise
}

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token') ?? ''
    const { isAuthenticated, updateUser, user } = useAuth()
    const navigate = useNavigate()

    // States quản lý giao diện
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('Thiếu mã bảo mật xác thực trong liên kết.')
            return
        }

        let cancelled = false
        const alreadyInFlight = confirmPromises.has(token)
        if (!alreadyInFlight) {
            setStatus('loading')
        }

        confirmTokenOnce(token)
            .then((result) => {
                if (cancelled) return
                setStatus('success')
                setMessage(result.message)
                markEmailVerifiedInStorage()
                updateUser({ emailVerified: true })
            })
            .catch(async (e) => {
                if (cancelled) return
                const maybeUsed =
                    e instanceof ApiError && /không hợp lệ|đã được sử dụng|invalid|already/i.test(e.message)
                if (maybeUsed) {
                    try {
                        if (isAuthenticated) {
                            const profile = await profileApi.me()
                            if (profile.emailVerified) {
                                setStatus('success')
                                setMessage('Email đã được xác thực thành công.')
                                markEmailVerifiedInStorage()
                                updateUser({ emailVerified: true })
                                return
                            }
                        } else if (localStorage.getItem('timelens_email_verified') === '1') {
                            setStatus('success')
                            setMessage('Email đã được xác thực thành công.')
                            return
                        }
                    } catch {
                        // fall through
                    }
                }
                setStatus('error')
                setMessage(getFriendlyErrorMessage(e, 'quest'))
            })

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, updateUser])

    const handleContinue = () => {
        markEmailVerifiedInStorage()
        updateUser({ emailVerified: true })
        if (isAuthenticated && user) {
            const dest = popReturnTo() ?? getPostLoginRedirect({ ...user, emailVerified: true }, null)
            navigate(dest, { replace: true })
            return
        }
        navigate('/login', { replace: true })
    }

    return (
        <AuthLayout>
            <div className="relative z-10 flex flex-col min-h-screen bg-[#0f1015] text-white font-sans selection:bg-[#fe951c] selection:text-black">

                {/* NỀN HIỆU ỨNG AMBIENT LIGHTING ĐỘNG THEO TRẠNG THÁI */}
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-20 scale-105 filter blur-[2px]"
                        style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0f1015] via-[#0f1015]/90 to-[#141620]/80" />
                    {status === 'success' ? (
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[150px] animate-pulse" />
                    ) : status === 'error' ? (
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-500/15 rounded-full blur-[150px] animate-pulse" />
                    ) : (
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#388cf1]/15 rounded-full blur-[150px] animate-pulse" />
                    )}
                </div>

                {/* HEADER ĐƠN GIẢN NẰM NGOÀI APP */}
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
                            <MaterialIcon name="verified_user" className="text-emerald-400 text-sm" />
                            <span>Cổng kiểm định bảo mật</span>
                        </div>
                    </div>
                </header>

                {/* KHỐI NỘI DUNG CHÍNH - CENTERED MODAL */}
                <main className="flex-grow flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
                    <div className="w-full max-w-md p-8 sm:p-10 flex flex-col items-center text-center rounded-3xl overflow-hidden border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8)] bg-[#141620]/90 backdrop-blur-2xl">

                        {/* TRẠNG THÁI LOADING */}
                        {(status === 'loading' || status === 'idle') && (
                            <div className="flex flex-col items-center animate-[fadeIn_0.5s_ease-out] w-full">
                                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                    <div className="absolute inset-0 rounded-full border-[3px] border-t-[#388cf1] border-r-transparent border-b-[#388cf1] border-l-transparent animate-spin" />
                                    <div className="absolute inset-2 rounded-full border border-dashed border-[#fe951c]/50 animate-[spin_3s_linear_infinite_reverse]" />
                                    <div className="w-12 h-12 rounded-full bg-[#388cf1]/20 flex items-center justify-center shadow-[0_0_20px_rgba(56,140,241,0.5)]">
                                        <MaterialIcon name="enhanced_encryption" className="text-[#388cf1] text-2xl" />
                                    </div>
                                </div>
                                <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Đang kiểm tra bảo mật...</h1>
                                <p className="text-sm text-gray-400 font-medium">Hệ thống đang xác thực mã định danh của bạn. Quá trình này sẽ mất vài giây.</p>
                            </div>
                        )}

                        {/* TRẠNG THÁI THÀNH CÔNG */}
                        {status === 'success' && (
                            <div className="flex flex-col items-center animate-[fadeInUp_0.5s_ease-out] w-full">
                                <div className="w-24 h-24 mb-6 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] relative">
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                                    <MaterialIcon name="check_circle" className="text-5xl text-emerald-400 relative z-10" />
                                </div>

                                <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Xác thực thành công!</h1>
                                <p className="text-sm text-gray-300 font-medium mb-8 leading-relaxed">
                                    {message || 'Tuyệt vời! Địa chỉ email của bạn đã được kích hoạt. Bạn hiện đã có thể bắt đầu khám phá TimeLens với thẻ Đặc quyền Gói Free.'}
                                </p>

                                <Button
                                    type="button"
                                    onClick={handleContinue}
                                    className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-black font-black text-sm uppercase tracking-wider shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>{isAuthenticated ? 'Tiếp Tục Vào Hệ Thống' : 'Đăng Nhập Ngay'}</span>
                                    <MaterialIcon name="login" className="text-xl font-bold" />
                                </Button>
                            </div>
                        )}

                        {/* TRẠNG THÁI LỖI */}
                        {status === 'error' && (
                            <div className="flex flex-col items-center animate-[fadeInUp_0.5s_ease-out] w-full">
                                <div className="w-24 h-24 mb-6 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                                    <MaterialIcon name="gpp_bad" className="text-5xl text-red-400" />
                                </div>

                                <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Xác thực thất bại</h1>
                                <p className="text-sm text-gray-300 font-medium mb-8 leading-relaxed">
                                    {message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.'}
                                </p>

                                <div className="w-full p-4 rounded-2xl bg-black/40 border border-red-500/20 mb-8 text-xs text-gray-400 text-left space-y-2">
                                    <p className="font-bold text-red-300">Cách khắc phục:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>Mỗi liên kết chỉ có hiệu lực sử dụng 1 lần duy nhất.</li>
                                        <li>{isAuthenticated ? 'Bạn có thể vào Cài đặt để yêu cầu gửi lại email mới.' : 'Vui lòng quay lại màn hình đăng nhập để yêu cầu mã mới.'}</li>
                                    </ul>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => navigate(isAuthenticated ? '/settings' : '/login', { replace: true })}
                                    className="w-full h-14 rounded-xl bg-[#1b1e2c] border border-white/10 hover:border-white/30 text-white font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <MaterialIcon name={isAuthenticated ? "settings" : "arrow_back"} className="text-xl" />
                                    <span>{isAuthenticated ? 'Vào Cài Đặt Gửi Lại' : 'Quay Lại Đăng Nhập'}</span>
                                </Button>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </AuthLayout>
    )
}