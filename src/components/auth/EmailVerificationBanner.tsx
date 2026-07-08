import { useState } from 'react'
import { Button } from '../ui/Button'
import { emailVerificationApi } from '../../features/auth/emailVerificationApi'
import { useToast } from '../../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'

type EmailVerificationBannerProps = {
  emailVerified?: boolean
  onVerified?: () => void
  className?: string
}

export function EmailVerificationBanner({
  emailVerified,
  onVerified,
  className = '',
}: EmailVerificationBannerProps) {
  const { showToast } = useToast()
  const [sending, setSending] = useState(false)
  const [localVerifyLink, setLocalVerifyLink] = useState<string | null>(null)

  if (emailVerified !== false) {
    return null
  }

  const handleResend = async () => {
    try {
      setSending(true)
      const result = await emailVerificationApi.resend()
      if (result.debugToken) {
        const link = `${window.location.origin}/verify-email?token=${result.debugToken}`
        setLocalVerifyLink(link)
        showToast({
          message: 'Local đang tắt SMTP (MAIL_ENABLED=false). Dùng link xác thực bên dưới.',
          type: 'info',
        })
      } else {
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
        Bạn cần xác thực email để sử dụng TimeLens. Kiểm tra hộp thư (cả thư rác) hoặc gửi lại email.
      </p>
      <Button type="button" variant="outline" disabled={sending} onClick={() => void handleResend()}>
        {sending ? 'Đang gửi...' : 'Gửi lại email xác thực'}
      </Button>
      {localVerifyLink && (
        <div className="rounded-lg border border-outline-variant bg-surface p-sm space-y-xs text-left">
          <p className="text-xs text-on-surface-variant">
            Môi trường local chưa gửi SMTP thật. Mở link này để xác thực:
          </p>
          <a href={localVerifyLink} className="break-all text-secondary underline text-xs">
            {localVerifyLink}
          </a>
        </div>
      )}
    </div>
  )
}
