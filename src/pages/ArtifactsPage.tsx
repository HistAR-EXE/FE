import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { collectionApi, type Artifact } from '../features/collection/api'
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { profileApi, type BadgeCatalogItem, type MyBadge } from '../features/profile/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'

export function ArtifactsPage() {
  const [searchParams] = useSearchParams()
  const discoverKeyParam = searchParams.get('discoverKey')
  const { isAuthenticated } = useAuth()
  useVisitSessionForLocation(CU_CHI_LOCATION_ID, isAuthenticated)
  const { showToast } = useToast()
  const recordedKeys = useRef(new Set<string>())
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [collected, setCollected] = useState(0)
  const [total, setTotal] = useState(0)
  const [useBadgeFallback, setUseBadgeFallback] = useState(false)
  const [catalog, setCatalog] = useState<BadgeCatalogItem[]>([])
  const [myBadges, setMyBadges] = useState<MyBadge[]>([])
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [selected, setSelected] = useState<Artifact | null>(null)

  useEffect(() => {
    const loadArtifacts = async () => {
      try {
        if (isAuthenticated) {
          const mine = await collectionApi.mine(CU_CHI_LOCATION_ID)
          setArtifacts(mine.items)
          setCollected(mine.collected)
          setTotal(mine.total)
          setUseBadgeFallback(mine.items.length === 0)
        } else {
          const list = await collectionApi.catalog(CU_CHI_LOCATION_ID)
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
  }, [isAuthenticated])

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
        locationId: CU_CHI_LOCATION_ID,
        source: 'artifact',
        onError: () =>
          showToast({
            message: 'Không ghi được tiến độ khám phá.',
            type: 'error',
          }),
      })
    },
    [isAuthenticated, showToast],
  )

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

  const filteredArtifacts = artifacts.filter((a) => {
    if (filter === 'unlocked') return a.unlocked
    if (filter === 'locked') return !a.unlocked
    return true
  })

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Cổ vật" />}>
      <main className="mt-16 p-lg max-w-7xl mx-auto w-full min-h-0">
        <h1 className="font-display-lg text-primary mb-md">
          {useBadgeFallback ? 'Bộ sưu tập huy hiệu' : `Tủ sưu tập — ${collected}/${total}`}
        </h1>
        {!isAuthenticated && (
          <p className="text-on-surface-variant mb-md bg-surface-container border border-outline-variant rounded-lg p-md">
            Bạn đang xem catalog công khai. Đăng nhập để thấy trạng thái đã mở khóa của riêng bạn.
          </p>
        )}

        {!useBadgeFallback && (
          <div className="grid lg:grid-cols-12 gap-lg min-h-0">
            <section className="lg:col-span-4 bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md">
              <h2 className="font-title-md text-on-surface flex items-center gap-2 mb-sm">
                <MaterialIcon name="filter_list" className="text-primary" />
                Bộ lọc cổ vật
              </h2>
              <div className="flex flex-wrap gap-xs mb-md">
                {(['all', 'unlocked', 'locked'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      filter === f ? 'border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'unlocked' ? 'Đã mở khóa' : 'Chưa mở khóa'}
                  </button>
                ))}
              </div>
              <div className="space-y-sm max-h-[480px] overflow-y-auto pr-1">
                {filteredArtifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => openArtifactDetail(artifact)}
                    className={`w-full text-left border rounded-xl p-sm ${
                      artifact.unlocked ? 'border-secondary bg-secondary/5' : 'border-outline-variant bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-sm">
                      {artifact.unlocked && artifact.imageUrl ? (
                        <img src={artifact.imageUrl} alt={artifact.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-surface-container border border-outline-variant flex items-center justify-center">
                          <span className="text-on-surface-variant text-xs">???</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-title-md text-sm">{artifact.unlocked ? artifact.name : '???'}</h3>
                        <p className="text-xs text-on-surface-variant">{artifact.unlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="lg:col-span-8 rounded-2xl overflow-hidden border border-outline-variant relative bg-surface-container-lowest min-h-[560px]">
              <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: `url('${images.exploreMapBg}')`, filter: 'grayscale(70%) brightness(45%)' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="relative z-20 p-lg h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
                  {filteredArtifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      type="button"
                      onClick={() => openArtifactDetail(artifact)}
                      className={`aspect-square border rounded-xl overflow-hidden flex flex-col items-center justify-center p-sm ${
                        artifact.unlocked
                          ? 'border-secondary bg-secondary/5 glow-secondary'
                          : 'border-outline-variant bg-surface-container opacity-70'
                      }`}
                    >
                      {artifact.unlocked && artifact.imageUrl ? (
                        <img src={artifact.imageUrl} alt={artifact.name} className="w-full h-24 object-cover rounded mb-2" />
                      ) : (
                        <MaterialIcon name="lock" className="text-on-surface-variant text-3xl mb-2" />
                      )}
                      <span className="font-title-md text-xs text-center">{artifact.unlocked ? artifact.name : '???'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {useBadgeFallback && (
          <div className="grid lg:grid-cols-12 gap-lg min-h-0">
            <section className="lg:col-span-4 bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md">
              <div className="space-y-sm max-h-[480px] overflow-y-auto pr-1">
                {catalog.map((badge) => {
                  const earned = earnedMap.get(badge.id) ?? false
                  return (
                    <article key={badge.id} className={`border rounded-xl p-sm ${earned ? 'border-secondary bg-secondary/5' : 'border-outline-variant bg-surface-container'}`}>
                      <h3 className="font-title-md text-sm">{badge.name}</h3>
                    </article>
                  )
                })}
              </div>
            </section>
            <section className="lg:col-span-8 rounded-2xl border border-outline-variant p-lg text-on-surface-variant">
              Đang dùng catalog huy hiệu (fallback). Chạy migration CP3 để bật Pokédex cổ vật.
            </section>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60" onClick={() => setSelected(null)}>
            <div
              className="glass-panel max-w-lg w-full rounded-xl border border-outline-variant p-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {selected.imageUrl && selected.unlocked && (
                <img src={selected.imageUrl} alt={selected.name} className="w-full h-48 object-cover rounded-lg mb-md" />
              )}
              <h2 className="font-display-lg text-primary">{selected.unlocked ? selected.name : '???'}</h2>
              {selected.reliability === 'secondary' && (
                <p className="text-xs text-on-surface-variant mt-1">Theo tư liệu tham khảo — chưa xác nhận đầy đủ.</p>
              )}
              <p className="text-on-surface-variant mt-md">{selected.unlocked ? selected.description : 'Khám phá thêm để mở khóa cổ vật này.'}</p>
              <button type="button" onClick={() => setSelected(null)} className="mt-md px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant">
                Đóng
              </button>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
