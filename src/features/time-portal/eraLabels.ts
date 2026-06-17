export const ERA_VALUES = [1948, 1968, 2026] as const
export type EraValue = (typeof ERA_VALUES)[number]

/** Nút chọn mốc thời gian — 2026 là hiện trạng, không gọi là “ảnh 2026”. */
export function eraTimelineLabel(era: EraValue): string {
  if (era === 2026) return 'Hiện nay'
  return String(era)
}

/** Nhãn cạnh ảnh trong chế độ so sánh. */
export function eraCompareSideLabel(era: EraValue): string {
  if (era === 2026) return 'Hiện nay'
  return `Xưa · ${era}`
}

export function eraHeadline(era: EraValue): string {
  if (era === 2026) return 'Hiện trạng hôm nay'
  return `Tái hiện ${era}`
}

export function isPresentEra(era: EraValue): boolean {
  return era === 2026
}
