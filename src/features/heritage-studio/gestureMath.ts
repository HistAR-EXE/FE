import type { FacePlacement } from './facePlacement'

type Point = { x: number; y: number }

/** Pointer coordinates are viewport pixels; placement coordinates are normalized to the preview. */
export function transformGesture(placement: FacePlacement, before: readonly Point[], after: readonly Point[], rect: { width: number; height: number }): FacePlacement {
  if (!before.length || before.length !== after.length || rect.width <= 0 || rect.height <= 0) return placement
  const midpoint = (points: readonly Point[]) => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  })
  const first = midpoint(before)
  const last = midpoint(after)
  const next = { ...placement, x: placement.x + (last.x - first.x) / rect.width, y: placement.y + (last.y - first.y) / rect.height }
  if (before.length < 2) return next
  const vector = (points: readonly Point[]) => ({ x: points[1].x - points[0].x, y: points[1].y - points[0].y })
  const startVector = vector(before)
  const endVector = vector(after)
  const startDistance = Math.hypot(startVector.x, startVector.y)
  const endDistance = Math.hypot(endVector.x, endVector.y)
  if (startDistance < 1 || endDistance < 1) return next
  const angle = (value: Point) => Math.atan2(value.y, value.x) * 180 / Math.PI
  let turn = angle(endVector) - angle(startVector)
  if (turn > 180) turn -= 360
  if (turn < -180) turn += 360
  return { ...next, scale: placement.scale * endDistance / startDistance, rotationDeg: placement.rotationDeg + turn }
}
