import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { emailVerificationApi } from '../../features/auth/emailVerificationApi'
import { useToast } from '../../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'

const DEBUG_TOKEN_STORAGE_KEY = 'timelens_verify_debug_token'

type EmailVerificationBannerProps = {
  emailVerified?: boolean
  onVerified?: () => void
  className?: string
}

function buildVerifyLink(token: string): string {
  return `${window.location.origin}/verify-email?token=${token}`
}

export function EmailVerificationBanner({
  emailVerified,
  onVerified,
  className = '',
}: EmailVerificationBannerProps) {
  const { showToast } = useToast()
  const [sending, setSending] = useState(false)
  const [localVerifyLink, setLocalVerifyLink] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(DEBUG_TOKEN_STORAGE_KEY)
    if (stored) {
      setLocalVerifyLink(buildVerifyLink(stored))
    }
  }, [])

  if (emailVerified !== false) {
    return null
  }

  const handleResend = async () => {
    try {
      setSending(true)
      const result = await emailVerificationApi.resend()
      if (result.debugToken) {
        sessionStorage.setItem(DEBUG_TOKEN_STORAGE_KEY, result.debugToken)
        setLocalVerifyLink(buildVerifyLink(result.debugToken))
        showToast({
          message:
            'BE trả link xác thực trực tiếp (MAIL_ENABLED=false hoặc HISTAR_TEST_HOOKS_ENABLED=true). Mở link bên dưới.',
          type: 'info',
        })
      } else {
        sessionStorage.removeItem(DEBUG_TOKEN_STORAGE_KEY)
        setLocalVerifyLink(null)
        showToast({ message: result.message, type: 'success' })
      }
      if (result.emailVerified) {
        onVerified?.()
      }
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={`rounded-xl border border-secondary/40 bg-secondary/10 p-md text-sm space-y-sm ${className}`}
      role="alert"
    >
      <p className="font-medium text-on-surface">Email chưa được xác thực</p>
      <p className="text-on-surface-variant">
        Kiểm tra hộp thư (cả thư rác). Nếu không thấy email sau khi đăng ký, bấm &quot;Gửi lại&quot; — tối đa 1 lần
        mỗi 60 giây sau khi gửi thành công.
      </p>
      <Button type="button" variant="outline" disabled={sending} onClick={() => void handleResend()}>
        {sending ? 'Đang gửi...' : 'Gửi lại email xác thực'}
      </Button>
      {localVerifyLink && (
        <div className="rounded-lg border border-outline-variant bg-surface p-sm space-y-xs text-left">
          <p className="text-xs text-on-surface-variant">
            Link xác thực dev (khi SMTP tắt hoặc test hooks bật). Mở link này:
          </p>
          <a href={localVerifyLink} className="break-all text-secondary underline text-xs">
            {localVerifyLink}
          </a>
        </div>
      )}
    </div>
  )
}
