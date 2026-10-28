import { getData, httpClient } from '../../shared/api/httpClient'
import type { ExploreAttemptResponse } from './api'
export type ExploreVideo = {
  id: string; title: string; durationSeconds: number; xp: number
  question: string; options: string[]; watchedSeconds: number; resumeSeconds: number; ready: boolean; completed: boolean
}
export type VideoSession = { sessionId: string; watchedSeconds: number; resumeSeconds: number; ready: boolean; completed: boolean }
export const exploreVideoApi = {
  list: () => getData<{ videos: ExploreVideo[] }>(httpClient.get('/api/me/explore/videos')),
  session: (id: string) => getData<VideoSession>(httpClient.post(`/api/me/explore/videos/${id}/session`)),
  heartbeat: (id: string, sessionId: string, positionSeconds: number) => getData<VideoSession>(httpClient.post(`/api/me/explore/videos/${id}/heartbeat`, { sessionId, positionSeconds })),
  complete: (id: string, answer: number) => getData<ExploreAttemptResponse>(httpClient.post(`/api/me/explore/videos/${id}/complete`, { answer })),
}
