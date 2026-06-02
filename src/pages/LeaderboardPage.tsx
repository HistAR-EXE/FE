import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { viralApi, type LeaderboardResponse } from '../features/viral/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function LeaderboardPage() {
  const [scope, setScope] = useState<'all' | 'city' | 'week'>('all')
  const [city, setCity] = useState('TP.HCM')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const { showToast } = useToast()
  const podium = data?.entries.slice(0, 3) ?? []
  const others = data?.entries.slice(3) ?? []
  const currentUserEntry = data?.entries.find((entry) => entry.currentUser) ?? null

  useEffect(() => {
    if (scope === 'city' && !city.trim()) {
      return
    }
    viralApi
      .leaderboard(scope, scope === 'city' ? city.trim() : undefined)
      .then((res) => setData(res))
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'leaderboard'), type: 'error' }))
  }, [scope, city, showToast])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav showSearch />}>
      <main className="mt-16 p-lg max-w-5xl mx-auto w-full">
        <Link to="/home" className="inline-flex items-center gap-1 text-secondary mb-sm">
          <MaterialIcon name="arrow_back" className="text-sm" />
          Quay về trang chủ
        </Link>
        <h1 className="font-display-lg text-primary mb-xs uppercase tracking-wider">Bảng Vinh Danh</h1>
        <p className="text-on-surface-variant mb-md">Những nhà du hành xuất sắc nhất trong kỷ nguyên Neo-Heritage.</p>

        <div className="flex items-center gap-lg border-b border-outline-variant/50 mb-lg">
          {(['all', 'city', 'week'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`pb-sm font-title-md transition-colors border-b-2 ${
                scope === s ? 'text-secondary border-secondary' : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              {s === 'city' ? 'Thành phố' : s === 'week' ? 'Tuần này' : 'Mọi lúc'}
            </button>
          ))}
        </div>
        {scope === 'city' && (
          <>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="neo-input rounded px-sm py-xs mb-xs" />
            {!city.trim() && <p className="text-xs text-red-400 mb-md">Vui lòng nhập city khi chọn scope=city.</p>}
          </>
        )}

        {podium.length > 0 && (
          <div className="flex items-end justify-center gap-md mb-lg">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((entry) => {
              const isTop1 = entry.rank === 1
              return (
                <div
                  key={entry.userId}
                  className={`relative rounded-t-xl border bg-surface-container px-md pb-md pt-lg text-center ${
                    isTop1
                      ? 'h-52 w-44 border-primary shadow-[0_0_20px_rgba(242,191,80,0.25)]'
                      : 'h-44 w-40 border-outline-variant'
                  }`}
                >
                  <img
                    src={entry.avatarUrl || (entry.rank === 1 ? images.leaderboardRank1 : entry.rank === 2 ? images.leaderboardRank2 : images.leaderboardRank3)}
                    alt={entry.displayName}
                    className={`w-16 h-16 rounded-full object-cover border-2 mx-auto -mt-10 mb-xs ${isTop1 ? 'border-primary' : 'border-secondary/60'}`}
                  />
                  {isTop1 && (
                    <span className="absolute top-2 left-1/2 -translate-x-1/2 text-primary">
                      <MaterialIcon name="crown" />
                    </span>
                  )}
                  <p className={`font-title-md ${isTop1 ? 'text-primary' : 'text-on-surface'}`}>#{entry.rank}</p>
                  <p className="font-title-md">{entry.displayName}</p>
                  <p className={`text-sm ${isTop1 ? 'text-primary' : 'text-secondary'}`}>{entry.totalPoints.toLocaleString()} XP</p>
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-sm">
          {others.map((entry) => (
            <div
              key={entry.userId}
              className={`p-md border rounded-xl bg-surface-container flex items-center justify-between ${
                entry.currentUser ? 'border-secondary bg-secondary/10 shadow-[0_0_20px_rgba(68,219,213,0.2)]' : 'border-outline-variant'
              }`}
            >
              <div className="flex items-center gap-sm">
                <span className={`font-title-md w-8 ${entry.currentUser ? 'text-secondary' : 'text-on-surface'}`}>{entry.rank}</span>
                <img
                  src={entry.avatarUrl || images.leaderboardRank3}
                  alt={entry.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                />
                <p className={`font-title-md ${entry.currentUser ? 'text-secondary' : 'text-on-surface'}`}>{entry.currentUser ? 'Bạn' : entry.displayName}</p>
              </div>
              <p className={`font-title-md ${entry.currentUser ? 'text-secondary' : 'text-on-surface'}`}>{entry.totalPoints.toLocaleString()} XP</p>
            </div>
          ))}
          {!others.length && currentUserEntry && (
            <div className="p-md border border-secondary rounded-xl bg-secondary/10 shadow-[0_0_20px_rgba(68,219,213,0.2)] flex items-center justify-between">
              <p className="font-title-md text-secondary">{currentUserEntry.rank}. Bạn</p>
              <p className="font-title-md text-secondary">{currentUserEntry.totalPoints.toLocaleString()} XP</p>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  )
}

