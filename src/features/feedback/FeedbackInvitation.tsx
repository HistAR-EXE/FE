import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { DISCOVERY_RECORDED_EVENT, type DiscoveryRecordedDetail } from '../gamification/discoveryLayer'
import { feedbackActivityEvent, type FeedbackActivity } from './activity'
import { feedbackApi } from './api'
import './feedbackForm.css'

export function FeedbackInvitationHost() {
  const { user } = useAuth()
  return user ? <Invitation key={user.id + user.tier} tier={user.tier} /> : null
}

function Invitation({ tier }: { tier: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const previous = useRef(location.pathname)
  const groups = useRef(new Set<string>())
  const premiumUsed = useRef(false)
  const claimed = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const submissionId = useRef(crypto.randomUUID())
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const preview = import.meta.env.DEV && location.pathname === '/feedback' &&
    ['experience', 'logout'].includes(new URLSearchParams(location.search).get('preview') ?? '')

  useEffect(() => {
    function record(event: Event) {
      const { source, recordKey } = (event as CustomEvent<DiscoveryRecordedDetail>).detail
      if (source === 'tour_panorama' || source === 'hotspot_info') groups.current.add('tour')
      if (source === 'artifact' || source === 'time_portal') groups.current.add(source)
      if (source === 'time_portal' && /^era:(1948|1968|1975)$/.test(recordKey)) premiumUsed.current = true
    }
    function onActivity(event: Event) {
      const { group, premium } = (event as CustomEvent<{ group: FeedbackActivity; premium: boolean }>).detail
      groups.current.add(group)
      if (premium) premiumUsed.current = true
    }
    window.addEventListener(feedbackActivityEvent, onActivity)
    window.addEventListener(DISCOVERY_RECORDED_EVENT, record)
    return () => {
      window.removeEventListener(feedbackActivityEvent, onActivity)
      window.removeEventListener(DISCOVERY_RECORDED_EVENT, record)
    }
  }, [])

  useEffect(() => {
    if (preview) { setOpen(true); return }
    const arrived = previous.current !== location.pathname
    previous.current = location.pathname
    setOpen(false)
    if (!arrived || !['/', '/explore'].includes(location.pathname) || claimed.current ||
        groups.current.size < 2 || (tier === 'PREMIUM' && !premiumUsed.current)) return
    let active = true
    let timer: number | undefined
    let retryDelay = 3000
    async function requestInvitation() {
      try {
        const allowed = await feedbackApi.claimInvitation(tier)
        if (!active) return
        claimed.current = true
        if (allowed) setOpen(true)
      } catch {
        if (!active) return
        timer = window.setTimeout(requestInvitation, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 60000)
      }
    }
    void requestInvitation()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [location.pathname, preview, tier])

  useEffect(() => {
    if (!open) return
    function showWhenReady() {
      if (!document.querySelector('dialog[open]') && dialog.current) dialog.current.showModal()
    }
    showWhenReady()
    const observer = new MutationObserver(showWhenReady)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (open || !message) return
    const timer = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [open, message])

  async function send() {
    if (!rating || sending) return
    setSending(true)
    try {
      if (!preview) await feedbackApi.submit({ submissionId: submissionId.current, invited: true,
        rating, topics: [], comment: '', publicConsent: false })
      setOpen(false)
      setMessage(preview ? 'Đã hoàn tất xem thử.' : 'Cảm ơn bạn đã đánh giá TimeLens.')
    } catch { setMessage('Chưa gửi được đánh giá. Bạn có thể thử lại.') }
    finally { setSending(false) }
  }

  if (!open) return message ? <div role="status" className="fb-invite-toast">{message}</div> : null
  return <div className="fb-preview"><dialog ref={dialog} aria-labelledby="invite-title"
    onCancel={event => { if (sending) event.preventDefault(); else setOpen(false) }}>
    <h2 id="invite-title">Nhìn chung, bạn hài lòng thế nào với TimeLens?</h2>
    <p>Hãy nghĩ đến tất cả trải nghiệm của bạn với gói {tier === 'PREMIUM' ? 'Premium' : 'Free'}.</p>
    <div className="fb-invite-stars" role="group" aria-label="Mức độ hài lòng">{[1,2,3,4,5].map(n =>
      <button key={n} disabled={sending} aria-label={n + ' sao'} aria-pressed={rating === n}
        onClick={() => setRating(n)}>{n <= rating ? '★' : '☆'}</button>)}</div>
    <p role="status">{message || (rating ? rating + '/5 sao' : 'Chọn từ 1 đến 5 sao')}</p>
    <div className="fb-switch">
      <button disabled={!rating || sending} onClick={() => void send()}>Gửi đánh giá</button>
      <button disabled={sending} onClick={() => { setOpen(false); navigate('/feedback', { state: { feedbackInvitation: !preview, rating } }) }}>Viết thêm</button>
      <button disabled={sending} onClick={() => { setMessage(''); setOpen(false) }}>Bỏ qua</button>
    </div>
  </dialog></div>
}
