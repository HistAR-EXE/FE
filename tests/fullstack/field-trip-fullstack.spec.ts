import { expect, test } from '@playwright/test'
import {
  accounts,
  authHeaders,
  CAMPAIGN_ID,
  data,
  LOCATION_ID,
  login,
  ORG_ID,
  QUEST_ID,
  signInPage,
  SITE,
} from './fixtures.ts'

type Trip = {
  id: string
  joinCode: string
  status: string
  siteConfirmationStatus: string
  rowVersion: number
}

type Group = { id: string; name: string; memberCount: number }

type Report = {
  tripId: string
  status: string
  generatedAt: string
  groups: Array<{ name: string; headcount: number; stationsCompleted: number; points: number }>
}

test('teacher, site, and learner produce isolated live progress and an immutable report snapshot', async ({ request, page }) => {
  const teacher = await login(request, accounts.teacher)
  const tripManager = await login(request, accounts.tripManager)
  const learner = await login(request, accounts.learner)
  const now = Date.now()
  const visitStart = new Date(now - 10 * 60_000).toISOString()
  const visitEnd = new Date(now + 60 * 60_000).toISOString()

  let trip = await data<Trip>(await request.post('/api/teacher/field-trips', {
    headers: authHeaders(teacher),
    data: { orgId: ORG_ID, siteCode: SITE, title: 'Chuyến full-stack', visitStart, visitEnd, questId: QUEST_ID, campaignId: CAMPAIGN_ID },
  }))
  const group = await data<Group>(await request.post(`/api/teacher/field-trips/${trip.id}/groups`, {
    headers: authHeaders(teacher),
    data: { name: 'Nhóm full-stack', participationMode: 'SHARED_DEVICE', declaredSize: 28 },
  }))

  trip = await data<Trip>(await request.post(`/api/teacher/field-trips/${trip.id}/request-confirmation`, {
    headers: authHeaders(teacher), data: { rowVersion: trip.rowVersion },
  }))
  expect(trip).toMatchObject({ status: 'PENDING_SITE', siteConfirmationStatus: 'PENDING' })
  trip = await data<Trip>(await request.post(`/api/site-workspaces/${SITE}/field-trips/${trip.id}/confirm`, {
    headers: authHeaders(tripManager), data: { rowVersion: trip.rowVersion },
  }))

  const preview = await data<{ groups: Group[] }>(await request.get(`/api/field-trips/join/${trip.joinCode}`, {
    headers: authHeaders(learner),
  }))
  expect(preview.groups).toContainEqual(expect.objectContaining({ id: group.id, name: 'Nhóm full-stack' }))
  const joined = await data<Group>(await request.post('/api/field-trips/join', {
    headers: authHeaders(learner), data: { code: trip.joinCode, groupId: group.id },
  }))
  expect(joined.memberCount).toBe(1)

  trip = await data<Trip>(await request.post(`/api/teacher/field-trips/${trip.id}/start`, {
    headers: authHeaders(teacher), data: { rowVersion: trip.rowVersion },
  }))
  expect(trip.status).toBe('ACTIVE')

  const qr = await data<{ payload: string }>(await request.get(
    `/api/site-workspaces/${SITE}/stations/ST01/qr?static=true`, { headers: authHeaders(tripManager) },
  ))
  const checkin = await data<{ success: boolean; xpEarned: number }>(await request.post('/api/checkins', {
    headers: authHeaders(learner),
    data: { locationId: LOCATION_ID, stationCode: 'ST01', qrPayload: qr.payload, presenceMethod: 'QR' },
  }))
  expect(checkin.success).toBe(true)

  const live = await data<{ tripId: string; rows: Array<{ groupName: string; headcount: number; stationsCompleted: number; points: number }> }>(
    await request.get(`/api/teacher/field-trips/${trip.id}/live-board`, { headers: authHeaders(teacher) }),
  )
  expect(live.tripId).toBe(trip.id)
  expect(live.rows).toEqual([
    expect.objectContaining({ groupName: 'Nhóm full-stack', headcount: 28, stationsCompleted: 1 }),
  ])
  expect(live.rows[0].points).toBeGreaterThan(0)

  const other = await data<Trip>(await request.post('/api/teacher/field-trips', {
    headers: authHeaders(teacher),
    data: { orgId: ORG_ID, siteCode: SITE, title: 'Chuyến cô lập', visitStart, visitEnd, questId: QUEST_ID, campaignId: CAMPAIGN_ID },
  }))
  await data(await request.post(`/api/teacher/field-trips/${other.id}/groups`, {
    headers: authHeaders(teacher),
    data: { name: 'Nhóm không liên quan', participationMode: 'SHARED_DEVICE', declaredSize: 9 },
  }))
  const isolated = await data<{ rows: Array<{ groupName: string }> }>(
    await request.get(`/api/teacher/field-trips/${trip.id}/live-board`, { headers: authHeaders(teacher) }),
  )
  expect(isolated.rows.map((row) => row.groupName)).toEqual(['Nhóm full-stack'])

  trip = await data<Trip>(await request.post(`/api/teacher/field-trips/${trip.id}/complete`, {
    headers: authHeaders(teacher), data: { rowVersion: trip.rowVersion },
  }))
  expect(trip.status).toBe('COMPLETED')
  const report = await data<Report>(await request.get(`/api/teacher/field-trips/${trip.id}/report`, {
    headers: authHeaders(teacher),
  }))
  expect(report.groups).toEqual([
    expect.objectContaining({ name: 'Nhóm full-stack', headcount: 28, stationsCompleted: 1, points: live.rows[0].points }),
  ])
  expect(JSON.stringify(report)).not.toMatch(/fullstack-learner|@histar\.test|photo/i)

  await request.post('/api/checkins', {
    headers: authHeaders(learner),
    data: { locationId: LOCATION_ID, stationCode: 'ST01', qrPayload: qr.payload, presenceMethod: 'QR', clientUuid: 'e2000000-0000-4000-8000-000000000099' },
  })
  const stored = await data<Report>(await request.get(`/api/teacher/field-trips/${trip.id}/report`, {
    headers: authHeaders(teacher),
  }))
  expect(stored).toEqual(report)

  await signInPage(page, teacher)
  await page.goto(`/teacher/trips/${trip.id}/report`)
  const row = page.locator('tbody tr', { hasText: 'Nhóm full-stack' })
  await expect(row.locator('td').nth(2)).toHaveText('28')
  await expect(row.locator('td').nth(3)).toHaveText('1')
  await expect(page.getByText('Nhóm không liên quan')).toHaveCount(0)
})
