// src/features/time-portal/xuaNay/xuaNayData.ts
// "Xưa & Nay" — 5 điểm trong khu di tích, mỗi điểm một cặp ảnh CÙNG GÓC CHỤP:
//   • Hiện nay: ảnh nhóm chụp tại di tích.
//   • 1968: tranh tái hiện minh hoạ, vẽ lại trên chính khung hình đó (không phải ảnh tư liệu).
// Nội dung chữ lấy từ các khoảnh khắc đã có nguồn trong timeline/storyData.ts.
// Muốn thay tranh bằng bản AI/hoạ sĩ vẽ: giữ đúng khung 4:3, đè file *-1968.webp cùng tên.

const IMG = '/images/xua-nay'

export const XUA_NAY_SPOTS = ['mieng-ham', 'bep-hoang-cam', 'phong-hop', 'thong-hoi', 'den-ham'] as const
export type XuaNaySpotId = (typeof XUA_NAY_SPOTS)[number]

export type XuaNaySpot = {
  id: XuaNaySpotId
  name: string
  /** Nhãn ngắn trên thanh chọn điểm. */
  short: string
  icon: string
  xua: { src: string; text: string }
  nay: { src: string; text: string }
}

/** Ảnh hiện trạng do nhóm chụp tại khu di tích. */
export const XUA_NAY_PHOTO_CREDIT = 'Ảnh hiện trạng: nhóm TimeLens chụp tại khu di tích Địa đạo Củ Chi'
export const XUA_NAY_ART_NOTE = 'Tranh tái hiện minh hoạ, vẽ trên chính khung ảnh hiện trạng — không phải ảnh tư liệu năm 1968.'

export const XUA_NAY: Record<XuaNaySpotId, XuaNaySpot> = {
  'mieng-ham': {
    id: 'mieng-ham',
    name: 'Miệng hầm',
    short: 'Miệng hầm',
    icon: 'door_open',
    xua: {
      src: `${IMG}/mieng-ham-1968.webp`,
      text: 'Lối xuống hầm nhỏ hẹp, được che bằng nắp gỗ phủ đất và lá khô để đối phương khó phát hiện.',
    },
    nay: {
      src: `${IMG}/mieng-ham-nay.webp`,
      text: 'Miệng hầm để ngỏ cho du khách quan sát; ở khu di tích, du khách còn có thể thử chui qua một nắp hầm.',
    },
  },
  'bep-hoang-cam': {
    id: 'bep-hoang-cam',
    name: 'Bếp Hoàng Cầm',
    short: 'Bếp Hoàng Cầm',
    icon: 'local_fire_department',
    xua: {
      src: `${IMG}/bep-hoang-cam-1968.webp`,
      text: 'Bếp đỏ lửa dưới lòng đất. Khói được chia nhỏ rồi tan dần sát mặt đất, nên máy bay địch không phát hiện được nơi nấu ăn.',
    },
    nay: {
      src: `${IMG}/bep-hoang-cam-nay.webp`,
      text: 'Gian bếp được phục dựng để du khách tìm hiểu cách nấu ăn không để lộ khói của bộ đội.',
    },
  },
  'phong-hop': {
    id: 'phong-hop',
    name: 'Phòng họp dưới lòng đất',
    short: 'Phòng họp',
    icon: 'groups',
    xua: {
      src: `${IMG}/phong-hop-1968.webp`,
      text: 'Nơi bàn kế hoạch tác chiến, trong đó có cuộc Tổng tiến công Tết Mậu Thân 1968. Dưới hầm, ánh sáng chỉ từ nến hay đèn pin.',
    },
    nay: {
      src: `${IMG}/phong-hop-nay.webp`,
      text: 'Phòng họp đã được phục dựng với bàn ghế, mô hình người và đèn điện cho khách tham quan.',
    },
  },
  'thong-hoi': {
    id: 'thong-hoi',
    name: 'Lỗ thông hơi ụ mối',
    short: 'Lỗ thông hơi',
    icon: 'air',
    xua: {
      src: `${IMG}/thong-hoi-1968.webp`,
      text: 'Lỗ thông hơi đưa không khí xuống hầm, được ngụy trang thành ụ mối giữa cây cỏ để địch không phát hiện.',
    },
    nay: {
      src: `${IMG}/thong-hoi-nay.webp`,
      text: 'Ụ mối thông hơi nằm ngay bên lối đi tham quan, có biển chỉ dẫn và mã QR thuyết minh.',
    },
  },
  'den-ham': {
    id: 'den-ham',
    name: 'Ánh sáng trong hầm',
    short: 'Ánh sáng',
    icon: 'light',
    xua: {
      src: `${IMG}/den-ham-1968.webp`,
      text: 'Hầm ẩm thấp, thiếu dưỡng khí; ánh sáng chỉ từ nến hay đèn pin.',
    },
    nay: {
      src: `${IMG}/den-ham-nay.webp`,
      text: 'Các đoạn hầm dành cho khách được nới rộng, gia cố và lắp đèn điện.',
    },
  },
}

export function isXuaNaySpot(v: string | null | undefined): v is XuaNaySpotId {
  return !!v && (XUA_NAY_SPOTS as readonly string[]).includes(v)
}
