import { AdminPagination } from '../components/admin/AdminPagination'
import '../features/feedback/feedbackForm.css'
import { ReviewPhotos } from '../features/feedback/ReviewPhotos'
import { useEffect, useState, type FormEvent } from 'react'
import { feedbackApi, topicLabels, type FeedbackEntry, type FeedbackFilters } from '../features/feedback/api'

const pageSize = 6
const emptyFilters: FeedbackFilters = { from: '', to: '', tier: '', topic: '', status: '', rating: '' }
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })

export function AdminFeedbackPage() {
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<{ items: FeedbackEntry[]; total: number } | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    feedbackApi.list(filters, page, pageSize).then(data => {
      if (!active) return
      if (page > 0 && page * pageSize >= data.total) setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1))
      else setResult(data)
    }).catch(() => {
      if (active) setError('Không tải được phản hồi. Hãy kiểm tra bộ lọc và thử lại.')
    })
    return () => { active = false }
  }, [filters, page, revision])

  function apply(event: FormEvent) {
    event.preventDefault()
    setError('')
    setResult(null)
    setPage(0)
    setFilters({ ...draft })
  }

  async function download() {
    setBusy(true)
    setError('')
    try {
      const { data } = await feedbackApi.export(filters)
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'timelens-feedback.csv'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('Không xuất được CSV. Hãy chọn kỳ ngắn hơn hoặc thử lại.')
    } finally {
      setBusy(false)
    }
  }

  async function moderate(entry: FeedbackEntry) {
    setBusy(true)
    setError('')
    try {
      await feedbackApi.moderate(entry, !entry.published)
      setRevision(version => version + 1)
    } catch {
      setError('Không cập nhật được trạng thái công khai.')
    } finally {
      setBusy(false)
    }
  }

  const control = 'rounded-lg border border-slate-300 bg-white px-3 py-2'
  const button = 'rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50'
  function changePage(next: number) {
    if (page === next) return
    setError('')
    setResult(null)
    setPage(next)
    document.querySelector('.feedback-admin')?.scrollIntoView({ block: 'start' })
  }
  const pager = result && <AdminPagination variant="stitch" page={page}
    totalPages={Math.ceil(result.total / pageSize)} onPageChange={changePage} />
  return <section className="ops-paper-page feedback-admin flex min-w-0 flex-col text-slate-800">
    <header className="admin-page-header flex flex-wrap items-center justify-between gap-3"><h1 className="review-heading">Quản lý <span className="ops-title-accent">góp ý</span></h1><button type="button" className="feedback-export-button" disabled={busy || !result} onClick={() => void download()}>Xuất CSV</button></header>
    <nav className="review-status-tabs" aria-label="Trạng thái góp ý">
      {Object.entries({ '': 'Tất cả', pending: 'Chờ duyệt', published: 'Đã đăng trang chủ', private: 'Riêng tư' }).map(([value, label]) =>
        <button key={value} type="button" aria-pressed={filters.status === value} onClick={() => {
          setDraft({ ...draft, status: value })
          setFilters({ ...filters, status: value })
          setPage(0)
          setResult(null)
          setError('')
        }}>{label}</button>)}
    </nav>
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="grid gap-1 text-sm">Số sao
        <select className={control} value={draft.rating} onChange={event => setDraft({ ...draft, rating: event.target.value })}>
          <option value="">Mọi mức điểm</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} sao</option>)}
        </select>
      </label>
      {(['from', 'to'] as const).map(key => <label className="grid gap-1 text-sm" key={key}>{key === 'from' ? 'Từ ngày' : 'Đến ngày'}
        <input type="date" min={key === 'to' ? draft.from : undefined} max={key === 'from' ? draft.to : undefined} className={control} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
      </label>)}
      <label className="grid gap-1 text-sm">Gói
        <select className={control} value={draft.tier} onChange={event => setDraft({ ...draft, tier: event.target.value })}>
          <option value="">Tất cả</option><option value="FREE">Miễn phí</option><option value="PREMIUM">Premium</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">Chủ đề
        <select className={control} value={draft.topic} onChange={event => setDraft({ ...draft, topic: event.target.value })}>
          <option value="">Tất cả</option>{Object.entries(topicLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Áp dụng</button><button type="button" className={button} onClick={() => { setDraft(emptyFilters); setFilters({ ...emptyFilters }); setPage(0); setError('') }}>Xóa bộ lọc</button>

    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!result && !error && <p role="status">Đang tải phản hồi…</p>}
    {result && <>
      <div className="feedback-admin-listhead">
        <h2 aria-live="polite">{result.total ? `${page * pageSize + 1}–${page * pageSize + result.items.length} trong ${result.total} phản hồi` : '0 phản hồi'}</h2>
        {pager}
      </div>
      {result.items.length === 0 ? <p>Chưa có phản hồi phù hợp với bộ lọc.</p> :
        <div className="feedback-admin-grid">{result.items.map(entry =>
          <article key={entry.userId + entry.submissionId} className="fb-entry">
            <header className="fb-entry-head">
              <span className="review-author-avatar" aria-hidden="true">{entry.avatarUrl ? <img src={entry.avatarUrl} alt="" /> : (entry.authorName?.trim()[0] || 'T')}</span>
              <div className="min-w-0"><h3>{entry.authorName || 'Người dùng TimeLens'}</h3>
                <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>
              </div>
              <span className="review-stars" role="img" aria-label={entry.rating + " trên 5 sao"}>{"★".repeat(entry.rating)}{"☆".repeat(5-entry.rating)}</span>

            </header>
            <div className="review-body">
            {entry.comment && <p className="fb-entry-comment">{entry.comment}</p>}
            <ReviewPhotos photos={entry.photos} />
            {!!entry.topics.length && <ul className="fb-entry-topics" aria-label="Chủ đề">{entry.topics.map(topic =>
              <li key={topic}>{topicLabels[topic] ?? topic}</li>)}</ul>}
            <p className="text-sm text-slate-600">Gói {entry.tier === 'FREE' ? 'miễn phí' : entry.tier === 'PREMIUM' ? 'Premium' : entry.tier} · {entry.source === 'WEB_INVITED' ? 'Qua lời mời' : 'Góp ý chủ động'}</p>
            </div>
            <footer>
              <div className="fb-entry-details"><strong className={entry.published ? 'fb-public' : ''}>
                {entry.published ? 'Đã đăng trang chủ' : entry.publicConsent ? 'Chờ duyệt đăng' : 'Riêng tư'}
              </strong></div>
              {entry.publicConsent && <div className="fb-entry-actions"><button type="button" disabled={busy}
                onClick={() => void moderate(entry)}>{entry.published ? 'Gỡ khỏi trang chủ' : 'Duyệt đăng trang chủ'}</button></div>}
            </footer>
          </article>
        )}</div>}
      {pager && <div className="feedback-admin-listend">{pager}</div>}
    </>}
  </section>
}