import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChatPageContext, pageContextKey } from '../src/features/chat/pageContext.ts'

const context = (pathname, query = '') =>
  buildChatPageContext({ pathname, search: query }, new URLSearchParams(query))

const cases = [
  ['/', 'OVERVIEW'],
  ['/about', 'OVERVIEW'],
  ['/explore', 'EXPLORE'],
  ['/scan', 'STATION_CHECKIN'],
  ['/sites/cu-chi/stations/ST01/media', 'STATION_MEDIA'],
  ['/sites/cu-chi/stations/ST01/game/quiz', 'QUESTS'],
  ['/quests', 'QUESTS'],
  ['/quests/q-1', 'QUESTS'],
  ['/quests/q-1/play/game-1', 'QUESTS'],
  ['/artifacts', 'ARTIFACTS'],
  ['/artifacts/a-1', 'ARTIFACTS'],
  ['/tour/360/location-1', 'TOUR_360'],
  ['/diorama/location-1', 'DIORAMA'],
  ['/time-portal/location-1', 'TIME_PORTAL'],
  ['/ar-experience', 'AR'],
  ['/photo-frame', 'PHOTO_MEMORY'],
  ['/share', 'PHOTO_MEMORY'],
  ['/pack-prep', 'OFFLINE_LITE'],
  ['/settings', 'TROUBLESHOOTING'],
  ['/chat', 'CHAT_AI'],
  ['/chat/chrono', 'CHAT_AI'],
]

test('maps current end-user product routes to stable feature keys', () => {
  for (const [route, featureKey] of cases) {
    assert.equal(context(route)?.featureKey, featureKey, route)
  }
})

test('normalizes station site/code and does not claim check-in', () => {
  assert.deepEqual(
    context('/chat', '?site=CU-CHI&station=st01&locationId=11111111-1111-1111-1111-111111111111'),
    {
      featureKey: 'STATION_MEDIA',
      route: '/sites/cu-chi/stations/ST01/media',
      siteCode: 'cu-chi',
      stationCode: 'ST01',
    },
  )
})

test('explicit source route wins over the chat route', () => {
  assert.deepEqual(context('/chat', '?from=%2Fexplore'), {
    featureKey: 'EXPLORE',
    route: '/explore',
  })
  assert.equal(context('/chat', '?from=explore')?.featureKey, 'EXPLORE')
})

test('unknown and retired routes emit no feature context', () => {
  assert.equal(context('/something-unknown'), null)
  assert.equal(context('/secret/11111111-1111-1111-1111-111111111111'), null)
  assert.equal(context('/explore/11111111-1111-1111-1111-111111111111'), null)
})

test('station route changes produce a new conversation scope key', () => {
  const st01 = context('/chat', '?site=cu-chi&station=ST01&locationId=11111111-1111-1111-1111-111111111111')
  const st02 = context('/chat', '?site=cu-chi&station=ST02&locationId=11111111-1111-1111-1111-111111111111')
  assert.notEqual(pageContextKey(st01), pageContextKey(st02))
})

