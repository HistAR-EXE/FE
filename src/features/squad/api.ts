import { getData, httpClient } from '../../shared/api/httpClient'
import { appEnv } from '../../shared/config/env'
import { getToken } from '../../shared/auth/session'

export type SquadMemberState = {
  userId: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
  stationCode: string | null
  progressPercent: number | null
  progressLabel: string | null
}

export type SquadMe = {
  id: string
  code: string
  siteCode: string | null
  leaderUserId: string
  createdAt: string
  members: SquadMemberState[]
}

export type SquadCreated = {
  id: string
  code: string
  siteCode: string | null
  leaderUserId: string
  createdAt: string
  memberCount: number
}

export const squadApi = {
  create: (siteCode?: string) =>
    getData<SquadCreated>(httpClient.post('/api/squads', siteCode ? { siteCode } : {})),
  join: (code: string) => getData<SquadCreated>(httpClient.post('/api/squads/join', { code })),
  me: () => getData<SquadMe>(httpClient.get('/api/squads/me')),
}

export function squadWebSocketUrl(squadId: string): string | null {
  const token = getToken()
  if (!token) return null
  const base = (appEnv.apiUrl || '').trim()
  const origin =
    base.length > 0
      ? base.replace(/^http/i, 'ws')
      : typeof window !== 'undefined'
        ? window.location.origin.replace(/^http/i, 'ws')
        : ''
  if (!origin) return null
  const params = new URLSearchParams({ token, squadId })
  return `${origin}/ws/squad?${params.toString()}`
}
