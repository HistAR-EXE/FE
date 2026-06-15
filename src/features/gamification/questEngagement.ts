import { recordDiscoveryEngagement } from './discoveryRouting'

/** Record a quest step discovery after meaningful engagement (online + authenticated). */
export async function recordQuestStepEngagement(
  unlockKey: string,
  locationId: string,
  source: 'map' | 'artifact' | 'time_portal' | 'tour_panorama' | 'hotspot_info' = 'map',
): Promise<void> {
  if (!unlockKey || !locationId) return
  await recordDiscoveryEngagement({
    recordKey: unlockKey,
    locationId,
    source,
  })
}

/** Parse `questRecord` search param (quest step unlock key). */
export function questRecordFromSearch(params: URLSearchParams): string | null {
  return params.get('questRecord') ?? params.get('missionStep')
}
