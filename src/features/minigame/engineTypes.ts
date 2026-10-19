// src/features/minigame/engineTypes.ts
// Hợp đồng chung giữa trang mini game và từng engine.

import type { MinigameAttemptBody, MinigameAttemptResult, MinigameEngine, MinigameHint, MinigameView } from './api'

export type SubmitBody = Omit<MinigameAttemptBody, 'levelId' | 'durationMs'>

export type SubmitOutcome =
    | { kind: 'pending'; hint: MinigameHint }
    | { kind: 'done'; result: MinigameAttemptResult }
    | { kind: 'error' }

export type GuideMood = 'happy' | 'surprised'

export type GuideLine = { text: string; mood?: GuideMood }

export type EngineProps = {
    view: MinigameView['view']
    /** Gửi lượt chơi. pending = chưa xong, có gợi ý; done = đã chấm. */
    submit: (body: SubmitBody) => Promise<SubmitOutcome>
    /** Engine gọi sau khi đã diễn xong khoảnh khắc thắng/thua để trang hiện kết quả. */
    onResolved: (result: MinigameAttemptResult) => void
    /** Cập nhật lời nhân vật dẫn. */
    say: (line: GuideLine) => void
}

export type Character = 'anh-ba' | 'chi-nam'

export type EngineMeta = {
    label: string
    icon: string
    character: Character
    howTo: string[]
    /** Ảnh minh hoạ màn giới thiệu khi engine không có ảnh trong level (hoặc ảnh là đáp án). */
    introImage: string
}

export const ENGINE_META: Record<MinigameEngine, EngineMeta> = {
    soi_nap: {
        label: 'Soi nắp hầm',
        icon: 'search',
        character: 'anh-ba',
        introImage: '/images/time-portal/site-hatch.jpg',
        howTo: [
            'Ảnh chụp thật lớp lá khô ở Củ Chi. Đâu đó có một nắp hầm.',
            'Chạm đúng chỗ nắp hầm trong 10 giây.',
            'Chạm hụt thì Anh Ba báo nóng hay lạnh. Hụt 3 lần là bị lộ.',
        ],
    },
    duong_khoi: {
        label: 'Đường khói',
        icon: 'air',
        character: 'chi-nam',
        introImage: '/images/xua-nay/bep-hoang-cam-1968.webp',
        howTo: [
            'Chạm vào một đoạn rãnh để xoay 90°.',
            'Nối khói từ bếp qua hầm chứa khói tới miệng thoát trên mặt đất.',
            'Không để khói rò ra ngoài. Xong càng nhanh càng nhiều sao.',
        ],
    },
    xep_tang: {
        label: 'Xếp tầng',
        icon: 'layers',
        character: 'anh-ba',
        introImage: '/images/cu-chi/so-do-ba-tang.jpg',
        howTo: [
            'Chọn một thẻ, rồi chạm vào tầng địa đạo phù hợp.',
            'Đặt đủ thẻ thì bấm Kiểm tra.',
            'Thẻ sai sẽ quay về khay. Sai càng ít càng nhiều sao.',
        ],
    },
    dao_gap: {
        label: 'Đào gặp nhau',
        icon: 'explore',
        character: 'anh-ba',
        introImage: '/images/time-portal/era-1975-mid.png',
        howTo: [
            'Đồng đội đang đào từ một giếng khác về phía bạn.',
            'Xoay hướng đào rồi bấm Đào. Trượt thì nghe tiếng cuốc để chỉnh.',
            'Gặp nhau ngay lần đầu được 3 sao. Tối đa 6 lần đào.',
        ],
    },
    im_lang: {
        label: 'Im lặng',
        icon: 'volume_off',
        character: 'chi-nam',
        introImage: '/images/cu-chi/du-kich-chien-dau.jpg',
        howTo: [
            'Lính tuần tra sắp đi ngang trên nắp hầm.',
            'Giữ im lặng trước micro, hoặc giữ nút, cho tới khi họ đi qua.',
            'Im lặng hoàn toàn qua micro được 3 sao. Giữ nút được 2 sao.',
        ],
    },
    san_co_vat: {
        label: 'Đếm lỗ thông hơi',
        icon: 'pin_drop',
        character: 'chi-nam',
        introImage: '/images/xua-nay/thong-hoi-nay.webp',
        howTo: [
            'Chạm vào ảnh để đánh dấu từng lỗ thông hơi bạn thấy.',
            'Chạm lại vào dấu để bỏ nếu đánh nhầm.',
            'Bấm Chốt khi đếm xong. Lệch 1 lỗ vẫn được 2 sao.',
        ],
    },
    phong_van: {
        label: 'Phỏng vấn nhân chứng',
        icon: 'mic',
        character: 'chi-nam',
        introImage: '/images/xua-nay/phong-hop-nay.webp',
        howTo: [
            'Đọc các chủ đề cần nhắc tới.',
            'Gõ hoặc nói câu trả lời của bạn.',
            'Nhắc đủ ba chủ đề được 3 sao.',
        ],
    },
}

export const CHARACTER_NAME: Record<Character, string> = {
    'anh-ba': 'Anh Ba',
    'chi-nam': 'Chị Năm',
}

export function characterFace(character: Character, mood: GuideMood = 'happy') {
    const suffix = mood === 'surprised' ? 'ngac-nhien' : 'vui'
    return `/images/characters/${character}-${suffix}.png`
}

/** "lid-2" → 2. Không đọc được thì null. */
export function levelNumber(levelId: string): number | null {
    const match = /(\d+)$/.exec(levelId)
    return match ? Number(match[1]) : null
}
