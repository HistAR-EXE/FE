import { images } from '../../assets/images'

export type Artifact = {
  id: string
  name: string
  dynasty: string
  description: string
  image: string
  scanned: boolean
  rarity: 'Phổ biến' | 'Hiếm' | 'Huyền thoại'
  unlockRequirement?: string
}

export const artifactFilters = ['Tất cả', 'Đã sưu tầm', 'Chưa mở khóa'] as const

export const artifacts: Artifact[] = [
  {
    id: 'trong-dong-dong-son',
    name: 'Trống đồng Đông Sơn',
    dynasty: 'Văn hóa Đông Sơn',
    description: 'Bảo vật biểu trưng cho nền văn minh sông Hồng, hoa văn mặt trời và chim Lạc.',
    image: images.scanDrum,
    scanned: true,
    rarity: 'Huyền thoại',
  },
  {
    id: 'gom-men-ngoc',
    name: 'Gốm men ngọc Lý - Trần',
    dynasty: 'Triều Lý - Trần',
    description: 'Tinh hoa gốm sứ Đại Việt với lớp men ngọc đặc trưng và hoa văn tinh xảo.',
    image: images.detailArtifact,
    scanned: true,
    rarity: 'Hiếm',
  },
  {
    id: 'bia-tien-si',
    name: 'Bia tiến sĩ Văn Miếu',
    dynasty: 'Triều Lê',
    description: 'Khắc tên các bậc đại khoa, minh chứng cho truyền thống hiếu học của dân tộc.',
    image: images.homeVanMieuCard,
    scanned: true,
    rarity: 'Hiếm',
  },
  {
    id: 'an-vang-trieu-nguyen',
    name: 'Ấn vàng triều Nguyễn',
    dynasty: 'Triều Nguyễn',
    description: 'Kim bảo tượng trưng cho quyền lực tối cao của hoàng đế nhà Nguyễn.',
    image: images.homeHueCard,
    scanned: false,
    rarity: 'Huyền thoại',
    unlockRequirement: 'Quét tại Đại Nội Huế',
  },
  {
    id: 'chuong-thien-mu',
    name: 'Đại Hồng Chung Thiên Mụ',
    dynasty: 'Triều Nguyễn',
    description: 'Chiếc chuông đồng cổ nặng hơn 2 tấn, âm vang khắp dòng sông Hương.',
    image: images.exploreChuaThienMu,
    scanned: false,
    rarity: 'Hiếm',
    unlockRequirement: 'Quét tại Chùa Thiên Mụ',
  },
  {
    id: 'kiem-bao-le-loi',
    name: 'Kiếm báu Lê Lợi',
    dynasty: 'Triều Lê',
    description: 'Thanh gươm thần Thuận Thiên trong truyền thuyết hồ Hoàn Kiếm.',
    image: images.charLeLoi,
    scanned: false,
    rarity: 'Huyền thoại',
    unlockRequirement: 'Hoàn thành nhiệm vụ Lam Sơn',
  },
]

export const artifactStats = {
  collected: artifacts.filter((a) => a.scanned).length,
  total: artifacts.length,
}
