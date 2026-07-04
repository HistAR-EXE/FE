import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useAuth } from '../shared/auth/useAuth'
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { showDiscoveryRecordError } from '../features/gamification/discoveryEngagementToast'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { useToast } from '../shared/ui/toast/useToast'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'
import { ARHud, ARLoadingFallback, ARShell } from '../features/ar/ARHud'
import { ARSimViewer } from '../features/ar/ARSimViewer'
import { ARSceneViewer } from '../features/ar/ARSceneViewer'
import {
  buildArUrl,
  isArEnabledLocation,
  parseArMode,
  parseEra,
} from '../features/ar/arDeepLink'
import { isCuChiSceneSlug } from '../features/ar/cuChiArScenes'
import { useArPhotoScenes } from '../features/ar/useArPhotoScenes'
import type { ARMode, ARTrackingState, CuChiSceneSlug, EraValue } from '../features/ar/types'

export function TimePortalARPage() {
  const { locationId } = useParams<{ locationId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeLocationId = locationId ?? CU_CHI_LOCATION_ID

  const sceneParam = searchParams.get('scene')
  const sceneSlug: CuChiSceneSlug = isCuChiSceneSlug(sceneParam) ? sceneParam : 'cua-ham'
  const mode = parseArMode(searchParams.get('mode'))
  const era = parseEra(searchParams.get('era'))
  const discoverKeyParam = searchParams.get('discoverKey')

  const { isAuthenticated, user } = useAuth()
  useVisitSessionForLocation(activeLocationId, isAuthenticated)
  const { showToast } = useToast()
  const { applyEngagement } = useUserProgress()

  const { loading, error, config, captionForEra, overlayImageForEra } = useArPhotoScenes(activeLocationId, sceneSlug)
  const [tracking, setTracking] = useState<ARTrackingState>(mode === 'sim' ? 'found' : 'scanning')

  const dwellKeyRef = useRef<string | null>(null)
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordedRef = useRef(new Set<string>())

  const syncParams = useCallback(
    (patch: { mode?: ARMode; scene?: CuChiSceneSlug; era?: EraValue }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (patch.mode) next.set('mode', patch.mode)
          if (patch.scene) next.set('scene', patch.scene)
          if (patch.era) next.set('era', String(patch.era))
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const recordEngagement = useCallback(
    (recordKey: string) => {
      if (!isAuthenticated || !recordKey || recordedRef.current.has(recordKey)) return
      recordedRef.current.add(recordKey)
      void recordDiscoveryEngagement({
        recordKey,
        locationId: activeLocationId,
        source: 'time_portal',
        onSuccess: (response) => {
          notifyEngagementOutcome(response, showToast, applyEngagement)
          void analyticsApi.recordEvent({
            locationId: activeLocationId,
            eventType: 'TIME_PORTAL_ERA_VIEWED',
            eventKey: recordKey,
            source: 'time_portal_ar',
          })
        },
        onError: () => showDiscoveryRecordError(showToast, { role: user?.role }),
      })
    },
    [isAuthenticated, activeLocationId, showToast, applyEngagement, user?.role],
  )

  useEffect(() => {
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current)
    const key = discoverKeyParam ?? config.unlockKey
    dwellKeyRef.current = key
    dwellTimerRef.current = setTimeout(() => {
      if (dwellKeyRef.current) recordEngagement(dwellKeyRef.current)
    }, 3000)
    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current)
    }
  }, [sceneSlug, discoverKeyParam, config.unlockKey, recordEngagement])

  useEffect(() => {
    if (tracking === 'found' && config.unlockKey) {
      recordEngagement(config.unlockKey)
    }
  }, [tracking, config.unlockKey, recordEngagement])

  if (!isArEnabledLocation(activeLocationId)) {
    return <Navigate to={`/time-portal/${activeLocationId}`} replace />
  }

  const caption = captionForEra(era)
  const overlayImage = overlayImageForEra(era)

  return (
    <AppLayout activeBorder="left" mobileBackTo={`/time-portal/${activeLocationId}`} mobileTitle="AR Cổng thời gian">
      <main className="flex-1 mt-14 md:mt-16 pb-0 relative">
        {loading && <ARLoadingFallback />}
        {!loading && error && (
          <div className="p-lg text-center text-on-surface-variant">
            <p>{error}</p>
            <p className="text-sm mt-2">Vẫn có thể xem mô hình với dữ liệu mặc định.</p>
          </div>
        )}

        {!loading && (
          <ARShell>
            {mode === 'sim' ? (
              <ARSimViewer scene={config} era={era} overlayImageUrl={overlayImage} />
            ) : (
              <ARSceneViewer
                mode={mode}
                scene={config}
                era={era}
                historicalImageUrl={overlayImage}
                onTrackingChange={setTracking}
              />
            )}

            <ARHud
              locationId={activeLocationId}
              sceneSlug={sceneSlug}
              era={era}
              mode={mode}
              caption={caption}
              sceneName={config.name}
              tracking={tracking}
              onSceneChange={(slug) => syncParams({ scene: slug })}
              onEraChange={(e) => syncParams({ era: e })}
              onModeChange={(m) => {
                syncParams({ mode: m })
                setTracking(m === 'sim' ? 'found' : 'scanning')
              }}
              showTargetPanel
              targetImage={config.previewImage}
            />
          </ARShell>
        )}
      </main>
    </AppLayout>
  )
}

/** Re-export for lazy route typing */
export function buildArUrlForScene(locationId: string, slug: CuChiSceneSlug) {
  return buildArUrl({ locationId, scene: slug, mode: 'sim' })
}
