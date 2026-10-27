import test from 'node:test'
import assert from 'node:assert/strict'
import { transformGesture } from '../src/features/heritage-studio/gestureMath.ts'

const origin = { x: 0.4, y: 0.2, scale: 1, rotationDeg: 0 }

test('drag uses measured preview dimensions', () => {
  const next = transformGesture(origin, [{ x: 100, y: 120 }], [{ x: 150, y: 180 }], { width: 250, height: 600 })
  assert.ok(Math.abs(next.x - 0.6) < 1e-9)
  assert.ok(Math.abs(next.y - 0.3) < 1e-9)
  assert.equal(next.scale, 1)
  assert.equal(next.rotationDeg, 0)
})

test('two pointers pinch, rotate, and translate around their centroid', () => {
  const next = transformGesture(origin, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 120, y: 110 }, { x: 120, y: 310 }], { width: 400, height: 400 })
  assert.equal(next.x, 0.325)
  assert.ok(Math.abs(next.y - 0.475) < 1e-9)
  assert.equal(next.scale, 2)
  assert.equal(next.rotationDeg, 90)
})
