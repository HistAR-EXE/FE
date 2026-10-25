import { expect, test, type Page } from '@playwright/test'
import { DISPOSABLE_ADMIN, mockAdminApi, seedAdminSession } from '../helpers/admin-fixtures.ts'
import { SEED, STORAGE_KEYS } from '../helpers/constants.ts'

async function openAsPremium(page: Page, focus: string) {
  await seedAdminSession(page)
  await mockAdminApi(page)
  await page.goto(`/time-portal/dia-dao-cu-chi?view=3d&era=1968&focus=${focus}`)
}

async function openAsFree(page: Page, focus: string) {
  await page.addInitScript(({ storageKeys, token }) => {
    for (const [key, value] of Object.entries({
      [storageKeys.token]: token,
      [storageKeys.userId]: 'heritage-free-user',
      [storageKeys.displayName]: 'Heritage Free User',
      [storageKeys.email]: 'heritage-free@example.invalid',
      [storageKeys.role]: 'USER',
      [storageKeys.tier]: 'FREE',
      timelens_email_verified: '1',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
    })) localStorage.setItem(key, value)
  }, { storageKeys: STORAGE_KEYS, token: DISPOSABLE_ADMIN.token })
  await mockAdminApi(page, 'USER')
  await page.route('**/api/profile/me', (route) => route.fulfill({
    json: { success: true, data: { id: 'heritage-free-user', displayName: 'Heritage Free User', email: 'heritage-free@example.invalid', role: 'USER', tier: 'FREE', emailVerified: true, orgId: null, orgSubscription: 'NONE', avatarUrl: null } },
  }))
  await page.goto(`/time-portal/dia-dao-cu-chi?view=3d&era=1968&focus=${focus}`)
}

test('premium 1968 deep link focuses the mapped chamber but hides CTA for unpublished roles', async ({ page }) => {
  await openAsPremium(page, 'ST04_CLINIC')

  await expect(page.getByText('1968 · Làng ngầm 3 tầng')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Trạm quân y' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hóa thân tại ST04' })).toHaveCount(0)
})

test('invalid semantic focus keeps the 1968 home view without opening a detail card', async ({ page }) => {
  await openAsPremium(page, 'ST99_UNKNOWN')

  await expect(page.getByText('1968 · Làng ngầm 3 tầng')).toBeVisible()
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)
})

test('free 1968 3d deep link keeps 3d mode behind the existing paywall', async ({ page }) => {
  await openAsFree(page, 'ST04_CLINIC')

  await expect(page.getByRole('dialog')).toContainText('Era 1968')
  await expect(page.getByRole('button', { name: 'Dòng thời gian' })).toBeVisible()
})

test('legacy UUID links canonicalize with semantic query intact', async ({ page }) => {
  await seedAdminSession(page)
  await mockAdminApi(page)
  await page.goto(`/time-portal/${SEED.cuChiLocationId}?view=3d&era=1968&focus=ST04_CLINIC`)

  await expect(page).toHaveURL(/\/time-portal\/dia-dao-cu-chi\?view=3d&era=1968&focus=ST04_CLINIC$/)
})
