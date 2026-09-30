import { getData, getListData, httpClient } from '../../shared/api/httpClient'

export type MinigameType =
  | 'QUIZ_TIMED'
  | 'MEMORY_PAIRS'
  | 'TIMELINE_ORDER'
  | 'SPOT_DIFF'
  | 'MATCH_TERMS'
  | 'COMPASS_CHOICE'

export type Minigame = {
  id: string
  siteCode: string
  stationCode: string
  gameType: MinigameType
  title: string
  config: Record<string, unknown>
  sortOrder: number
  bestScore?: number | null
}

/** Seeded IDs (V27 Cu Chi) — fallback when linking before list fetch. */
export const SEEDED_MINIGAME_ID_BY_STATION: Record<string, string> = {
  ST01: 'b6000001-0000-4000-8000-000000000001',
  ST02: 'b6000001-0000-4000-8000-000000000002',
  ST03: 'b6000001-0000-4000-8000-000000000003',
  ST04: 'b6000001-0000-4000-8000-000000000004',
  ST05: 'b6000001-0000-4000-8000-000000000005',
  ST06: 'b6000001-0000-4000-8000-000000000006',
}

const HTTL: Record<string, string> = {
  ST01: 'b3400001-0000-4000-8000-000000000001',
  ST02: 'b3400001-0000-4000-8000-000000000002',
  ST03: 'b3400001-0000-4000-8000-000000000003',
  ST04: 'b3400001-0000-4000-8000-000000000004',
  ST05: 'b3400001-0000-4000-8000-000000000005',
  ST06: 'b3400001-0000-4000-8000-000000000006',
}

const HUE: Record<string, string> = {
  ST01: 'b3400011-0000-4000-8000-000000000001',
  ST02: 'b3400011-0000-4000-8000-000000000002',
  ST03: 'b3400011-0000-4000-8000-000000000003',
  ST04: 'b3400011-0000-4000-8000-000000000004',
  ST05: 'b3400011-0000-4000-8000-000000000005',
  ST06: 'b3400011-0000-4000-8000-000000000006',
}

export const SEEDED_MINIGAME_ID_BY_SITE_STATION: Record<string, Record<string, string>> = {
  'cu-chi': SEEDED_MINIGAME_ID_BY_STATION,
  'hoang-thanh-thang-long': HTTL,
  'dai-noi-hue': HUE,
}

export function getSeededMinigameId(siteCode: string, stationCode: string): string | undefined {
  const site = siteCode.trim().toLowerCase()
  const st = stationCode.trim().toUpperCase()
  return SEEDED_MINIGAME_ID_BY_SITE_STATION[site]?.[st] ?? SEEDED_MINIGAME_ID_BY_STATION[st]
}

export const SITE_CODE = 'cu-chi'

export const minigameApi = {
  listForStation: (siteCode: string, stationCode: string) =>
    getListData<Minigame>(
      httpClient.get(`/api/sites/${encodeURIComponent(siteCode)}/stations/${encodeURIComponent(stationCode)}/games`),
    ),

  submit: (minigameId: string, score: number) =>
    getData<{ minigameId: string; score: number; completedAt: string; newBest: boolean }>(
      httpClient.post(`/api/minigames/${minigameId}/submit`, { score }),
    ),

  myProgress: () =>
    getListData<{
      minigameId: string
      siteCode: string
      stationCode: string
      gameType: string
      title: string
      score: number
      completedAt: string
    }>(httpClient.get('/api/minigames/me/progress')),
}
