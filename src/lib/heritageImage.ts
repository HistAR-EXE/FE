// src/lib/heritageImage.ts
// Low-light enhancement, "ánh sáng địa đạo" grade and 9:16 watermark export (canvas based).

export const STORY_WIDTH = 1080
export const STORY_HEIGHT = 1920
export const WATERMARK_TEXT = 'timelens.asia'

export type LowLightOptions = {
  /** 0..1 — strength of the brightness curve (gamma lift). */
  boost: number
  /** Apply warm + desaturated + vignette "tunnel light" grade. */
  tunnelGrade: boolean
}

export const DEFAULT_LOW_LIGHT: LowLightOptions = { boost: 0, tunnelGrade: false }

/** Gamma < 1 lifts shadows. boost 0 => 1.0, boost 1 => 0.55. */
function gammaFor(boost: number): number {
  return 1 - 0.45 * Math.min(1, Math.max(0, boost))
}

/** CSS filter approximation used for the live preview only. */
export function buildPreviewFilter({ boost, tunnelGrade }: LowLightOptions): string {
  const parts: string[] = []
  if (boost > 0) parts.push(`brightness(${(1 + boost * 0.55).toFixed(2)})`, `contrast(${(1 + boost * 0.12).toFixed(2)})`)
  if (tunnelGrade) parts.push('saturate(0.72)', 'sepia(0.28)', 'contrast(1.05)')
  return parts.length ? parts.join(' ') : 'none'
}

/** Vignette overlay CSS for preview (matches canvas vignette). */
export const TUNNEL_VIGNETTE_CSS =
  'radial-gradient(ellipse at center, rgba(255,170,80,0.10) 0%, rgba(0,0,0,0) 45%, rgba(20,8,0,0.62) 100%)'

function applyGradeToCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, opts: LowLightOptions) {
  if (opts.boost > 0 || opts.tunnelGrade) {
    const gamma = gammaFor(opts.boost)
    const lut = new Uint8ClampedArray(256)
    for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, gamma))

    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      let r = lut[d[i]]
      let g = lut[d[i + 1]]
      let b = lut[d[i + 2]]
      if (opts.tunnelGrade) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        // desaturate 28%
        r = lum + (r - lum) * 0.72
        g = lum + (g - lum) * 0.72
        b = lum + (b - lum) * 0.72
        // warm tint
        r = r * 1.08 + 6
        g = g * 1.0 + 2
        b = b * 0.86
      }
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
    }
    ctx.putImageData(img, 0, 0)
  }

  if (opts.tunnelGrade) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) / 2)
    grad.addColorStop(0, 'rgba(255,170,80,0.10)')
    grad.addColorStop(0.45, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(20,8,0,0.62)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
}

async function loadBitmap(source: Blob | string): Promise<ImageBitmap | HTMLImageElement> {
  if (source instanceof Blob && typeof createImageBitmap === 'function') return createImageBitmap(source)
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (typeof source === 'string') img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Không thể tải ảnh.'))
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không thể xuất ảnh.'))), type, quality)
  })
}

/** Apply low-light/tunnel grade to a captured photo before upload (keeps original size, max edge 1080). */
export async function enhanceCapturedPhoto(file: File, opts: LowLightOptions, maxEdge = 1080): Promise<File> {
  if (!file.type.startsWith('image/') || (opts.boost <= 0 && !opts.tunnelGrade)) return file
  const bmp = await loadBitmap(file)
  const srcW = 'naturalWidth' in bmp ? bmp.naturalWidth : bmp.width
  const srcH = 'naturalHeight' in bmp ? bmp.naturalHeight : bmp.height
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bmp, 0, 0, w, h)
  if ('close' in bmp) bmp.close()
  applyGradeToCanvas(ctx, w, h, opts)
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await canvasToBlob(canvas, type, 0.92)
  return new File([blob], file.name, { type })
}

/** Render image onto a 1080x1920 (9:16) canvas with blurred backdrop + "timelens.asia" watermark. */
export async function exportStoryImage(source: Blob | string, width = STORY_WIDTH, height = STORY_HEIGHT): Promise<Blob> {
  const bmp = await loadBitmap(source)
  const srcW = 'naturalWidth' in bmp ? bmp.naturalWidth : bmp.width
  const srcH = 'naturalHeight' in bmp ? bmp.naturalHeight : bmp.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas không khả dụng.')

  // backdrop: cover-fill, dimmed
  const cover = Math.max(width / srcW, height / srcH)
  ctx.fillStyle = '#0d0a06'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bmp, (width - srcW * cover) / 2, (height - srcH * cover) / 2, srcW * cover, srcH * cover)
  ctx.fillStyle = 'rgba(13,10,6,0.55)'
  ctx.fillRect(0, 0, width, height)

  // foreground: contain-fit (no crop) unless already ~9:16, then cover
  const isStory = Math.abs(srcW / srcH - width / height) < 0.02
  const fit = isStory ? cover : Math.min(width / srcW, (height * 0.82) / srcH)
  const dw = srcW * fit
  const dh = srcH * fit
  ctx.drawImage(bmp, (width - dw) / 2, (height - dh) / 2 - (isStory ? 0 : height * 0.03), dw, dh)
  if ('close' in bmp) bmp.close()

  // bottom watermark
  const bar = ctx.createLinearGradient(0, height - 260, 0, height)
  bar.addColorStop(0, 'rgba(0,0,0,0)')
  bar.addColorStop(1, 'rgba(0,0,0,0.65)')
  ctx.fillStyle = bar
  ctx.fillRect(0, height - 260, width, 260)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 12
  ctx.fillStyle = '#f2bf50'
  ctx.font = '600 56px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(WATERMARK_TEXT, width / 2, height - 90)
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '400 28px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('TimeLens · Hành trình di sản', width / 2, height - 44)

  return canvasToBlob(canvas, 'image/jpeg', 0.92)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
