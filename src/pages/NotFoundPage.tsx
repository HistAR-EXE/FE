import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Footer } from '../components/layout/Footer'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useAuth } from '../shared/auth/useAuth'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <AuthLayout>
      <main className="flex-grow flex items-center justify-center relative overflow-hidden hero-pattern px-safe-area-inset">
        <div className="relative z-10 w-full max-w-xl mx-auto text-center flex flex-col items-center gap-lg">
          <MaterialIcon name="explore_off" className="text-primary text-[72px] opacity-80" />
          <div className="space-y-md">
            <h1 className="font-display-lg text-display-lg text-on-surface drop-shadow-lg">
              <span className="text-primary glow-text">404</span> — Lạc lối giữa dòng lịch sử
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
              Trang bạn tìm không tồn tại hoặc đã được dời đi. Hãy quay lại hành trình khám phá di sản.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-md w-full max-w-md mx-auto">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/home' : '/explore')}
              className="w-full sm:w-auto px-xl py-sm bg-primary text-on-primary font-title-md text-title-md rounded-full shadow-[0_0_15px_rgba(242,191,80,0.3)] hover:shadow-[0_0_25px_rgba(242,191,80,0.5)] transition-all duration-300 transform hover:-translate-y-1"
            >
              Về trang khám phá
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-xl py-sm border border-secondary text-secondary font-title-md text-title-md rounded-full hover:bg-secondary/10 transition-all duration-300"
            >
              Quay lại
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </AuthLayout>
  )
}
