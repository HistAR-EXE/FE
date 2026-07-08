import { type Page } from '@playwright/test'
import { STORAGE_KEYS } from './constants'
import { type LoginResult } from './api'

/**
 * Bơm phiên đăng nhập + app mode vào localStorage TRƯỚC khi app FE khởi động,
 * để test UI vào thẳng route được bảo vệ mà không phải điều khiển form login mỗi lần.
 */
export async function seedSession(
  page: Page,
  session: LoginResult & { orgId?: string | null; orgSubscription?: string },
  opts: { mode?: 'online' | 'offline'; emailVerified?: boolean } = {},
) {
  const keys = STORAGE_KEYS
  const mode = opts.mode ?? 'online'
  const emailVerified = opts.emailVerified !== false
  await page.addInitScript(
    ({ keys, session, mode, emailVerified }) => {
      localStorage.setItem(keys.token, session.token)
      localStorage.setItem(keys.userId, session.userId || 'e2e-user')
      localStorage.setItem(keys.displayName, session.displayName || 'E2E Tester')
      if (session.role) localStorage.setItem(keys.role, session.role)
      if (session.tier) localStorage.setItem(keys.tier, session.tier)
      if (session.orgId) localStorage.setItem('timelens_org_id', session.orgId)
      if (session.orgSubscription) localStorage.setItem('timelens_org_subscription', session.orgSubscription)
      localStorage.setItem('timelens_email_verified', emailVerified ? '1' : '0')
      localStorage.setItem(keys.mode, mode)
    },
    { keys, session, mode, emailVerified },
  )
}
