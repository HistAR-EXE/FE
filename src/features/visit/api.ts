// src/features/visit/api.ts
import { getData, httpClient } from '../../shared/api/httpClient'

export type VisitSessionResponse = {
  id: string
  locationId: string
  mode: string
}

export const visitSessionsApi = {
  start: (locationId: string, mode: 'online' | 'offline' = 'online') =>
    getData<VisitSessionResponse>(
      httpClient.post('/api/me/visit-sessions/start', { locationId, mode }),
    ),
  end: (sessionId: string, reason = 'USER_EXIT') =>
    getData<void>(httpClient.patch(`/api/me/visit-sessions/${sessionId}/end`, { reason })),
}
