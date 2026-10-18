// src/features/time-portal/TunnelScene3D.tsx
// Sa bàn 3D lát cắt địa đạo Củ Chi qua 4 thời kỳ.
// Phần dựng cảnh nằm trong ./tunnel3d (vanilla Three.js) — file này chỉ là lớp React:
// tiêu đề thời kỳ, bật/tắt nhãn, về toàn cảnh, thẻ mô tả khi chạm vào hầm/nhãn.

import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { EraValue } from './eraLabels'
import { ERA_SCENES, type InfoItem } from './tunnel3d/scenes'
import { createTunnelViewer, type TunnelViewer } from './tunnel3d/viewer'

type Props = {
  era: EraValue
  className?: string
}

export function TunnelScene3D({ era, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<TunnelViewer | null>(null)
  const initialEra = useRef(era)
  const [info, setInfo] = useState<InfoItem | null>(null)
  const [labels, setLabels] = useState(true)
  const [failed, setFailed] = useState(false)

  // Khởi tạo một lần
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let viewer: TunnelViewer
    try {
      viewer = createTunnelViewer(host, initialEra.current, { onSelect: setInfo })
    } catch {
      setFailed(true)
      return
    }
    viewerRef.current = viewer
    return () => {
      viewer.dispose()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    viewerRef.current?.setEra(era)
  }, [era])

  useEffect(() => {
    viewerRef.current?.setLabelsVisible(labels)
  }, [labels])

  const scene = ERA_SCENES[era]

  if (failed) {
    return (
      <div className={`flex h-full items-center justify-center px-6 text-center text-sm text-white/70 ${className}`}>
        Thiết bị của bạn chưa hỗ trợ WebGL nên không hiển thị được mô hình 3D.
      </div>
    )
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div ref={hostRef} className="absolute inset-0" />

      {/* Tiêu đề thời kỳ */}
      <div className="pointer-events-none absolute left-4 top-[4.25rem] z-10 max-w-[min(20rem,calc(100%-5.5rem))] rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-sm">
        <p className="text-sm font-semibold" style={{ color: scene.accent }}>
          {scene.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/70">{scene.caption}</p>
      </div>

      {/* Công cụ */}
      <div className="absolute right-4 top-[4.25rem] z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setLabels((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/70"
          title={labels ? 'Ẩn nhãn' : 'Hiện nhãn'}
          aria-pressed={labels}
        >
          <MaterialIcon name={labels ? 'label' : 'label_off'} className="text-lg" />
        </button>
        <button
          type="button"
          onClick={() => viewerRef.current?.resetView()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/70"
          title="Về toàn cảnh"
        >
          <MaterialIcon name="fit_screen" className="text-lg" />
        </button>
      </div>

      {/* Mô tả hầm / chi tiết đang chọn */}
      {info ? (
        <div
          className="absolute inset-x-3 bottom-[5.5rem] z-20 mx-auto max-w-md rounded-2xl border bg-black/75 p-4 shadow-2xl backdrop-blur-md"
          style={{ borderColor: `${scene.accent}66` }}
          role="dialog"
          aria-label={info.title}
        >
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: scene.accent }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{info.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/80">{info.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => viewerRef.current?.resetView()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Đóng và về toàn cảnh"
            >
              <MaterialIcon name="close" className="text-lg" />
            </button>
          </div>
        </div>
      ) : (
        <p className="pointer-events-none absolute inset-x-0 bottom-[5.75rem] z-10 px-4 text-center text-[11px] text-white/60">
          Chạm vào hầm hoặc nhãn để xem chi tiết · Phóng to để xem rõ người và đồ vật
        </p>
      )}
    </div>
  )
}
