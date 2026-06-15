import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useParams, useSearchParams } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'

import { VirtualTourViewer } from '../components/panorama/VirtualTourViewer'

import { CuChiTourLeafletMap } from '../components/panorama/CuChiTourLeafletMap'

import { Tour360Hud } from '../components/panorama/Tour360Hud'

import { panoramaApi, type Hotspot, type Panorama } from '../features/panorama/api'

import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'

import { useAuth } from '../shared/auth/useAuth'

import { ApiError } from '../shared/api/contracts'

import { useToast } from '../shared/ui/toast/useToast'

import { appEnv } from '../shared/config/env'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'

const CU_CHI_ENTRANCE_ID = '22222222-2222-2222-2222-222222222222'

type TourViewMode = 'map' | 'panorama'

export function Tour360Page() {
  const { locationId } = useParams<{ locationId?: string }>()
  const [searchParams] = useSearchParams()
  const panoramaParam = searchParams.get('panorama')
  const { isAuthenticated } = useAuth()
  const activeLocationId = locationId ?? CU_CHI_LOCATION_ID
  const isCuChi = activeLocationId === CU_CHI_LOCATION_ID
  useVisitSessionForLocation(activeLocationId, isAuthenticated)

  const [panoramas, setPanoramas] = useState<Panorama[]>([])
  const [hotspotsByPanorama, setHotspotsByPanorama] = useState<Record<string, Hotspot[]>>({})
  const [activePanoramaId, setActivePanoramaId] = useState<string | null>(panoramaParam)
  const [viewMode, setViewMode] = useState<TourViewMode>(
    isCuChi && !panoramaParam ? 'map' : 'panorama',
  )
  const [infoModal, setInfoModal] = useState<Hotspot | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [layoutRevision, setLayoutRevision] = useState(0)
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
      setActivePanoramaId(panoramaId)
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

        const preferred =
          panoramaParam && list.some((p) => p.id === panoramaParam)
            ? panoramaParam
            : (list.find((p) => p.id === CU_CHI_ENTRANCE_ID)?.id ?? list[0]?.id ?? null)
        setActivePanoramaId(preferred)
      } catch (e) {
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được dữ liệu tour 360.',
          type: 'error',
        })
        setPanoramas([])
        setHotspotsByPanorama({})
        setActivePanoramaId(null)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [locationId, panoramaParam, showToast])

  const onHotspotSelect = useCallback(
    (hotspot: Hotspot) => {
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
    [isAuthenticated, locationId, showToast],
  )

  const onLoadError = useCallback(
    (message: string) => {
      showToast({ message, type: 'error' })
    },
    [showToast],
  )

  const activePanorama = useMemo(
    () => panoramas.find((p) => p.id === activePanoramaId) ?? panoramas[0],
    [panoramas, activePanoramaId],
  )

  const activeInfoHotspots = useMemo(() => {
    if (!activePanorama) return []
    return (hotspotsByPanorama[activePanorama.id] ?? []).filter((h) => h.type === 'info')
  }, [activePanorama, hotspotsByPanorama])

  const handleSelectPanorama = useCallback((id: string) => {
    setActivePanoramaId(id)
    setViewMode('panorama')
    setMenuOpen(false)
  }, [])

  const handleOpenMap = useCallback(() => {
    setViewMode('map')
    setMenuOpen(false)
  }, [])

  const handleToggleImmersive = useCallback(() => {
    setImmersive((v) => !v)
    setLayoutRevision((n) => n + 1)
  }, [])

  return (
    <AppLayout
      activeBorder="left"
      hideSideNav={immersive}
      hideMobileChrome={immersive}
      mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
      mobileTitle="Tour 360°"
      className={immersive ? 'tour360-layout tour360-layout--immersive' : 'tour360-layout'}
    >
      <main className={`tour360-main ${immersive ? '' : 'tour360-main--with-nav'}`}>
        {loading && (
          <div className="tour360-loading">
            <div className="tour360-loading__pulse" />
            <p>Đang tải không gian 360°...</p>
          </div>
        )}

        {!loading && panoramas.length === 0 && (
          <p className="tour360-empty">Chưa có dữ liệu tham quan 360° cho địa điểm này.</p>
        )}

        {!loading && panoramas.length > 0 && locationId && (
          <>
            {isCuChi && viewMode === 'map' && (
              <div className="tour360-viewport">
                <CuChiTourLeafletMap
                  panoramas={panoramas}
                  activePanoramaId={activePanoramaId}
                  onSelectPanorama={handleSelectPanorama}
                  layoutRevision={layoutRevision}
                />
              </div>
            )}

            <div
              className={`tour360-viewport ${viewMode === 'map' && isCuChi ? 'tour360-viewport--hidden' : ''}`}
              aria-hidden={viewMode === 'map' && isCuChi}
            >
              <VirtualTourViewer
                panoramas={panoramas}
                hotspotsByPanorama={hotspotsByPanorama}
                initialPanoramaId={activePanoramaId}
                activePanoramaId={activePanoramaId}
                onHotspotSelect={onHotspotSelect}
                onPanoramaEnter={onPanoramaEnter}
                onLoadError={onLoadError}
              />
            </div>

            <Tour360Hud
              locationId={locationId}
              panoramas={panoramas}
              activePanorama={activePanorama}
              activePanoramaId={activePanoramaId}
              activeInfoHotspots={activeInfoHotspots}
              viewMode={viewMode}
              immersive={immersive}
              onSelectPanorama={handleSelectPanorama}
              onInfoHotspot={onHotspotSelect}
              onOpenMap={handleOpenMap}
              onToggleImmersive={handleToggleImmersive}
              menuOpen={menuOpen}
              onToggleMenu={() => setMenuOpen((v) => !v)}
            />

            {infoModal && (
              <div
                className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-md bg-black/50"
                onClick={() => setInfoModal(null)}
              >
                <div
                  className="glass-panel w-full max-w-md rounded-xl border border-outline-variant p-md pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {infoModal.imageUrl && (
                    <img
                      src={infoModal.imageUrl}
                      alt={infoModal.title ?? infoModal.label}
                      className="w-full h-40 object-cover rounded-lg mb-md"
                    />
                  )}
                  <h3 className="font-title-md text-primary">{infoModal.title ?? infoModal.label}</h3>
                  <p className="text-sm text-on-surface-variant mt-sm">
                    {infoModal.description ?? 'Thông tin điểm tham quan.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setInfoModal(null)}
                    className="mt-md px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant"
                  >
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
