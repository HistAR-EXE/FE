export type CheckinHistoryItem = {
  id: string
  locationId: string
  siteCode: string
  stationCode: string
  stationName: string
  checkedInAt: string
  presenceMethod: string
}

export type PendingStationCheckin = {
  clientUuid: string
  siteCode: string
  stationCode: string
  locationId: string
  occurredAt: string
}

export type ScanHistoryRow = {
  id: string
  stationCode: string
  context: { siteCode: string; stationCode: string; locationId: string }
  stationName: string
  occurredAt: string
  status: 'RECOGNIZED' | 'PENDING_SYNC' | 'SUCCESS'
}

export function mergeScanHistory(
  saved: CheckinHistoryItem[],
  pending: PendingStationCheckin[],
  recognized?: PendingStationCheckin | null,
): ScanHistoryRow[] {
  const byStation = new Map<string, ScanHistoryRow>()
  for (const item of saved) {
    const stationCode = item.stationCode.trim().toUpperCase()
    byStation.set(stationCode, {
      id: item.id,
      stationCode,
      context: { siteCode: item.siteCode, stationCode, locationId: item.locationId },
      stationName: item.stationName,
      occurredAt: item.checkedInAt,
      status: 'SUCCESS',
    })
  }
  for (const item of pending) {
    const stationCode = item.stationCode.trim().toUpperCase()
    if (byStation.has(stationCode)) continue
    byStation.set(stationCode, {
      id: item.clientUuid,
      stationCode,
      context: { siteCode: item.siteCode, stationCode, locationId: item.locationId },
      stationName: `Trạm ${stationCode}`,
      occurredAt: item.occurredAt,
      status: 'PENDING_SYNC',
    })
  }
  if (recognized) {
    const stationCode = recognized.stationCode.trim().toUpperCase()
    if (!byStation.has(stationCode)) {
      byStation.set(stationCode, {
        id: recognized.clientUuid,
        stationCode,
        context: { siteCode: recognized.siteCode, stationCode, locationId: recognized.locationId },
        stationName: `Trạm ${stationCode}`,
        occurredAt: recognized.occurredAt,
        status: 'RECOGNIZED',
      })
    }
  }
  return [...byStation.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}
