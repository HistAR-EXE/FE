// src/features/time-portal/LampHotspotLayer.tsx
import { useEffect, useRef, useState } from 'react'
import { lampPosition, type LampHotspot } from './lampHotspots'

type LampHotspotLayerProps = {
  hotspots: LampHotspot[]
  onActivate?: (hotspot: LampHotspot) => void
}

const TAP_HOLD_MS = 2600

/**
 * Lớp đèn dầu: radial-gradient mềm, sáng hơn khi hover (chuột) / tap (cảm ứng).
 * Chỉ dùng CSS (gradient + opacity + mix-blend) nên hoạt động cả khi không có depth map.
 */
export function LampHotspotLayer({ hotspots, onActivate }: LampHotspotLayerProps) {
  const [tapped, setTapped] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!hotspots.length) return null

  return (
    <div className="lamp-layer absolute inset-0 z-[15] pointer-events-none" aria-label="Điểm đèn dầu">
      {hotspots.map((h) => {
        const { x, y } = lampPosition(h)
        const radius = h.radius ?? 120
        const active = tapped === h.id
        const tipBelow = y < 30
        return (
          <button
            key={h.id}
            type="button"
            className={`lamp-hotspot pointer-events-auto${active ? ' is-active' : ''}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: radius * 2,
              height: radius * 2,
              animationDelay: `${(h.id.length % 5) * -0.7}s`,
            }}
            aria-label={h.label ?? 'Đèn dầu'}
            aria-pressed={active}
            onClick={() => {
              window.clearTimeout(timer.current)
              setTapped(h.id)
              timer.current = window.setTimeout(() => setTapped(null), TAP_HOLD_MS)
              onActivate?.(h)
            }}
            onBlur={() => setTapped((cur) => (cur === h.id ? null : cur))}
          >
            <span className="lamp-glow" aria-hidden />
            <span className="lamp-core" aria-hidden />
            {(h.label || h.description) && (
              <span className={`lamp-tip${tipBelow ? ' lamp-tip--below' : ''}`}>
                {h.label && <strong>{h.label}</strong>}
                {h.description && <span>{h.description}</span>}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
