export type PhotoStage = 'create' | 'review' | 'share'
export function photoFlowStage(params: URLSearchParams): PhotoStage {
  return !params.get('creationId') ? 'create' : params.get('step') === 'review' ? 'review' : 'share'
}
export function photoFlowPath(params: URLSearchParams, stage: PhotoStage): string {
  const next = new URLSearchParams(params)
  next.delete('outputUrl')
  if (stage === 'create') { next.delete('creationId'); next.delete('step') }
  else next.set('step', stage)
  return `/photo-frame${next.size ? `?${next}` : ''}`
}
export function photoFilename(variant: string, mime: string) {
  return `timelens-${variant === 'square' ? 'square' : '9x16'}.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`
}
type NativeShare = { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean }
export async function sharePhoto(nav: NativeShare, file: File, caption: string, url: string, download: () => void): Promise<'shared'|'downloaded'|'cancelled'> {
  if (!nav.share) { download(); return 'downloaded' }
  try {
    if (nav.canShare?.({ files: [file] })) await nav.share({ files: [file], title: 'TimeLens', text: caption })
    else if (url) await nav.share({ title: 'TimeLens', text: caption, url })
    else { download(); return 'downloaded' }
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}
export async function savedPhotoFile(blob: Blob, variant: string): Promise<File> {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null
  if (!mime) throw new Error('Chưa tải được dữ liệu ảnh hợp lệ. Vui lòng thử lại.')
  return new File([blob], photoFilename(variant, mime), { type: mime })
}
