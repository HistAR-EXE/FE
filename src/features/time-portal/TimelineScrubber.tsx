// src/features/time-portal/TimelineScrubber.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { ERA_VALUES, eraTimelineLabel, eraPeriodName, type EraValue } from './eraLabels'
import { getEraData } from './cuChiEraData'

type Props = {
  currentEra: EraValue
  onEraChange: (era: EraValue) => void
  /** true khi era bị khoá (premium). */
  isLocked?: (era: EraValue) => boolean
}

/** Vị trí % trên thanh timeline cho mỗi era. */
function eraPosition(era: EraValue): number {
  const idx = ERA_VALUES.indexOf(era)
  if (idx < 0) return 0
  return (idx / (ERA_VALUES.length - 1)) * 100
}

/** Tìm era gần nhất với vị trí % trên thanh timeline. */
function nearestEra(pct: number): EraValue {
  let best: EraValue = ERA_VALUES[0]
  let bestDist = Infinity
  for (const e of ERA_VALUES) {
    const dist = Math.abs(eraPosition(e) - pct)
    if (dist < bestDist) {
      bestDist = dist
      best = e
    }
  }
  return best
}

export function TimelineScrubber({ currentEra, onEraChange, isLocked }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [hoverEra, setHoverEra] = useState<EraValue | null>(null)
  const displayEra = hoverEra ?? currentEra
  const eraData = getEraData(displayEra)

  const pctFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
  }, [])

  const commitEra = useCallback(
    (pct: number) => {
      const era = nearestEra(pct)
      if (isLocked?.(era)) return
      onEraChange(era)
    },
    [onEraChange, isLocked],
  )

  useEffect(() => {
    const onMove = (clientX: number) => {
      if (!dragging.current) return
      const pct = pctFromPointer(clientX)
      const era = nearestEra(pct)
      setHoverEra(era)
    }
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX)
    }
    const stop = (clientX?: number) => {
      if (!dragging.current) return
      dragging.current = false
      if (clientX !== undefined) {
        const pct = pctFromPointer(clientX)
        commitEra(pct)
      }
      setHoverEra(null)
    }
    const onMouseUp = (e: MouseEvent) => stop(e.clientX)
    const onTouchEnd = (e: TouchEvent) => stop(e.changedTouches[0]?.clientX)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pctFromPointer, commitEra])

  const thumbPct = eraPosition(displayEra)

  return (
    <div className="w-full select-none">
      {/* Era description */}
      <div className="mb-3 min-h-[2.5rem] transition-opacity duration-300">
        <p className="text-xs font-label-sm uppercase tracking-wider mb-0.5" style={{ color: eraData.accentColor }}>
          {eraPeriodName(displayEra)}
        </p>
        <p className="text-sm text-on-surface/80 line-clamp-2">{eraData.subtitle}</p>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-12 flex items-center cursor-pointer"
        onMouseDown={(e) => {
          dragging.current = true
          const pct = pctFromPointer(e.clientX)
          setHoverEra(nearestEra(pct))
        }}
        onTouchStart={(e) => {
          dragging.current = true
          if (e.touches[0]) {
            const pct = pctFromPointer(e.touches[0].clientX)
            setHoverEra(nearestEra(pct))
          }
        }}
        role="slider"
        aria-valuenow={currentEra}
        aria-valuemin={ERA_VALUES[0]}
        aria-valuemax={ERA_VALUES[ERA_VALUES.length - 1]}
        aria-label="Thanh trượt thời gian"
        tabIndex={0}
        onKeyDown={(e) => {
          const idx = ERA_VALUES.indexOf(currentEra)
          if (e.key === 'ArrowRight' && idx < ERA_VALUES.length - 1) {
            const next = ERA_VALUES[idx + 1]
            if (!isLocked?.(next)) onEraChange(next)
          }
          if (e.key === 'ArrowLeft' && idx > 0) {
            const prev = ERA_VALUES[idx - 1]
            if (!isLocked?.(prev)) onEraChange(prev)
          }
        }}
      >
        {/* Background line */}
        <div className="absolute left-0 right-0 h-0.5 bg-outline-variant/40 rounded-full" />

        {/* Progress fill */}
        <div
          className="absolute left-0 h-0.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${thumbPct}%`, backgroundColor: eraData.accentColor }}
        />

        {/* Era markers */}
        {ERA_VALUES.map((era) => {
          const pos = eraPosition(era)
          const active = era === displayEra
          const locked = isLocked?.(era) ?? false

          return (
            <button
              key={era}
              type="button"
              onClick={() => {
                if (!locked) onEraChange(era)
              }}
              className="absolute -translate-x-1/2 flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
              style={{ left: `${pos}%` }}
              aria-label={`${eraTimelineLabel(era)}${locked ? ' (khoá)' : ''}`}
            >
              {/* Dot */}
              <div
                className={`rounded-full border-2 transition-all duration-300 ${
                  active
                    ? 'w-4 h-4 shadow-lg'
                    : 'w-2.5 h-2.5 border-outline-variant/60 bg-surface hover:scale-125'
                }`}
                style={active ? { backgroundColor: eraData.accentColor, borderColor: eraData.accentColor } : undefined}
              />

              {/* Label */}
              <span
                className={`text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                  active ? 'opacity-100 scale-100' : 'opacity-60 scale-90'
                }`}
                style={active ? { color: eraData.accentColor } : undefined}
              >
                {locked && <MaterialIcon name="lock" className="text-[10px] mr-0.5 align-middle" />}
                {eraTimelineLabel(era)}
              </span>
            </button>
          )
        })}

        {/* Thumb indicator */}
        <div
          className="absolute -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white/80 shadow-xl transition-all duration-500 ease-out pointer-events-none"
          style={{
            left: `${thumbPct}%`,
            backgroundColor: eraData.accentColor,
            boxShadow: `0 0 16px ${eraData.accentColor}40`,
          }}
        />
      </div>
    </div>
  )
}
