import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { passwordResetApi } from '../features/auth/passwordResetApi'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'

type Step = 'email' | 'otp' | 'password'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [debugOtp, setDebugOtp] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onRequest = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Vui lòng nhập email.')
      return
    }
    try {
      setLoading(true)
      const result = await passwordResetApi.request(trimmed)
      setEmail(trimmed)
      setDebugOtp(result.debugOtp ?? null)
      showToast({
        message: result.message || 'Nếu email tồn tại, chúng tôi đã gửi mã OTP.',
        type: 'success',
      })
      setStep('otp')
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Không gửi được yêu cầu. Vui lòng thử lại.'
      setError(message)
      showToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setError('OTP phải gồm đúng 6 chữ số.')
      return
    }
    try {
      setLoading(true)
      const result = await passwordResetApi.verifyOtp(email, code)
      setResetToken(result.resetToken)
      showToast({ message: result.message || 'OTP hợp lệ.', type: 'success' })
      setStep('password')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Xác thực OTP thất bại.'
      setError(message)
      showToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    try {
      setLoading(true)
      await passwordResetApi.confirm(resetToken, password)
      showToast({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.', type: 'success' })
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Không đặt lại được mật khẩu.'
      setError(message)
      showToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <PublicHeader />
      <main className="flex-grow pt-28 pb-16 px-4 bg-[#FAF8F3]">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_20px_60px_rgba(2,117,251,0.08)] p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#0275FB]/10 border border-[#0275FB]/30 flex items-center justify-center text-[#0275FB]">
              <MaterialIcon name="lock_reset" className="text-2xl" />
            </div>
            <h1 className="text-2xl font-black text-[#1E293B]">Quên mật khẩu</h1>
            <p className="text-sm text-[#64748B] font-medium">
              {step === 'email' && 'Nhập email đăng ký để nhận mã OTP 6 số.'}
              {step === 'otp' && `Nhập mã OTP đã gửi tới ${email}.`}
              {step === 'password' && 'Tạo mật khẩu mới cho tài khoản của bạn.'}
            </p>
          </div>

          {error && (
            <p className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5">
              <MaterialIcon name="error" className="text-sm" />
              {error}
            </p>
          )}

          {step === 'email' && (
            <form onSubmit={onRequest} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <MaterialIcon
                    name="mail"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                    placeholder="email@example.com"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#1E293B] font-semibold focus:outline-none focus:border-[#0275FB] focus:ring-4 focus:ring-[#0275FB]/10"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              {debugOtp && (
                <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Dev OTP (mail tắt): {debugOtp}
                </p>
              )}
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                  Mã OTP (6 số)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-3.5 text-center text-lg tracking-[0.4em] font-black text-[#1E293B] focus:outline-none focus:border-[#0275FB] focus:ring-4 focus:ring-[#0275FB]/10"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
              </Button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep('email')
                  setOtp('')
                  setError(null)
                }}
                className="w-full text-xs font-bold text-[#0275FB] hover:underline"
              >
                Gửi lại OTP với email khác
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={onConfirm} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <MaterialIcon
                    name="lock"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[#1E293B] font-semibold focus:outline-none focus:border-[#0275FB] focus:ring-4 focus:ring-[#0275FB]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0275FB]"
                  >
                    <MaterialIcon
                      name={showPassword ? 'visibility_off' : 'visibility'}
                      className="text-[20px]"
                    />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#475569] uppercase tracking-wider">
                  Xác nhận mật khẩu
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  required
                  minLength={6}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-3.5 text-sm text-[#1E293B] font-semibold focus:outline-none focus:border-[#0275FB] focus:ring-4 focus:ring-[#0275FB]/10"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-[#64748B] font-medium">
            Nhớ mật khẩu?{' '}
            <Link to="/login" className="text-[#0275FB] font-bold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </AuthLayout>
  )
}
