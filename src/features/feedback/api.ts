import { getData, httpClient } from '../../shared/api/httpClient'

export const topicLabels = {
  explore: 'Khám phá', tour: 'Tour 360', history: 'Tái hiện lịch sử', ai: 'Trợ lý AI',
  ar: 'AR', quests: 'Nhiệm vụ', performance: 'Tốc độ tải', navigation: 'Điều hướng',
  content: 'Nội dung', technical: 'Lỗi kỹ thuật', registration: 'Đăng ký',
  payment: 'Thanh toán', pricing: 'Giá và quyền lợi', access: 'Kích hoạt gói', other: 'Khác',
}
export type Topic = keyof typeof topicLabels
export type Review = { tier: string; rating: number; comment: string }
export type FeedbackEntry = Review & {
  userId: string; submissionId: string; topics: Topic[]; publicConsent: boolean; published: boolean; createdAt: string
}
export type FeedbackFilters = { from: string; to: string; tier: string; topic: string }
const params = (filters: FeedbackFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value))

export const feedbackApi = {
  submit: (body: { submissionId: string; rating: number; topics: Topic[]; comment: string; publicConsent: boolean }) =>
    getData<void>(httpClient.post('/api/me/feedback', body)),
  featured: () => getData<Review[]>(httpClient.get('/api/feedback/featured')),
  list: (filters: FeedbackFilters, page: number) =>
    getData<{ items: FeedbackEntry[]; total: number }>(httpClient.get('/api/admin/feedback', { params: { ...params(filters), page } })),
  export: (filters: FeedbackFilters) =>
    httpClient.get<Blob>('/api/admin/feedback/export', { params: params(filters), responseType: 'blob' }),
  moderate: (entry: FeedbackEntry, published: boolean) =>
    getData<void>(httpClient.patch(`/api/admin/feedback/${entry.userId}/${entry.submissionId}`, { published })),
}

