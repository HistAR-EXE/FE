import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomeTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { continueExploring, featuredEvent } from '../data/mock/landmarks'
import { user } from '../data/mock/user'

export function HomePage() {
  return (
    <AppLayout activeBorder="right" topNav={<HomeTopNav />}>
      <main className="flex-grow pt-[88px] px-xl pb-xl max-w-7xl w-full mx-auto">
        <section className="mb-xl relative rounded-xl overflow-hidden bg-surface-container border border-outline-variant p-xl flex flex-col md:flex-row items-center justify-between gap-xl glow-primary">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="z-10 flex flex-col gap-sm max-w-lg">
            <span className="px-3 py-1 rounded-full bg-primary-container/20 border border-primary text-primary font-label-sm text-label-sm uppercase tracking-wider w-fit">
              Danh hiệu hiện tại
            </span>
            <h1 className="font-display-lg text-display-lg text-on-surface">{user.name}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Bạn đã khám phá 15 di tích lịch sử và hoàn thành 3 chặng đường di sản. Hãy tiếp tục
              hành trình để mở khóa danh hiệu &quot;Người Bảo Vệ Thời Gian&quot;.
            </p>
          </div>
          <div className="z-10 w-full md:w-1/3 flex flex-col gap-md bg-surface/50 p-lg rounded-lg border border-outline-variant backdrop-blur-sm">
            <div className="flex justify-between items-end">
              <span className="font-title-md text-title-md text-secondary text-glow-secondary">
                Cấp độ {user.level}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {user.xpCurrent.toLocaleString()} / {user.xpMax.toLocaleString()} XP
              </span>
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden relative border border-outline-variant">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                style={{ width: '82%' }}
              >
                <div className="absolute inset-0 bg-white/20 w-full shimmer-bar" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
          <div className="lg:col-span-2 flex flex-col gap-lg">
            <div className="flex justify-between items-center">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Tiếp tục khám phá</h2>
              <Link
                to="/explore"
                className="font-title-md text-title-md text-secondary hover:text-secondary-fixed transition-colors flex items-center gap-1"
              >
                Xem tất cả <MaterialIcon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {continueExploring.map((site) => (
                <Link
                  key={site.id}
                  to={`/explore/${site.slug}`}
                  className={`group relative rounded-xl overflow-hidden h-64 cursor-pointer border border-outline-variant transition-all duration-300 transform hover:-translate-y-1 ${
                    site.slug === 'hoang-thanh-hue' ? 'hover:border-secondary glow-secondary' : 'hover:border-primary hover:glow-primary'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                  <img
                    alt={site.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={site.image}
                  />
                  <div className="absolute bottom-0 left-0 w-full p-lg z-20 flex flex-col gap-sm">
                    <div className="flex gap-2 flex-wrap">
                      {site.slug === 'hoang-thanh-hue' ? (
                        <>
                          <span className="px-2 py-0.5 rounded-full bg-surface-variant/80 border border-outline font-label-sm text-label-sm text-on-surface-variant backdrop-blur-md">
                            Triều Nguyễn
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-variant/80 border border-outline font-label-sm text-label-sm text-on-surface-variant backdrop-blur-md">
                            Kiến trúc
                          </span>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-surface-variant/80 border border-outline font-label-sm text-label-sm text-on-surface-variant backdrop-blur-md">
                          Giáo dục
                        </span>
                      )}
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface">{site.title}</h3>
                    <div className="flex items-center gap-md">
                      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full ${site.slug === 'hoang-thanh-hue' ? 'bg-secondary w-[60%]' : 'bg-primary w-[30%]'}`}
                        />
                      </div>
                      <span
                        className={`font-label-sm text-label-sm ${site.slug === 'hoang-thanh-hue' ? 'text-secondary' : 'text-primary'}`}
                      >
                        {site.progress}%
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-xl">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                <svg fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <circle className="text-primary" cx="50" cy="50" r="40" stroke="currentColor" strokeDasharray="4 4" strokeWidth="2" />
                  <circle className="text-primary" cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="assignment_turned_in" className="text-secondary" />
                Nhiệm vụ hôm nay
              </h2>
              <div className="flex flex-col gap-sm">
                <Link
                  to="/quests/co-vat-ar"
                  className="flex items-start gap-md p-md rounded-lg bg-surface-container-highest border border-outline-variant hover:border-secondary/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center border border-secondary shrink-0 group-hover:bg-secondary transition-colors">
                    <MaterialIcon name="camera_alt" className="text-sm text-secondary group-hover:text-on-secondary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-title-md text-title-md text-on-surface text-sm">Chụp ảnh cổ vật</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-1">
                      Quét 3 hiện vật bằng AR tại bảo tàng.
                    </p>
                  </div>
                  <span className="font-title-md text-title-md text-primary text-sm">+50 XP</span>
                </Link>
                <Link
                  to="/quests/bi-an-chua-cau"
                  className="flex items-start gap-md p-md rounded-lg bg-surface-container-highest border border-outline-variant hover:border-primary/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary shrink-0 group-hover:bg-primary transition-colors">
                    <MaterialIcon name="menu_book" className="text-sm text-primary group-hover:text-on-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-title-md text-title-md text-on-surface text-sm">Giải mã sử thi</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-1">
                      Hoàn thành bài trắc nghiệm về Triều Trần.
                    </p>
                  </div>
                  <span className="font-title-md text-title-md text-primary text-sm">+30 XP</span>
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-md">
              <h2 className="font-title-md text-title-md text-on-surface">Sự kiện nổi bật</h2>
              <Link
                to={`/explore/${featuredEvent.linkSlug}`}
                className="relative rounded-xl overflow-hidden h-48 border border-outline-variant flex flex-col justify-end p-md group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
                <img
                  alt={featuredEvent.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
                  src={featuredEvent.image}
                />
                <div className="z-20 flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1">
                    <MaterialIcon name="local_fire_department" className="text-[14px]" /> Đang diễn ra
                  </span>
                  <h3 className="font-title-md text-title-md text-on-surface">{featuredEvent.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-xs max-w-md">
                    {featuredEvent.description}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
