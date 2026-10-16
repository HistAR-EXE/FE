// Opt-in local end-to-end test. Creates dedicated QA fixtures, never emails users.
// Requires the local histar-postgres container, BE:8080 and FE:5173.
const { chromium, expect: baseExpect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
// Real server requests and media loading can exceed the mocked-suite 5s default.
const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve(__dirname, '../test-results/explore-live');
const checks = [], accounts = [];
const locationId = '11111111-1111-1111-1111-111111111111';
function sql(query) {
  return execFileSync('docker', ['exec', '-i', 'histar-postgres', 'psql', '-U', 'timelens', '-d', 'timelens', '-At', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' }).trim();
}
async function check(name, fn) {
  try { await fn(); checks.push({ name, passed: true }); console.log('PASS ' + name); }
  catch (e) { checks.push({ name, passed: false, error: e.message }); throw e; }
}
async function request(a, endpoint, body) {
  const r = await fetch('http://localhost:8080/api' + endpoint, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(a ? { Authorization: 'Bearer ' + a.token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  return { status: r.status, body: await r.json() };
}
async function snap(a) { const r = await request(a, '/me/explore'); assert.equal(r.status, 200); return r.body.data; }
async function attempt(a, key, answer) { return request(a, '/me/explore/attempts', { locationId, key, ...(answer === undefined ? {} : { answer }) }); }
async function award(a, key, answer) { const r = await attempt(a, key, answer); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.success, true); return r.body.data; }
async function fixture() {
  const id = randomUUID(), email = 'explore-qa-' + id + '@example.invalid', password = randomBytes(24).toString('hex');
  sql(`INSERT INTO profiles(id,email,password_hash,display_name,email_verified,email_verified_at) VALUES('${id}','${email}',crypt('${password}',gen_salt('bf')),'Explore QA',true,now());`);
  const a = { id, email }; accounts.push(a);
  const r = await request(null, '/auth/login', { email, password });
  assert.equal(r.status, 200); assert.equal(r.body.success, true);
  a.auth = r.body.data; a.token = a.auth.token || a.auth.accessToken; assert.ok(a.token); return a;
}
async function session(page, a) {
  // Session is obtained from the real login API; this avoids storing QA passwords.
  await page.goto('http://localhost:5173');
  await page.evaluate(a => {
    localStorage.clear();
    const values = { timelens_token: a.token, timelens_refresh_token: a.auth.refreshToken,
      timelens_user_id: a.id, timelens_display_name: a.auth.displayName, timelens_email: a.email,
      timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }) };
    for (const [k, v] of Object.entries(values)) if (v) localStorage.setItem(k, v);
  }, a);
  await page.goto('http://localhost:5173/explore');
  await expect(page.getByTestId('account-xp')).toBeVisible();
}
(async () => {
  fs.mkdirSync(out, { recursive: true }); let browser, activePage;
  try {
    const a = await fixture(), b = await fixture(), c = await fixture();
    await check('No authentication cannot read progress', async () => assert.ok([401, 403].includes((await request(null, '/me/explore')).status)));
    await check('Fresh account has zero XP', async () => assert.equal((await snap(a)).profile.totalPoints, 0));
    await check('Wrong answer gives zero and remains retryable', async () => { const r = await award(a, 'depth_quiz:surface', 0); assert.equal(r.passed, false); assert.equal(r.snapshot.profile.totalPoints, 0); });
    await check('Correct retry awards 15 and badge', async () => { const r = await award(a, 'depth_quiz:surface', 1); assert.equal(r.xpEarned, 15); assert.equal(r.snapshot.badges[0].earned, true); });
    await check('Repeated completion awards zero', async () => { const r = await award(a, 'depth_quiz:surface', 1); assert.equal(r.alreadyCompleted, true); assert.equal(r.xpEarned, 0); });
    await check('Concurrent same key awards once', async () => { const r = await Promise.all([award(a, 'depth_quiz:layer1', 1), award(a, 'depth_quiz:layer1', 1)]); assert.equal(r.reduce((n, x) => n + x.xpEarned, 0), 15); assert.equal(r.filter(x => x.alreadyCompleted).length, 1); });
    await check('Concurrent distinct keys preserve both rewards', async () => { await Promise.all([award(a, 'depth_quiz:layer2', 0), award(a, 'depth_quiz:layer3', 2)]); assert.equal((await snap(a)).profile.totalPoints, 60); });
    await check('Forged discovery reward keys rejected', async () => { for (const unlockKey of ['cipher:hoang-cam', 'dossier:architecture', 'clue:ev-01', 'investigation:cu-chi-conclusion', 'feature:diorama']) assert.ok((await request(a, '/me/discoveries', { locationId, unlockKey, source: 'qa' })).status >= 400); assert.equal((await snap(a)).profile.totalPoints, 60); });
    await check('Conclusion cannot skip prerequisites', async () => assert.ok((await attempt(a, 'investigation:cu-chi-conclusion')).status >= 400));
    await check('Invalid location and answer rejected', async () => { assert.ok((await request(a, '/me/explore/attempts', { locationId: randomUUID(), key: 'depth_quiz:surface', answer: 1 })).status >= 400); assert.ok((await attempt(b, 'depth_quiz:surface', 99)).status >= 400); });
    await check('Clues and conclusion persist 230 XP once', async () => { for (let i = 1; i <= 4; i++) await award(a, 'clue:ev-0' + i); await award(a, 'investigation:cu-chi-conclusion'); assert.equal((await snap(a)).profile.totalPoints, 290); assert.equal((await award(a, 'investigation:cu-chi-conclusion')).xpEarned, 0); });
    await check('Ciphers and dossier grant server-defined XP', async () => { for (const [k, v] of [['cipher:hoang-cam', 1], ['cipher:two-wells', 0], ['cipher:sandals', 1], ['dossier:architecture', 1]]) await award(b, k, v); const s = await snap(b); assert.equal(s.profile.totalPoints, 325); assert.equal(s.archiveXp, 325); });
    await check('Diorama receipt has zero XP', async () => { const r = await request(b, '/me/explore/experiences', { locationId, type: 'diorama' }); assert.equal(r.status, 200); assert.ok(r.body.data.discovery.keys.includes('feature:diorama')); assert.equal(r.body.data.profile.totalPoints, 325); });
    await check('Thirteenth wrong attempt is throttled with zero XP', async () => { for (let i = 0; i < 12; i++) await award(c, 'depth_quiz:surface', 0); assert.ok((await attempt(c, 'depth_quiz:surface', 0)).status >= 400); assert.equal((await snap(c)).profile.totalPoints, 0); });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext(), page = await context.newPage(), errors = [];
    activePage = page;
    page.on('pageerror', e => errors.push(e.message));
    await check('Live UI restores DB XP and completed challenge', async () => { await session(page, a); await expect(page.getByTestId('account-xp')).toContainText('290'); await expect(page.getByTestId('depth-completed')).toBeVisible(); await page.screenshot({ path: out + '/desktop.png', fullPage: true }); });
    await check('Reload retains durable progress', async () => { await page.reload(); await expect(page.getByTestId('account-xp')).toContainText('290'); });
    await check('Clear browser storage then real API login session restores progress', async () => { await page.evaluate(() => localStorage.clear()); await page.reload(); await session(page, a); await expect(page.getByTestId('account-xp')).toContainText('290'); });
    await check('Forged browser XP is ignored', async () => { await page.evaluate(() => { localStorage.setItem('timelens_total_points', '999999'); localStorage.setItem('timelens_cu_chi_unlocked_keys_v2', JSON.stringify(['dossier:architecture'])); }); await page.reload(); await expect(page.getByTestId('account-xp')).toContainText('290'); assert.equal((await snap(a)).profile.totalPoints, 290); });
    await check('Profile agrees with Explore global XP', async () => { await page.goto('http://localhost:5173/profile'); await expect(page.getByTestId('profile-account-xp')).toHaveText('290'); });
    await check('Account switching isolates progress', async () => { await session(page, b); await expect(page.getByTestId('account-xp')).toContainText('325'); await expect(page.getByTestId('depth-completed')).toHaveCount(0); await session(page, a); await expect(page.getByTestId('account-xp')).toContainText('290'); });
    await check('Live UI wrong answer allows retry without granting XP', async () => {
      await session(page, b);
      await page.getByTestId('depth-answer-0').click();
      await expect(page.getByText('Chưa chính xác. Hãy đọc lại nội dung', { exact: false })).toBeVisible();
      await expect(page.getByTestId('account-xp')).toContainText('325');
    });
    await check('Interrupted save never displays unconfirmed success', async () => {
      await page.route('**/api/me/explore/attempts', route => route.abort('failed'));
      await page.getByTestId('depth-answer-1').click();
      await expect(page.getByText('Chưa thể xác nhận kết quả.', { exact: false })).toBeVisible();
      await expect(page.getByTestId('depth-completed')).toHaveCount(0);
      await expect(page.getByTestId('account-xp')).toContainText('325');
      assert.equal((await snap(b)).profile.totalPoints, 325);
      await page.unroute('**/api/me/explore/attempts');
    });
    await check('Recovered connection saves real UI completion once', async () => {
      await page.getByTestId('depth-answer-1').click();
      await expect(page.getByTestId('depth-completed')).toBeVisible();
      await expect(page.getByTestId('account-xp')).toContainText('340');
      assert.equal((await snap(b)).profile.totalPoints, 340);
      await session(page, a);
    });
    await check('Mobile badge dialog traps focus and closes', async () => { await page.setViewportSize({ width: 390, height: 844 }); await page.getByTestId('badge_compass_pioneer').click(); const d = page.getByRole('dialog'); await expect(d).toBeVisible(); await expect(d).toBeFocused(); await page.keyboard.press('Tab'); assert.ok(await d.evaluate(el => el.contains(document.activeElement))); await page.screenshot({ path: out + '/mobile-badge.png' }); await page.keyboard.press('Escape'); await expect(d).toHaveCount(0); });
    await check('Browser reports no uncaught JavaScript errors', async () => assert.deepEqual(errors, []));
    await check('PostgreSQL total equals ledger for every QA account', async () => { for (const a of accounts) assert.equal(sql(`SELECT p.total_points=COALESCE((SELECT sum(points) FROM xp_ledger WHERE user_id=p.id),0) FROM profiles p WHERE p.id='${a.id}';`), 't'); });
  } catch (e) {
    process.exitCode = 1; console.error(e.message);
    if (activePage) {
      await activePage.screenshot({ path: out + '/failure.png' }).catch(() => {});
      fs.writeFileSync(out + '/failure.txt', await activePage.locator('body').innerText().catch(() => 'Unavailable'));
    }
  }
  finally {
    let fixturesCleaned = false;
    if (accounts.length) {
      try {
        const ids = accounts.map(a => `'${a.id}'`).join(',');
        sql(`BEGIN;
          CREATE TEMP TABLE qa_cleanup AS SELECT id FROM profiles WHERE id IN (${ids})
            AND email='explore-qa-'||id::text||'@example.invalid' AND display_name='Explore QA';
          DO $$ BEGIN ASSERT (SELECT count(*) FROM qa_cleanup)=${accounts.length}, 'QA identity check failed'; END $$;
          DELETE FROM analytics_events WHERE user_id IN (SELECT id FROM qa_cleanup)
            OR visit_session_id IN (SELECT id FROM visit_sessions WHERE user_id IN (SELECT id FROM qa_cleanup));
          DELETE FROM visit_sessions WHERE user_id IN (SELECT id FROM qa_cleanup);
          DELETE FROM usage_quotas WHERE user_id IN (SELECT id FROM qa_cleanup);
          DELETE FROM quest_reward_ledger WHERE user_id IN (SELECT id FROM qa_cleanup);
          DELETE FROM user_narrative_investigation_progress WHERE user_id IN (SELECT id FROM qa_cleanup);
          DELETE FROM profiles WHERE id IN (SELECT id FROM qa_cleanup);
          COMMIT;`);
        fixturesCleaned = true;
      } catch (e) { process.exitCode = 1; console.error('QA cleanup failed: ' + e.message); }
    }
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(out + '/results.json', JSON.stringify({ executedAt: new Date().toISOString(), checks, fixturesCleaned, fixtureIds: accounts.map(a => a.id) }, null, 2));
    console.log(`${checks.filter(c => c.passed).length}/${checks.length} checks passed`);
    if (browser) await browser.close();
  }
})();
