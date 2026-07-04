import { ApiError } from './contracts'

type ErrorContext = 'chat' | 'checkin' | 'leaderboard' | 'upload' | 'demoCheckin' | 'quest'

export function getFriendlyErrorMessage(error: unknown, context: ErrorContext): string {
  if (error instanceof ApiError) {
    if (error.code === 'BUSINESS_RULE') {
      switch (context) {
        case 'chat':
          return error.message || 'Đã đạt giới hạn chat trong ngày.'
        case 'checkin':
          return error.message || 'Check-in thất bại do điều kiện nghiệp vụ (GPS/QR).'
        case 'leaderboard':
          return error.message || 'Bộ lọc leaderboard không hợp lệ.'
        case 'upload':
          return error.message || 'Upload ảnh thất bại. Chỉ hỗ trợ JPEG/PNG/WebP và dung lượng hợp lệ.'
        case 'demoCheckin':
          return error.message || 'Demo check-in thất bại. Kiểm tra DEMO_SECRET và DEMO_ENABLED.'
        case 'quest':
          return error.message || 'Không thể cập nhật trạng thái nhiệm vụ.'
      }
    }
    if (error.code === 'UNAUTHORIZED') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (error.status === 403) return 'Bạn chưa đủ điều kiện truy cập nội dung này.'
    if (error.code === 'VALIDATION_ERROR') return error.message || 'Dữ liệu gửi lên không hợp lệ.'
    return error.message || 'Có lỗi xảy ra từ hệ thống.'
  }

  switch (context) {
    case 'chat':
      return 'Không thể gửi tin nhắn. Vui lòng thử lại.'
    case 'checkin':
      return 'Không thể check-in lúc này.'
    case 'leaderboard':
      return 'Không tải được bảng xếp hạng.'
    case 'upload':
      return 'Không thể tải ảnh lên.'
    case 'demoCheckin':
      return 'Demo check-in thất bại.'
    case 'quest':
      return 'Không thể tải/cập nhật nhiệm vụ.'
  }
}

