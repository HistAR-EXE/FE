import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import {
  chooseFaceCandidate,
  clampPlacement,
  detectFaceCandidates,
  detectFaceGeometry,
  detectFaceGeometries,
  initialPlacement,
} from '../src/features/heritage-studio/facePlacement.ts'
import { alignFaceGeometry, placementFromGeometry } from '../src/features/heritage-studio/faceAlignment.ts'
import { heritageRoleTemplates } from '../src/features/heritage-studio/roleTemplates.ts'

const template = heritageRoleTemplates.find((item) => item.stationCode === 'ST01' && item.roleVariant === 'nam')
const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests/fixtures')

test('deterministic portrait fixtures cover one-face and two-face aspect ratios', async () => {
  const [single, multiple] = await Promise.all([
    sharp(path.join(fixtureRoot, 'portrait-single-face.jpg')).metadata(),
    sharp(path.join(fixtureRoot, 'portrait-two-faces.jpg')).metadata(),
  ])
  assert.deepEqual({ width: single.width, height: single.height, format: single.format }, { width: 640, height: 800, format: 'jpeg' })
  assert.deepEqual({ width: multiple.width, height: multiple.height, format: multiple.format }, { width: 800, height: 640, format: 'jpeg' })
})

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

test('alignment derives roll, scale, and center from normalized eye landmarks', () => {
  const geometry = {
    id: 'face-1',
    box: { x: 0.2, y: 0.2, width: 0.3, height: 0.4 },
    eyeLeft: { x: 0.3, y: 0.4 },
    eyeRight: { x: 0.5, y: 0.45 },
    mouthCenter: { x: 0.4, y: 0.56 },
    chin: { x: 0.4, y: 0.65 },
    ovalPath: null,
  }
  const aligned = alignFaceGeometry(geometry, template.calibration)
  assert.ok(Math.abs(aligned.roll - 14.036) < 0.01)
  assert.ok(Math.abs(aligned.scale - ((template.calibration.faceAnchor.width * 0.46) / Math.hypot(0.2, 0.05))) < 0.0001)
  assert.ok(aligned.center.x > 0 && aligned.center.x < 1)
  assert.ok(aligned.center.y > 0 && aligned.center.y < 1)
})

test('face geometry detector falls back without exposing landmarks to legacy callers', async () => {
  const previous = globalThis.__heritageFaceLandmarker
  globalThis.__heritageFaceLandmarker = { detect: async () => ({
    box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    eyeLeft: { x: 0.18, y: 0.34 },
    eyeRight: { x: 0.32, y: 0.35 },
    mouthCenter: { x: 0.25, y: 0.46 },
    chin: { x: 0.25, y: 0.55 },
    ovalPath: [{ x: 0.12, y: 0.25 }],
  }) }
  try {
    const geometry = await detectFaceGeometry({ width: 1000, height: 500 })
    assert.equal(geometry?.id, 'face-1')
    assert.deepEqual(Object.keys(geometry ?? {}).sort(), ['box', 'chin', 'eyeLeft', 'eyeRight', 'id', 'mouthCenter', 'ovalPath'])
  } finally {
    if (previous) globalThis.__heritageFaceLandmarker = previous
    else delete globalThis.__heritageFaceLandmarker
  }
})

test('local fallback chain includes the self-hosted MediaPipe face detector model', () => {
  const source = readFileSync(new URL('../src/features/heritage-studio/facePlacement.ts', import.meta.url), 'utf8')
  assert.match(source, /MODEL_ASSETS\.detector/)
  assert.match(source, /FaceDetector\.createFromOptions/)
})

test('multiple local geometries are exposed for explicit face selection', async () => {
  const previous = globalThis.__heritageFaceLandmarker
  globalThis.__heritageFaceLandmarker = { detect: async () => [0.2, 0.6].map((x) => ({
    box: { x, y: 0.2, width: 0.2, height: 0.3 },
    eyeLeft: { x: x + 0.04, y: 0.3 }, eyeRight: { x: x + 0.14, y: 0.3 },
    mouthCenter: { x: x + 0.09, y: 0.39 }, chin: { x: x + 0.09, y: 0.47 }, ovalPath: null,
  })) }
  try {
    const faces = await detectFaceGeometries({ width: 800, height: 600 })
    assert.equal(faces.length, 2)
    assert.deepEqual(faces.map((face) => face.id), ['face-1', 'face-2'])
  } finally {
    if (previous) globalThis.__heritageFaceLandmarker = previous
    else delete globalThis.__heritageFaceLandmarker
  }
})

test('detected eye line produces a scaled and counter-rotated target placement', () => {
  const geometry = {
    id: 'face-1', box: { x: 0.2, y: 0.2, width: 0.2, height: 0.3 },
    eyeLeft: { x: 0.24, y: 0.3 }, eyeRight: { x: 0.34, y: 0.32 },
    mouthCenter: { x: 0.29, y: 0.39 }, chin: { x: 0.29, y: 0.48 }, ovalPath: null,
  }
  const placement = placementFromGeometry(geometry, template)
  assert.ok(Math.abs(placement.scale - 0.902) < 0.01)
  assert.ok(Math.abs(placement.rotationDeg - (template.calibration.faceRotationDeg - 11.31)) < 0.1)
  assert.ok(placement.x > 0 && placement.y > 0)
})
