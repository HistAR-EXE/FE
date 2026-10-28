const FREE_DISCOVERIES = new Set([
  'cipher:hoang-cam', 'clue:ev-01', 'clue:ev-02',
  'dossier:underground-life', 'dossier:command-center',
])
const PREMIUM_DISCOVERIES = new Set([
  'cipher:two-wells', 'cipher:sandals', 'clue:ev-03', 'clue:ev-04',
  'investigation:cu-chi-conclusion', 'dossier:architecture', 'dossier:ben-duoc',
  'dossier:tunnel-rats', 'dossier:trap-warfare', 'era:1948', 'era:1968', 'era:1975',
])
export const FREE_AR_IDS = new Set(['rifle', 'compass'])
export const FREE_ARTIFACT_IDS = new Set([
  'art-uh1a', 'art-m48', 'art-m113-2', 'art-coi-60', 'art-rocket-10',
  'art-howitzer-105-2', 'art-mk82-30', 'art-mk82-29', 'art-mk82-16', 'art-mk82-28',
])
export const FREE_ONLINE_QUEST_IDS = new Set([
  '33333333-3333-3333-3333-333333333334',
  '33333333-3333-3333-3333-333333333336',
])
export const isPremiumDiscovery = (key: string) => PREMIUM_DISCOVERIES.has(key)
export const isFreeDiscovery = (key: string) => FREE_DISCOVERIES.has(key)
export const isFreeAr = (id: string) => FREE_AR_IDS.has(id)
export const isFreeArtifact = (id: string) => FREE_ARTIFACT_IDS.has(id)
export const isPremiumOnlineQuest = (id: string, track: string) => track === 'ONLINE' && !FREE_ONLINE_QUEST_IDS.has(id)
