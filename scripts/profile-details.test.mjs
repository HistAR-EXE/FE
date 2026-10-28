import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAvatarFile, validateProfileDetails } from '../src/features/profile/profileDetails.ts'
test('avatar accepts supported files and rejects empty, oversize and unsupported files', () => {
  assert.doesNotThrow(() => validateAvatarFile({ type: 'image/webp', size: 1024 }))
  for (const file of [{type:'image/svg+xml',size:20},{type:'image/png',size:0},{type:'image/jpeg',size:5*1024*1024+1}]) assert.throws(() => validateAvatarFile(file))
})
test('details trim, allow clearing and reject invalid phone, future date and excessive biography', () => {
  assert.equal(validateProfileDetails({fullName:'  Nguyễn An  ',phone:'',dateOfBirth:''}).fullName, 'Nguyễn An')
  assert.throws(() => validateProfileDetails({phone:'abc'}))
  assert.throws(() => validateProfileDetails({dateOfBirth:'2999-01-01'}))
  assert.throws(() => validateProfileDetails({bio:'x'.repeat(1001)}))
})
