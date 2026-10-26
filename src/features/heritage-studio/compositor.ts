import {
  applyGradeToCanvas,
  heritageCanvasToBlob,
  loadHeritageBitmap,
  WATERMARK_TEXT,
  type LowLightOptions,
} from '../../lib/heritageImage.ts'
import type { FaceCandidate, FacePlacement } from './facePlacement.ts'
import type { PublishedHeritageRoleTemplate } from './types.ts'

export const HERITAGE_REENACTMENT_LABEL = 'Ảnh hóa thân kỹ thuật số · tái hiện 1968'
export const HERITAGE_DRAW_ORDER = Object.freeze([
  'background',
  'face',
  'grade',
  'foreground',
  'caption',
  'watermark',
] as const)

export type HeritageOutputVariant = 'square' | 'story'

export type ComposeHeritagePortraitInput = {
  readonly photo: Blob | string
  readonly template: PublishedHeritageRoleTemplate
  readonly candidate: FaceCandidate | null
  readonly placement: FacePlacement
  readonly lowLight: LowLightOptions
  readonly variant: HeritageOutputVariant
}

function dimensions(variant: HeritageOutputVariant): { width: number; height: number } {
  return variant === 'story' ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 }
}

function bitmapSize(bitmap: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return {
    width: 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width,
    height: 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height,
  }
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement): void {
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  bitmap: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  ctx.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function faceCrop(candidate: FaceCandidate | null, width: number, height: number) {
  if (candidate) {
    // Keep the crop tight. The overlay already provides hair/hat and shoulders, so
    // including the surroundings here creates a visible rectangular "photo patch".
    const insetX = candidate.width * 0.07
    const insetTop = candidate.height * 0.02
    const insetBottom = candidate.height * 0.04
    return {
      x: (candidate.x + insetX) * width,
      y: (candidate.y + insetTop) * height,
      width: Math.max(1, (candidate.width - insetX * 2) * width),
      height: Math.max(1, (candidate.height - insetTop - insetBottom) * height),
    }
  }
  // FaceDetector is not available in every browser. A portrait-friendly fallback
  // is deliberately narrower than the full image to avoid carrying its background.
  const cropWidth = Math.min(width, height * 0.76)
  const cropHeight = Math.min(height, cropWidth * 1.28)
  return {
    x: (width - cropWidth) / 2,
    y: Math.max(0, Math.min(height - cropHeight, height * 0.12)),
    width: cropWidth,
    height: cropHeight,
  }
}

function coverCrop(crop: { x: number; y: number; width: number; height: number }, targetRatio: number) {
  const sourceRatio = crop.width / crop.height
  if (sourceRatio > targetRatio) {
    const width = crop.height * targetRatio
    return { ...crop, x: crop.x + (crop.width - width) / 2, width }
  }
  const height = crop.width / targetRatio
  return { ...crop, y: crop.y + (crop.height - height) / 2, height }
}

function drawFeatheredFace(
  output: HTMLCanvasElement,
  photo: ImageBitmap | HTMLImageElement,
  input: ComposeHeritagePortraitInput,
): void {
  const ctx = output.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D không khả dụng.')
  const layer = document.createElement('canvas')
  layer.width = output.width
  layer.height = output.height
  const layerCtx = layer.getContext('2d')
  if (!layerCtx) throw new Error('Canvas 2D không khả dụng.')

  const source = bitmapSize(photo)
  const anchor = input.template.calibration.faceAnchor
  const targetRatio = (anchor.width * output.width) / (anchor.height * output.height)
  const crop = coverCrop(faceCrop(input.candidate, source.width, source.height), targetRatio)
  const x = input.placement.x * output.width
  const y = input.placement.y * output.height
  const width = anchor.width * output.width * input.placement.scale
  const height = anchor.height * output.height * input.placement.scale
  const centerX = x + width / 2
  const centerY = y + height / 2

  layerCtx.save()
  layerCtx.translate(centerX, centerY)
  layerCtx.rotate((input.placement.rotationDeg * Math.PI) / 180)
  layerCtx.drawImage(photo, crop.x, crop.y, crop.width, crop.height, -width / 2, -height / 2, width, height)
  layerCtx.restore()
  applyGradeToCanvas(layerCtx, output.width, output.height, {
    boost: input.lowLight.boost,
    tunnelGrade: false,
  })
  if (input.lowLight.tunnelGrade) {
    layerCtx.globalCompositeOperation = 'source-atop'
    layerCtx.fillStyle = 'rgba(112,68,24,0.16)'
    layerCtx.fillRect(0, 0, output.width, output.height)
    layerCtx.globalCompositeOperation = 'source-over'
  }

  // Cut the portrait with a soft oval instead of fading the entire rectangular
  // crop. This removes the user's room/background while keeping natural skin edges.
  const mask = document.createElement('canvas')
  mask.width = output.width
  mask.height = output.height
  const maskCtx = mask.getContext('2d')
  if (!maskCtx) throw new Error('Canvas 2D không khả dụng.')
  const featherPx = Math.max(4, Math.min(width, height) * input.template.calibration.faceFeather * 0.45)
  maskCtx.save()
  maskCtx.translate(centerX, centerY)
  maskCtx.rotate((input.placement.rotationDeg * Math.PI) / 180)
  maskCtx.filter = `blur(${featherPx}px)`
  maskCtx.fillStyle = '#000'
  maskCtx.beginPath()
  maskCtx.ellipse(0, 0, width * 0.43, height * 0.48, 0, 0, Math.PI * 2)
  maskCtx.fill()
  maskCtx.restore()

  layerCtx.globalCompositeOperation = 'destination-in'
  layerCtx.drawImage(mask, 0, 0)
  layerCtx.globalCompositeOperation = 'source-over'
  ctx.drawImage(layer, 0, 0)
}

function drawCaption(ctx: CanvasRenderingContext2D, input: ComposeHeritagePortraitInput, width: number, height: number): void {
  const barHeight = Math.round(height * 0.17)
  const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height)
  gradient.addColorStop(0, 'rgba(8,6,3,0)')
  gradient.addColorStop(1, 'rgba(8,6,3,0.86)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, height - barHeight, width, barHeight)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#f2bf50'
  ctx.font = `700 ${Math.round(width * 0.038)}px system-ui, sans-serif`
  ctx.fillText(`${input.template.stationCode} · ${input.template.stationName}`, width * 0.06, height - barHeight * 0.54)
  ctx.fillStyle = '#ffffff'
  ctx.font = `600 ${Math.round(width * 0.031)}px system-ui, sans-serif`
  ctx.fillText(input.template.title, width * 0.06, height - barHeight * 0.31)
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = `400 ${Math.round(width * 0.023)}px system-ui, sans-serif`
  ctx.fillText(HERITAGE_REENACTMENT_LABEL, width * 0.06, height - barHeight * 0.12)
}

export async function composeHeritagePortrait(input: ComposeHeritagePortraitInput): Promise<Blob> {
  if (!input.template.published || !input.template.assets) throw new Error('heritage_role_not_published')
  const { width, height } = dimensions(input.variant)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D không khả dụng.')

  const [background, photo, foreground] = await Promise.all([
    loadHeritageBitmap(input.template.assets.background.url),
    loadHeritageBitmap(input.photo),
    loadHeritageBitmap(input.template.assets.overlay.url),
  ])
  try {
    const backgroundSize = bitmapSize(background)
    drawCover(ctx, background, backgroundSize.width, backgroundSize.height, width, height)
    drawFeatheredFace(canvas, photo, input)
    const foregroundSize = bitmapSize(foreground)
    drawCover(ctx, foreground, foregroundSize.width, foregroundSize.height, width, height)
    drawCaption(ctx, input, width, height)
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(242,191,80,0.92)'
    ctx.font = `600 ${Math.round(width * 0.025)}px system-ui, sans-serif`
    ctx.fillText(WATERMARK_TEXT, width * 0.94, height * 0.055)
    return heritageCanvasToBlob(canvas, 'image/jpeg', 0.92)
  } finally {
    closeBitmap(background)
    closeBitmap(photo)
    closeBitmap(foreground)
  }
}
