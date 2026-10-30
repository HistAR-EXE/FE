export type OriginalPhotoOptions = { zoom?: number; offsetX?: number; offsetY?: number; removeBackground?: boolean }
export type PhotoRect = { x: number; y: number; width: number; height: number }
const bounded = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback

export function originalPhotoPlacement(sourceWidth: number, sourceHeight: number, window: PhotoRect, options: OriginalPhotoOptions = {}): PhotoRect {
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error('Ảnh không có kích thước hợp lệ.')
  const fit = options.removeBackground ? Math.min : Math.max
  const scale = fit(window.width / sourceWidth, window.height / sourceHeight) * bounded(options.zoom, 1, 1, 3)
  const width = sourceWidth * scale, height = sourceHeight * scale
  return { width, height, x: window.x + (window.width - width) / 2 + bounded(options.offsetX, 0, -1, 1) * window.width / 2, y: window.y + (window.height - height) / 2 + bounded(options.offsetY, 0, -1, 1) * window.height / 2 }
}
