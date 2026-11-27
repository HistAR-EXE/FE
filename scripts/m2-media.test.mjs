import test from 'node:test'
import assert from 'node:assert/strict'

const media = await import('../src/features/living-world/m2Media.ts').catch(() => ({}))

test('private media actions require explicit consent', () => {
  assert.equal(typeof media.requireMediaConsent, 'function')
  assert.throws(() => media.requireMediaConsent(false), /đồng ý/)
  assert.doesNotThrow(() => media.requireMediaConsent(true))
})

test('film does not complete until 45000ms of visible playback', () => {
  assert.equal(typeof media.advanceFilmPlayback, 'function')
  let elapsed = 0
  for (let i = 0; i < 179; i++) elapsed = media.advanceFilmPlayback(elapsed, 250, true)
  assert.equal(elapsed, 44750)
  assert.equal(media.advanceFilmPlayback(elapsed, 250, true), 45000)
  assert.equal(media.advanceFilmPlayback(45000, 250, true), 45000)
})

test('paused or hidden playback cannot advance, and a delayed frame cannot skip a scene', () => {
  assert.equal(typeof media.advanceFilmPlayback, 'function')
  assert.equal(media.advanceFilmPlayback(10000, 60000, false), 10000)
  assert.equal(media.advanceFilmPlayback(10000, 60000, true), 10250)
  assert.equal(media.advanceFilmPlayback(10000, -100, true), 10000)
})

test('film scenes occupy three equal 15 second intervals with final frame clamped', () => {
  assert.equal(typeof media.filmSceneIndex, 'function')
  for (const [time, index] of [[0, 0], [14999, 0], [15000, 1], [30000, 2], [45000, 2]]) {
    assert.equal(media.filmSceneIndex(time), index)
  }
})

test('postcard output never exceeds 960x540 and preserves canvas aspect ratio', () => {
  assert.equal(typeof media.fitMediaSize, 'function')
  assert.deepEqual(media.fitMediaSize(1920, 1080), { width: 960, height: 540 })
  assert.deepEqual(media.fitMediaSize(800, 1200), { width: 360, height: 540 })
  assert.deepEqual(media.fitMediaSize(640, 320), { width: 640, height: 320 })
  assert.throws(() => media.fitMediaSize(0, 1080), /khung hình/)
})

test('capture responses belong to their matching request only', () => {
  assert.equal(typeof media.isCaptureResponse, 'function')
  assert.equal(media.isCaptureResponse({ requestId: 'other', dataUrl: 'data:image/png;base64,YQ==' }, 'mine'), false)
  assert.equal(media.isCaptureResponse({ requestId: 'mine', dataUrl: 'data:image/png;base64,YQ==' }, 'mine'), true)
  assert.equal(media.isCaptureResponse(null, 'mine'), false)
})
