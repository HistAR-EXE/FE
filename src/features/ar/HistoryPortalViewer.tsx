import { useEffect, useState } from 'react'
import type { EraValue } from './types'
import { eraImageFilter } from './arPortalStyles'
import { ARHistoricalPortal, ARViewfinderHud } from './ARViewfinderHud'
import { CompareLayerImage } from '../time-portal/CompareLayerImage'
import { images } from '../../assets/images'
import './arPortal.css'

type HistoryPortalViewerProps = {
  presentImageUrl: string
  historicalImageUrl?: string
  historicalFallbackUrl: string
  era: EraValue
  sceneName: string
  className?: string
  onReady?: () => void
}

/** Fallback khi không có camera — ảnh hiện trạng + cổng lịch sử (không kéo/parallax). */
export function HistoryPortalViewer({
  presentImageUrl,
  historicalImageUrl,
  historicalFallbackUrl,
  era,
  sceneName,
  className,
  onReady,
}: HistoryPortalViewerProps) {
  const [presentError, setPresentError] = useState(false)
  const [tracking, setTracking] = useState<'scanning' | 'found'>('scanning')

  const showPortal = era !== 2026

  useEffect(() => {
    setTracking('scanning')
    const t = window.setTimeout(() => setTracking('found'), 900)
    return () => window.clearTimeout(t)
  }, [era, historicalImageUrl, presentImageUrl])

  useEffect(() => {
    if (!presentError) onReady?.()
  }, [presentError, onReady])

  const histFallback = historicalImageUrl ?? historicalFallbackUrl

  return (
    <div
      className={`history-portal-root absolute inset-0 bg-black overflow-hidden ${className ?? ''}`}
      role="img"
      aria-label={`Cổng AR ${sceneName}`}
    >
      {!presentError ? (
        <CompareLayerImage
          src={presentImageUrl}
          fallback={images.timePortalPresent}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: showPortal && tracking === 'found' ? 'brightness(0.45) saturate(0.75)' : undefined }}
          onFailed={() => setPresentError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-surface-container flex items-center justify-center text-sm text-on-surface-variant">
          Không tải được ảnh bối cảnh.
        </div>
      )}

      <ARViewfinderHud era={era} tracking={tracking} mode="poster" />

      <ARHistoricalPortal
        historicalImageUrl={historicalImageUrl}
        fallbackImageUrl={histFallback}
        sceneName={sceneName}
        era={era}
        imageFilter={eraImageFilter(era)}
        visible={showPortal && tracking === 'found'}
      />

      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-[4]" />
    </div>
  )
}
