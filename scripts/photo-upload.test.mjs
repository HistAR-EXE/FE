import test from 'node:test'
import assert from 'node:assert/strict'
import { photoUploadError } from '../src/features/photo-flow/photoUpload.ts'

test('accepts supported photos and prevents empty or oversized uploads', () => {
    assert.equal(photoUploadError({ type: 'image/jpeg', size: 100 }), null)
    assert.equal(photoUploadError({ type: 'image/png', size: 20 * 1024 * 1024 }), null)
    assert.match(photoUploadError({ type: 'image/jpeg', size: 21 * 1024 * 1024 }), /20 MB/)
    assert.match(photoUploadError({ type: 'image/jpeg', size: 0 }), /trống/)
    assert.match(photoUploadError({ type: 'application/pdf', size: 100 }), /JPG/)
    assert.match(photoUploadError({ type: 'image/svg+xml', size: 100 }), /JPG/)
})
