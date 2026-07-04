import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { EngagementOutcome, UnlockedArtifact, LocationSummary } from '../../features/gamification/engagementTypes'
import { QuestCompleteOverlay } from '../../components/gamification/QuestCompleteOverlay'
import { ArtifactUnlockModal } from '../../components/gamification/ArtifactUnlockModal'

type UserProgressState = {
  totalXpDelta: number
  unlockedArtifacts: UnlockedArtifact[]
}

type QuestCompleteState = {
  quest: NonNullable<EngagementOutcome['questProgress']>
  newlyUnlockedLocations: LocationSummary[]
}

type UserProgressContextValue = {
  state: UserProgressState
  applyEngagement: (outcome: EngagementOutcome) => void
}

const UserProgressContext = createContext<UserProgressContextValue | null>(null)

export function UserProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserProgressState>({ totalXpDelta: 0, unlockedArtifacts: [] })
  const [artifactModal, setArtifactModal] = useState<UnlockedArtifact[] | null>(null)
  const [questComplete, setQuestComplete] = useState<QuestCompleteState | null>(null)

  const applyEngagement = useCallback((outcome: EngagementOutcome) => {
    if (outcome.xpEarned > 0 || outcome.newArtifacts.length > 0) {
      setState((prev) => ({
        totalXpDelta: prev.totalXpDelta + outcome.xpEarned,
        unlockedArtifacts: [...prev.unlockedArtifacts, ...outcome.newArtifacts],
      }))
    }
    if (outcome.newArtifacts.length > 0) {
      setArtifactModal(outcome.newArtifacts)
    }
    if (outcome.questProgress?.questCompleted) {
      setQuestComplete({
        quest: outcome.questProgress,
        newlyUnlockedLocations: outcome.newlyUnlockedLocations ?? [],
      })
    }
  }, [])

  const value = useMemo(() => ({ state, applyEngagement }), [state, applyEngagement])

  return (
    <UserProgressContext.Provider value={value}>
      {children}
      {artifactModal && artifactModal.length > 0 && (
        <ArtifactUnlockModal artifacts={artifactModal} onClose={() => setArtifactModal(null)} />
      )}
      {questComplete && (
        <QuestCompleteOverlay
          quest={questComplete.quest}
          newlyUnlockedLocations={questComplete.newlyUnlockedLocations}
          onClose={() => setQuestComplete(null)}
        />
      )}
    </UserProgressContext.Provider>
  )
}

export function useUserProgress() {
  const ctx = useContext(UserProgressContext)
  if (!ctx) {
    throw new Error('useUserProgress must be used within UserProgressProvider')
  }
  return ctx
}
