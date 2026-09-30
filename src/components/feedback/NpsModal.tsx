// One-time NPS prompt (0-10). Emits the `nps_submitted` pilot event; never shows again once answered/dismissed.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getConsent, isAnalyticsAllowed } from '../../lib/consent'
import { emitEvent } from '../../lib/pilotEvents'
import { appEnv } from '../../shared/config/env'

export const NPS_DONE_KEY = 'histar_nps_done_v1'
const SHOW_DELAY_MS = 20_000

function alreadyAnswered(): boolean {
  try {
    return window.localStorage.getItem(NPS_DONE_KEY) !== null
  } catch {
    return true
  }
}

function markAnswered(value: string) {
  try {
    window.localStorage.setItem(NPS_DONE_KEY, value)
  } catch {
    // storage unavailable: the prompt may reappear next visit, acceptable
  }
}

type Props = {
  /** Where the prompt is mounted, sent as payload.context (e.g. "home"). */
  context?: string
  stationCode?: string
}

export function NpsModal({ context = 'home', stationCode }: Props) {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (appEnv.demoMode || alreadyAnswered() || !isAnalyticsAllowed() || getConsent() === null) return
    let delay = SHOW_DELAY_MS
    try {
      const n = Number(sessionStorage.getItem('histar_stations_completed_count') || '0')
      if (n >= 4) delay = 2_000
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setOpen(true), delay)
    return () => window.clearTimeout(t)
  }, [])

  if (!open) return null

  const dismiss = () => {
    markAnswered('dismissed')
    setOpen(false)
  }

  const submit = () => {
    if (score === null) return
    emitEvent('nps_submitted', {
      stationCode,
      payload: { score, context, ...(comment.trim() ? { comment: comment.trim().slice(0, 300) } : {}) },
    })
    markAnswered(String(score))
    setDone(true)
  }

  if (done) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        data-testid="nps-wrapped-cta"
        className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12141f] text-white shadow-2xl p-6 space-y-4 text-center">
          <h2 className="text-lg font-black">Cảm ơn bạn!</h2>
          <p className="text-sm text-gray-300">Xem Hồ sơ giao liên (Wrapped) và chia sẻ hành trình Củ Chi.</p>
          <Link
            to="/journey-wrapped"
            className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] px-4 py-2.5 text-sm font-black text-black"
            onClick={() => setOpen(false)}
          >
            Mở Hồ sơ giao liên
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 font-bold">
            Đóng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-title"
      data-testid="nps-modal"
      className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12141f] text-white shadow-2xl p-6 space-y-4">
        <div>
          <h2 id="nps-title" className="text-lg font-black">
            Bạn có giới thiệu TimeLens cho bạn bè không?
          </h2>
          <p className="text-sm text-gray-300 mt-1">0 = chắc chắn không, 10 = chắc chắn có.</p>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5" role="radiogroup" aria-label="Điểm từ 0 đến 10">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              data-testid={`nps-score-${n}`}
              onClick={() => setScore(n)}
              className={`rounded-lg py-2 text-sm font-black border transition-colors ${
                score === n
                  ? 'bg-[#fe951c] text-black border-[#fe951c]'
                  : 'border-white/20 text-gray-200 hover:bg-white/10'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Điều gì khiến bạn chấm điểm này? (không bắt buộc)"
          className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#388cf1]"
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            data-testid="nps-submit"
            disabled={score === null}
            onClick={submit}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] px-4 py-2.5 text-sm font-black text-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Gửi
          </button>
          <button
            type="button"
            data-testid="nps-dismiss"
            onClick={dismiss}
            className="flex-1 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  )
}
