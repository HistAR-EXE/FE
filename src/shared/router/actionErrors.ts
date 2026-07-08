import type { NavigateFunction } from 'react-router-dom'
import type { ApiError } from '../api/contracts'

export function getActionLinkErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as ApiError).code ?? '')
    if (code === 'INVITE_EXPIRED' || code === 'INVITE_NOT_FOUND') {
      return 'Link mời đã hết hạn hoặc không hợp lệ.'
    }
    if (code === 'ORG_FULL' || code === 'ORG_ACCOUNT_LIMIT') {
      return 'Lớp học đã đủ số tài khoản. Liên hệ giáo viên.'
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message?: string }).message ?? '')
    if (/giới hạn|đủ số tài khoản|đạt giới hạn/i.test(msg)) {
      return 'Lớp học đã đủ số tài khoản. Liên hệ giáo viên.'
    }
    if (/hết hạn|expired|không hợp lệ|not found/i.test(msg)) {
      return 'Link mời đã hết hạn hoặc không hợp lệ.'
    }
  }
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}

export function handleActionLinkError(
  error: unknown,
  navigate: NavigateFunction,
  showToast: (opts: { message: string; type: 'error' | 'info' }) => void,
  fallbackPath = '/home',
): void {
  showToast({ message: getActionLinkErrorMessage(error), type: 'error' })
  navigate(fallbackPath, { replace: true })
}
