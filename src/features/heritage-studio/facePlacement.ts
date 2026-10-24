import type { HeritageRoleTemplate } from './types.ts'

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
  const anchor = template.calibration.faceAnchor
  if (!candidate) {
    return clampPlacement({
      x: anchor.x,
      y: anchor.y,
      scale: 1,
      rotationDeg: template.calibration.faceRotationDeg,
    }, template)
  }
  const widthScale = anchor.width / candidate.width
  const heightScale = anchor.height / candidate.height
  return clampPlacement({
    x: anchor.x - candidate.x * Math.min(widthScale, heightScale),
    y: anchor.y - candidate.y * Math.min(widthScale, heightScale),
    scale: Math.min(widthScale, heightScale),
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
