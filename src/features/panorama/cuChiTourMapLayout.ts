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

/** Trung tâm — Khu di tích lịch sử (chấm đỏ Google Maps) */
export const CU_CHI_TOUR_CENTER: [number, number] = [11.14528, 106.49472]
export const CU_CHI_TOUR_ZOOM = 17

/** Giới hạn pan — rìa rừng Bến Dước */
export const CU_CHI_SITE_BOUNDS: [[number, number], [number, number]] = [
  [11.14325, 106.49165],
  [11.14725, 106.49755],
]

/**
 * Lộ trình tham quan 360° — bám đường mòn xám trên vệ tinh.
 * Điểm 1: ngã ba ĐT15 → 2–3: khu trưng bày (TB) → 4: sân lễ → 5: Đền Bến Dước (ĐN).
 */
export const CU_CHI_TOUR_ROUTE: [number, number][] = [
  [11.14602, 106.49612],
  [11.14588, 106.49568],
  [11.14572, 106.49522],
  [11.14558, 106.49462],
  [11.14552, 106.49418],
  [11.14558, 106.49388],
  [11.14550, 106.49428],
  [11.14538, 106.49458],
  [11.14524, 106.49488],
  [11.14532, 106.49528],
  [11.14548, 106.49562],
  [11.14568, 106.49592],
  [11.14582, 106.49618],
  [11.14602, 106.49642],
  [11.14618, 106.49658],
  [11.14632, 106.49672],
]

/** Đường mòn phụ (mờ) — mạng lối đi trong rừng */
export const CU_CHI_WALKING_PATHS: [number, number][][] = [
  [
    [11.14595, 106.49405],
    [11.14578, 106.49372],
    [11.14555, 106.49355],
    [11.14528, 106.49348],
    [11.14498, 106.49362],
  ],
  [
    [11.14528, 106.49472],
    [11.14512, 106.49495],
    [11.14488, 106.49518],
    [11.14455, 106.49505],
    [11.14432, 106.49472],
    [11.14418, 106.49425],
  ],
  [
    [11.14655, 106.49645],
    [11.14638, 106.49615],
    [11.14615, 106.49585],
    [11.14582, 106.49618],
  ],
  [
    [11.14435, 106.49315],
    [11.14412, 106.49285],
    [11.14375, 106.49272],
    [11.14355, 106.49305],
    [11.14362, 106.49355],
  ],
]

/** Viền khu di tích — đa giác theo rìa rừng (ảnh vệ tinh) */
export const CU_CHI_SITE_POLYGON: [number, number][] = [
  [11.14712, 106.49205],
  [11.14685, 106.49175],
  [11.14455, 106.49168],
  [11.14342, 106.49255],
  [11.14335, 106.49425],
  [11.14355, 106.49585],
  [11.14425, 106.49715],
  [11.14585, 106.49748],
  [11.14715, 106.49735],
  [11.14722, 106.49585],
  [11.14695, 106.49425],
  [11.14712, 106.49205],
]

export const CU_CHI_TOUR_MAP_PINS: Record<string, CuChiTourMapPin> = {
  /** Street View: đường nhựa từ ĐT15 vào khu di tích (góc ĐB) */
  '22222222-2222-2222-2222-222222222222': {
    lat: 11.14602,
    lng: 106.49612,
    shortLabel: 'Cổng / đường vào',
    detail: 'Ngã ba từ ĐT15 — lối vào khu Bến Dước',
    routeOrder: 1,
  },
  /** Street View: M113 + C-130 — khu trưng bày phía tây-bắc trung tâm */
  '22222222-2222-2222-2222-222222222221': {
    lat: 11.14558,
    lng: 106.49388,
    shortLabel: 'Trưng bày vũ khí',
    detail: 'Khu trưng bày ngoài trời — M113, máy bay C-130',
    routeOrder: 2,
  },
  /** Street View: xe thiết giáp có mái che — cùng khu trưng bày */
  '22222222-2222-2222-2222-222222222223': {
    lat: 11.1455,
    lng: 106.49428,
    shortLabel: 'Xe thiết giáp',
    detail: 'Khu trưng bày xe M113 (có mái che)',
    routeOrder: 3,
  },
  /** Street View: sân lễ, tháp — lối vào Đền liệt sĩ */
  '22222222-2222-2222-2222-222222222224': {
    lat: 11.14582,
    lng: 106.49618,
    shortLabel: 'Sân lễ',
    detail: 'Sân lễ & khu Đài tưởng niệm Liệt sĩ Bến Dước',
    routeOrder: 4,
  },
  /** Street View: hành lang Đền Bến Dước — Vietnamese Memorial Complex */
  '22222222-2222-2222-2222-222222222225': {
    lat: 11.14632,
    lng: 106.49672,
    shortLabel: 'Đền Bến Dước',
    detail: 'Đền tưởng niệm Bến Dước — kiến trúc mái đỏ truyền thống',
    routeOrder: 5,
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
  { lat: 11.14672, lng: 106.49205, label: 'Nhà hàng Bến Dước', color: '#f59e0b', kind: 'site' },
  { lat: 11.14685, lng: 106.49265, label: 'Địa đạo Bến Dước (cổng Bắc)', color: '#8b5cf6', kind: 'site' },
  { lat: 11.14528, lng: 106.49472, label: 'Khu di tích trung tâm', color: '#ef4444', kind: 'site' },
  { lat: 11.14582, lng: 106.49405, label: 'Bếp Hoàng Cầm / tham quan hầm', color: '#a855f7', kind: 'site' },
  { lat: 11.14438, lng: 106.49485, label: 'Khu tái hiện Vùng Giải Phóng', color: '#84cc16', kind: 'site' },
  { lat: 11.14372, lng: 106.49325, label: 'Biển Đông', color: '#06b6d4', kind: 'water' },
  { lat: 11.14355, lng: 106.49255, label: 'Bắn súng thể thao', color: '#22c55e', kind: 'activity' },
  { lat: 11.14595, lng: 106.49655, label: 'Sân tập lái', color: '#94a3b8', kind: 'activity' },
  { lat: 11.14648, lng: 106.49685, label: 'Đền Liệt sĩ / Memorial', color: '#dc2626', kind: 'site' },
  { lat: 11.14485, lng: 106.49185, label: 'Sông Sài Gòn', color: '#0ea5e9', kind: 'water' },
]

export const CU_CHI_MAP_HERO = '/media/cu-chi/map/hero.jpg'
