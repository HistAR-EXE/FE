import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HERITAGE_DRAW_ORDER,
  HERITAGE_REENACTMENT_LABEL,
} from '../src/features/heritage-studio/compositor.ts'
import { addGrain } from '../src/features/heritage-studio/faceHarmonize.ts'

test('composite contract has expected dimensions and exact disclosure label', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/compositor.ts', import.meta.url), 'utf8')
  assert.match(source, /width: 1080, height: 1920/)
  assert.match(source, /width: 1080, height: 1080/)
  assert.equal(HERITAGE_REENACTMENT_LABEL, 'Ảnh hóa thân kỹ thuật số · tái hiện 1968')
})

test('foreground overlay draws after the feathered face', () => {
  assert.deepEqual(HERITAGE_DRAW_ORDER, [
    'background', 'face', 'harmonize', 'grade', 'foreground', 'caption', 'watermark',
  ])
})

test('compositor uses Canvas 2D and does not require WebGL', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/compositor.ts', import.meta.url), 'utf8')
  assert.match(source, /getContext\('2d'\)/)
  assert.doesNotMatch(source, /webgl|WebGL/)
})

test('face photo is isolated with a soft oval mask instead of a rectangular background', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/compositor.ts', import.meta.url), 'utf8')
  assert.match(source, /maskCtx\.ellipse\(/)
  assert.match(source, /maskCtx\.filter = `blur/)
  assert.match(source, /globalCompositeOperation = 'destination-in'/)
  assert.doesNotMatch(source, /createRadialGradient\(centerX, centerY/)
})

test('heritage compositor rejects square output and requires manual crop when detection is unavailable', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/compositor.ts', import.meta.url), 'utf8')
  assert.match(source, /heritage_square_variant_not_supported/)
  assert.match(source, /needsManualCrop/)
})

test('harmonize module exposes scene stats, grain, and contact shadow primitives', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/faceHarmonize.ts', import.meta.url), 'utf8')
  assert.match(source, /sampleSceneStats/)
  assert.match(source, /matchStats/)
  assert.match(source, /addGrain/)
  assert.match(source, /drawContactShadow/)
})

test('grain is stable across preview redraws and export', () => {
  const render = () => {
    const pixels = new Uint8ClampedArray(4 * 24).fill(120)
    const ctx = {
      canvas: { width: 6, height: 4 },
      getImageData: () => ({ data: pixels }),
      putImageData: () => undefined,
    }
    addGrain(ctx, 12)
    return [...pixels]
  }
  assert.deepEqual(render(), render())
})
