import { getData, httpClient } from '../../shared/api/httpClient'

export type HonorsEntry = {
  rank: number | null
  userId: string
  displayName: string
  avatarUrl: string | null
  totalPoints: number
  currentUser: boolean
  level: number
  badgeCount: number
}
export type HonorsBoard = {
  scope: 'all' | 'group' | 'school' | 'city'
  city: string | null
  entries: HonorsEntry[]
  viewer: HonorsEntry
  nearby: HonorsEntry[]
  totalParticipants: number
  updatedAt: string
  displayLimit?: number
  cutoffXp?: number | null
  omittedTiedAtCutoff?: number
}

function validEntry(value: unknown): value is HonorsEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as HonorsEntry
  return typeof entry.userId === 'string' && typeof entry.displayName === 'string'
    && (entry.avatarUrl === null || typeof entry.avatarUrl === 'string')
    && (entry.rank === null || (Number.isSafeInteger(entry.rank) && entry.rank > 0))
    && Number.isSafeInteger(entry.totalPoints) && entry.totalPoints >= 0
    && Number.isSafeInteger(entry.level) && entry.level > 0
    && Number.isSafeInteger(entry.badgeCount) && entry.badgeCount >= 0
    && typeof entry.currentUser === 'boolean'
}

export async function loadHonors(groupId?: string | null): Promise<HonorsBoard> {
  const data = await getData<HonorsBoard>(httpClient.get('/api/leaderboard', { params: { scope: 'all', groupId: groupId || undefined }, timeout: 20000 }))
  // A malformed/older server response must never become a fake empty success.
  if (!data || !Array.isArray(data.entries) || !Array.isArray(data.nearby) || !validEntry(data.viewer)
      || !data.entries.every(validEntry) || !data.nearby.every(validEntry)
      || !Number.isSafeInteger(data.totalParticipants) || data.totalParticipants < 0
      || typeof data.updatedAt !== 'string'
      || (data.displayLimit !== undefined && data.displayLimit !== 10)
      || (data.cutoffXp !== undefined && data.cutoffXp !== null && (!Number.isSafeInteger(data.cutoffXp) || data.cutoffXp < 0))
      || (data.omittedTiedAtCutoff !== undefined && (!Number.isSafeInteger(data.omittedTiedAtCutoff) || data.omittedTiedAtCutoff < 0))) {
    throw new Error('Chưa tải được bảng vinh danh đầy đủ. Vui lòng thử lại sau.')
  }
  return data
}
