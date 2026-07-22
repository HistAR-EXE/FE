// src/features/panorama/panoAngles.ts
/** Normalize radians to [-π, π]. */
export function normalizeAngle(rad: number): number {
  const twoPi = Math.PI * 2
  return ((rad + Math.PI) % twoPi + twoPi) % twoPi - Math.PI
}

/** Shortest signed difference a - b in radians. */
export function yawDelta(a: number, b: number): number {
  return normalizeAngle(a - b)
}

export function isHotspotInView(hotspotYaw: number, viewerYaw: number, hFovRad: number): boolean {
  return Math.abs(yawDelta(hotspotYaw, viewerYaw)) <= hFovRad / 2 + 0.15
}

/** Back-link yaw opposite forward (180°). */
export function backYaw(forwardYaw: number): number {
  return normalizeAngle(forwardYaw + Math.PI)
}
