import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { collectionApi, type Artifact } from '../features/collection/api'
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { locationsApi, type Location } from '../features/locations/api'
import { profileApi, type BadgeCatalogItem, type MyBadge } from '../features/profile/api'
import { CU_CHI_LOCATION_ID, DEFAULT_ARTIFACTS_LOCATION_ID } from '../shared/config/constants'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'
import { buildArUrl } from '../features/ar/arDeepLink'
import { getArSceneByUnlockKey } from '../features/ar/cuChiArScenes'

type TierFilter = 'all' | 1 | 2 | 3
type StatusFilter = 'all' | 'unlocked' | 'locked'

const TIER_META = {
  1: {
    short: 'Tuyến đầu',
    label: 'Tầng 1 — Tuyến đầu & Kháng cự',
    depth: '3–4 m',
    icon: 'shield' as const,
    color: 'text-amber-400',
    accent: 'from-amber-600/25 via-amber-900/10 to-[#14100c]',
    ring: 'ring-amber-500/40',
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    glow: 'shadow-amber-900/20',
  },
  2: {
    short: 'Sinh hoạt',
    label: 'Tầng 2 — Sinh hoạt & Chỉ huy',
    depth: '5–8 m',
    icon: 'groups' as const,
    color: 'text-secondary',
    accent: 'from-secondary/20 via-teal-950/20 to-[#14100c]',
    ring: 'ring-secondary/40',
    chip: 'border-secondary/30 bg-secondary/10 text-secondary',
    glow: 'shadow-secondary/15',
  },
  3: {
    short: 'Nguồn sống',
    label: 'Tầng 3 — Kháng cự cuối',
    depth: '8–12 m',
    icon: 'water_drop' as const,
    color: 'text-sky-400',
    accent: 'from-sky-600/20 via-sky-950/15 to-[#14100c]',
    ring: 'ring-sky-500/40',
    chip: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    glow: 'shadow-sky-900/20',
  },
} as const

const ARTIFACT_TIER: Record<string, 1 | 2 | 3> = {
  'artifact:cuoc-chim': 1,
  'artifact:nap-ham': 1,
  'artifact:chong-tre': 1,
  'artifact:lao-tre': 1,
  'artifact:bay': 1,
  'hotspot:vent': 1,
  'hotspot:kitchen': 2,
  'scene:22222222-2222-2222-2222-222222222223': 2,
  'artifact:vu-khi': 2,
  'artifact:tram-xa': 2,
  'artifact:den-dau': 2,
  'artifact:min-gat': 2,
  'artifact:cua-bom': 2,
  'artifact:bao-giai-phong': 2,
  'artifact:khan-ran': 2,
  'artifact:ao-ba-ba': 2,
  'artifact:mu-tai-beo': 2,
  'artifact:dep-lop': 2,
  'artifact:sung-dkz': 2,
  'artifact:phao-105': 2,
  'artifact:cuoc-song-duoi-long-dat': 2,
  'artifact:coi-xay-thoc': 2,
  'artifact:khoai-mi': 2,
  'artifact:nguy-trang': 1,
  'scene:gieng': 3,
}

const ARTIFACT_ICON: Record<string, string> = {
  'hotspot:kitchen': 'outdoor_grill',
  'artifact:cuoc-chim': 'hardware',
  'artifact:chong-tre': 'warning',
  'artifact:min-gat': 'explosion',
  'artifact:nap-ham': 'door_front',
  'hotspot:vent': 'air',
  'scene:gieng': 'water_drop',
  'artifact:lao-tre': 'fence',
  'artifact:den-dau': 'light_mode',
  'artifact:khan-ran': 'checkroom',
  'artifact:vu-khi': 'build',
  'artifact:tram-xa': 'medical_services',
  'artifact:bay': 'dangerous',
  'artifact:cuoc-song-duoi-long-dat': 'home',
  'artifact:coi-xay-thoc': 'grain',
  'artifact:khoai-mi': 'restaurant',
  'artifact:nguy-trang': 'visibility_off',
}

const PLACEHOLDER_HINTS = ['/map/hero.jpg', 'placehold.co']

function artifactTier(unlockKey: string): 1 | 2 | 3 {
  return ARTIFACT_TIER[unlockKey] ?? 2
}

function isPlaceholderImage(url: string | undefined): boolean {
  if (!url?.trim()) return true
  return PLACEHOLDER_HINTS.some((hint) => url.includes(hint))
}

function resolveArtifactIcon(unlockKey: string): string {
  return ARTIFACT_ICON[unlockKey] ?? 'museum'
}

function CollectionProgress({ collected, total }: { collected: number; total: number }) {
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="flex items-center gap-md">
      <div className="relative w-[88px] h-[88px] shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(155,143,124,0.15)" strokeWidth="6" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="url(#artifactProgress)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="artifactProgress" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d4a437" />
              <stop offset="100%" stopColor="#44dbd5" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display-sm text-primary tabular-nums leading-none">{pct}%</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5">{collected}/{total}</span>
        </div>
      </div>
      <div>
        <p className="font-title-md text-on-surface">Tiến độ sưu tập</p>
        <p className="text-xs text-on-surface-variant mt-1 max-w-[220px]">
          Khám phá địa đạo, tour 360° và check-in để mở khóa hiện vật & câu chuyện.
        </p>
      </div>
    </div>
  )
}

function ArtifactVisual({
  artifact,
  tier,
  large,
}: {
  artifact: Artifact
  tier: 1 | 2 | 3
  large?: boolean
}) {
  const meta = TIER_META[tier]
  const icon = resolveArtifactIcon(artifact.unlockKey)
  const showImage = artifact.unlocked && !isPlaceholderImage(artifact.imageUrl)

  if (!artifact.unlocked) {
    return (
      <div className={`relative w-full bg-gradient-to-br from-[#1a1410] to-[#0d0a08] flex items-center justify-center ${large ? 'h-56' : 'aspect-[4/5]'}`}>
        <div className="text-center px-4">
          <div className="w-14 h-14 mx-auto rounded-full border border-outline-variant/50 bg-surface-container/50 flex items-center justify-center mb-3">
            <MaterialIcon name="lock" className="text-on-surface-variant text-2xl opacity-70" />
          </div>
          <p className="text-xs text-on-surface-variant">Chưa mở khóa</p>
        </div>
      </div>
    )
  }

  if (showImage) {
    return (
      <div className={`relative w-full overflow-hidden ${large ? 'h-56 md:h-full md:min-h-[320px]' : 'aspect-[4/5]'}`}>
        <img
          src={artifact.imageUrl}
          alt={artifact.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/20 to-transparent" />
      </div>
    )
  }

  return (
    <div
      className={`relative w-full bg-gradient-to-br ${meta.accent} flex items-center justify-center ${large ? 'h-56 md:h-full md:min-h-[320px]' : 'aspect-[4/5]'}`}
    >
      <div className="absolute inset-0 opacity-30 dong-son-bg" />
      <MaterialIcon name={icon} className={`${large ? 'text-6xl' : 'text-5xl'} ${meta.color} opacity-80`} />
    </div>
  )
}

export function ArtifactsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const discoverKeyParam = searchParams.get('discoverKey')
  const locationIdParam = searchParams.get('locationId')
  const { isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const recordedKeys = useRef(new Set<string>())
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState(
    locationIdParam && locationIdParam.length > 0 ? locationIdParam : DEFAULT_ARTIFACTS_LOCATION_ID,
  )
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [collected, setCollected] = useState(0)
  const [total, setTotal] = useState(0)
  const [useBadgeFallback, setUseBadgeFallback] = useState(false)
  const [catalog, setCatalog] = useState<BadgeCatalogItem[]>([])
  const [myBadges, setMyBadges] = useState<MyBadge[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [selected, setSelected] = useState<Artifact | null>(null)

  const isAdminPreview = user?.role === 'ADMIN'
  const isCuChi = locationId === CU_CHI_LOCATION_ID
  const activeLocation = useMemo(
    () => locations.find((l) => l.id === locationId),
    [locations, locationId],
  )

  useVisitSessionForLocation(locationId, isAuthenticated)

  useEffect(() => {
    locationsApi
      .list({ size: 50, sort: 'name,asc' })
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  useEffect(() => {
    if (!locationIdParam) return
    if (locationIdParam !== locationId) setLocationId(locationIdParam)
  }, [locationIdParam, locationId])

  const selectLocation = useCallback(
    (nextId: string) => {
      setLocationId(nextId)
      setSelected(null)
      setTierFilter('all')
      setStatusFilter('all')
      recordedKeys.current.clear()
      const next = new URLSearchParams(searchParams)
      if (nextId === DEFAULT_ARTIFACTS_LOCATION_ID) next.delete('locationId')
      else next.set('locationId', nextId)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    const loadArtifacts = async () => {
      try {
        if (isAuthenticated) {
          const mine = await collectionApi.mine(locationId)
          setArtifacts(mine.items)
          setCollected(mine.collected)
          setTotal(mine.total)
          setUseBadgeFallback(mine.items.length === 0)
        } else {
          const list = await collectionApi.catalog(locationId)
          setArtifacts(list.map((a) => ({ ...a, unlocked: false })))
          setCollected(0)
          setTotal(list.length)
          setUseBadgeFallback(list.length === 0)
        }
      } catch {
        setUseBadgeFallback(true)
      }
    }
    loadArtifacts()
  }, [isAuthenticated, locationId])

  useEffect(() => {
    if (!useBadgeFallback) return
    profileApi.badgesCatalog().then(setCatalog).catch(() => setCatalog([]))
  }, [useBadgeFallback])

  useEffect(() => {
    if (!useBadgeFallback || !isAuthenticated) return
    profileApi.myBadges().then(setMyBadges).catch(() => setMyBadges([]))
  }, [useBadgeFallback, isAuthenticated])

  const earnedMap = useMemo(() => new Map(myBadges.map((b) => [b.id, b.earned])), [myBadges])

  const recordArtifactDiscovery = useCallback(
    (unlockKey: string | undefined) => {
      if (!isAuthenticated || !unlockKey?.startsWith('artifact:')) return
      if (recordedKeys.current.has(unlockKey)) return
      recordedKeys.current.add(unlockKey)
      void recordDiscoveryEngagement({
        recordKey: unlockKey,
        locationId,
        source: 'artifact',
        onError: () =>
          showToast({
            message: 'Không ghi được tiến độ khám phá.',
            type: 'error',
          }),
      })
    },
    [isAuthenticated, locationId, showToast],
  )

  const filteredArtifacts = useMemo(
    () =>
      artifacts.filter((a) => {
        if (statusFilter === 'unlocked' && !a.unlocked) return false
        if (statusFilter === 'locked' && a.unlocked) return false
        if (isCuChi && tierFilter !== 'all' && artifactTier(a.unlockKey) !== tierFilter) return false
        return true
      }),
    [artifacts, statusFilter, tierFilter, isCuChi],
  )

  const tierCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0 }
    const totals = { 1: 0, 2: 0, 3: 0 }
    for (const a of artifacts) {
      const t = artifactTier(a.unlockKey)
      totals[t] += 1
      if (a.unlocked) counts[t] += 1
    }
    return { unlocked: counts, total: totals }
  }, [artifacts])

  const locationLabel = activeLocation?.name ?? (isCuChi ? 'Địa đạo Củ Chi' : 'Di tích lịch sử')

  const openArtifactDetail = useCallback(
    (artifact: Artifact) => {
      setSelected(artifact)
      recordArtifactDiscovery(artifact.unlockKey)
    },
    [recordArtifactDiscovery],
  )

  useEffect(() => {
    if (!discoverKeyParam || artifacts.length === 0) return
    const match = artifacts.find((a) => a.unlockKey === discoverKeyParam)
    if (match) openArtifactDetail(match)
  }, [discoverKeyParam, artifacts, openArtifactDetail])

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Cổ vật" />}>
      <main className="mt-16 pb-xl">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-outline-variant/40">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1510] via-[#12131b] to-[#0a0c12]" />
          <div className="absolute inset-0 dong-son-bg opacity-60" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative max-w-7xl mx-auto px-lg py-lg flex flex-wrap items-center justify-between gap-lg">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-1">{locationLabel}</p>
              <h1 className="font-display-lg text-primary">
                {useBadgeFallback ? 'Bộ sưu tập huy hiệu' : 'Tủ sưu tập cổ vật'}
              </h1>
              {locations.length > 0 && (
                <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                  <MaterialIcon name="temple_hindu" className="text-primary text-base" />
                  <span className="shrink-0">Chọn di tích:</span>
                  <select
                    value={locationId}
                    onChange={(e) => selectLocation(e.target.value)}
                    className="min-w-[200px] max-w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-on-surface text-sm"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {!useBadgeFallback && <CollectionProgress collected={collected} total={total} />}
            {isAdminPreview && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-primary/30 bg-primary/10 text-primary">
                <MaterialIcon name="verified" className="text-sm" />
                Admin · xem tất cả
              </span>
            )}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-lg pt-lg">
          {!isAuthenticated && (
            <p className="text-on-surface-variant mb-lg bg-surface-container/80 border border-outline-variant rounded-xl p-md text-sm">
              Đăng nhập để theo dõi cổ vật bạn đã mở khóa.
            </p>
          )}

          {!useBadgeFallback && (
            <>
              {/* Tier + status filters */}
              <div className="flex flex-col gap-md mb-lg">
                {isCuChi && (
                <div className="flex gap-sm overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setTierFilter('all')}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                      tierFilter === 'all'
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    Tất cả tầng
                  </button>
                  {([1, 2, 3] as const).map((tier) => {
                    const meta = TIER_META[tier]
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                          tierFilter === tier ? `${meta.chip} ring-1 ${meta.ring}` : 'border-outline-variant text-on-surface-variant hover:border-outline'
                        }`}
                      >
                        <MaterialIcon name={meta.icon} className="text-sm" />
                        Tầng {tier} · {meta.short}
                        <span className="opacity-70">
                          ({tierCounts.unlocked[tier]}/{tierCounts.total[tier]})
                        </span>
                      </button>
                    )
                  })}
                </div>
                )}
                <div className="flex flex-wrap gap-xs">
                  {(['all', 'unlocked', 'locked'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        statusFilter === f
                          ? 'bg-secondary/15 text-secondary border border-secondary/30'
                          : 'text-on-surface-variant border border-transparent hover:bg-surface-container'
                      }`}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'unlocked' ? 'Đã mở khóa' : 'Chưa mở khóa'}
                    </button>
                  ))}
                  <span className="text-xs text-on-surface-variant self-center ml-auto tabular-nums">
                    {filteredArtifacts.length} hiện vật
                  </span>
                </div>
              </div>

              {/* Gallery */}
              {filteredArtifacts.length === 0 ? (
                <div className="text-center py-2xl text-on-surface-variant">
                  <MaterialIcon name="inventory_2" className="text-4xl mb-2 opacity-40" />
                  <p>Không có cổ vật phù hợp bộ lọc.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-md">
                  {filteredArtifacts.map((artifact) => {
                    const tier = artifactTier(artifact.unlockKey)
                    const meta = TIER_META[tier]
                    const isSelected = selected?.id === artifact.id
                    return (
                      <button
                        key={artifact.id}
                        type="button"
                        onClick={() => openArtifactDetail(artifact)}
                        className={`group text-left rounded-2xl overflow-hidden border transition-all duration-300 ${
                          artifact.unlocked
                            ? `bg-[#16141c] hover:-translate-y-1 hover:shadow-xl ${meta.glow} border-outline-variant/50 hover:border-secondary/40`
                            : 'bg-surface-container/40 border-outline-variant/30 opacity-85 hover:opacity-100'
                        } ${isSelected ? `ring-2 ${meta.ring} border-secondary/50` : ''}`}
                      >
                        <div className="relative">
                          <ArtifactVisual artifact={artifact} tier={tier} />
                          {isCuChi && (
                          <span className={`absolute top-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-md ${meta.chip}`}>
                            T{tier}
                          </span>
                          )}
                          {artifact.unlocked && (
                            <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center">
                              <MaterialIcon name="check" className="text-secondary text-xs" />
                            </span>
                          )}
                        </div>
                        <div className="p-3 border-t border-outline-variant/30">
                          <h3 className="font-title-md text-sm text-on-surface leading-snug line-clamp-2 min-h-[2.5rem]">
                            {artifact.unlocked ? artifact.name : '???'}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant mt-1 truncate">
                            {artifact.unlocked ? (isCuChi ? meta.depth : activeLocation?.city ?? 'Di tích') : 'Khám phá để mở'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {useBadgeFallback && (
            <div className="rounded-2xl border border-outline-variant p-lg text-on-surface-variant">
              Đang dùng catalog huy hiệu (fallback). Chạy migration CP3 để bật Pokédex cổ vật.
              <div className="mt-md space-y-sm">
                {catalog.map((badge) => {
                  const earned = earnedMap.get(badge.id) ?? false
                  return (
                    <article key={badge.id} className={`border rounded-xl p-sm ${earned ? 'border-secondary bg-secondary/5' : 'border-outline-variant'}`}>
                      <h3 className="font-title-md text-sm">{badge.name}</h3>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail modal */}
        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-lg bg-black/75 backdrop-blur-sm"
            onClick={() => setSelected(null)}
            role="presentation"
          >
            <div
              className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-outline-variant/60 bg-[#16141c] shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
            >
              <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary shrink-0" />
              <div className="overflow-y-auto flex-1">
                <div className="md:grid md:grid-cols-5">
                  <div className="md:col-span-2 relative">
                    <ArtifactVisual artifact={selected} tier={artifactTier(selected.unlockKey)} large />
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="absolute top-3 right-3 sm:hidden w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center"
                      aria-label="Đóng"
                    >
                      <MaterialIcon name="close" className="text-on-surface" />
                    </button>
                  </div>
                  <div className="md:col-span-3 p-lg">
                    <div className="flex items-start justify-between gap-sm mb-sm">
                      <div>
                        {isCuChi && (
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${TIER_META[artifactTier(selected.unlockKey)].chip}`}>
                          {TIER_META[artifactTier(selected.unlockKey)].label}
                        </span>
                        )}
                        <h2 className={`font-display-lg text-primary ${isCuChi ? 'mt-2' : ''} leading-tight`}>
                          {selected.unlocked ? selected.name : '???'}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="hidden sm:flex w-9 h-9 rounded-full border border-outline-variant items-center justify-center text-on-surface-variant hover:bg-surface-container shrink-0"
                        aria-label="Đóng"
                      >
                        <MaterialIcon name="close" />
                      </button>
                    </div>
                    {selected.reliability === 'secondary' && (
                      <p className="text-xs text-amber-400/90 mb-2 flex items-center gap-1">
                        <MaterialIcon name="info" className="text-sm" />
                        Theo tư liệu tham khảo
                      </p>
                    )}
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {selected.unlocked ? selected.description : 'Khám phá thêm để mở khóa cổ vật này.'}
                    </p>
                    {isCuChi && selected.unlocked && getArSceneByUnlockKey(selected.unlockKey) && (
                      <Link
                        to={buildArUrl({
                          locationId: CU_CHI_LOCATION_ID,
                          mode: 'sim',
                          scene: getArSceneByUnlockKey(selected.unlockKey)!.slug,
                          discoverKey: selected.unlockKey,
                        })}
                        className="inline-flex items-center gap-1 mt-md text-secondary text-sm hover:underline"
                      >
                        <MaterialIcon name="view_in_ar" className="text-base" />
                        Xem mô hình AR
                      </Link>
                    )}
                    {selected.unlocked && selected.story && (
                      <div className="mt-lg pt-lg border-t border-outline-variant/50">
                        <h3 className="font-title-md text-sm text-on-surface mb-3 flex items-center gap-2">
                          <MaterialIcon name="auto_stories" className="text-primary" />
                          Câu chuyện lịch sử
                        </h3>
                        <div className="space-y-3 pl-3 border-l-2 border-primary/30">
                          {selected.story.split('\n\n').map((para, i) => (
                            <p key={i} className="text-sm text-on-surface-variant/95 leading-relaxed">
                              {para}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
