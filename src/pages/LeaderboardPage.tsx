import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { leaderboardEntries, leaderboardStats } from '../data/mock/leaderboard'

const tabs = ['Thành phố', 'Tuần', 'Mọi lúc'] as const

export function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Mọi lúc')
  const top3 = leaderboardEntries.slice(0, 3)
  const rest = leaderboardEntries.slice(3)

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Bảng xếp hạng" />}>
      <main className="mt-16 flex-1 p-lg max-w-4xl mx-auto w-full">
        <div className="text-center mb-lg">
          <h1 className="font-display-lg text-display-lg text-primary bloom-glow">Bảng xếp hạng</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
            {leaderboardStats.totalPlayers.toLocaleString()} nhà du hành • Hạng của bạn: #{leaderboardStats.yourRank}
          </p>
        </div>

        <div className="flex justify-center gap-md mb-xl border-b border-outline-variant pb-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`font-title-md text-title-md pb-1 px-3 transition-colors ${
                activeTab === tab
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-center gap-md mb-xl">
          {[top3[1], top3[0], top3[2]].map((entry, i) => {
            const heights = ['h-32', 'h-40', 'h-24']
            const gradients = ['podium-gradient-2', 'podium-gradient-1', 'podium-gradient-3']
            const medals = ['🥈', '🥇', '🥉']
            return (
              <div key={entry.rank} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden mb-sm">
                  <img alt={entry.name} className="w-full h-full object-cover" src={entry.avatar} />
                </div>
                <p className="font-title-md text-title-md text-on-surface text-sm">{entry.name}</p>
                <p className="font-label-sm text-label-sm text-primary">{entry.xp.toLocaleString()} XP</p>
                <div
                  className={`w-24 ${heights[i]} ${gradients[i]} rounded-t-lg mt-sm flex items-start justify-center pt-sm border border-outline-variant/30`}
                >
                  <span className="text-2xl">{medals[i]}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-xs">
          {rest.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-md p-md rounded-lg border border-outline-variant ${
                entry.isCurrentUser ? 'current-user-row border-secondary/50' : 'bg-surface-container'
              }`}
            >
              <span className="font-title-md text-title-md text-on-surface-variant w-8 text-center">
                #{entry.rank}
              </span>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
                <img alt={entry.name} className="w-full h-full object-cover" src={entry.avatar} />
              </div>
              <div className="flex-1">
                <p className="font-title-md text-title-md text-on-surface">
                  {entry.name}
                  {entry.isCurrentUser && (
                    <span className="ml-sm text-secondary font-label-sm text-label-sm">(Bạn)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-xs text-primary">
                <MaterialIcon name="stars" className="text-sm" />
                <span className="font-title-md text-title-md">{entry.xp.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppLayout>
  )
}
