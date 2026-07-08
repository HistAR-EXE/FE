import { type APIRequestContext, expect } from '@playwright/test'
import { ADMIN_USER, BE_URL, SEED, TEST_HOOK_SECRET } from './constants'
import { authHeaders, login, registerFreshUser, unwrap } from './api'
import { expectStatus } from './errors'

export type PublicPricing = {
  b2cPremiumPriceVnd: number
  chatFreeDailyLimit: number
  orgPlans: Array<{ planType: string; priceVnd: number }>
}

export type AdminBillingSettings = {
  b2cPremiumPriceVnd: number
  chatFreeDailyLimit: number
  orgVolumeDiscountPercent: number
  orgVolumeDiscountMinLicenses: number
}

export async function loginAsAdmin(request: APIRequestContext) {
  return login(request, ADMIN_USER)
}

export async function getPublicPricing(request: APIRequestContext): Promise<PublicPricing> {
  return unwrap(
    await request.get(`${BE_URL}/api/billing/public-pricing`),
  )
}

export async function getAdminBillingSettings(
  request: APIRequestContext,
  adminToken: string,
): Promise<AdminBillingSettings> {
  return unwrap(
    await request.get(`${BE_URL}/api/admin/billing/settings`, {
      headers: authHeaders(adminToken),
    }),
  )
}

export async function setB2cPremiumPrice(
  request: APIRequestContext,
  adminToken: string,
  b2cPremiumPriceVnd: number,
): Promise<AdminBillingSettings> {
  return unwrap(
    await request.patch(`${BE_URL}/api/admin/billing/settings`, {
      headers: authHeaders(adminToken),
      data: { b2cPremiumPriceVnd },
    }),
  )
}

export function assertQrUrlAmount(qrUrl: string, amountVnd: number) {
  expect(qrUrl).toMatch(new RegExp(`amount=${amountVnd}(?:&|$)`))
}

export async function getCuChiCharacterId(request: APIRequestContext): Promise<string> {
  const chars = await unwrap<Array<{ id: string }>>(
    await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`),
  )
  expect(chars.length, 'Củ Chi seed phải có ít nhất 1 character').toBeGreaterThan(0)
  return chars[0].id
}

export async function sendChatMessage(
  request: APIRequestContext,
  token: string,
  characterId: string,
  message: string,
) {
  return request.post(`${BE_URL}/api/chat/messages`, {
    headers: authHeaders(token),
    data: { characterId, message },
    timeout: 120_000,
  })
}

/** Gửi đủ `limit` tin nhắn chat thành công để làm cạn quota FREE hàng ngày. */
export async function exhaustFreeDailyChatQuota(
  request: APIRequestContext,
  token: string,
  characterId: string,
  limit = 10,
) {
  for (let i = 1; i <= limit; i += 1) {
    const res = await sendChatMessage(request, token, characterId, `E2E quota msg ${i}: kể về Củ Chi`)
    await unwrap(await res)
  }
}

export type OrgCcuSetup = {
  teacher: Awaited<ReturnType<typeof registerFreshUser>>
  inviteCode: string
  orgId: string
}

export async function createMicroOrgWithInvite(request: APIRequestContext): Promise<OrgCcuSetup> {
  const teacher = await registerFreshUser(request)
  const orgName = `CCU E2E ${Date.now()}`
  const status = await unwrap<{ organizationId?: string }>(
    await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(teacher.token),
      data: { orgName, planType: 'MICRO', contactEmail: teacher.email },
    }),
  )
  const invite = await unwrap<{ inviteCode: string }>(
    await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
  )
  const profile = await unwrap<{ orgId: string }>(
    await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
  )
  return {
    teacher,
    inviteCode: invite.inviteCode,
    orgId: status.organizationId ?? profile.orgId,
  }
}

/** Lấp đầy CCU org MICRO (max 15): teacher + `extraStudents` học sinh heartbeat. */
export async function fillOrgCcuSlots(
  request: APIRequestContext,
  setup: OrgCcuSetup,
  extraStudents: number,
): Promise<Array<Awaited<ReturnType<typeof registerFreshUser>>>> {
  const students: Array<Awaited<ReturnType<typeof registerFreshUser>>> = []

  const teacherHb = await request.post(`${BE_URL}/api/org/ccu/heartbeat`, {
    headers: authHeaders(setup.teacher.token),
    failOnStatusCode: false,
  })
  expect(teacherHb.ok(), `teacher heartbeat: ${await teacherHb.text()}`).toBeTruthy()

  for (let i = 0; i < extraStudents; i += 1) {
    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: { inviteCode: setup.inviteCode },
      }),
    )
    const hb = await request.post(`${BE_URL}/api/org/ccu/heartbeat`, {
      headers: authHeaders(student.token),
      failOnStatusCode: false,
    })
    expect(hb.ok(), `student ${i + 1} heartbeat: ${await hb.text()}`).toBeTruthy()
    students.push(student)
  }

  return students
}

export async function joinOrgAndHeartbeat(
  request: APIRequestContext,
  inviteCode: string,
  expectOk: boolean,
) {
  const user = await registerFreshUser(request)
  await unwrap(
    await request.post(`${BE_URL}/api/org/join`, {
      headers: authHeaders(user.token),
      data: { inviteCode },
    }),
  )
  const hb = await request.post(`${BE_URL}/api/org/ccu/heartbeat`, {
    headers: authHeaders(user.token),
    failOnStatusCode: false,
  })
  if (expectOk) {
    expect(hb.ok(), await hb.text()).toBeTruthy()
  } else {
    await expectStatus(hb, 403)
    const body = (await hb.json()) as { code?: string }
    expect(body.code).toBe('CCU_LIMIT_EXCEEDED')
  }
  return user
}

export async function getPremiumFrameId(request: APIRequestContext): Promise<string> {
  const frames = await unwrap<Array<{ id: string; requiresPremium?: boolean }>>(
    await request.get(`${BE_URL}/api/photo-frames`),
  )
  const locked = frames.find((f) => f.requiresPremium)
  expect(locked, 'seed phải có ít nhất 1 khung Premium').toBeTruthy()
  return locked!.id
}

export async function getFreeFrameId(request: APIRequestContext): Promise<string> {
  const frames = await unwrap<Array<{ id: string; requiresPremium?: boolean }>>(
    await request.get(`${BE_URL}/api/photo-frames`),
  )
  const free = frames.find((f) => !f.requiresPremium)
  expect(free, 'seed phải có ít nhất 1 khung miễn phí').toBeTruthy()
  return free!.id
}

export async function createPremiumOrgTeacher(request: APIRequestContext) {
  const teacher = await registerFreshUser(request)
  const orgName = `Premium Org ${Date.now()}`
  await unwrap(
    await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(teacher.token),
      data: { orgName, planType: 'PREMIUM', contactEmail: teacher.email },
    }),
  )
  return teacher
}

export async function createStandardOrgTeacher(request: APIRequestContext) {
  const teacher = await registerFreshUser(request)
  const orgName = `Standard Org ${Date.now()}`
  await unwrap(
    await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(teacher.token),
      data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
    }),
  )
  return teacher
}

export async function setOrgQuotaUsed(
  request: APIRequestContext,
  orgId: string,
  usedAiQueries: number,
) {
  const res = await request.post(`${BE_URL}/api/test/org/${orgId}/quota`, {
    headers: { 'X-Test-Hook-Secret': TEST_HOOK_SECRET },
    data: { usedAiQueries },
    failOnStatusCode: false,
  })
  if (res.status() === 404) {
    return false
  }
  expect(res.ok(), `setOrgQuotaUsed failed: ${await res.text()}`).toBeTruthy()
  return true
}

export type RemoteQuest = {
  id: string
  locationId: string
  requireOnsiteCheckin?: boolean
  stepDiscoveryKeys?: string
}

/** Heritage seed quests — step keys not exposed on public QuestResponse. */
const SEED_REMOTE_QUEST_CATALOG: RemoteQuest[] = [
  {
    id: '44444444-4444-4444-4444-444444444401',
    locationId: '22222222-2222-2222-2222-222222222201',
    requireOnsiteCheckin: false,
    stepDiscoveryKeys: 'artifact:ben-nha-rong-rong-mai,era:2026,artifact:ben-nha-rong-vali-may',
  },
]

const CU_CHI_REMOTE_STEP_KEYS = 'hotspot:vent,artifact:bay'

export async function findRemoteQuest(
  request: APIRequestContext,
  locationId?: string,
): Promise<RemoteQuest | null> {
  const page = await unwrap<{ items: Array<{ id: string; locationId: string; requireOnsiteCheckin?: boolean }> }>(
    await request.get(`${BE_URL}/api/quests`, { params: { size: 50 } }),
  )
  const remote = page.items.find(
    (q) =>
      q.requireOnsiteCheckin === false && (locationId == null || q.locationId === locationId),
  )
  if (!remote) {
    return null
  }
  const catalog = SEED_REMOTE_QUEST_CATALOG.find((q) => q.id === remote.id)
  if (catalog) {
    return catalog
  }
  if (remote.locationId === SEED.cuChiLocationId) {
    return {
      id: remote.id,
      locationId: remote.locationId,
      requireOnsiteCheckin: false,
      stepDiscoveryKeys: CU_CHI_REMOTE_STEP_KEYS,
    }
  }
  return {
    id: remote.id,
    locationId: remote.locationId,
    requireOnsiteCheckin: false,
  }
}

/** Returns a remote quest with step keys — uses seed catalog or creates via admin API. */
export async function ensureRemoteQuest(
  request: APIRequestContext,
  locationId: string = SEED.benNhaRongLocationId,
): Promise<RemoteQuest> {
  if (locationId !== SEED.cuChiLocationId) {
    const existing = await findRemoteQuest(request, locationId)
    if (existing?.stepDiscoveryKeys) {
      return existing
    }
  }

  const stepKeys =
    locationId === SEED.cuChiLocationId
      ? CU_CHI_REMOTE_STEP_KEYS
      : 'artifact:ben-nha-rong-rong-mai,era:2026,artifact:ben-nha-rong-vali-may'

  const admin = await loginAsAdmin(request)
  const created = await unwrap<{
    id: string
    locationId: string
    stepDiscoveryKeys?: string
    requireOnsiteCheckin?: boolean
  }>(
    await request.post(`${BE_URL}/api/admin/quests`, {
      headers: authHeaders(admin.token),
      data: {
        locationId,
        title: `E2E Remote ${Date.now()}`,
        description: 'E2E remote quest for LMS/roster tests',
        story: 'E2E',
        pointsReward: 50,
        requiredOrder: 99,
        completionTrigger: 'discovery',
        requireOnsiteCheckin: false,
        stepsTotal: stepKeys.split(',').length,
        stepDiscoveryKeys: stepKeys,
      },
    }),
  )
  return {
    id: created.id,
    locationId: created.locationId,
    requireOnsiteCheckin: false,
    stepDiscoveryKeys: created.stepDiscoveryKeys ?? stepKeys,
  }
}

export async function setOrgTrialExpired(request: APIRequestContext, orgId: string) {
  const res = await request.post(`${BE_URL}/api/test/org/${orgId}/expire-trial`, {
    headers: { 'X-Test-Hook-Secret': TEST_HOOK_SECRET },
    failOnStatusCode: false,
  })
  if (res.status() === 404) {
    return false
  }
  expect(res.ok(), `setOrgTrialExpired failed: ${await res.text()}`).toBeTruthy()
  return true
}

export async function setOrgInviteExpired(request: APIRequestContext, orgId: string) {
  const res = await request.post(`${BE_URL}/api/test/org/${orgId}/invite-expire`, {
    headers: { 'X-Test-Hook-Secret': TEST_HOOK_SECRET },
    failOnStatusCode: false,
  })
  if (res.status() === 404) {
    return false
  }
  expect(res.ok(), `setOrgInviteExpired failed: ${await res.text()}`).toBeTruthy()
  return true
}

export async function completeRemoteQuest(
  request: APIRequestContext,
  token: string,
  quest: RemoteQuest,
) {
  const headers = authHeaders(token)
  await request.post(`${BE_URL}/api/quests/${quest.id}/start`, { headers })
  const keys = (quest.stepDiscoveryKeys ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  for (const unlockKey of keys) {
    const res = await request.post(`${BE_URL}/api/me/discoveries`, {
      headers,
      data: { locationId: quest.locationId, unlockKey, source: 'e2e-test' },
    })
    expect(res.ok(), `discovery ${unlockKey}: ${await res.text()}`).toBeTruthy()
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const progress = await unwrap<{ status: string }>(
      await request.get(`${BE_URL}/api/quests/${quest.id}/progress`, { headers }),
    )
    if (/completed/i.test(progress.status)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Remote quest ${quest.id} did not complete after discovery steps`)
}
