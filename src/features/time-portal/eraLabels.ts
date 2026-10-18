// src/features/time-portal/eraLabels.ts
export const ERA_VALUES = [1948, 1968, 1975, 2026] as const
export type EraValue = (typeof ERA_VALUES)[number]

/** Nút chọn mốc thời gian — 2026 là hiện trạng, không gọi là "ảnh 2026". */
export function eraTimelineLabel(era: EraValue): string {
  if (era === 2026) return 'Hiện nay'
  if (era === 1975) return '1975'
  return String(era)
}

/** Nhãn cạnh ảnh trong chế độ so sánh. */
export function eraCompareSideLabel(era: EraValue): string {
  if (era === 2026) return 'Hiện nay'
  return `Xưa · ${era}`
}

export function eraHeadline(era: EraValue): string {
  if (era === 2026) return 'Hiện trạng hôm nay'
  if (era === 1975) return 'Ngày giải phóng 1975'
  return `Tái hiện ${era}`
}

export function isPresentEra(era: EraValue): boolean {
  return era === 2026
}

/** Mô tả ngắn gọn cho mỗi mốc thời gian. */
export function eraDescription(era: EraValue): string {
  switch (era) {
    case 1948: return 'Khởi dựng hệ thống địa đạo trong kháng chiến chống Pháp'
    case 1968: return 'Mở rộng thành "thành phố ngầm" trong chiến tranh chống Mỹ'
    case 1975: return 'Ngày giải phóng — kết thúc 30 năm chiến tranh'
    case 2026: return 'Di tích lịch sử quốc gia — điểm đến du lịch di sản'
  }
}

/** Tên giai đoạn. */
export function eraPeriodName(era: EraValue): string {
  switch (era) {
    case 1948: return 'Xây dựng'
    case 1968: return 'Kháng chiến'
    case 1975: return 'Giải phóng'
    case 2026: return 'Di sản'
  }
}
