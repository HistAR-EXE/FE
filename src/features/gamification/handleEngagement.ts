import type { EngagementOutcome } from './engagementTypes'
import { XP_LABELS, formatXpToast } from '../../shared/ui/xpToast'
import { analyticsApi } from '../analytics/api'
import { dispatchLocationUnlocked } from '../explore/locationUnlock'

export function notifyEngagementOutcome(
  outcome: EngagementOutcome,
  showToast: (opts: { message: string; type?: 'success' | 'error' | 'info' }) => void,
  applyEngagement: (outcome: EngagementOutcome) => void,
  options?: { locationId?: string; visitSessionId?: string; engagementKind?: 'checkin' | 'discovery' },
) {
  applyEngagement(outcome)

  if (outcome.newlyUnlockedLocations && outcome.newlyUnlockedLocations.length > 0) {
    dispatchLocationUnlocked(outcome.newlyUnlockedLocations.map((l) => l.id))
    for (const loc of outcome.newlyUnlockedLocations) {
      showToast({ message: `🗺️ Di tích mới: ${loc.name} đã mở khoá!`, type: 'success' })
    }
  }

  if (outcome.questProgress?.questCompleted) {
    void analyticsApi.recordEvent({
      locationId: options?.locationId,
      visitSessionId: options?.visitSessionId,
      eventType: 'QUEST_COMPLETED',
      eventKey: outcome.questProgress.questId,
      source: 'engagement',
      metadata: {
        questId: outcome.questProgress.questId,
        xpEarned: outcome.xpEarned,
      },
    })
  }

  if (outcome.xpEarned > 0) {
    const label =
      options?.engagementKind === 'checkin'
        ? XP_LABELS.checkin
        : outcome.questProgress?.questCompleted
          ? XP_LABELS.questComplete
          : outcome.questProgress?.stepCompleted
            ? XP_LABELS.questStep
            : outcome.newArtifacts.length > 0
              ? XP_LABELS.artifact
              : XP_LABELS.discovery
    showToast(formatXpToast(outcome.xpEarned, label))
  } else if (outcome.questProgress?.stepCompleted && !outcome.questProgress.questCompleted) {
    showToast({ message: `Nhiệm vụ: bước ${outcome.questProgress.currentStep} hoàn thành`, type: 'info' })
  } else if (outcome.recorded) {
    showToast(formatXpToast(0, XP_LABELS.discovery))
  }
}
