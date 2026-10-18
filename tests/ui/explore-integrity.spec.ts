import { test, expect, type Page } from '@playwright/test'

function snapshot(id = 'explorer-a', xp = 205, keys: string[] = []) {
  return {
    profile: { id, email: `${id}@example.test`, displayName: id, role: 'USER', tier: 'FREE',
      emailVerified: true, avatarUrl: null, orgId: null, orgName: null, orgSubscription: 'NONE', orgRole: null,
      totalPoints: xp, level: 3, levelName: 'Cấp độ từ server', pointsToNextLevel: 95, levelProgressPercent: 52,
      city: null, activeVisitSites: [] },
    discovery: { discovered: keys.length, total: 22, keys, version: 1 },
    archiveXp: keys.includes('depth_quiz:surface') ? 15 : 0,
    badges: [{ id: 'badge_compass_pioneer', earned: true, earnedAt: '2026-10-16T00:00:00Z', progressPercent: 100, progressText: 'Đã xác nhận từ DB' }],
  }
}

async function setup(page: Page, state = { value: snapshot(), failLoad: false, failAttempt: false }) {
  const writes: { path: string; body: Record<string, unknown> }[] = []
  await page.addInitScript(() => {
    // Authentication fixture stands for signing in again after clearing storage; it seeds no XP.
    const values = { timelens_token: 'ui-fixture', timelens_user_id: 'explorer-a', timelens_display_name: 'explorer-a',
      timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }) }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() === 'POST') writes.push({ path, body: request.postData() ? JSON.parse(request.postData()!) : {} })
    if (path === '/api/me/explore') {
      if (state.failLoad) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      return route.fulfill({ json: { success: true, data: state.value } })
    }
    if (path === '/api/me/explore/attempts') {
      if (state.failAttempt) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      const body = request.postDataJSON()
      const passed = body.answer === 1
      if (passed) state.value = snapshot('explorer-a', 220, ['depth_quiz:surface'])
      return route.fulfill({ json: { success: true, data: { passed, alreadyCompleted: false, xpEarned: passed ? 15 : 0, snapshot: state.value } } })
    }
    const data = path === '/api/profile/me' ? state.value.profile
      : path === '/api/me/passport' ? { stamps: [] }
      : path === '/api/me/discoveries/visited-locations' ? { visitedLocationIds: [], visitedCount: 0 }
      : []
    return route.fulfill({ json: { success: true, data } })
  })
  return { state, writes }
}

test('honors link opens exact unfinished depth without submitting an answer', async ({ page }) => {
  const { writes } = await setup(page)
  await page.goto('/explore?honorsPath=depths&target=layer3')
  await expect(page.locator('#depth-quiz-section')).toContainText('-12m')
  await expect(page.locator('#depth-quiz-section').getByRole('button', { pressed: true })).toContainText('Tầng 3')
  expect(writes.filter(w => w.path.includes('/attempts'))).toHaveLength(0)
})

test('honors cipher link opens its actual quiz and closing it stays closed', async ({ page }) => {
  const { writes } = await setup(page)
  await page.goto('/explore?honorsPath=ciphers&target=two-wells')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('MẬT THƯ KỸ THUẬT 68-ĐH')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(writes.filter(w => w.path.includes('/attempts'))).toHaveLength(0)
})

test('honors dossier link returns to archive instead of the page hero', async ({ page }) => {
  const { writes } = await setup(page)
  await page.goto('/explore?honorsPath=dossiers&target=architecture')
  await expect(page.getByRole('button', { name: /Quay lại Kho Sử Liệu/ })).toBeVisible()
  await page.getByRole('button', { name: /Quay lại Kho Sử Liệu/ }).click()
  await expect(page.locator('#honors-dossiers')).toBeInViewport()
  expect(writes.filter(w => w.path.includes('/attempts'))).toHaveLength(0)
})

test('restores server XP, level and discoveries after clearing browser storage', async ({ page }) => {
  const { writes } = await setup(page, { value: snapshot('explorer-a', 205, ['depth_quiz:surface']), failLoad: false, failAttempt: false })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toContainText('205')
  await expect(page.getByTestId('account-level-name')).toHaveText('Cấp độ từ server')
  await expect(page.getByTestId('depth-completed')).toBeVisible()
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toContainText('205')
  await expect(page.getByTestId('depth-completed')).toBeVisible()
  expect(writes.filter(w => w.path.includes('/discoveries') || w.path.includes('/attempts'))).toHaveLength(0)
})

test('ignores forged local progress and never backfills it', async ({ page }) => {
  const { writes } = await setup(page)
  await page.addInitScript(() => {
    localStorage.setItem('timelens_cu_chi_unlocked_keys_v2', JSON.stringify(['depth_quiz:surface', 'investigation:cu-chi-conclusion']))
    localStorage.setItem('timelens_exp_chat', '1')
  })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toContainText('205')
  await expect(page.getByTestId('depth-completed')).toHaveCount(0)
  expect(writes.filter(w => w.path.includes('/discoveries') || w.path.includes('/attempts'))).toHaveLength(0)
})

test('failed save never unlocks a quiz or invents XP', async ({ page }) => {
  await setup(page, { value: snapshot(), failLoad: false, failAttempt: true })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toContainText('205')
  await page.getByTestId('depth-answer-1').click()
  await expect(page.getByText('Chưa thể xác nhận kết quả.', { exact: false })).toBeVisible()
  await expect(page.getByTestId('account-xp')).toContainText('205')
  await expect(page.getByTestId('depth-completed')).toHaveCount(0)
})

test('wrong answer remains retryable and correct answer uses server reward', async ({ page }) => {
  const { writes } = await setup(page)
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('depth-answer-0').click()
  await expect(page.getByText('Chưa chính xác. Hãy đọc lại nội dung', { exact: false })).toBeVisible()
  await expect(page.getByTestId('account-xp')).toContainText('205')
  await page.getByTestId('depth-answer-1').click()
  await expect(page.getByTestId('account-xp')).toContainText('220')
  await expect(page.getByTestId('depth-completed')).toBeVisible()
  expect(writes.filter(w => w.path.endsWith('/attempts')).map(w => w.body.answer)).toEqual([0, 1])
})

test('failed initial load shows retry and recovers without zeroing account data', async ({ page }) => {
  const context = await setup(page, { value: snapshot(), failLoad: true, failAttempt: false })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible()
  await expect(page.getByTestId('account-xp')).toHaveCount(0)
  context.state.failLoad = false
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByTestId('account-xp')).toContainText('205')
})

test('badge dialog supports focus and Escape on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('badge_compass_pioneer').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('one Escape dismisses only one newly earned badge', async ({ page }) => {
  const initial = snapshot()
  initial.badges = initial.badges.map(b => ({ ...b, earned: false }))
  const { state } = await setup(page, { value: initial, failLoad: false, failAttempt: false })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toBeVisible()
  state.value = {
    ...snapshot(),
    badges: ['badge_compass_pioneer', 'badge_steel_footprint'].map(id => ({
      id, earned: true, earnedAt: '2026-10-17T00:00:00Z', progressPercent: 100, progressText: 'Đã đạt',
    })),
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('histar:discovery-recorded')))
  await expect(page.getByRole('dialog', { name: 'Chúc mừng mở khóa huy hiệu La Bàn Khởi Nguyên' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Chúc mừng mở khóa huy hiệu La Bàn Khởi Nguyên' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Chúc mừng mở khóa huy hiệu Dấu Chân Đất Thép' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Chúc mừng mở khóa huy hiệu Dấu Chân Đất Thép' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('late cipher result cannot complete a different open cipher', async ({ page }) => {
  await setup(page)
  let release!: () => void
  let started!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const waiting = new Promise<void>(resolve => { started = resolve })
  await page.route('**/api/me/explore/attempts', async route => {
    started()
    await pending
    await route.fulfill({ json: { success: true, data: { passed: true, alreadyCompleted: false,
      xpEarned: 50, snapshot: snapshot('explorer-a', 255, ['cipher:hoang-cam']) } } })
  })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await page.getByText('Bấm để giải mã', { exact: true }).nth(0).click()
  await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText('B', { exact: true }) }).click()
  await page.getByRole('button', { name: /Xác Thực Khóa Mã/ }).click()
  await waiting
  await page.keyboard.press('Escape')
  await page.getByText('Bấm để giải mã', { exact: true }).nth(1).click()
  release()
  await expect(page.getByTestId('account-xp')).toHaveText('255')
  await expect(page.getByRole('dialog').getByRole('button', { name: /Xác Thực Khóa Mã/ })).toBeVisible()
})

test('pending submission from previous account does not disable the next account', async ({ page }) => {
  const { state } = await setup(page)
  let release!: () => void
  let started!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const waiting = new Promise<void>(resolve => { started = resolve })
  await page.route('**/api/me/explore/attempts', async route => {
    started()
    await pending
    await route.fulfill({ json: { success: true, data: { passed: true, alreadyCompleted: false,
      xpEarned: 15, snapshot: snapshot('explorer-a', 220, ['depth_quiz:surface']) } } })
  })
  try {
    await page.goto('/explore', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('depth-answer-1').click()
    await waiting
    state.value = { ...snapshot('explorer-b', 0), badges: [] }
    await page.evaluate(() => {
      localStorage.setItem('timelens_token', 'second-account-fixture')
      localStorage.setItem('timelens_user_id', 'explorer-b')
      window.dispatchEvent(new CustomEvent('histar:session-refreshed'))
    })
    await expect(page.getByTestId('account-xp')).toHaveText('0')
    await expect(page.getByTestId('depth-answer-1')).toBeEnabled()
  } finally { release() }
})

test('cipher and dossier cards can be opened using the keyboard', async ({ page }) => {
  await setup(page)
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  const cipher = page.getByRole('button', { name: /^Mở mật thư / }).first()
  await cipher.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeFocused()
  await page.keyboard.press('Escape')
  const dossier = page.getByRole('button', { name: /^Mở hồ sơ / }).first()
  await dossier.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Quay lại Kho Sử Liệu', exact: false })).toBeVisible()
})

test('switching accounts discards a late snapshot from the previous account', async ({ page }) => {
  const context = await setup(page)
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toContainText('205')
  const oldSnapshot = structuredClone(context.state.value)
  let holdNext = true
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  let started!: () => void
  const waiting = new Promise<void>(resolve => { started = resolve })
  await page.route(url => url.pathname === '/api/me/explore', async route => {
    if (!holdNext) return route.fallback()
    holdNext = false
    started()
    await pending
    return route.fulfill({ json: { success: true, data: oldSnapshot } })
  })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('histar:discovery-recorded')))
  await waiting
  context.state.value = { ...snapshot('explorer-b', 0), badges: [] }
  await page.evaluate(() => {
    localStorage.setItem('timelens_token', 'second-account-fixture')
    localStorage.setItem('timelens_user_id', 'explorer-b')
    window.dispatchEvent(new CustomEvent('histar:session-refreshed'))
  })
  await expect(page.getByTestId('account-xp')).toHaveText('0')
  release()
  await expect(page.getByTestId('account-xp')).toHaveText('0')
  await expect(page.getByText('Đã mở khóa: 0 / 9 Huy hiệu', { exact: true })).toBeVisible()
})

test('Profile and Explore show the same server XP and level despite forged local achievements', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => {
    localStorage.setItem('timelens_cu_chi_unlocked_keys_v2', JSON.stringify(['depth:surface', 'cipher:sandals', 'investigation:cu-chi-conclusion']))
  })
  await page.goto('/explore', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('account-xp')).toHaveText('205')
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('profile-account-xp')).toHaveText('205')
  await expect(page.getByText('Level 3 · Cấp độ từ server', { exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('profile-account-xp')).toHaveText('205')
})
