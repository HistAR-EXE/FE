const MAX_EDGE = 1080

/** Giới hạn cạnh dài nhất 1080px trước upload — tránh crash canvas/mobile. */
export async function resizeImageForUpload(file: File, maxEdge = MAX_EDGE): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  const longest = Math.max(width, height)
  if (longest <= maxEdge) {
    bitmap.close()
    return file
  }

  const scale = maxEdge / longest
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type || 'image/jpeg', 0.9))
  if (!blob) return file
  return new File([blob], file.name, { type: file.type || 'image/jpeg' })
}
