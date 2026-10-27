export type SceneStats = {
  readonly mean: readonly [number, number, number]
  readonly std: readonly [number, number, number]
  readonly grainSigma: number
}

export type PixelMask = { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

export function sampleSceneStats(source: CanvasImageSource, anchorRect: PixelMask): SceneStats {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(anchorRect.width * 1.8))
  canvas.height = Math.max(1, Math.round(anchorRect.height * 1.8))
  const ctx = canvas.getContext('2d')
  if (!ctx) return { mean: [128, 110, 90], std: [32, 32, 32], grainSigma: 3 }
  ctx.drawImage(source, anchorRect.x - anchorRect.width * 0.4, anchorRect.y - anchorRect.height * 0.4, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const sums = [0, 0, 0]
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    sums[0] += data[i]; sums[1] += data[i + 1]; sums[2] += data[i + 2]; count += 1
  }
  const mean = sums.map((sum) => sum / Math.max(1, count)) as [number, number, number]
  const variances = [0, 0, 0]
  for (let i = 0; i < data.length; i += 4) {
    variances[0] += (data[i] - mean[0]) ** 2
    variances[1] += (data[i + 1] - mean[1]) ** 2
    variances[2] += (data[i + 2] - mean[2]) ** 2
  }
  const std = variances.map((value) => Math.sqrt(value / Math.max(1, count))) as [number, number, number]
  return { mean, std, grainSigma: (std[0] + std[1] + std[2]) / 3 * 0.08 }
}

export function matchStats(
  ctx: CanvasRenderingContext2D,
  mask: PixelMask,
  sceneStats: SceneStats,
  strength = 0.6,
): void {
  const image = ctx.getImageData(mask.x, mask.y, mask.width, mask.height)
  const data = image.data
  const current = [0, 0, 0]
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    current[0] += data[i]; current[1] += data[i + 1]; current[2] += data[i + 2]; count++
  }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    for (let channel = 0; channel < 3; channel += 1) {
      const target = sceneStats.mean[channel]
      const value = data[i + channel]
      const offset = target - current[channel] / Math.max(1, count)
      data[i + channel] = Math.max(0, Math.min(255, value + offset * strength))
    }
  }
  ctx.putImageData(image, mask.x, mask.y)
}

export function addGrain(ctx: CanvasRenderingContext2D, sigma: number): void {
  if (sigma <= 0) return
  const image = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  const data = image.data
  let seed = 1968
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = (seed / 0x100000000 - 0.5) * sigma
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(image, 0, 0)
}

export function drawContactShadow(ctx: CanvasRenderingContext2D, mask: CanvasImageSource): void {
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.25
  ctx.filter = 'blur(2px)'
  ctx.drawImage(mask, 0, 0)
  ctx.restore()
}
