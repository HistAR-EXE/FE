import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const server = await createServer({ configFile: false, publicDir: false, cacheDir: 'node_modules/.vite-photo-frames-test', optimizeDeps: { entries: ['src/features/photo-flow/originalPhoto.ts', 'src/features/photo-flow/removePhotoBackground.ts'] }, server: { host: '127.0.0.1', port: 5197, strictPort: true, proxy: { '/vendor/': { target: 'https://media.timelens.asia', changeOrigin: true } } } })
await server.listen()
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  await page.route('**/photo-asset-test', route => route.fulfill({ contentType: 'text/html', body: '<title>Photo compositor test</title>' }))
  await page.goto('http://127.0.0.1:5197/photo-asset-test')
  const result = await page.evaluate(async () => {
    const { exportOriginalPhoto } = await import('/src/features/photo-flow/originalPhoto.ts')
    const { LOCAL_PHOTO_FRAMES } = await import('/src/features/photo-flow/localPhotoFrames.ts')
    const c = document.createElement('canvas'); c.width = 600; c.height = 900
    const ctx = c.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 600, 900)
    const source = new File([await new Promise(resolve => c.toBlob(resolve, 'image/png'))], 'red.png', { type: 'image/png' })
    const inspect = async (blob, x, y) => {
      const bitmap = await createImageBitmap(blob); const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); bitmap.close()
      return { width: canvas.width, height: canvas.height, pixel: [...context.getImageData(x, y, 1, 1).data] }
    }
    const frames = []
    for (const frame of LOCAL_PHOTO_FRAMES) {
      const output = await exportOriginalPhoto(source, 'square', { boost: 0, tunnelGrade: false }, frame.imageUrl)
      frames.push(await inspect(output, 540, 540))
    }
    const story = await exportOriginalPhoto(source, 'story', { boost: 0, tunnelGrade: false }, LOCAL_PHOTO_FRAMES[0].imageUrl)
    const { removePhotoBackground } = await import('/src/features/photo-flow/removePhotoBackground.ts')
    const response = await fetch('/scripts/fixtures/segmentation-test-portrait.jpg')
    const portrait = new File([await response.blob()], 'portrait.jpg', { type: 'image/jpeg' })
    const cutoutPromise = removePhotoBackground(portrait)
    const cached = cutoutPromise === removePhotoBackground(portrait)
    const cutout = await cutoutPromise
    const bitmap = await createImageBitmap(cutout); const maskCanvas = document.createElement('canvas'); maskCanvas.width = bitmap.width; maskCanvas.height = bitmap.height
    const maskCtx = maskCanvas.getContext('2d'); maskCtx.drawImage(bitmap, 0, 0); bitmap.close()
    const pixels = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data
    let transparent = 0, opaque = 0
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] < 20) transparent++; if (pixels[i] > 240) opaque++ }
    let missingPerson = false
    try { await removePhotoBackground(source) } catch (error) { missingPerson = error.message.includes('Không tìm thấy người') }
    return { frames, story: await inspect(story, 540, 10), cached, transparent, opaque, missingPerson }
  })
  assert.equal(result.frames.length, 3)
  for (const frame of result.frames) { assert.equal(frame.width, 1080); assert.deepEqual(frame.pixel, [255, 0, 0, 255]) }
  assert.equal(result.story.height, 1920)
  assert.deepEqual(result.story.pixel, [233, 223, 196, 255])
  assert.equal(result.cached, true)
  assert.equal(result.missingPerson, true, 'No-person input must not silently export an empty cutout')
  assert.ok(result.transparent > 100 && result.opaque > 100, JSON.stringify(result))
  console.log('PASS: three real transparent frames composite correctly; story art stays square; local person segmentation removes background and caches inference.')
} finally {
  await browser.close()
  const closing = server.close()
  server.httpServer?.closeAllConnections()
  await closing
}
