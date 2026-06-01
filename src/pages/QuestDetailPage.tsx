import { Link, Navigate, useParams } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { getQuestBySlug, getQuestSteps } from '../data/mock/questsList'

export function QuestDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const quest = slug ? getQuestBySlug(slug) : undefined
  const steps = slug ? getQuestSteps(slug) : []

  if (!quest) {
    return <Navigate to="/quests" replace />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="dong-son-bg fixed inset-0 pointer-events-none z-0" />

      <header className="fixed top-0 w-full z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex items-center h-16 px-xl gap-md">
        <Link to="/quests" className="flex items-center gap-sm text-on-surface-variant hover:text-secondary transition-colors">
          <MaterialIcon name="arrow_back" />
          <span className="font-title-md text-title-md hidden sm:inline">Quay lại</span>
        </Link>
        <h2 className="font-headline-lg text-headline-lg text-on-surface flex-1 text-center sm:text-left">
          {quest.title}
        </h2>
        <button type="button" className="p-2 text-on-surface-variant hover:text-secondary rounded-full">
          <MaterialIcon name="more_vert" />
        </button>
      </header>

      <main className="relative z-10 mt-16 flex-1 max-w-3xl mx-auto w-full px-lg pb-xl">
        <div className="relative h-[512px] rounded-xl overflow-hidden mb-xl border border-outline-variant">
          <img alt={quest.title} className="w-full h-full object-cover" src={quest.image} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 left-0 p-lg w-full">
            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary text-primary font-label-sm text-label-sm">
              +{quest.xp} XP
            </span>
            <h1 className="font-display-lg text-display-lg text-on-surface mt-sm">{quest.title}</h1>
            <div className="flex gap-md mt-sm text-on-surface-variant font-label-sm text-label-sm">
              <span className="flex items-center gap-1">
                <MaterialIcon name="location_on" className="text-secondary text-sm" />
                {quest.location}
              </span>
              <span className="flex items-center gap-1">
                <MaterialIcon name="speed" className="text-primary text-sm" />
                {quest.difficulty}
              </span>
            </div>
          </div>
        </div>

        <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl">{quest.description}</p>

        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Lộ trình nhiệm vụ</h2>
        <div className="relative flex flex-col gap-0 mb-xl pl-4">
          <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-outline-variant" />
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex items-start gap-md pb-lg">
              <div
                className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  step.done
                    ? 'bg-secondary border-secondary text-on-secondary'
                    : step.locked
                      ? 'bg-surface-container border-outline-variant text-on-surface-variant/50'
                      : 'bg-surface-container border-primary text-primary'
                }`}
              >
                {step.done ? (
                  <MaterialIcon name="check" className="text-sm" />
                ) : step.locked ? (
                  <MaterialIcon name="lock" className="text-sm" />
                ) : (
                  <span className="font-title-md text-title-md text-sm">{index + 1}</span>
                )}
              </div>
              <div
                className={`flex-1 pt-2 p-md rounded-lg border ${
                  step.done
                    ? 'bg-secondary-container/10 border-secondary/30'
                    : 'bg-surface-container border-outline-variant'
                } ${step.locked ? 'opacity-50' : ''}`}
              >
                <p className="font-title-md text-title-md text-on-surface">{step.title}</p>
                <span className="font-label-sm text-label-sm text-primary">+{step.xp} XP</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-md">
          <Link
            to="/scan"
            className="flex-1 py-sm px-md rounded-lg bg-primary text-on-primary font-title-md text-title-md text-center hover:bg-primary-container transition-colors glow-primary"
          >
            Bắt đầu quét AR
          </Link>
          <Link
            to="/photo-frame"
            className="py-sm px-md rounded-lg border border-secondary text-secondary font-title-md text-title-md hover:bg-secondary/10 transition-colors"
          >
            Khung ảnh
          </Link>
        </div>
      </main>
    </div>
  )
}
