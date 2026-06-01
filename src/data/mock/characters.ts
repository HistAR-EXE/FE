import { images } from '../../assets/images'

export type CharacterStat = { label: string; value: number }

export type Character = {
  id: string
  name: string
  dynasty: string
  description: string
  image: string
  level?: number
  locked?: boolean
  unlockRequirement?: string
}

export type FeaturedCharacter = Character & {
  subtitle: string
  quote: string
  stats: CharacterStat[]
}

export const characterFilters = [
  'Tất cả',
  'Triều Trần',
  'Triều Lê',
  'Triều Nguyễn',
  'Khởi nghĩa',
] as const

export const featuredCharacter: FeaturedCharacter = {
  id: 'hai-ba-trung',
  name: 'Hai Bà Trưng',
  dynasty: 'Khởi nghĩa',
  subtitle: 'Anh hùng dân tộc - Kỷ Nguyên Chống Bắc Thuộc',
  description:
    '"Một xin rửa sạch nước thù, Hai xin đem lại nghiệp xưa họ Hùng..." Lãnh đạo cuộc khởi nghĩa oanh liệt chống lại ách đô hộ, biểu tượng bất diệt của tinh thần bất khuất.',
  quote:
    '"Một xin rửa sạch nước thù, Hai xin đem lại nghiệp xưa họ Hùng..."',
  image: images.characterHaiBaTrung,
  stats: [
    { label: 'Lãnh đạo', value: 95 },
    { label: 'Chiến thuật', value: 88 },
    { label: 'Tầm ảnh hưởng', value: 92 },
  ],
}

export const characters: Character[] = [
  {
    id: 'tran-hung-dao',
    name: 'Trần Hưng Đạo',
    dynasty: 'Triều Trần',
    description: 'Đại vương chỉ huy quân đội Đại Việt ba lần đánh tan quân Nguyên Mông xâm lược.',
    image: images.charTranHungDao,
    level: 12,
  },
  {
    id: 'quang-trung',
    name: 'Quang Trung',
    dynasty: 'Triều Tây Sơn',
    description: 'Vị hoàng đế bách chiến bách thắng, thần tốc đại phá quân Thanh.',
    image: images.charQuangTrung,
    level: 8,
  },
  {
    id: 'nguyen-du',
    name: 'Nguyễn Du',
    dynasty: 'Triều Nguyễn',
    description: 'Đại thi hào dân tộc, tác giả kiệt tác Truyện Kiều.',
    image: images.nguyenDuPortrait,
    level: 5,
  },
  {
    id: 'le-loi',
    name: 'Lê Lợi',
    dynasty: 'Triều Lê',
    description: 'Bình Định Vương, người lãnh đạo khởi nghĩa Lam Sơn ròng rã 10 năm.',
    image: images.charLeLoi,
    locked: true,
    unlockRequirement: 'Cần 500 Mảnh Cổ Vật',
  },
]
