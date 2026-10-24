import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HERITAGE_DRAW_ORDER,
  HERITAGE_REENACTMENT_LABEL,
} from '../src/features/heritage-studio/compositor.ts'

test('composite contract has expected dimensions and exact disclosure label', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/compositor.ts', import.meta.url), 'utf8')
  assert.match(source, /width: 1080, height: 1920/)
  assert.match(source, /width: 1080, height: 1080/)
  assert.equal(HERITAGE_REENACTMENT_LABEL, 'Ảnh hóa thân kỹ thuật số · tái hiện 1968')
})

test('foreground overlay draws after the feathered face', () => {
  assert.deepEqual(HERITAGE_DRAW_ORDER, [
    'background', 'face', 'grade', 'foreground', 'caption', 'watermark',
  ])
})

test('compositor uses Canvas 2D and does not require WebGL', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/compositor.ts', import.meta.url), 'utf8')
  assert.match(source, /getContext\('2d'\)/)
  assert.doesNotMatch(source, /webgl|WebGL/)
})
