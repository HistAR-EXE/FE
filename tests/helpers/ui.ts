import { type Page } from '@playwright/test'

/** Submit login/register form on /login (avoids Google OAuth button). */
export async function submitLoginForm(page: Page) {
  await page.locator('form button[type="submit"]').click()
}
