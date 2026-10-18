// src/features/time-portal/tunnel3d/scenes.ts
// Dữ liệu lát cắt địa đạo Củ Chi cho 4 thời kỳ.
// Hệ toạ độ trên mặt cắt: x ngang (1 đv ≈ 1.6 m), y = 0 là mặt đất, âm xuống sâu.
// Tham chiếu: dsvh.gov.vn, Wikipedia "Địa đạo Củ Chi", baobinhphuoc.com.vn,
// sa bàn & lát cắt minh hoạ tại Khu di tích Bến Dược / Bến Đình.

import type { EraValue } from '../eraLabels'

export type Vec2 = [number, number]

export type InfoItem = { title: string; desc: string }

/** Các đường khoét vào mặt cắt. */
export type CutKind = 'tunnel' | 'deep' | 'demo' | 'trap' | 'vent' | 'flue' | 'well'

export type Cut = {
  kind: CutKind
  points: Vec2[]
  radius: number
  steps?: boolean
}

export type ChamberKind =
  | 'kitchen'
  | 'clinic'
  | 'store'
  | 'meeting'
  | 'sleep'
  | 'firing'
  | 'punji'
  | 'shelter'
  | 'display'
  | 'factory'
  | 'hideout'

export type Chamber = InfoItem & {
  kind: ChamberKind
  /** Tâm theo trục x. */
  x: number
  /** Cao độ nền hầm. */
  y: number
  w: number
  h: number
}

export type Callout = InfoItem & { at: Vec2; place?: 'above' | 'below' | 'left' | 'right' | 'sky' }

export type Outfit =
  | 'guerrilla'
  | 'civilian'
  | 'farmer'
  | 'nurse'
  | 'us'
  | 'soldier75'
  | 'tourist1'
  | 'tourist2'
  | 'tourist3'
  | 'guide'

export type Pose =
  | 'stand'
  | 'walk'
  | 'aim'
  | 'sit'
  | 'kneel'
  | 'cook'
  | 'pedal'
  | 'climb'
  | 'dig'
  | 'carry'
  | 'wave'
  | 'lie'
  | 'read'
  | 'hammer'

export type Prop = 'rifle' | 'hoe' | 'crate' | 'ladle' | 'flashlight' | 'basket' | 'paper' | 'hammer' | 'none'

/** Nhân vật đặt trong hầm (mặt cắt) hoặc trên mặt đất. */
export type FigureSpec = {
  outfit: Outfit
  pose: Pose
  x: number
  /** Trong hầm: cao độ nền. Trên mặt đất: bỏ qua. */
  y?: number
  /** Trên mặt đất: toạ độ z. Trong hầm: độ lùi so với mặt cắt (mặc định 0.45). */
  z?: number
  surface?: boolean
  /** Góc quay quanh trục đứng (rad). 0 = nhìn ra người xem. */
  face?: number
  prop?: Prop
  hat?: boolean
  scale?: number
  /** Nằm trên võng/giường: đầu hướng về +x hoặc -x. */
  lieDir?: 1 | -1
  /** Đi tuần qua lại theo trục x (trên mặt đất). */
  patrol?: number
}

/** Người bò dọc theo một đường hầm (chỉ số trong mảng cuts). */
export type Crawler = {
  cut: number
  outfit: Outfit
  speed: number
  /** Đoạn [from, to] trên đường cong (0..1). */
  from?: number
  to?: number
  phase?: number
}

export type SurfaceKind =
  | 'hut'
  | 'flag'
  | 'tank'
  | 'wreck'
  | 'heli'
  | 'hatch'
  | 'crater'
  | 'mound'
  | 'termite'
  | 'lid'
  | 'bushy'
  | 'sign'
  | 'pavilion'
  | 'lamp'
  | 'wellring'
  | 'basket'
  | 'fence'

export type SurfaceObj = {
  type: SurfaceKind
  x: number
  z: number
  y?: number
  scale?: number
  rot?: number
}

export type Forest = {
  broadleaf: number
  palms: number
  bamboo: number
  burnt: number
  tufts: number
  /** Giới hạn z tối đa cho cây xanh (để chừa khoảng trống phía trước). */
  leafyZMax?: number
  leafColors: string[]
  tuftColors: string[]
  seed: number
}

export type PointLightSpec = { x: number; y: number; z?: number; color: string; intensity: number; flicker?: boolean }

export type Decor =
  | { kind: 'dash'; points: Vec2[] }
  | { kind: 'cross'; at: Vec2 }
  | { kind: 'ghostCut'; points: Vec2[]; radius: number }
  | { kind: 'ghostRoom'; x: number; y: number; w: number; h: number }

export type EraScene = {
  title: string
  caption: string
  blockW: number
  blockH: number
  blockD: number
  palette: {
    topsoil: string
    laterite: string
    deep: string
    grass: string
    groove: string
    room: string
  }
  accent: string
  /** Khoảng trống phía trên mặt đất cần đưa vào khung hình. */
  skyRoom: number
  cuts: Cut[]
  chambers: Chamber[]
  callouts: Callout[]
  trapDoors: { at: Vec2; angle?: number }[]
  waterTraps: { x: number; y: number; w: number; h: number }[]
  figures: FigureSpec[]
  crawlers: Crawler[]
  surface: SurfaceObj[]
  forest: Forest
  lights: PointLightSpec[]
  decor: Decor[]
  depthMarks: { y: number; text: string }[]
  walkway?: boolean
}

/* ------------------------------------------------------------------ */
/*  Hằng số độ sâu (quy đổi): 3 m ≈ 1.9 · 6 m ≈ 4.0 · 10 m+ ≈ 6.6       */
/* ------------------------------------------------------------------ */

const L1 = -1.9
const L2 = -4.0
const L3 = -6.6

/* ------------------------------------------------------------------ */
/*  Mạng hầm 3 tầng liên hoàn — dùng chung 1968 & 1975                 */
/* ------------------------------------------------------------------ */

function network3(): Cut[] {
  return [
    // 0 · Miệng hầm trái
    { kind: 'tunnel', radius: 0.22, steps: true, points: [[-9.05, 0.04], [-9.15, -0.8], [-8.95, -1.5], [-8.5, -1.86]] },
    // 1 · Miệng hầm giữa (ngụy trang)
    { kind: 'tunnel', radius: 0.22, steps: true, points: [[2.9, 0.04], [2.98, -0.75], [2.75, -1.45], [2.3, -1.86]] },
    // 2 · Lối từ ụ chiến đấu xuống tầng 1
    { kind: 'tunnel', radius: 0.21, steps: true, points: [[-6.85, -1.22], [-6.55, -1.58], [-6.25, -1.92]] },
    // 3 · Tầng 1 (3 m)
    {
      kind: 'tunnel',
      radius: 0.3,
      points: [[-8.6, -1.88], [-6.3, -1.98], [-4.4, -1.82], [-2.6, -1.95], [-0.4, -1.84], [1.6, -1.96], [3.6, -1.86], [5.3, -1.95], [7.2, -1.86], [8.6, -1.9]],
    },
    // 4 · Nhánh hầm giả (cụt, gài mìn)
    { kind: 'trap', radius: 0.21, steps: true, points: [[7.2, -1.86], [7.65, -2.45], [7.8, -3.05]] },
    // 5 · Thông tầng 1 → 2 (trái)
    { kind: 'tunnel', radius: 0.26, steps: true, points: [[-6.3, -1.98], [-6.85, -2.7], [-6.45, -3.45], [-5.8, -3.98]] },
    // 6 · Thông tầng 1 → 2 (phải)
    { kind: 'tunnel', radius: 0.26, steps: true, points: [[3.6, -1.86], [4.15, -2.65], [3.85, -3.4], [4.3, -3.98]] },
    // 7 · Tầng 2 (6 m)
    {
      kind: 'deep',
      radius: 0.3,
      points: [[-7.6, -3.98], [-5.8, -3.98], [-3.4, -4.1], [-1.2, -3.92], [0.9, -4.05], [3.0, -3.94], [4.3, -3.98], [6.3, -4.05], [7.5, -3.96]],
    },
    // 8 · Thông tầng 2 → 3 (trái)
    { kind: 'deep', radius: 0.26, steps: true, points: [[-6.9, -3.98], [-7.35, -4.8], [-6.95, -5.75], [-6.3, -6.58]] },
    // 9 · Thông tầng 2 → 3 (phải)
    { kind: 'deep', radius: 0.26, steps: true, points: [[3.0, -3.94], [3.5, -4.85], [3.1, -5.75], [3.6, -6.58]] },
    // 10 · Tầng 3 (hơn 10 m) — có đoạn trũng ngập nước
    {
      kind: 'deep',
      radius: 0.3,
      points: [[-6.3, -6.58], [-4.6, -6.68], [-3.2, -6.55], [-2.5, -6.62], [-2.0, -7.22], [-1.0, -7.28], [-0.5, -6.72], [0.4, -6.55], [1.9, -6.66], [3.6, -6.58], [5.6, -6.5], [7.4, -6.62], [8.6, -6.6]],
    },
    // 11 · Giếng nước
    { kind: 'well', radius: 0.27, points: [[8.86, 0.04], [8.86, -7.55]] },
    // 12-14 · Ống khói bếp Hoàng Cầm toả nhiều nhánh
    { kind: 'flue', radius: 0.075, points: [[4.5, -1.02], [4.0, -0.78], [3.66, -0.36], [3.6, 0.04]] },
    { kind: 'flue', radius: 0.075, points: [[4.5, -1.02], [4.28, -0.6], [4.22, 0.04]] },
    { kind: 'flue', radius: 0.075, points: [[4.5, -1.02], [4.76, -0.56], [4.86, 0.04]] },
    // 15-16 · Ống thông hơi
    { kind: 'vent', radius: 0.07, points: [[-3.2, -1.9], [-2.98, -1.0], [-2.78, 0.04]] },
    { kind: 'vent', radius: 0.07, points: [[6.6, -1.88], [6.95, -1.0], [7.15, 0.04]] },
    // 17-18 · Lỗ châu mai của ụ chiến đấu
    { kind: 'vent', radius: 0.055, points: [[-7.95, -0.42], [-8.25, 0.04]] },
    { kind: 'vent', radius: 0.055, points: [[-7.25, -0.42], [-6.95, 0.04]] },
  ]
}

function trapDoors3(): EraScene['trapDoors'] {
  return [
    { at: [-6.82, -2.62], angle: 0.25 },
    { at: [4.1, -2.62], angle: -0.25 },
    { at: [-7.3, -4.85], angle: 0.15 },
    { at: [3.46, -4.85], angle: -0.15 },
  ]
}

const SHARED_DEPTH = [
  { y: 0, text: '0 m' },
  { y: L1, text: '−3 m · tầng 1' },
  { y: L2, text: '−6 m · tầng 2' },
  { y: L3, text: '−10 m · tầng 3' },
]

/* ================================================================== */
/*  1948                                                               */
/* ================================================================== */

const SCENE_1948: EraScene = {
  title: '1948 · Khởi dựng địa đạo',
  caption: 'Các đoạn hầm nhỏ, rời rạc, chưa liên thông — đào thủ công',
  blockW: 13,
  blockH: 6.2,
  blockD: 5,
  palette: {
    topsoil: '#5e3a20',
    laterite: '#d9772f',
    deep: '#b8521f',
    grass: '#4c7f2c',
    groove: '#efc58e',
    room: '#d9a066',
  },
  accent: '#f6b46b',
  skyRoom: 2.6,
  cuts: [
    // 0 · Đoạn hầm Tân Phú Trung (trái)
    { kind: 'tunnel', radius: 0.23, steps: true, points: [[-4.6, 0.04], [-4.7, -0.8], [-4.4, -1.5], [-3.8, -1.84], [-2.6, -1.92], [-1.75, -1.86]] },
    // 1 · Đoạn hầm Phước Vĩnh An (phải) — tách biệt
    { kind: 'tunnel', radius: 0.23, steps: true, points: [[1.6, 0.04], [1.7, -0.9], [2.05, -1.75], [2.8, -2.1], [4.2, -2.2], [4.8, -2.16]] },
    // 2 · Lỗ thông hơi
    { kind: 'vent', radius: 0.065, points: [[-2.75, -1.92], [-2.45, -1.0], [-2.28, 0.04]] },
  ],
  chambers: [
    {
      kind: 'hideout',
      x: -0.95,
      y: -2.0,
      w: 1.5,
      h: 0.92,
      title: 'Hầm ẩn nấp của cán bộ',
      desc: 'Hầm bí mật cho cán bộ trú ẩn tạm thời trong vùng địch hậu. Mỗi làng tự đào một hầm căn cứ riêng, chưa nối với làng bên.',
    },
    {
      kind: 'store',
      x: 5.45,
      y: -2.32,
      w: 1.3,
      h: 0.92,
      title: 'Hầm cất tài liệu, vũ khí',
      desc: 'Nơi cất giấu tài liệu và vũ khí thô sơ — giáo mác, súng kíp, lựu đạn tự chế — tránh các cuộc lùng sục của quân Pháp.',
    },
  ],
  callouts: [
    {
      at: [-3.1, -1.9],
      place: 'below',
      title: 'Đoạn hầm Tân Phú Trung',
      desc: 'Những đoạn hầm đầu tiên được đào bằng cuốc, xẻng trong đêm tối. Hầm chỉ vừa một người bò, sâu khoảng 3 m.',
    },
    {
      at: [3.6, -2.18],
      place: 'below',
      title: 'Đoạn hầm Phước Vĩnh An',
      desc: 'Đoạn hầm của xã bên, đào độc lập. Giai đoạn này các hầm còn rời rạc, chưa liên thông với nhau.',
    },
    {
      at: [0.4, -2.05],
      place: 'below',
      title: 'Chưa liên thông',
      desc: 'Năm 1948 các đoạn hầm chưa nối với nhau. Phải đến thời kỳ chống Mỹ, hệ thống mới phát triển thành mạng lưới liên hoàn khoảng 250 km.',
    },
    {
      at: [-4.62, -0.35],
      title: 'Miệng hầm bí mật',
      desc: 'Miệng hầm nhỏ, nắp phủ đất và lá khô, đặt trong bụi tre hoặc góc vườn để tránh bị phát hiện.',
    },
  ],
  trapDoors: [],
  waterTraps: [],
  figures: [
    { outfit: 'guerrilla', pose: 'read', x: -1.2, y: -2.0, prop: 'paper', hat: false },
    { outfit: 'civilian', pose: 'stand', x: -0.45, y: -2.0, face: -0.6, hat: false, scale: 0.92 },
    { outfit: 'civilian', pose: 'carry', x: 5.45, y: -2.32, prop: 'crate', hat: false, face: -0.4 },
    // mặt đất — dân làng đào hầm, vận chuyển đất
    { outfit: 'farmer', pose: 'dig', x: 0.9, z: 1.6, surface: true, prop: 'hoe', face: 0.9 },
    { outfit: 'farmer', pose: 'carry', x: 0.15, z: 1.2, surface: true, prop: 'basket', face: -1.2 },
    { outfit: 'civilian', pose: 'stand', x: -5.4, z: 1.7, surface: true, face: 0.5 },
    { outfit: 'farmer', pose: 'dig', x: -3.6, z: 1.9, surface: true, prop: 'hoe', face: -0.8 },
  ],
  crawlers: [{ cut: 0, outfit: 'civilian', speed: 0.05, from: 0.45, to: 0.95 }],
  surface: [
    { type: 'hut', x: -1.6, z: -0.8, scale: 1 },
    { type: 'hut', x: 3.6, z: -0.5, scale: 0.9, rot: 0.4 },
    { type: 'hut', x: -5.2, z: -1.2, scale: 0.8, rot: -0.3 },
    { type: 'hatch', x: -4.6, z: 2.25 },
    { type: 'hatch', x: 1.6, z: 2.25 },
    { type: 'termite', x: -2.28, z: 2.2 },
    { type: 'basket', x: 1.3, z: 1.4 },
    { type: 'basket', x: 1.0, z: 1.15 },
    { type: 'fence', x: 4.6, z: 1.4, rot: 0.2 },
  ],
  forest: {
    broadleaf: 24,
    palms: 10,
    bamboo: 14,
    burnt: 0,
    tufts: 260,
    leafColors: ['#2f7d2c', '#3b8c34', '#2a6b25', '#4a9a3a'],
    tuftColors: ['#5c9a3a', '#4d8a32', '#6fae44'],
    seed: 1948,
  },
  lights: [{ x: -0.95, y: -1.25, color: '#ffb05a', intensity: 3 }],
  decor: [
    { kind: 'dash', points: [[-1.0, -2.3], [0.4, -2.05], [1.9, -2.25]] },
    { kind: 'cross', at: [0.4, -2.05] },
  ],
  depthMarks: [
    { y: 0, text: '0 m' },
    { y: -1.9, text: '−3 m' },
    { y: -2.5, text: '−4 m' },
  ],
}

/* ================================================================== */
/*  1968                                                               */
/* ================================================================== */

const SCENE_1968: EraScene = {
  title: '1968 · Làng ngầm 3 tầng',
  caption: 'Khoảng 250 km hầm liên hoàn — bàn đạp tiến công Tết Mậu Thân',
  blockW: 19.5,
  blockH: 9.8,
  blockD: 6,
  palette: {
    topsoil: '#55331c',
    laterite: '#dd7a30',
    deep: '#b84a1a',
    grass: '#6b7a35',
    groove: '#f0c48a',
    room: '#dda064',
  },
  accent: '#ffbf5a',
  skyRoom: 3.7,
  cuts: network3(),
  chambers: [
    {
      kind: 'firing',
      x: -7.6,
      y: -1.32,
      w: 1.7,
      h: 0.94,
      title: 'Ụ chiến đấu',
      desc: 'Hoả điểm sát mặt đất, có lỗ châu mai ngụy trang. Du kích bắn tỉa rồi rút xuống hầm qua lối bí mật.',
    },
    {
      kind: 'punji',
      x: -4.9,
      y: -1.32,
      w: 0.95,
      h: 1.14,
      title: 'Hầm chông',
      desc: 'Hố sâu cắm chông tre vót nhọn, miệng phủ nắp ngụy trang cỏ lá — bẫy bộ binh địch tuần tra trên mặt đất.',
    },
    {
      kind: 'sleep',
      x: -1.6,
      y: -2.06,
      w: 2.2,
      h: 1.02,
      title: 'Hầm nghỉ',
      desc: 'Chỗ ngủ của du kích, trần chống bằng thân gỗ. Nằm võng để tránh ẩm thấp và rắn rết.',
    },
    {
      kind: 'kitchen',
      x: 5.3,
      y: -2.06,
      w: 2.1,
      h: 1.08,
      title: 'Bếp Hoàng Cầm',
      desc: 'Bếp không khói: khói được dẫn qua nhiều ống ngầm rồi toả ra các bụi cây ở xa, địch không phát hiện được nơi nấu ăn.',
    },
    {
      kind: 'clinic',
      x: -3.4,
      y: -4.18,
      w: 2.4,
      h: 1.2,
      title: 'Trạm quân y',
      desc: 'Cứu chữa thương binh ngay dưới lòng đất. Đèn được thắp bằng điện đạp từ xe đạp.',
    },
    {
      kind: 'meeting',
      x: 0.9,
      y: -4.12,
      w: 2.0,
      h: 1.1,
      title: 'Phòng họp chỉ huy',
      desc: 'Nơi Ban chỉ huy họp bàn kế hoạch tác chiến — bàn đạp cho các mũi tiến công vào Sài Gòn dịp Tết Mậu Thân 1968.',
    },
    {
      kind: 'factory',
      x: 6.3,
      y: -4.12,
      w: 2.0,
      h: 1.1,
      title: 'Xưởng vũ khí',
      desc: 'Chế tạo mìn, lựu đạn từ vỏ đồ hộp và bom đạn chưa nổ của địch.',
    },
    {
      kind: 'store',
      x: -4.6,
      y: -6.78,
      w: 2.0,
      h: 1.04,
      title: 'Kho vũ khí – lương thực',
      desc: 'Kho ở tầng sâu nhất, an toàn trước bom pháo; dự trữ gạo và đạn dược cho cả mùa khô.',
    },
    {
      kind: 'shelter',
      x: 1.9,
      y: -6.76,
      w: 2.2,
      h: 1.04,
      title: 'Hầm trú bom',
      desc: 'Tầng 3 sâu hơn 10 m chịu được bom hạng nặng — nơi trú ẩn cho thường dân khi B-52 rải thảm.',
    },
  ],
  callouts: [
    {
      at: [-2.88, -0.55],
      title: 'Ống thông hơi',
      desc: 'Ống nhỏ đưa không khí xuống hầm, miệng ngụy trang thành ụ mối hoặc gốc cây.',
    },
    {
      at: [4.22, -0.35],
      title: 'Ống dẫn khói',
      desc: 'Khói bếp Hoàng Cầm được chia qua nhiều nhánh ống, thoát lên ở các bụi cây cách xa bếp.',
    },
    {
      at: [8.86, -3.2],
      place: 'right',
      title: 'Giếng nước',
      desc: 'Giếng đào sâu lấy nước sạch — nước bề mặt có thể bị địch rải chất độc hoá học.',
    },
    {
      at: [-1.5, -7.22],
      place: 'below',
      title: 'Ngăn nước chống hơi độc',
      desc: 'Đoạn hầm trũng ngập nước, chặn hơi độc và khói địch bơm vào. Người qua phải nín thở lặn.',
    },
    {
      at: [7.8, -3.05],
      place: 'right',
      title: 'Nhánh hầm giả · gài mìn',
      desc: 'Nhánh cụt cài mìn để đánh lừa và tiêu diệt lính "chuột cống" xâm nhập địa đạo.',
    },
    {
      at: [-6.82, -2.62],
      place: 'left',
      title: 'Nắp hầm bí mật',
      desc: 'Nắp đậy giữa các tầng, đóng chặn khi địch xâm nhập hoặc bơm hơi độc xuống hầm.',
    },
    {
      at: [2.92, -0.4],
      title: 'Miệng hầm ngụy trang',
      desc: 'Lối xuống hẹp chỉ vừa người Việt, nắp phủ đất lá. Lính Mỹ to lớn rất khó lọt qua.',
    },
  ],
  trapDoors: trapDoors3(),
  waterTraps: [{ x: -1.5, y: -7.58, w: 1.5, h: 0.42 }],
  figures: [
    // Ụ chiến đấu
    { outfit: 'guerrilla', pose: 'aim', x: -8.05, y: -1.32, face: -1.2, prop: 'rifle' },
    { outfit: 'guerrilla', pose: 'aim', x: -7.15, y: -1.32, face: 1.2, prop: 'rifle' },
    // Hầm nghỉ — nằm võng
    { outfit: 'guerrilla', pose: 'lie', x: -2.05, y: -1.5, lieDir: 1, hat: false },
    { outfit: 'guerrilla', pose: 'lie', x: -1.1, y: -1.75, lieDir: -1, hat: false },
    // Bếp
    { outfit: 'civilian', pose: 'cook', x: 5.0, y: -2.06, face: 0.6, prop: 'ladle', hat: false },
    { outfit: 'guerrilla', pose: 'sit', x: 5.9, y: -2.06, face: -0.6 },
    // Trạm quân y
    { outfit: 'nurse', pose: 'stand', x: -3.55, y: -4.18, face: -0.5 },
    { outfit: 'guerrilla', pose: 'lie', x: -4.15, y: -3.86, lieDir: -1, hat: false },
    { outfit: 'guerrilla', pose: 'pedal', x: -2.55, y: -4.18, face: 0.3, hat: false },
    // Phòng họp
    { outfit: 'guerrilla', pose: 'sit', x: 0.3, y: -4.12, face: 1.0 },
    { outfit: 'guerrilla', pose: 'sit', x: 1.5, y: -4.12, face: -1.0 },
    { outfit: 'guerrilla', pose: 'stand', x: 0.9, y: -4.12, face: 0, z: 0.62, prop: 'paper' },
    // Xưởng vũ khí
    { outfit: 'guerrilla', pose: 'hammer', x: 5.85, y: -4.12, face: 0.5, prop: 'hammer', hat: false },
    { outfit: 'civilian', pose: 'hammer', x: 6.75, y: -4.12, face: -0.5, prop: 'hammer', hat: false },
    // Kho
    { outfit: 'guerrilla', pose: 'carry', x: -4.0, y: -6.78, face: -1.0, prop: 'crate' },
    // Hầm trú bom
    { outfit: 'civilian', pose: 'sit', x: 1.3, y: -6.76, face: 0.3, hat: false },
    { outfit: 'civilian', pose: 'sit', x: 1.95, y: -6.76, face: 0, hat: false, scale: 0.75 },
    { outfit: 'civilian', pose: 'sit', x: 2.6, y: -6.76, face: -0.3 },
    // Giếng
    { outfit: 'guerrilla', pose: 'climb', x: 8.86, y: -4.6, z: 0.14, hat: false },
    // Mặt đất — lính Mỹ càn quét
    { outfit: 'us', pose: 'walk', x: 0.4, z: 0.9, surface: true, face: 1.57, prop: 'rifle', patrol: 1.2 },
    { outfit: 'us', pose: 'walk', x: -0.8, z: 0.35, surface: true, face: 1.57, prop: 'rifle', patrol: 1.0 },
    { outfit: 'us', pose: 'walk', x: 1.6, z: 0.1, surface: true, face: 1.57, prop: 'rifle', patrol: 1.1 },
    { outfit: 'us', pose: 'kneel', x: 2.45, z: 2.35, surface: true, face: 1.57, prop: 'flashlight' },
  ],
  crawlers: [
    { cut: 3, outfit: 'guerrilla', speed: 0.035, from: 0.05, to: 0.42 },
    { cut: 7, outfit: 'guerrilla', speed: 0.03, from: 0.5, to: 0.95, phase: 0.4 },
  ],
  surface: [
    { type: 'heli', x: -4.6, y: 2.55, z: -0.9, scale: 1.3 },
    { type: 'tank', x: -0.8, z: -1.4, rot: 0.15 },
    { type: 'crater', x: -2.5, z: -0.2, scale: 1.1 },
    { type: 'crater', x: 1.8, z: -1.3, scale: 0.9 },
    { type: 'crater', x: 6.0, z: -0.6, scale: 1 },
    { type: 'crater', x: -6.4, z: -1.7, scale: 0.8 },
    { type: 'mound', x: -7.6, z: 2.45 },
    { type: 'lid', x: -4.9, z: 2.55 },
    { type: 'hatch', x: -9.05, z: 2.65 },
    { type: 'hatch', x: 2.9, z: 2.65 },
    { type: 'bushy', x: 3.6, z: 2.6 },
    { type: 'bushy', x: 4.22, z: 2.45 },
    { type: 'bushy', x: 4.86, z: 2.6 },
    { type: 'termite', x: -2.78, z: 2.55 },
    { type: 'termite', x: 7.15, z: 2.55 },
    { type: 'wellring', x: 8.86, z: 2.7 },
  ],
  forest: {
    broadleaf: 22,
    palms: 12,
    bamboo: 4,
    burnt: 14,
    tufts: 200,
    leafyZMax: -0.6,
    leafColors: ['#3b6e2a', '#4a7a2e', '#55702c', '#2f5f25'],
    tuftColors: ['#8a8a3c', '#7a7a34', '#9a8d48'],
    seed: 1968,
  },
  lights: [
    { x: 5.0, y: -1.6, color: '#ff8a3a', intensity: 5, flicker: true },
    { x: -3.4, y: -3.25, color: '#ffe3a0', intensity: 4 },
    { x: 6.3, y: -3.3, color: '#ffc070', intensity: 2.5 },
  ],
  decor: [],
  depthMarks: SHARED_DEPTH,
}

/* ================================================================== */
/*  1975                                                               */
/* ================================================================== */

const SCENE_1975: EraScene = {
  title: '1975 · Hoàn thành sứ mệnh',
  caption: 'Hậu cứ vững chắc của "Đất thép thành đồng" — bàn đạp Chiến dịch Hồ Chí Minh',
  blockW: 19.5,
  blockH: 9.8,
  blockD: 6,
  palette: {
    topsoil: '#5a3a20',
    laterite: '#de8236',
    deep: '#bb5422',
    grass: '#4f8a31',
    groove: '#f3cb92',
    room: '#e0a66a',
  },
  accent: '#ffd25a',
  skyRoom: 2.8,
  cuts: network3(),
  chambers: [
    {
      kind: 'firing',
      x: -7.6,
      y: -1.32,
      w: 1.7,
      h: 0.94,
      title: 'Ụ chiến đấu',
      desc: 'Hệ thống hoả điểm được giữ vững đến ngày cuối cùng, bảo vệ hành lang của lực lượng cách mạng.',
    },
    {
      kind: 'sleep',
      x: -1.6,
      y: -2.06,
      w: 2.2,
      h: 1.02,
      title: 'Hầm nghỉ',
      desc: 'Nơi nghỉ của các đơn vị trước giờ xuất phát. Hệ thống 250 km được củng cố toàn diện.',
    },
    {
      kind: 'kitchen',
      x: 5.3,
      y: -2.06,
      w: 2.1,
      h: 1.08,
      title: 'Bếp Hoàng Cầm',
      desc: 'Bếp không khói tiếp tục nuôi quân trong giai đoạn nước rút của cuộc kháng chiến.',
    },
    {
      kind: 'clinic',
      x: -3.4,
      y: -4.18,
      w: 2.4,
      h: 1.2,
      title: 'Trạm quân y',
      desc: 'Trạm quân y tiền phương phục vụ các đơn vị tiến về Sài Gòn trong Chiến dịch Hồ Chí Minh.',
    },
    {
      kind: 'meeting',
      x: 0.9,
      y: -4.12,
      w: 2.0,
      h: 1.1,
      title: 'Sở chỉ huy',
      desc: 'Căn cứ bàn đạp: từ đây các mũi tiến công tiến thẳng vào trung tâm Sài Gòn mùa xuân 1975.',
    },
    {
      kind: 'store',
      x: -4.6,
      y: -6.78,
      w: 2.0,
      h: 1.04,
      title: 'Kho hậu cần',
      desc: 'Kho đạn dược, lương thực được vận chuyển lên phục vụ chiến dịch cuối cùng.',
    },
    {
      kind: 'shelter',
      x: 1.9,
      y: -6.76,
      w: 2.2,
      h: 1.04,
      title: 'Hành lang bảo vệ lực lượng',
      desc: 'Tầng sâu che chở lực lượng cách mạng suốt giai đoạn nước rút cho đến ngày toàn thắng 30/4/1975.',
    },
  ],
  callouts: [
    {
      at: [4.22, -0.35],
      title: 'Ống dẫn khói',
      desc: 'Hệ thống bếp không khói vẫn hoạt động đến những ngày cuối của cuộc chiến.',
    },
    {
      at: [8.86, -3.2],
      place: 'right',
      title: 'Giếng nước',
      desc: 'Giếng sâu cung cấp nước sạch cho hàng nghìn người sống trong lòng đất.',
    },
    {
      at: [2.92, -0.4],
      title: 'Bước ra ánh sáng',
      desc: 'Ngày 30/4/1975, chiến sĩ và người dân bước ra khỏi lòng đất — địa đạo hoàn thành sứ mệnh lịch sử.',
    },
    {
      at: [-1.5, -7.22],
      place: 'below',
      title: 'Ngăn nước chống hơi độc',
      desc: 'Các công trình phòng thủ của địa đạo được giữ nguyên, nay là chứng tích lịch sử.',
    },
  ],
  trapDoors: trapDoors3(),
  waterTraps: [{ x: -1.5, y: -7.58, w: 1.5, h: 0.42 }],
  figures: [
    { outfit: 'soldier75', pose: 'stand', x: -7.6, y: -1.32, face: 0.3, prop: 'rifle' },
    { outfit: 'soldier75', pose: 'lie', x: -1.6, y: -1.6, lieDir: 1, hat: false },
    { outfit: 'civilian', pose: 'cook', x: 5.0, y: -2.06, face: 0.6, prop: 'ladle', hat: false },
    { outfit: 'nurse', pose: 'stand', x: -3.4, y: -4.18, face: 0.2 },
    { outfit: 'soldier75', pose: 'sit', x: -2.6, y: -4.18, face: -0.3, hat: false },
    { outfit: 'soldier75', pose: 'stand', x: 0.6, y: -4.12, face: 0.5, prop: 'paper' },
    { outfit: 'soldier75', pose: 'sit', x: 1.4, y: -4.12, face: -1.0 },
    { outfit: 'soldier75', pose: 'carry', x: -4.1, y: -6.78, face: 1.2, prop: 'crate' },
    { outfit: 'soldier75', pose: 'carry', x: -5.1, y: -6.78, face: 1.2, prop: 'crate' },
    // Ra khỏi miệng hầm
    { outfit: 'soldier75', pose: 'climb', x: 2.9, y: -0.55, z: 0.12, hat: true },
    // Mặt đất — mừng chiến thắng
    { outfit: 'soldier75', pose: 'wave', x: 1.6, z: 1.9, surface: true, face: -0.3 },
    { outfit: 'soldier75', pose: 'wave', x: -0.6, z: 1.5, surface: true, face: 0.3 },
    { outfit: 'civilian', pose: 'wave', x: -1.5, z: 2.0, surface: true, face: 0.5 },
    { outfit: 'farmer', pose: 'stand', x: -2.4, z: 1.7, surface: true, face: 0.6 },
    { outfit: 'soldier75', pose: 'walk', x: 4.6, z: 1.3, surface: true, face: -1.57, prop: 'rifle', patrol: 0.8 },
  ],
  crawlers: [{ cut: 3, outfit: 'soldier75', speed: 0.03, from: 0.4, to: 0.7 }],
  surface: [
    { type: 'flag', x: 0.4, z: 1.2 },
    { type: 'wreck', x: -5.6, z: -1.3, rot: -0.35 },
    { type: 'crater', x: 6.2, z: -0.8, scale: 0.8 },
    { type: 'mound', x: -7.6, z: 2.45 },
    { type: 'hatch', x: -9.05, z: 2.65 },
    { type: 'hatch', x: 2.9, z: 2.65 },
    { type: 'bushy', x: 3.6, z: 2.6 },
    { type: 'bushy', x: 4.22, z: 2.45 },
    { type: 'bushy', x: 4.86, z: 2.6 },
    { type: 'termite', x: -2.78, z: 2.55 },
    { type: 'termite', x: 7.15, z: 2.55 },
    { type: 'wellring', x: 8.86, z: 2.7 },
  ],
  forest: {
    broadleaf: 30,
    palms: 12,
    bamboo: 6,
    burnt: 5,
    tufts: 260,
    leafyZMax: 0.6,
    leafColors: ['#3f8a30', '#4c9638', '#357a2a', '#5aa441'],
    tuftColors: ['#6aa83f', '#5a9636', '#7cb84a'],
    seed: 1975,
  },
  lights: [
    { x: 5.0, y: -1.6, color: '#ff9a48', intensity: 4, flicker: true },
    { x: -3.4, y: -3.25, color: '#ffe3a0', intensity: 3.5 },
  ],
  decor: [],
  depthMarks: SHARED_DEPTH,
}

/* ================================================================== */
/*  2026                                                               */
/* ================================================================== */

const SCENE_2026: EraScene = {
  title: 'Hiện nay · Di sản sống',
  caption: 'Di tích quốc gia đặc biệt — hơn 2 triệu lượt khách mỗi năm',
  blockW: 19.5,
  blockH: 9.8,
  blockD: 6,
  palette: {
    topsoil: '#5a3a22',
    laterite: '#d98040',
    deep: '#b65a2a',
    grass: '#3f8a34',
    groove: '#f7dcae',
    room: '#e6b47c',
  },
  accent: '#2dd4bf',
  skyRoom: 2.8,
  walkway: true,
  cuts: [
    // 0 · Lối xuống cho khách
    { kind: 'demo', radius: 0.34, steps: true, points: [[-7.6, 0.04], [-7.7, -0.85], [-7.4, -1.55], [-6.8, -1.86]] },
    // 1 · Đoạn hầm mở rộng cho khách (tầng 1)
    {
      kind: 'demo',
      radius: 0.42,
      steps: true,
      points: [[-6.8, -1.86], [-4.4, -1.96], [-1.6, -1.86], [1.2, -1.96], [3.6, -1.86], [5.4, -1.84], [5.95, -1.5], [6.2, -0.85], [6.28, 0.04]],
    },
    // 2 · Ống thông hơi
    { kind: 'vent', radius: 0.07, points: [[-4.3, -1.96], [-4.0, -1.0], [-3.85, 0.04]] },
    // 3-4 · Ống khói bếp phục dựng
    { kind: 'flue', radius: 0.07, points: [[2.2, -1.05], [1.6, -0.6], [1.4, 0.04]] },
    { kind: 'flue', radius: 0.07, points: [[2.2, -1.05], [2.0, -0.5], [2.05, 0.04]] },
  ],
  chambers: [
    {
      kind: 'display',
      x: -1.6,
      y: -2.08,
      w: 2.4,
      h: 1.06,
      title: 'Hầm trưng bày hiện vật',
      desc: 'Phục dựng hầm sinh hoạt với hiện vật thật: vũ khí tự chế, dụng cụ y tế, đồ dùng của du kích.',
    },
    {
      kind: 'kitchen',
      x: 3.0,
      y: -2.08,
      w: 2.0,
      h: 1.06,
      title: 'Bếp Hoàng Cầm (phục dựng)',
      desc: 'Du khách được xem cách nấu ăn không khói và thưởng thức khoai mì luộc chấm muối mè.',
    },
  ],
  callouts: [
    {
      at: [0.0, -1.95],
      place: 'below',
      title: 'Đoạn hầm mở rộng cho du khách',
      desc: 'Đoạn hầm được nới rộng, gia cố và lắp đèn để du khách trải nghiệm bò qua địa đạo an toàn.',
    },
    {
      at: [0.0, -5.0],
      title: 'Tầng sâu bảo tồn nguyên trạng',
      desc: 'Các tầng 6 m và hơn 10 m giữ nguyên trạng, không mở cho khách — bảo tồn di tích gốc.',
    },
    {
      at: [-3.9, -0.45],
      title: 'Ống thông hơi',
      desc: 'Hệ thống thông hơi được gia cố để không khí lưu thông tốt hơn cho du khách.',
    },
  ],
  trapDoors: [],
  waterTraps: [],
  figures: [
    { outfit: 'guide', pose: 'stand', x: -2.4, y: -2.08, face: 0.5 },
    { outfit: 'guerrilla', pose: 'stand', x: -1.3, y: -2.08, face: 0, prop: 'rifle' },
    { outfit: 'tourist2', pose: 'stand', x: -0.7, y: -2.08, face: -0.8, hat: false },
    { outfit: 'civilian', pose: 'cook', x: 2.6, y: -2.08, face: 0.6, prop: 'ladle', hat: false },
    { outfit: 'tourist3', pose: 'sit', x: 3.5, y: -2.08, face: -0.6, hat: false },
    // Mặt đất
    { outfit: 'guide', pose: 'wave', x: -6.6, z: 2.1, surface: true, face: 0.6 },
    { outfit: 'tourist1', pose: 'walk', x: -4.6, z: 2.2, surface: true, face: 1.57, patrol: 1.4, hat: false },
    { outfit: 'tourist2', pose: 'walk', x: -2.8, z: 2.25, surface: true, face: 1.57, patrol: 1.2, hat: false },
    { outfit: 'tourist3', pose: 'walk', x: 2.4, z: 2.15, surface: true, face: -1.57, patrol: 1.3, hat: false },
    { outfit: 'tourist1', pose: 'stand', x: 5.2, z: 1.95, surface: true, face: -0.4, hat: false },
    { outfit: 'tourist2', pose: 'stand', x: 7.4, z: 2.2, surface: true, face: -0.6, hat: false },
  ],
  crawlers: [
    { cut: 1, outfit: 'tourist1', speed: 0.028, from: 0.02, to: 0.35 },
    { cut: 1, outfit: 'tourist3', speed: 0.028, from: 0.5, to: 0.82, phase: 0.5 },
  ],
  surface: [
    { type: 'pavilion', x: -8.4, z: 0.9 },
    { type: 'sign', x: -5.6, z: 2.75 },
    { type: 'sign', x: 0.6, z: 2.75 },
    { type: 'sign', x: 6.8, z: 2.75 },
    { type: 'lamp', x: -3.2, z: 2.75 },
    { type: 'lamp', x: 3.8, z: 2.75 },
    { type: 'hatch', x: -7.6, z: 2.6 },
    { type: 'hatch', x: 6.28, z: 2.6 },
    { type: 'termite', x: -3.85, z: 1.4 },
    { type: 'bushy', x: 1.4, z: 1.4 },
    { type: 'bushy', x: 2.05, z: 1.3 },
  ],
  forest: {
    broadleaf: 34,
    palms: 14,
    bamboo: 10,
    burnt: 0,
    tufts: 300,
    leafyZMax: 1.2,
    leafColors: ['#2f8a34', '#3e9a3c', '#2a7a2c', '#4fae46'],
    tuftColors: ['#5aa83f', '#4a9836', '#6cba4a'],
    seed: 2026,
  },
  lights: [
    { x: -3.2, y: -1.6, color: '#ffe0a0', intensity: 3.5 },
    { x: 3.0, y: -1.45, color: '#ff9a48', intensity: 3, flicker: true },
  ],
  decor: [
    // Tầng 2 & 3 — đường nét đứt: bảo tồn, không mở cửa
    { kind: 'ghostCut', radius: 0.26, points: [[-6.3, -1.98], [-6.85, -2.7], [-6.45, -3.45], [-5.8, -3.98]] },
    { kind: 'ghostCut', radius: 0.3, points: [[-7.6, -3.98], [-5.8, -3.98], [-3.4, -4.1], [-1.2, -3.92], [0.9, -4.05], [3.0, -3.94], [4.3, -3.98], [6.3, -4.05], [7.5, -3.96]] },
    { kind: 'ghostCut', radius: 0.26, points: [[3.0, -3.94], [3.5, -4.85], [3.1, -5.75], [3.6, -6.58]] },
    { kind: 'ghostCut', radius: 0.3, points: [[-6.3, -6.58], [-4.6, -6.68], [-3.2, -6.55], [-1.0, -6.7], [1.9, -6.66], [3.6, -6.58], [5.6, -6.5], [7.4, -6.62]] },
    { kind: 'ghostRoom', x: -3.4, y: -4.18, w: 2.4, h: 1.2 },
    { kind: 'ghostRoom', x: 0.9, y: -4.12, w: 2.0, h: 1.1 },
    { kind: 'ghostRoom', x: 6.3, y: -4.12, w: 2.0, h: 1.1 },
    { kind: 'ghostRoom', x: -4.6, y: -6.78, w: 2.0, h: 1.04 },
    { kind: 'ghostRoom', x: 1.9, y: -6.76, w: 2.2, h: 1.04 },
  ],
  depthMarks: [
    { y: 0, text: '0 m' },
    { y: -1.9, text: '−3 m · tham quan' },
    { y: L2, text: '−6 m · bảo tồn' },
    { y: L3, text: '−10 m · bảo tồn' },
  ],
}

export const ERA_SCENES: Record<EraValue, EraScene> = {
  1948: SCENE_1948,
  1968: SCENE_1968,
  1975: SCENE_1975,
  2026: SCENE_2026,
}
