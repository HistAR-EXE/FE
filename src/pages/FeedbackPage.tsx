import { useLocation } from 'react-router-dom'
import { useRef, useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { feedbackApi, topicLabels, type Topic, type FeedbackEntry } from '../features/feedback/api'

import { ReviewPhotos, preparePhoto } from '../features/feedback/ReviewPhotos'
import { FeedbackHistory } from '../features/feedback/FeedbackHistory'
import { useAuth } from '../shared/auth/useAuth'
import '../features/profile/profile.css'
import '../features/feedback/feedbackForm.css'

const groups: { title: string; topics: Topic[] }[] = [
  { title: 'Trải nghiệm di sản', topics: ['explore','tour','history','ai','ar','quests'] },
  { title: 'Khi sử dụng', topics: ['performance','navigation','content','technical'] },
  { title: 'Tài khoản và gói', topics: ['registration','payment','pricing','access'] },
  { title: 'Đề xuất và ý kiến khác', topics: ['other'] },
]
const ratings = ['Rất chưa hài lòng','Chưa hài lòng','Bình thường','Hài lòng','Rất hài lòng']

export function FeedbackPage() {
  const location = useLocation()
  return <FeedbackWorkspace key={location.key} />
}

function FeedbackWorkspace() {
  const { user } = useAuth()
  const [view, setView] = useState<'form' | 'history'>('form')
  const location = useLocation()
  const [invited, setInvited] = useState(location.state?.feedbackInvitation === true)
  const [rating, setRating] = useState<number>(location.state?.rating ?? 0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [comment, setComment] = useState('')
  const [showName, setShowName] = useState(false)
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'editing' | 'sending' | 'sent' | 'error'>('editing')
  const request = useRef<{ id: string; body: string } | null>(null)
  const inFlight = useRef(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  function openForm(entry?: FeedbackEntry) {
    setEditingId(entry?.submissionId ?? null)
    setRating(entry?.rating ?? 0)
    setTopics(entry?.topics ?? [])
    setPhotos(entry?.photos ?? [])
    setPhotoError('')
    setComment(entry?.comment ?? '')
    setShowName(Boolean(entry?.authorName))
    setConsent(entry?.publicConsent ?? false)
    request.current = null
    setState('editing')
    setView('form')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (processing || inFlight.current || rating === 0 || (consent && !comment.trim())) return
    const payload = { invited, rating, topics, comment: comment.trim(), photos, publicConsent: consent, showAvatar: consent && showName, showName: consent && showName }
    const body = JSON.stringify(payload)
    if (request.current?.body !== body) request.current = { id: crypto.randomUUID(), body }
    inFlight.current = true
    setState('sending')
    try {
      if (editingId) {
        await feedbackApi.update({ submissionId: editingId, ...payload })
        openForm()
        setView('history')
      } else {
        await feedbackApi.submit({ submissionId: request.current.id, ...payload })
        setInvited(false)
        setState('sent')
      }
    } catch {
      setState('error')
    } finally {
      inFlight.current = false
    }
  }

  return <AppLayout mobileTitle="Gửi góp ý" className="profile-workspace">
    <main className="pf-main fb-main">
      <header className="pf-page-heading">
        <div><h1>Gửi góp ý<span>.</span></h1><p>Trải nghiệm với TimeLens của bạn thế nào?</p></div>
      </header>
      <nav className="fb-switch" aria-label="Góp ý cá nhân">
        <button aria-pressed={view === 'form'} disabled={processing || state === 'sending'} onClick={() => editingId ? openForm() : setView('form')}>Viết góp ý</button>
        <button disabled={processing || state === 'sending'} aria-pressed={view === 'history'} onClick={() => setView('history')}>Góp ý đã gửi</button>
      </nav>
      {view === 'history' ? <FeedbackHistory key={user?.id} onEdit={openForm} /> : state === 'sent' ? <section className="pf-card" role="status">
        <h2>Đã nhận góp ý của bạn</h2>
        <p>Cảm ơn bạn đã chia sẻ trải nghiệm với TimeLens.</p>
        <button className="pf-button" onClick={() => setView('history')}>Xem góp ý đã gửi</button>
        <button className="pf-button secondary" onClick={() => {
          request.current = null
          setRating(0)
          setTopics([])
          setPhotos([])
          setPhotoError('')
          setComment('')
          setShowName(false)
          setConsent(false)
          setState('editing')
        }}>Gửi góp ý khác</button>
      </section> : <form onSubmit={submit} className="pf-card fb-form">
        {editingId && <h2>Chỉnh sửa góp ý</h2>}
        <fieldset disabled={processing || state === 'sending'}>
          <fieldset className="fb-score">
            <legend>Mức độ hài lòng</legend>
            <div className="fb-stars">{ratings.map((description, index) => <label key={description}>
              <input type="radio" name="rating" className="sr-only" required checked={rating === index + 1}
                aria-label={`${index + 1} sao · ${description}`} onChange={() => setRating(index + 1)} />
              <span className={index < rating ? 'filled' : ''} aria-hidden="true">{index < rating ? '★' : '☆'}</span>
            </label>)}</div>
            <p aria-live="polite">{rating ? ratings[rating - 1] : 'Chọn từ 1 đến 5 sao'}</p>
          </fieldset>
          <fieldset className="fb-topics">
            <legend>Bạn muốn góp ý về điều gì?</legend>
            <p>Chọn tối đa 5 chủ đề <span aria-live="polite">· Đã chọn {topics.length}/5</span></p>
            {groups.map(group => <div key={group.title} className="fb-group"><strong>{group.title}</strong>
              <div>{group.topics.map(topic => <label key={topic}>
                <input className="sr-only" type="checkbox" checked={topics.includes(topic)}
                  disabled={topics.length >= 5 && !topics.includes(topic)}
                  onChange={event => setTopics(event.target.checked ? [...topics, topic] : topics.filter(item => item !== topic))} />
                <span>{topics.includes(topic) && '✓ '}{topicLabels[topic]}</span>
              </label>)}</div>
            </div>)}
          </fieldset>
          <label className="fb-note"><span className="fb-field-heading">{topics.includes('other') ? 'Ý kiến hoặc đề xuất của bạn' : 'Lời nhận xét'} <small>{comment.length}/300 ký tự</small></span>
            <textarea maxLength={300} rows={3} value={comment} placeholder={topics.includes('other') ? 'Ví dụ: Bạn muốn khám phá địa điểm nào tiếp theo, hoặc muốn TimeLens bổ sung tính năng gì?' : 'Bạn thích điều gì hoặc muốn TimeLens cải thiện điều gì? (Tùy chọn)'}
              onChange={event => { setComment(event.target.value); if (!event.target.value.trim()) setConsent(false) }} />
          </label>
          <section className="fb-upload" aria-labelledby="fb-upload-title">
            <div className="fb-field-heading"><strong id="fb-upload-title">Ảnh trải nghiệm</strong><small>{photos.length}/5 ảnh</small></div>
            <div className="fb-upload-row"><label className="fb-picker"><input className="sr-only" aria-label="Thêm ảnh" aria-describedby="fb-photo-help" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={processing || photos.length >= 5}
              onChange={async event => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                setPhotoError('')
                if (files.length + photos.length > 5) { setPhotoError('Mỗi góp ý đính kèm tối đa 5 ảnh.'); return }
                setProcessing(true)
                try {
                  const added: string[] = []
                  for (const file of files) added.push(await preparePhoto(file))
                  setPhotos(current => [...current, ...added])
                } catch { setPhotoError('Không đọc được ảnh. Hãy chọn JPG, PNG hoặc WebP dưới 10 MB.') }
                finally { setProcessing(false) }
              }} /><span>{photos.length === 5 ? 'Đã đủ 5 ảnh' : '＋ Thêm ảnh'}</span></label>
            <small id="fb-photo-help">JPG, PNG hoặc WebP · Tối đa 10 MB mỗi ảnh</small></div>
          {processing && <p role="status">Đang xử lý ảnh…</p>}
          {photoError && <p role="alert">{photoError}</p>}
          <ReviewPhotos photos={photos} onRemove={i => setPhotos(current => current.filter((_, index) => index !== i))} />
                    </section>
          <fieldset className="fb-visibility"><legend>Ai có thể xem góp ý?</legend>
            <div className="fb-choices">
              <label><input type="radio" name="visibility" checked={!consent} onChange={() => { setConsent(false); setShowName(false) }} />
                <span><strong>Riêng tư</strong><small>Chỉ bạn và quản trị viên xem được.</small></span></label>
              <label><input type="radio" name="visibility" checked={consent} disabled={!comment.trim()} onChange={() => setConsent(true)} />
                <span><strong>Cho phép công khai</strong><small>{comment.trim() ? 'Lời nhận xét và ảnh có thể xuất hiện trên Trang chủ sau khi duyệt.' : 'Viết lời nhận xét để bật lựa chọn này.'}</small></span></label>
            </div>
          {consent && user?.displayName && <label className="fb-consent">
            <input type="checkbox" checked={showName} onChange={event => setShowName(event.target.checked)} />
            <span>Hiển thị tên “{user.displayName}” và ảnh đại diện hồ sơ trên Trang chủ<small>Bỏ chọn để dùng tên “Người dùng TimeLens”.</small></span>
          </label>}
          </fieldset>
        </fieldset>
        {state === 'error' && <p role="alert">Chưa gửi được góp ý. Bạn có thể thử lại.</p>}
        <button className="pf-button fb-send" disabled={processing || state === 'sending'}>{state === 'sending' ? 'Đang gửi…' : state === 'error' ? 'Thử lại' : editingId ? 'Lưu thay đổi' : 'Gửi góp ý'} <span aria-hidden="true">↗</span></button>
        {editingId && <button type="button" className="pf-button secondary" disabled={processing || state === 'sending'} onClick={() => { openForm(); setView('history') }}>Hủy chỉnh sửa</button>}
      </form>}
    </main>
  </AppLayout>
}