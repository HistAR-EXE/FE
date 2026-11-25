import { useEffect, useState, type FormEvent } from 'react'
import { feedbackApi, topicLabels, type FeedbackEntry, type FeedbackFilters } from '../features/feedback/api'

const emptyFilters: FeedbackFilters = { from: '', to: '', tier: '', topic: '' }
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
    feedbackApi.list(filters, page).then(data => {
      if (active) setResult(data)
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
  return <section className="space-y-4 text-slate-800">
    <h1 className="text-2xl font-bold">Phản hồi người dùng</h1>
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {(['from', 'to'] as const).map(key => <label className="grid gap-1 text-sm" key={key}>{key === 'from' ? 'Từ ngày' : 'Đến ngày'}
        <input type="date" className={control} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
      </label>)}
      <label className="grid gap-1 text-sm">Gói
        <select className={control} value={draft.tier} onChange={event => setDraft({ ...draft, tier: event.target.value })}>
          <option value="">Tất cả</option><option>FREE</option><option>PREMIUM</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">Chủ đề
        <select className={control} value={draft.topic} onChange={event => setDraft({ ...draft, topic: event.target.value })}>
          <option value="">Tất cả</option>{Object.entries(topicLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Lọc</button>
      <button type="button" className={button} disabled={busy || !result} onClick={() => void download()}>Xuất CSV</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!result && !error && <p role="status">Đang tải phản hồi…</p>}
    {result && <>
      <p>{result.total} phản hồi</p>
      {result.items.length === 0 ? <p>Chưa có phản hồi phù hợp.</p> :
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr>{['Thời gian', 'Gói', 'Điểm', 'Chủ đề', 'Góp ý', 'Công khai'].map(title =>
              <th key={title} scope="col" className="p-3">{title}</th>)}</tr></thead>
            <tbody>{result.items.map(entry => <tr key={entry.userId + entry.submissionId} className="border-t align-top">
              <td className="whitespace-nowrap p-3">{dateFormat.format(new Date(entry.createdAt))}</td>
              <td className="p-3">{entry.tier}</td><td className="p-3">{entry.rating}/5</td>
              <td className="p-3">{entry.topics.map(topic => topicLabels[topic]).join(', ') || '—'}</td>
              <td className="min-w-48 whitespace-pre-wrap break-words p-3">{entry.comment || '—'}</td>
              <td className="p-3">{entry.publicConsent ? <button type="button" disabled={busy} className={button}
                onClick={() => void moderate(entry)}>{entry.published ? 'Gỡ' : 'Duyệt'}</button> : 'Riêng tư'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <div className="flex items-center gap-3">
        <button className={button} disabled={page === 0} onClick={() => { setResult(null); setPage(page - 1) }}>Trước</button>
        <span>Trang {page + 1}</span>
        <button className={button} disabled={(page + 1) * 25 >= result.total} onClick={() => { setResult(null); setPage(page + 1) }}>Sau</button>
      </div>
    </>}
  </section>
}

