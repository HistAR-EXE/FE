import { images } from '../../assets/images'

export type HeritageTag = {
  icon: string
  label: string
  variant: 'secondary' | 'primary' | 'outline'
}

export type HeritageDetail = {
  slug: string
  title: string
  description: string
  shortDescription: string
  location: string
  heroImage: string
  tags: HeritageTag[]
  stats: { era: string; area: string; difficulty: string }
  about: string[]
  meta: { location: string; hours: string; ticket: string }
  timePortal: { title: string; description: string; image: string }
  artifact: { title: string; subtitle: string; image: string }
  questCount: number
  aiGuide: { characterName: string; subtitle: string; chatPath: string }
}

export const heritageDetails: Record<string, HeritageDetail> = {
  'thang-long': {
    slug: 'thang-long',
    title: 'Hoàng Thành Thăng Long',
    description:
      'Trung tâm quyền lực chính trị kéo dài hơn 13 thế kỷ của các triều đại phong kiến Việt Nam.',
    shortDescription:
      'Quần thể di tích lịch sử khổng lồ, minh chứng cho hơn một thiên niên kỷ rực rỡ của các triều đại phong kiến Việt Nam từ thời Lý, Trần, Lê sơ đến nhà Nguyễn.',
    location: 'Hà Nội',
    heroImage: images.detailThangLongHero,
    tags: [
      { icon: 'public', label: 'Di sản Thế giới', variant: 'secondary' },
      { icon: 'history', label: 'Lê Dynasty', variant: 'primary' },
      { icon: 'location_on', label: 'Hà Nội', variant: 'outline' },
    ],
    stats: { era: 'Thế kỷ 11', area: '18,395 ha', difficulty: 'Trung bình' },
    about: [
      'Hoàng thành Thăng Long là quần thể di tích gắn với lịch sử kinh thành Thăng Long - Đông Kinh và tỉnh thành Hà Nội bắt đầu từ thời kì tiền Thăng Long qua thời Đinh - Tiền Lê, phát triển mạnh dưới thời Lý, Trần, Lê sơ.',
      'Đây là công trình kiến trúc đồ sộ, được các triều vua xây dựng trong nhiều giai đoạn lịch sử và trở thành di tích quan trọng bậc nhất trong hệ thống các di tích Việt Nam.',
    ],
    meta: { location: '19C Hoàng Diệu, Ba Đình', hours: '08:00 - 17:00', ticket: '30,000 VND' },
    timePortal: {
      title: 'Time Portal: Triều Lê Sơ',
      description:
        'Xuyên không về thế kỷ 15, chứng kiến cung điện nguy nga và cuộc sống vương triều dưới góc nhìn AR/VR chân thực nhất.',
      image: images.detailTimePortalBg,
    },
    artifact: {
      title: 'Bộ sưu tập Cổ vật',
      subtitle: '120+ hiện vật được scan 3D',
      image: images.detailArtifact,
    },
    questCount: 3,
    aiGuide: {
      characterName: 'Nguyễn Du',
      subtitle: 'Hỏi về lịch sử Thăng Long và triều Lê',
      chatPath: '/chat/nguyen-du',
    },
  },
  'dai-noi-hue': {
    slug: 'dai-noi-hue',
    title: 'Đại Nội Huế',
    description: 'Kinh thành triều Nguyễn, di sản thế giới UNESCO tại cố đô Huế.',
    shortDescription:
      'Khu di tích lịch sử vĩ đại nhất của triều đại nhà Nguyễn, mở khóa trải nghiệm thực tế ảo.',
    location: 'Huế',
    heroImage: images.exploreDaiNoi,
    tags: [
      { icon: 'public', label: 'Di sản Thế giới', variant: 'secondary' },
      { icon: 'history', label: 'Triều Nguyễn', variant: 'primary' },
      { icon: 'location_on', label: 'Huế', variant: 'outline' },
    ],
    stats: { era: 'Thế kỷ 19', area: '520 ha', difficulty: 'Trung bình' },
    about: [
      'Đại Nội Huế là kinh thành của triều Nguyễn, được xây dựng từ năm 1805 dưới thời vua Gia Long.',
      'Quần thể kiến trúc cung đình mang giá trị nghệ thuật và lịch sử độc đáo của Việt Nam.',
    ],
    meta: { location: 'Phố Điện Biên Phủ, Huế', hours: '07:00 - 17:30', ticket: '200,000 VND' },
    timePortal: {
      title: 'Time Portal: Triều Nguyễn',
      description: 'Khám phá cung điện nguy nga thời vua Minh Mạng qua lăng kính AR.',
      image: images.exploreDaiNoi,
    },
    artifact: { title: 'Bộ sưu tập Hoàng gia', subtitle: '80+ hiện vật triều Nguyễn', image: images.detailArtifact },
    questCount: 2,
    aiGuide: {
      characterName: 'Nguyễn Du',
      subtitle: 'Đàm đạo về triều Nguyễn và kinh thành Huế',
      chatPath: '/chat/nguyen-du',
    },
  },
  'chua-thien-mu': {
    slug: 'chua-thien-mu',
    title: 'Chùa Thiên Mụ',
    description: 'Biểu tượng lịch sử bên bờ sông Hương, cố đô Huế.',
    shortDescription:
      'Ngôi chùa cổ kính nằm bên bờ sông Hương, biểu tượng tâm linh của cố đô.',
    location: 'Huế',
    heroImage: images.exploreChuaThienMu,
    tags: [
      { icon: 'temple_buddhist', label: 'Tôn giáo', variant: 'secondary' },
      { icon: 'history', label: 'Thế kỷ 17', variant: 'primary' },
      { icon: 'location_on', label: 'Huế', variant: 'outline' },
    ],
    stats: { era: 'Thế kỷ 17', area: '4.5 ha', difficulty: 'Dễ' },
    about: [
      'Chùa Thiên Mụ được xây dựng năm 1601, là ngôi chùa lớn nhất và cổ nhất ở Huế.',
      'Tháp Phước Duyên bảy tầng là biểu tượng nổi bật của di tích.',
    ],
    meta: { location: 'Kim Long, Huế', hours: '07:00 - 17:00', ticket: 'Miễn phí' },
    timePortal: {
      title: 'Time Portal: Thiên Mụ xưa',
      description: 'Nhìn lại chùa Thiên Mụ thế kỷ 19 qua công nghệ phục dựng.',
      image: images.exploreChuaThienMu,
    },
    artifact: { title: 'Chuông & Tượng Phật', subtitle: '15 hiện vật tâm linh', image: images.detailArtifact },
    questCount: 1,
    aiGuide: {
      characterName: 'Nguyễn Du',
      subtitle: 'Tìm hiểu tâm linh và lịch sử cố đô Huế',
      chatPath: '/chat/nguyen-du',
    },
  },
  'hoang-thanh-hue': {
    slug: 'hoang-thanh-hue',
    title: 'Hoàng Thành Huế',
    description: 'Kinh thành Huế — trung tâm quyền lực triều Nguyễn.',
    shortDescription: 'Triều Nguyễn • Kiến trúc cung đình • Huế',
    location: 'Huế',
    heroImage: images.homeHueCard,
    tags: [
      { icon: 'public', label: 'UNESCO', variant: 'secondary' },
      { icon: 'history', label: 'Triều Nguyễn', variant: 'primary' },
      { icon: 'location_on', label: 'Huế', variant: 'outline' },
    ],
    stats: { era: 'Thế kỷ 19', area: '500 ha', difficulty: 'Trung bình' },
    about: ['Hoàng thành Huế là trung tâm chính trị của triều Nguyễn.'],
    meta: { location: 'Huế', hours: '07:00 - 17:30', ticket: '200,000 VND' },
    timePortal: { title: 'Time Portal: Huế', description: 'Phục dựng kinh thành Huế.', image: images.homeHueCard },
    artifact: { title: 'Cổ vật triều Nguyễn', subtitle: '50+ hiện vật', image: images.detailArtifact },
    questCount: 2,
    aiGuide: {
      characterName: 'Nguyễn Du',
      subtitle: 'Khám phá cung đình triều Nguyễn cùng AI',
      chatPath: '/chat/nguyen-du',
    },
  },
  'van-mieu': {
    slug: 'van-mieu',
    title: 'Văn Miếu - Quốc Tử Giám',
    description: 'Trường đại học đầu tiên của Việt Nam, thành lập năm 1070.',
    shortDescription: 'Nhà Lý • Giáo dục • Hà Nội',
    location: 'Hà Nội',
    heroImage: images.homeVanMieuCard,
    tags: [
      { icon: 'menu_book', label: 'Giáo dục', variant: 'secondary' },
      { icon: 'history', label: 'Nhà Lý', variant: 'primary' },
      { icon: 'location_on', label: 'Hà Nội', variant: 'outline' },
    ],
    stats: { era: 'Năm 1070', area: '54,331 m²', difficulty: 'Dễ' },
    about: ['Văn Miếu - Quốc Tử Giám là biểu tượng của nền giáo dục và khoa cử Việt Nam.'],
    meta: { location: '58 Quốc Tử Giám, Hà Nội', hours: '08:00 - 17:00', ticket: '30,000 VND' },
    timePortal: { title: 'Time Portal: Quốc Tử Giám', description: 'Du hành về thời khoa cử.', image: images.homeVanMieuCard },
    artifact: { title: 'Bia tiến sĩ', subtitle: '82 tấm bia', image: images.detailArtifact },
    questCount: 1,
    aiGuide: {
      characterName: 'Nguyễn Du',
      subtitle: 'Hỏi về khoa cử và văn hóa giáo dục xưa',
      chatPath: '/chat/nguyen-du',
    },
  },
}

export function getHeritageBySlug(slug: string): HeritageDetail | undefined {
  return heritageDetails[slug]
}

export const thangLongDetail = heritageDetails['thang-long']
