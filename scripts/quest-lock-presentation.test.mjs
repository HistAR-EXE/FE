import assert from 'node:assert/strict'
import { test } from 'node:test'
import { questLockKeyLabel } from '../src/features/gamification/questLockPresentation.ts'

test('quest lock keeps API labels and does not invent names for obsolete embedded-tour keys', () => {
  assert.equal(questLockKeyLabel({ key: 'era:1968', label: 'Tết Mậu Thân 1968', done: false }, 0), 'Tết Mậu Thân 1968')
  assert.equal(questLockKeyLabel({ key: 'scene:unknown', label: 'scene:unknown', done: false }, 1), 'Điểm khám phá 2')
})
