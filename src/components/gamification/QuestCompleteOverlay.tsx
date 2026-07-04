import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import type { LocationSummary, QuestProgressSnapshot } from '../../features/gamification/engagementTypes'

type QuestCompleteOverlayProps = {
  quest: QuestProgressSnapshot
  newlyUnlockedLocations?: LocationSummary[]
  onClose: () => void
}

export function QuestCompleteOverlay({
  quest,
  newlyUnlockedLocations = [],
  onClose,
}: QuestCompleteOverlayProps) {
  const navigate = useNavigate()
  const unlocked = newlyUnlockedLocations[0]

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-md bg-black/70">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-secondary/50 p-lg text-center shadow-2xl">
        <div className="text-4xl mb-sm" aria-hidden>
          🎉
        </div>
        <h2 className="font-display-md text-secondary">Quest hoàn thành!</h2>
        <p className="font-title-md text-on-surface mt-sm">{quest.title}</p>
        <p className="text-sm text-on-surface-variant mt-xs">
          +{quest.pointsAwarded} XP • Bước {quest.stepsTotal}/{quest.stepsTotal}
        </p>

        {quest.locationName && (
          <div className="mt-md rounded-xl border border-primary/30 bg-primary/5 p-sm text-left">
            <p className="text-xs uppercase tracking-wider text-primary mb-1">Hộ chiếu Di sản</p>
            <p className="text-sm text-on-surface inline-flex items-center gap-1">
              <MaterialIcon name="verified" className="text-primary text-base" />
              Stamp: {quest.locationName}
            </p>
          </div>
        )}

        {unlocked && (
          <div className="mt-md rounded-xl border border-secondary/40 bg-secondary/5 p-sm text-left">
            <p className="text-sm text-on-surface font-title-sm inline-flex items-center gap-1">
              <MaterialIcon name="map" className="text-secondary" />
              Di tích mới đã mở khoá: {unlocked.name}
            </p>
            {unlocked.unlockNarrative && (
              <p className="text-xs text-on-surface-variant mt-1">{unlocked.unlockNarrative}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-sm mt-lg">
          {unlocked && (
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/explore/${unlocked.id}`)
              }}
              className="w-full px-4 py-2 rounded-full bg-secondary text-on-secondary font-title-sm inline-flex items-center justify-center gap-1"
            >
              <MaterialIcon name="explore" className="text-base" />
              Khám phá ngay
            </button>
          )}
          <div className="flex gap-sm justify-center">
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/explore')
              }}
              className="px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant"
            >
              Quay về Map
            </button>
            {quest.locationId && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/artifacts?locationId=${quest.locationId}`)
                }}
                className="px-4 py-2 rounded-full border border-secondary/50 text-secondary font-title-sm inline-flex items-center gap-1"
              >
                <MaterialIcon name="emoji_events" className="text-base" />
                Xem cổ vật
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
