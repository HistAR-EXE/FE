import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ExploreTopNav } from '../components/layout/TopNav'
import { locationsApi, type Location } from '../features/locations/api'
import { RecommendationCard } from '../features/gamification/RecommendationCard'
import { discoveriesApi } from '../features/gamification/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useAuth } from '../shared/auth/useAuth'
import { ApiError } from '../shared/api/contracts'
import { useAppMode } from '../shared/context/useAppMode'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { ExploreMapPanel } from '../features/explore/ExploreMapPanel'
import { isLocationLocked, LOCATION_UNLOCKED_EVENT } from '../features/explore/locationUnlock'
import { buildArUrl } from '../features/ar/arDeepLink'
import { normalizeHeritageName } from '../features/explore/vietnamMap'
import { pickLocationCover, resolveLocationCoverFallback } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'

const PAGE_SIZE = 20

function exploreCardDescription(description: string | undefined): string {
  if (!description?.trim()) return 'Đang cập nhật mô tả di tích.'
  const firstBlock = description.split('\n').find((line) => {
    const t = line.trim()
    return t && !t.startsWith('Vị trí:') && !/^\d+\.\s/.test(t)
  })
  const text = (firstBlock ?? description).replace(/\s+/g, ' ').trim()
  return text.length > 220 ? `${text.slice(0, 217).trim()}…` : text
}

export function ExplorePage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [mapLocations, setMapLocations] = useState<Location[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'near' | 'virtual' | 'dynasty'>('all')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())
  const [lockedHint, setLockedHint] = useState<Location | null>(null)
  const { showToast } = useToast()
  const { mode } = useAppMode()
  const { isAuthenticated, user } = useAuth()
  const focusLocationId = useMemo(() => {
    const unlocked = mapLocations.find((location) => !isLocationLocked(location, user))
    return unlocked?.id ?? mapLocations[0]?.id ?? CU_CHI_LOCATION_ID
  }, [mapLocations, user])
  useVisitSessionForLocation(focusLocationId, isAuthenticated)

  const loadPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true)
        else setFailed(false)
        const result = await locationsApi.listPage({ page: pageIndex, size: PAGE_SIZE, sort: 'createdAt,desc' })
        setLocations((prev) => (append ? [...prev, ...result.items] : result.items))
        setTotalPages(result.totalPages || 1)
        setPage(pageIndex)
      } catch (e) {
        if (!append) setFailed(true)
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được danh sách địa điểm.',
          type: 'error',
        })
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage(0, false)
  }, [loadPage])

  const refetchLocations = useCallback(async () => {
    try {
      const [pageResult, mapList] = await Promise.all([
        locationsApi.listPage({ page: 0, size: PAGE_SIZE, sort: 'createdAt,desc' }),
        locationsApi.list({ size: 50, sort: 'name,asc' }),
      ])
      setLocations(pageResult.items)
      setTotalPages(pageResult.totalPages || 1)
      setPage(0)
      setMapLocations(mapList)
    } catch {
      /* keep current data */
    }
  }, [])

  useEffect(() => {
    locationsApi
      .list({ size: 50, sort: 'name,asc' })
      .then(setMapLocations)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const onUnlocked = () => {
      void refetchLocations()
    }
    window.addEventListener(LOCATION_UNLOCKED_EVENT, onUnlocked)
    return () => window.removeEventListener(LOCATION_UNLOCKED_EVENT, onUnlocked)
  }, [refetchLocations])

  const loadVisitedLocations = useCallback(async () => {
    if (!isAuthenticated) {
      setVisitedIds(new Set())
      return
    }
    try {
      const data = await discoveriesApi.visitedLocations()
      setVisitedIds(new Set(data.visitedLocationIds))
    } catch {
      setVisitedIds(new Set())
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadVisitedLocations()
  }, [loadVisitedLocations])

  useEffect(() => {
    const onDiscoveryRecorded = () => {
      void loadVisitedLocations()
    }
    window.addEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
    return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
  }, [loadVisitedLocations])

  const filteredLocations = locations.filter((location) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'near') return true
    if (activeFilter === 'virtual') {
      const content = `${location.description ?? ''} ${location.name ?? ''}`.toLowerCase()
      return content.includes('ar') || content.includes('360') || content.includes('tour')
    }
    if (activeFilter === 'dynasty') {
      const content = `${location.description ?? ''} ${location.name ?? ''}`.toLowerCase()
      return content.includes('triều') || content.includes('đế') || content.includes('hoàng')
    }
    return true
  })
  const [brokenCovers, setBrokenCovers] = useState<Record<string, true>>({})
  const coverFallback = (location: Location, index: number) =>
    resolveLocationCoverFallback(location.name, index)
  const coverSrc = (location: Location, index: number) =>
    pickLocationCover(location.coverImage, location.name, index, Boolean(brokenCovers[location.id]))
  const onCoverError = (locationId: string) => () => {
    setBrokenCovers((prev) => ({ ...prev, [locationId]: true }))
  }
  const distanceLabel = (location: Location, index: number) => {
    if (typeof location.distanceKm === 'number') return `${location.distanceKm.toFixed(1)} km`
    return `${(2.4 + index * 2.7).toFixed(1)} km`
  }
  const ratingLabel = (location: Location, index: number) => {
    if (typeof location.rating === 'number') return location.rating.toFixed(1)
    return (4.9 - index * 0.1).toFixed(1)
  }

  return (
    <AppLayout activeBorder="right" mobileBackTo="/home" mobileTitle="Khám phá" topNav={<ExploreTopNav backTo="/home" backLabel="Trang chủ" />}>
      <main className="w-full mt-14 md:mt-16 p-md md:p-lg flex flex-col xl:flex-row gap-lg relative min-h-[calc(100dvh-4rem)]">
        <section className="w-full xl:w-[min(440px,38vw)] xl:max-w-[480px] xl:min-w-[320px] flex flex-col gap-md z-10 shrink-0 min-h-0 xl:max-h-[calc(100vh-5rem)]">
          <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md shadow-lg flex flex-col gap-md shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="filter_list" className="text-primary" />
                Bộ lọc bản đồ
              </h2>
            </div>
            <div className="flex flex-wrap gap-sm">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('near')
                  showToast({ message: 'Bộ lọc “Gần đây” cần quyền vị trí — đang phát triển.', type: 'info' })
                }}
                className={`px-4 py-2 rounded-full border text-sm flex items-center gap-1 ${
                  activeFilter === 'near' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant bg-surface-container text-on-surface-variant'
                }`}
              >
                <MaterialIcon name="my_location" className="text-[16px]" />
                Gần đây
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('virtual')}
                className={`px-4 py-2 rounded-full border text-sm ${
                  activeFilter === 'virtual' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant bg-surface-container text-on-surface-variant'
                }`}
              >
                Du lịch ảo
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('dynasty')}
                className={`px-4 py-2 rounded-full border text-sm ${
                  activeFilter === 'dynasty' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant bg-surface-container text-on-surface-variant'
                }`}
              >
                Triều đại
              </button>
              <button type="button" onClick={() => setActiveFilter('all')} className="px-4 py-2 rounded-full border border-outline-variant bg-surface-container text-on-surface-variant text-sm">
                Xóa lọc
              </button>
            </div>
          </div>

          {isAuthenticated && <RecommendationCard locationId={focusLocationId} />}

          <div className="flex flex-col flex-1 min-h-0">
            <h3 className="shrink-0 font-title-md text-title-md text-on-surface-variant px-1 mb-md">Di tích nổi bật</h3>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 pb-md">
              {loading && <p className="text-on-surface-variant text-sm px-1">Đang tải dữ liệu địa điểm...</p>}
              {!loading && failed && <p className="text-red-400 text-sm px-1">Không tải được dữ liệu địa điểm.</p>}
              <div className="flex flex-col gap-md">
                {!loading &&
                  !failed &&
                  filteredLocations.map((location, index) => {
                    const locked = isLocationLocked(location, user)
                    return (
                    <article
                      key={location.id}
                      className={`group shrink-0 bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden card-interactive ${
                        locked ? 'opacity-60' : 'hover:border-primary/50 hover:bg-surface-container shadow-elev-1 hover:shadow-elev-2'
                      }`}
                    >
                      {locked ? (
                        <button
                          type="button"
                          onClick={() => setLockedHint(location)}
                          className="block w-full text-left"
                        >
                          <div className="h-36 relative overflow-hidden bg-surface-container-high shrink-0">
                            <SmartImage
                              alt={location.name || 'Di tích lịch sử'}
                              fill
                              className="group-hover:scale-105 transition-transform duration-500 grayscale"
                              src={coverSrc(location, index)}
                              fallback={coverFallback(location, index)}
                              onFailed={onCoverError(location.id)}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-2xl" aria-hidden>🔒</span>
                            </div>
                          </div>
                          <div className="p-md">
                            <h4 className="font-title-md text-title-md text-on-surface-variant">
                              {normalizeHeritageName(location.name || 'Địa điểm chưa đặt tên')}
                            </h4>
                            <p className="text-xs text-on-surface-variant mt-1">Hoàn thành quest trước để mở khoá</p>
                          </div>
                        </button>
                      ) : (
                      <Link to={`/explore/${location.id}`} className="block">
                        <div className="h-36 relative overflow-hidden bg-surface-container-high shrink-0">
                          <SmartImage
                            alt={location.name || 'Di tích lịch sử'}
                            fill
                            className="group-hover:scale-105 transition-transform duration-500"
                            src={coverSrc(location, index)}
                            fallback={coverFallback(location, index)}
                            onFailed={onCoverError(location.id)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-sm border border-outline-variant text-[10px] font-label-sm text-primary">
                              {location.city || (index === 0 ? 'Triều Nguyễn' : 'Di tích')}
                            </span>
                            {(location.isArAvailable || index === 0) && (
                              <span className="px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-sm border border-outline-variant text-[10px] font-label-sm text-secondary">
                                Có AR
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-md">
                          <h4 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                            {normalizeHeritageName(location.name || 'Địa điểm chưa đặt tên')}
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant mt-1 line-clamp-2">
                            {exploreCardDescription(location.description)}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                            <span className="flex items-center gap-1">
                              <MaterialIcon name="location_on" className="text-sm" />
                              {distanceLabel(location, index)}
                            </span>
                            <span className="flex items-center gap-1 text-primary">
                              <MaterialIcon name="star" className="text-sm" />
                              {ratingLabel(location, index)}
                            </span>
                          </div>
                        </div>
                      </Link>
                      )}
                      {!locked && mode === 'online' && (
                        <div className="px-md pb-md flex flex-wrap gap-2 -mt-1">
                          <Link
                            to={`/artifacts?locationId=${location.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary/50 bg-primary/10 text-primary text-xs font-label-sm hover:bg-primary/20"
                          >
                            <MaterialIcon name="history_edu" className="text-sm" />
                            Cổ vật
                          </Link>
                          <Link
                            to={`/tour/360/${location.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-secondary/50 bg-secondary/10 text-secondary text-xs font-label-sm hover:bg-secondary/20"
                          >
                            <MaterialIcon name="view_in_ar" className="text-sm" />
                            Tham quan 360°
                          </Link>
                          {location.id === CU_CHI_LOCATION_ID && (
                            <Link
                              to={buildArUrl({ locationId: location.id, mode: 'sim' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary/50 bg-primary/10 text-primary text-xs font-label-sm hover:bg-primary/20"
                            >
                              <MaterialIcon name="view_in_ar" className="text-sm" />
                              Cổng AR
                            </Link>
                          )}
                          <Link
                            to={`/chat?locationId=${location.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary/50 bg-primary/10 text-primary text-xs font-label-sm hover:bg-primary/20"
                          >
                            <MaterialIcon name="chat_bubble" className="text-sm" />
                            Trò chuyện AI
                          </Link>
                        </div>
                      )}
                    </article>
                    )
                  })}
              </div>
              {!loading && !failed && page + 1 < totalPages && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadPage(page + 1, true)}
                  className="shrink-0 mt-md w-full py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors disabled:opacity-60"
                >
                  {loadingMore ? 'Đang tải thêm...' : 'Xem thêm di tích'}
                </button>
              )}
            </div>
          </div>
        </section>

        <ExploreMapPanel
          locations={mapLocations.length > 0 ? mapLocations : filteredLocations}
          visitedIds={visitedIds}
          user={user}
          onLockedLocationClick={setLockedHint}
        />

        {lockedHint && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-md bg-black/60">
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-lg max-w-sm w-full shadow-xl">
              <p className="font-title-md text-on-surface">🔒 {normalizeHeritageName(lockedHint.name)}</p>
              <p className="text-sm text-on-surface-variant mt-sm">
                {lockedHint.unlockNarrative ??
                  'Hoàn thành nhiệm vụ tại di tích trước để mở khoá điểm đến này trên bản đồ.'}
              </p>
              <div className="flex gap-sm mt-md justify-end">
                <button
                  type="button"
                  onClick={() => setLockedHint(null)}
                  className="px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant"
                >
                  Đóng
                </button>
                <Link
                  to="/quests"
                  onClick={() => setLockedHint(null)}
                  className="px-4 py-2 rounded-full bg-secondary text-on-secondary font-title-sm"
                >
                  Xem nhiệm vụ
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
