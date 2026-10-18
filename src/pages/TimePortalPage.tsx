import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { EraLockedModal } from '../components/monetization/EraLockedModal'
import { TimePortalViewer } from '../features/time-portal/TimePortalViewer'
import { TimelineExplorerView } from '../features/time-portal/TimelineExplorerView'
import { ERA_VALUES, type EraValue } from '../features/time-portal/eraLabels'
const TunnelScene3D = lazy(() =>
  import('../features/time-portal/TunnelScene3D').then((m) => ({ default: m.TunnelScene3D }))
)
import { photoScenesApi, type PhotoScene } from '../features/photo-scenes/api'
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { hasPremiumAccess } from '../shared/access/contentAccess'
import { useAuth } from '../shared/auth/useAuth'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { useToast } from '../shared/ui/toast/useToast'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'

function parseEra(raw: string | null): EraValue {
  const value = Number(raw)
  return ERA_VALUES.includes(value as EraValue) ? (value as EraValue) : 2026
}

function isPremiumEra(era: EraValue): boolean {
  return era === 1948 || era === 1968 || era === 1975
}

type PortalMode = 'timeline' | 'compare' | '3d'

export function TimePortalPage() {
  const { locationId: locationParam } = useParams<{ locationId?: string }>()
  const [params] = useSearchParams()
  const locationId = locationParam ?? CU_CHI_LOCATION_ID
  const { user, isAuthenticated } = useAuth()
  const premium = hasPremiumAccess(user)
  const requestedEra = parseEra(params.get('era'))
  const questRecord = params.get('questRecord')
  const initialView = params.get('view')

  const [mode, setMode] = useState<PortalMode>(initialView === 'compare' ? 'compare' : 'timeline')
  const [scenes, setScenes] = useState<PhotoScene[]>([])
  const [scenesLoading, setScenesLoading] = useState(true)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [era, setEra] = useState<EraValue>(premium || !isPremiumEra(requestedEra) ? requestedEra : 2026)
  const [paywallOpen, setPaywallOpen] = useState(!premium && isPremiumEra(requestedEra))
  const [paywallEra, setPaywallEra] = useState<EraValue>(isPremiumEra(requestedEra) ? requestedEra : 1948)
  const { showToast } = useToast()
  const { applyEngagement } = useUserProgress()
  const recordedEra = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setScenesLoading(true)
    photoScenesApi
      .byLocation(locationId)
      .then((list) => {
        if (!cancelled) setScenes(list)
      })
      .catch(() => {
        if (!cancelled) setScenes([])
      })
      .finally(() => {
        if (!cancelled) setScenesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locationId])

  useEffect(() => {
    if (!isAuthenticated || !premium || !isPremiumEra(era)) return
    if (questRecord !== `era:${era}`) return
    if (recordedEra.current === questRecord) return
    recordedEra.current = questRecord
    void recordDiscoveryEngagement({
      recordKey: `era:${era}`,
      locationId,
      source: 'time_portal',
      onSuccess: (response) => notifyEngagementOutcome(response, showToast, applyEngagement, { locationId }),
      onError: () => {
        recordedEra.current = null
      },
    })
  }, [applyEngagement, era, isAuthenticated, locationId, premium, questRecord, showToast])

  const requirePremium = (next: EraValue) => {
    setPaywallEra(next)
    setPaywallOpen(true)
    void analyticsApi.recordEvent({
      eventType: 'PAYWALL_ERA_LOCKED_VIEW',
      locationId,
      source: 'time_portal',
      eventKey: String(next),
    })
  }

  const onPaywallUpgrade = () => {
    void analyticsApi.recordEvent({
      eventType: 'PAYWALL_ERA_UPGRADE_CLICK',
      locationId,
      source: 'time_portal',
      eventKey: String(paywallEra),
    })
  }

  return (
    <AppLayout
      activeBorder="left"
      mobileBackTo={`/explore/${locationId}`}
      mobileTitle="Cổng thời gian"
    >
      <main className="mt-14 flex h-[calc(100dvh-3.5rem)] flex-col md:mt-0 md:h-screen">
        {mode === 'timeline' ? (
          <TimelineExplorerView
            initialEra={era}
            isPremium={premium}
            onPremiumRequired={requirePremium}
            onSwitchToCompare={() => setMode('compare')}
            onSwitchTo3D={() => setMode('3d')}
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
              <TunnelScene3D era={era} className="h-full" />
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
                Kéo để xoay · Cuộn để zoom
              </p>
            </div>
          </div>
        ) : scenesLoading ? (
          <div className="flex flex-1 items-center justify-center bg-surface text-sm text-on-surface-variant" role="status" aria-live="polite">
            Đang tải ảnh lịch sử...
          </div>
        ) : (
          <div className="relative flex-1 min-h-0">
            <TimePortalViewer
              scenes={scenes}
              sceneIndex={sceneIndex}
              onSceneIndexChange={setSceneIndex}
              initialEra={era}
              isPremium={premium}
              onPremiumRequired={(next) => requirePremium(next)}
              onEraChange={(next) => {
                if (!premium && isPremiumEra(next)) {
                  requirePremium(next)
                  return
                }
                setEra(next)
              }}
            />

            {/* Switch back to timeline mode */}
            <button
              type="button"
              onClick={() => setMode('timeline')}
              className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full bg-black/50 border border-white/20 text-xs text-white/80 backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-outlined text-base">timeline</span>
              <span className="hidden sm:inline">Dòng thời gian</span>
            </button>
          </div>
        )}
      </main>
      <EraLockedModal
        open={paywallOpen}
        eraLabel={paywallEra}
        onClose={() => setPaywallOpen(false)}
        pricingHref={`/pricing?next=${encodeURIComponent(`/time-portal/${locationId}?era=${paywallEra}`)}`}
        onUpgradeClick={onPaywallUpgrade}
      />
    </AppLayout>
  )
}
