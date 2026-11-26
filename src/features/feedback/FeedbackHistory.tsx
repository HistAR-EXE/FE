import { ReviewPhotos } from './ReviewPhotos'
import { useEffect, useState } from 'react'
import { feedbackApi, topicLabels, type FeedbackEntry } from './api'

const sentDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const sentiments = ['Rất chưa hài lòng', 'Chưa hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng']

export function FeedbackHistory({ onEdit }: { onEdit: (item: FeedbackEntry) => void }) {
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ items: FeedbackEntry[]; total: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  async function remove(id: string) {
    setDeleting(true)
    setDeleteError(false)
    try {
      await feedbackApi.remove(id)
      setConfirmId(null)
      if (page > 0 && result?.items.length === 1) setPage(page - 1)
      else setRetry(value => value + 1)
    } catch {
      setDeleteError(true)
    } finally {
      setDeleting(false)
    }
  }
  useEffect(() => {
    let active = true
    setFailed(false)
    setResult(null)
    feedbackApi.history(page).then(data => { if (active) setResult(data) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [page, retry])
  return <section className="fb-history">
    <header className="fb-history-heading"><h2>Góp ý đã gửi {result && <small>{result.total}</small>}</h2>{!!result?.total && <span>Mới nhất trước</span>}</header>
    {failed ? <p role="alert">Chưa tải được lịch sử. <button className="pf-button secondary" onClick={() => setRetry(retry + 1)}>Thử lại</button></p>
      : !result ? <p role="status">Đang tải góp ý…</p>
      : !result.total ? <p>Bạn chưa gửi góp ý nào.</p>
      : <><div className="fb-history-grid">
        {result.items.map(item => <article key={item.submissionId} className="fb-entry">
          <header className="fb-entry-head">
            <div className="fb-entry-score"><strong>{item.rating}</strong><small>/5</small></div>
            <div><h3>{sentiments[item.rating - 1]}</h3>
              <span className="fb-entry-stars" aria-label={item.rating + ' trên 5 sao'}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>
            </div>
          </header>
          {item.comment && <p className="fb-entry-comment">{item.comment}</p>}
          <ReviewPhotos photos={item.photos} />
          {!!item.topics.length && <ul className="fb-entry-topics" aria-label="Chủ đề góp ý">{item.topics.map(topic =>
            <li key={topic}>{topicLabels[topic] ?? topic}</li>)}</ul>}
          <footer>
            <div className="fb-entry-details"><strong className={item.published ? 'fb-public' : ''}>{item.published ? 'Đã công khai' : item.publicConsent ? 'Chờ duyệt công khai' : 'Riêng tư'}</strong>
              <span>Gói {item.tier === 'FREE' ? 'miễn phí' : item.tier === 'PREMIUM' ? 'Premium' : item.tier}</span></div>
            <time dateTime={item.createdAt}>{sentDate.format(new Date(item.createdAt))}</time>
          </footer>
          <div className="fb-entry-actions">
            {confirmId === item.submissionId ? <>
              <p>Xóa vĩnh viễn góp ý này?</p>
              {deleteError && <p role="alert">Chưa xóa được góp ý. Bạn có thể thử lại.</p>}
              <button disabled={deleting} onClick={() => setConfirmId(null)}>Giữ lại</button>
              <button className="fb-delete" disabled={deleting} onClick={() => void remove(item.submissionId)}>{deleting ? 'Đang xóa…' : 'Xác nhận xóa'}</button>
            </> : <>
              <button disabled={deleting} onClick={() => onEdit(item)}>Chỉnh sửa</button>
              <button className="fb-delete" disabled={deleting} onClick={() => { setDeleteError(false); setConfirmId(item.submissionId) }}>Xóa</button>
            </>}
          </div>
        </article>)}
        </div>        {result.total > 10 && <nav className="fb-switch" aria-label="Trang lịch sử">
          <button disabled={!page} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page + 1}/{Math.ceil(result.total / 10)}</span>
          <button disabled={(page + 1) * 10 >= result.total} onClick={() => setPage(page + 1)}>Sau</button>
        </nav>}
      </>}
  </section>
}
