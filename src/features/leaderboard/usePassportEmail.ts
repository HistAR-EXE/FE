import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/contracts'
import { loadPassportEmailStatus, sendPassportEmail, type PassportEmailStatus } from './passportEmailApi'

export function usePassportEmail(owner: string) {
  const generation = useRef(0)
  const inFlight = useRef(false)
  const [status, setStatus] = useState<PassportEmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [deadline, setDeadline] = useState(0)
  const [now, setNow] = useState(Date.now)
  const apply = useCallback((next: PassportEmailStatus) => {
    setStatus(next); setDeadline(Date.now() + next.cooldownSeconds * 1000); setNow(Date.now())
  }, [])
  useEffect(() => {
    const version = ++generation.current
    void loadPassportEmailStatus().then(next => { if (generation.current === version) apply(next) })
      .catch((error: unknown) => {
        if (generation.current !== version) return
        setStatus(null)
        if (error instanceof ApiError && ['AUTH_REQUIRED', 'UNAUTHORIZED'].includes(error.code)) setFeedback('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để nhận hộ chiếu qua email.')
      })
      .finally(() => { if (generation.current === version) setLoading(false) })
    return () => { generation.current++ }
  }, [owner, apply])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const cooldown = Math.max(0, Math.ceil((deadline - now) / 1000))
  const send = async (blob: Blob, requestId: string) => {
    if (inFlight.current || !status?.available || !status.verified || cooldown || !status.remainingToday) return
    const version = generation.current
    inFlight.current = true; setSending(true); setFeedback('')
    try {
      const result = await sendPassportEmail(blob, requestId)
      if (generation.current !== version) return
      apply({ ...status, ...result })
      setFeedback('Dịch vụ email đã tiếp nhận hộ chiếu của bạn. Vui lòng kiểm tra Hộp thư đến và Spam; thư có thể cần ít phút để đến nơi.')
    } catch (error) {
      if (generation.current !== version) return
      const code = error instanceof ApiError ? error.code : error instanceof Error ? error.message : ''
      const messages: Record<string, string> = {
        AUTH_REQUIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để nhận hộ chiếu qua email.',
        UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để nhận hộ chiếu qua email.',
        EMAIL_NOT_VERIFIED: 'Bạn cần xác minh email tài khoản trước khi nhận hộ chiếu.',
        MAIL_UNAVAILABLE: 'Chức năng email chưa sẵn sàng. Bạn vẫn có thể tải ảnh về máy.',
        MAIL_RATE_LIMITED: 'Bạn vừa gửi hoặc đã đạt giới hạn 3 lần trong 24 giờ. Vui lòng thử lại sau.',
        INVALID_IMAGE: 'Ảnh chưa hợp lệ hoặc lớn hơn 2 MB. Hãy tạo lại ảnh hộ chiếu.',
        REQUEST_IN_PROGRESS: 'Yêu cầu này đang được xử lý. Hệ thống sẽ không gửi thêm một thư trùng.',
        REQUEST_ID_REUSED: 'Ảnh đã thay đổi. Hãy tạo lại ảnh hộ chiếu trước khi gửi.',
        MAIL_DELIVERY_UNKNOWN: 'Chưa xác nhận được kết quả gửi. Yêu cầu này sẽ không tự gửi lại. Hãy kiểm tra Hộp thư đến và Spam; bạn vẫn có thể tải ảnh.',
      }
      setFeedback(messages[code] ?? 'Dịch vụ email chưa xác nhận đã tiếp nhận thư. Hãy kiểm tra hộp thư trước khi thử lại; bạn vẫn có thể tải ảnh về máy.')
      // Read back durable limits after failure; never automatically repeat the send request.
      try { const next = await loadPassportEmailStatus(); if (generation.current === version) apply(next) } catch { /* Keep download available when status is unavailable. */ }
    } finally {
      inFlight.current = false
      if (generation.current === version) setSending(false)
    }
  }
  return { status, loading, sending, feedback, cooldown, send, clearFeedback: () => setFeedback(''),
    canSend: Boolean(status?.available && status.verified && status.email && status.remainingToday > 0 && !cooldown && !sending) }
}
