// src/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type MyBadge, type ProfileMe } from '../features/profile/api'
import { gamificationApi, type QuestProgress } from '../features/gamification/api'
import { locationsApi, type Location } from '../features/locations/api'
import { discoveriesApi } from '../features/gamification/api'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { ProgressSummaryCard } from '../features/gamification/ProgressSummaryCard'
import { normalizeHeritageName } from '../features/explore/vietnamMap'
import { viralApi, type UserCreation } from '../features/viral/api'

type ProfileTab = 'overview' | 'passport'

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'passport', label: 'Hộ chiếu & Huy hiệu' },
]

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [badges, setBadges] = useState<MyBadge[]>([])
  const [quests, setQuests] = useState<QuestProgress[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [visitedCount, setVisitedCount] = useState(0)
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  const [creations, setCreations] = useState<UserCreation[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    profileApi.me().then(setProfile).catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
    profileApi.myBadges().then(setBadges).catch(() => setBadges([]))
    gamificationApi.myQuests().then(setQuests).catch(() => setQuests([]))
    locationsApi.list({ size: 50 }).then(setLocations).catch(() => setLocations([]))
    discoveriesApi.visitedLocations().then((d) => setVisitedCount(d.visitedLocationIds.length)).catch(() => setVisitedCount(0))
    viralApi.myCreations().then(setCreations).catch(() => setCreations([]))
  }, [showToast])

  const completedQuests = useMemo(
    () => quests.filter((q) => q.status === 'completed'),
    [quests],
  )

  const passportStamps = useMemo(() => {
    const locById = new Map(locations.map((l) => [l.id, l]))
    const stampedLocationIds = new Set(completedQuests.map((q) => q.locationId))
    const stamped = locations
      .filter((l) => stampedLocationIds.has(l.id))
      .map((l) => {
        const quest = completedQuests.find((q) => q.locationId === l.id)
        return { location: l, completedAt: quest?.completedAt }
      })
    const unstamped = locations.filter((l) => !stampedLocationIds.has(l.id))
    return { stamped, unstamped, locById }
  }, [locations, completedQuests])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Hồ sơ" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full">
        {!profile && (
          <div className="space-y-md">
            <div className="h-40 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
            <p className="text-on-surface-variant text-sm">Đang tải hồ sơ...</p>
          </div>
        )}
        {profile && (
          <>
            <div className="flex gap-md border-b border-neutral-200 mb-md overflow-x-auto">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 pb-sm px-xs font-title-md text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-lg relative overflow-hidden">
            <div className="absolute -top-20 -right-10 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="grid md:grid-cols-3 gap-md items-center relative pb-md border-b border-outline-variant/40">
              <div className="flex items-center gap-md md:col-span-2">
                <img
                  src={profile.avatarUrl || images.profileAvatar}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-primary shadow-[0_0_24px_rgba(242,191,80,0.30)]"
                />
                <div>
                  <h1 className="font-display-lg text-on-surface leading-none">{profile.displayName}</h1>
                  <p className="text-on-surface-variant">{profile.email}</p>
                  <div className="flex flex-wrap gap-xs mt-xs">
                    <span className="inline-flex px-xs py-[2px] text-xs rounded-full border border-secondary/40 text-secondary">
                      Level {profile.level} {profile.levelName ? `· ${profile.levelName}` : ''}
                    </span>
                    <span className="inline-flex px-xs py-[2px] text-xs rounded-full border border-outline-variant text-on-surface-variant">
                      {profile.role === 'ADMIN'
                        ? 'Quản trị'
                        : profile.role === 'TEACHER'
                          ? 'Giáo viên'
                          : profile.role === 'ORG_MEMBER'
                            ? 'Thành viên tổ chức'
                            : 'Thành viên'}
                    </span>
                    {profile.role === 'ADMIN' && (
                      <span className="inline-flex px-xs py-[2px] text-xs rounded-full border border-primary/40 bg-primary/10 text-primary">
                        Admin · xem trước toàn bộ
                      </span>
                    )}
                    <span className={`inline-flex px-xs py-[2px] text-xs rounded-full border ${
                      profile.tier === 'PREMIUM'
                        ? 'border-primary text-primary'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}>
                      {profile.tier === 'PREMIUM' ? 'Premium' : 'Miễn phí'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="md:justify-self-end">
                <Link to="/leaderboard" className="inline-flex items-center gap-2 px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10">
                  <MaterialIcon name="leaderboard" className="text-sm" /> Bảng xếp hạng
                </Link>
              </div>
            </div>

            <div className="mt-md">
              <ProgressSummaryCard />
            </div>

            {typeof profile.levelProgressPercent === 'number' && (
              <div className="mt-md">
                <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                  <span>Tiến độ cấp độ</span>
                  <span>
                    {profile.totalPoints} XP
                    {typeof profile.pointsToNextLevel === 'number' ? ` · còn ${profile.pointsToNextLevel} XP` : ''}
                  </span>
                </div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                    style={{ width: `${Math.min(100, profile.levelProgressPercent)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-md grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-sm">
              <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                <MaterialIcon name="star" className="text-primary mx-auto mb-xs" />
                <p className="text-[36px] leading-tight font-bold">{profile.totalPoints}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">XP</p>
              </div>
              <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                <MaterialIcon name="map" className="text-secondary mx-auto mb-xs" />
                <p className="text-[36px] leading-tight font-bold">{completedQuests.length}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Quests</p>
              </div>
              <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                <MaterialIcon name="location_on" className="text-tertiary mx-auto mb-xs" />
                <p className="text-[36px] leading-tight font-bold">{visitedCount}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Sites</p>
              </div>
            </div>

            <div className="mt-md flex flex-wrap gap-sm">
              <Link to="/leaderboard" className="inline-flex items-center gap-1 px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10">
                <MaterialIcon name="leaderboard" className="text-sm" /> Bảng xếp hạng
              </Link>
              <Link to="/artifacts" className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant rounded-lg hover:border-secondary">
                <MaterialIcon name="history_edu" className="text-sm" /> Bộ sưu tập
              </Link>
              <Link to="/photo-frame" className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant rounded-lg hover:border-secondary">
                <MaterialIcon name="photo_camera" className="text-sm" /> Khung ảnh
              </Link>
            </div>

            <section className="mt-md border-t border-outline-variant/40 pt-md">
              <h2 className="font-title-md mb-sm inline-flex items-center gap-1">
                <MaterialIcon name="photo_library" className="text-secondary" />
                Ảnh khung của bạn
              </h2>
              {creations.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Chưa có ảnh nào.{' '}
                  <Link to="/photo-frame" className="text-secondary underline">
                    Tạo tại Khung ảnh
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                  {creations.map((c) => (
                    <Link
                      key={c.id}
                      to={`/share?creationId=${encodeURIComponent(c.id)}`}
                      className="border border-outline-variant rounded-lg overflow-hidden hover:border-secondary transition-colors"
                    >
                      <img src={c.outputUrl} alt="" className="w-full aspect-square object-cover" />
                      <p className="text-[10px] text-on-surface-variant p-1 truncate">
                        {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                        {c.shared ? ' · đã chia sẻ' : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </section>
            )}

            {activeTab === 'passport' && (
              <>
        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
          <h2 className="font-title-md mb-sm inline-flex items-center gap-1">
            <MaterialIcon name="menu_book" className="text-primary" />
            Hộ chiếu Di sản
          </h2>
          <p className="text-xs text-on-surface-variant mb-sm">Đóng dấu khi hoàn thành nhiệm vụ tại mỗi di tích.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-sm">
            {passportStamps.stamped.map(({ location, completedAt }) => (
              <Link
                key={location.id}
                to={`/explore/${location.id}`}
                className="border border-secondary/50 rounded-xl overflow-hidden bg-secondary/5 hover:border-secondary transition-colors"
              >
                {location.coverImage ? (
                  <img src={location.coverImage} alt="" className="h-20 w-full object-cover" />
                ) : (
                  <div className="h-20 bg-surface-container-high" />
                )}
                <div className="p-2 text-center">
                  <p className="text-xs font-title-sm text-on-surface line-clamp-2">{normalizeHeritageName(location.name)}</p>
                  {completedAt && (
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      {new Date(completedAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
            {passportStamps.unstamped.slice(0, Math.max(0, 8 - passportStamps.stamped.length)).map((location) => (
              <div
                key={location.id}
                className="border border-dashed border-outline-variant rounded-xl p-sm flex flex-col items-center justify-center min-h-[7rem] opacity-50"
              >
                <MaterialIcon name="lock" className="text-on-surface-variant mb-1" />
                <p className="text-xs text-on-surface-variant">???</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-md bg-surface-container border border-outline-variant rounded-xl p-lg">
          <h2 className="font-title-md mb-sm">Huy hiệu</h2>
          <p className="text-xs text-on-surface-variant mb-sm">Thành tích & mốc khám phá (onsite, chia sẻ…).</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-sm">
            {badges.length === 0 && (
              <div className="col-span-full text-center py-xl border border-dashed border-outline-variant rounded-xl">
                <MaterialIcon name="workspace_premium" className="text-4xl text-on-surface-variant mb-sm" />
                <p className="text-on-surface-variant">Hoàn thành nhiệm vụ để nhận huy hiệu đầu tiên.</p>
                <Link to="/quests" className="inline-block mt-sm text-secondary underline">Xem nhiệm vụ</Link>
              </div>
            )}
            {badges.map((b) => (
              <div
                key={b.id}
                className={`border rounded-xl p-sm flex flex-col gap-xs ${
                  b.earned ? 'border-secondary bg-secondary/5 shadow-[0_0_12px_rgba(68,219,213,0.15)]' : 'border-outline-variant opacity-70'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
                  <MaterialIcon name={b.earned ? 'workspace_premium' : 'lock'} className={b.earned ? 'text-secondary' : 'text-on-surface-variant'} />
                </div>
                <p className="text-sm">{b.name}</p>
              </div>
            ))}
          </div>
        </section>
              </>
            )}

          </>
        )}
      </main>
    </AppLayout>
  )
}
