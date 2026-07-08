// src/features/panorama/cuChiTourMapLayout.ts
/**
 * Tọa độ GPS — Khu di tích Địa đạo Củ Chi (Bến Dước).
 * Căn theo ảnh vệ tinh Google Maps (06/2026): Sông Sài Gòn (T), ĐT15 (ĐB),
 * khu trung tâm, Đền liệt sĩ (ĐN), Biển Đông & bắn súng (TN).
 */
export type CuChiTourMapPin = {
  lat: number
  lng: number
  shortLabel: string
  detail: string
  routeOrder: number
}

/** Trung tâm — Khu di tích lịch sử (đồng bộ heritageSites / BE V8) */
export const CU_CHI_TOUR_CENTER: [number, number] = [11.141591, 106.4615963]
export const CU_CHI_TOUR_ZOOM = 16

/** Giới hạn pan — bao trọn vùng tham quan thực tế */
export const CU_CHI_SITE_BOUNDS: [[number, number], [number, number]] = [
  [11.138, 106.4585],
  [11.149, 106.465],
]

/**
 * Lộ trình tham quan 360° — bám đường mòn xám trên vệ tinh.
 * Điểm 1: ngã ba ĐT15 → 2–3: khu trưng bày (TB) → 4: sân lễ → 5: Đền Bến Dước (ĐN).
 */
export const CU_CHI_TOUR_ROUTE: [number, number][] = [
  [11.143375, 106.462739],
  [11.141561, 106.462417],
  [11.142989, 106.462806],
  [11.142461, 106.462631],
  [11.140064, 106.462075],
  [11.145428, 106.463394],
  [11.145044, 106.464011],
]

/** Đường mòn phụ (mờ) — mạng lối đi trong rừng */
export const CU_CHI_WALKING_PATHS: [number, number][][] = []

/** Viền khu di tích — đa giác theo rìa rừng (ảnh vệ tinh) */
export const CU_CHI_SITE_POLYGON: [number, number][] = [
  [11.1486, 106.46],
  [11.1486, 106.4645],
  [11.143, 106.4648],
  [11.1395, 106.4632],
  [11.1383, 106.4592],
  [11.1402, 106.4585],
  [11.1455, 106.4598],
  [11.1486, 106.46],
]

export const CU_CHI_TOUR_MAP_PINS: Record<string, CuChiTourMapPin> = {
  /** 1. Bãi gửi xe gắn máy số 1 — điểm bắt đầu (GPS thật từ ảnh Hảo) */
  '22222222-2222-2222-2222-222222222221': {
    lat: 11.143375,
    lng: 106.462739,
    shortLabel: 'Bãi xe số 1',
    detail: 'Bãi gửi xe gắn máy số 1 — điểm bắt đầu, cạnh bảng giới thiệu khu di tích',
    routeOrder: 1,
  },
  /** 2. Đền tưởng niệm Liệt sĩ Bến Dược */
  '22222222-2222-2222-2222-222222222222': {
    lat: 11.141561,
    lng: 106.462417,
    shortLabel: 'Đền Bến Dược',
    detail: 'Đền tưởng niệm Liệt sĩ Bến Dược — kiến trúc mái cong truyền thống',
    routeOrder: 2,
  },
  /** 3. Căn cứ Bộ Tư lệnh Quân khu Sài Gòn - Gia Định */
  '22222222-2222-2222-2222-222222222223': {
    lat: 11.142989,
    lng: 106.462806,
    shortLabel: 'Bộ Tư lệnh QK',
    detail: 'Căn cứ Bộ Tư lệnh QK Sài Gòn - Gia Định — súng, bom đạn, bàn thờ',
    routeOrder: 3,
  },
  /** 4. Khu trưng bày khí tài ngoài trời */
  '22222222-2222-2222-2222-222222222224': {
    lat: 11.142461,
    lng: 106.462631,
    shortLabel: 'Khu trưng bày',
    detail: 'Khu trưng bày — xe tăng, thiết giáp M113, pháo 105mm, máy bay',
    routeOrder: 4,
  },
  /** 5. Căn cứ Khu ủy Quân khu Sài Gòn - Gia Định */
  '22222222-2222-2222-2222-222222222225': {
    lat: 11.140064,
    lng: 106.462075,
    shortLabel: 'Khu ủy QK',
    detail: 'Căn cứ Khu ủy QK Sài Gòn - Gia Định — sâu trong rừng',
    routeOrder: 5,
  },
  /** 6. Nhà biểu diễn Sa bàn, Phim 3D */
  '22222222-2222-2222-2222-222222222226': {
    lat: 11.145428,
    lng: 106.463394,
    shortLabel: 'Nhà biểu diễn',
    detail: 'Nhà biểu diễn Sa bàn, Phim 3D — mô phỏng hệ thống địa đạo',
    routeOrder: 6,
  },
  /** 7. Khu tái hiện Vùng Giải phóng */
  '22222222-2222-2222-2222-222222222227': {
    lat: 11.145044,
    lng: 106.464011,
    shortLabel: 'Khu tái hiện',
    detail: 'Khu tái hiện Vùng Giải phóng — bếp Hoàng Cầm, hầm, hố bom B52',
    routeOrder: 7,
  },
}

export type CuChiLandmark = {
  lat: number
  lng: number
  label: string
  color: string
  kind: 'site' | 'water' | 'road' | 'activity'
}

/** Điểm tham quan trên ảnh Google Maps (không phải điểm 360°) */
export const CU_CHI_LANDMARKS: CuChiLandmark[] = [
  { lat: 11.141, lng: 106.4642, label: 'Nhà hàng Bến Dược', color: '#f59e0b', kind: 'site' },
  { lat: 11.1455, lng: 106.464, label: 'Địa đạo Bến Dược (cổng Bắc)', color: '#8b5cf6', kind: 'site' },
  { lat: 11.143, lng: 106.462, label: 'Khu di tích trung tâm', color: '#ef4444', kind: 'site' },
  { lat: 11.1404, lng: 106.462, label: 'Bếp Hoàng Cầm / tham quan hầm', color: '#a855f7', kind: 'site' },
  { lat: 11.1447, lng: 106.4636, label: 'Khu tái hiện Vùng Giải Phóng', color: '#84cc16', kind: 'site' },
  { lat: 11.1392, lng: 106.4622, label: 'Biển Đông', color: '#06b6d4', kind: 'water' },
  { lat: 11.1396, lng: 106.4602, label: 'Bắn súng thể thao', color: '#22c55e', kind: 'activity' },
  { lat: 11.145, lng: 106.4632, label: 'Sân tập lái', color: '#94a3b8', kind: 'activity' },
  { lat: 11.1416, lng: 106.46255, label: 'Đền Liệt sĩ / Memorial', color: '#dc2626', kind: 'site' },
  { lat: 11.1412, lng: 106.4648, label: 'Sông Sài Gòn', color: '#0ea5e9', kind: 'water' },
]

export const CU_CHI_MAP_HERO = '/media/cu-chi/map/hero.jpg'
