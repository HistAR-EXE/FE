export type PersonalPlan = 'PREMIUM' | 'JOURNEY_PASS'
export function confirmedPrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}
export function checkoutPlanCopy(plan: PersonalPlan, siteName: string) {
  return plan === 'JOURNEY_PASS' ? {
    title: 'Journey Pass', period: '72 giờ / một di tích',
    features: [`Mở chương truyện 3–6 tại ${siteName}, theo tiến độ trạm.`, 'Nguồn tham khảo khi luồng nội dung hỗ trợ.', 'Giữ hạn mức AI miễn phí; không nâng cấp thành Premium.'],
  } : {
    title: 'Premium cá nhân', period: 'một tháng',
    features: ['Mở nội dung Premium tại các điểm đến được hỗ trợ.', 'Không áp dụng hạn mức AI miễn phí trong thời hạn gói.', 'Không bao gồm công cụ quản lý lớp học của gói tổ chức.'],
  }
}
export function confirmedJourneyExpiry(sites: Array<{ siteCode: string; expiresAt: string }> | undefined, siteCode: string, now = Date.now()): number {
  const entitlement = sites?.find(site => site.siteCode.toLowerCase() === siteCode.toLowerCase())
  const expiry = entitlement ? Date.parse(entitlement.expiresAt) : NaN
  if (!Number.isFinite(expiry) || expiry <= now) throw new Error('Thanh toán đã được ghi nhận nhưng chưa xác nhận được quyền Journey Pass. Hãy kiểm tra lại trạng thái; không cần thanh toán lần nữa.')
  return expiry
}
export function orgPackageCopy(plan: string): string {
  const tools = plan === 'MICRO'
    ? 'Chưa bao gồm tạo/giao bài tập, bảng theo dõi trực tiếp và bản chụp báo cáo.'
    : 'Bao gồm tạo/giao bài tập, bảng theo dõi trực tiếp và bản chụp báo cáo.'
  return `Quản lý thành viên/lớp và theo dõi tiến độ cơ bản. ${tools} Công cụ quản lý dành cho chủ tổ chức/giáo viên đủ quyền. Quyền nội dung Premium dành cho thành viên đã xác thực email, được chấp nhận và còn thời hạn tổ chức.`
}
