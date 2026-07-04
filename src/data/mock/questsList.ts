// src/data/mock/questsList.ts
import { images } from '../../assets/images'

export type Quest = {
  slug: string
  title: string
  description: string
  image: string
  xp: number
  steps: { current: number; total: number }
  progress: number
  location: string
  difficulty: string
  status: 'active' | 'completed' | 'locked'
  tags: string[]
}

export const questsList: Quest[] = [
  {
    slug: 'dau-an-hoang-thanh',
    title: 'Dấu ấn Hoàng Thành',
    description: 'Khám phá 4 điểm check-in AR tại khu di tích Hoàng Thành Thăng Long.',
    image: images.questDauAnHoangThanh,
    xp: 500,
    steps: { current: 2, total: 4 },
    progress: 50,
    location: 'Hà Nội',
    difficulty: 'Trung bình',
    status: 'active',
    tags: ['AR', 'Di sản'],
  },
  {
    slug: 'bi-an-chua-cau',
    title: 'Bí ẩn Chùa Cầu',
    description: 'Giải mã bí ẩn cầu cổ Hội An qua chuỗi manh mối AR tại phố cổ.',
    image: images.questBiAnChuaCau,
    xp: 200,
    steps: { current: 1, total: 3 },
    progress: 33,
    location: 'Hội An',
    difficulty: 'Dễ',
    status: 'active',
    tags: ['Quiz', 'Lịch sử'],
  },
]

export const lockedQuest = {
  slug: 'mat-ma-lang-tam',
  title: 'Mật mã Lăng Tẩm',
  description: 'Mở khóa sau khi hoàn thành 5 nhiệm vụ cấp độ 10.',
  xp: 1000,
  requiredLevel: 10,
} as const

export type QuestStep = {
  id: number
  title: string
  done: boolean
  xp: number
  locked?: boolean
}

export const questStepsBySlug: Record<string, QuestStep[]> = {
  'dau-an-hoang-thanh': [
    { id: 1, title: 'Check-in tại Đoan Môn', done: true, xp: 100 },
    { id: 2, title: 'Quét AR cổng Kính Thiên', done: true, xp: 150 },
    { id: 3, title: 'Tìm hiện vật gốm men', done: false, xp: 150 },
    { id: 4, title: 'Chụp ảnh khung di sản', done: false, xp: 100 },
  ],
  'bi-an-chua-cau': [
    { id: 1, title: 'Tìm manh mối tại chân cầu', done: true, xp: 50 },
    { id: 2, title: 'Giải câu đố lịch sử', done: false, xp: 75 },
    { id: 3, title: 'Chụp ảnh cầu ban đêm', done: false, xp: 75, locked: true },
  ],
}

export function getQuestBySlug(slug: string) {
  return questsList.find((q) => q.slug === slug)
}

export function getQuestSteps(slug: string) {
  return questStepsBySlug[slug] ?? []
}
