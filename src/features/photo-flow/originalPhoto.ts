import { applyGradeToCanvas, heritageCanvasToBlob, loadHeritageBitmap, type LowLightOptions } from '../../lib/heritageImage'
import { localPhotoWindow } from './localPhotoFrames'
import { originalPhotoPlacement, type OriginalPhotoOptions } from './originalPhotoGeometry'
export type { OriginalPhotoOptions } from './originalPhotoGeometry'

/** Original photos use the same center-cover crop in preview and in the saved file. */
export async function exportOriginalPhoto(file: File, variant: 'square' | 'story', lowLight: LowLightOptions, frameUrl?: string, options: OriginalPhotoOptions = {}): Promise<File> {
  const source = options.removeBackground ? await (await import('./removePhotoBackground')).removePhotoBackground(file) : file
  const photo = await loadHeritageBitmap(source)
  let frame: ImageBitmap | HTMLImageElement | null = null
  const canvas = document.createElement('canvas')
  try {
    const width = 1080, height = variant === 'square' ? 1080 : 1920
    const sourceWidth = 'naturalWidth' in photo ? photo.naturalWidth : photo.width
    const sourceHeight = 'naturalHeight' in photo ? photo.naturalHeight : photo.height
    if (!sourceWidth || !sourceHeight) throw new Error('Ảnh không có kích thước hợp lệ.')
    canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt chưa hỗ trợ xuất ảnh. Vui lòng thử lại.')
    context.fillStyle = '#e9dfc4'
    context.fillRect(0, 0, width, height)
    const window = frameUrl ? localPhotoWindow(frameUrl) : null
    const frameY = window ? (height - width) / 2 : 0
    const area = window ? { ...window, y: window.y + frameY } : { x: 0, y: 0, width, height }
    const placement = originalPhotoPlacement(sourceWidth, sourceHeight, area, options)
    context.save()
    if (window) { context.beginPath(); context.rect(0, frameY, width, width); context.clip() }
    context.drawImage(photo, placement.x, placement.y, placement.width, placement.height)
    context.restore()
    applyGradeToCanvas(context, width, height, lowLight)
    if (frameUrl) {
      try { frame = await loadHeritageBitmap(frameUrl) }
      catch { throw new Error('Không tải được khung ảnh. Hãy thử lại hoặc chọn không dùng khung.') }
      // Supplied square artwork stays square even in a 9:16 export.
      context.drawImage(frame, 0, frameY, width, window ? width : height)
    }
    const mime = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    const blob = await heritageCanvasToBlob(canvas, mime, 0.92)
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `timelens-${variant === 'square' ? 'square' : '9x16'}.${extension}`, { type: blob.type })
  } finally {
    if ('close' in photo) photo.close()
    if (frame && 'close' in frame) frame.close()
    canvas.width = 0; canvas.height = 0
  }
}
