import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumePosition } from '../src/features/history/progress.ts'
test('resume rejects corrupted, negative, finished and out-of-range progress', () => {
  for (const value of [null, '', 'NaN', '-4', 'Infinity', '663', '659', '900']) assert.equal(resumePosition(value, 663), 0)
  assert.equal(resumePosition('125.5', 663), 125.5)
  assert.equal(resumePosition('12', NaN), 0)
})
import { switchPosition } from '../src/features/history/progress.ts'
test('quality switches preserve final seconds while clamping invalid positions', () => {
  assert.equal(switchPosition(660, 663), 660)
  assert.equal(switchPosition(700, 663), 663)
  assert.equal(switchPosition(-2, 663), 0)
  assert.equal(switchPosition(NaN, 663), 0)
})
