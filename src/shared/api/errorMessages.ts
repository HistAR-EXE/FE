// src/shared/api/errorMessages.ts
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
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      return error.message || 'Vui lòng xác thực email trước khi thanh toán.'
    }
    if (error.code === 'TRIAL_EXPIRED') {
      return error.message || 'Lớp học dùng thử đã hết hạn. Vui lòng nâng cấp để tiếp tục.'
    }
    if (error.code === 'LMS_PREMIUM_REQUIRED') {
      return error.message || 'LMS đầy đủ chỉ có ở gói Premium B2B'
    }
    if (error.code === 'UNAUTHORIZED') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (error.code === 'QUOTA_EXCEEDED' && context === 'chat') {
      return error.message || 'Đã đạt giới hạn chat. Nâng cấp Premium hoặc thử lại ngày mai.'
    }
    if (error.code === 'CCU_LIMIT_EXCEEDED') {
      return 'Trường đã đạt giới hạn CCU. Thử lại sau hoặc liên hệ giáo viên.'
    }
    if (error.status === 503 && context === 'chat') {
      return 'Dịch vụ AI tạm thời không khả dụng. Kiểm tra AI service (:8100) và Ollama, hoặc cấu hình GEMINI_API_KEY trên BE.'
    }
    if (error.status === 500 && context === 'chat') {
      return 'Lỗi máy chủ chat. Chạy scripts/diagnose-chat.ps1 hoặc bật AI service + Ollama.'
    }
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

