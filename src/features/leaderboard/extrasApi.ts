import { getData, httpClient } from '../../shared/api/httpClient'

export type ExplorerPassport = {
  userId: string; displayName: string; totalPoints: number; level: number; levelName: string; badgeCount: number
  heritageBadges: { id: string; earnedAt: string | null }[]; generatedAt: string
}
export type CommunityFootprint = {
  scope: string; explorers: number; completedChallenges: number; discoveries: number; badges: number; updatedAt: string
}
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
export async function loadPassport(): Promise<ExplorerPassport> {
  const data = await getData<ExplorerPassport>(httpClient.get('/api/leaderboard/passport', { timeout: 20000 }))
  if (!data || typeof data.userId !== 'string' || typeof data.displayName !== 'string' || !count(data.totalPoints)
    || !count(data.level) || data.level < 1 || typeof data.levelName !== 'string' || !count(data.badgeCount)
    || !date(data.generatedAt) || !Array.isArray(data.heritageBadges) || data.heritageBadges.length > 9
    || !data.heritageBadges.every(badge => badge && typeof badge.id === 'string' && (badge.earnedAt === null || date(badge.earnedAt)))) {
    throw new Error('Chưa tải được thành tích để tạo hộ chiếu.')
  }
  return data
}
export async function loadCommunity(groupId?: string | null): Promise<CommunityFootprint> {
  const data = await getData<CommunityFootprint>(httpClient.get('/api/leaderboard/community', {
    params: { scope: 'all', groupId: groupId || undefined }, timeout: 20000,
  }))
  if (!data || data.scope !== (groupId ? 'group' : 'all') || !date(data.updatedAt)
    || ![data.explorers, data.completedChallenges, data.discoveries, data.badges].every(count)) {
    throw new Error('Chưa tải được dấu ấn cộng đồng.')
  }
  return data
}
