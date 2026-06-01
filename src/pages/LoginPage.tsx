import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Footer } from '../components/layout/Footer'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')

    if (!email || !password) return

    sessionStorage.setItem('timelens_auth', 'true')
    navigate('/home')
  }

  return (
    <AuthLayout>
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 transform scale-105"
            style={{ backgroundImage: `url('${images.loginBg}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-secondary/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 pattern-overlay pointer-events-none" />
        </div>

        <header className="w-full top-0 sticky z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm transition-all duration-300">
          <div className="flex justify-between items-center h-20 px-safe-area-inset md:px-xl w-full max-w-[1440px] mx-auto">
            <Link
              to="/"
              className="font-display-lg text-display-lg font-bold text-primary tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
            >
              TimeLens
            </Link>
            <nav className="hidden md:flex items-center gap-lg">
              <Link to="/explore" className="text-on-surface-variant font-medium font-body-lg text-body-lg hover:text-secondary transition-colors">
                Khám Phá
              </Link>
              <Link to="/explore/thang-long" className="text-on-surface-variant font-medium font-body-lg text-body-lg hover:text-secondary transition-colors">
                Di Sản
              </Link>
              <Link to="/quests" className="text-on-surface-variant font-medium font-body-lg text-body-lg hover:text-secondary transition-colors">
                Nhiệm Vụ
              </Link>
              <Link to="/profile" className="text-on-surface-variant font-medium font-body-lg text-body-lg hover:text-secondary transition-colors">
                Hồ Sơ
              </Link>
            </nav>
            <div className="flex items-center gap-md">
              <Link
                to="/login"
                className="hidden md:block text-secondary font-medium font-body-lg text-body-lg"
              >
                Đăng nhập
              </Link>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="bg-primary text-on-primary font-title-md text-title-md px-lg py-sm rounded-full shadow-[0_0_15px_rgba(242,191,80,0.3)] hover:shadow-[0_0_25px_rgba(242,191,80,0.5)] transition-all duration-300 cursor-pointer active:scale-95"
              >
                Bắt đầu
              </button>
            </div>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center w-full max-w-[1440px] mx-auto px-safe-area-inset md:px-xl py-xl">
          <div className="w-full max-w-5xl flex flex-col md:flex-row rounded-2xl overflow-hidden border border-outline-variant/30 shadow-2xl relative">
            <div className="hidden md:flex w-1/2 relative bg-surface-container-low overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60"
                style={{ backgroundImage: `url('${images.loginPanel}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-dim/40 to-surface-dim" />
              <div className="relative z-10 flex flex-col justify-end p-xl h-full w-full bg-gradient-to-t from-surface-dim to-transparent">
                <div className="w-16 h-1 bg-primary mb-md" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
                  Mở Khóa Quá Khứ
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm">
                  Hành trình số hóa di sản bắt đầu từ đây. Kết nối để khám phá những câu chuyện
                  bị lãng quên.
                </p>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-xl lg:p-[48px] glass-panel relative z-10 flex flex-col justify-center">
              <div className="mb-lg">
                <h1 className="font-display-lg text-display-lg text-primary tracking-tighter mb-xs">
                  Chào mừng trở lại
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Đăng nhập để tiếp tục hành trình của bạn.
                </p>
              </div>

              <form className="space-y-md w-full" onSubmit={handleSubmit}>
                <div className="space-y-xs">
                  <label
                    className="block font-label-sm text-label-sm text-on-surface-variant"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <MaterialIcon
                      name="mail"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]"
                    />
                    <input
                      className="w-full neo-input rounded-lg pl-xl pr-sm py-sm font-body-md text-body-md focus:ring-1 focus:ring-secondary focus:border-secondary"
                      id="email"
                      name="email"
                      placeholder="Nhập địa chỉ email"
                      type="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-xs">
                  <div className="flex justify-between items-center">
                    <label
                      className="block font-label-sm text-label-sm text-on-surface-variant"
                      htmlFor="password"
                    >
                      Mật khẩu
                    </label>
                    <a
                      className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors"
                      href="#"
                    >
                      Quên mật khẩu?
                    </a>
                  </div>
                  <div className="relative">
                    <MaterialIcon
                      name="lock"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]"
                    />
                    <input
                      className="w-full neo-input rounded-lg pl-xl pr-xl py-sm font-body-md text-body-md focus:ring-1 focus:ring-secondary focus:border-secondary"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface transition-colors"
                    >
                      <MaterialIcon
                        name={showPassword ? 'visibility_off' : 'visibility'}
                        className="text-[20px]"
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-lg bg-primary text-on-primary font-title-md text-title-md py-sm rounded-lg shadow-[0_0_15px_rgba(242,191,80,0.2)] hover:shadow-[0_0_25px_rgba(242,191,80,0.4)] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-xs"
                >
                  <span>Tiếp tục</span>
                  <MaterialIcon name="arrow_forward" className="text-[20px]" />
                </button>
              </form>

              <div className="flex items-center my-lg">
                <div className="flex-grow h-px bg-outline-variant/30" />
                <span className="px-sm font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                  Hoặc
                </span>
                <div className="flex-grow h-px bg-outline-variant/30" />
              </div>

              <button
                type="button"
                className="w-full bg-surface-container border border-outline-variant/50 text-on-surface font-title-md text-title-md py-sm rounded-lg hover:bg-surface-container-highest transition-colors duration-300 active:scale-[0.98] flex items-center justify-center gap-sm"
              >
                <svg className="w-5 h-5 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Tiếp tục với Google</span>
              </button>

              <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
                Chưa có tài khoản?{' '}
                <a className="text-primary hover:text-primary-fixed transition-colors font-medium" href="#">
                  Đăng ký ngay
                </a>
              </p>
            </div>
          </div>
        </main>

        <Footer variant="login" />
      </div>
    </AuthLayout>
  )
}
