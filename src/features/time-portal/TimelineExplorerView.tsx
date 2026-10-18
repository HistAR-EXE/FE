// src/features/time-portal/TimelineExplorerView.tsx
// Chế độ "Khám phá dòng thời gian" — Timeline Scrubber + Parallax + Narrative.

import { useCallback, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { eraBadgeClass } from '../../shared/ui/eraBadge'
import { ParallaxScene } from './ParallaxScene'
import { TimelineScrubber } from './TimelineScrubber'
import { getEraData } from './cuChiEraData'
import { ERA_VALUES, type EraValue } from './eraLabels'

type Props = {
  initialEra?: EraValue
  isPremium?: boolean
  onPremiumRequired?: (era: EraValue) => void
  onSwitchToCompare?: () => void
  onSwitchTo3D?: () => void
}

export function TimelineExplorerView({
  initialEra,
  isPremium = true,
  onPremiumRequired,
  onSwitchToCompare,
  onSwitchTo3D,
}: Props) {
  const [era, setEra] = useState<EraValue>(initialEra ?? 2026)
  const [showNarrative, setShowNarrative] = useState(true)
  const eraData = getEraData(era)

  const handleEraChange = useCallback(
    (next: EraValue) => {
      if (!isPremium && next !== 2026) {
        onPremiumRequired?.(next)
        return
      }
      setEra(next)
    },
    [isPremium, onPremiumRequired],
  )

  const isLocked = useCallback(
    (e: EraValue) => !isPremium && e !== 2026,
    [isPremium],
  )

  const eraIdx = ERA_VALUES.indexOf(era)
  const canPrev = eraIdx > 0
  const canNext = eraIdx < ERA_VALUES.length - 1

  const goPrev = () => {
    if (canPrev) handleEraChange(ERA_VALUES[eraIdx - 1])
  }
  const goNext = () => {
    if (canNext) handleEraChange(ERA_VALUES[eraIdx + 1])
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      {/* Parallax scene — fills available space */}
      <div className="relative flex-1 min-h-0">
        <ParallaxScene eraData={eraData} />

        {/* Top bar: title + switch button */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between p-4 pointer-events-none">
          <div className="pointer-events-auto max-w-[70%]">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${eraBadgeClass(era)}`}>
              {era}
            </div>
            <h2
              className="font-display-lg text-white mt-2 drop-shadow-lg transition-all duration-500"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {eraData.title}
            </h2>
            <p className="text-white/70 text-sm mt-1 drop-shadow-md">{eraData.subtitle}</p>
          </div>

          <div className="pointer-events-auto flex flex-nowrap items-center gap-2">
            {onSwitchTo3D && (
              <button
                type="button"
                onClick={onSwitchTo3D}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full bg-black/50 border border-white/20 text-xs text-white/80 backdrop-blur-sm hover:bg-black/70 transition-colors"
                title="Xem mô hình 3D địa đạo"
              >
                <MaterialIcon name="view_in_ar" className="text-base" />
                <span className="hidden sm:inline">3D</span>
              </button>
            )}
            {onSwitchToCompare && (
              <button
                type="button"
                onClick={onSwitchToCompare}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full bg-black/50 border border-white/20 text-xs text-white/80 backdrop-blur-sm hover:bg-black/70 transition-colors"
                title="Chuyển sang chế độ so sánh"
              >
                <MaterialIcon name="compare" className="text-base" />
                <span className="hidden sm:inline">So sánh</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowNarrative((v) => !v)}
              className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 border border-white/20 text-white/80 backdrop-blur-sm hover:bg-black/70 transition-colors"
              title={showNarrative ? 'Ẩn chú thích' : 'Hiện chú thích'}
            >
              <MaterialIcon name={showNarrative ? 'visibility_off' : 'info'} className="text-lg" />
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="absolute inset-y-0 left-0 z-20 flex items-center pl-2 pointer-events-none">
          {canPrev && (
            <button
              type="button"
              onClick={goPrev}
              className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/15 text-white/70 backdrop-blur-sm hover:bg-black/60 transition-colors"
              aria-label="Mốc trước"
            >
              <MaterialIcon name="chevron_left" className="text-2xl" />
            </button>
          )}
        </div>
        <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-2 pointer-events-none">
          {canNext && (
            <button
              type="button"
              onClick={goNext}
              className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/15 text-white/70 backdrop-blur-sm hover:bg-black/60 transition-colors"
              aria-label="Mốc sau"
            >
              <MaterialIcon name="chevron_right" className="text-2xl" />
            </button>
          )}
        </div>

        {/* Narrative panel — bottom overlay */}
        <div
          className={`absolute bottom-0 inset-x-0 z-20 transition-all duration-500 ease-out ${
            showNarrative ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          <div className="mx-2 mb-2 sm:mx-4 sm:mb-4 p-4 sm:p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 max-h-[45vh] overflow-y-auto">
            <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-3">{eraData.narrative}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eraData.facts.map((fact) => (
                <div key={fact} className="flex items-start gap-2 text-white/70 text-xs sm:text-sm">
                  <MaterialIcon name="arrow_right" className="text-sm mt-0.5 shrink-0" style={{ color: eraData.accentColor }} />
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline scrubber — bottom bar */}
      <div className="shrink-0 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 px-4 sm:px-8 py-3 pb-safe">
        <TimelineScrubber
          currentEra={era}
          onEraChange={handleEraChange}
          isLocked={isLocked}
        />
      </div>
    </div>
  )
}
