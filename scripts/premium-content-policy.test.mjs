import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isFreeAr, isFreeArtifact, isPremiumDiscovery, isPremiumOnlineQuest } from '../src/shared/access/premiumContentPolicy.ts'

test('free and premium discovery matrix', () => {
  for (const key of ['cipher:hoang-cam', 'clue:ev-01', 'clue:ev-02', 'dossier:underground-life', 'dossier:command-center'])
    assert.equal(isPremiumDiscovery(key), false, key)
  for (const key of ['cipher:two-wells', 'cipher:sandals', 'clue:ev-03', 'clue:ev-04', 'investigation:cu-chi-conclusion', 'dossier:architecture', 'dossier:ben-duoc', 'dossier:tunnel-rats', 'dossier:trap-warfare', 'era:1975'])
    assert.equal(isPremiumDiscovery(key), true, key)
})

test('two AR models and ten artifacts are free', () => {
  assert.equal(isFreeAr('rifle'), true)
  assert.equal(isFreeAr('compass'), true)
  assert.equal(isFreeAr('other'), false)
  for (const id of ['art-uh1a', 'art-m48', 'art-m113-2', 'art-coi-60', 'art-rocket-10', 'art-howitzer-105-2', 'art-mk82-30', 'art-mk82-29', 'art-mk82-16', 'art-mk82-28'])
    assert.equal(isFreeArtifact(id), true, id)
  assert.equal(isFreeArtifact('art-mig17'), false)
})

test('online quests are restricted but onsite remains free', () => {
  assert.equal(isPremiumOnlineQuest('33333333-3333-3333-3333-333333333334', 'ONLINE'), false)
  assert.equal(isPremiumOnlineQuest('33333333-3333-3333-3333-333333333336', 'ONLINE'), false)
  assert.equal(isPremiumOnlineQuest('33333333-3333-3333-3333-333333333333', 'ONLINE'), true)
  assert.equal(isPremiumOnlineQuest('33333333-3333-3333-3333-333333333340', 'ONSITE'), false)
})

test('every free model ID exists in the published catalogs', () => {
  const artifacts = readFileSync(new URL('../src/pages/ArtifactsPage.tsx', import.meta.url), 'utf8')
  const ar = JSON.parse(readFileSync(new URL('../src/features/ar/ar-catalog.json', import.meta.url), 'utf8'))
  for (const id of ['art-uh1a', 'art-m48', 'art-m113-2', 'art-coi-60', 'art-rocket-10', 'art-howitzer-105-2', 'art-mk82-30', 'art-mk82-29', 'art-mk82-16', 'art-mk82-28'])
    assert.match(artifacts, new RegExp(`id: '${id}'`), id)
  const arIds = new Set(ar.map(item => item.id))
  assert.equal(arIds.has('rifle'), true)
  assert.equal(arIds.has('compass'), true)
})

test('frontend discovery and free quest policy stays aligned with backend', () => {
  const backend = readFileSync(new URL('../../BE/src/main/java/com/histar/be/profile/service/PremiumContentPolicy.java', import.meta.url), 'utf8')
  const frontend = readFileSync(new URL('../src/shared/access/premiumContentPolicy.ts', import.meta.url), 'utf8')
  const keys = text => [...text.matchAll(/["']((?:era|cipher|clue|investigation|dossier):[^"']+)["']/g)].map(match => match[1]).sort()
  const premiumFrontend = frontend.split('const PREMIUM_DISCOVERIES')[1].split('export const FREE_AR_IDS')[0]
  assert.deepEqual(keys(premiumFrontend), keys(backend))
  const ids = text => [...text.matchAll(/33333333-3333-3333-3333-33333333333[46]/g)].map(match => match[0]).sort()
  assert.deepEqual(ids(frontend), ids(backend))
})
