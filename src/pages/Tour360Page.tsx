import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { VirtualTourViewer } from '../components/panorama/VirtualTourViewer'
import { panoramaApi, type Hotspot, type Panorama } from '../features/panorama/api'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function Tour360Page() {
  const { locationId } = useParams<{ locationId?: string }>()
  const [panoramas, setPanoramas] = useState<Panorama[]>([])
  const [hotspotsByPanorama, setHotspotsByPanorama] = useState<Record<string, Hotspot[]>>({})
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!locationId) return
    const run = async () => {
      try {
        setLoading(true)
        const list = await panoramaApi.byLocation(locationId)
        setPanoramas(list)
        const hotspotEntries = await Promise.all(
          list.map(async (panorama) => {
            const hotspots = await panoramaApi.hotspotsByPanorama(panorama.id)
            return [panorama.id, hotspots] as const
          }),
        )
        setHotspotsByPanorama(Object.fromEntries(hotspotEntries))
        const firstHotspots = hotspotEntries[0]?.[1] ?? []
        setSelectedHotspot(firstHotspots[0] ?? null)
      } catch (e) {
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được dữ liệu tour 360.',
          type: 'error',
        })
        setPanoramas([])
        setHotspotsByPanorama({})
        setSelectedHotspot(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [locationId, showToast])

  const onHotspotSelect = useCallback((hotspot: Hotspot) => {
    setSelectedHotspot(hotspot)
  }, [])

  const allHotspots = useMemo(
    () => Object.values(hotspotsByPanorama).flat(),
    [hotspotsByPanorama],
  )

  return (
    <AppLayout
      activeBorder="left"
      mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
      mobileTitle="Tour 360°"
    >
      <main className="h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] relative mt-14 md:mt-16 pb-16 md:pb-0">
        <header className="absolute top-0 w-full bg-surface/70 backdrop-blur-xl border-b border-outline-variant z-40 hidden md:flex justify-between items-center h-16 px-xl">
          <div className="flex items-center gap-sm min-w-0">
            <Link to={locationId ? `/explore/${locationId}` : '/explore'} className="text-on-surface-variant hover:text-secondary shrink-0">
              <MaterialIcon name="arrow_back" />
            </Link>
            <h2 className="font-headline-lg font-bold text-primary truncate">Tour 360°</h2>
          </div>
        </header>
        {loading && (
          <div className="pt-4 md:pt-20 px-lg flex flex-col items-center gap-md">
            <div className="w-full h-64 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
            <p className="text-on-surface-variant text-sm">Đang tải không gian 360°...</p>
          </div>
        )}
        {!loading && panoramas.length === 0 && (
          <p className="pt-4 md:pt-20 px-lg text-on-surface-variant">Chưa có dữ liệu tham quan 360° cho địa điểm này.</p>
        )}
        {!loading && panoramas.length > 0 && (
          <>
            <div className="absolute inset-0 top-0 md:top-16 w-full h-full md:h-[calc(100%-4rem)] z-0">
              <VirtualTourViewer
                panoramas={panoramas}
                hotspotsByPanorama={hotspotsByPanorama}
                onHotspotSelect={onHotspotSelect}
                className="min-h-[320px]"
              />
            </div>

            <div className="absolute bottom-20 md:bottom-lg left-md right-md md:left-lg md:right-lg z-30 pointer-events-none">
              <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md pointer-events-auto max-h-40 overflow-y-auto">
                {selectedHotspot && (
                  <div className="mb-sm rounded-lg border border-secondary/40 p-sm">
                    <p className="font-semibold text-on-surface">{selectedHotspot.label}</p>
                    <p className="text-sm text-on-surface-variant">
                      {selectedHotspot.type === 'scene' ? 'Điểm chuyển scene' : 'Thông tin điểm tham quan'}
                    </p>
                  </div>
                )}
                {allHotspots.length > 0 && (
                  <div className="flex gap-sm overflow-x-auto pb-xs">
                    {allHotspots.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedHotspot(h)}
                        className={`min-w-36 text-left bg-surface-container border rounded-lg p-sm shrink-0 ${
                          selectedHotspot?.id === h.id ? 'border-secondary' : 'border-outline-variant'
                        }`}
                      >
                        <p className="font-semibold text-sm truncate">{h.label}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </AppLayout>
  )
}
