import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ExploreTopNav } from '../components/layout/TopNav'
import { locationsApi, type Location } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

export function ExplorePage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'near' | 'virtual' | 'dynasty'>('all')
  const [mapZoom, setMapZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    const run = async () => {
      try {
        setFailed(false)
        setLocations(await locationsApi.list())
      } catch (e) {
        setFailed(true)
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được danh sách địa điểm.',
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [showToast])

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
  const stitchedCover = (idx: number) => (idx % 2 === 0 ? images.exploreDaiNoi : images.exploreChuaThienMu)
  const distanceLabel = (location: Location, index: number) => {
    if (typeof location.distanceKm === 'number') return `${location.distanceKm.toFixed(1)} km`
    return `${(2.4 + index * 2.7).toFixed(1)} km`
  }
  const ratingLabel = (location: Location, index: number) => {
    if (typeof location.rating === 'number') return location.rating.toFixed(1)
    return (4.9 - index * 0.1).toFixed(1)
  }

  return (
    <AppLayout activeBorder="right" topNav={<ExploreTopNav />}>
      <main className="w-full h-[calc(100vh-4rem)] mt-16 p-lg flex gap-lg relative min-h-0 overflow-hidden">
        <section className="w-[400px] max-w-[400px] min-w-[320px] h-full flex flex-col gap-lg z-10 shrink-0 min-h-0">
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
                onClick={() => setActiveFilter('near')}
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

          <div className="flex flex-col flex-1 min-h-0">
            <h3 className="shrink-0 font-title-md text-title-md text-on-surface-variant px-1 mb-md">Di tích nổi bật</h3>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 pb-md">
              {loading && <p className="text-on-surface-variant text-sm px-1">Đang tải dữ liệu địa điểm...</p>}
              {!loading && failed && <p className="text-red-400 text-sm px-1">Không tải được dữ liệu địa điểm.</p>}
              <div className="flex flex-col gap-md">
                {!loading &&
                  !failed &&
                  filteredLocations.map((location, index) => (
                    <article
                      key={location.id}
                      className="group shrink-0 bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:bg-surface-container"
                    >
                      <Link to={`/explore/${location.id}`} className="block">
                        <div className="h-32 relative overflow-hidden bg-surface-container-high shrink-0">
                          <img
                            alt={location.name || 'Di tích lịch sử'}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
                            src={location.coverImage || stitchedCover(index)}
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
                            {location.name || 'Địa điểm chưa đặt tên'}
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant mt-1 line-clamp-2">
                            {location.description || 'Đang cập nhật mô tả di tích.'}
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
                    </article>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 h-full min-h-0 rounded-2xl overflow-hidden border border-outline-variant relative bg-surface-container-lowest shadow-inner">
          <div className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-300" style={{ backgroundImage: `url('${images.exploreMapBg}')`, filter: 'grayscale(80%) sepia(20%) hue-rotate(180deg) brightness(40%) contrast(120%)', transform: `scale(${mapZoom})` }} />
          <div className="absolute inset-0 bg-dongson-pattern opacity-20 pointer-events-none" />
          <div className="absolute right-md bottom-md flex flex-col gap-sm z-20">
            <button type="button" onClick={() => setMapZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))} className="w-10 h-10 bg-surface/80 border border-outline-variant rounded-full flex items-center justify-center text-on-surface">
              <MaterialIcon name="add" />
            </button>
            <button type="button" onClick={() => setMapZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))} className="w-10 h-10 bg-surface/80 border border-outline-variant rounded-full flex items-center justify-center text-on-surface">
              <MaterialIcon name="remove" />
            </button>
          </div>
          <div className="absolute top-md left-md bg-surface-container-high/80 border border-outline-variant px-4 py-2 rounded-full flex items-center gap-2 z-20">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-sm text-label-sm text-on-surface">Đang quét khu vực...</span>
          </div>
          {filteredLocations.slice(0, 3).map((location, idx) => (
            <Link
              key={location.id}
              to={`/explore/${location.id}`}
              className={`absolute group cursor-pointer z-20 ${
                idx === 0 ? 'top-1/2 left-1/3' : idx === 1 ? 'top-[30%] left-[60%]' : 'top-[70%] left-[45%]'
              } -translate-x-1/2 -translate-y-1/2`}
            >
              <div className={`${idx === 0 ? 'w-4 h-4 bg-secondary' : 'w-3 h-3 bg-primary/70'} rounded-full border border-primary`} />
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity w-max bg-surface-container border border-outline-variant px-2 py-1 rounded-md shadow-lg">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{location.name}</span>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </AppLayout>
  )
}
