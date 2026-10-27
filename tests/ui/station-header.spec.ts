import { expect, test } from '@playwright/test'

test('station page uses the same in-content back navigation as online quests', async ({ page }) => {
  await page.addInitScript(() => {
    const values = { timelens_token: 'fixture-token', timelens_user_id: 'station-user', timelens_display_name: 'Station User', timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online' }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const data = pathname === '/api/profile/me'
      ? { id: 'station-user', displayName: 'Station User', role: 'USER', tier: 'FREE', emailVerified: true, activeVisitSites: [] }
      : pathname.endsWith('/stations/ST01')
        ? { id: 'st01', code: 'ST01', name: 'Phòng họp', siteCode: 'cu-chi', blocks: [] }
        : []
    await route.fulfill({ json: { success: true, data } })
  })

  await page.goto('/sites/cu-chi/stations/ST01/media')
  const back = page.getByRole('navigation', { name: 'Điều hướng trạm' }).getByRole('link', { name: 'Hành trình 6 trạm' })
  await expect(back).toBeVisible()
  await expect(back).toHaveAttribute('href', '/quests/33333333-3333-3333-3333-333333333340')
  await expect(page.locator('header')).toHaveCount(0)
  await expect(back).toHaveClass(/rounded-2xl/)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(back).toBeVisible()
  await expect(page.locator('header')).toHaveCount(0)

  await page.goto('/sites/cu-chi/stations/ST02/media')
  await page.getByRole('link', { name: 'Hóa thân 1968 · ST02' }).click()
  await expect(page.getByRole('heading', { name: /Hóa thân 1968.*ST02/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Chọn vai hóa thân năm 1968' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /Cán bộ hậu cần · Nam/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Cán bộ hậu cần · Nữ/ })).toBeVisible()

  await page.goto('/sites/cu-chi/stations/ST02/media')
  await page.getByRole('link', { name: 'Ảnh kỷ niệm tại trạm' }).click()
  await expect(page.getByRole('heading', { name: /Ảnh kỷ niệm.*ST02/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ảnh gốc' })).toHaveClass(/border-primary/)

  await page.goto('/photo-frame?site=cu-chi&station=ST02&locationId=11111111-1111-1111-1111-111111111111')
  await expect(page.getByRole('heading', { name: /Hóa thân 1968.*ST02/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Chọn vai hóa thân năm 1968' }).getByRole('listitem')).toHaveCount(2)
})
