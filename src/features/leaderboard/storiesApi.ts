import { getData, httpClient } from '../../shared/api/httpClient'

export type JourneyMoment = { id: string; title: string; description: string; occurredAt: string | null; href: string; icon: string }
export type JourneyPath = { id: string; title: string; description: string; completed: number; total: number; percent: number; href: string; actionLabel: string; complete: boolean }
export type SpotlightLeader = { userId: string; displayName: string; avatarUrl: string | null; count: number; currentUser: boolean }
export type AchievementSpotlight = { id: string; title: string; description: string; unit: string; leaders: SpotlightLeader[]; totalAchievers: number; viewerCount: number; viewerRank: number | null }
export type HonorsStories = { userId: string; timeline: JourneyMoment[]; paths: JourneyPath[]; spotlights: AchievementSpotlight[]; updatedAt: string }

const nonnegative = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 2000
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
// Stories may only navigate to known in-app destinations. Never render an arbitrary server URL.
const safeHref = (value: unknown): value is string => typeof value === 'string'
  && /^\/(?:profile|explore)(?:\?[a-zA-Z0-9_=&%.-]+)?(?:#[a-zA-Z0-9_-]+)?$/.test(value)

export async function loadHonorsStories(groupId?: string | null): Promise<HonorsStories> {
  const data = await getData<HonorsStories>(httpClient.get('/api/leaderboard/stories', {
    params: { scope: 'all', groupId: groupId || undefined }, timeout: 20000,
  }))
  if (!data || !text(data.userId) || !date(data.updatedAt)
    || !Array.isArray(data.timeline) || data.timeline.length > 80
    || !Array.isArray(data.paths) || data.paths.length > 5
    || !Array.isArray(data.spotlights) || data.spotlights.length > 4
    || !data.timeline.every(item => item && text(item.id) && text(item.title) && text(item.description)
      && (item.occurredAt === null || date(item.occurredAt)) && safeHref(item.href) && text(item.icon))
    || !data.paths.every(item => item && text(item.id) && text(item.title) && text(item.description)
      && nonnegative(item.completed) && nonnegative(item.total) && item.total > 0 && item.completed <= item.total
      && nonnegative(item.percent) && item.percent <= 100 && typeof item.complete === 'boolean'
      && item.complete === (item.completed === item.total) && safeHref(item.href) && text(item.actionLabel))
    || !data.spotlights.every(item => item && text(item.id) && text(item.title) && text(item.description) && text(item.unit)
      && nonnegative(item.totalAchievers) && nonnegative(item.viewerCount)
      && (item.viewerRank === null || (nonnegative(item.viewerRank) && item.viewerRank > 0))
      && Array.isArray(item.leaders) && item.leaders.length <= 3 && item.leaders.every(leader => leader
        && text(leader.userId) && text(leader.displayName) && (leader.avatarUrl === null || typeof leader.avatarUrl === 'string')
        && nonnegative(leader.count) && leader.count > 0 && typeof leader.currentUser === 'boolean'))) {
    throw new Error('Chưa tải được câu chuyện hành trình đầy đủ.')
  }
  return data
}
