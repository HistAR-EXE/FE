export const DEMO_STOP_CONFIRMATION = 'TẮT DEMO'

export type DemoEnvironmentState = {
  enabled: boolean
  activeUsers: number
}

export function getDemoStopBlock(
  status: DemoEnvironmentState,
  confirmation: string,
): string | null {
  if (!status.enabled) return 'Môi trường demo đã tắt.'
  if (status.activeUsers > 0) {
    return `Không thể tắt vì còn ${status.activeUsers} người đang hoạt động trong 5 phút gần nhất.`
  }
  if (confirmation !== DEMO_STOP_CONFIRMATION) {
    return `Nhập chính xác “${DEMO_STOP_CONFIRMATION}” để xác nhận.`
  }
  return null
}
