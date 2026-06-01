import { images } from '../../assets/images'

export const exploreLandmarks = [
  {
    id: 'dai-noi-hue',
    title: 'Đại Nội Huế',
    description:
      'Khu di tích lịch sử vĩ đại nhất của triều đại nhà Nguyễn, mở khóa trải nghiệm thực tế ảo.',
    rating: 4.9,
    distance: '2.4 km',
    featured: true,
    image: images.exploreDaiNoi,
    slug: 'dai-noi-hue',
  },
  {
    id: 'chua-thien-mu',
    title: 'Chùa Thiên Mụ',
    description: 'Ngôi chùa cổ kính nằm bên bờ sông Hương, biểu tượng tâm linh của cố đô.',
    rating: 4.8,
    distance: '5.1 km',
    featured: false,
    image: images.exploreChuaThienMu,
    slug: 'chua-thien-mu',
  },
] as const

export const continueExploring = [
  {
    id: 'hoang-thanh-hue',
    title: 'Hoàng Thành Huế',
    subtitle: 'Triều Nguyễn • Thế kỷ 19',
    location: 'Huế',
    progress: 60,
    image: images.homeHueCard,
    slug: 'hoang-thanh-hue',
  },
  {
    id: 'van-mieu',
    title: 'Văn Miếu - Quốc Tử Giám',
    subtitle: 'Nhà Lý • Năm 1070',
    location: 'Hà Nội',
    progress: 30,
    image: images.homeVanMieuCard,
    slug: 'van-mieu',
  },
] as const

export const featuredEvent = {
  title: 'Lễ hội Ánh sáng Di sản',
  description: 'Tham gia chuỗi sự kiện AR đặc biệt tuần này.',
  image: images.homeEventBg,
  linkSlug: 'thang-long',
} as const
