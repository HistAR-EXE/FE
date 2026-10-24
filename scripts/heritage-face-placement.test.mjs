import test from 'node:test'
import assert from 'node:assert/strict'
import {
  chooseFaceCandidate,
  clampPlacement,
  detectFaceCandidates,
  initialPlacement,
} from '../src/features/heritage-studio/facePlacement.ts'
import { heritageRoleTemplates } from '../src/features/heritage-studio/roleTemplates.ts'

const template = heritageRoleTemplates.find((item) => item.stationCode === 'ST01' && item.roleVariant === 'nam')

test('placement is clamped to the approved template anchor area', () => {
  const placed = clampPlacement({ x: -4, y: 8, scale: 50, rotationDeg: 90 }, template)
  assert.ok(placed.x >= 0 && placed.x <= 1)
  assert.ok(placed.y >= 0 && placed.y <= 1)
  assert.equal(placed.scale, 4)
  assert.equal(placed.rotationDeg, 20)
})

test('missing detector uses the manual template default without identity inference', async () => {
  const previous = globalThis.FaceDetector
  delete globalThis.FaceDetector
  try {
    assert.deepEqual(await detectFaceCandidates({ width: 1080, height: 1920 }), [])
    const placed = initialPlacement(null, template)
    assert.equal(placed.x, template.calibration.faceAnchor.x)
    assert.equal(placed.y, template.calibration.faceAnchor.y)
  } finally {
    if (previous) globalThis.FaceDetector = previous
  }
})

test('multiple faces require an explicit user choice', () => {
  const candidates = [
    { id: 'face-1', x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    { id: 'face-2', x: 0.5, y: 0.2, width: 0.25, height: 0.25 },
  ]
  assert.throws(() => chooseFaceCandidate(candidates), /selection_required/)
  assert.equal(chooseFaceCandidate(candidates, 'face-2')?.id, 'face-2')
})

test('detector output contains only normalized rectangles', async () => {
  const previous = globalThis.FaceDetector
  globalThis.FaceDetector = class {
    async detect() {
      return [{ boundingBox: { x: 100, y: 50, width: 200, height: 300 } }]
    }
  }
  try {
    const [candidate] = await detectFaceCandidates({ width: 1000, height: 500 })
    assert.deepEqual(candidate, { id: 'face-1', x: 0.1, y: 0.1, width: 0.2, height: 0.6 })
    assert.deepEqual(Object.keys(candidate), ['id', 'x', 'y', 'width', 'height'])
  } finally {
    if (previous) globalThis.FaceDetector = previous
    else delete globalThis.FaceDetector
  }
})
