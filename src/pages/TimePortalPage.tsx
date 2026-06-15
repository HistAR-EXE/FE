import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Link, useParams, useSearchParams } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'

import { locationsApi, type PhotoPair } from '../features/locations/api'

import { photoScenesApi, type PhotoScene } from '../features/photo-scenes/api'

import { eraDiscoveryKey, recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'

import { useAuth } from '../shared/auth/useAuth'

import { DualPhotoExport } from '../features/time-portal/DualPhotoExport'

import { TimePortalViewer } from '../features/time-portal/TimePortalViewer'

import { ApiError } from '../shared/api/contracts'

import { useToast } from '../shared/ui/toast/useToast'

import { MaterialIcon } from '../components/ui/MaterialIcon'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'



const ERA_VALUES = [1948, 1968, 2026] as const

type EraValue = (typeof ERA_VALUES)[number]



const DISCOVER_KEY_LABELS: Record<string, string> = {

  'era:1948': '1948 — khởi đầu hầm ngầm',

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

  const [searchParams] = useSearchParams()

  const discoverKeyParam = searchParams.get('discoverKey')
  const questRecordParam = searchParams.get('questRecord')

  const sceneParam = searchParams.get('scene')

  const initialEra = parseEraParam(searchParams.get('era'))

  const { isAuthenticated } = useAuth()
  const activeLocationId = locationId ?? CU_CHI_LOCATION_ID
  useVisitSessionForLocation(activeLocationId, isAuthenticated)

  const [scenes, setScenes] = useState<PhotoScene[]>([])

  const [pairs, setPairs] = useState<PhotoPair[]>([])

  const [index, setIndex] = useState(0)

  const [loading, setLoading] = useState(true)

  const { showToast } = useToast()

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

        onError: () =>

          showToast({

            message: 'Không ghi được tiến độ khám phá.',

            type: 'error',

          }),

      })

    },

    [isAuthenticated, showToast],

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

    (era: number) => {

      if (!isAuthenticated) return
      if (skipNextEraRecord.current) {
        skipNextEraRecord.current = false
        return
      }
      if (flushPendingDiscoverKey()) return
      const key = eraDiscoveryKey(era)
      if (key) recordEngagement(key)
    },
    [isAuthenticated, flushPendingDiscoverKey, recordEngagement],

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

      <main className="flex-1 flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] relative mt-14 md:mt-16 pb-16 md:pb-0">

        <header className="bg-surface/70 backdrop-blur-xl border-b border-outline-variant hidden md:flex items-center justify-between h-16 px-xl z-40 shrink-0">

          <div className="flex items-center gap-md min-w-0">

            <Link to={locationId ? `/explore/${locationId}` : '/explore'} className="text-on-surface-variant hover:text-secondary flex items-center gap-xs">

              <MaterialIcon name="arrow_back" /> Quay lại

            </Link>

            <h1 className="font-headline-lg font-bold text-on-surface">Cổng thời gian</h1>

          </div>

          {exportUrls.left && exportUrls.right && (

            <DualPhotoExport leftImageUrl={exportUrls.left} rightImageUrl={exportUrls.right} />

          )}

        </header>

        <section className="relative flex-1 bg-surface-container-lowest overflow-hidden">

          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,rgba(242,191,80,0.3),transparent_60%)]" />

          {discoverKeyParam && isAuthenticated && !loading && (

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

          {hasContent && !loading && (

            <TimePortalViewer

              scenes={scenes.length ? scenes : undefined}

              pairs={pairs.length ? pairs : undefined}

              sceneIndex={index}

              onSceneIndexChange={onSceneIndexChange}

              onEraChange={onEraChange}

              onEngagement={onPortalEngagement}

              initialEra={initialEra}

            />

          )}

          {exportUrls.left && exportUrls.right && (

            <div className="md:hidden absolute bottom-20 right-md z-30">

              <DualPhotoExport leftImageUrl={exportUrls.left} rightImageUrl={exportUrls.right} />

            </div>

          )}

        </section>

      </main>

    </AppLayout>

  )

}

