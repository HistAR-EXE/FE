import modelUrl from '../../assets/photo-frames/selfie_segmenter.tflite?url'
import { loadHeritageBitmap } from '../../lib/heritageImage'
import type { ImageSegmenter } from '@mediapipe/tasks-vision'

let segmenterPromise: Promise<ImageSegmenter> | undefined
const cutouts = new WeakMap<File, Promise<Blob>>()
async function segmenter() {
  if (!segmenterPromise) segmenterPromise = (async () => {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks('/vendor/mediapipe')
    return ImageSegmenter.createFromOptions(fileset, { baseOptions: { modelAssetPath: modelUrl }, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false })
  })().catch(error => { segmenterPromise = undefined; throw error })
  return segmenterPromise
}

/** Source photos stay on this device. Cache cutouts per File so slider changes do not rerun inference. */
export function removePhotoBackground(file: File): Promise<Blob> {
  const cached = cutouts.get(file)
  if (cached) return cached
  const task = (async () => {
    const photo = await loadHeritageBitmap(file)
    const canvas = document.createElement('canvas')
    try {
      const width = 'naturalWidth' in photo ? photo.naturalWidth : photo.width
      const height = 'naturalHeight' in photo ? photo.naturalHeight : photo.height
      const scale = Math.min(1, 1600 / Math.max(width, height))
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas không khả dụng.')
      ctx.drawImage(photo, 0, 0, canvas.width, canvas.height)
      const engine = await segmenter()
      let hasPerson = false
      engine.segment(canvas, result => {
        // Single-mask models expose foreground directly; two-category models
        // expose background at index 0 and person at index 1.
        const masks = result.confidenceMasks
        const mask = masks?.[masks.length > 1 ? 1 : 0]
        if (!mask) throw new Error('Chưa nhận diện được người trong ảnh.')
        const values = mask.getAsFloat32Array()
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let foreground = 0
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const confidence = values[Math.min(mask.height - 1, Math.floor(y * mask.height / canvas.height)) * mask.width + Math.min(mask.width - 1, Math.floor(x * mask.width / canvas.width))]
          if (confidence > 0.5) foreground++
          pixels.data[(y * canvas.width + x) * 4 + 3] *= Math.max(0, Math.min(1, (confidence - 0.2) / 0.6))
        }
        hasPerson = foreground >= canvas.width * canvas.height * 0.005
        ctx.putImageData(pixels, 0, 0)
      })
      // Let MediaPipe release callback masks before reporting a normal no-person input.
      if (!hasPerson) throw new Error('Không tìm thấy người để tách nền. Hãy chọn ảnh rõ người hoặc tắt tách nền.')
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Chưa xuất được ảnh tách nền.')), 'image/png'))
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Không tìm thấy người')) throw error
      throw new Error('Chưa tách được nền. Kiểm tra kết nối để tải công cụ hoặc tắt tách nền và thử lại.', { cause: error })
    } finally {
      if ('close' in photo) photo.close()
      canvas.width = 0; canvas.height = 0
    }
  })()
  cutouts.set(file, task)
  void task.catch(() => { if (cutouts.get(file) === task) cutouts.delete(file) })
  return task
}
