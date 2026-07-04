export type UnlockedArtifact = {
  id: string
  name: string
  imageUrl: string | null
  unlockKey: string
}

export type QuestProgressSnapshot = {
  questId: string
  title: string
  locationId?: string
  locationName?: string
  stepCompleted: boolean
  questCompleted: boolean
  currentStep: number
  stepsTotal: number
  pointsAwarded: number
}

export type EngagementOutcome = {
  recorded?: boolean
  xpEarned: number
  newArtifacts: UnlockedArtifact[]
  questProgress: QuestProgressSnapshot | null
  newlyUnlockedLocations?: LocationSummary[]
}

export type LocationSummary = {
  id: string
  name: string
  coverImage?: string
  unlockNarrative?: string | null
}

export type RecordDiscoveryResponse = EngagementOutcome & {
  recorded: boolean
}

export type CheckinEngagementResponse = EngagementOutcome & {
  success: boolean
  distanceMeters: number
  questsCompleted: string[]
  badgesEarned: { id: string; name: string; iconUrl?: string | null }[]
  secretUnlocked: boolean
  bonusXpAwarded: number
}
