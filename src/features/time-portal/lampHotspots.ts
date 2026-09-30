// src/features/time-portal/lampHotspots.ts

/**
 * Điểm sáng "đèn dầu" trên ảnh Cổng thời gian.
 * Định vị bằng x/y (% khung nhìn) HOẶC yaw/pitch (độ, 0/0 = tâm ảnh).
 */
export type LampHotspot = {
  id: string
  /** Vị trí ngang, 0–100 (%). */
  x?: number
  /** Vị trí dọc, 0–100 (%). */
  y?: number
  /** Góc ngang (độ), −HFOV/2…+HFOV/2. Dùng khi không có x. */
  yaw?: number
  /** Góc dọc (độ), dương = lên trên. Dùng khi không có y. */
  pitch?: number
  /** Bán kính vầng sáng (px). Mặc định 120. */
  radius?: number
  /** Nhãn hiển thị khi hover/tap. */
  label?: string
  /** Mô tả ngắn hiển thị dưới nhãn. */
  description?: string
  /** Chỉ hiện ở scene có index này (bỏ trống = mọi scene). */
  sceneIndex?: number
}

export const LAMP_HFOV_DEG = 120
export const LAMP_VFOV_DEG = 70

const clampPct = (v: number) => Math.min(100, Math.max(0, v))

export function lampPosition(h: LampHotspot): { x: number; y: number } {
  const x = h.x ?? 50 + ((h.yaw ?? 0) / LAMP_HFOV_DEG) * 100
  const y = h.y ?? 50 - ((h.pitch ?? 0) / LAMP_VFOV_DEG) * 100
  return { x: clampPct(x), y: clampPct(y) }
}

/** Demo Củ Chi — vị trí cứng (đèn dầu trong hầm / gần cửa hầm). */
export const CU_CHI_LAMP_HOTSPOTS: LampHotspot[] = [
  {
    id: 'lamp-entrance',
    x: 24,
    y: 58,
    radius: 130,
    label: 'Đèn dầu cửa hầm',
    description: 'Ánh sáng yếu ớt dẫn đường trong hầm tối.',
  },
  {
    id: 'lamp-corridor',
    x: 52,
    y: 46,
    radius: 110,
    label: 'Đèn dầu hành lang',
    description: 'Đèn treo giữ ấm và soi bản đồ chiến dịch.',
  },
  {
    id: 'lamp-shelter',
    x: 78,
    y: 64,
    radius: 140,
    label: 'Đèn dầu hầm sinh hoạt',
    description: 'Nơi bộ đội nghỉ ngơi, chữa thương và họp kín.',
  },
]
