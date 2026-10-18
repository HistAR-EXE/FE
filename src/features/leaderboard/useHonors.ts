import { useEffect, useRef, useState, useCallback } from 'react'
import { loadHonors, type HonorsBoard } from './api'
import { exploreApi, type ExploreSnapshot } from '../explore/api'
import { DISCOVERY_RECORDED_EVENT } from '../gamification/discoveryRouting'
import { loadHonorsStories, type HonorsStories } from './storiesApi'
import { loadPassport, loadCommunity, type ExplorerPassport, type CommunityFootprint } from './extrasApi'

type Result = { key: string; board: HonorsBoard | null; error: string | null }

export function useHonors(userId?: string, groupId?: string | null) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [personalResult, setPersonalResult] = useState<{ key: string; snapshot: ExploreSnapshot | null } | null>(null)
  const [storiesResult, setStoriesResult] = useState<{ key: string; stories: HonorsStories | null } | null>(null)
  const [passportResult, setPassportResult] = useState<{ key: string; data: ExplorerPassport | null } | null>(null)
  const [communityResult, setCommunityResult] = useState<{ key: string; data: CommunityFootprint | null } | null>(null)
  const lastRefresh = useRef(0)
  const key = `${userId ?? ''}:${groupId ?? ''}:${revision}`
  const refresh = useCallback(() => { lastRefresh.current = Date.now(); setRevision(n => n + 1) }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    void loadHonors(groupId).then(board => {
      if (!active) return
      if (board.viewer.userId !== userId) throw new Error('Unexpected account in leaderboard response')
      setResult({ key, board, error: null })
    }).catch(() => {
      if (active) setResult({ key, board: null, error: 'Chưa thể tải bảng vinh danh. Thành tích đã lưu của bạn vẫn được giữ nguyên.' })
    })
    // Personal milestones cannot hold up an otherwise available community board.
    void exploreApi.readSnapshot().then(snapshot => {
      if (active) setPersonalResult({ key, snapshot: snapshot.profile.id === userId ? snapshot : null })
    }).catch(() => {
      if (active) setPersonalResult({ key, snapshot: null })
    })
    void loadHonorsStories(groupId).then(stories => {
      if (active) setStoriesResult({ key, stories: stories.userId === userId ? stories : null })
    }).catch(() => {
      if (active) setStoriesResult({ key, stories: null })
    })
    void loadPassport().then(data => {
      if (active) setPassportResult({ key, data: data.userId === userId ? data : null })
    }).catch(() => { if (active) setPassportResult({ key, data: null }) })
    void loadCommunity(groupId).then(data => {
      if (active) setCommunityResult({ key, data })
    }).catch(() => { if (active) setCommunityResult({ key, data: null }) })
    return () => { active = false }
  }, [userId, groupId, key])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 15000) refresh() }
    window.addEventListener(DISCOVERY_RECORDED_EVENT, refresh)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(DISCOVERY_RECORDED_EVENT, refresh)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  // Owner + scope + request revision isolate stale responses and account switches.
  const current = result?.key === key ? result : null
  const personal = personalResult?.key === key ? personalResult : null
  const stories = storiesResult?.key === key ? storiesResult : null
  const passport = passportResult?.key === key ? passportResult : null
  const community = communityResult?.key === key ? communityResult : null
  return { board: current?.board ?? null, personal: personal?.snapshot ?? null, personalLoading: Boolean(userId) && !personal,
    stories: stories?.stories ?? null, storiesLoading: Boolean(userId) && !stories,
    storiesError: Boolean(userId) && Boolean(stories) && !stories?.stories,
    passport: passport?.data ?? null, passportLoading: Boolean(userId) && !passport,
    community: community?.data ?? null, communityLoading: Boolean(userId) && !community,
    error: current?.error ?? null, loading: Boolean(userId) && !current, refresh }
}
