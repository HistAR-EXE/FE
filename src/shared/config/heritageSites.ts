import { CU_CHI_LOCATION_ID } from './constants'

export type HeritageSiteRegion = 'mien-bac' | 'mien-trung' | 'mien-nam'

/** Nguồn chuẩn GPS + địa chỉ cho 10 di tích onboarding (đồng bộ FE ↔ BE migration V8). */
export type HeritageSiteGeo = {
  slug: string
  apiId: string
  name: string
  city: string
  region: HeritageSiteRegion
  latitude: number
  longitude: number
  formattedAddress: string
  googleMapsUrl: string
}

export const HERITAGE_SITE_GEO: HeritageSiteGeo[] = [
  {
    slug: CU_CHI_LOCATION_ID,
    apiId: CU_CHI_LOCATION_ID,
    name: 'Địa Đạo Củ Chi',
    city: 'TP. Hồ Chí Minh',
    region: 'mien-nam',
    latitude: 11.141591,
    longitude: 106.4615963,
    formattedAddress: 'Khu di tích lịch sử Địa đạo Củ Chi, Phú Mỹ Hưng, Củ Chi, TP. Hồ Chí Minh',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=11.141591,106.4615963',
  },
  {
    slug: 'den-hung-vuong',
    apiId: '22222222-2222-2222-2222-222222222209',
    name: 'Đền Hùng Vương',
    city: 'Phú Thọ',
    region: 'mien-bac',
    latitude: 21.353353,
    longitude: 105.314722,
    formattedAddress: 'Khu di tích Đền Hùng, xã Hy Cường, huyện Lâm Thao, tỉnh Phú Thọ',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=21.353353,105.314722',
  },
  {
    slug: 'van-mieu-quoc-tu-giam',
    apiId: '22222222-2222-2222-2222-222222222207',
    name: 'Văn Miếu Quốc Tử Giám',
    city: 'Hà Nội',
    region: 'mien-bac',
    latitude: 21.027954,
    longitude: 105.835754,
    formattedAddress: '58 phố Quốc Tử Giám, phường Văn Miếu - Quốc Tử Giám, quận Đống Đa, Hà Nội',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=21.027954,105.835754',
  },
  {
    slug: 'hoang-thang-thang-long',
    apiId: '22222222-2222-2222-2222-222222222204',
    name: 'Hoàng Thành Thăng Long',
    city: 'Hà Nội',
    region: 'mien-bac',
    latitude: 21.036578,
    longitude: 105.817288,
    formattedAddress: '19C phố Hoàng Diệu, phường Điện Biên, quận Ba Đình, Hà Nội',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=21.036578,105.817288',
  },
  {
    slug: 'co-do-hoa-lu',
    apiId: '22222222-2222-2222-2222-222222222203',
    name: 'Cố Đô Hoa Lư',
    city: 'Ninh Bình',
    region: 'mien-bac',
    latitude: 20.281923,
    longitude: 105.919373,
    formattedAddress: 'xã Trường Yên, huyện Hoa Lư, tỉnh Ninh Bình',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=20.281923,105.919373',
  },
  {
    slug: 'thanh-nha-ho',
    apiId: '22222222-2222-2222-2222-222222222206',
    name: 'Thành Nhà Hồ',
    city: 'Thanh Hóa',
    region: 'mien-trung',
    latitude: 20.079722,
    longitude: 105.604167,
    formattedAddress: 'xã Vĩnh Lộc, huyện Vĩnh Lộc, tỉnh Thanh Hóa',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=20.079722,105.604167',
  },
  {
    slug: 'chua-thien-mu',
    apiId: '22222222-2222-2222-2222-222222222202',
    name: 'Chùa Thiên Mụ',
    city: 'Thừa Thiên Huế',
    region: 'mien-trung',
    latitude: 16.453453,
    longitude: 107.558618,
    formattedAddress: 'Kim Long, phường Hương Long, TP. Huế, Thừa Thiên Huế',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=16.453453,107.558618',
  },
  {
    slug: 'dai-noi-hue',
    apiId: '22222222-2222-2222-2222-222222222208',
    name: 'Đại Nội Huế',
    city: 'Thừa Thiên Huế',
    region: 'mien-trung',
    latitude: 16.469617,
    longitude: 107.579412,
    formattedAddress: 'phố Hùng Vương, phường Thuận Thành, TP. Huế, Thừa Thiên Huế',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=16.469617,107.579412',
  },
  {
    slug: 'pho-co-hoi-an',
    apiId: '22222222-2222-2222-2222-222222222205',
    name: 'Phố Cổ Hội An',
    city: 'Quảng Nam',
    region: 'mien-trung',
    latitude: 15.877157,
    longitude: 108.32934,
    formattedAddress: 'phường Minh An, TP. Hội An, tỉnh Quảng Nam',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=15.877157,108.32934',
  },
  {
    slug: 'ben-nha-rong',
    apiId: '22222222-2222-2222-2222-222222222201',
    name: 'Bến Cảng Nhà Rồng',
    city: 'TP. Hồ Chí Minh',
    region: 'mien-nam',
    latitude: 10.766813,
    longitude: 106.706726,
    formattedAddress: '1 Nguyễn Tất Thành, phường 12, quận 4, TP. Hồ Chí Minh',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.766813,106.706726',
  },
]

export const HERITAGE_SITE_BY_SLUG = Object.fromEntries(
  HERITAGE_SITE_GEO.map((s) => [s.slug, s]),
) as Record<string, HeritageSiteGeo>

export const HERITAGE_SITE_BY_API_ID = Object.fromEntries(
  HERITAGE_SITE_GEO.map((s) => [s.apiId, s]),
) as Record<string, HeritageSiteGeo>

export const STATIC_SLUG_TO_API_ID: Record<string, string> = Object.fromEntries(
  HERITAGE_SITE_GEO.filter((s) => s.slug !== s.apiId).map((s) => [s.slug, s.apiId]),
)
