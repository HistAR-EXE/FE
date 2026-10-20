import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { getData, httpClient } from '../../shared/api/httpClient'
import { ApiError } from '../../shared/api/contracts'
import type { ArArtifact } from './arExperience'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

type MailStatus = { available: boolean; verified: boolean; email: string | null; cooldownSeconds: number; remainingToday: number; unavailableReason?: string | null }
function readStatus(value: MailStatus): MailStatus {
  if (!value || typeof value.available !== 'boolean' || typeof value.verified !== 'boolean' || !(value.email === null || typeof value.email === 'string') || !Number.isSafeInteger(value.cooldownSeconds) || value.cooldownSeconds < 0 || !Number.isSafeInteger(value.remainingToday) || value.remainingToday < 0 || value.remainingToday > 3) throw new Error('INVALID_MAIL_STATUS')
  return value
}
export function ArCardEmail({ artifact }: { artifact: ArArtifact }) {
  const { user } = useAuth()
  return <ArCardEmailForm key={`${user?.id ?? 'guest'}:${artifact.id}`} signedIn={Boolean(user)} artifact={artifact} />
}
function ArCardEmailForm({ signedIn, artifact }: { signedIn: boolean; artifact: ArArtifact }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [needsNewRequest, setNeedsNewRequest] = useState(false)
  const inFlight = useRef(false)
  const requestId = useRef<string | null>(null)
  useEffect(() => {
    if (!open || !signedIn) return
    let active = true
    void getData<MailStatus>(httpClient.get('/api/ar/cards/email/status', { timeout: 15000 }))
      .then(value => { if (active) { setStatus(readStatus(value)); setLoading(false) } })
      .catch(() => { if (active) { setNotice('Chưa kiểm tra được dịch vụ email. Bạn vẫn có thể tải hoặc in ảnh.'); setLoading(false) } })
    return () => { active = false }
  }, [open, signedIn])
  useEffect(() => {
    if (!status?.cooldownSeconds) return
    const timer = window.setInterval(() => setStatus(value => value ? { ...value, cooldownSeconds: Math.max(0, value.cooldownSeconds - 1) } : value), 1000)
    return () => window.clearInterval(timer)
  }, [status?.cooldownSeconds])
  const eligible = Boolean(status?.available && status.verified && status.email && !status.cooldownSeconds && status.remainingToday && !sending)
  const canSend = eligible && !needsNewRequest
  const send = async () => {
    if (!canSend || inFlight.current) return
    inFlight.current = true; setSending(true); setNotice('')
    requestId.current ??= crypto.randomUUID()
    try {
      const result = await getData<{ status: string; artifactId: string; cooldownSeconds: number; remainingToday: number }>(httpClient.post('/api/ar/cards/email', { requestId: requestId.current, artifactId: artifact.id }, { timeout: 75000 }))
      if (result.status !== 'ACCEPTED' || result.artifactId !== artifact.id) throw new Error('UNCONFIRMED')
      setStatus(readStatus({ ...status!, ...result }))
      requestId.current = null
      setNotice(`Dịch vụ email đã tiếp nhận ảnh ${artifact.name}. Hãy kiểm tra Hộp thư đến và Spam; thư có thể đến sau ít phút.`)
    } catch (error) {
      const code = error instanceof ApiError ? error.code : ''
      if (!code || ['MAIL_DELIVERY_UNKNOWN', 'REQUEST_IN_PROGRESS'].includes(code)) setNeedsNewRequest(true)
      setNotice(code === 'MAIL_UNAVAILABLE' ? 'Dịch vụ email chưa sẵn sàng. Bạn vẫn có thể tải hoặc in ảnh.' : code === 'EMAIL_NOT_VERIFIED' ? 'Vui lòng xác minh email tài khoản trước khi nhận ảnh.' : code === 'MAIL_RATE_LIMITED' ? 'Bạn vừa gửi hoặc đã đạt giới hạn 3 lần trong 24 giờ. Vui lòng thử lại sau.' : 'Chưa xác nhận được kết quả gửi. Hãy kiểm tra Hộp thư đến và Spam trước khi thử lại. Hệ thống không tự gửi lại thư.')
      void getData<MailStatus>(httpClient.get('/api/ar/cards/email/status', { timeout: 15000 })).then(value => setStatus(readStatus(value))).catch(() => { /* Keep download and print available. */ })
    } finally { inFlight.current = false; setSending(false) }
  }
  return <section className="ar-card-email" aria-label="Nhận ảnh qua email">
    <button aria-label="Nhận ảnh qua email" className="ar-text-link" aria-expanded={open} onClick={() => { if (!open) { setLoading(signedIn); setNotice('') } setOpen(value => !value) }}><MaterialIcon name="mail" />Nhận ảnh qua email</button>
    {open && <div className="ar-email-content"><p>Nhận 01 ảnh màu dành riêng cho <strong>{artifact.name}</strong>, kèm liên kết tải ảnh, in ảnh và mở đúng mô hình AR. Có thể mở trên màn hình khác hoặc in màu để quét; không cần tải tệp đính kèm nặng.</p>
      {!signedIn ? <Link to={`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>Đăng nhập để nhận ảnh</Link> : loading ? <p role="status">Đang kiểm tra email tài khoản…</p> : status && <>
        <p>Gửi tới <strong>{status.email}</strong> · Email tài khoản của bạn.</p>
        {!status.email && <p>Tài khoản chưa có địa chỉ email để nhận ảnh.</p>}
        {!status.verified && <Link to="/verify-email/pending">Xác minh email để nhận ảnh</Link>}
        {!status.available && <p>{unavailableMessage(status.unavailableReason)}</p>}
        <button className="ar-button ar-button-blue" disabled={!canSend} onClick={() => void send()}>{sending ? 'Đang gửi yêu cầu…' : `Gửi ảnh ${artifact.name} vào email`}</button>
        <small>{status.remainingToday === 0 ? 'Bạn đã dùng hết 3 lượt trong 24 giờ. Vui lòng thử lại sau.' : status.cooldownSeconds ? `Có thể gửi lại sau ${status.cooldownSeconds} giây.` : `Còn ${status.remainingToday}/3 lượt trong 24 giờ.`}</small>
      </>}
      {notice && <p role="status" className="ar-email-feedback">{notice}</p>}
      {needsNewRequest && <button className="ar-text-link" disabled={!eligible} onClick={() => { requestId.current = null; setNeedsNewRequest(false); setNotice("Đã tạo yêu cầu mới. Chỉ bấm Gửi khi bạn đã kiểm tra Hộp thư đến và Spam của yêu cầu trước.") }}>Tạo yêu cầu mới sau khi kiểm tra hộp thư</button>}
    </div>}
  </section>
}

function unavailableMessage(reason: string | null | undefined): string {
  switch (reason) {
    case 'MAIL_DISABLED': return 'Gửi email đang được tắt trên môi trường này. Bạn vẫn có thể tải hoặc in ảnh đang chọn.'
    case 'PUBLIC_URL_REQUIRED': return 'Email cần đường dẫn HTTPS công khai để mở ảnh và camera trên điện thoại. Bạn vẫn có thể tải hoặc in ảnh đang chọn.'
    case 'TEST_MODE': return 'Môi trường thử nghiệm này không gửi email. Bạn vẫn có thể tải hoặc in ảnh đang chọn.'
    case 'FEATURE_DISABLED': return 'Tính năng gửi ảnh qua email chưa được bật. Bạn vẫn có thể tải hoặc in ảnh đang chọn.'
    default: return 'Dịch vụ email chưa sẵn sàng trên môi trường này. Bạn vẫn có thể tải hoặc in ảnh đang chọn.'
  }
}
