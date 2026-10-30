import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import sharp from 'sharp'
import { originalPhotoPlacement } from '../src/features/photo-flow/originalPhotoGeometry.ts'

test('placement covers the window and centers a portrait without stretching', () => {
  const rect = originalPhotoPlacement(600, 1200, { x: 160, y: 220, width: 760, height: 620 }, { zoom: 1, offsetX: 0, offsetY: 0 })
  assert.equal(rect.width / rect.height, 0.5)
  assert.equal(rect.x + rect.width / 2, 540)
  assert.equal(rect.y + rect.height / 2, 530)
  assert.ok(rect.width >= 760 && rect.height >= 620)
})

test('invalid placement values cannot poison canvas transforms', () => {
  const rect = originalPhotoPlacement(100, 100, { x: 0, y: 0, width: 1080, height: 1080 }, { zoom: Infinity, offsetX: NaN, offsetY: -100 })
  assert.ok(Object.values(rect).every(Number.isFinite))
  assert.equal(rect.width, 1080)
})

test('background-removed portraits initially fit fully inside the frame opening', () => {
  const rect = originalPhotoPlacement(600, 1200, { x: 160, y: 220, width: 760, height: 620 }, { removeBackground: true })
  assert.ok(Math.abs(rect.height - 620) < 1e-9)
  assert.ok(Math.abs(rect.width - 310) < 1e-9)
  assert.ok(Math.abs(rect.y - 220) < 1e-9)
})

test('all supplied frames keep transparent photo windows and opaque decorative artwork', async () => {
  for (const name of ['cu-chi-doc-lap', 'cu-chi-gan-da', 'cu-chi-anh-dung']) {
    const { data, info } = await sharp(fs.readFileSync(new URL('../src/assets/photo-frames/' + name + '.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.width, 1080)
    assert.equal(data[(540 * info.width + 540) * 4 + 3], 0)
    assert.equal(data[(100 * info.width + 540) * 4 + 3], 255)
  }
})
