import { test, expect } from '@playwright/test'
import { login, registerFreshUser } from '../helpers/api'
import { seedSession } from '../helpers/session'

/**
 * RT-00..04, RT-08, RT-10 — Guest gate + returnTo query param
 */
test.describe('FE UI · Routing guest gate', () => {
  test('RT-00: Login page does not advertise guest explore CTA', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Khám phá không cần tài khoản')).toHaveCount(0)
  })

  test('RT-01: Guest /explore → /login?returnTo=%2Fexplore', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fexplore/)
  })

  test('RT-02: Guest /pricing → login + returnTo', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fpricing/)
  })

  test('RT-02b: Guest /home → login + returnTo', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fhome/)
  })

  test('RT-03: Guest / → landing, no redirect', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('TimeLens', { exact: true }).first()).toBeVisible()
  })

  test('RT-04: Logged-in user /login → redirect app', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s)
    await page.goto('/login')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('RT-08: Logged-in user /login?returnTo=%2Flogin does not loop back to login', async ({
    page,
    request,
  }) => {
    const s = await registerFreshUser(request)
    await seedSession(page, s)
    await page.goto('/login?returnTo=%2Flogin')
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
  })

  test('RT-10: logout clears stashed returnTo', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s)
    await page.addInitScript(() => sessionStorage.setItem('histar:returnTo', '/explore'))
    await page.goto('/home')
    await page.getByTitle('Tài khoản cá nhân').click()
    await page.getByRole('button', { name: /Đăng xuất tài khoản/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    const stashed = await page.evaluate(() => sessionStorage.getItem('histar:returnTo'))
    expect(stashed).toBeNull()
  })
})
