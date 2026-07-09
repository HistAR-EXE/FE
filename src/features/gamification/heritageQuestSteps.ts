// src/features/gamification/heritageQuestSteps.ts
import type { AppMode } from '../../shared/context/modeContext'

export type QuestActionType =
    | 'artifact'
    | 'briefing'
    | 'dialogue'
    | 'reveal'
    | 'tour'
    | 'portal'
    | 'checkin'

export type QuestStepMeta = {
    unlockKey: string
    title: string
    /** One-line mission objective — what the player must DO */
    objective: string
    description: string
    hint?: string
    actionType: QuestActionType
    actionLabel: string
    /** Partial XP shown in UI (cosmetic; total reward from BE) */
    xpPartial?: number
    /** Chat quick prompt for dialogue steps */
    chatPrompt?: string
    /** Era for time portal steps */
    portalEra?: number
    /** Fallback thumbnail when catalog API unavailable */
    previewImage?: string
}

export type HeritageQuestMeta = {
    locationId: string
    city: string
    /** One-line hook for quest list cards */
    missionHook: string
    context: string
    badge: string
    difficulty: 'dễ' | 'trung bình' | 'thử thách'
    estimatedMinutes: number
    steps: QuestStepMeta[]
    checkinStep?: QuestStepMeta
}

const CHECKIN_STEP: QuestStepMeta = {
    unlockKey: 'checkin',
    title: 'Chứng nhận hiện trường',
    objective: 'Check-in QR + GPS tại khu di tích để khóa hành trình.',
    description: 'Bước cuối chỉ hoàn tất khi bạn có mặt tại địa đạo — giống “stamp” trong game AR.',
    hint: 'Mở màn hình quét QR gần cổng hoặc điểm hướng dẫn.',
    actionType: 'checkin',
    actionLabel: 'Kích hoạt GPS',
    xpPartial: 20,
}

/** Optional P2 bonus after heritage quest completes online (discovery trigger). */
const CHECKIN_BONUS_STEP: QuestStepMeta = {
    unlockKey: 'checkin-bonus',
    title: 'Thưởng onsite · Đã đến nơi',
    objective: 'Check-in QR + GPS tại di tích để nhận +25 XP và huy hiệu "Đã đến nơi".',
    description: 'Hoàn tất ba chương online rồi — ghé hiện trường để đóng dấu hành trình.',
    hint: 'Cần có mặt trong bán kính GPS của di tích.',
    actionType: 'checkin',
    actionLabel: 'Kích hoạt GPS',
    xpPartial: 20,
}

function mixedVisualPipeline(
    coverImage: string,
    ch1: {
        unlockKey: string
        title: string
        objective: string
        description: string
        hint?: string
        previewImage?: string
    },
    portal: {
        title: string
        objective: string
        description: string
        hint?: string
    },
    ch3: {
        unlockKey: string
        title: string
        objective: string
        description: string
        hint?: string
        actionLabel?: string
        previewImage?: string
    },
): QuestStepMeta[] {
    return [
        {
            unlockKey: ch1.unlockKey,
            title: ch1.title,
            objective: ch1.objective,
            description: ch1.description,
            hint: ch1.hint,
            actionType: 'artifact',
            actionLabel: 'Chiêm ngưỡng hiện vật',
            xpPartial: 20,
            previewImage: ch1.previewImage ?? coverImage,
        },
        {
            unlockKey: 'era:2026',
            title: portal.title,
            objective: portal.objective,
            description: portal.description,
            hint: portal.hint,
            actionType: 'portal',
            actionLabel: 'Mở Time Portal',
            xpPartial: 20,
            portalEra: 2026,
            previewImage: coverImage,
        },
        {
            unlockKey: ch3.unlockKey,
            title: ch3.title,
            objective: ch3.objective,
            description: ch3.description,
            hint: ch3.hint,
            actionType: 'artifact',
            actionLabel: ch3.actionLabel ?? 'Mở hiện vật cuối',
            xpPartial: 20,
            previewImage: ch3.previewImage ?? coverImage,
        },
    ]
}

/** Step metadata keyed by quest id (matches SQL seed). */
export const HERITAGE_QUEST_META: Record<string, HeritageQuestMeta> = {
    // CHIẾN DỊCH GỐC CỦ CHI
    '33333333-3333-3333-3333-333333333333': {
        locationId: '11111111-1111-1111-1111-111111111111',
        city: 'TP.HCM',
        missionHook: 'Lặn xuống lòng đất — từ bếp nấu đến phòng chỉ huy và cổng thời gian 1948.',
        context: 'Địa đạo Củ Chi — kháng chiến trong lòng đất, từ Bếp Hoàng Cầm đến chiến lược Tết Mậu Thân.',
        badge: 'Kỷ vật: Bản đồ Củ Chi',
        difficulty: 'thử thách',
        estimatedMinutes: 25,
        steps: [], // Các steps giờ đã được lấy tự động từ Backend API!
        checkinStep: CHECKIN_STEP,
    },

    // CHIẾN DỊCH MỚI 1: MẬT MÃ SA BÀN TÁC CHIẾN (Anh Ba)
    '33333333-3333-3333-3333-333333333334': {
        locationId: '11111111-1111-1111-1111-111111111111',
        city: 'TP.HCM',
        missionHook: 'Giải mã cấu trúc 3 tầng ngầm và nghệ thuật bẫy chông.',
        context: 'Tại Củ Chi, vũ khí thô sơ đã chiến thắng khí tài hiện đại. Hệ thống 3 tầng ngầm với bẫy chông kẹp nách và chiến thuật đánh du kích đã biến Củ Chi thành "Đất Thép thành đồng".',
        badge: 'Kỷ vật: Kìm Cắt Thép',
        difficulty: 'thử thách',
        estimatedMinutes: 20,
        steps: [],
    },

    // CHIẾN DỊCH MỚI 2: ÁNH SÁNG ĐÈN MÙ U (Chị Năm)
    '33333333-3333-3333-3333-333333333335': {
        locationId: '11111111-1111-1111-1111-111111111111',
        city: 'TP.HCM',
        missionHook: 'Sống lại cuộc sống sinh hoạt, y tế và giáo dục dưới lòng đất.',
        context: 'Dưới những lớp đất tối tăm, cuộc sống vẫn nảy mầm. Ánh sáng le lói từ chiếc đèn dầu mù u đã soi sáng những lớp học bình dân và trạm xá dã chiến.',
        badge: 'Kỷ vật: Đèn Mù U',
        difficulty: 'trung bình',
        estimatedMinutes: 15,
        steps: [],
    },

    '44444444-4444-4444-4444-444444444401': {
        locationId: '22222222-2222-2222-2222-222222222201',
        city: 'TP.HCM',
        missionHook: 'Rồng trên mái → Time Portal bến sông → vali mây — nhìn lịch sử như đang ở bến.',
        context: 'Bến Nhà Rồng — điểm khởi hành hành trình vạn dặm của người thanh niên Nguyễn Tất Thành.',
        badge: 'Hành khách lịch sử',
        difficulty: 'dễ',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/ben-nha-rong/cover.webp',
            {
                unlockKey: 'artifact:ben-nha-rong-rong-mai',
                title: 'Chương 1 · Hai con rồng trên mái',
                objective: 'Chiêm ngưỡng kiến trúc giao thoa Á Âu trên mái Nhà Rồng.',
                description: 'Lưỡng long chầu nguyệt hiện ra qua ảnh hiện vật số.',
                hint: 'Mở modal hiện vật và xem ảnh lớn.',
            },
            {
                title: 'Chương 2 · Time Portal bến sông',
                objective: 'So sánh ảnh xưa–nay tại Bến Nhà Rồng — tái hiện khoảnh khắc tàu Amiral (5/6/1911).',
                description: 'Time Portal cho bạn “nhìn thấy” bến cảng thay vì đọc đoạn văn dài.',
                hint: 'Chọn era hiện đại trên thanh thời gian và xem ít nhất một cảnh.',
            },
            {
                unlockKey: 'artifact:ben-nha-rong-vali-may',
                title: 'Chương 3 · Chiếc vali mây',
                objective: 'Khám phá hiện vật cuối — vali mây gợi nhớ hành trình 30 năm.',
                description: 'Hoàn tất hành trình bằng hiện vật kết.',
                actionLabel: 'Xem vali mây',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444402': {
        locationId: '22222222-2222-2222-2222-222222222202',
        city: 'Huế',
        missionHook: 'Tháp Phước Duyên → Time Portal sông Hương → bia đá trên lưng rùa.',
        context: 'Chùa Thiên Mụ — biểu tượng xứ Huế từ thời Chúa Nguyễn Hoàng.',
        badge: 'Tuần hành sông Hương',
        difficulty: 'dễ',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/chua-thien-mu/cover.webp',
            {
                unlockKey: 'artifact:chua-thien-mu-thap-phuoc-duyen',
                title: 'Chương 1 · Tháp Phước Duyên',
                objective: 'Chiêm ngưỡng tháp 7 tầng — biểu tượng xứ Huế.',
                description: 'Kiến trúc tháp hiện ra qua ảnh hiện vật.',
            },
            {
                title: 'Chương 2 · Time Portal sông Hương',
                objective: 'Xem không gian chùa và dòng Hương qua ảnh xưa–nay.',
                description: 'So sánh trực quan — không cần đọc hồ sơ dài.',
                hint: 'Vuốt hoặc chuyển cảnh trên Time Portal.',
            },
            {
                unlockKey: 'artifact:chua-thien-mu-bia-da',
                title: 'Chương 3 · Bia đá trên lưng rùa',
                objective: 'Khám phá bia Chúa Nguyễn Phúc Chu (1715).',
                description: 'Khóa hành trình sông Hương.',
                actionLabel: 'Xem bia đá',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444403': {
        locationId: '22222222-2222-2222-2222-222222222203',
        city: 'Ninh Bình',
        missionHook: 'Long Sàng đá → Time Portal kinh đô → đền Lê Đại Hành.',
        context: 'Cố đô Hoa Lư — kinh đô ba triều Đinh, Tiền Lê, Lý.',
        badge: 'Sứ giả kinh đô',
        difficulty: 'trung bình',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/co-do-hoa-lu/cover.jpeg',
            {
                unlockKey: 'artifact:co-do-hoa-lu-long-sang',
                title: 'Chương 1 · Long Sàng đá',
                objective: 'Chiêm ngưỡng Long Sàng — bảo vật quốc gia.',
                description: 'Rồng đá uốn lượn trong tủ sưu tập.',
            },
            {
                title: 'Chương 2 · Time Portal Hoa Lư',
                objective: 'So sánh kinh đô xưa và cảnh quan Hoa Lư ngày nay.',
                description: 'Lớp thị giác giữa chương hiện vật.',
            },
            {
                unlockKey: 'artifact:co-do-hoa-lu-den-le-dai-hanh',
                title: 'Chương 3 · Đền Lê Đại Hành',
                objective: 'Mở hiện vật đền vua đánh tan quân Tống.',
                description: 'Hoàn tất hành trình kinh đô.',
                actionLabel: 'Xem đền thờ',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444404': {
        locationId: '22222222-2222-2222-2222-222222222204',
        city: 'Hà Nội',
        missionHook: 'Móng cột cổ → Time Portal Thăng Long → ngói men xanh.',
        context: 'Hoàng Thành Thăng Long — Di sản UNESCO 2010.',
        badge: 'Sứ giả Thăng Long',
        difficulty: 'trung bình',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/hoang-thanh-thang-long/cover.webp',
            {
                unlockKey: 'artifact:hoang-thanh-thang-long-cot-co',
                title: 'Chương 1 · Móng cột cổ',
                objective: 'Nhìn tầng lịch sử Lý–Trần–Lê qua hiện vật khai quật.',
                description: 'Lớp đất đá dưới 18 Hoàng Diệu trong ảnh hiện vật.',
            },
            {
                title: 'Chương 2 · Time Portal Thăng Long',
                objective: 'So sánh Hoàng thành xưa và Hà Nội hiện đại.',
                description: 'Khai quật số — nhìn thay vì đọc.',
            },
            {
                unlockKey: 'artifact:hoang-thanh-thang-long-ngoi-phuong',
                title: 'Chương 3 · Ngói men xanh',
                objective: 'Xem gạch ngói hoàng cung thời Lý.',
                description: 'Khóa ba lớp di sản Thăng Long.',
                actionLabel: 'Xem ngói hoàng cung',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444405': {
        locationId: '22222222-2222-2222-2222-222222222205',
        city: 'Quảng Nam',
        missionHook: 'Chùa Cầu → Time Portal phố cổ → nhà Tấn Ký.',
        context: 'Phố cổ Hội An — giao thoa thương mại và di sản UNESCO.',
        badge: 'Thương nhân phố cổ',
        difficulty: 'dễ',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/pho-co-hoi-an/cover.webp',
            {
                unlockKey: 'artifact:pho-co-hoi-an-chua-cau',
                title: 'Chương 1 · Chùa Cầu',
                objective: 'Chiêm ngưỡng biểu tượng Hội An trên sông Thu Bồn.',
                description: 'Cầu chùa Nhật Bản qua ảnh hiện vật.',
            },
            {
                title: 'Chương 2 · Time Portal phố cổ',
                objective: 'Xem phố cổ và sông Thu Bồn qua ảnh xưa–nay.',
                description: 'Trải nghiệm thị giác giữa hai hiện vật.',
            },
            {
                unlockKey: 'artifact:pho-co-hoi-an-nha-co-tan-ky',
                title: 'Chương 3 · Nhà cổ Tấn Ký',
                objective: 'Mở hiện vật nhà gỗ hơn 200 năm.',
                description: 'Khóa hành trình thương nhân phố cổ.',
                actionLabel: 'Xem nhà cổ',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444406': {
        locationId: '22222222-2222-2222-2222-222222222206',
        city: 'Thanh Hóa',
        missionHook: 'Cổng Nam → Time Portal Tây Đô → gạch in chữ.',
        context: 'Thành Nhà Hồ — kiến trúc quân sự độc đáo thế kỷ XIV.',
        badge: 'Vệ binh Tây Đô',
        difficulty: 'trung bình',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/thanh-nha-ho/cover.webp',
            {
                unlockKey: 'artifact:thanh-nha-ho-cong-nam',
                title: 'Chương 1 · Cổng Nam',
                objective: 'Nhìn lối vào thành đá thời Hồ.',
                description: 'Kiến trúc quân sự trong tủ sưu tập.',
            },
            {
                title: 'Chương 2 · Time Portal Tây Đô',
                objective: 'So sánh thành đá xanh xưa và nay.',
                description: 'Thấy quy mô thành trì qua ảnh.',
            },
            {
                unlockKey: 'artifact:thanh-nha-ho-gach-tay-do',
                title: 'Chương 3 · Gạch in chữ Tây Đô',
                objective: 'Chiêm ngưỡng gạch cổ 600 năm.',
                description: 'Hoàn tất hành trình vệ binh Tây Đô.',
                actionLabel: 'Xem gạch cổ',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444407': {
        locationId: '22222222-2222-2222-2222-222222222207',
        city: 'Hà Nội',
        missionHook: 'Khuê Văn Các → Time Portal Văn Miếu → Hồ Thiên Quang.',
        context: 'Văn Miếu – Quốc Tử Giám — trường đại học đầu tiên Việt Nam.',
        badge: 'Môn sinh Quốc Tử',
        difficulty: 'dễ',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/van-mieu-quoc-tu-giam/cover.webp',
            {
                unlockKey: 'artifact:van-mieu-quoc-tu-giam-khue-van-cac',
                title: 'Chương 1 · Khuê Văn Các',
                objective: 'Chiêm ngưỡng biểu tượng văn học Hà Nội.',
                description: 'Gác vẻ đẹp sao Khuê qua ảnh hiện vật.',
            },
            {
                title: 'Chương 2 · Time Portal Văn Miếu',
                objective: 'Xem khuôn viên Văn Miếu qua ảnh xưa–nay.',
                description: 'Nối hiện vật bằng lớp không gian số.',
            },
            {
                unlockKey: 'artifact:van-mieu-quoc-tu-giam-ho-thien-quang',
                title: 'Chương 3 · Hồ Thiên Quang',
                objective: 'Mở hiện vật ao cá trong khuôn viên.',
                description: 'Khóa hành trình môn sinh Quốc Tử.',
                actionLabel: 'Xem hồ sen',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444408': {
        locationId: '22222222-2222-2222-2222-222222222208',
        city: 'Huế',
        missionHook: 'Ngọ Môn → Time Portal Đại Nội → Cửu Đỉnh.',
        context: 'Đại Nội Huế — trung tâm quyền lực, Di sản UNESCO.',
        badge: 'Sứ giả triều Nguyễn',
        difficulty: 'trung bình',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/dai-noi-hue/cover.webp',
            {
                unlockKey: 'artifact:dai-noi-hue-ngo-mon',
                title: 'Chương 1 · Ngọ Môn',
                objective: 'Chiêm ngưỡng cửa chính Đại Nội.',
                description: 'Quyền lực triều đình qua ảnh hiện vật.',
            },
            {
                title: 'Chương 2 · Time Portal Đại Nội',
                objective: 'So sánh kinh thành Huế xưa và nay.',
                description: 'Trục thiên tử hiện ra qua Time Portal.',
            },
            {
                unlockKey: 'artifact:dai-noi-hue-cuu-dinh',
                title: 'Chương 3 · Cửu Đỉnh',
                objective: 'Khám phá 9 chiếc đỉnh đồng — bảo vật quốc gia.',
                description: 'Hoàn tất hành trình sứ giả triều Nguyễn.',
                actionLabel: 'Xem Cửu Đỉnh',
            },
        ),
    },
    '44444444-4444-4444-4444-444444444409': {
        locationId: '22222222-2222-2222-2222-222222222209',
        city: 'Phú Thọ',
        missionHook: 'Trống đồng → Time Portal Nghĩa Lĩnh → cột đá thế.',
        context: 'Đền Hùng — truyền thuyết Lạc Long Quân và Âu Cơ.',
        badge: 'Con cháu Lạc Hồng',
        difficulty: 'dễ',
        estimatedMinutes: 12,
        steps: mixedVisualPipeline(
            '/media/heritage/den-hung-vuong/cover.webp',
            {
                unlockKey: 'artifact:den-hung-vuong-trong-dong',
                title: 'Chương 1 · Trống đồng Đông Sơn',
                objective: 'Chiêm ngưỡng hoa văn trống đồng.',
                description: 'Biểu tượng văn hóa Hùng Vương qua ảnh hiện vật.',
            },
            {
                title: 'Chương 2 · Time Portal Nghĩa Lĩnh',
                objective: 'Xem đỉnh núi và không gian Đền Hùng qua ảnh xưa–nay.',
                description: 'Cội nguồn dân tộc — nhìn thấy qua portal.',
            },
            {
                unlockKey: 'artifact:den-hung-vuong-cot-da-the',
                title: 'Chương 3 · Cột đá thế',
                objective: 'Mở hiện vật cột tưởng niệm trên Nghĩa Lĩnh.',
                description: 'Khóa hành trình về Đất Tổ.',
                actionLabel: 'Xem cột đá',
            },
        ),
    },
}

const ACTION_ICONS: Record<QuestActionType, string> = {
    artifact: 'view_in_ar',
    briefing: 'menu_book',
    dialogue: 'forum',
    reveal: 'auto_awesome',
    tour: '360',
    portal: 'history',
    checkin: 'my_location',
}

export function actionIcon(type: QuestActionType): string {
    return ACTION_ICONS[type] ?? 'flag'
}

export function stepActionLabel(step: QuestStepMeta, mode: AppMode | null): string {
    const online = mode !== 'offline'
    if (step.actionType === 'artifact') {
        return online ? 'Chiêm ngưỡng hiện vật' : 'Xem hiện vật số'
    }
    if (step.actionType === 'portal') {
        return online ? 'Mở Time Portal' : 'So sánh ảnh xưa–nay'
    }
    if (step.actionType === 'tour') {
        return online ? 'Vào tour 360°' : 'Khám phá không gian'
    }
    if (step.actionType === 'checkin') {
        return 'Kích hoạt GPS'
    }
    if (step.actionType === 'dialogue') {
        return step.actionLabel || 'Trò chuyện AI'
    }
    return step.actionLabel
}

export function resolveStepImage(
    step: QuestStepMeta,
    catalogImages?: Record<string, string>,
): string | undefined {
    const fromCatalog = catalogImages?.[step.unlockKey]
    if (fromCatalog) return fromCatalog
    return step.previewImage
}

export function getQuestSteps(questId: string, completionTrigger?: string | null): QuestStepMeta[] {
    const meta = HERITAGE_QUEST_META[questId]
    if (!meta) return []
    const steps = [...meta.steps]
    if (completionTrigger !== 'discovery' && meta.checkinStep) {
        steps.push(meta.checkinStep)
    }
    if (completionTrigger === 'discovery' && !meta.checkinStep) {
        steps.push(CHECKIN_BONUS_STEP)
    }
    return steps
}

export function stepHref(locationId: string, step: QuestStepMeta, questId?: string): string {
    if (step.actionType === 'checkin') {
        return `/scan?locationId=${locationId}`
    }
    if (step.actionType === 'artifact') {
        const params = new URLSearchParams({
            locationId,
            discoverKey: step.unlockKey,
        })
        return `/artifacts?${params}`
    }
    if (step.actionType === 'portal') {
        const era = step.portalEra ?? 2026
        return `/time-portal/${locationId}?era=${era}`
    }
    if (step.actionType === 'tour') {
        const panorama = step.unlockKey.startsWith('scene:') ? step.unlockKey.slice('scene:'.length) : ''
        return panorama
            ? `/tour/360/${locationId}?panorama=${encodeURIComponent(panorama)}`
            : `/tour/360/${locationId}`
    }
    if (step.actionType === 'briefing') {
        const params = new URLSearchParams({ questRecord: step.unlockKey })
        return `/explore/${locationId}?${params}`
    }
    if (step.actionType === 'dialogue') {
        const characterId = step.unlockKey.replace('dialogue:', '')
        const params = new URLSearchParams({ locationId, questRecord: step.unlockKey, persona: characterId })
        if (step.chatPrompt) params.set('questPrompt', step.chatPrompt)
        if (questId) params.set('questId', questId)
        return `/chat?${params}`
    }
    if (step.actionType === 'reveal') {
        const era = step.portalEra ?? 2026
        const params = new URLSearchParams({
            era: String(era),
            questRecord: step.unlockKey,
        })
        return `/time-portal/${locationId}?${params}`
    }
    return `/explore/${locationId}?questRecord=${encodeURIComponent(step.unlockKey)}`
}

export function isStepDone(
    step: QuestStepMeta,
    currentStep: number,
    stepIndex: number,
    status: string,
    hasCheckin?: boolean,
): boolean {
    if (step.actionType === 'checkin') return hasCheckin === true
    if (status === 'completed') return true
    return currentStep > stepIndex
}

/** @deprecated use actionType */
export type { QuestStepMeta as QuestStepMetaLegacy }