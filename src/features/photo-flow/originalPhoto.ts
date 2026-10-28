import { applyGradeToCanvas, heritageCanvasToBlob, loadHeritageBitmap, type LowLightOptions } from '../../lib/heritageImage'

/** Original photos use the same center-cover crop in preview and in the saved file. */
export async function exportOriginalPhoto(file: File, variant: 'square' | 'story', lowLight: LowLightOptions, frameUrl?: string): Promise<File> {
  const photo = await loadHeritageBitmap(file)
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
    const scale = Math.max(width / sourceWidth, height / sourceHeight)
    context.drawImage(photo, (width - sourceWidth * scale) / 2, (height - sourceHeight * scale) / 2, sourceWidth * scale, sourceHeight * scale)
    applyGradeToCanvas(context, width, height, lowLight)
    if (frameUrl) {
      try { frame = await loadHeritageBitmap(frameUrl) }
      catch { throw new Error('Không tải được khung ảnh. Hãy thử lại hoặc chọn không dùng khung.') }
      context.drawImage(frame, 0, 0, width, height)
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
