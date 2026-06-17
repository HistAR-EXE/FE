import { lazy, Suspense } from 'react'
import type { ARSceneConfig, ARTrackingState, EraValue } from './types'

const ARWebcamViewer = lazy(() => import('./ARWebcamViewer').then((m) => ({ default: m.ARWebcamViewer })))

type ARSceneViewerProps = {
  mode: 'webcam' | 'live'
  scene: ARSceneConfig
  era: EraValue
  historicalImageUrl?: string
  onTrackingChange?: (state: ARTrackingState) => void
}

export function ARSceneViewer({ mode, scene, era, historicalImageUrl, onTrackingChange }: ARSceneViewerProps) {
  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black text-on-surface-variant text-sm">
          Đang khởi động camera AR…
        </div>
      }
    >
      <ARWebcamViewer
        scene={scene}
        era={era}
        historicalImageUrl={historicalImageUrl}
        facingMode={mode === 'live' ? 'environment' : 'user'}
        onTrackingChange={onTrackingChange}
      />
    </Suspense>
  )
}
