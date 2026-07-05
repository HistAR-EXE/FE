// src/pages/Login.tsx
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
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
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
    if (!emailPattern.test(email)) nextErrors.email = 'Email không hợp lệ'
    if (password.length < 6) nextErrors.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (mode === 'register' && !displayName) nextErrors.displayName = 'Vui lòng nhập tên hiển thị'
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
      const message = e instanceof ApiError ? e.message : 'Không thể đăng nhập. Vui lòng thử lại.'
      showToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-cover bg-center opacity-30 transform scale-105" style={{ backgroundImage: `url('${images.loginBg}')` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-secondary/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 pattern-overlay pointer-events-none" />
        </div>

        <header className="w-full top-0 sticky z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm transition-all duration-300">
          <div className="flex justify-between items-center h-20 px-safe-area-inset md:px-xl w-full max-w-[1440px] mx-auto">
            <Link to="/" className="font-display-lg text-display-lg font-bold text-primary tracking-tighter">
              TimeLens
            </Link>
            <div className="flex items-center gap-md">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`px-md py-xs rounded-full border ${mode === 'login' ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`px-md py-xs rounded-full border ${mode === 'register' ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}
              >
                Đăng ký
              </button>
            </div>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center w-full max-w-[1440px] mx-auto px-safe-area-inset md:px-xl py-xl">
          <div className="w-full max-w-5xl flex flex-col md:flex-row rounded-2xl overflow-hidden border border-outline-variant/30 shadow-2xl relative">
            <div className="hidden md:flex w-1/2 relative bg-surface-container-low overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('${images.loginPanel}')` }} />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-dim/40 to-surface-dim" />
              <div className="relative z-10 flex flex-col justify-end p-xl h-full w-full bg-gradient-to-t from-surface-dim to-transparent">
                <div className="w-16 h-1 bg-primary mb-md" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Mở Khóa Quá Khứ</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm">
                  Hành trình số hóa di sản bắt đầu từ đây. Kết nối để khám phá những câu chuyện bị lãng quên.
                </p>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-xl lg:p-[48px] glass-panel relative z-10 flex flex-col justify-center">
              <div className="mb-lg">
                <h1 className="font-display-lg text-display-lg text-primary tracking-tighter mb-xs">
                  {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  {mode === 'login' ? 'Đăng nhập để tiếp tục hành trình của bạn.' : 'Đăng ký để bắt đầu hành trình với TimeLens.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-md">
                {mode === 'register' && (
                  <div className="space-y-xs">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">Tên hiển thị</label>
                    <input name="displayName" placeholder="Tên hiển thị" required className="w-full neo-input rounded-lg px-md py-sm" />
                    {fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName}</p>}
                  </div>
                )}
                <div className="space-y-xs">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">Email</label>
                  <div className="relative">
                    <MaterialIcon name="mail" className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]" />
                    <input name="email" placeholder="Nhập địa chỉ email" type="email" required className="w-full neo-input rounded-lg pl-xl pr-sm py-sm" />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-xs">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">Mật khẩu</label>
                  <div className="relative">
                    <MaterialIcon name="lock" className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]" />
                    <input name="password" placeholder="••••••••" type="password" required className="w-full neo-input rounded-lg pl-xl pr-sm py-sm" />
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full mt-lg">
                  {loading ? 'Đang xử lý...' : mode === 'login' ? 'Tiếp tục' : 'Tạo tài khoản'}
                </Button>
              </form>
            </div>
          </div>
        </main>

        <Footer variant="login" />
      </div>
    </AuthLayout>
  )
}
