import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PhotoPair } from '../locations/api'
import type { PhotoScene } from '../photo-scenes/api'
import { images } from '../../assets/images'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

const ERAS = [1948, 1968, 2026] as const
type Era = (typeof ERAS)[number]

type TimePortalViewerProps = {
  scenes?: PhotoScene[]
  pairs?: PhotoPair[]
  sceneIndex: number
  onSceneIndexChange: (index: number) => void
  onEraChange?: (era: Era) => void
  onEngagement?: () => void
  initialEra?: Era
}

function layerForEra(scene: PhotoScene | undefined, era: Era, pair: PhotoPair | undefined) {
  if (scene?.layers?.length) {
    const layer = scene.layers.find((l) => l.era === era) ?? scene.layers.find((l) => l.era === 1968)
    if (layer) {
      return { imageUrl: layer.imageUrl, caption: layer.caption, era: layer.era }
    }
  }
  if (pair) {
    const imageUrl = era === 2026 ? pair.currentImage : pair.historicalImage
    return { imageUrl, caption: pair.caption, era: pair.year ?? 1968 }
  }
  return {
    imageUrl: era === 2026 ? images.timePortalPresent : images.timePortalPast,
    caption: '',
    era,
  }
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
  const [era, setEra] = useState<Era>(initialEra ?? 1968)
  const [sliderPct, setSliderPct] = useState(50)
  const [vortex, setVortex] = useState(false)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const pastLayer = useMemo(() => layerForEra(scene, era === 2026 ? 1968 : era, pair), [scene, era, pair])
  const presentLayer = useMemo(() => layerForEra(scene, 2026, pair), [scene, pair])

  const triggerVortex = useCallback(
    (nextEra: Era) => {
      setVortex(true)
      setEra(nextEra)
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

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {vortex && (
        <div
          className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          <div
            className="w-[120%] h-[120%] rounded-full opacity-70 animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, transparent, #f2bf50, #44dbd5, transparent)',
              animationDuration: '1.4s',
            }}
          />
        </div>
      )}

      <div
        className="view-layer view-present"
        style={{ backgroundImage: `url('${presentLayer.imageUrl || images.timePortalPresent}')` }}
      />
      <div
        className="view-layer view-past"
        style={{
          clipPath: `inset(0 ${100 - sliderPct}% 0 0)`,
          backgroundImage: `url('${pastLayer.imageUrl || images.timePortalPast}')`,
        }}
      />

      <div className="absolute top-xl left-xl z-20 max-w-md">
        <h2 className="font-display-lg text-primary">{era}</h2>
        <p className="text-on-surface-variant text-sm">{pastLayer.caption || presentLayer.caption}</p>
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

      <div className="absolute bottom-xl left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-sm">
        <div className="bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-md">
          {ERAS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => triggerVortex(e)}
              className={`font-title-md ${e === era ? 'text-primary glow-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-xl">
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
                className={`font-title-md ${i === sceneIndex ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
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
