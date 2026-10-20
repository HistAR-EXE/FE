import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
const catalog = JSON.parse(fs.readFileSync(new URL('../../src/features/ar/ar-catalog.json', import.meta.url), 'utf8')) as { id: string; name: string; status: string; thumbnail: string; target: string; targetIndex: number; description: string; note: string; author: string; source: string; license: string }[]

async function setup(page: Page) {
  const writes: string[] = []
  await page.addInitScript(() => localStorage.setItem('histar_consent_v1', JSON.stringify({ analytics: false, camera: false, gps: false })))
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    if (route.request().method() !== 'GET') writes.push(new URL(route.request().url()).pathname)
    const profile = { id: 'ar-test-user', email: 'ar@example.test', displayName: 'AR Explorer', role: 'USER', tier: 'FREE', emailVerified: true, totalPoints: 0, level: 1, avatarUrl: null, orgSubscription: 'NONE' }
    return route.fulfill({ json: { success: true, data: new URL(route.request().url()).pathname === '/api/profile/me' ? profile : [] } })
  })
  return writes
}

test('camera controls update only its frame and can reset presentation', async ({ page }) => {
  await setup(page)
  await page.route('**/ar.html?*', route => route.fulfill({ contentType: 'text/html', body: `<script>
    window.commands=[]; addEventListener('message', e => { if(e.source===parent && e.origin===location.origin) commands.push(e.data) });
    parent.postMessage({type:'AR_READY',artifact:'canteen'},location.origin);
  </script>` }))
  await page.goto('/ar-experience?artifact=canteen&view=camera')
  await page.getByRole('button', { name: 'Bật camera AR' }).click()
  await expect(page.locator('.ar-camera-state')).toContainText('Hướng camera')
  await page.getByRole('slider', { name: 'Kích thước hiện vật AR' }).fill('1.5')
  await expect.poll(() => page.frameLocator('iframe').locator('body').evaluate(() => (window as Window & { commands: { type: string; scale: number }[] }).commands.at(-1)?.scale)).toBe(1.5)
  await page.getByRole('button', { name: 'Xoay hiện vật AR sang phải' }).click()
  await page.getByRole('button', { name: 'Chuyển động AR' }).click()
  await expect(page.getByRole('button', { name: 'Chuyển động AR' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Đặt lại hiện vật AR' }).click()
  await expect(page.getByRole('slider', { name: 'Kích thước hiện vật AR' })).toHaveValue('1')
  await expect(page.getByRole('button', { name: 'Chuyển động AR' })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Tắt camera' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('public desktop center opens both real models on demand without reward writes', async ({ page }) => {
  const writes = await setup(page)
  const models: string[] = []
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()) })
  await page.goto('/ar-experience')
  await expect(page.getByRole('heading', { name: /Lịch sử, gần hơn/ })).toBeVisible()
  expect(models).toHaveLength(0)
  await page.getByRole('button', { name: 'Tải mô hình 3D' }).click()
  await expect(page.getByRole('img', { name: 'Mô hình 3D Mũ cối' })).toBeVisible()
  await expect(page.locator('.ar-model-status')).toHaveCount(0, { timeout: 30000 })
  await page.screenshot({ path: 'test-results/ar/desktop-hat.png', fullPage: true })
  await page.getByRole('button', { name: 'Xoay phải' }).click()
  await page.getByRole('button', { name: /Đèn dầu Ánh sáng/ }).click()
  await page.getByRole('button', { name: 'Tải mô hình 3D' }).click()
  await expect(page.locator('.ar-model-status')).toHaveCount(0, { timeout: 30000 })
  await expect(page.getByRole('img', { name: 'Mô hình 3D Đèn dầu' })).toBeVisible()
  expect(models.some(url => url.includes('lamp-web.glb'))).toBe(true)
  await page.screenshot({ path: 'test-results/ar/desktop-lamp.png', fullPage: true })
  expect(writes.filter(path => /checkin|discoveries|attempts|quests/.test(path))).toHaveLength(0)
})

test('all ten official models load and motion can pause', async ({ page }) => {
  test.setTimeout(240000)
  await setup(page)
  await page.goto('/ar-experience')
  await expect(page.locator('.ar-artifact-tabs button')).toHaveCount(10)
  await expect(page.getByRole('button', { name: /ứng viên dự phòng/ })).toHaveCount(0)
  for (const item of catalog) {
    await page.goto(`/ar-experience?artifact=${item.id}`)
    const story = page.locator('.ar-exhibit-story')
    await expect(story).toContainText(item.description)
    await expect(story).toContainText(item.note)
    await expect(story).toContainText(item.author)
    await expect(story).toContainText(item.license)
    await expect(story.getByRole('link', { name: /Nguồn mô hình/ })).toHaveAttribute('href', item.source)
    await page.getByRole('button', { name: 'Tải mô hình 3D' }).click()
    await expect(page.locator('.ar-model-canvas canvas')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.ar-model-status')).toHaveCount(0, { timeout: 30000 })
    const thumbnail = page.locator(`.ar-artifact-tabs img[src="${item.thumbnail}"]`)
    await thumbnail.scrollIntoViewIfNeeded()
    await expect.poll(() => thumbnail.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  }
  await page.goto('/ar-experience?artifact=hat')
  await page.getByRole('button', { name: 'Tải mô hình 3D' }).click()
  await expect(page.locator('.ar-model-status')).toHaveCount(0, { timeout: 30000 })
  await expect(page.locator('.ar-model-canvas')).toHaveAttribute('data-motion', 'playing')
  const before = await page.locator('.ar-model-canvas').screenshot()
  await page.waitForTimeout(300)
  expect((await page.locator('.ar-model-canvas').screenshot()).equals(before)).toBe(false)
  await page.getByRole('button', { name: 'Chuyển động tự động' }).click()
  await expect(page.locator('.ar-model-canvas')).toHaveAttribute('data-motion', 'paused')
  await page.getByRole('button', { name: 'Toàn màn hình', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toBeVisible()
  await page.getByRole('button', { name: 'Thoát toàn màn hình' }).click()
  await page.getByRole('button', { name: 'Đặt lại góc nhìn' }).click()
  await page.screenshot({ path: 'test-results/ar/expanded-center.png', fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await page.getByRole('button', { name: 'Tải mô hình 3D' }).click()
  await expect(page.locator('.ar-model-canvas')).toHaveAttribute('data-motion', 'paused')
})

test('removed artifact bookmarks fall back safely even with the legacy review flag', async ({ page }) => {
  await setup(page)
  for (const id of ['backpack', 'radio', 'cookset']) {
    await page.goto('/ar-experience?artifact=' + id + '&view=target&review=1')
    await expect(page.getByRole('heading', { name: 'Mũ cối', exact: true })).toBeVisible()
  }
  await page.goto('/ar-experience?review=1')
  await expect(page.locator('.ar-artifact-tabs button')).toHaveCount(10)
  await expect(page.getByRole('button', { name: /ứng viên dự phòng/ })).toHaveCount(0)
})

test('each color photo card and original link follow the selected artifact', async ({ page }) => {
  test.setTimeout(120000)
  await setup(page)
  for (const item of catalog) {
    await page.goto('/ar-experience?artifact=' + item.id + '&view=home')
    const image = page.getByRole('img', { name: 'Thẻ nhận diện ' + item.name, exact: true })
    await expect(image).toHaveAttribute('src', item.target)
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect(await image.evaluate(element => getComputedStyle(element).filter)).toBe('none')
    expect(await image.evaluate(element => getComputedStyle(element).objectFit)).toBe('contain')
    await expect(page.getByRole('link', { name: /Mở ảnh gốc/ })).toHaveAttribute('href', item.target.replace('/ar-targets/', '/ar-targets/originals/').replace('.jpg', '.JPG'))
  }
  await page.screenshot({ path: 'test-results/ar/field-photo-handoff.png', fullPage: true })
  await page.goto('/ar-experience?artifact=compass&view=target')
  await expect(page.getByRole('img')).toHaveAttribute('src', catalog.find(item => item.id === 'compass')!.target)
  await page.emulateMedia({ media: 'print' })
  expect(await page.getByRole('img').evaluate(element => getComputedStyle(element).printColorAdjust)).toBe('exact')
  await page.screenshot({ path: 'test-results/ar/portrait-color-card.png', fullPage: true })
})

test('phone handoff and print keep selected artifact, contain no token and never open camera', async ({ page }) => {
  await setup(page)
  await page.goto('/ar-experience?artifact=lamp&view=home')
  await expect(page.getByRole('img', { name: 'QR mở AR trên điện thoại' })).toBeVisible()
  await expect(page.locator('.ar-phone-link')).toHaveAttribute('href', 'http://127.0.0.1:5182/ar-experience?artifact=lamp&view=camera')
  await expect(page.locator('iframe')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/ar/handoff.png', fullPage: true })
  await page.goto('/ar-experience?artifact=lamp&view=target')
  await expect(page.getByRole('heading', { name: 'Đèn dầu' })).toBeVisible()
  await expect(page.getByRole('img')).toHaveAttribute('src', catalog.find(item => item.id === 'lamp')!.target)
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'In thẻ di sản' })).toBeHidden()
})

test('camera requires a click, validates messages, can stop, and never checks in', async ({ page }) => {
  const writes = await setup(page)
  await page.route('**/ar.html?*', route => route.fulfill({ contentType: 'text/html', body: '<script>parent.postMessage({type:"AR_READY",artifact:"hat"},location.origin)</script>' }))
  await page.goto('/ar-experience?artifact=hat&view=camera')
  await expect(page.locator('iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bật camera AR' }).click()
  await expect(page.locator('.ar-camera-state')).toContainText('Hướng camera vào thẻ di sản')
  await page.evaluate(() => window.postMessage({ type: 'AR_TARGET_FOUND', artifact: 'hat' }, location.origin))
  await expect(page.locator('.ar-camera-state')).toContainText('Hướng camera vào thẻ di sản')
  await page.frameLocator('iframe').locator('body').evaluate(() => parent.postMessage({ type: 'AR_TARGET_FOUND', artifact: 'hat' }, location.origin))
  await expect(page.locator('.ar-camera-state')).toContainText('Đã nhận diện')
  await page.getByRole('button', { name: 'Tắt camera' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(writes.filter(path => /checkin|discoveries|attempts|quests/.test(path))).toHaveLength(0)
})

test('camera errors explain recovery and remove frame', async ({ page }) => {
  await setup(page)
  await page.route('**/ar.html?*', route => route.fulfill({ contentType: 'text/html', body: '<script>parent.postMessage({type:"AR_ERROR",artifact:"hat",message:"Không thể mở camera. Cho phép camera rồi thử lại."},location.origin)</script>' }))
  await page.goto('/ar-experience?view=camera')
  await page.getByRole('button', { name: 'Bật camera AR' }).click()
  await expect(page.getByRole('alert')).toContainText('Cho phép camera')
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Bật camera AR' })).toBeVisible()
})

test('phone layout fits viewport and onsite entry preserves station workflow', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const view of ['explore', 'home', 'camera', 'onsite']) {
    await page.goto(`/ar-experience?view=${view}`)
    await expect(page.locator('.ar-mode-nav')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/ar/mobile-${view}.png`, fullPage: true })
  }
  await expect(page.getByRole('link', { name: /Quét QR tại trạm/ })).toHaveAttribute('href', /\/scan\?locationId=/)
  await expect(page.getByRole('link', { name: 'Xem nhiệm vụ tại di tích' })).toHaveAttribute('href', /track=onsite/)
})

for (const { id: artifact, target: targetImage, targetIndex } of catalog) {
  test(`real MindAR anchors ${artifact} to its compiled recognition card`, async ({ page }) => {
    test.setTimeout(120000)
    await setup(page)
    await page.addInitScript(({ target, wrongTarget }) => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
        let image = new Image()
        image.src = wrongTarget ?? target
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 1280; canvas.height = 720
        const ctx = canvas.getContext('2d')!
        const draw = () => {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1280, 720)
          const scale = Math.min(1000 / image.width, 600 / image.height)
          const width = image.width * scale, height = image.height * scale
          ctx.drawImage(image, (1280 - width) / 2, (720 - height) / 2, width, height)
          requestAnimationFrame(draw)
        }
        draw()
        const stream = canvas.captureStream(15)
        Object.assign(parent, { __arTestStream: stream, __arTestShowSelected: async () => {
          const selected = new Image(); selected.src = target; await selected.decode(); image = selected
        } })
        return stream
      } })
    }, { target: targetImage, wrongTarget: artifact === 'hat' ? catalog.find(item => item.id === 'lamp')!.target : undefined })
    await page.goto(`/ar-experience?artifact=${artifact}&view=camera`)
    await page.bringToFront()
    expect(await page.evaluate(() => document.visibilityState)).toBe('visible')
    await page.getByRole('button', { name: 'Bật camera AR' }).click()
    if (artifact === 'hat') {
      await expect(page.locator('.ar-camera-state')).toContainText('Hướng camera', { timeout: 60000 })
      // An actual different compiled photograph must not reveal this selected model.
      await page.waitForTimeout(3000)
      expect(await page.frameLocator('iframe').locator('[mindar-image-target]').evaluate(element => (element as HTMLElement & { object3D: { visible: boolean } }).object3D.visible)).toBe(false)
      await page.evaluate(() => (window as Window & { __arTestShowSelected: () => Promise<void> }).__arTestShowSelected())
    }
    await expect(page.locator('.ar-camera-state')).toContainText('Đã nhận diện', { timeout: 90000 })
    await expect.poll(() => page.frameLocator('iframe').locator('[mindar-image-target]').evaluate(element => {
      const target = element as HTMLElement & { object3D: { visible: boolean } }
      return target.object3D.visible
    })).toBe(true)
    const arFrame = page.frames().find(frame => frame.url().includes('/ar.html'))!
    await expect(page.frameLocator('iframe').locator('[mindar-image-target]')).toHaveAttribute('mindar-image-target', 'targetIndex: ' + targetIndex)
    expect(await arFrame.evaluate(`(() => {
      const scene = document.querySelector('a-scene'), model = document.querySelector('a-gltf-model'), target = document.querySelector('[mindar-image-target]');
      const box = new AFRAME.THREE.Box3().setFromObject(model.object3D);
      return scene.renderer.info.render.triangles > 0 && [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)
        && target.object3D.visible;
    })()`)).toBe(true)
    await expect.poll(() => arFrame.evaluate(`(() => {
      const scene = document.querySelector('a-scene');
      const model = document.querySelector('a-gltf-model');
      const box = new AFRAME.THREE.Box3().setFromObject(model.object3D);
      let extent = 0;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new AFRAME.THREE.Vector3(x, y, z).project(scene.camera);
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      }
      return extent;
    })()`)).toBeLessThan(0.95)
    if (artifact === 'canteen') {
      await page.getByRole('slider', { name: 'Kích thước hiện vật AR' }).fill('1.5')
      await expect.poll(() => arFrame.evaluate(`document.querySelector('a-gltf-model').getObject3D('mesh').scale.x`)).toBe(1.5)
      await page.getByRole('button', { name: 'Xoay hiện vật AR sang phải' }).click()
      await expect.poll(() => arFrame.evaluate(`document.querySelector('a-gltf-model').getObject3D('mesh').rotation.y`)).toBeCloseTo(Math.PI / 12)
      await page.getByRole('button', { name: 'Chuyển động AR' }).click()
      await expect.poll(() => arFrame.evaluate(`document.querySelector('a-gltf-model').getObject3D('mesh').rotation.y`)).toBeGreaterThan(Math.PI / 12)
      await page.getByRole('button', { name: 'Đặt lại hiện vật AR' }).click()
      await expect.poll(() => arFrame.evaluate(`document.querySelector('a-gltf-model').getObject3D('mesh').scale.x`)).toBe(1)
    }
    await page.locator('iframe').screenshot({ path: `test-results/ar/tracking-${artifact}.png` })
    await page.getByRole('button', { name: 'Tắt camera' }).click()
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => {
      const stream = (window as Window & { __arTestStream?: MediaStream }).__arTestStream
      return stream?.getTracks().every(track => track.readyState === 'ended')
    })).toBe(true)
  })
}

test('real engine target download failure stops camera and offers recovery', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480
      const ctx = canvas.getContext('2d')!
      const draw = () => { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 640, 480); requestAnimationFrame(draw) }
      draw()
      const stream = canvas.captureStream(15)
      Object.assign(parent, { __arTestStream: stream })
      return stream
    } })
  })
  await page.route('**/assets/cu-chi-targets.mind', route => route.abort('failed'))
  await page.goto('/ar-experience?view=camera')
  await page.getByRole('button', { name: 'Bật camera AR' }).click()
  await expect(page.getByRole('alert')).toContainText('Camera đã tắt', { timeout: 30000 })
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => (window as Window & { __arTestStream?: MediaStream }).__arTestStream?.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
})

test('legacy AR link leads to public center and onsite scan ignores forged AR events', async ({ page }) => {
  const writes = await setup(page)
  await page.goto('/time-portal/dia-dao-cu-chi/ar?mode=live')
  await expect(page).toHaveURL(/\/ar-experience$/)
  await page.evaluate(() => {
    const values = { timelens_token: 'ui-fixture', timelens_user_id: 'ar-test-user', timelens_display_name: 'AR Explorer', timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online' }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  for (const mode of ['online', 'offline']) {
    await page.evaluate(value => localStorage.setItem('timelens_mode', value), mode)
    await page.goto('/scan')
    await expect(page.getByRole('heading', { name: 'Quét trạm Củ Chi' })).toBeVisible()
    await expect(page.locator('aside a[href="/ar-experience"]').first()).toBeVisible()
    await page.evaluate(() => window.postMessage({ type: 'AR_TARGET_FOUND', unlockKey: 'artifact:mu-tai-beo' }, location.origin))
    await expect(page.locator('iframe')).toHaveCount(0)
  }
  expect(writes.filter(path => /checkins|checkin/.test(path))).toHaveLength(0)
  await page.screenshot({ path: 'test-results/ar/onsite-scan.png', fullPage: true })
})


test('portrait color card fits the printable height of one A4 page', async ({ page }) => {
  await setup(page)
  await page.goto('/ar-experience?artifact=compass&view=target')
  await page.emulateMedia({ media: 'print' })
  await expect.poll(() => page.getByRole('img').evaluate(element => (element as HTMLImageElement).naturalHeight)).toBeGreaterThan(0)
  expect((await page.locator('.ar-print-card').boundingBox())!.height).toBeLessThan(1047)
  await page.screenshot({ path: 'test-results/ar/portrait-color-card.png', fullPage: true })
})

test('home UX explains QR versus color target, downloads the photo and labels laptop webcam', async ({ page }) => {
  await setup(page)
  await page.goto('/ar-experience?artifact=hat&view=home')
  await expect(page.getByText('QR mở trang AR. Ảnh màu làm hiện mô hình.', {exact:true})).toBeVisible()
  const downloadLink=page.getByRole('link',{name:'Tải ảnh nhận diện',exact:true})
  await expect(downloadLink).toHaveAttribute('download','DSCF9675.jpg')
  const pending=page.waitForEvent('download'); await downloadLink.click(); const download=await pending
  expect(download.suggestedFilename()).toBe('DSCF9675.jpg')
  const saved=await download.path()
  expect(fs.readFileSync(saved!).equals(fs.readFileSync(new URL('../../public' + catalog.find(item=>item.id==='hat')!.target,import.meta.url)))).toBe(true)
  await page.screenshot({path:'test-results/ar-ux-final/desktop-home-ux.png',fullPage:true})
  await page.getByText('Dùng camera trên laptop?',{exact:true}).click()
  await expect(page.getByText('Webcam cần ảnh in hoặc ảnh mở trên điện thoại, đặt trước camera.',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Dùng webcam laptop',exact:true}).click()
  await expect(page.getByRole('button',{name:'Bật camera AR'})).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('touch phone offers AR start and explains using a second screen or printed card', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  const page=await context.newPage()
  await setup(page)
  await page.goto('/ar-experience?artifact=lamp&view=home')
  await expect(page.getByRole('button',{name:'Bắt đầu quét AR',exact:true})).toBeVisible()
  await expect(page.getByText('Mở ảnh trên màn hình khác hoặc in ảnh; điện thoại không tự quét ảnh trên chính màn hình của nó.',{exact:true})).toBeVisible()
  await expect(page.getByText('Chuẩn bị ảnh trên màn hình khác hoặc bản in',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  await page.screenshot({path:'test-results/ar-ux-final/mobile-home-ux.png',fullPage:true})
  await context.close()
})


test('email is optional for guests and does not send before confirmation', async ({ page }) => {
  await setup(page)
  let sends=0
  await page.route('**/api/ar/cards/email',route=>{sends++;return route.fulfill({json:{success:true,data:{status:'ACCEPTED',artifactId:route.request().postDataJSON().artifactId,cooldownSeconds:60,remainingToday:2}}})})
  await page.goto('/ar-experience?artifact=hat&view=home')
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  await expect(page.getByRole('link',{name:'Đăng nhập để nhận ảnh'})).toHaveAttribute('href',/returnTo=.*ar-experience/)
  await expect(page.getByRole('link',{name:'Tải ảnh nhận diện',exact:true})).toBeVisible()
  expect(sends).toBe(0)
})

async function emailUser(page: Page) {
  await setup(page)
  await page.addInitScript(() => {
    for (const [key,value] of Object.entries({timelens_token:'ar-mail-test',timelens_user_id:'ar-test-user',timelens_display_name:'AR Explorer',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1',timelens_email:'ar@example.test'})) localStorage.setItem(key,value)
  })
}
test('verified account explicitly requests one email pack and sees provider acceptance', async ({ page }) => {
  await emailUser(page)
  await page.route('**/api/ar/cards/email/status', route=>route.fulfill({json:{success:true,data:{available:true,verified:true,email:'ar@example.test',cooldownSeconds:0,remainingToday:3}}}))
  let sends=0
  await page.route('**/api/ar/cards/email',async route=>{sends++;expect(Object.keys(route.request().postDataJSON()).sort()).toEqual(['artifactId','requestId']);expect(route.request().postDataJSON().artifactId).toBe('lamp');await new Promise(resolve=>setTimeout(resolve,200));await route.fulfill({json:{success:true,data:{status:'ACCEPTED',artifactId:route.request().postDataJSON().artifactId,cooldownSeconds:60,remainingToday:2}}})})
  await page.goto('/ar-experience?artifact=lamp&view=home')
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  const send=page.getByRole('button',{name:/^Gửi ảnh .+ vào email$/})
  await expect(send).toBeEnabled()
  expect(sends).toBe(0)
  await send.evaluate(element=>{(element as HTMLButtonElement).click();(element as HTMLButtonElement).click()})
  await expect(page.getByText(/Dịch vụ email đã tiếp nhận ảnh/)).toBeVisible()
  expect(sends).toBe(1)
  await expect(send).toBeDisabled()
})
test('disabled email and unverified email preserve downloads and never report success', async ({ page }) => {
  await emailUser(page)
  await page.route('**/api/ar/cards/email/status',route=>route.fulfill({json:{success:true,data:{available:false,verified:false,email:'ar@example.test',cooldownSeconds:0,remainingToday:3}}}))
  await page.goto('/ar-experience?view=home')
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  await expect(page.getByRole('link',{name:'Xác minh email để nhận ảnh'})).toBeVisible()
  await expect(page.getByRole('button',{name:/^Gửi ảnh .+ vào email$/})).toBeDisabled()
  await expect(page.getByRole('link',{name:'Tải ảnh nhận diện',exact:true})).toBeVisible()
  await expect(page.getByText(/Dịch vụ email đã tiếp nhận/)).toHaveCount(0)
})


test('public HTTPS origin hides localhost guidance and shares the HTTPS camera URL', async ({ page }) => {
  await page.route('https://ar.example.test/**',async route=>{
    const url=new URL(route.request().url())
    if(url.pathname.startsWith('/api/'))return route.fulfill({json:{success:true,data:[]}})
    const response=await route.fetch({url:'http://127.0.0.1:5182'+url.pathname+url.search})
    const body=await response.body()
    await route.fulfill({status:response.status(),headers:response.headers(),body})
  })
  await page.addInitScript(()=>localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false})))
  await page.goto('https://ar.example.test/ar-experience?artifact=lamp&view=home')
  await expect(page.locator('.ar-phone-link')).toHaveAttribute('href','https://ar.example.test/ar-experience?artifact=lamp&view=camera')
  await expect(page.getByText(/Bạn đang chạy trên localhost/)).toHaveCount(0)
  await page.unrouteAll({behavior:'wait'})
})

test('ambiguous email result is not success and never automatically retries', async ({ page }) => {
  test.setTimeout(120000)
  await emailUser(page)
  await page.route('**/api/ar/cards/email/status',route=>route.fulfill({json:{success:true,data:{available:true,verified:true,email:'ar@example.test',cooldownSeconds:0,remainingToday:3}}}))
  let sends=0
  const keys:string[]=[]
  await page.route('**/api/ar/cards/email',route=>{sends++;keys.push(route.request().postDataJSON().requestId);return route.fulfill({status:502,json:{success:false,code:'MAIL_DELIVERY_UNKNOWN',message:'Chưa xác nhận kết quả'}})})
  await page.goto('/ar-experience?view=home')
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  await page.getByRole('button',{name:/^Gửi ảnh .+ vào email$/}).click()
  await expect(page.getByText(/Chưa xác nhận được kết quả gửi/)).toBeVisible()
  await expect(page.getByText(/Dịch vụ email đã tiếp nhận/)).toHaveCount(0)
  expect(sends).toBe(1)
  await expect(page.getByRole('button',{name:/^Gửi ảnh .+ vào email$/})).toBeDisabled()
  await page.getByRole('button',{name:'Tạo yêu cầu mới sau khi kiểm tra hộp thư'}).click()
  expect(sends).toBe(1)
  await page.getByRole('button',{name:/^Gửi ảnh .+ vào email$/}).click()
  await expect.poll(()=>sends).toBe(2)
  expect(keys[1]).not.toBe(keys[0])
})

test('selected artifact email shows one photo and submits only that artifact', async ({ page }) => {
  await emailUser(page)
  await page.route('**/api/ar/cards/email/status',route=>route.fulfill({json:{success:true,data:{available:true,verified:true,email:'ar@example.test',cooldownSeconds:0,remainingToday:3,unavailableReason:null}}}))
  const sent:string[]=[]
  await page.route('**/api/ar/cards/email',route=>{sent.push(route.request().postDataJSON().artifactId);return route.fulfill({json:{success:true,data:{status:'ACCEPTED',artifactId:route.request().postDataJSON().artifactId,cooldownSeconds:60,remainingToday:2}}})})
  await page.goto('/ar-experience?artifact=lamp&view=home')
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  const panel=page.getByRole('region',{name:'Nhận ảnh qua email'})
  await expect(panel.getByText('Đèn dầu',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Gửi ảnh Đèn dầu vào email',exact:true}).click()
  await expect.poll(()=>sent).toEqual(['lamp'])
  await page.getByRole('button',{name:/Bi đông/}).click()
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  await expect(page.getByRole('button',{name:'Gửi ảnh Bi đông vào email',exact:true})).toBeEnabled()
  await expect(page.getByText(/Dịch vụ email đã tiếp nhận ảnh/)).toHaveCount(0)
  await page.getByRole('button',{name:'Gửi ảnh Bi đông vào email',exact:true}).click()
  await expect.poll(()=>sent).toEqual(['lamp','canteen'])
})

test('disabled email explains the actual reason and keeps selected image download usable', async ({ page }) => {
  await emailUser(page)
  await page.route('**/api/ar/cards/email/status',route=>route.fulfill({json:{success:true,data:{available:false,verified:true,email:'ar@example.test',cooldownSeconds:0,remainingToday:3,unavailableReason:'MAIL_DISABLED'}}}))
  await page.goto('/ar-experience?artifact=lamp&view=home')
  await page.getByRole('button',{name:'Nhận ảnh qua email',exact:true}).click()
  await expect(page.getByText('Gửi email đang được tắt trên môi trường này. Bạn vẫn có thể tải hoặc in ảnh đang chọn.',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Gửi ảnh Đèn dầu vào email',exact:true})).toBeDisabled()
  await expect(page.getByRole('link',{name:'Tải ảnh nhận diện',exact:true})).toBeVisible()
})


test('flashlight keeps its own description and model attribution', async ({ page }) => {
  await setup(page)
  await page.goto('/ar-experience?artifact=flashlight')
  const item = JSON.parse(fs.readFileSync(new URL('../../src/features/ar/ar-catalog.json', import.meta.url), 'utf8')).find((value: { id: string }) => value.id === 'flashlight')
  const story = page.locator('.ar-exhibit-story')
  await expect(story).toContainText(item.description)
  await expect(story).toContainText(item.note)
  await expect(story).toContainText(item.author)
  await expect(story).toContainText(item.license)
  await expect(story.getByRole('link', { name: /Nguồn mô hình/ })).toHaveAttribute('href', item.source)
  await expect(story).not.toContainText('dầu hỏa')
})

test('onsite station QR remains usable without the optional Lite pack', async ({ page }) => {
  await emailUser(page)
  await page.addInitScript(() => localStorage.setItem('timelens_mode', 'offline'))
  let dialogs = 0
  page.on('dialog', async dialog => { dialogs++; await dialog.dismiss() })
  const submitted: Record<string, unknown>[] = []
  await page.route('**/api/checkins', route => {
    submitted.push(route.request().postDataJSON())
    return route.fulfill({ status: 422, json: { success: false, code: 'INVALID_QR', message: 'QR fixture: no real check-in' } })
  })
  await page.goto('/scan')
  await expect(page.getByTestId('pack-soft-gate')).toContainText('không bắt buộc')
  await page.locator('#station-qr-input').fill('cu-chi:ST01:0:abcdef')
  await page.getByRole('button', { name: /Check-in ngay/ }).click()
  await expect.poll(() => submitted.length).toBe(1)
  expect(submitted[0]).toMatchObject({ stationCode: 'ST01', presenceMethod: 'QR', qrPayload: 'cu-chi:ST01:0:abcdef' })
  expect(dialogs).toBe(0)
  await expect(page).toHaveURL(/\/scan$/)
  await page.unrouteAll({ behavior: 'wait' })
})
