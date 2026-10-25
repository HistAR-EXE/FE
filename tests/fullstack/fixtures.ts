import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { STORAGE_KEYS } from '../helpers/constants.ts'

export const SITE = 'e2e-site'
export const LOCATION_ID = 'e2000000-0000-4000-8000-000000000001'
export const QUEST_ID = 'e2000000-0000-4000-8000-000000000002'
export const CAMPAIGN_ID = 'e2000000-0000-4000-8000-000000000003'
export const ORG_ID = 'e2000000-0000-4000-8000-000000000004'
export const PASSWORD = 'Fullstack@2026'

export const accounts = {
  admin: account('e2000000-0000-4000-8000-000000000011', 'fullstack-admin@histar.test', 'ADMIN'),
  candidate: account('e2000000-0000-4000-8000-000000000012', 'fullstack-manager@histar.test', 'USER'),
  editor: account('e2000000-0000-4000-8000-000000000013', 'fullstack-editor@histar.test', 'USER'),
  reviewer: account('e2000000-0000-4000-8000-000000000014', 'fullstack-reviewer@histar.test', 'USER'),
  teacher: account('e2000000-0000-4000-8000-000000000015', 'fullstack-teacher@histar.test', 'TEACHER'),
  learner: account('e2000000-0000-4000-8000-000000000016', 'fullstack-learner@histar.test', 'USER'),
  tripManager: account('e2000000-0000-4000-8000-000000000017', 'fullstack-trip-manager@histar.test', 'USER'),
} as const

type Account = ReturnType<typeof account>

type AuthSession = Account & {
  token: string
  displayName: string
  tier: string
}

type Envelope<T> = {
  success: boolean
  message?: string
  data: T
}

function account(id: string, email: string, role: 'ADMIN' | 'TEACHER' | 'USER') {
  return { id, email, role }
}

export async function login(request: APIRequestContext, person: Account): Promise<AuthSession> {
  const response = await request.post('/api/auth/login', {
    data: { email: person.email, password: PASSWORD },
  })
  expect(response.ok(), `login ${person.email}: ${await response.text()}`).toBe(true)
  const body = await response.json() as Envelope<{
    token: string
    userId: string
    displayName: string
    role: Account['role']
    tier: string
  }>
  expect(body.success).toBe(true)
  expect(body.data.userId).toBe(person.id)
  return { ...person, ...body.data }
}

export function authHeaders(session: AuthSession) {
  return { Authorization: `Bearer ${session.token}` }
}

export async function data<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  const raw = await response.text()
  expect(response.ok(), raw).toBe(true)
  const body = JSON.parse(raw) as Envelope<T>
  expect(body.success).toBe(true)
  return body.data
}

export async function signInPage(page: Page, session: AuthSession) {
  await page.goto('/privacy')
  await page.evaluate(({ session: current, storageKeys }) => {
    const values: Record<string, string> = {
      [storageKeys.token]: current.token,
      [storageKeys.userId]: current.id,
      [storageKeys.displayName]: current.displayName,
      [storageKeys.email]: current.email,
      [storageKeys.role]: current.role,
      [storageKeys.tier]: current.tier,
      timelens_email_verified: '1',
      [storageKeys.mode]: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
      sidenav_collapsed: 'false',
      'timelens:teacher-onboarding-complete': 'true',
    }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  }, { session, storageKeys: STORAGE_KEYS })
}
