// src/features/time-portal/timeline/TimeWarp.tsx
// Hiệu ứng "du hành thời gian" khi chuyển chương: số năm chạy từ mốc cũ sang mốc mới.

import { useEffect, useRef, useState } from 'react'

type Props = {
  from: number
  to: number
  toLabel: string
  chapter: string
  accent: string
  onDone: () => void
}

export function TimeWarp({ from, to, toLabel, chapter, accent, onDone }: Props) {
  const [val, setVal] = useState(from)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0 - 120) / 850))
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      setVal(Math.round(from + (to - from) * e))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const tOut = window.setTimeout(() => setLeaving(true), 1150)
    const tDone = window.setTimeout(() => doneRef.current(), 1500)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(tOut)
      window.clearTimeout(tDone)
    }
  }, [from, to])

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(232,242,255,0.99) 70%)', animation: 'tp-fade-in 160ms ease-out' }}
      aria-live="polite"
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="tp-anim pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] rounded-full border-2"
          style={{ borderColor: accent, animation: `tp-ring 1.25s ${i * 0.16}s ease-out both` }}
        />
      ))}
      <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-blue-600">Du hành thời gian</p>
      <p className="mt-2 text-7xl font-black tabular-nums sm:text-8xl" style={{ color: accent, textShadow: `0 0 48px ${accent}80` }}>
        {val >= 2026 ? toLabel : val}
      </p>
      <p className="mt-3 text-sm font-medium text-blue-900">{chapter}</p>
    </div>
  )
}
