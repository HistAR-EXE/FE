// src/pages/TimePortalPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { locationsApi, type PhotoPair } from '../features/locations/api'
import { photoScenesApi, type PhotoScene } from '../features/photo-scenes/api'
import { eraDiscoveryKey, recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { showDiscoveryRecordError } from '../features/gamification/discoveryEngagementToast'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { useAuth } from '../shared/auth/useAuth'
import { DualPhotoExport } from '../features/time-portal/DualPhotoExport'
import { TimePortalViewer } from '../features/time-portal/TimePortalViewer'
import { ERA_VALUES, type EraValue } from '../features/time-portal/eraLabels'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { EraLockedModal } from '../components/monetization/EraLockedModal'
import { hasPremiumAccess } from '../shared/access/contentAccess'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useVisitSessionForLocation, useVisitSession } from '../features/visit/VisitSessionProvider'
import { isArEnabledLocation, sceneSlugFromIndex } from '../features/ar/arDeepLink'
import { getArSceneBySlug, getArSceneBySceneId, isCuChiSceneSlug } from '../features/ar/cuChiArScenes'
import { TimePortalArEmbed } from '../features/ar/TimePortalArEmbed'
import type { CuChiSceneSlug } from '../features/ar/types'
import { TimePortalViewSwitch, type PortalViewMode } from '../features/time-portal/TimePortalViewSwitch'

const DISCOVER_KEY_LABELS: Record<string, string> = {
    'era:1948': '1948 — Khởi đầu hầm ngầm',
    'photo:cua-ham': 'Cửa hầm',
    'photo:gieng': 'Giếng nước',
    'hotspot:vent': 'Lỗ thông hơi',
}

function parseEraParam(raw: string | null): EraValue | undefined {
    if (!raw) return undefined
    const n = Number(raw)
    return ERA_VALUES.includes(n as EraValue) ? (n as EraValue) : undefined
}

function sceneIndexForId(scenes: PhotoScene[], sceneId: string | null): number {
    if (!sceneId) return 0
    const idx = scenes.findIndex((s) => s.id === sceneId)
    return idx >= 0 ? idx : 0
}

export function TimePortalPage() {
    const { locationId } = useParams<{ locationId?: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const discoverKeyParam = searchParams.get('discoverKey')
    const questRecordParam = searchParams.get('questRecord')
    const sceneParam = searchParams.get('scene')
    const viewParam = searchParams.get('view')
    const initialEra = parseEraParam(searchParams.get('era'))

    const activeLocationId = locationId ?? CU_CHI_LOCATION_ID
    const portalView: PortalViewMode = viewParam === 'ar' ? 'ar' : 'compare'
    const arAvailable = isArEnabledLocation(activeLocationId)

    const { isAuthenticated, user } = useAuth()
    useVisitSessionForLocation(activeLocationId, isAuthenticated)
    const { getSessionId } = useVisitSession()
    const visitSessionId = getSessionId(activeLocationId)
    const isPremium = hasPremiumAccess(user)

    const [scenes, setScenes] = useState<PhotoScene[]>([])
    const [pairs, setPairs] = useState<PhotoPair[]>([])
    const [index, setIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [eraModalOpen, setEraModalOpen] = useState(false)
    const { showToast } = useToast()
    const { applyEngagement } = useUserProgress()

    const pendingDiscoverKey = useRef<string | null>(discoverKeyParam ?? questRecordParam)
    const skipNextEraRecord = useRef(false)
    useEffect(() => {
        pendingDiscoverKey.current = discoverKeyParam ?? questRecordParam
    }, [discoverKeyParam, questRecordParam])

    const recordEngagement = useCallback(
        (recordKey: string) => {
            if (!isAuthenticated || !recordKey) return
            void recordDiscoveryEngagement({
                recordKey,
                locationId: locationId ?? undefined,
                source: 'time_portal',
                onSuccess: (response) => {
                    notifyEngagementOutcome(response, showToast, applyEngagement, {
                        locationId: locationId ?? activeLocationId,
                        visitSessionId,
                    })
                    void analyticsApi.recordEvent({
                        locationId: locationId ?? activeLocationId,
                        visitSessionId,
                        eventType: 'TIME_PORTAL_ERA_VIEWED',
                        eventKey: recordKey,
                        source: 'time_portal',
                    })
                },
                onError: () => showDiscoveryRecordError(showToast, { role: user?.role }),
            })
        },
        [isAuthenticated, locationId, activeLocationId, showToast, applyEngagement, visitSessionId, user?.role],
    )

    const flushPendingDiscoverKey = useCallback(() => {
        if (!pendingDiscoverKey.current) return false
        const key = pendingDiscoverKey.current
        pendingDiscoverKey.current = null
        skipNextEraRecord.current = true
        recordEngagement(key)
        return true
    }, [recordEngagement])

    const onPortalEngagement = useCallback(() => {
        flushPendingDiscoverKey()
    }, [flushPendingDiscoverKey])

    const onEraChange = useCallback(
        (era: EraValue) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('era', String(era))
                    return next
                },
                { replace: true },
            )
            if (!isAuthenticated) return
            if (skipNextEraRecord.current) {
                skipNextEraRecord.current = false
                return
            }
            if (flushPendingDiscoverKey()) return
            const key = eraDiscoveryKey(era)
            if (key) recordEngagement(key)
        },
        [isAuthenticated, flushPendingDiscoverKey, recordEngagement, setSearchParams],
    )

    const onSceneIndexChange = useCallback(
        (nextIndex: number) => {
            setIndex(nextIndex)
            if (!isAuthenticated) return
            if (flushPendingDiscoverKey()) return
            const scene = scenes[nextIndex]
            if (scene?.unlockKey) recordEngagement(scene.unlockKey)
        },
        [isAuthenticated, scenes, flushPendingDiscoverKey, recordEngagement],
    )

    const openEraPaywall = useCallback(() => {
        if (sessionStorage.getItem('timePortalEraModalDismissed') === '1') return
        setEraModalOpen(true)
    }, [])

    const closeEraPaywall = useCallback(() => {
        sessionStorage.setItem('timePortalEraModalDismissed', '1')
        setEraModalOpen(false)
    }, [])

    useEffect(() => {
        if (!eraModalOpen) return
        void analyticsApi.recordEvent({
            eventType: 'PAYWALL_ERA_LOCKED_VIEW',
            locationId: activeLocationId,
            visitSessionId: visitSessionId ?? undefined,
            source: 'time_portal',
        })
    }, [eraModalOpen, activeLocationId, visitSessionId])

    const onEraUpgradeClick = useCallback(() => {
        void analyticsApi.recordEvent({
            eventType: 'PAYWALL_ERA_UPGRADE_CLICK',
            locationId: activeLocationId,
            visitSessionId: visitSessionId ?? undefined,
            source: 'time_portal',
        })
    }, [activeLocationId, visitSessionId])

    useEffect(() => {
        if (!locationId) return
        const run = async () => {
            try {
                setLoading(true)
                try {
                    const sceneList = await photoScenesApi.byLocation(locationId)
                    if (sceneList.length > 0) {
                        setScenes(sceneList)
                        setPairs([])
                        setIndex(sceneIndexForId(sceneList, sceneParam))
                        return
                    }
                } catch {
                    /* fallback */
                }
                setScenes([])
                setPairs(await locationsApi.getPhotoPairs(locationId))
            } catch (e) {
                showToast({
                    message: e instanceof ApiError ? e.message : 'Không tải được dữ liệu cổng thời gian.',
                    type: 'error',
                })
                setScenes([])
                setPairs([])
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [locationId, sceneParam, showToast])

    const exportUrls = useMemo(() => {
        const scene = scenes[index]
        const pair = pairs[index]
        if (scene?.layers?.length) {
            const past = scene.layers.find((l) => l.era === 1968) ?? scene.layers[0]
            const present = scene.layers.find((l) => l.era === 2026) ?? scene.layers[scene.layers.length - 1]
            return { left: past?.imageUrl ?? '', right: present?.imageUrl ?? '' }
        }
        if (pair) {
            return { left: pair.historicalImage, right: pair.currentImage }
        }
        return { left: '', right: '' }
    }, [scenes, pairs, index])

    const hasContent = scenes.length > 0 || pairs.length > 0

    const arSceneSlug = useMemo((): CuChiSceneSlug => {
        const raw = searchParams.get('scene')
        if (isCuChiSceneSlug(raw)) return raw
        if (raw) {
            const mapped = getArSceneBySceneId(raw)
            if (mapped) return mapped.slug
        }
        return sceneSlugFromIndex(scenes[index]?.id, index)
    }, [searchParams, scenes, index])

    const arEra: EraValue = initialEra ?? 1968

    const setPortalViewMode = useCallback(
        (view: PortalViewMode) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    if (view === 'ar') next.set('view', 'ar')
                    else next.delete('view')
                    return next
                },
                { replace: true },
            )
        },
        [setSearchParams],
    )

    const onArSceneSlugChange = useCallback(
        (slug: CuChiSceneSlug) => {
            const cfg = getArSceneBySlug(slug)
            const idx = scenes.findIndex((s) => s.id === cfg.sceneId)
            if (idx >= 0) setIndex(idx)
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('scene', slug)
                    next.set('view', 'ar')
                    return next
                },
                { replace: true },
            )
        },
        [scenes, setSearchParams],
    )

    const onArEraChange = useCallback(
        (era: EraValue) => {
            onEraChange(era)
        },
        [onEraChange],
    )

    const discoverBanner =
        discoverKeyParam && DISCOVER_KEY_LABELS[discoverKeyParam]
            ? DISCOVER_KEY_LABELS[discoverKeyParam]
            : discoverKeyParam

    return (
        <AppLayout
            activeBorder="left"
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Cổng thời gian"
        >
            <main
                className={`flex-1 flex flex-col relative mt-14 md:mt-0 ${
                    portalView === 'ar'
                        ? 'h-[calc(100dvh-3.5rem)] md:h-screen pb-0'
                        : 'h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] pb-16 md:pb-0'
                }`}
            >
                <header
                    className={`bg-surface/70 backdrop-blur-xl border-b border-outline-variant items-center justify-between h-14 md:h-16 px-xl z-40 shrink-0 ${
                        portalView === 'ar' ? 'hidden' : 'hidden md:flex'
                    }`}
                >
                    <div className="flex items-center gap-md min-w-0">
                        <Link to={locationId ? `/explore/${locationId}` : '/explore'} className="text-on-surface-variant hover:text-secondary flex items-center gap-xs">
                            <MaterialIcon name="arrow_back" /> Quay lại
                        </Link>
                        <h1 className="font-headline-lg font-bold text-on-surface">Cổng thời gian</h1>
                        <TimePortalViewSwitch mode={portalView} onChange={setPortalViewMode} arAvailable={arAvailable} />
                    </div>
                    {exportUrls.left && exportUrls.right && portalView === 'compare' && (
                        <DualPhotoExport leftImageUrl={exportUrls.left} rightImageUrl={exportUrls.right} />
                    )}
                </header>

                <section className="relative flex-1 bg-surface-container-lowest overflow-hidden">
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,rgba(242,191,80,0.3),transparent_60%)]" />

                    {arAvailable && hasContent && !loading && (
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 z-40 ${
                                portalView === 'ar' ? 'top-3 md:top-4' : 'top-3 md:hidden'
                            }`}
                        >
                            <TimePortalViewSwitch mode={portalView} onChange={setPortalViewMode} arAvailable={arAvailable} />
                        </div>
                    )}

                    {portalView === 'ar' && arAvailable && hasContent && !loading && (
                        <div className="absolute top-3 left-3 z-40 hidden md:block">
                            <Link
                                to={locationId ? `/explore/${locationId}` : '/explore'}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 text-on-surface/90 text-sm backdrop-blur-sm hover:border-secondary/40"
                            >
                                <MaterialIcon name="arrow_back" className="text-base" />
                                Quay lại
                            </Link>
                        </div>
                    )}

                    {discoverKeyParam && isAuthenticated && !loading && portalView === 'compare' && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[92%] bg-surface/90 border border-secondary/40 rounded-xl px-4 py-2 text-sm text-secondary text-center">
                            <p>Khám phá: {discoverBanner}</p>
                            <p className="text-xs text-on-surface-variant mt-1">
                                Kéo thanh hoặc chọn mốc thời gian để ghi nhận tiến độ
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-md p-lg">
                            <div className="w-full max-w-xl h-64 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
                            <p className="text-on-surface-variant text-sm">Đang tải ảnh lịch sử...</p>
                        </div>
                    )}

                    {!locationId && <p className="p-lg text-on-surface-variant">Thiếu locationId. Hãy mở từ màn chi tiết địa điểm.</p>}
                    {!hasContent && !loading && <p className="p-lg text-on-surface-variant">Không có ảnh lịch sử cho địa điểm này.</p>}

                    {hasContent && !loading && portalView === 'compare' && (
                        <TimePortalViewer
                            scenes={scenes.length ? scenes : undefined}
                            pairs={pairs.length ? pairs : undefined}
                            sceneIndex={index}
                            onSceneIndexChange={onSceneIndexChange}
                            onEraChange={onEraChange}
                            onEngagement={onPortalEngagement}
                            initialEra={initialEra}
                            isPremium={isPremium}
                            onPremiumRequired={openEraPaywall}
                        />
                    )}

                    {hasContent && !loading && portalView === 'ar' && arAvailable && (
                        <TimePortalArEmbed
                            locationId={activeLocationId}
                            sceneSlug={arSceneSlug}
                            era={arEra}
                            onSceneSlugChange={onArSceneSlugChange}
                            onEraChange={onArEraChange}
                            discoverKey={discoverKeyParam ?? questRecordParam}
                        />
                    )}

                    {exportUrls.left && exportUrls.right && portalView === 'compare' && (
                        <div className="md:hidden absolute bottom-20 right-md z-30">
                            <DualPhotoExport leftImageUrl={exportUrls.left} rightImageUrl={exportUrls.right} />
                        </div>
                    )}
                </section>
            </main>
            <EraLockedModal
                open={eraModalOpen}
                onClose={closeEraPaywall}
                onUpgradeClick={onEraUpgradeClick}
                eraLabel={1948}
                xpBonus={50}
                pricingHref={`/pricing?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`}
            />
        </AppLayout>
    )
}