import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type BadgeCatalogItem, type MyBadge } from '../features/profile/api'
import { useAuth } from '../shared/auth/useAuth'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

export function ArtifactsPage() {
  const { isAuthenticated } = useAuth()
  const [catalog, setCatalog] = useState<BadgeCatalogItem[]>([])
  const [myBadges, setMyBadges] = useState<MyBadge[]>([])

  useEffect(() => {
    profileApi.badgesCatalog().then(setCatalog).catch(() => setCatalog([]))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    profileApi.myBadges().then(setMyBadges).catch(() => setMyBadges([]))
  }, [isAuthenticated])

  const earnedMap = useMemo(() => new Map(myBadges.map((b) => [b.id, b.earned])), [myBadges])

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Cổ vật" />}>
      <main className="mt-16 p-lg max-w-7xl mx-auto w-full min-h-0">
        <h1 className="font-display-lg text-primary mb-md">Bộ sưu tập huy hiệu</h1>
        {!isAuthenticated && (
          <p className="text-on-surface-variant mb-md bg-surface-container border border-outline-variant rounded-lg p-md">
            Bạn đang xem catalog công khai. Đăng nhập để thấy trạng thái đã mở khóa của riêng bạn.
          </p>
        )}
        <div className="grid lg:grid-cols-12 gap-lg min-h-0">
          <section className="lg:col-span-4 bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md">
            <h2 className="font-title-md text-on-surface flex items-center gap-2 mb-sm">
              <MaterialIcon name="filter_list" className="text-primary" />
              Bộ lọc cổ vật
            </h2>
            <div className="flex flex-wrap gap-xs mb-md">
              <button className="px-3 py-1 rounded-full border border-secondary bg-secondary/10 text-secondary text-xs">Tất cả</button>
              <button className="px-3 py-1 rounded-full border border-outline-variant text-on-surface-variant text-xs">Đã mở khóa</button>
              <button className="px-3 py-1 rounded-full border border-outline-variant text-on-surface-variant text-xs">Chưa mở khóa</button>
            </div>
            <div className="space-y-sm max-h-[480px] overflow-y-auto pr-1">
              {catalog.map((badge) => {
                const earned = earnedMap.get(badge.id) ?? false
                return (
                  <article key={badge.id} className={`border rounded-xl p-sm ${earned ? 'border-secondary bg-secondary/5' : 'border-outline-variant bg-surface-container'}`}>
                    <div className="flex items-center gap-sm">
                      {badge.iconUrl ? (
                        <img src={badge.iconUrl} alt={badge.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-surface-container border border-outline-variant flex items-center justify-center">
                          <MaterialIcon name="history_edu" className="text-on-surface-variant" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-title-md text-sm">{badge.name}</h3>
                        <p className="text-xs text-on-surface-variant">{earned ? 'Đã mở khóa' : 'Chưa mở khóa'}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="lg:col-span-8 rounded-2xl overflow-hidden border border-outline-variant relative bg-surface-container-lowest min-h-[560px]">
            <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: `url('${images.exploreMapBg}')`, filter: 'grayscale(70%) brightness(45%)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute top-md left-md bg-surface-container-high/80 border border-outline-variant px-4 py-2 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-on-surface">Đang đồng bộ kho cổ vật...</span>
            </div>
            <div className="relative z-20 p-lg h-full flex items-end">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm w-full">
                {catalog.slice(0, 4).map((badge) => {
                  const earned = earnedMap.get(badge.id) ?? false
                  return (
                    <article
                      key={badge.id}
                      className={`border rounded-xl overflow-hidden ${
                        earned
                          ? 'border-secondary bg-secondary/5 shadow-[0_0_20px_rgba(68,219,213,0.15)]'
                          : 'border-outline-variant bg-surface-container'
                      }`}
                    >
                      <div className="p-md bg-surface-container-high border-b border-outline-variant flex items-center gap-sm">
                        {badge.iconUrl ? (
                          <img src={badge.iconUrl} alt={badge.name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-surface-container border border-outline-variant flex items-center justify-center">
                            <MaterialIcon name="history_edu" className="text-on-surface-variant" />
                          </div>
                        )}
                        <div>
                          <h2 className="font-title-md">{badge.name}</h2>
                          <p className="text-xs text-on-surface-variant">{earned ? 'Đã mở khóa' : 'Chưa mở khóa'}</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  )
}

