// src/features/admin/analyticsDemo.ts
import type {
  PoiUnlockRateItem,
  QuestFunnelItem,
  OnlineOfflineConversion,
  JourneyDropOffItem,
  PoiHeatmapItem,
  SessionQualityMetrics,
} from './api'

export const ANALYTICS_DEMO_LOCATION = '11111111-1111-1111-1111-111111111111'

export type AnalyticsOverview = {
  locationId: string
  poiUnlockRates: PoiUnlockRateItem[]
  questFunnel: QuestFunnelItem[]
  onlineToOnsite: OnlineOfflineConversion
  journeyDropOff: JourneyDropOffItem[]
  poiHeatmap: PoiHeatmapItem[]
  sessionQuality: SessionQualityMetrics
  journeyNote: string
}

/** Pitch demo fallback when DB has no traffic yet. */
export function analyticsDemoOverview(locationId: string): AnalyticsOverview {
  return {
    locationId,
    poiUnlockRates: [
      { unlockKey: 'scene:kitchen', name: 'Bếp Hoàng Cầm', unlockCount: 42, unlockRatePct: 100 },
      { unlockKey: 'scene:meeting', name: 'Phòng họp', unlockCount: 38, unlockRatePct: 90.5 },
      { unlockKey: 'era:1968', name: 'Cedar Falls 1968', unlockCount: 35, unlockRatePct: 83.3 },
      { unlockKey: 'era:2026', name: 'Hiện tại 2026', unlockCount: 40, unlockRatePct: 95.2 },
      { unlockKey: 'hotspot:vent', name: 'Lỗ thông hơi', unlockCount: 11, unlockRatePct: 26.2 },
    ],
    questFunnel: [
      {
        questId: 'demo-quest-1',
        title: 'Bí ẩn Địa đạo',
        started: 28,
        completed: 19,
        completionRatePct: 67.9,
        completionRule: 'checkin_with_discovery_steps',
      },
    ],
    journeyDropOff: [
      { poiName: 'Bếp Hoàng Cầm', unlockKey: 'scene:kitchen', sessionCount: 42, dropOffPct: 12 },
      { poiName: 'Phòng họp', unlockKey: 'scene:meeting', sessionCount: 38, dropOffPct: 20 },
    ],
    poiHeatmap: [
      { unlockKey: 'scene:kitchen', name: 'Bếp Hoàng Cầm', visitCount: 42, unlockCount: 42, avgDwellMs: null, dropOffHotspot: false },
      { unlockKey: 'hotspot:vent', name: 'Lỗ thông hơi', visitCount: 11, unlockCount: 11, avgDwellMs: null, dropOffHotspot: true },
    ],
    onlineToOnsite: {
      usersWithDiscovery: 45,
      usersWithCheckin: 22,
      usersDiscoveryThenCheckin: 18,
      conversionRatePct: 40,
    },
    sessionQuality: { avgDurationMinutes: 12, avgDiscoveriesPerSession: 4.2 },
    journeyNote: 'Journey từ visit_sessions — demo data',
  }
}

export function useDemoAnalytics(empty: boolean): boolean {
  if (import.meta.env.VITE_ANALYTICS_DEMO === 'true') return true
  return empty
}
