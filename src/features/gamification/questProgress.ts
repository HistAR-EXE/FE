import type { QuestProgress } from './api'

export function isReadyToStart(progress: QuestProgress): boolean {
  if (progress.status !== 'not_started') return false
  if (progress.completionTrigger === 'discovery') return true
  const isSimpleQuest = (progress.stepsTotal ?? 1) <= 1
  return progress.hasCheckinAtLocation === true
    && (isSimpleQuest || progress.discoveryStepsComplete === true)
}
