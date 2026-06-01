import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { lockedQuest, questsList } from '../data/mock/questsList'

export function QuestsPage() {
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active')

  const visibleQuests =
    tab === 'all' ? questsList : questsList.filter((q) => (tab === 'active' ? q.status === 'active' : q.status === 'completed'))

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Nhiệm vụ" />}>
      <main className="mt-16 flex-1 p-lg max-w-7xl mx-auto w-full neo-pattern">
        <div className="mb-xl">
          <h2 className="font-display-lg text-display-lg text-primary mb-md bloom-glow">Nhiệm vụ</h2>
          <div className="flex gap-md border-b border-surface-container-highest pb-sm">
            {(['active', 'completed', 'all'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`font-title-md text-title-md pb-1 px-2 transition-colors ${
                  tab === t
                    ? 'text-secondary border-b-2 border-secondary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t === 'active' ? 'Đang làm' : t === 'completed' ? 'Hoàn thành' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
          {visibleQuests.map((quest) => (
            <Link
              key={quest.slug}
              to={`/quests/${quest.slug}`}
              className="bg-surface-container rounded-xl overflow-hidden border border-primary/30 glow-primary relative group cursor-pointer transition-transform hover:-translate-y-1"
            >
              <div className="h-48 relative">
                <img alt={quest.title} className="w-full h-full object-cover" src={quest.image} />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
                <div className="absolute top-sm right-sm bg-surface-container-high/80 backdrop-blur-md px-3 py-1 rounded-full border border-primary/50 flex items-center gap-xs">
                  <MaterialIcon name="stars" className="text-primary text-[16px]" />
                  <span className="font-label-sm text-label-sm text-primary">+{quest.xp} XP</span>
                </div>
              </div>
              <div className="p-md relative z-10 -mt-10">
                <div className="flex justify-between items-end mb-sm">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface">{quest.title}</h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface px-2 py-1 rounded">
                    {quest.steps.current}/{quest.steps.total} bước
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-md">{quest.description}</p>
                <div className="flex gap-2 mb-md flex-wrap">
                  {quest.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-surface-variant/50 border border-outline-variant font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    style={{ width: `${quest.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <section className="border border-outline-variant/50 rounded-xl p-lg bg-surface-container-low relative overflow-hidden opacity-70">
          <div className="absolute inset-0 bg-dongson-pattern opacity-30 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-md">
            <div className="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
              <MaterialIcon name="lock" className="text-on-surface-variant text-2xl" />
            </div>
            <div className="flex-1">
              <h3 className="font-headline-lg text-headline-lg text-on-surface-variant">{lockedQuest.title}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant/70 mt-1">{lockedQuest.description}</p>
              <p className="font-label-sm text-label-sm text-primary mt-2 flex items-center gap-1">
                <MaterialIcon name="stars" className="text-sm" />
                +{lockedQuest.xp} XP khi mở khóa
              </p>
            </div>
            <div className="px-md py-sm rounded-lg border border-outline-variant bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
              Cần cấp {lockedQuest.requiredLevel}
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  )
}
