/**
 * Ghim các điểm 360° trên SƠ ĐỒ MINH HOẠ (ảnh bản đồ giấy đã polish) của Khu di
 * tích Địa đạo Củ Chi — Bến Dược.
 *
 * Toạ độ là phần trăm (0–100) so với ảnh /media/cu-chi/map/so-do-ben-duoc.webp,
 * đặt thủ công khớp với tên vùng in trên bản đồ (Cổng vào, Khu trưng bày, Đền
 * Bến Dược...). Đây CHỈ là dữ liệu hiển thị FE, không đụng GPS/Leaflet.
 */
export type CuChiIllustratedPin = {
  id: string
  routeOrder: number
  xPct: number
  yPct: number
  label: string
}

export const CU_CHI_MAP_IMAGE = '/media/cu-chi/map/so-do-ben-duoc.webp'

export const CU_CHI_ILLUSTRATED_PINS: CuChiIllustratedPin[] = [
  { id: '22222222-2222-2222-2222-222222222221', routeOrder: 1, xPct: 69, yPct: 21, label: 'Bãi gửi xe gắn máy số 1' },
  { id: '22222222-2222-2222-2222-222222222222', routeOrder: 2, xPct: 59, yPct: 32, label: 'Đền tưởng niệm Liệt sĩ Bến Dược' },
  { id: '22222222-2222-2222-2222-222222222223', routeOrder: 3, xPct: 54, yPct: 57, label: 'Căn cứ Bộ Tư lệnh Quân khu Sài Gòn - Gia Định' },
  { id: '22222222-2222-2222-2222-222222222224', routeOrder: 4, xPct: 50, yPct: 43, label: 'Khu trưng bày' },
  { id: '22222222-2222-2222-2222-222222222225', routeOrder: 5, xPct: 20, yPct: 82, label: 'Căn cứ Khu ủy Quân khu Sài Gòn - Gia Định' },
  { id: '22222222-2222-2222-2222-222222222226', routeOrder: 6, xPct: 30, yPct: 35, label: 'Nhà biểu diễn Sa bàn, Phim 3D' },
  { id: '22222222-2222-2222-2222-222222222227', routeOrder: 7, xPct: 21, yPct: 41, label: 'Khu tái hiện Vùng Giải phóng' },
]

export const CU_CHI_ILLUSTRATED_PIN_BY_ID: Record<string, CuChiIllustratedPin> =
  Object.fromEntries(CU_CHI_ILLUSTRATED_PINS.map((p) => [p.id, p]))
