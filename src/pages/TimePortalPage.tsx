import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { EraLockedModal } from '../components/monetization/EraLockedModal'
import { TimePortalViewer } from '../features/time-portal/TimePortalViewer'
import { ERA_VALUES, type EraValue } from '../features/time-portal/eraLabels'
import { photoScenesApi, type PhotoScene } from '../features/photo-scenes/api'
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { hasPremiumAccess } from '../shared/access/contentAccess'
import { useAuth } from '../shared/auth/useAuth'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { useToast } from '../shared/ui/toast/useToast'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { TimePortalArEmbed } from '../features/ar/TimePortalArEmbed'
import { isCuChiSceneSlug } from '../features/ar/cuChiArScenes'
import type { ARMode, CuChiSceneSlug } from '../features/ar/types'

function parseEra(raw: string | null): EraValue {
  const value = Number(raw)
  return ERA_VALUES.includes(value as EraValue) ? (value as EraValue) : 2026
}

function isPremiumEra(era: EraValue): boolean {
  return era === 1948 || era === 1968
}

export function TimePortalPage() {
  const { locationId: locationParam } = useParams<{ locationId?: string }>()
  const [params] = useSearchParams()
  const locationId = locationParam ?? CU_CHI_LOCATION_ID
  const { user, isAuthenticated } = useAuth()
  const premium = hasPremiumAccess(user)
  const requestedEra = parseEra(params.get('era'))
  const arView = params.get('view') === 'ar' && locationId === CU_CHI_LOCATION_ID
  const requestedArMode: ARMode = params.get('mode') === 'sim' ? 'sim' : 'webcam'
  const requestedScene = params.get('scene')
  const questRecord = params.get('questRecord')
  const [scenes, setScenes] = useState<PhotoScene[]>([])
  const [scenesLoading, setScenesLoading] = useState(true)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [era, setEra] = useState<EraValue>(premium || !isPremiumEra(requestedEra) ? requestedEra : 2026)
  const [paywallOpen, setPaywallOpen] = useState(!premium && isPremiumEra(requestedEra))
  const [paywallEra, setPaywallEra] = useState<EraValue>(isPremiumEra(requestedEra) ? requestedEra : 1948)
  const [arScene, setArScene] = useState<CuChiSceneSlug>(
    isCuChiSceneSlug(requestedScene) ? requestedScene : 'cua-ham',
  )
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
        {scenesLoading && !arView ? (
          <div className="flex flex-1 items-center justify-center bg-surface text-sm text-on-surface-variant" role="status" aria-live="polite">
            Đang tải ảnh lịch sử...
          </div>
        ) : arView ? (
          <div className="relative flex-1 bg-black" data-testid="time-portal-ar">
            <TimePortalArEmbed
              locationId={locationId}
              sceneSlug={arScene}
              era={era}
              initialMode={requestedArMode}
              onSceneSlugChange={setArScene}
              onEraChange={(next) => {
                if (!premium && isPremiumEra(next)) {
                  requirePremium(next)
                  return
                }
                setEra(next)
              }}
            />
          </div>
        ) : (
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
