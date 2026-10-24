import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { EraLockedModal } from '../components/monetization/EraLockedModal'
import { usePortalAudio } from '../features/time-portal/timeline/usePortalAudio'
import { PortalAudioControls } from '../features/time-portal/timeline/PortalAudioControls'
import { TimelineExplorerView } from '../features/time-portal/TimelineExplorerView'
import { XuaNayView } from '../features/time-portal/xuaNay/XuaNayView'
import { isXuaNaySpot, type XuaNaySpotId } from '../features/time-portal/xuaNay/xuaNayData'
import { ERA_VALUES, resolvePortalEra, type EraValue } from '../features/time-portal/eraLabels'
import { hasTimePortalContent } from '../features/time-portal/availability'
import { TimePortalComingSoon } from '../features/time-portal/TimePortalComingSoon'
const TunnelScene3D = lazy(() =>
  import('../features/time-portal/TunnelScene3D').then((m) => ({ default: m.TunnelScene3D }))
)
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { hasPremiumAccess } from '../shared/access/contentAccess'
import { useAuth } from '../shared/auth/useAuth'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { useToast } from '../shared/ui/toast/useToast'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { resolveLocationParam, shouldCanonicalizeLocationParam, timePortalPath } from '../shared/config/locationSlug'
import { resolveInitialPortalMode, type PortalMode } from '../features/time-portal/portalNavigation'
import { buildHeritageRolePhotoFramePath } from '../features/heritage-studio/heritageRoleSources'
import type { HeritageStationCode } from '../features/heritage-studio/types'

function isPremiumEra(era: EraValue): boolean {
  return era === 1948 || era === 1968 || era === 1975
}

export function TimePortalPage() {
  const { locationId: locationParam } = useParams<{ locationId?: string }>()
  const [params] = useSearchParams()
  const routerLocation = useLocation()
  const navigate = useNavigate()
  // Nhận cả slug (/time-portal/dia-dao-cu-chi) lẫn UUID (link cũ); không có tham số thì mặc định Củ Chi.
  const locationId = locationParam ? resolveLocationParam(locationParam) : CU_CHI_LOCATION_ID
  const { user, isAuthenticated } = useAuth()
  const premium = hasPremiumAccess(user)
  const requestedEra = resolvePortalEra(params.get('era'))
  const initialView = params.get('view')
  const initialSpot = params.get('spot')
  const focusTarget = requestedEra === 1968 ? params.get('focus') ?? undefined : undefined

  const [mode, setMode] = useState<PortalMode>(() => resolveInitialPortalMode(initialView))
  const [spot, setSpot] = useState<XuaNaySpotId>(isXuaNaySpot(initialSpot) ? initialSpot : 'bep-hoang-cam')
  /** Khoảnh khắc đang xem khi rời Dòng thời gian — để quay lại đúng chỗ. */
  const [returnMoment, setReturnMoment] = useState<string | undefined>(undefined)
  const [era, setEra] = useState<EraValue>(premium || !isPremiumEra(requestedEra) ? requestedEra : 2026)
  const [paywallOpen, setPaywallOpen] = useState(!premium && isPremiumEra(requestedEra))
  const [paywallEra, setPaywallEra] = useState<EraValue>(isPremiumEra(requestedEra) ? requestedEra : 1948)
  const { showToast } = useToast()
  const { applyEngagement } = useUserProgress()
  const recordedKeys = useRef(new Set<string>())
  const ready = hasTimePortalContent(locationId)
  const audio = usePortalAudio(ready)
  const [pageHidden, setPageHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (!audio.ready) return
    if (mode !== 'timeline') {
      audio.segment(`portal-${mode}`, '')
      audio.setPaused(pageHidden || paywallOpen)
    } else if (paywallOpen) {
      audio.setPaused(true)
    }
  }, [audio.ready, audio.segment, audio.setPaused, mode, pageHidden, paywallOpen])

  /**
   * Ghi nhận bước nhiệm vụ khi người dùng thật sự xem nội dung:
   * `era:<năm>` khi xem hết một chương Dòng thời gian, `xuanay:<điểm>` khi tự kéo so sánh Xưa & Nay.
   * BE vẫn chặn 1948/1968 nếu tài khoản không có Premium.
   */
  const recordViewed = useCallback(
    (recordKey: string) => {
      if (!isAuthenticated || !locationId || recordedKeys.current.has(recordKey)) return
      recordedKeys.current.add(recordKey)
      void recordDiscoveryEngagement({
        recordKey,
        locationId,
        source: 'time_portal',
        onSuccess: (response) => notifyEngagementOutcome(response, showToast, applyEngagement, { locationId }),
        onError: () => {
          recordedKeys.current.delete(recordKey)
        },
      })
    },
    [applyEngagement, isAuthenticated, locationId, showToast],
  )

  const requirePremium = (next: EraValue) => {
    setPaywallEra(next)
    setPaywallOpen(true)
    void analyticsApi.recordEvent({
      eventType: 'PAYWALL_ERA_LOCKED_VIEW',
      locationId: locationId ?? undefined,
      source: 'time_portal',
      eventKey: String(next),
    })
  }

  const onPaywallUpgrade = () => {
    void analyticsApi.recordEvent({
      eventType: 'PAYWALL_ERA_UPGRADE_CLICK',
      locationId: locationId ?? undefined,
      source: 'time_portal',
      eventKey: String(paywallEra),
    })
  }

  if (initialView === 'ar') return <Navigate replace to="/ar-experience" />

  // Link cũ dùng UUID → chuyển sang đường dẫn đẹp, giữ nguyên query.
  if (locationId && shouldCanonicalizeLocationParam(locationParam)) {
    return <Navigate replace to={timePortalPath(locationId, routerLocation.search)} />
  }

  return (
    <AppLayout
      activeBorder="left"
      mobileBackTo={'/explore'}
      mobileTitle="Cổng thời gian"
    >
      <main className="mt-14 flex h-[calc(100dvh-7.5rem)] flex-col md:mt-0 md:h-screen">
        {!ready ? (
          <TimePortalComingSoon locationId={locationId} />
        ) : mode === 'timeline' ? (
          <TimelineExplorerView
            audio={audio}
            suspended={paywallOpen || pageHidden}
            initialEra={era}
            initialMomentId={returnMoment}
            isPremium={premium}
            onPremiumRequired={requirePremium}
            onSwitchTo3D={() => {
              setReturnMoment(undefined)
              setMode('3d')
            }}
            onOpenXuaNay={(next, momentId) => {
              setSpot(next)
              setReturnMoment(momentId)
              setMode('xua-nay')
            }}
            onEraChange={setEra}
            onChapterFinished={(finished) => recordViewed(`era:${finished}`)}
          />
        ) : mode === '3d' ? (
          <div className="relative flex-1 min-h-0 bg-gradient-to-b from-sky-900 via-sky-800 to-amber-900">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-white/60">
                  Đang tải mô hình 3D...
                </div>
              }
            >
              <TunnelScene3D
                era={era}
                focusTarget={focusTarget}
                locationId={locationId ?? CU_CHI_LOCATION_ID}
                onHeritageRoleOpen={(stationCode) => {
                  navigate(
                    buildHeritageRolePhotoFramePath(
                      stationCode as HeritageStationCode,
                      locationId ?? CU_CHI_LOCATION_ID,
                    ),
                  )
                }}
                className="h-full"
              />
            </Suspense>

            {/* Era selector for 3D mode */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-4 py-2 border border-white/20">
              {ERA_VALUES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    if (!premium && isPremiumEra(e)) {
                      requirePremium(e)
                      return
                    }
                    setEra(e)
                  }}
                  className={`px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-all ${
                    era === e
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {e === 2026 ? 'Hiện nay' : e}
                </button>
              ))}
            </div>

            {/* Back to timeline */}
            <button
              type="button"
              onClick={() => setMode('timeline')}
              className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full bg-black/50 border border-white/20 text-xs text-white/80 backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Dòng thời gian
            </button>

            {/* 3D controls hint */}
            <div className="absolute top-4 right-4 z-20 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-2 border border-white/10">
              <p className="text-[10px] text-white/50 leading-relaxed">
                Kéo để xoay · Cuộn để zoom · Chuột phải để di chuyển
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex-1 min-h-0">
            <XuaNayView
              spot={spot}
              onSpotChange={setSpot}
              onBack={() => setMode('timeline')}
              audioNotice={audio.blocked ? <PortalAudioControls audio={audio} className="w-full" /> : undefined}
              onSpotViewed={(viewed) => recordViewed(`xuanay:${viewed}`)}
            />
          </div>
        )}
      </main>
      <EraLockedModal
        open={paywallOpen}
        eraLabel={paywallEra}
        onClose={() => setPaywallOpen(false)}
        pricingHref={`/pricing?next=${encodeURIComponent(timePortalPath(locationId ?? CU_CHI_LOCATION_ID, { era: String(paywallEra) }))}`}
        onUpgradeClick={onPaywallUpgrade}
      />
    </AppLayout>
  )
}
