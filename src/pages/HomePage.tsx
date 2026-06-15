import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomeTopNav } from '../components/layout/TopNav'
import { demoApi, type Ready } from '../features/demo/api'
import { profileApi, type ProfileMe } from '../features/profile/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { MaterialIcon } from '../components/ui/MaterialIcon'

const CU_CHI_HERO = '/media/cu-chi/map/hero.jpg'

export function HomePage() {
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [ready, setReady] = useState<Ready | null>(null)

  useEffect(() => {
    profileApi.me().then(setProfile).catch(() => setProfile(null))
    demoApi.ready().then(setReady).catch(() => setReady({ status: 'DOWN', database: 'DOWN' }))
  }, [])

  return (
    <AppLayout activeBorder="right" topNav={<HomeTopNav />}>
      <main className="flex-grow pt-[88px] px-xl pb-xl max-w-7xl w-full mx-auto">
        <section className="mb-xl relative rounded-xl overflow-hidden bg-surface-container border border-outline-variant p-xl flex flex-col md:flex-row items-center justify-between gap-xl glow-primary">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="z-10 flex flex-col gap-sm max-w-lg">
            <span className="px-3 py-1 rounded-full bg-primary-container/20 border border-primary text-primary font-label-sm text-label-sm uppercase tracking-wider w-fit">
              Danh hiệu hiện tại
            </span>
            <h1 className="font-display-lg text-display-lg text-on-surface">{profile?.levelName ?? `Level ${profile?.level ?? 1}`}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {profile ? `${profile.displayName}, bạn đang có ${profile.totalPoints} điểm. Tiếp tục hành trình để mở khóa thêm phần thưởng.` : 'Đang tải dữ liệu hồ sơ...'}
            </p>
          </div>
          <div className="z-10 w-full md:w-1/3 flex flex-col gap-md bg-surface/50 p-lg rounded-lg border border-outline-variant backdrop-blur-sm">
            <div className="flex justify-between items-end">
              <span className="font-title-md text-title-md text-secondary text-glow-secondary">Cấp độ {profile?.level ?? 1}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {(profile?.totalPoints ?? 0).toLocaleString()} điểm
              </span>
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden relative border border-outline-variant">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${profile?.levelProgressPercent ?? 20}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant">Readiness: API {ready?.status ?? '...'} · DB {ready?.database ?? '...'}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
          <div className="lg:col-span-2 flex flex-col gap-lg">
            <div className="flex justify-between items-center">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Tiếp tục khám phá</h2>
              <Link to="/explore" className="font-title-md text-title-md text-secondary flex items-center gap-1">
                Xem tất cả <MaterialIcon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Link
                to={`/explore/${CU_CHI_LOCATION_ID}`}
                className="group relative rounded-xl overflow-hidden h-64 cursor-pointer border border-outline-variant hover:border-secondary transition-all duration-300 glow-secondary"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                <img
                  src={CU_CHI_HERO}
                  alt="Địa đạo Củ Chi"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'
                  }}
                />
                <div className="absolute bottom-0 left-0 w-full p-lg z-20 flex flex-col gap-sm">
                  <h3 className="font-title-md text-title-md text-on-surface">Địa đạo Củ Chi</h3>
                  <p className="text-xs text-on-surface-variant">Khu di tích lịch sử — MVP HistAR</p>
                </div>
              </Link>
              <Link to="/quests" className="group relative rounded-xl overflow-hidden h-64 cursor-pointer border border-outline-variant hover:border-primary transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                <img src="/media/cu-chi/scenes/bep-hoang-cam-2026.jpg" alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <div className="absolute inset-0 bg-surface-container/40" />
                <div className="absolute bottom-0 left-0 w-full p-lg z-20 flex flex-col gap-sm">
                  <h3 className="font-title-md text-title-md text-on-surface">Hành trình dưới lòng đất</h3>
                  <p className="text-xs text-on-surface-variant">Nhiệm vụ chính tại Củ Chi</p>
                </div>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-xl">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-md">
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="assignment_turned_in" className="text-secondary" />
                Lối tắt nhanh
              </h2>
              <Link to="/scan" className="flex items-center justify-between p-md rounded-lg bg-surface-container-highest border border-outline-variant hover:border-secondary">
                <span>Check-in QR/GPS</span>
                <MaterialIcon name="arrow_forward" className="text-secondary" />
              </Link>
              <Link to="/photo-frame" className="flex items-center justify-between p-md rounded-lg bg-surface-container-highest border border-outline-variant hover:border-primary">
                <span>Tạo Photo Frame</span>
                <MaterialIcon name="arrow_forward" className="text-primary" />
              </Link>
              <Link to="/leaderboard" className="flex items-center justify-between p-md rounded-lg bg-surface-container-highest border border-outline-variant hover:border-secondary">
                <span>Bảng xếp hạng</span>
                <MaterialIcon name="arrow_forward" className="text-secondary" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  )
}

