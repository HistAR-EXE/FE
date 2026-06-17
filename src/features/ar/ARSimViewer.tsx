import type { EraValue } from './types'
import { HistoryPortalViewer } from './HistoryPortalViewer'
import type { ARSceneConfig } from './types'

type ARSimViewerProps = {
  scene: ARSceneConfig
  era: EraValue
  overlayImageUrl?: string
  className?: string
  onModelReady?: () => void
}

/** Fallback poster — ảnh hiện trạng + cổng lịch sử (khi không có camera). */
export function ARSimViewer({ scene, era, overlayImageUrl, className, onModelReady }: ARSimViewerProps) {
  const historicalFallback = `/media/cu-chi/scenes/${scene.slug}-${era === 2026 ? 1968 : era}.png`

  return (
    <HistoryPortalViewer
      presentImageUrl={scene.previewImage}
      historicalImageUrl={era === 2026 ? undefined : overlayImageUrl}
      historicalFallbackUrl={historicalFallback}
      era={era}
      sceneName={scene.name}
      className={className}
      onReady={onModelReady}
    />
  )
}
