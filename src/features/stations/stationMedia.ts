// src/features/stations/stationMedia.ts
// Ảnh thật cho từng trạm (FE/public/images). Dùng cho trang trạm và thẻ chương trong "Hành trình 6 trạm".
// Video/soundscape R2 có thể chưa tải lên; trang trạm vẫn đủ nội dung nhờ ảnh + lời thuyết minh.

export type StationPhoto = { src: string; caption: string }

export type StationMedia = {
    hero: string
    gallery: StationPhoto[]
}

const CU_CHI: Record<string, StationMedia> = {
    ST01: {
        hero: '/images/cu-chi/tram-st01-phong-hop.jpg',
        gallery: [
            { src: '/images/cu-chi/tram-st01-phong-hop.jpg', caption: 'Mô hình cuộc họp dưới hầm tại khu di tích' },
            { src: '/images/xua-nay/phong-hop-nay.webp', caption: 'Phòng họp dưới lòng đất ngày nay' },
            { src: '/images/time-portal/era-1968-meeting.jpg', caption: 'Ảnh tư liệu: cuộc họp trong địa đạo' },
            { src: '/images/xua-nay/phong-hop-1968.webp', caption: 'Tranh tái hiện phòng họp năm 1968' },
        ],
    },
    ST02: {
        hero: '/images/time-portal/site-kitchen.jpg',
        gallery: [
            { src: '/images/time-portal/site-kitchen.jpg', caption: 'Bếp Hoàng Cầm tại khu di tích' },
            { src: '/images/xua-nay/bep-hoang-cam-1968.webp', caption: 'Tranh tái hiện bếp Hoàng Cầm' },
            { src: '/images/cu-chi/an-uong-duoi-ham.jpg', caption: 'Du khách ăn thử món ăn của cư dân địa đạo' },
            { src: '/images/cu-chi/khoai-mi.jpg', caption: 'Khoai mì chấm muối mè' },
            { src: '/images/cu-chi/coi-xay-thoc.jpg', caption: 'Cối xay thóc' },
        ],
    },
    ST03: {
        hero: '/images/cu-chi/tram-st03-gieng.jpg',
        gallery: [
            { src: '/images/cu-chi/tram-st03-gieng.jpg', caption: 'Miệng giếng trong khu di tích' },
            { src: '/images/xua-nay/thong-hoi-nay.webp', caption: 'Lỗ thông hơi ngụy trang thành ụ mối' },
            { src: '/images/xua-nay/thong-hoi-1968.webp', caption: 'Tranh tái hiện lỗ thông hơi' },
            { src: '/images/cu-chi/duong-ham.jpg', caption: 'Một đoạn đường hầm' },
        ],
    },
    ST04: {
        hero: '/images/cu-chi/tram-st04-quan-y.jpg',
        gallery: [
            { src: '/images/cu-chi/tram-st04-quan-y.jpg', caption: 'Mô hình khiêng thương binh bằng võng' },
            { src: '/images/time-portal/era-1968-surgery.jpg', caption: 'Ảnh tư liệu: ca mổ trong hầm' },
            { src: '/images/cu-chi/ham-giai-phau.jpg', caption: 'Hầm giải phẫu' },
            { src: '/images/xua-nay/den-ham-nay.webp', caption: 'Ánh đèn trong hầm' },
        ],
    },
    ST05: {
        hero: '/images/cu-chi/tram-st05-xuong-vu-khi.jpg',
        gallery: [
            { src: '/images/cu-chi/tram-st05-xuong-vu-khi.jpg', caption: 'Mô hình chế tạo vũ khí tại khu di tích' },
            { src: '/images/cu-chi/xuong-vu-khi-2.jpg', caption: 'Khu tái hiện xưởng vũ khí' },
            { src: '/images/cu-chi/xuong-vu-khi-3.jpg', caption: 'Tái hiện công việc trong xưởng' },
            { src: '/images/cu-chi/dkz.jpg', caption: 'Khu trưng bày vũ khí' },
            { src: '/images/cu-chi/vot-chong.jpg', caption: 'Mô hình vót chông tre' },
        ],
    },
    ST06: {
        hero: '/images/cu-chi/tram-st06-lo-chau-mai.jpg',
        gallery: [
            { src: '/images/cu-chi/tram-st06-lo-chau-mai.jpg', caption: 'Một lỗ châu mai tại địa đạo Củ Chi' },
            { src: '/images/cu-chi/ham-phong-thu-mai-la.jpg', caption: 'Hầm có mái lá ngụy trang' },
            { src: '/images/cu-chi/du-kich-chien-dau.jpg', caption: 'Ảnh phục dựng chiến sĩ du kích trong tư thế chiến đấu' },
            { src: '/images/cu-chi/ham-chong.jpg', caption: 'Hầm chông' },
            { src: '/images/cu-chi/xe-tang.jpg', caption: 'Xe tăng trưng bày tại khu di tích' },
        ],
    },
}

const MEDIA: Record<string, Record<string, StationMedia>> = {
    'cu-chi': CU_CHI,
}

export function stationMedia(siteCode: string, stationCode: string): StationMedia | null {
    return MEDIA[siteCode.trim().toLowerCase()]?.[stationCode.trim().toUpperCase()] ?? null
}

/** "Một ngày dưới lòng đất – Chương 1: Rạng sáng ở Phòng họp" → "Rạng sáng ở Phòng họp". */
export function shortChapterTitle(title: string): string {
    const match = /Chương\s*\d+\s*:\s*(.+)$/i.exec(title)
    return match ? match[1].trim() : title
}

/** Tên chuỗi truyện, ví dụ "Một ngày dưới lòng đất". */
export function storySeriesName(title: string | undefined): string | null {
    if (!title) return null
    const match = /^(.+?)\s*[–-]\s*Chương\s*\d+/i.exec(title)
    return match ? match[1].trim() : null
}
