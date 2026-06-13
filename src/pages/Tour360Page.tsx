import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Link, useParams, useSearchParams } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'

import { VirtualTourViewer } from '../components/panorama/VirtualTourViewer'

import { panoramaApi, type Hotspot, type Panorama } from '../features/panorama/api'

import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'

import { useAuth } from '../shared/auth/useAuth'

import { ApiError } from '../shared/api/contracts'

import { useToast } from '../shared/ui/toast/useToast'

import { MaterialIcon } from '../components/ui/MaterialIcon'
import { appEnv } from '../shared/config/env'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'



export function Tour360Page() {

  const { locationId } = useParams<{ locationId?: string }>()

  const [searchParams] = useSearchParams()

  const panoramaParam = searchParams.get('panorama')

  const { isAuthenticated } = useAuth()
  const activeLocationId = locationId ?? CU_CHI_LOCATION_ID
  useVisitSessionForLocation(activeLocationId, isAuthenticated)

  const [panoramas, setPanoramas] = useState<Panorama[]>([])

  const [hotspotsByPanorama, setHotspotsByPanorama] = useState<Record<string, Hotspot[]>>({})

  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)

  const [infoModal, setInfoModal] = useState<Hotspot | null>(null)

  const [loading, setLoading] = useState(true)

  const { showToast } = useToast()

  const recordedScenes = useRef(new Set<string>())
  const dwellTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const recordScene = useCallback(
    (panoramaId: string) => {
      if (!isAuthenticated || recordedScenes.current.has(panoramaId)) return
      recordedScenes.current.add(panoramaId)
      void recordDiscoveryEngagement({
        recordKey: `scene:${panoramaId}`,
        locationId: locationId ?? CU_CHI_LOCATION_ID,
        source: 'tour_panorama',
        onError: () =>
          showToast({
            message: 'Không ghi được tiến độ khám phá.',
            type: 'error',
          }),
      })
    },
    [isAuthenticated, locationId, showToast],
  )

  const onPanoramaEnter = useCallback(
    (panoramaId: string) => {
      const existing = dwellTimers.current.get(panoramaId)
      if (existing) clearTimeout(existing)
      const dwellMs = appEnv.discoveryDwellMs
      if (dwellMs > 0) {
        const timer = setTimeout(() => {
          dwellTimers.current.delete(panoramaId)
          recordScene(panoramaId)
        }, dwellMs)
        dwellTimers.current.set(panoramaId, timer)
      } else {
        recordScene(panoramaId)
      }
    },
    [recordScene],
  )



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



  const onHotspotSelect = useCallback(

    (hotspot: Hotspot) => {

      setSelectedHotspot(hotspot)

      if (hotspot.type === 'info' && (hotspot.title || hotspot.description)) {

        setInfoModal(hotspot)

        if (isAuthenticated && hotspot.unlockKey) {

          void recordDiscoveryEngagement({

            recordKey: hotspot.unlockKey,

            locationId: locationId ?? CU_CHI_LOCATION_ID,

            source: 'hotspot_info',

            onError: () =>

              showToast({

                message: 'Không ghi được tiến độ khám phá.',

                type: 'error',

              }),

          })

        }

      }

    },

    [isAuthenticated, showToast],

  )



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

                initialPanoramaId={panoramaParam}

                onHotspotSelect={onHotspotSelect}

                onPanoramaEnter={onPanoramaEnter}

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

                        onClick={() => onHotspotSelect(h)}

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



            {infoModal && (

              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-md bg-black/50" onClick={() => setInfoModal(null)}>

                <div

                  className="glass-panel w-full max-w-md rounded-xl border border-outline-variant p-md pointer-events-auto"

                  onClick={(e) => e.stopPropagation()}

                >

                  {infoModal.imageUrl && (

                    <img src={infoModal.imageUrl} alt={infoModal.title ?? infoModal.label} className="w-full h-40 object-cover rounded-lg mb-md" />

                  )}

                  <h3 className="font-title-md text-primary">{infoModal.title ?? infoModal.label}</h3>

                  <p className="text-sm text-on-surface-variant mt-sm">{infoModal.description ?? 'Thông tin điểm tham quan.'}</p>

                  <button type="button" onClick={() => setInfoModal(null)} className="mt-md px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant">

                    Đóng

                  </button>

                </div>

              </div>

            )}

          </>

        )}

      </main>

    </AppLayout>

  )

}

