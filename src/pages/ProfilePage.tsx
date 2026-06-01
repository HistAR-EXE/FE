import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { profile } from '../data/mock/profile'

export function ProfilePage() {
  const earnedBadges = profile.badges.filter((b) => b.earned).length

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Hồ sơ" />}>
      <main className="mt-16 flex-1 p-lg max-w-4xl mx-auto w-full">
        <section className="flex flex-col md:flex-row items-center gap-xl mb-xl p-xl rounded-xl bg-surface-container border border-outline-variant glow-primary">
          <div className="w-32 h-32 rounded-full border-4 border-primary overflow-hidden shrink-0">
            <img alt={profile.name} className="w-full h-full object-cover" src={profile.avatar} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display-lg text-display-lg text-on-surface">{profile.name}</h1>
            <p className="font-title-md text-title-md text-secondary mt-1">{profile.title}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm">
              Cấp {profile.level} • {profile.xpCurrent.toLocaleString()} / {profile.xpMax.toLocaleString()} XP
            </p>
            <div className="h-2 w-full max-w-md bg-surface-container-high rounded-full overflow-hidden mt-md mx-auto md:mx-0 relative">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                style={{ width: `${profile.xpPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full shimmer-bar" />
              </div>
            </div>
          </div>
          <Link
            to="/share"
            className="px-lg py-sm rounded-lg border border-secondary text-secondary font-title-md hover:bg-secondary/10 transition-colors flex items-center gap-xs"
          >
            <MaterialIcon name="share" />
            Chia sẻ
          </Link>
        </section>

        <div className="grid grid-cols-3 gap-md mb-xl">
          {[
            { label: 'XP tích lũy', value: profile.stats.xpEarned.toLocaleString(), icon: 'stars' },
            { label: 'Nhiệm vụ', value: profile.stats.questsCompleted, icon: 'assignment' },
            { label: 'Di tích', value: profile.stats.sitesVisited, icon: 'explore' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container p-md rounded-lg border border-outline-variant text-center"
            >
              <MaterialIcon name={stat.icon} className="text-primary mb-sm" />
              <p className="font-display-lg text-display-lg text-on-surface">{stat.value}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-md">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Huy hiệu</h2>
          <Link to="/leaderboard" className="font-title-md text-title-md text-secondary hover:underline flex items-center gap-1">
            Bảng xếp hạng <MaterialIcon name="arrow_forward" className="text-sm" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xl">
          {profile.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-md rounded-lg border text-center ${
                badge.earned
                  ? 'bg-primary-container/10 border-primary/30'
                  : 'bg-surface-container border-outline-variant opacity-50'
              }`}
            >
              <MaterialIcon
                name={badge.icon}
                className={`text-3xl mb-sm ${badge.earned ? 'text-primary' : 'text-on-surface-variant'}`}
              />
              <p className="font-label-sm text-label-sm text-on-surface">{badge.name}</p>
            </div>
          ))}
        </div>

        <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
          {earnedBadges}/{profile.badges.length} huy hiệu đã mở khóa
        </p>
      </main>
    </AppLayout>
  )
}
