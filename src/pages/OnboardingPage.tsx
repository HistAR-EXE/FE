// src/pages/OnboardingPage.tsx
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Footer } from '../components/layout/Footer'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { useAuth } from '../shared/auth/useAuth'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const handleStart = () => {
    navigate(isAuthenticated ? '/home' : '/explore')
  }

  return (
    <AuthLayout>
      <main className="flex-grow flex items-center justify-center relative overflow-hidden hero-pattern">
        <div className="absolute inset-0 z-0">
          <img
            alt="Hoàng thành Thăng Long về đêm"
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            src={images.onboardingHero}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-4xl px-safe-area-inset mx-auto text-center flex flex-col items-center">
          <div className="mb-xl animate-fade-in-up">
            <h2 className="font-display-lg text-display-lg font-bold text-primary tracking-tighter drop-shadow-md">
              TimeLens
            </h2>
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mt-base opacity-80">
              Hành Trình Di Sản Số
            </p>
          </div>

          <div
            className="mb-xl space-y-md max-w-2xl animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <h1 className="font-display-lg text-display-lg text-on-surface drop-shadow-lg">
              Mở Khóa <span className="text-primary glow-text">Du Hành Thời Gian</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
              Khám phá những lớp trầm tích lịch sử qua lăng kính công nghệ hiện đại. Trải
              nghiệm không gian giao thoa giữa quá khứ hào hùng và tương lai kỳ vĩ.
            </p>
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-md w-full max-w-md mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <button
              type="button"
              onClick={handleStart}
              className="w-full sm:w-auto px-xl py-sm bg-primary text-on-primary font-title-md text-title-md rounded-full shadow-[0_0_15px_rgba(242,191,80,0.3)] hover:shadow-[0_0_25px_rgba(242,191,80,0.5)] transition-all duration-300 transform hover:-translate-y-1"
            >
              Bắt đầu
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-xl py-sm border border-secondary text-secondary font-title-md text-title-md rounded-full glow-effect hover:bg-secondary/10 transition-all duration-300"
            >
              Đăng nhập
            </button>
          </div>

          <div className="mt-xl pt-xl flex flex-col items-center opacity-50 animate-pulse">
            <MaterialIcon name="keyboard_double_arrow_down" className="text-secondary text-[32px]" />
          </div>
        </div>
      </main>
      <Footer />
    </AuthLayout>
  )
}
