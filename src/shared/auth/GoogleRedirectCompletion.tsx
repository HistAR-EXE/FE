import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/contracts'
import { useToast } from '../ui/toast/useToast'
import { popReturnTo, peekReturnTo, readReturnTo } from '../router/returnTo'
import { useAuth } from './useAuth'
import {
  didGoogleRedirectFailAfterPending,
  firebaseAuth,
  firebaseEnabled,
  isFirebaseAuthCallbackUrl,
  isGoogleRedirectPending,
  resolveGoogleRedirectIdToken,
} from './firebase'
import { getPostLoginRedirect } from './types'
import { setGoogleRedirectBusy } from './googleRedirectBusy'

function authErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

/** Finishes Firebase Google redirect once per full page load (Safari-safe). */
export function GoogleRedirectCompletion() {
  const { loginWithGoogle, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const startedRef = useRef(false)

  useEffect(() => {
    if (!firebaseEnabled || !firebaseAuth || startedRef.current) return
    if (isAuthenticated) return
    startedRef.current = true

    const showBusy = isGoogleRedirectPending() || isFirebaseAuthCallbackUrl()
    if (showBusy) setGoogleRedirectBusy(true)

    void (async () => {
      try {
        const idToken = await resolveGoogleRedirectIdToken(firebaseAuth)
        if (!idToken) {
          if (didGoogleRedirectFailAfterPending()) {
            showToast({
              message:
                'Không hoàn tất đăng nhập Google sau khi chọn tài khoản. Mở timelens.asia bằng Safari/Chrome (không dùng tab in-app), hoặc thử lại.',
              type: 'error',
            })
          }
          return
        }

        const loggedInUser = await loginWithGoogle(idToken)
        const returnTo = readReturnTo(searchParams) ?? peekReturnTo() ?? popReturnTo()
        navigate(
          getPostLoginRedirect(
            { ...loggedInUser, emailVerified: true, provider: 'google' },
            returnTo,
          ),
          { replace: true },
        )
      } catch (e) {
        const code = authErrorCode(e)
        if (code === 'auth/credential-already-in-use') return
        const message =
          e instanceof ApiError
            ? e.message
            : code === 'auth/network-request-failed'
              ? 'Mất kết nối khi đăng nhập Google. Kiểm tra mạng hoặc thử lại.'
              : e instanceof Error
                ? e.message
                : 'Đăng nhập Google thất bại.'
        showToast({ message, type: 'error' })
      } finally {
        if (showBusy) setGoogleRedirectBusy(false)
      }
    })()
    // Run once per full page load — do not depend on isAuthenticated (cleanup cancelled navigate).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
