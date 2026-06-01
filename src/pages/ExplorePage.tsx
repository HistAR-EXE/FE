import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ExploreTopNav } from '../components/layout/TopNav'
import { ExploreTabs } from '../components/explore/ExploreTabs'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { exploreLandmarks } from '../data/mock/landmarks'

export function ExplorePage() {
  return (
    <AppLayout activeBorder="right" topNav={<ExploreTopNav />}>
      <main className="w-full h-[calc(100vh-4rem)] mt-16 p-lg flex gap-lg relative min-h-0">
        <section className="w-[min(400px,35vw)] max-w-[420px] min-w-[320px] h-full flex flex-col gap-lg z-10 shrink-0 min-h-0">
          <div className="shrink-0">
            <ExploreTabs />
          </div>

          <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant rounded-xl p-md shadow-lg flex flex-col gap-md shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="filter_list" className="text-primary" />
                Bộ lọc bản đồ
              </h2>
              <button type="button" className="font-label-sm text-label-sm text-secondary hover:underline">
                Xóa bộ lọc
              </button>
            </div>
            <div className="flex flex-wrap gap-sm">
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-secondary bg-secondary/10 text-secondary font-label-sm text-label-sm flex items-center gap-1 hover:bg-secondary/20 transition-colors shadow-[0_0_10px_rgba(68,219,213,0.15)]"
              >
                <MaterialIcon name="my_location" className="text-[16px]" />
                Gần tôi
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-outline-variant bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 hover:text-on-surface transition-colors"
              >
                <MaterialIcon name="view_in_ar" className="text-[16px]" />
                Tham quan từ xa
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-outline-variant bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 hover:text-on-surface transition-colors"
              >
                <MaterialIcon name="history_edu" className="text-[16px]" />
                Triều Nguyễn
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-outline-variant bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 hover:text-on-surface transition-colors"
              >
                <MaterialIcon name="temple_buddhist" className="text-[16px]" />
                Tôn giáo
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-md">
            <h3 className="font-title-md text-title-md text-on-surface-variant px-1 shrink-0">
              Di tích nổi bật
            </h3>
            {exploreLandmarks.map((landmark) => (
              <article
                key={landmark.id}
                className="shrink-0 group bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:bg-surface-container"
              >
                <Link to={`/explore/${landmark.slug}`} className="block">
                  <div className="h-32 shrink-0 relative overflow-hidden">
                    <img
                      alt={landmark.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={landmark.image}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
                    {landmark.featured && (
                      <div className="absolute bottom-2 left-3 flex gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-sm border border-outline-variant text-[10px] font-label-sm text-primary">
                          Triều Nguyễn
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-sm border border-outline-variant text-[10px] font-label-sm text-secondary">
                          Có AR
                        </span>
                      </div>
                    )}
                    {!landmark.featured && (
                      <div className="absolute bottom-2 left-3 flex gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-sm border border-outline-variant text-[10px] font-label-sm text-on-surface">
                          Tôn giáo
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-md">
                    <h4 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                      {landmark.title}
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1 line-clamp-2">
                      {landmark.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="location_on" className="text-[14px]" />
                        {landmark.distance}
                      </span>
                      {'rating' in landmark && landmark.rating && (
                        <span className="flex items-center gap-1 text-primary">
                          <MaterialIcon name="star" className="text-[14px]" />
                          {landmark.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="flex-1 h-full min-h-0 rounded-2xl overflow-hidden border border-outline-variant relative bg-surface-container-lowest shadow-inner">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage: `url('${images.exploreMapBg}')`,
              filter: 'grayscale(80%) sepia(20%) hue-rotate(180deg) brightness(40%) contrast(120%)',
            }}
          />
          <div className="absolute inset-0 bg-dongson-pattern opacity-20 pointer-events-none" />

          <div className="absolute top-md left-md bg-surface-container-high/80 backdrop-blur-sm border border-outline-variant px-4 py-2 rounded-full flex items-center gap-2 z-20">
            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(68,219,213,0.8)] animate-pulse" />
            <span className="font-label-sm text-label-sm text-on-surface">Đang quét khu vực...</span>
          </div>

          <div className="absolute right-md bottom-md flex flex-col gap-sm z-20">
            <button
              type="button"
              className="w-10 h-10 bg-surface/80 backdrop-blur-md border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors shadow-lg"
            >
              <MaterialIcon name="add" />
            </button>
            <button
              type="button"
              className="w-10 h-10 bg-surface/80 backdrop-blur-md border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors shadow-lg"
            >
              <MaterialIcon name="remove" />
            </button>
            <button
              type="button"
              className="w-10 h-10 mt-2 bg-secondary/20 backdrop-blur-md border border-secondary rounded-full flex items-center justify-center text-secondary hover:bg-secondary/40 transition-colors shadow-[0_0_15px_rgba(68,219,213,0.3)]"
            >
              <MaterialIcon name="near_me" />
            </button>
          </div>

          <Link
            to="/explore/dai-noi-hue"
            className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-secondary marker-glow shadow-[0_0_15px_rgba(68,219,213,1)] border-2 border-background z-10" />
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-max bg-surface/90 backdrop-blur-md border border-secondary px-3 py-1.5 rounded-lg shadow-lg">
                <span className="font-title-md text-[14px] text-on-surface">Đại Nội Huế</span>
              </div>
            </div>
          </Link>

          <Link
            to="/explore/chua-thien-mu"
            className="absolute top-[30%] left-[60%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary/70 border border-primary z-10 group-hover:scale-125 transition-transform" />
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-max bg-surface-container border border-outline-variant px-2 py-1 rounded-md shadow-lg">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Lăng Tự Đức</span>
              </div>
            </div>
          </Link>

          <Link
            to="/explore/thang-long"
            className="absolute top-[70%] left-[45%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary/70 border border-primary z-10 group-hover:scale-125 transition-transform" />
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity w-max bg-surface-container border border-outline-variant px-2 py-1 rounded-md shadow-lg">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Hoàng Thành Thăng Long</span>
              </div>
            </div>
          </Link>
        </section>
      </main>
    </AppLayout>
  )
}
