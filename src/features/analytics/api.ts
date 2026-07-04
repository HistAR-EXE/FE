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
