import type { EraValue } from './types'

/** CSS filter stack — giống tái hiện B&W viện bảo tàng quân sự */
export function eraImageFilter(era: EraValue): string {
  if (era === 2026) return 'none'
  if (era === 1948) return 'grayscale(1) sepia(0.45) contrast(1.15) brightness(0.92)'
  return 'grayscale(1) sepia(0.28) contrast(1.08) brightness(0.95)'
}

export function eraPortalOpacity(era: EraValue): number {
  if (era === 2026) return 0
  return era === 1948 ? 0.97 : 0.94
}

export function eraLabel(era: EraValue): string {
  if (era === 1948) return 'Tái hiện · 1948'
  if (era === 1968) return 'Tái hiện · 1968'
  return 'Hiện nay'
}
