import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { EmailVerificationBanner } from '../components/auth/EmailVerificationBanner'
import { profileApi } from '../features/profile/api'
import { useAuth } from '../shared/auth/useAuth'
import { getPostLoginRedirect } from '../shared/auth/types'
import { EMAIL_VERIFIED_EVENT, markEmailVerifiedInStorage } from '../shared/auth/session'
import { peekReturnTo, popReturnTo } from '../shared/router/returnTo'
import { useToast } from '../shared/ui/toast/useToast'

export function VerifyEmailPendingPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [checking, setChecking] = useState(false)

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
          message: 'Email chưa được xác thực. Kiểm tra hộp thư hoặc bấm gửi lại.',
          type: 'info',
        })
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Xác thực email" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-lg mx-auto w-full space-y-md">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md text-center">
          <h1 className="font-title-md text-on-surface">Kích hoạt tài khoản</h1>
          <p className="text-sm text-on-surface-variant">
            Tài khoản{user?.email ? ` ${user.email}` : ''} cần xác thực email trước khi dùng TimeLens. Bấm gửi lại bên
            dưới: nếu môi trường local đang tắt SMTP (`MAIL_ENABLED=false`) sẽ hiện link xác thực ngay trên trang; nếu
            bật SMTP thật thì kiểm tra hộp thư (kể cả thư rác).
          </p>
          <EmailVerificationBanner
            emailVerified={false}
            onVerified={() => void advanceAfterVerified()}
          />
          <Button type="button" disabled={checking} onClick={() => void handleContinue()}>
            {checking ? 'Đang kiểm tra...' : 'Đã xác thực — Tiếp tục'}
          </Button>
        </section>
      </main>
    </AppLayout>
  )
}
