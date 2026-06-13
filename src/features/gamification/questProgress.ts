import type { QuestProgress } from './api'

export function isReadyToStart(progress: QuestProgress): boolean {
  if (progress.status !== 'not_started') return false
  const isSimpleQuest = (progress.stepsTotal ?? 1) <= 1
  return progress.hasCheckinAtLocation === true
    && (isSimpleQuest || progress.discoveryStepsComplete === true)
}
