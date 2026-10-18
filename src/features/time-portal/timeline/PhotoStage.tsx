// src/features/time-portal/timeline/PhotoStage.tsx
// Khung ảnh tư liệu kiểu bảo tàng: hiển thị TRỌN VẸN bức ảnh (không cắt),
// phóng tối đa 2× để ảnh cũ không bị vỡ, chuyển động rất nhẹ vào chi tiết chính,
// chú thích dưới ảnh; bấm để xem ảnh lớn.

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { StoryVisual } from './storyData'

type Photo = Extract<StoryVisual, { kind: 'photo' }>
type Size = { w: number; h: number }
type Layer = { key: string; visual: StoryVisual }

const MAX_UPSCALE = 2
const FRAME_PAD = 10
const CAPTION_H = 34

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function hashTilt(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return (Math.abs(h) % 3) - 1
}

function PhotoFrame({
  photo,
  box,
  active,
  tilt,
  filter,
  durationMs,
  onOpen,
}: {
  photo: Photo
  box: Size
  active: boolean
  tilt: number
  filter: string
  durationMs: number
  onOpen: (p: Photo) => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [nat, setNat] = useState<Size | null>(null)
  const [shown, setShown] = useState(false)
  const [go, setGo] = useState(false)

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth) setNat({ w: img.naturalWidth, h: img.naturalHeight })
  }, [])

  useEffect(() => {
    if (!nat) return
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      setShown(true)
      r2 = requestAnimationFrame(() => setGo(!reducedMotion()))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [nat])

  let w = 0
  let h = 0
  if (nat && box.w > 0 && box.h > 0) {
    const availW = Math.max(60, box.w - FRAME_PAD * 2 - 16)
    const availH = Math.max(60, box.h - FRAME_PAD - CAPTION_H - 16)
    const s = Math.min(availW / nat.w, availH / nat.h, MAX_UPSCALE)
    w = Math.round(nat.w * s)
    h = Math.round(nat.h * s)
  }
  const visible = active && shown && w > 0

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${tilt * 0.7}deg) scale(${visible ? 1 : 0.965})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 650ms ease, transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(photo)}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className="group block rounded-[3px] bg-[#f1e8d6] text-left shadow-[0_30px_70px_-18px_rgba(0,0,0,0.9)] ring-1 ring-black/25"
        style={{ padding: `${FRAME_PAD}px ${FRAME_PAD}px 0` }}
        aria-label={`Xem ảnh lớn: ${photo.caption}`}
      >
        <div className="relative overflow-hidden bg-neutral-900" style={{ width: w || 1, height: h || 1 }}>
          <img
            ref={imgRef}
            src={photo.src}
            alt={photo.caption}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="h-full w-full object-cover"
            style={{
              filter,
              transformOrigin: `${photo.focus[0]}% ${photo.focus[1]}%`,
              transform: go ? 'scale(1.05)' : 'scale(1)',
              transition: go ? `transform ${durationMs}ms linear` : undefined,
            }}
          />
          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/90 opacity-90 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <MaterialIcon name="open_in_full" className="text-base" />
          </span>
        </div>
        <p
          className="flex items-center justify-center gap-1.5 px-2 text-center text-[12px] font-medium text-stone-700"
          style={{ height: CAPTION_H, maxWidth: w || undefined }}
        >
          <span className="truncate">{photo.caption}</span>
          {photo.credit && <span className="shrink-0 text-[10px] font-normal text-stone-500">· Ảnh: {photo.credit}</span>}
        </p>
      </button>
    </div>
  )
}

type Props = {
  visual: StoryVisual
  visualKey: string
  durationMs: number
  filter: string
  dim: boolean
  onOpen: (p: Photo) => void
  /** Điều hướng chạm (di động): trái = lùi, phải = tiến, giữ = tạm dừng. */
  tap?: { onPrev: () => void; onNext: () => void; onHold: (hold: boolean) => void }
}

export function PhotoStage({ visual, visualKey, durationMs, filter, dim, onOpen, tap }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Size>({ w: 0, h: 0 })
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: visualKey, visual }])
  const pressAt = useRef<{ t: number } | null>(null)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.key === visualKey ? prev : [...prev.slice(-1), { key: visualKey, visual }]))
  }, [visualKey, visual])

  useEffect(() => {
    if (layers.length < 2) return
    const t = window.setTimeout(() => setLayers((l) => l.slice(-1)), 900)
    return () => window.clearTimeout(t)
  }, [layers])

  const onDown = () => {
    if (!tap) return
    pressAt.current = { t: performance.now() }
    tap.onHold(true)
  }
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!tap) return
    const p = pressAt.current
    pressAt.current = null
    tap.onHold(false)
    if (!p || performance.now() - p.t > 280) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left < rect.width * 0.3) tap.onPrev()
    else tap.onNext()
  }

  const current = layers[layers.length - 1]?.key

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full transition-opacity duration-700"
      style={{ opacity: dim ? 0.3 : 1 }}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => tap?.onHold(false)}
      onPointerLeave={() => tap?.onHold(false)}
    >
      {layers.map((l) =>
        l.visual.kind === 'photo' ? (
          <PhotoFrame
            key={l.key}
            photo={l.visual}
            box={box}
            active={l.key === current}
            tilt={hashTilt(l.key)}
            filter={filter}
            durationMs={durationMs}
            onOpen={onOpen}
          />
        ) : null,
      )}
    </div>
  )
}

/** Xem ảnh lớn toàn màn hình. */
export function PhotoLightbox({ photo, filter, onClose }: { photo: Photo; filter: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      style={{ animation: 'tp-fade-in 200ms ease-out both' }}
      onClick={onClose}
      role="dialog"
      aria-label={photo.caption}
    >
      <img
        src={photo.src}
        alt={photo.caption}
        className="max-h-[82vh] max-w-[94vw] rounded-sm object-contain shadow-2xl ring-1 ring-white/10"
        style={{ filter }}
        onClick={(e) => e.stopPropagation()}
      />
      <p className="mt-3 text-center text-sm text-white/80">
        {photo.caption}
        {photo.credit && <span className="ml-2 text-xs text-white/50">Ảnh: {photo.credit}</span>}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-white/10"
        aria-label="Đóng"
      >
        <MaterialIcon name="close" className="text-xl" />
      </button>
    </div>
  )
}
