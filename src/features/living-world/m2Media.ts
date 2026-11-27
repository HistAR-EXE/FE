export const FILM_DURATION_MS = 45_000
export const MEDIA_WATERMARK = 'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS'

export function requireMediaConsent(accepted: boolean): void {
  if (!accepted) throw new Error('Hãy chủ động chọn đồng ý trước khi lưu sáng tạo cá nhân.')
}

export function advanceFilmPlayback(elapsed: number, delta: number, visiblePlaying: boolean): number {
  return Math.min(FILM_DURATION_MS, elapsed + (visiblePlaying ? Math.max(0, Math.min(250, delta)) : 0))
}

export function filmSceneIndex(elapsed: number): number {
  return Math.max(0, Math.min(2, Math.floor(elapsed / 15_000)))
}

export function fitMediaSize(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Không có khung hình để chụp.')
  const scale = Math.min(1, 960 / width, 540 / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

type CaptureResponse = { requestId: string; dataUrl?: string; error?: string }
export function isCaptureResponse(value: unknown, requestId: string): value is CaptureResponse {
  return !!value && typeof value === 'object' && 'requestId' in value && value.requestId === requestId
}

export function requestWorldFrame(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID()
    const cleanup = () => {
      window.clearTimeout(timeout)
      window.removeEventListener('timelens-capture-frame-result', receive)
      signal.removeEventListener('abort', abort)
    }
    const abort = () => { cleanup(); reject(new Error('Đã hủy chụp ảnh.')) }
    const receive = (event: Event) => {
      const result: unknown = (event as CustomEvent).detail
      if (!isCaptureResponse(result, requestId)) return
      cleanup()
      if (result.dataUrl?.startsWith('data:image/png;base64,')) resolve(result.dataUrl)
      else reject(new Error(result.error || 'Không chụp được cảnh 3D. Hãy trở lại thế giới và thử lại.'))
    }
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Cảnh 3D chưa sẵn sàng để chụp. Hãy thử lại.')) }, 5000)
    window.addEventListener('timelens-capture-frame-result', receive)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    window.dispatchEvent(new CustomEvent('timelens-capture-frame', { detail: { requestId } }))
  })
}

export async function composePostcard(dataUrl: string, zone: string, caption: string, frame: string): Promise<string> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 960; canvas.height = 540
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Trình duyệt chưa hỗ trợ tạo bưu thiếp.')
  const sepia = frame === 'SEPIA_SKETCH'
  ctx.fillStyle = frame === 'DAYLIGHT_ARCHIVE' ? '#f4f0df' : sepia ? '#ded0aa' : '#302f25'
  ctx.fillRect(0, 0, 960, 540)
  ctx.save()
  ctx.filter = sepia ? 'sepia(0.75)' : 'none'
  const size = fitMediaSize(image.width, image.height)
  const scale = Math.min(912 / size.width, 382 / size.height)
  const width = size.width * scale, height = size.height * scale
  ctx.drawImage(image, 480 - width / 2, 24 + (382 - height) / 2, width, height)
  ctx.restore()
  ctx.strokeStyle = '#bd9d56'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, 936, 516)
  ctx.fillStyle = frame === 'LANTERN_GLOW' ? '#fff4d5' : '#292e20'
  ctx.font = 'bold 22px sans-serif'; ctx.fillText(zone.slice(0, 72), 30, 438, 900)
  ctx.font = '18px sans-serif'; ctx.fillText(caption.slice(0, 160), 30, 473, 900)
  ctx.font = 'bold 16px sans-serif'; ctx.fillText(MEDIA_WATERMARK, 30, 510, 900)
  const output = canvas.toDataURL('image/png')
  if (output.length > 4 * 1024 * 1024) throw new Error('Ảnh vượt dung lượng lưu trên thiết bị. Hãy chọn một góc chụp khác.')
  return output
}
