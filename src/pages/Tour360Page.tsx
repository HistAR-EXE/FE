import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { panoramaApi, type Hotspot, type Panorama } from '../features/panorama/api'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

export function Tour360Page() {
  const { locationId } = useParams<{ locationId?: string }>()
  const [panoramas, setPanoramas] = useState<Panorama[]>([])
  const [panorama, setPanorama] = useState<Panorama | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const loadHotspots = async (panoramaId: string) => {
    const data = await panoramaApi.hotspotsByPanorama(panoramaId)
    setHotspots(data)
    setSelectedHotspot(data[0] ?? null)
  }

  useEffect(() => {
    if (!locationId) return
    const run = async () => {
      try {
        setLoading(true)
        const list = await panoramaApi.byLocation(locationId)
        setPanoramas(list)
        const first = list[0] ?? null
        setPanorama(first)
        if (first) {
          await loadHotspots(first.id)
        } else {
          setHotspots([])
          setSelectedHotspot(null)
        }
      } catch (e) {
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được dữ liệu tour 360.',
          type: 'error',
        })
        setPanorama(null)
        setHotspots([])
        setSelectedHotspot(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [locationId, showToast])

  return (
    <AppLayout activeBorder="left">
      <main className="h-[calc(100vh-4rem)] relative mt-16">
        <header className="absolute top-0 w-full bg-surface/70 backdrop-blur-xl border-b border-outline-variant z-40 flex justify-between items-center h-16 px-xl">
          <div className="flex items-center gap-sm">
            <Link to={locationId ? `/explore/${locationId}` : '/explore'} className="text-on-surface-variant hover:text-secondary">
              <MaterialIcon name="arrow_back" />
            </Link>
            <h2 className="font-headline-lg font-bold text-primary">{panorama?.title ?? 'Tour 360°'}</h2>
          </div>
        </header>
        {loading && <p className="pt-20 px-lg">Đang tải panorama...</p>}
        {!panorama && !loading && <p className="pt-20 px-lg text-on-surface-variant">Không có dữ liệu panorama.</p>}
        {panorama && (
          <>
            <div className="absolute inset-0 w-full h-full bg-black z-0 overflow-hidden">
              <div
                className="absolute inset-0 w-[200%] h-full bg-repeat-x bg-auto animate-[pan360_60s_linear_infinite_alternate]"
                style={{ backgroundImage: `url('${panorama.imageUrl || images.tour360Panorama}')` }}
              />
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-transparent via-background/20 to-background/80 mix-blend-multiply" />
              {hotspots.slice(0, 4).map((h, idx) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHotspot(h)}
                  className={`absolute z-10 ${
                    idx === 0 ? 'top-1/2 left-1/3' : idx === 1 ? 'top-[40%] right-1/4' : idx === 2 ? 'top-[62%] right-1/3' : 'top-[36%] left-[60%]'
                  } -translate-x-1/2 -translate-y-1/2 group`}
                >
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-surface-container/80 border border-primary/50 text-primary hover:bg-primary hover:text-on-primary transition-all">
                    <MaterialIcon name={h.type === 'scene' ? 'directions_walk' : 'info'} />
                  </div>
                </button>
              ))}
            </div>

            <div className="absolute bottom-lg left-lg right-lg z-30">
              <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md">
                {panoramas.length > 1 && (
                  <div className="mb-sm flex flex-wrap gap-xs">
                    {panoramas.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPanorama(item)
                          loadHotspots(item.id).catch(() => {
                            setHotspots([])
                            setSelectedHotspot(null)
                          })
                        }}
                        className={`px-sm py-xs rounded border ${
                          item.id === panorama.id ? 'border-secondary text-secondary' : 'border-outline-variant'
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
                {selectedHotspot && (
                  <div className="mb-sm rounded-lg border border-secondary/40 p-sm">
                    <p className="font-semibold">{selectedHotspot.label}</p>
                    <p className="text-sm text-on-surface-variant">Type: {selectedHotspot.type} · Ref: {selectedHotspot.contentRef}</p>
                  </div>
                )}
                <div className="flex gap-md overflow-x-auto pb-xs">
                  {hotspots.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHotspot(h)}
                      className={`min-w-40 text-left bg-surface-container border rounded-lg p-sm ${
                        selectedHotspot?.id === h.id ? 'border-secondary' : 'border-outline-variant'
                      }`}
                    >
                      <p className="font-semibold">{h.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </AppLayout>
  )
}

