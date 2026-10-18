// src/features/time-portal/cuChiEraData.ts
// Dữ liệu timeline cho Địa đạo Củ Chi — unique images per era, parallax layers.

import { images } from '../../assets/images'
import type { EraValue } from './eraLabels'

export type ParallaxLayer = {
  id: string
  /** Depth factor: cao hơn = di chuyển nhiều hơn (tiền cảnh). */
  depth: number
  /** CSS filter cho phong cách thời kỳ. */
  filter?: string
  /** Gradient overlay tạo mood. */
  overlay?: string
  /** z-index */
  z: number
}

export type EraData = {
  era: EraValue
  title: string
  subtitle: string
  narrative: string
  /** Chi tiết bổ sung (bullet points). */
  facts: string[]
  /** Parallax layer config. */
  layers: ParallaxLayer[]
  /** CSS filter áp dụng cho ảnh nền chính. */
  imageFilter: string
  /** Gradient overlay tạo không khí. */
  atmosphereGradient: string
  /** Màu chủ đạo cho UI elements. */
  accentColor: string
  /** Ảnh chính cho era — mỗi era dùng ảnh riêng. */
  imageUrl: string
  /** Ảnh phụ cho mid-ground parallax layer — tạo chiều sâu. */
  midImageUrl?: string
}

export const CU_CHI_ERAS: EraData[] = [
  {
    era: 1948,
    title: 'Khởi dựng Địa đạo',
    subtitle: 'Kháng chiến chống Pháp · 1945–1954',
    narrative:
      'Những đoạn hầm đầu tiên được đào bằng tay trong đêm tối. Từ vài chục mét ẩn nấp đơn giản, dân quân Củ Chi bắt đầu xây dựng hệ thống liên hoàn nối các xóm ấp, tạo nền tảng cho mạng lưới địa đạo huyền thoại sau này.',
    facts: [
      'Đào bằng cuốc và xẻng thô sơ, ban đêm',
      'Hầm sâu 3–4m, chỉ vừa một người bò',
      'Nối liền các xóm ấp trong xã Tân Phú Trung',
      'Đất sét pha đá ong tự cứng khi khô',
    ],
    layers: [
      { id: 'bg', depth: 5, z: 0 },
      { id: 'mid', depth: 10, z: 1, overlay: 'linear-gradient(180deg, rgba(139,69,19,0.08) 0%, transparent 60%)' },
      { id: 'fg', depth: 16, z: 2 },
    ],
    imageFilter: 'sepia(0.3) contrast(1.05) brightness(0.9)',
    atmosphereGradient: 'linear-gradient(180deg, rgba(139,69,19,0.12) 0%, rgba(0,0,0,0.35) 100%)',
    accentColor: 'var(--color-heritage-crimson)',
    imageUrl: images.portalEra1948,
    midImageUrl: images.portalMid1948,
  },
  {
    era: 1968,
    title: 'Thành phố ngầm',
    subtitle: 'Chiến tranh chống Mỹ · 1961–1975',
    narrative:
      'Hơn 250 km địa đạo trải dài từ Sài Gòn đến biên giới Campuchia. Ba tầng hầm (3m, 6m, 10m) chứa bệnh xá, nhà bếp Hoàng Cầm, phòng chỉ huy, kho vũ khí — cả một đô thị ngầm nuôi sống hàng ngàn chiến sĩ và thường dân trong suốt mùa khô khốc liệt.',
    facts: [
      'Hệ thống 3 tầng: 3m, 6m và 10m dưới lòng đất',
      'Hơn 250 km đường hầm liên hoàn',
      'Bệnh xá, trường học, nhà bếp Hoàng Cầm',
      'Chịu được bom 500 lbs và xe tăng M48',
    ],
    layers: [
      { id: 'bg', depth: 5, z: 0 },
      { id: 'mid', depth: 12, z: 1, overlay: 'linear-gradient(180deg, rgba(180,83,9,0.06) 0%, transparent 50%)' },
      { id: 'fg', depth: 18, z: 2 },
    ],
    imageFilter: 'sepia(0.15) contrast(1.08) brightness(0.92)',
    atmosphereGradient: 'linear-gradient(180deg, rgba(180,83,9,0.08) 0%, rgba(0,0,0,0.4) 100%)',
    accentColor: 'var(--color-heritage-bronze)',
    imageUrl: images.portalEra1968,
    midImageUrl: images.portalMid1968,
  },
  {
    era: 1975,
    title: 'Ngày giải phóng',
    subtitle: 'Thống nhất đất nước · 30/04/1975',
    narrative:
      'Xe tăng tiến vào Dinh Độc Lập, kết thúc 30 năm chiến tranh. Địa đạo Củ Chi im tiếng súng, trở thành chứng nhân lịch sử. Hàng trăm chiến sĩ và thường dân bước ra khỏi lòng đất, đón ánh sáng hoà bình sau bao nhiêu năm chiến đấu trong bóng tối.',
    facts: [
      '30/04/1975 — giải phóng hoàn toàn miền Nam',
      'Củ Chi được phong tặng danh hiệu "Đất thép thành đồng"',
      'Hơn 18.000 liệt sĩ đã hy sinh tại Củ Chi',
      'Bắt đầu quá trình bảo tồn di tích',
    ],
    layers: [
      { id: 'bg', depth: 5, z: 0 },
      { id: 'mid', depth: 10, z: 1, overlay: 'linear-gradient(180deg, rgba(217,119,6,0.05) 0%, transparent 50%)' },
      { id: 'fg', depth: 16, z: 2 },
    ],
    imageFilter: 'sepia(0.08) contrast(1.03) brightness(0.95)',
    atmosphereGradient: 'linear-gradient(180deg, rgba(217,119,6,0.06) 0%, rgba(0,0,0,0.3) 100%)',
    accentColor: 'var(--color-heritage-gold)',
    imageUrl: images.portalEra1975,
    midImageUrl: images.portalMid1975,
  },
  {
    era: 2026,
    title: 'Di sản sống',
    subtitle: 'Di tích lịch sử quốc gia đặc biệt',
    narrative:
      'Hơn 2 triệu du khách mỗi năm tìm đến Củ Chi để chui xuống những đoạn hầm được mở rộng, nếm thử khoai mì luộc và nghe câu chuyện của "Đất thép thành đồng". Công nghệ số hoá đang giúp tái hiện quá khứ mà không phá huỷ di tích gốc.',
    facts: [
      'Di tích lịch sử quốc gia đặc biệt từ 2015',
      'Hơn 2 triệu lượt khách/năm (trong và ngoài nước)',
      'Hai khu tham quan: Bến Dược và Bến Đình',
      'Ứng dụng công nghệ AR/VR để bảo tồn di sản',
    ],
    layers: [
      { id: 'bg', depth: 5, z: 0 },
      { id: 'mid', depth: 10, z: 1 },
      { id: 'fg', depth: 14, z: 2 },
    ],
    imageFilter: 'none',
    atmosphereGradient: 'linear-gradient(180deg, rgba(13,148,136,0.05) 0%, rgba(0,0,0,0.2) 100%)',
    accentColor: 'var(--color-heritage-jade)',
    imageUrl: images.portalEra2026,
    midImageUrl: images.portalMid2026,
  },
]

export function getEraData(era: EraValue): EraData {
  return CU_CHI_ERAS.find((e) => e.era === era) ?? CU_CHI_ERAS[CU_CHI_ERAS.length - 1]
}
