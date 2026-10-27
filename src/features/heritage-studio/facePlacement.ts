import type { FaceGeometry, HeritageRoleTemplate } from './types.ts'

export type FaceCandidate = {
  readonly id: string
  /** Normalized source-image rectangle. No landmarks or identity data are retained. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type FacePlacement = {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly rotationDeg: number
}

type FaceDetectorResult = { boundingBox: DOMRectReadOnly }
type FaceDetectorLike = { detect(source: ImageBitmapSource): Promise<FaceDetectorResult[]> }
type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike

type GeometryDetector = { detect(source: ImageBitmapSource): Promise<Omit<FaceGeometry, 'id'>[] | Omit<FaceGeometry, 'id'> | null> }

const MODEL_ASSETS = Object.freeze({
  wasm: '/vendor/mediapipe',
  landmarker: '/vendor/mediapipe/face_landmarker.task',
  detector: '/vendor/mediapipe/blaze_face_short_range.tflite',
})
let landmarkerPromise: Promise<GeometryDetector | null> | null = null
let detectorPromise: Promise<GeometryDetector | null> | null = null

async function loadLocalLandmarker(): Promise<GeometryDetector | null> {
  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(MODEL_ASSETS.wasm)
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_ASSETS.landmarker },
      runningMode: 'IMAGE',
      numFaces: 5,
    })
    return {
      async detect(input: ImageBitmapSource) {
        const result = landmarker.detect(input as ImageBitmap)
        return (result.faceLandmarks ?? []).filter((landmarks) => landmarks.length > 263).map((landmarks) => {
          const point = (index: number) => ({ x: landmarks[index].x, y: landmarks[index].y })
          const xs = landmarks.map((item) => item.x)
          const ys = landmarks.map((item) => item.y)
          return {
            box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
            eyeLeft: point(33), eyeRight: point(263), mouthCenter: point(13), chin: point(152),
            ovalPath: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109].map(point),
          }
        })
      },
    }
  } catch {
    return null
  }
}

async function loadLocalFaceDetector(): Promise<GeometryDetector | null> {
  try {
    const { FaceDetector: MediaPipeFaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(MODEL_ASSETS.wasm)
    const detector = await MediaPipeFaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_ASSETS.detector },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    })
    return {
      async detect(input: ImageBitmapSource) {
        const detections = detector.detect(input as ImageBitmap).detections ?? []
        const size = sourceSize(input) ?? { width: 1000, height: 1000 }
        return detections.filter((detection) => detection.boundingBox).map((detection) => {
          const box = detection.boundingBox!
          const keypoints = detection.keypoints ?? []
          // MediaPipe keypoints are normalized; bounding boxes are image pixels.
          const leftEye = keypoints[0] ? { x: keypoints[0].x, y: keypoints[0].y } : { x: box.originX / size.width, y: box.originY / size.height }
          const rightEye = keypoints[1] ? { x: keypoints[1].x, y: keypoints[1].y } : { x: leftEye.x + box.width / size.width * 0.36, y: leftEye.y }
          const center = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }
          return {
            box: { x: box.originX / size.width, y: box.originY / size.height, width: box.width / size.width, height: box.height / size.height },
            eyeLeft: leftEye, eyeRight: rightEye,
            mouthCenter: { x: center.x, y: center.y + box.height / size.height * 0.3 },
            chin: { x: center.x, y: center.y + box.height / size.height * 0.45 },
            ovalPath: null,
          }
        })
      },
    }
  } catch {
    return null
  }
}

const MAX_DETECTION_EDGE = 1280

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function sourceSize(source: ImageBitmapSource): { width: number; height: number } | null {
  const value = source as unknown as Record<string, unknown>
  const width = Number(value.width ?? value.naturalWidth ?? value.videoWidth)
  const height = Number(value.height ?? value.naturalHeight ?? value.videoHeight)
  return width > 0 && height > 0 ? { width, height } : null
}

async function detectionSource(source: ImageBitmapSource): Promise<{
  source: ImageBitmapSource
  width: number
  height: number
  close: () => void
}> {
  const size = sourceSize(source)
  if (!size) throw new Error('heritage_face_source_size_unavailable')
  const ratio = Math.min(1, MAX_DETECTION_EDGE / Math.max(size.width, size.height))
  if (ratio === 1 || typeof createImageBitmap !== 'function') {
    return { source, ...size, close: () => undefined }
  }
  const width = Math.max(1, Math.round(size.width * ratio))
  const height = Math.max(1, Math.round(size.height * ratio))
  const bitmap = await createImageBitmap(source, { resizeWidth: width, resizeHeight: height })
  return { source: bitmap, width, height, close: () => bitmap.close() }
}

export async function detectFaceCandidates(source: ImageBitmapSource): Promise<FaceCandidate[]> {
  const Detector = (globalThis as typeof globalThis & { FaceDetector?: FaceDetectorConstructor }).FaceDetector
  if (!Detector) return []

  const prepared = await detectionSource(source)
  try {
    const detector = new Detector({ fastMode: true, maxDetectedFaces: 5 })
    const detected = await detector.detect(prepared.source)
    return detected
      .map(({ boundingBox }, index) => ({
        id: `face-${index + 1}`,
        x: clamp(boundingBox.x / prepared.width, 0, 1),
        y: clamp(boundingBox.y / prepared.height, 0, 1),
        width: clamp(boundingBox.width / prepared.width, 0, 1),
        height: clamp(boundingBox.height / prepared.height, 0, 1),
      }))
      .filter((candidate) => candidate.width > 0 && candidate.height > 0)
  } finally {
    prepared.close()
  }
}

function normalizeGeometry(value: Omit<FaceGeometry, 'id'> | null, id: string): FaceGeometry | null {
  if (!value) return null
  const points = [value.eyeLeft, value.eyeRight, value.mouthCenter, value.chin]
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) || !Number.isFinite(value.box.x) || !Number.isFinite(value.box.y) || value.box.width <= 0 || value.box.height <= 0) return null
  return { id, box: value.box, eyeLeft: value.eyeLeft, eyeRight: value.eyeRight, mouthCenter: value.mouthCenter, chin: value.chin, ovalPath: value.ovalPath ?? null }
}

async function withinDeadline<T>(work: Promise<T>, milliseconds: number): Promise<T | null> {
  if (milliseconds <= 0) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([work, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), milliseconds) })])
  } finally { if (timer) clearTimeout(timer) }
}

/**
 * Detects normalized geometry locally. Adapters are intentionally resolved from
 * same-origin/runtime globals so landmark data never leaves this closure.
 */
export async function detectFaceGeometries(source: ImageBitmapSource): Promise<FaceGeometry[]> {
  const deadline = Date.now() + 8000
  const runtime = globalThis as typeof globalThis & {
    __heritageFaceLandmarker?: GeometryDetector
    __heritageMediaPipeFaceDetector?: GeometryDetector
  }
  const adapters: Array<() => Promise<GeometryDetector | null>> = [
    () => runtime.__heritageFaceLandmarker ? Promise.resolve(runtime.__heritageFaceLandmarker) : (landmarkerPromise ??= loadLocalLandmarker().then((result) => { if (!result) landmarkerPromise = null; return result }).catch((error) => { landmarkerPromise = null; throw error })),
    () => runtime.__heritageMediaPipeFaceDetector ? Promise.resolve(runtime.__heritageMediaPipeFaceDetector) : (detectorPromise ??= loadLocalFaceDetector().then((result) => { if (!result) detectorPromise = null; return result }).catch((error) => { detectorPromise = null; throw error })),
  ]
  for (const load of adapters) {
    try {
      const adapter = await withinDeadline(load(), deadline - Date.now())
      if (!adapter) continue
      const detected = await withinDeadline(adapter.detect(source), deadline - Date.now())
      const geometries = (Array.isArray(detected) ? detected : detected ? [detected] : [])
        .map((face, index) => normalizeGeometry(face, `face-${index + 1}`))
        .filter((face): face is FaceGeometry => face !== null)
      if (geometries.length) return geometries
    } catch {
      // Continue down the local fallback chain without surfacing model errors.
    }
  }
  const candidates = await detectFaceCandidates(source)
  return candidates.map((candidate) => {
    const center = { x: candidate.x + candidate.width / 2, y: candidate.y + candidate.height * 0.42 }
    return {
    id: candidate.id,
    box: { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height },
    eyeLeft: { x: center.x - candidate.width * 0.18, y: center.y },
    eyeRight: { x: center.x + candidate.width * 0.18, y: center.y },
    mouthCenter: { x: center.x, y: candidate.y + candidate.height * 0.65 },
    chin: { x: center.x, y: candidate.y + candidate.height * 0.9 },
    ovalPath: null,
    }
  })
}

export async function detectFaceGeometry(source: ImageBitmapSource): Promise<FaceGeometry | null> {
  return (await detectFaceGeometries(source))[0] ?? null
}

export { MODEL_ASSETS }

export function chooseFaceCandidate(
  candidates: readonly FaceCandidate[],
  selectedId?: string,
): FaceCandidate | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]
  if (!selectedId) throw new Error('heritage_face_selection_required')
  const selected = candidates.find((candidate) => candidate.id === selectedId)
  if (!selected) throw new Error('heritage_face_selection_invalid')
  return selected
}

export function initialPlacement(
  candidate: FaceCandidate | null,
  template: HeritageRoleTemplate,
): FacePlacement {
  void candidate
  const anchor = template.calibration.faceAnchor
  return clampPlacement({
    x: anchor.x,
    y: anchor.y,
    scale: 1,
    rotationDeg: template.calibration.faceRotationDeg,
  }, template)
}

export function clampPlacement(
  placement: FacePlacement,
  template: HeritageRoleTemplate,
): FacePlacement {
  const anchor = template.calibration.faceAnchor
  const marginX = Math.max(0.08, anchor.width * 0.75)
  const marginY = Math.max(0.08, anchor.height * 0.75)
  return {
    x: clamp(placement.x, Math.max(0, anchor.x - marginX), Math.min(1, anchor.x + marginX)),
    y: clamp(placement.y, Math.max(0, anchor.y - marginY), Math.min(1, anchor.y + marginY)),
    scale: clamp(placement.scale, 0.35, 4),
    rotationDeg: clamp(placement.rotationDeg, -20, 20),
  }
}
