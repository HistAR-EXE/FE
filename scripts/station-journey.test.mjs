import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  buildStationCameraPath,
  buildStationChatPath,
  buildStationPagePath,
  buildStationStoryPath,
  readStationRouteContext,
} from '../src/features/stations/stationRoutes.ts'
import { mergeScanHistory } from '../src/features/stations/scanHistory.ts'

const context = {
  siteCode: 'cu-chi',
  stationCode: 'ST01',
  locationId: '11111111-1111-1111-1111-111111111111',
}

test('station links preserve site, station and location context', () => {
  assert.equal(buildStationPagePath(context), '/sites/cu-chi/stations/ST01/media')
  assert.equal(buildStationStoryPath(context), '/sites/cu-chi/stations/ST01/media#story')
  assert.match(buildStationChatPath(context), /station=ST01/)
  assert.match(buildStationCameraPath(context), /locationId=11111111-1111-1111-1111-111111111111/)
})

test('invalid query context is rejected instead of guessed', () => {
  assert.equal(readStationRouteContext(new URLSearchParams('site=cu-chi&station=bad')), null)
  assert.deepEqual(
    readStationRouteContext(new URLSearchParams(`site=cu-chi&station=st01&locationId=${context.locationId}`)),
    context,
  )
})

test('successful server history replaces pending rows for the same station', () => {
  const result = mergeScanHistory(
    [{ id: 'saved', locationId: context.locationId, siteCode: 'cu-chi', stationCode: 'ST01', stationName: 'Phòng họp', checkedInAt: '2026-10-21T08:30:00Z', presenceMethod: 'QR' }],
    [
      { clientUuid: 'pending-1', siteCode: 'cu-chi', stationCode: 'ST01', locationId: context.locationId, occurredAt: '2026-10-21T08:29:00Z' },
      { clientUuid: 'pending-2', siteCode: 'cu-chi', stationCode: 'ST02', locationId: context.locationId, occurredAt: '2026-10-21T08:31:00Z' },
    ],
  )
  assert.deepEqual(result.map((item) => [item.stationCode, item.status]), [['ST02', 'PENDING_SYNC'], ['ST01', 'SUCCESS']])
})

test('post-checkin actions use the station hub and no longer promise unrelated shortcuts', async () => {
  const source = await readFile(new URL('../src/features/stations/StationNextSteps.tsx', import.meta.url), 'utf8')
  assert.match(source, /Khám phá trạm/)
  assert.match(source, /Câu chuyện tại trạm/)
  assert.doesNotMatch(source, /Video & soundscape/)
  assert.doesNotMatch(source, /Cổng thời gian/)
})

test('camera upload keeps frame optional and scan result no longer links Secret Story', async () => {
  const viralApi = await readFile(new URL('../src/features/viral/api.ts', import.meta.url), 'utf8')
  const scanPage = await readFile(new URL('../src/pages/ScanPage.tsx', import.meta.url), 'utf8')
  assert.match(viralApi, /if \(input\.frameId\) formData\.append\('frameId'/)
  assert.doesNotMatch(scanPage, /Xem Secret Story/)
})

test('offline check-ins are scoped to the signed-in user and dynamic QR is not queued after expiry', async () => {
  const outbox = await readFile(new URL('../src/lib/offlineOutbox.ts', import.meta.url), 'utf8')
  const scanPage = await readFile(new URL('../src/pages/ScanPage.tsx', import.meta.url), 'utf8')
  assert.match(outbox, /ownerUserId/)
  assert.match(outbox, /where\('ownerUserId'\)\.equals\(ownerUserId\)/)
  assert.match(scanPage, /if \(!station\.staticQr\)/)
})

test('station changes cancel an in-flight chat and clear stale station content', async () => {
  const chatPage = await readFile(new URL('../src/pages/ChatPage.tsx', import.meta.url), 'utf8')
  const stationPage = await readFile(new URL('../src/pages/StationMediaDemoPage.tsx', import.meta.url), 'utf8')
  assert.match(chatPage, /chatRequestAbortRef\.current\?\.abort\(\)/)
  assert.match(chatPage, /chatScopeRef\.current !== requestScopeKey/)
  assert.match(stationPage, /setStation\(null\)/)
  assert.match(stationPage, /setChapter\(null\)/)
})
