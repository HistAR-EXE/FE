import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PhotoPair } from '../locations/api'
import type { PhotoScene } from '../photo-scenes/api'
import { images } from '../../assets/images'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { CompareLayerImage } from './CompareLayerImage'
import {
  ERA_VALUES,
  eraCompareSideLabel,
  eraHeadline,
  eraTimelineLabel,
  isPresentEra,
  type EraValue,
} from './eraLabels'

type TimePortalViewerProps = {
  scenes?: PhotoScene[]
  pairs?: PhotoPair[]
  sceneIndex: number
  onSceneIndexChange: (index: number) => void
  onEraChange?: (era: EraValue) => void
  onEngagement?: () => void
  initialEra?: EraValue
}

type LayerData = { imageUrl: string; caption: string; era: EraValue }

function layerForEra(scene: PhotoScene | undefined, era: EraValue, pair: PhotoPair | undefined): LayerData {
  if (scene?.layers?.length) {
    const layer =
      scene.layers.find((l) => l.era === era) ??
      (era !== 1968 ? scene.layers.find((l) => l.era === 1968) : undefined) ??
      scene.layers.find((l) => l.era !== 2026) ??
      scene.layers[0]
    if (layer) {
      return { imageUrl: layer.imageUrl, caption: layer.caption, era: layer.era as EraValue }
    }
  }
  if (pair) {
    const imageUrl = era === 2026 ? pair.currentImage : pair.historicalImage
    return { imageUrl, caption: pair.caption, era: (pair.year ?? 1968) as EraValue }
  }
  return {
    imageUrl: era === 2026 ? images.timePortalPresent : images.timePortalPast,
    caption: '',
    era,
  }
}

function resolveCompareLayers(
  scene: PhotoScene | undefined,
  pair: PhotoPair | undefined,
  selectedEra: EraValue,
): { past: LayerData; present: LayerData; compareEra: EraValue } {
  const present = layerForEra(scene, 2026, pair)
  const compareEra: EraValue = isPresentEra(selectedEra) ? 1968 : selectedEra
  const past = layerForEra(scene, compareEra, pair)
  return { past, present, compareEra }
}

export function TimePortalViewer({
  scenes,
  pairs,
  sceneIndex,
  onSceneIndexChange,
  onEraChange,
  onEngagement,
  initialEra,
}: TimePortalViewerProps) {
  const scene = scenes?.[sceneIndex]
  const pair = pairs?.[sceneIndex]
  const tabs = scenes?.length ? scenes : pairs ?? []
  const [era, setEra] = useState<EraValue>(initialEra ?? 1968)
  const [sliderPct, setSliderPct] = useState(50)
  const [vortex, setVortex] = useState(false)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { past, present, compareEra } = useMemo(
    () => resolveCompareLayers(scene, pair, era),
    [scene, pair, era],
  )

  const showCompare = !isPresentEra(era)

  useEffect(() => {
    if (initialEra) setEra(initialEra)
  }, [initialEra])

  const triggerVortex = useCallback(
    (nextEra: EraValue) => {
      setVortex(true)
      setEra(nextEra)
      if (!isPresentEra(nextEra)) setSliderPct(50)
      onEngagement?.()
      onEraChange?.(nextEra)
      window.setTimeout(() => setVortex(false), 1400)
    },
    [onEraChange, onEngagement],
  )

  useEffect(() => {
    const onMove = (clientX: number) => {
      const el = containerRef.current
      if (!el || !dragging.current) return
      const rect = el.getBoundingClientRect()
      const pct = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100))
      setSliderPct(pct)
    }
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX)
    }
    const stop = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', stop)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stop)
    }
  }, [])

  if (!tabs.length) return null

  const caption = isPresentEra(era) ? present.caption : past.caption || present.caption

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      {vortex && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center" aria-hidden>
          <div
            className="w-[120%] h-[120%] rounded-full opacity-70 animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, transparent, #f2bf50, #44dbd5, transparent)',
              animationDuration: '1.4s',
            }}
          />
        </div>
      )}

      {/* Hiện trạng — luôn là lớp nền (bên phải khi so sánh) */}
      <CompareLayerImage
        src={present.imageUrl}
        fallback={images.timePortalPresent}
        alt="Hiện nay"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Ảnh xưa — lớp trên, cắt theo thanh trượt (bên trái) */}
      {showCompare && (
        <div
          className="absolute inset-0 z-10 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
        >
          <CompareLayerImage
            src={past.imageUrl}
            fallback={images.timePortalPast}
            alt={`Tái hiện ${compareEra}`}
            className="absolute inset-0 w-full h-full object-cover sepia-[0.6] contrast-[1.1] brightness-90"
          />
        </div>
      )}

      <div className="absolute top-xl left-xl z-20 max-w-md pointer-events-none">
        {showCompare ? (
          <>
            <p className="text-primary text-sm font-label-sm mb-1">{eraCompareSideLabel(compareEra)}</p>
            {caption && <p className="text-on-surface-variant text-sm">{caption}</p>}
          </>
        ) : (
          <>
            <h2 className="font-display-lg text-primary">{eraHeadline(era)}</h2>
            {caption && <p className="text-on-surface-variant text-sm mt-1">{caption}</p>}
          </>
        )}
      </div>

      {showCompare && (
        <>
          <div className="absolute top-xl right-xl z-20 px-3 py-1 rounded-full bg-black/50 border border-secondary/40 text-xs text-secondary backdrop-blur-sm pointer-events-none">
            Hiện nay
          </div>
          <div
            className="slider-handle"
            style={{ left: `${sliderPct}%` }}
            onMouseDown={() => {
              dragging.current = true
              onEngagement?.()
            }}
            onTouchStart={() => {
              dragging.current = true
              onEngagement?.()
            }}
            role="slider"
            aria-valuenow={sliderPct}
            aria-label="So sánh xưa và nay"
          >
            <div className="slider-button">
              <MaterialIcon name="compare_arrows" className="text-primary text-xl" />
            </div>
          </div>
        </>
      )}

      <div className="absolute bottom-xl left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-sm">
        <div className="bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-md">
          {ERA_VALUES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => triggerVortex(e)}
              className={`font-title-md ${e === era ? 'text-primary glow-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
            >
              {eraTimelineLabel(e)}
            </button>
          ))}
        </div>
        <div className="bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-xl max-w-[95vw] overflow-x-auto hide-scrollbar">
          {tabs.map((tab, i) => {
            const label = 'name' in tab ? tab.name : `${(tab as PhotoPair).year ?? `Mốc ${i + 1}`}`
            return (
              <button
                key={'id' in tab ? tab.id : i}
                type="button"
                onClick={() => {
                  onEngagement?.()
                  onSceneIndexChange(i)
                }}
                className={`font-title-md shrink-0 ${i === sceneIndex ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
