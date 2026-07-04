import { isAdminPreview } from '../../shared/access/contentAccess'

export const DISCOVERY_NOT_RECORDED_MESSAGE =
  'Chưa ghi nhận khám phá — di tích này chưa có nội dung tương ứng. Bạn vẫn xem được trải nghiệm.'

type ToastFn = (opts: { message: string; type?: 'success' | 'error' | 'info' }) => void

export function showDiscoveryRecordError(
  showToast: ToastFn,
  options?: { role?: string },
): void {
  if (isAdminPreview(options?.role)) return
  showToast({ message: DISCOVERY_NOT_RECORDED_MESSAGE, type: 'info' })
}
