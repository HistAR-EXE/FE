// src/features/time-portal/xuaNay/XuaNayView.tsx
// "Xưa & Nay" — kéo thanh trượt trên một cặp ảnh cùng góc chụp:
// trái là tranh tái hiện 1968, phải là ảnh hiện trạng tại di tích.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import { XUA_NAY, XUA_NAY_ART_NOTE, XUA_NAY_PHOTO_CREDIT, XUA_NAY_SPOTS, type XuaNaySpotId } from './xuaNayData'

type Props = {
  spot: XuaNaySpotId
  onSpotChange: (spot: XuaNaySpotId) => void
  onBack: () => void
}

const RATIO = 4 / 3
/** Chiều cao hàng nút dưới khung (px). */
const CTRL_H = 52
const XUA = '#fbbf24'
const NAY = '#2dd4bf'

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function XuaNayView({ spot, onSpotChange, onBack }: Props) {
  const data = XUA_NAY[spot]
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  /** Người xem đã tự kéo — không chạy gợi ý nữa. */
  const touched = useRef(false)
  const anim = useRef(0)

  // Khung 4:3 vừa khít vùng hiển thị
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (!w) return
      // Màn rộng: khung lấp cột (trừ hàng nút). Di động: theo bề ngang, tối đa ~62% chiều cao màn hình.
      const wide = window.matchMedia('(min-width: 1024px)').matches
      const h = wide ? el.clientHeight - CTRL_H : window.innerHeight * 0.62
      if (h <= 0) return
      const fw = Math.min(w, h * RATIO)
      setBox({ w: Math.round(fw), h: Math.round(fw / RATIO) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const stopHint = useCallback(() => {
    cancelAnimationFrame(anim.current)
    anim.current = 0
  }, [])

  // Gợi ý thao tác: thanh trượt lướt qua lại một lần khi mở điểm mới
  useEffect(() => {
    setPos(50)
    if (reducedMotion() || touched.current) return
    const keys = [50, 74, 26, 50]
    const seg = 650
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t + 500
      const e = Math.max(0, t - start)
      const i = Math.min(keys.length - 2, Math.floor(e / seg))
      const u = Math.min(1, (e - i * seg) / seg)
      const k = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
      setPos(keys[i] + (keys[i + 1] - keys[i]) * k)
      if (e < seg * (keys.length - 1)) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
    return stopHint
  }, [spot, stopHint])

  // Tải trước ảnh các điểm khác
  useEffect(() => {
    XUA_NAY_SPOTS.forEach((id) => {
      const s = XUA_NAY[id]
      ;[s.xua.src, s.nay.src].forEach((src) => {
        const img = new Image()
        img.src = src
      })
    })
  }, [])

  const posFromEvent = (clientX: number) => {
    const r = frameRef.current?.getBoundingClientRect()
    if (!r || !r.width) return pos
    return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    stopHint()
    touched.current = true
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    setPos(posFromEvent(e.clientX))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setPos(posFromEvent(e.clientX))
  }
  const endDrag = () => setDragging(false)

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5
    let next: number | null = null
    if (e.key === 'ArrowLeft') next = pos - step
    else if (e.key === 'ArrowRight') next = pos + step
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 100
    if (next === null) return
    e.preventDefault()
    stopHint()
    touched.current = true
    setPos(Math.max(0, Math.min(100, next)))
  }

  const snap = (v: number) => {
    stopHint()
    touched.current = true
    setPos(v)
  }

  const idx = XUA_NAY_SPOTS.indexOf(spot)
  const go = (d: number) => onSpotChange(XUA_NAY_SPOTS[(idx + d + XUA_NAY_SPOTS.length) % XUA_NAY_SPOTS.length])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-neutral-950 text-white">
      {/* Thanh tiêu đề */}
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại Dòng thời gian"
          title="Quay lại Dòng thời gian"
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs text-white/85 hover:bg-white/10"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          <span className="hidden sm:inline">Dòng thời gian</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Xưa &amp; Nay</p>
          <h1 className="truncate text-base font-bold leading-tight sm:text-lg">{data.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full text-white/75 hover:bg-white/10" aria-label="Điểm trước">
            <MaterialIcon name="chevron_left" className="text-xl" />
          </button>
          <span className="w-8 text-center text-[11px] tabular-nums text-white/50">
            {idx + 1}/{XUA_NAY_SPOTS.length}
          </span>
          <button type="button" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full text-white/75 hover:bg-white/10" aria-label="Điểm sau">
            <MaterialIcon name="chevron_right" className="text-xl" />
          </button>
        </div>
      </header>

      <div className="tp-scroll grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1 lg:content-stretch lg:gap-5 lg:overflow-hidden lg:p-5">
        {/* Khung so sánh — di động: cao theo tỉ lệ 4:3; màn rộng: lấp đầy cột */}
        <section className="flex min-w-0 flex-col lg:min-h-0">
          <div ref={stageRef} className="relative flex w-full flex-col items-center justify-center lg:min-h-0 lg:flex-1">
            <div
              ref={frameRef}
              key={spot}
              className="relative touch-none select-none overflow-hidden rounded-xl bg-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
              style={{ width: box.w || '100%', height: box.h || undefined, aspectRatio: box.w ? undefined : '4 / 3', animation: 'tp-fade-in 450ms ease-out both', cursor: dragging ? 'grabbing' : 'ew-resize' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img src={data.nay.src} alt={`${data.name} hiện nay`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              <img
                src={data.xua.src}
                alt={`${data.name} năm 1968 — tranh tái hiện`}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
                draggable={false}
              />

              {/* Nhãn hai bên */}
              <span
                className="pointer-events-none absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black shadow transition-opacity sm:left-3 sm:top-3 sm:text-[11px]"
                style={{ background: XUA, opacity: pos > 14 ? 1 : 0 }}
              >
                1968 · Tái hiện
              </span>
              <span
                className="pointer-events-none absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black shadow transition-opacity sm:right-3 sm:top-3 sm:text-[11px]"
                style={{ background: NAY, opacity: pos < 86 ? 1 : 0 }}
              >
                Hiện nay
              </span>

              {/* Tay kéo */}
              <div className="pointer-events-none absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_10px_rgba(0,0,0,0.6)]" style={{ left: `${pos}%` }} />
              <div className="pointer-events-none absolute inset-y-0" style={{ left: `${Math.min(96, Math.max(4, pos))}%` }}>
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Kéo để so sánh xưa và nay"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pos)}
                  aria-valuetext={`${Math.round(pos)}% tranh 1968`}
                  onKeyDown={onKey}
                  className="pointer-events-auto absolute left-0 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/60 text-white shadow-lg outline-none backdrop-blur-sm focus-visible:ring-4 focus-visible:ring-amber-300/60"
                >
                  <MaterialIcon name="compare_arrows" className="text-xl" />
                </div>
              </div>
            </div>

            {/* Nút nhanh */}
            <div className="flex shrink-0 items-end justify-center gap-2" style={{ height: CTRL_H }}>
            <button
              type="button"
              onClick={() => snap(100)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors"
              style={pos >= 99 ? { background: XUA, borderColor: XUA, color: '#000' } : { borderColor: `${XUA}66`, color: XUA }}
            >
              <MaterialIcon name="history" className="text-base" />
              Xem 1968
            </button>
            <button
              type="button"
              onClick={() => snap(50)}
              className="flex min-h-[40px] items-center gap-1 rounded-full border border-white/15 px-3 text-xs text-white/70 hover:bg-white/10"
            >
              <MaterialIcon name="compare" className="text-base" />
              <span className="hidden sm:inline">Chia đôi</span>
            </button>
            <button
              type="button"
              onClick={() => snap(0)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors"
              style={pos <= 1 ? { background: NAY, borderColor: NAY, color: '#000' } : { borderColor: `${NAY}66`, color: NAY }}
            >
              <MaterialIcon name="photo_camera" className="text-base" />
              Xem hiện nay
            </button>
            </div>
          </div>
        </section>

        {/* Thông tin + chọn điểm */}
        <aside className="tp-scroll flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
          <div key={spot} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" style={{ animation: 'tp-enter 380ms ease-out both' }}>
            <div className="border-l-2 pl-3" style={{ borderColor: XUA }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: XUA }}>
                1968 · Tranh tái hiện
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/85">{data.xua.text}</p>
            </div>
            <div className="mt-3 border-l-2 pl-3" style={{ borderColor: NAY }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: NAY }}>
                Hiện nay
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/85">{data.nay.text}</p>
            </div>
            <p className="mt-3 flex gap-1.5 text-[11px] leading-snug text-white/45">
              <MaterialIcon name="info" className="mt-px text-sm" />
              <span>
                {XUA_NAY_ART_NOTE} {XUA_NAY_PHOTO_CREDIT}.
              </span>
            </p>
          </div>

          <nav aria-label="Các điểm Xưa & Nay" className="grid grid-cols-5 gap-1.5 lg:grid-cols-1 lg:gap-2">
            {XUA_NAY_SPOTS.map((id) => {
              const s = XUA_NAY[id]
              const active = id === spot
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSpotChange(id)}
                  aria-current={active ? 'true' : undefined}
                  className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl border p-1 text-center transition-colors lg:flex-row lg:gap-3 lg:p-1.5 lg:text-left ${
                    active ? 'border-amber-300/70 bg-amber-300/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg lg:w-20">
                    <img src={s.nay.src} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                    <img src={s.xua.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: 'inset(0 50% 0 0)' }} loading="lazy" draggable={false} />
                  </span>
                  <span className={`w-full truncate text-[10px] leading-tight sm:text-[11px] lg:text-sm ${active ? 'font-semibold text-white' : 'text-white/70'}`}>
                    <span className="hidden lg:inline">{s.name}</span>
                    <span className="lg:hidden">{s.short}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>
      </div>
    </div>
  )
}
