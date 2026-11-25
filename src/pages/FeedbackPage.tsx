import { useRef, useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { feedbackApi, topicLabels, type Topic } from '../features/feedback/api'

export function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [comment, setComment] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'editing' | 'sending' | 'sent' | 'error'>('editing')
  const request = useRef<{ id: string; body: string } | null>(null)
  const inFlight = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || rating === 0 || (consent && !comment.trim())) return
    const payload = { rating, topics, comment: comment.trim(), publicConsent: consent }
    const body = JSON.stringify(payload)
    if (request.current?.body !== body) request.current = { id: crypto.randomUUID(), body }
    inFlight.current = true
    setState('sending')
    try {
      await feedbackApi.submit({ submissionId: request.current.id, ...payload })
      setState('sent')
    } catch {
      setState('error')
    } finally {
      inFlight.current = false
    }
  }

  return <AppLayout mobileTitle="Gửi góp ý">
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Gửi góp ý</h1>
      {state === 'sent' ? <div role="status" className="rounded-2xl bg-white p-6 text-slate-800 shadow-sm">
        <p>Cảm ơn bạn. TimeLens đã lưu góp ý của bạn.</p>
        <button type="button" className="mt-4 font-semibold text-blue-700" onClick={() => {
          request.current = null
          setRating(0)
          setTopics([])
          setComment('')
          setConsent(false)
          setState('editing')
        }}>Gửi góp ý khác</button>
      </div> : <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm sm:p-7">
        <fieldset disabled={state === 'sending'} className="space-y-5">
          <fieldset>
            <legend className="mb-2 font-semibold">Bạn đánh giá trải nghiệm thế nào?</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map(value => <label key={value} className="cursor-pointer">
                <input className="peer sr-only" type="radio" name="rating" required checked={rating === value}
                  onChange={() => setRating(value)} />
                <span className="block rounded-lg border px-3 py-2 peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600">{value} sao</span>
              </label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">Bạn muốn góp ý về gì? (tối đa 5 mục)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.entries(topicLabels) as [Topic, string][]).map(([topic, label]) =>
                <label key={topic} className="flex items-center gap-2">
                  <input type="checkbox" checked={topics.includes(topic)} disabled={topics.length >= 5 && !topics.includes(topic)}
                    onChange={event => setTopics(current => event.target.checked ? [...current, topic] : current.filter(item => item !== topic))} />
                  {label}
                </label>)}
            </div>
          </fieldset>
          <label className="block font-semibold">Góp ý thêm (tùy chọn)
            <textarea maxLength={300} rows={4} value={comment} onChange={event => {
              setComment(event.target.value)
              if (!event.target.value.trim()) setConsent(false)
            }} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" />
            <span className="block text-right text-xs font-normal text-slate-500">{comment.length}/300</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={consent} disabled={!comment.trim()} onChange={event => setConsent(event.target.checked)} />
            Tôi đồng ý cho TimeLens hiển thị góp ý đã duyệt dưới tên “Người dùng TimeLens”. Không nhập thông tin cá nhân hoặc mã giao dịch.
          </label>
        </fieldset>
        {state === 'error' && <p role="alert" className="mt-4 text-red-700">Chưa gửi được góp ý. Bạn có thể thử lại.</p>}
        <button disabled={state === 'sending'} className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {state === 'sending' ? 'Đang gửi…' : 'Gửi góp ý'}
        </button>
      </form>}
    </main>
  </AppLayout>
}

