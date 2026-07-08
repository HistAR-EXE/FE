import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Thiếu mã xác thực trong liên kết.')
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
    // Only re-run when token changes. updateUser is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally exclude isAuthenticated to avoid flicker loops
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
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Xác thực email" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-lg mx-auto w-full">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md text-center">
          <h1 className="font-title-md text-on-surface">Xác thực email TimeLens</h1>
          {status === 'loading' && <p className="text-sm text-on-surface-variant">Đang xác thực...</p>}
          {status === 'success' && (
            <>
              <p className="text-sm text-primary">{message}</p>
              <p className="text-xs text-on-surface-variant">
                {isAuthenticated
                  ? 'Email đã kích hoạt. Bạn có thể bắt đầu khám phá TimeLens với gói Free.'
                  : 'Đăng nhập để bắt đầu khám phá TimeLens với gói Free.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-sm justify-center pt-sm">
                <Button type="button" onClick={handleContinue}>
                  Tiếp tục
                </Button>
                {!isAuthenticated && (
                  <Link to="/login">
                    <Button type="button" variant="outline">
                      Đăng nhập
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-sm text-error">{message}</p>
              <Link to={isAuthenticated ? '/settings' : '/login'}>
                <Button type="button" variant="outline">
                  {isAuthenticated ? 'Gửi lại từ Cài đặt' : 'Đăng nhập'}
                </Button>
              </Link>
            </>
          )}
        </section>
      </main>
    </AppLayout>
  )
}
