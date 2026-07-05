/** Cấu hình & dữ liệu seed dùng chung cho toàn bộ test E2E. */

export const BE_URL = process.env.HISTAR_BE_URL ?? 'http://localhost:8080'
export const FE_URL = process.env.HISTAR_FE_URL ?? 'http://localhost:5173'

/** Tài khoản demo có sẵn trong seed (role ADMIN sau 2026-07-05). */
export const DEMO_USER = {
  email: 'demo@histar.vn',
  password: 'Demo@2026',
} as const

/** Platform admin (2026-07-05 seed). */
export const ADMIN_USER = {
  email: 'admin@histar.vn',
  password: 'Demo@2026',
} as const

/** Demo teacher B2B (2026-07-04 org + 2026-07-05 password). */
export const TEACHER_USER = {
  email: 'teacher@histar.vn',
  password: 'Demo@2026',
} as const

/** ID seed cố định (từ TimeLens_DB_Schema + migration). */
export const SEED = {
  /** Địa đạo Củ Chi — pilot onsite. */
  cuChiLocationId: '11111111-1111-1111-1111-111111111111',
  /** Quest Củ Chi — require_onsite_checkin = true (Pattern 2). */
  onsiteQuestId: '33333333-3333-3333-3333-333333333333',
  /** Bến Nhà Rồng — locked until Củ Chi quest complete. */
  benNhaRongLocationId: '22222222-2222-2222-2222-222222222201',
  /** Đền Hùng Vương — dùng cho secret-story gated. */
  denHungLocationId: '22222222-2222-2222-2222-222222222209',
} as const

/** Khoá localStorage FE dùng để lưu phiên (khớp shared/auth/session.ts). */
export const STORAGE_KEYS = {
  token: 'timelens_token',
  refreshToken: 'timelens_refresh_token',
  userId: 'timelens_user_id',
  displayName: 'timelens_display_name',
  email: 'timelens_email',
  role: 'timelens_role',
  tier: 'timelens_tier',
  mode: 'timelens_mode',
} as const
