import assert from 'node:assert/strict'
import { test } from 'node:test'
import { questLockKeyLabel } from '../src/features/gamification/questLockPresentation.ts'
import { CU_CHI_LOCATION_ID } from '../src/shared/config/constants.ts'

test('quest lock shows the real 360 scene names when the API returns raw keys', () => {
  const scenes = [
    ['scene:22222222-2222-2222-2222-222222222221', 'Bãi gửi xe gắn máy số 1'],
    ['scene:22222222-2222-2222-2222-222222222223', 'Căn cứ Bộ Tư lệnh Quân khu Sài Gòn - Gia Định'],
  ]
  for (const [key, expected] of scenes) {
    assert.equal(questLockKeyLabel({ key, label: key, done: false }, CU_CHI_LOCATION_ID, 0), expected)
  }
})

test('quest lock keeps readable API labels and hides unknown technical keys', () => {
  assert.equal(questLockKeyLabel({ key: 'era:1968', label: 'Tết Mậu Thân 1968', done: false }, CU_CHI_LOCATION_ID, 0), 'Tết Mậu Thân 1968')
  assert.equal(questLockKeyLabel({ key: 'scene:unknown', label: 'scene:unknown', done: false }, CU_CHI_LOCATION_ID, 1), 'Điểm khám phá 2')
})
