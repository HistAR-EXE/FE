import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type MyBadge, type ProfileMe } from '../features/profile/api'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

export function ProfilePage() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [badges, setBadges] = useState<MyBadge[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    profileApi.me().then(setProfile).catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
    profileApi.myBadges().then(setBadges).catch(() => setBadges([]))
  }, [showToast])

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
                  <span className="inline-flex mt-xs px-xs py-[2px] text-xs rounded-full border border-secondary/40 text-secondary">
                    Level {profile.level} {profile.levelName ? `· ${profile.levelName}` : ''}
                  </span>
                </div>
              </div>
              <div className="md:justify-self-end">
                <Link to="/leaderboard" className="inline-flex items-center gap-2 px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10">
                  <MaterialIcon name="leaderboard" className="text-sm" /> Bảng xếp hạng
                </Link>
              </div>
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
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    style={{ width: `${Math.min(100, profile.levelProgressPercent)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-md grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-sm">
              <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                <MaterialIcon name="star" className="text-primary mx-auto mb-xs" />
                <p className="text-[36px] leading-tight font-bold">{(profile.totalPoints / 1000).toFixed(1)}k</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">XP</p>
              </div>
              <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                <MaterialIcon name="map" className="text-secondary mx-auto mb-xs" />
                <p className="text-[36px] leading-tight font-bold">{badges.filter((b) => b.earned).length * 2 || 0}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Quests</p>
              </div>
              <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                <MaterialIcon name="location_on" className="text-tertiary mx-auto mb-xs" />
                <p className="text-[36px] leading-tight font-bold">{Math.max(1, Math.ceil((profile.totalPoints || 0) / 300))}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Sites</p>
              </div>
            </div>

            <div className="mt-md flex gap-sm">
              <Link to="/artifacts" className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant rounded-lg hover:border-secondary">
                <MaterialIcon name="history_edu" className="text-sm" /> Bộ sưu tập
              </Link>
              <button onClick={logout} className="px-md py-sm border border-error text-error rounded-lg">Đăng xuất</button>
            </div>
          </section>
        )}
        <section className="mt-md">
          <h2 className="font-title-md mb-sm">Huy hiệu</h2>
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
      </main>
    </AppLayout>
  )
}

