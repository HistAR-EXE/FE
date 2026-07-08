import { getData, httpClient } from '../../shared/api/httpClient'

export type AnalyticsEventType =
  | 'TOUR_SCENE_VIEWED'
  | 'TIME_PORTAL_ERA_VIEWED'
  | 'ARTIFACT_VIEWED'
  | 'QUEST_STEP_COMPLETED'
  | 'QUEST_COMPLETED'
  | 'CHARACTER_CHAT_STARTED'
  | 'SHARE_CREATED'
  | 'CHECKIN_SUCCESS'
  | 'PAYWALL_ERA_LOCKED_VIEW'
  | 'PAYWALL_ERA_UPGRADE_CLICK'
  | 'PAYWALL_CHAT_QUOTA_VIEW'
  | 'PAYWALL_CHAT_UPGRADE_CLICK'

export type RecordAnalyticsEventPayload = {
  locationId?: string
  visitSessionId?: string
  eventType: AnalyticsEventType
  eventKey?: string
  source?: string
  contentType?: string
  metadata?: Record<string, unknown>
}

export const analyticsApi = {
  recordEvent: (payload: RecordAnalyticsEventPayload) => {
    const body = {
      ...payload,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : undefined,
    }
    return getData<void>(httpClient.post('/api/me/analytics/events', body)).catch(() => undefined)
  },
}
