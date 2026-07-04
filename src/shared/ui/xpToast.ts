export const XP_LABELS = {
  discovery: 'Khám phá mới',
  artifact: 'Mở khoá cổ vật',
  checkin: 'Check-in tại di tích',
  questStep: 'Hoàn thành bước nhiệm vụ',
  questComplete: 'Hoàn thành nhiệm vụ',
  share: 'Chia sẻ thành công',
} as const

export function formatXpToast(
  xp: number,
  label: string,
): { message: string; type: 'success' | 'error' | 'info' } {
  if (xp <= 0) {
    return { message: label, type: 'info' }
  }
  return { message: `+${xp} XP • ${label}`, type: 'success' }
}
