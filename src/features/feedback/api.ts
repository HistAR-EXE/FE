import { getData, httpClient } from '../../shared/api/httpClient'

export const topicLabels = {
  explore: 'Khám phá', tour: 'Tour 360', history: 'Tái hiện lịch sử', ai: 'Trợ lý AI',
  ar: 'AR', quests: 'Nhiệm vụ', performance: 'Hiệu năng và tốc độ tải', navigation: 'Điều hướng',
  content: 'Nội dung', technical: 'Lỗi kỹ thuật', registration: 'Đăng ký',
  payment: 'Thanh toán', pricing: 'Giá và quyền lợi', access: 'Kích hoạt gói', other: 'Khác',
}
export type Topic = keyof typeof topicLabels
export type Review = { photos?: string[]; avatarUrl?: string | null; authorName?: string | null; tier: string; rating: number; comment: string }
export type FeedbackEntry = Review & {
  userId: string; submissionId: string; topics: Topic[]; publicConsent: boolean; published: boolean; createdAt: string; source: string
}
export type FeedbackFilters = { from: string; to: string; tier: string; topic: string; status?: string; rating?: string }
const params = (filters: FeedbackFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value))

const feedbackSubmit = (body: { submissionId: string; rating: number; topics: Topic[]; comment: string; publicConsent: boolean; invited?: boolean; showName?: boolean; showAvatar?: boolean; photos?: string[] }) =>
    getData<void>(httpClient.post('/api/me/feedback', body))

export const feedbackApi = {
  claimInvitation: (tier: string) => getData<boolean>(httpClient.post('/api/me/feedback/invitation', null, { params: { tier } })),
  submit: feedbackSubmit,
  update: (body: Parameters<typeof feedbackSubmit>[0]) => getData<void>(httpClient.put('/api/me/feedback', body)),
  remove: (id: string) => getData<void>(httpClient.delete('/api/me/feedback/' + id)),
  history: (page: number) => getData<{ items: FeedbackEntry[]; total: number }>(httpClient.get('/api/me/feedback', { params: { page } })),
  featured: () => getData<Review[]>(httpClient.get('/api/feedback/featured')),
  list: (filters: FeedbackFilters, page: number, size = 25) =>
    getData<{ items: FeedbackEntry[]; total: number }>(httpClient.get('/api/admin/feedback', { params: { ...params(filters), page, size } })),
  export: (filters: FeedbackFilters) =>
    httpClient.get<Blob>('/api/admin/feedback/export', { params: params(filters), responseType: 'blob' }),
  moderate: (entry: FeedbackEntry, published: boolean) =>
    getData<void>(httpClient.patch(`/api/admin/feedback/${entry.userId}/${entry.submissionId}`, { published })),
}

