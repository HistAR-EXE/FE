import { useCallback, useEffect, useRef, useState } from 'react'
import type { ARSceneConfig, ARTrackingState, EraValue } from './types'
import { eraImageFilter } from './arPortalStyles'
import { ARHistoricalPortal, ARViewfinderHud } from './ARViewfinderHud'
import './arPortal.css'

type ARWebcamViewerProps = {
  scene: ARSceneConfig
  era: EraValue
  historicalImageUrl?: string
  facingMode?: 'user' | 'environment'
  onTrackingChange?: (state: ARTrackingState) => void
  onCameraUnavailable?: () => void
  className?: string
}

/** Camera thật + ảnh lịch sử ghép lên — giống tablet viện bảo tàng. */
export function ARWebcamViewer({
  scene,
  era,
  historicalImageUrl,
  facingMode = 'user',
  onTrackingChange,
  onCameraUnavailable,
  className,
}: ARWebcamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tracking, setTracking] = useState<ARTrackingState>('scanning')
  const notifiedRef = useRef(false)

  const updateTracking = useCallback(
    (state: ARTrackingState) => {
      setTracking(state)
      onTrackingChange?.(state)
      if (state === 'found' && navigator.vibrate) navigator.vibrate(50)
    },
    [onTrackingChange],
  )

  useEffect(() => {
    updateTracking('scanning')
    const t = window.setTimeout(() => updateTracking('found'), 1400)
    return () => window.clearTimeout(t)
  }, [scene.slug, era, updateTracking])

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!notifiedRef.current) {
          notifiedRef.current = true
          onCameraUnavailable?.()
        }
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      } catch {
        if (!notifiedRef.current) {
          notifiedRef.current = true
          onCameraUnavailable?.()
        }
      }
    }
    void start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facingMode, onCameraUnavailable])

  const showPortal = era !== 2026 && tracking === 'found'
  const histFallback = historicalImageUrl ?? `/media/cu-chi/scenes/${scene.slug}-${era}.png`

  return (
    <div className={`history-portal-root absolute inset-0 bg-black ${className ?? ''}`}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: showPortal ? 'brightness(0.42) saturate(0.7)' : undefined }}
        playsInline
        muted
        autoPlay
      />

      <ARViewfinderHud era={era} tracking={tracking} mode="camera" />

      <ARHistoricalPortal
        historicalImageUrl={historicalImageUrl}
        fallbackImageUrl={histFallback}
        sceneName={scene.name}
        era={era}
        imageFilter={eraImageFilter(era)}
        visible={showPortal}
      />

      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-[4]" />
    </div>
  )
}
