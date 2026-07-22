// src/pages/Tour360Page.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { VirtualTourViewer } from '../components/panorama/VirtualTourViewer'
import { CuChiTourLeafletMap } from '../components/panorama/CuChiTourLeafletMap'
import { CuChiIllustratedMap } from '../components/panorama/CuChiIllustratedMap'
import { Tour360Hud } from '../components/panorama/Tour360Hud'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { panoramaApi, type Hotspot, type Panorama } from '../features/panorama/api'
import { resolveAreaSlug } from '../features/panorama/cuChiAreaMeta'
import { buildLinkJsonSnippet, fallbackCopyText } from '../features/panorama/tour360Markers'
import { recordDiscoveryEngagement, preloadDiscoveryBindings } from '../features/gamification/discoveryRouting'
import { showDiscoveryRecordError } from '../features/gamification/discoveryEngagementToast'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { useAuth } from '../shared/auth/useAuth'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { appEnv } from '../shared/config/env'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useVisitSessionForLocation, useVisitSession } from '../features/visit/VisitSessionProvider'

// ĐÃ SỬA THÀNH ĐIỂM SỐ 1 (Bãi gửi xe gắn máy số 1 / Cổng vào)
const CU_CHI_ENTRANCE_ID = '22222222-2222-2222-2222-222222222221'

type TourViewMode = 'illustrated' | 'map' | 'panorama'

export function Tour360Page() {
    const { locationId } = useParams<{ locationId?: string }>()
    const [searchParams] = useSearchParams()
    const panoramaParam = searchParams.get('panorama')
    const calibrateMode = searchParams.get('calibrate') === '1'
    const { isAuthenticated, user } = useAuth()
    const activeLocationId = locationId ?? CU_CHI_LOCATION_ID
    const isCuChi = activeLocationId === CU_CHI_LOCATION_ID
    useVisitSessionForLocation(activeLocationId, isAuthenticated)
    const { getSessionId } = useVisitSession()
    const visitSessionId = getSessionId(activeLocationId)

    const [panoramas, setPanoramas] = useState<Panorama[]>([])
    const [hotspotsByPanorama, setHotspotsByPanorama] = useState<Record<string, Hotspot[]>>({})
    const [activePanoramaId, setActivePanoramaId] = useState<string | null>(panoramaParam)
    const [viewMode, setViewMode] = useState<TourViewMode>(
        isCuChi && !panoramaParam ? 'illustrated' : 'panorama',
    )
    const [infoModal, setInfoModal] = useState<Hotspot | null>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [immersive, setImmersive] = useState(false)
    const [layoutRevision, setLayoutRevision] = useState(0)
    const [calibratePoint, setCalibratePoint] = useState<{ yaw: number; pitch: number } | null>(null)
    const [copyStatus, setCopyStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const { showToast } = useToast()
    const { applyEngagement } = useUserProgress()

    const recordedScenes = useRef(new Set<string>())
    const dwellTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
    const hotspotDwellTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    const recordScene = useCallback(
        (panoramaId: string) => {
            if (!isAuthenticated || recordedScenes.current.has(panoramaId)) return
            recordedScenes.current.add(panoramaId)
            void recordDiscoveryEngagement({
                recordKey: `scene:${panoramaId}`,
                locationId: locationId ?? CU_CHI_LOCATION_ID,
                source: 'tour_panorama',
                onSuccess: (response) => {
                    notifyEngagementOutcome(response, showToast, applyEngagement, {
                        locationId: locationId ?? CU_CHI_LOCATION_ID,
                        visitSessionId,
                    })
                    void analyticsApi.recordEvent({
                        locationId: locationId ?? CU_CHI_LOCATION_ID,
                        visitSessionId,
                        eventType: 'TOUR_SCENE_VIEWED',
                        eventKey: `scene:${panoramaId}`,
                        source: 'tour_panorama',
                    })
                },
                onError: () => showDiscoveryRecordError(showToast, { role: user?.role }),
            })
        },
        [isAuthenticated, locationId, showToast, applyEngagement, user?.role, visitSessionId],
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
        if (!locationId || !isAuthenticated) return
        void preloadDiscoveryBindings(locationId)
    }, [locationId, isAuthenticated])

    useEffect(() => {
        if (!locationId) return

        const run = async () => {
            try {
                setLoading(true)
                const list = await panoramaApi.byLocation(locationId)
                let merged = list
                if (panoramaParam && !list.some((p) => p.id === panoramaParam)) {
                    try {
                        const single = await panoramaApi.getById(panoramaParam)
                        merged = [...list, single]
                    } catch {
                        // ignore fallback
                    }
                }
                setPanoramas(merged)

                const hotspotEntries = await Promise.all(
                    merged.map(async (panorama) => {
                        const hotspots = await panoramaApi.hotspotsByPanorama(panorama.id)
                        return [panorama.id, hotspots] as const
                    }),
                )
                setHotspotsByPanorama(Object.fromEntries(hotspotEntries))

                const preferred =
                    panoramaParam && merged.some((p) => p.id === panoramaParam)
                        ? panoramaParam
                        : (merged.find((p) => p.id === CU_CHI_ENTRANCE_ID)?.id ?? merged[0]?.id ?? null)
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
                if (!isAuthenticated || !hotspot.unlockKey) return

                const recordKey = hotspot.unlockKey
                const existing = hotspotDwellTimers.current.get(recordKey)
                if (existing) clearTimeout(existing)

                const recordHotspot = () => {
                    hotspotDwellTimers.current.delete(recordKey)
                    void recordDiscoveryEngagement({
                        recordKey,
                        locationId: locationId ?? CU_CHI_LOCATION_ID,
                        source: 'hotspot_info',
                        onSuccess: (response) =>
                            notifyEngagementOutcome(response, showToast, applyEngagement, {
                                locationId: locationId ?? CU_CHI_LOCATION_ID,
                                visitSessionId,
                            }),
                        onError: () => showDiscoveryRecordError(showToast, { role: user?.role }),
                    })
                }

                const dwellMs = appEnv.hotspotDwellMs
                if (dwellMs > 0) {
                    const timer = setTimeout(recordHotspot, dwellMs)
                    hotspotDwellTimers.current.set(recordKey, timer)
                } else {
                    recordHotspot()
                }
            }
        },
        [isAuthenticated, locationId, showToast, applyEngagement, visitSessionId, user?.role],
    )

    const closeInfoModal = useCallback(() => {
        setInfoModal(null)
        hotspotDwellTimers.current.forEach((timer) => clearTimeout(timer))
        hotspotDwellTimers.current.clear()
    }, [])

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
        setViewMode(isCuChi ? 'illustrated' : 'map')
        setMenuOpen(false)
    }, [isCuChi])

    useEffect(() => {
        if (viewMode === 'panorama') {
            setLayoutRevision((n) => n + 1)
        }
    }, [viewMode])

    const isMapMode = viewMode === 'illustrated' || viewMode === 'map'

    const handleToggleImmersive = useCallback(() => {
        setImmersive((v) => !v)
        setLayoutRevision((n) => n + 1)
    }, [])

    const onCalibrateClick = useCallback((yaw: number, pitch: number) => {
        setCalibratePoint({ yaw, pitch })
        setCopyStatus(null)
        console.log('[tour360-calibrate]', { panoramaId: activePanoramaId, yaw, pitch })
    }, [activePanoramaId])

    const handleCopyCalibrateJson = useCallback(() => {
        if (!calibratePoint || !activePanoramaId) return
        const areaSlug = resolveAreaSlug(
            activePanoramaId,
            activePanorama?.areaSlug,
        )
        const snippet = buildLinkJsonSnippet({
            from: activePanoramaId,
            to: '<target-panorama-uuid>',
            markerStyle: calibratePoint.pitch <= -0.3 ? 'far' : 'near',
            yaw: Number(calibratePoint.yaw.toFixed(4)),
            pitch: Number(calibratePoint.pitch.toFixed(4)),
            label: `→ ${areaSlug}`,
        })
        const copy = async () => {
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(snippet)
                    setCopyStatus('Đã copy JSON vào clipboard')
                    return
                }
            } catch {
                // Safari / insecure context fallback below
            }
            const ok = fallbackCopyText(snippet)
            setCopyStatus(ok ? 'Đã copy (fallback)' : 'Copy thất bại — xem console')
            console.log(snippet)
        }
        void copy()
    }, [calibratePoint, activePanoramaId, activePanorama?.areaSlug])

    return (
        <AppLayout
            activeBorder="left"
            hideSideNav={immersive}
            hideMobileChrome={immersive}
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Tour 360°"
            className={immersive ? 'tour360-layout tour360-layout--immersive' : 'tour360-layout'}
        >
            <main className={`tour360-main bg-[#0f1015] ${immersive ? '' : 'tour360-main--with-nav'}`}>

                {!immersive && !loading && panoramas.length > 0 && isCuChi && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#161824]/95 border border-white/15 p-1.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                        <button
                            type="button"
                            onClick={() => setViewMode('illustrated')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                                viewMode === 'illustrated'
                                    ? 'bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black shadow-md scale-105'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <MaterialIcon name="map" className="text-base" />
                            <span>Sơ Đồ Bản Vẽ</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                                viewMode === 'map'
                                    ? 'bg-gradient-to-r from-[#388cf1] to-cyan-400 text-white shadow-md scale-105'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <MaterialIcon name="satellite_alt" className="text-base" />
                            <span>Bản Đồ Vệ Tinh</span>
                        </button>

                        {viewMode !== 'panorama' && activePanorama && (
                            <button
                                type="button"
                                onClick={() => setViewMode('panorama')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer ml-1 animate-pulse"
                            >
                                <MaterialIcon name="360" className="text-base animate-spin" />
                                <span>Vào Khung Gian 360°</span>
                            </button>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="tour360-loading">
                        <div className="tour360-loading__pulse" />
                        <p className="text-sm font-bold text-gray-400 mt-3 animate-pulse">Đang số hóa không gian 360° độ phân giải cao...</p>
                    </div>
                )}

                {!loading && panoramas.length === 0 && (
                    <p className="tour360-empty text-gray-400">Chưa có dữ liệu tham quan 360° cho địa điểm này.</p>
                )}

                {!loading && panoramas.length > 0 && locationId && (
                    <>
                        {isCuChi && viewMode === 'illustrated' && (
                            <div className="tour360-viewport">
                                <CuChiIllustratedMap
                                    panoramas={panoramas}
                                    activePanoramaId={activePanoramaId}
                                    onSelectPanorama={handleSelectPanorama}
                                />
                            </div>
                        )}

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
                            className={`tour360-viewport ${isMapMode && isCuChi ? 'tour360-viewport--hidden' : ''}`}
                            aria-hidden={isMapMode && isCuChi}
                        >
                            <VirtualTourViewer
                                panoramas={panoramas}
                                hotspotsByPanorama={hotspotsByPanorama}
                                initialPanoramaId={panoramaParam ?? activePanoramaId}
                                activePanoramaId={activePanoramaId}
                                layoutRevision={layoutRevision}
                                calibrateMode={calibrateMode}
                                onCalibrateClick={onCalibrateClick}
                                onHotspotSelect={onHotspotSelect}
                                onPanoramaEnter={onPanoramaEnter}
                                onLoadError={onLoadError}
                            />
                        </div>

                        {calibrateMode && viewMode === 'panorama' && (
                            <div className="tour360-calibrate-panel" role="status">
                                <p className="font-black text-[#fe951c] text-[10px] uppercase tracking-widest">
                                    Chế độ calibration
                                </p>
                                <p className="text-gray-300 mt-1">
                                    Click vào lối đi trong ảnh để lấy yaw/pitch. Paste JSON vào{' '}
                                    <code className="text-[#fdb438]">docs/cu-chi-tour-manifest.json</code> rồi chạy pipeline sql.
                                </p>
                                {calibratePoint ? (
                                    <div className="tour360-calibrate-panel__row">
                                        <code className="text-[11px] text-gray-200">
                                            yaw {calibratePoint.yaw.toFixed(3)} · pitch {calibratePoint.pitch.toFixed(3)}
                                        </code>
                                        <button type="button" onClick={handleCopyCalibrateJson}>
                                            Copy JSON
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 mt-2 text-[11px]">Chưa có điểm — click panorama</p>
                                )}
                                {copyStatus && (
                                    <p className="text-emerald-400 text-[11px] mt-2 font-semibold">{copyStatus}</p>
                                )}
                            </div>
                        )}

                        <Tour360Hud
                            locationId={locationId}
                            panoramas={panoramas}
                            activePanorama={activePanorama}
                            activePanoramaId={activePanoramaId}
                            activeInfoHotspots={activeInfoHotspots}
                            viewMode={viewMode === 'panorama' ? 'panorama' : 'map'}
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
                                className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
                                onClick={closeInfoModal}
                            >
                                <div
                                    className="w-full max-w-md rounded-3xl border border-white/20 bg-[#161824] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] pointer-events-auto text-left space-y-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {infoModal.imageUrl && (
                                        <div className="h-44 w-full rounded-2xl overflow-hidden relative">
                                            <img
                                                src={infoModal.imageUrl}
                                                alt={infoModal.title ?? infoModal.label}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-transparent to-transparent" />
                                        </div>
                                    )}
                                    <div>
                    <span className="text-[10px] font-black text-[#fe951c] uppercase tracking-widest">
                      ✦ CHI TIẾT ĐIỂM CHẠM 360°
                    </span>
                                        <h3 className="text-xl font-black text-white mt-1">{infoModal.title ?? infoModal.label}</h3>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
                                        {infoModal.description ?? 'Thông tin chi tiết về hiện vật và kiến trúc tại vị trí này.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={closeInfoModal}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                                    >
                                        Đã Hiểu & Tiếp Tục Tham Quan
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