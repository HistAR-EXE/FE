// src/features/time-portal/timeline/EraInsights.tsx
// Bảng "Con số" (đếm chạy) + sơ đồ mạng lưới + nút xem 3D + nguồn tư liệu.

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import { XUA_NAY, type XuaNaySpotId } from '../xuaNay/xuaNayData'
import { NetworkMap } from './NetworkMap'
import type { EraStat, EraStory } from './storyData'

function useCountUp(target: number, from: number, runKey: unknown, duration = 1500): number {
  const [v, setV] = useState(from)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setV(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration)
      setV(from + (target - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, from, runKey, duration])
  return v
}

function StatTile({ stat, accent, runKey }: { stat: EraStat; accent: string; runKey: unknown }) {
  const numeric = 'value' in stat
  const target = numeric ? stat.value : 0
  const plain = numeric && stat.plain
  const v = useCountUp(target, plain ? target - 60 : 0, runKey)
  let display: string
  if (!numeric) display = stat.text
  else if (plain) display = String(Math.round(v))
  else {
    const d = stat.decimals ?? 0
    display = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(d ? v : Math.round(v))
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <p className="text-lg font-black leading-tight tabular-nums" style={{ color: accent }}>
        {numeric && stat.prefix}
        {display}
        {numeric && <span className="text-sm font-bold">{stat.suffix}</span>}
      </p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-white/65">{stat.label}</p>
    </div>
  )
}

type Props = {
  story: EraStory
  onOpen3D?: () => void
  /** Lối vào "Xưa & Nay" — mở tại điểm gợi ý cho chương/khoảnh khắc đang xem. */
  xuaNay?: { spot: XuaNaySpotId; onOpen: () => void }
}

export function EraInsights({ story, onOpen3D, xuaNay }: Props) {
  const xn = xuaNay ? XUA_NAY[xuaNay.spot] : null
  return (
    <div className="flex flex-col gap-2.5">
      <section className="rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl">
        <h3 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
          <MaterialIcon name="query_stats" className="text-base" style={{ color: story.accent }} />
          Con số
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {story.stats.map((s) => (
            <StatTile key={s.label} stat={s} accent={story.accent} runKey={story.era} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl">
        <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
          <MaterialIcon name="hub" className="text-base" style={{ color: story.accent }} />
          Mạng lưới địa đạo
        </h3>
        <p className="mb-1 text-xs font-medium text-white/85">{story.networkNote}</p>
        <div className="mx-auto max-w-[300px]">
          <NetworkMap era={story.era} accent={story.accent} />
        </div>
        <p className="mt-1 text-[10px] text-white/40">Sơ đồ minh hoạ — không theo tỉ lệ</p>
      </section>

      {onOpen3D && (
        <button
          type="button"
          onClick={onOpen3D}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          style={{ borderColor: `${story.accent}80`, background: `${story.accent}1f` }}
        >
          <MaterialIcon name="view_in_ar" className="text-lg" style={{ color: story.accent }} />
          Xem lát cắt 3D thời kỳ này
        </button>
      )}

      {xuaNay && xn && (
        <button
          type="button"
          onClick={xuaNay.onOpen}
          className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-black/55 p-2 text-left backdrop-blur-xl transition-colors hover:bg-white/10"
        >
          <span className="relative block aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
            <img src={xn.nay.src} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
            <img src={xn.xua.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: 'inset(0 50% 0 0)' }} loading="lazy" draggable={false} />
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/80" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold text-white">
              <MaterialIcon name="compare" className="text-base" style={{ color: story.accent }} />
              Xưa &amp; Nay tại di tích
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-white/60">5 điểm · tranh tái hiện 1968 và ảnh hôm nay, cùng góc nhìn</span>
          </span>
          <MaterialIcon name="chevron_right" className="text-xl text-white/50 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      <details className="rounded-2xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-xs text-white/70 backdrop-blur-xl">
        <summary className="cursor-pointer select-none font-medium text-white/80">Nguồn tư liệu</summary>
        <ul className="mt-2 space-y-1">
          {story.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-white">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
