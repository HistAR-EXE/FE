import { useEffect, useRef } from 'react'
import { images } from '../../assets/images'
import type { Hotspot, Panorama } from '../../features/panorama/api'

/** Tuần 3: ưu tiên imageUrl HTTPS từ BE/CDN; chỉ fallback assets khi placeholder. */
function resolvePanoramaUrl(imageUrl: string | undefined): string {
  const trimmed = imageUrl?.trim()
  if (!trimmed || trimmed.includes('placeholder') || trimmed.endsWith('.txt')) {
    return images.tour360Panorama
  }
  return trimmed
}

type VirtualTourViewerProps = {
  panoramas: Panorama[]
  hotspotsByPanorama: Record<string, Hotspot[]>
  onHotspotSelect?: (hotspot: Hotspot) => void
  className?: string
}

export function VirtualTourViewer({
  panoramas,
  hotspotsByPanorama,
  onHotspotSelect,
  className = '',
}: VirtualTourViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current || panoramas.length === 0) return

    let cancelled = false

    const init = async () => {
      const [{ Viewer }, { VirtualTourPlugin }, { MarkersPlugin }] = await Promise.all([
        import('@photo-sphere-viewer/core'),
        import('@photo-sphere-viewer/virtual-tour-plugin'),
        import('@photo-sphere-viewer/markers-plugin'),
      ])

      await Promise.all([
        import('@photo-sphere-viewer/core/index.css'),
        import('@photo-sphere-viewer/markers-plugin/index.css'),
        import('@photo-sphere-viewer/virtual-tour-plugin/index.css'),
      ])

      if (cancelled || !containerRef.current) return

      const nodes = panoramas.map((panorama) => {
        const hotspots = hotspotsByPanorama[panorama.id] ?? []
        const sceneLinks = hotspots
          .filter((h) => h.type === 'scene' && h.contentRef)
          .map((h) => ({
            nodeId: h.contentRef,
            position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
          }))

        return {
          id: panorama.id,
          panorama: resolvePanoramaUrl(panorama.imageUrl),
          name: panorama.title,
          links: sceneLinks,
          markers: hotspots
            .filter((h) => h.type === 'info')
            .map((h) => ({
              id: h.id,
              position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
              html: `<div class="vt-info-marker">${h.label}</div>`,
              data: h,
            })),
        }
      })

      const startNodeId = panoramas[0]?.id

      const viewer = new Viewer({
        container: containerRef.current,
        navbar: ['zoom', 'move', 'fullscreen'],
        defaultYaw: 0,
        touchmoveTwoFingers: true,
        mousewheelCtrlKey: true,
        plugins: [
          [MarkersPlugin, { clickEventOnMarker: true }],
          [
            VirtualTourPlugin,
            {
              nodes,
              startNodeId,
              transitionOptions: { showLoader: true, speed: '20rpm' },
            },
          ],
        ],
      })

      const markers = viewer.getPlugin(MarkersPlugin)
      if (markers && onHotspotSelect) {
        markers.addEventListener('select-marker', ({ marker }: { marker: { data?: Hotspot } }) => {
          if (marker?.data) onHotspotSelect(marker.data)
        })
      }

      viewerRef.current = viewer
    }

    init().catch(() => {
      /* parent handles toast */
    })

    return () => {
      cancelled = true
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [panoramas, hotspotsByPanorama, onHotspotSelect])

  return <div ref={containerRef} className={`w-full h-full ${className}`} />
}
