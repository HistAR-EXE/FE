import test from 'node:test'
import assert from 'node:assert/strict'
import { avatarInitials, safeProfileImage, metricValue, stampsForLocation, premiumSources, validateProfileEdit } from '../src/features/profile/profileState.ts'

test('a failed metric is unavailable, not a fake zero', () => {
  assert.equal(metricValue(null, 'completedQuests'), null)
  assert.equal(metricValue({ completedQuests: 0 }, 'completedQuests'), 0)
  assert.equal(metricValue({ completedQuests: 9 }, 'completedQuests'), 9)
})
test('passport keeps all stamps and their own timestamp beyond one catalog page', () => {
  const stamps = Array.from({ length: 61 }, (_, index) => ({ locationId: String(index), completedAt: `stamp-${index}` }))
  assert.equal(stampsForLocation(stamps, '').length, 61)
  assert.deepEqual(stampsForLocation(stamps, '60'), [{ locationId: '60', completedAt: 'stamp-60' }])
})
test('premium source is explicit and a teacher role cannot invent a personal purchase', () => {
  assert.deepEqual(premiumSources('FREE', true), ['organization'])
  assert.deepEqual(premiumSources('PREMIUM', true), ['personal', 'organization'])
  assert.deepEqual(premiumSources('FREE', false), [])
})
test('avatar accepts safe remote/local images and rejects executable or external protocol-relative input', () => {
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,xx', '//bad.test/a.png', '/\\bad.test/a.png']) assert.equal(safeProfileImage(value), null)
  assert.equal(safeProfileImage('/media/avatar.png'), '/media/avatar.png')
  assert.equal(safeProfileImage('https://example.test/avatar.png'), 'https://example.test/avatar.png')
  assert.equal(avatarInitials('Nguyễn Minh Anh'), 'NA')
})
test('personal edits trim inputs, enforce limits and preserve explicit clearing', () => {
  assert.deepEqual(validateProfileEdit('  Minh Anh  ', '  ', ''), { displayName: 'Minh Anh', city: '', avatarUrl: '' })
  assert.throws(() => validateProfileEdit('A', '', ''), /2–80/)
  assert.throws(() => validateProfileEdit('Minh', 'x'.repeat(121), ''), /120/)
  assert.throws(() => validateProfileEdit('Minh', '', 'javascript:alert(1)'), /ảnh/)
})
