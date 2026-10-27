import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const origin = process.env.B2B_TEST_ORIGIN || 'http://localhost:5173'
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('Local test origin required')
const password = 'B2BTest@2026!'
const results = []
for (let attempt = 0; ; attempt++) {
  try {
    if ((await fetch(`${origin}/api/locations`, { signal: AbortSignal.timeout(3000) })).ok) break
  } catch { /* backend may still be starting */ }
  if (attempt >= 120) throw new Error('Local backend did not become ready')
  await new Promise(resolve => setTimeout(resolve, 1000))
}
async function api(path, token, method = 'GET', body) {
  const response = await fetch(`${origin}${path}`, { method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) })
  const json = await response.json().catch(() => ({}))
  return { status: response.status, ...json }
}
function ok(result, action) { assert.ok(result.status >= 200 && result.status < 300 && result.success, `${action}: HTTP ${result.status} ${result.message || ''}`); return result.data }
function denied(result, action) { assert.ok(result.status >= 400 && result.status < 500, `${action}: unexpectedly HTTP ${result.status}`) }
async function login(email, pass = password) { return ok(await api('/api/auth/login', null, 'POST', { email, password: pass }), `login ${email}`) }

if (!process.env.B2B_UI_ONLY) {
const teachers = {}
for (const plan of ['micro', 'standard', 'premium']) {
  const owner = await login(`owner-${plan}@histar.local`)
  const teacher = await login(`teacher-${plan}@histar.local`)
  const student = await login(`student-${plan}@histar.local`)
  for (const account of [owner, teacher, student]) assert.equal(account.tier, 'PREMIUM')
  teachers[plan] = teacher
  const caps = ok(await api(`/api/org/${teacher.orgId}/capabilities`, teacher.accessToken), `${plan} capabilities`)
  assert.equal(caps.manageMembers, true); assert.equal(caps.manageTeachers, false)
  assert.equal(caps.assignments, plan !== 'micro'); assert.equal(caps.liveBoard, plan !== 'micro'); assert.equal(caps.reports, plan !== 'micro')
  assert.equal(ok(await api(`/api/org/${owner.orgId}/capabilities`, owner.accessToken), 'owner capabilities').manageTeachers, true)
  const billing = ok(await api('/api/org/me', teacher.accessToken), 'billing')
  assert.equal(billing.maxCcu, { micro: 15, standard: 40, premium: 80 }[plan])
  assert.equal(billing.maxVerifiedAccounts, { micro: 100, standard: 400, premium: 1000 }[plan])
  assert.equal(billing.aiQueriesLimit, { micro: 5000, standard: 30000, premium: null }[plan])
  for (const path of ['/api/lms/assignments', `/api/org/${teacher.orgId}/live-board`, `/api/org/${teacher.orgId}/report-snapshots`]) {
    const result = await api(path, teacher.accessToken)
    if (plan === 'micro') denied(result, `Micro ${path}`); else ok(result, `${plan} ${path}`)
  }
  const questCatalog = ok(await api('/api/quests', teacher.accessToken), 'quest catalog')
  const quests = Array.isArray(questCatalog) ? questCatalog : questCatalog.items
  assert.ok(Array.isArray(quests) && quests[0]?.id, 'A real quest is required to test assignment creation')
  const createdAssignment = await api('/api/lms/assignments', teacher.accessToken, 'POST', {
    title: `Kiểm tra B2B ${plan} ${Date.now()}`, questId: quests[0].id,
  })
  if (plan === 'micro') denied(createdAssignment, 'Micro cannot create assignments')
  else assert.ok(ok(createdAssignment, `${plan} creates assignment`).id)
  denied(await api(`/api/org/${teacher.orgId}/teachers/provision`, teacher.accessToken, 'POST',
    { email: `unauthorized-${Date.now()}@histar.local`, displayName: 'Unauthorized', sendCredentialsEmail: false }), 'teacher cannot grant teacher')
  if (plan !== 'micro') {
    const saved = ok(await api(`/api/org/${teacher.orgId}/report-snapshots`, teacher.accessToken, 'POST'), 'capture snapshot')
    assert.ok(saved.id && saved.snapshot.organizationId === teacher.orgId)
    assert.ok(ok(await api(`/api/org/${teacher.orgId}/report-snapshots`, teacher.accessToken), 'snapshot history').some(item => item.id === saved.id))
  }
  results.push(`${plan}: verified owner/teacher/student Premium, limits, assignment creation allowed/denied, snapshot, teacher escalation denied`)
}
denied(await api(`/api/org/${teachers.premium.orgId}/capabilities`, teachers.standard.accessToken), 'cross organization access')

const teacher = teachers.standard
const stamp = Date.now()
const email = `invite-${stamp}@histar.local`
const registered = ok(await api('/api/auth/register', null, 'POST', { email, password, displayName: 'Invitation smoke student' }), 'register invitation student')
assert.ok(registered.debugVerificationToken, 'Local smoke requires MAIL_ENABLED=false to avoid sending real email')
const invitation = ok(await api(`/api/org/${teacher.orgId}/invite-email`, teacher.accessToken, 'POST', { studentEmail: email, studentName: 'Smoke student' }), 'email invitation')
assert.equal(invitation.deliveryStatus, 'LOCAL_ONLY')
assert.equal((await login(email)).tier, 'FREE')
ok(await api('/api/auth/verify-email/confirm', null, 'POST', { token: registered.debugVerificationToken }), 'verify exact email')
const joined = await login(email)
assert.equal(joined.orgId, teacher.orgId); assert.equal(joined.tier, 'PREMIUM')
assert.equal((await login(email)).orgId, teacher.orgId)
assert.equal(ok(await api(`/api/org/${teacher.orgId}/email-invitations`, teacher.accessToken), 'invitation status').find(item => item.email === email).status, 'ACCEPTED')
ok(await api('/api/org/leave', joined.accessToken, 'POST', { confirm: true }), 'leave organization')
const left = await login(email); assert.equal(left.tier, 'FREE'); assert.equal(left.orgId, null)
results.push('Email invitation: LOCAL_ONLY honest status, unverified denied Premium, verified autoaccept/idempotent, leaving revokes derived Premium')

const owner = await login('owner-standard@histar.local')
const staff = ok(await api(`/api/org/${owner.orgId}/teachers/provision`, owner.accessToken, 'POST',
  { email: `provisioned-teacher-${stamp}@histar.local`, displayName: 'Provisioned smoke teacher', sendCredentialsEmail: false }), 'owner provisions teacher')
assert.ok(staff.temporaryPassword)
const staffLogin = await login(staff.email, staff.temporaryPassword)
assert.equal(staffLogin.role, 'TEACHER'); assert.equal(staffLogin.tier, 'PREMIUM')
results.push('Owner provisions teacher successfully; teacher login receives organization Premium')
console.log(JSON.stringify({ apiChecksPassed: true, results }, null, 2))
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const plan of ['micro', 'standard', 'premium']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    page.setDefaultNavigationTimeout(30000)
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' })
    if (await page.getByTestId('consent-modal').isVisible()) {
      await page.getByRole('button', { name: 'Từ chối tất cả', exact: true }).click()
    }
    console.log('Login controls:', await page.locator('input').evaluateAll(elements => elements.map(el => ({ type: el.type, placeholder: el.placeholder }))))
    await page.locator('input[type=email]').fill(`owner-${plan}@histar.local`)
    await page.locator('input[type=password]').fill(password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL('**/teacher', { timeout: 30000 })
    await page.getByRole('heading', { name: 'Mời học sinh bằng email' }).waitFor()
    await page.getByText(`student-${plan}@histar.local`, { exact: true }).waitFor()
    await page.screenshot({ path: `../docs/b2b-${plan}-desktop.png`, fullPage: true })
    await page.goto(`${origin}/teacher/assignments`, { waitUntil: 'networkidle' })
    if (plan === 'micro') await page.getByRole('heading', { name: 'Tính năng chưa có trong gói hiện tại' }).waitFor()
    else await page.getByRole('heading', { name: 'Tạo bài tập mới' }).waitFor()
    assert.deepEqual(errors, [], `Browser errors: ${plan}`)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${origin}/teacher`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'Mời học sinh bằng email' }).waitFor()
    await page.getByText(`student-${plan}@histar.local`, { exact: true }).waitFor()
    await page.screenshot({ path: `../docs/b2b-${plan}-mobile.png`, fullPage: true })
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('.teacher-workspace *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })) }))
    assert.ok(overflow.scroll <= overflow.width + 1, `Mobile horizontal overflow: ${JSON.stringify(overflow)}`)
    await context.close()
    results.push(`${plan}: real browser login, dashboard desktop/mobile, assignments route gate, no JS errors or mobile overflow`)
  }
} finally { await browser.close() }
const scope = process.env.B2B_UI_ONLY ? 'ui' : 'fullstack'
await writeFile(`../docs/b2b-${scope}-smoke-results.json`, JSON.stringify({ passed: true, scope, results }, null, 2))
console.log(JSON.stringify({ passed: true, scope, results }, null, 2))
