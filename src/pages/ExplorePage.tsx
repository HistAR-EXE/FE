import { ExploreVideoLibrary } from '../features/explore/ExploreVideoLibrary'
import { ExploreLoading } from '../features/explore/ExploreLoading'
import { MAX_VIDEO_XP, videoCompletionCount, videoRewardTotal } from '../features/explore/videoState'
// src/pages/ExplorePage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { type ProfileMe } from '../features/profile/api'
import { questRecordFromSearch, recordQuestStepEngagement } from '../features/gamification/questEngagement'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { resolveMediaUrl } from '../shared/config/env'
import { exploreApi, type ExploreBadgeProgress, type ExploreSnapshot } from '../features/explore/api'
import { HERITAGE_BADGES, type HeritageBadge } from '../features/explore/heritageBadges'
import { ApiError } from '../shared/api/contracts'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { emitEvent } from '../lib/pilotEvents'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import mascotImg from '../assets/mascot.png'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildChatPath, saveSelectedLocationId } from '../features/chat/chatRoute'
import { useAppMode } from '../shared/context/useAppMode'

// ============================================================================
// PHẦN 1: KIỂU DỮ LIỆU ĐỒNG BỘ BACKEND, KHO SỬ LIỆU & HUY HIỆU
// ============================================================================
type StoryCategory = 'all' | 'architecture' | 'tactics' | 'daily_life' | 'perspective'

interface DepthLayerInfo {
    id: string
    discoveryKey: string
    quizKey: string
    depthLabel: string
    title: string
    subtitle: string
    temp: string
    tempSub?: string
    oxygen: string
    oxygenSub?: string
    bombResistance: string
    structures: string[]
    secretFact: string
    colorAccent: string
    xp: number
    image: string
    aiPrompt: string
    quiz: {
        question: string
        options: string[]
        failMessage: string
    }
}

interface CipherItem {
    id: string
    discoveryKey: string
    codeName: string
    date: string
    location: string
    difficulty: 'Dễ' | 'Trung bình' | 'Khó'
    xpReward: number
    encryptedPreview: string
    riddleQuestion: string
    hint: string
    options: string[]

    decryptedContent: string
    historicalNote: string
}

interface StoryDossier {
    id: string
    discoveryKey: string
    code: string
    title: string
    category: StoryCategory
    categoryLabel: string
    readTime: string
    xp: number
    image: string
    fallbackImage: string
    summary: string
    contextStory: string
    technicalAnatomy: string[]
    witnessQuote: {
        quote: string
        author: string
        role: string
    }
    quickQuiz: {
        question: string
        options: string[]

        explanation: string
    }
}

interface EvidenceClue {
    code: string
    discoveryKey: string
    title: string
    sourceCitation: string
    typeLabel: string
    icon: string
    summary: string
    detailFinding: string
    xp: number
}


const CONCLUSION_DISCOVERY_KEY = 'investigation:cu-chi-conclusion'

// ============================================================================
// PHẦN 2: DỮ LIỆU MẶT CẮT 4 TẦNG ĐỘ SÂU ĐỊA ĐẠO CỦ CHI (60 XP)
// ============================================================================
const DEPTH_LAYERS: DepthLayerInfo[] = [
    {
        id: 'surface',
        discoveryKey: 'depth:surface',
        quizKey: 'depth_quiz:surface',
        depthLabel: '0m · Mặt Đất',
        title: 'Tầng Ngụy Trang & Vành Đai Bẫy Chiến Thuật',
        subtitle: 'Rừng chồi, ụ mối thông hơi và trận địa chông mìn thiên la địa võng',
        temp: '32°C – 36°C',
        oxygen: '100%',
        oxygenSub: 'Tự nhiên',
        bombResistance: 'Chịu càn quét bộ binh & xe tăng',
        structures: [
            'Nắp hầm bí mật ngụy trang lá mục & cỏ dại',
            'Ụ mối nhân tạo chứa ống thông hơi tre vát nghiêng',
            'Trận địa 8 loại hầm chông & mìn gạt chống tăng',
            'Lỗ châu mai chiến đấu ẩn sát gốc cây',
        ],
        secretFact:
            'Du kích Củ Chi rải tiêu bột và ớt cay quanh các ụ mối thông hơi để làm mất khứu giác của đội chó nghiệp vụ Berger của quân đội Mỹ.',
        colorAccent: 'from-emerald-600 to-teal-700',
        xp: 15,
        image: '/depth/layer-0.png',
        aiPrompt: 'Làm sao du kích Củ Chi có thể đánh lừa khứu giác của chó nghiệp vụ Berger Mỹ bằng tiêu và ớt bột?',
        quiz: {
            question: 'Du kích Củ Chi đã xử lý thế nào để đội chó Berger của Mỹ không thể đánh hơi thấy mùi người từ các lỗ thông hơi ngầm?',
            options: [
                'Trồng rất nhiều hoa rừng có mùi hương nồng quanh miệng hầm',
                'Rắc tiêu bột và ớt cay quanh các ụ mối thông hơi để làm tê liệt khứu giác chó săn',
                'Dùng quạt gió cơ học thổi ngược mùi hơi người xuống đáy giếng sâu',
                'Đốt lá khuynh diệp khô suốt ngày đêm bên dưới miệng ống thông khí',
            ],

            failMessage: 'Rất tiếc! Du kích đã dùng hạt tiêu và ớt bột rải quanh lỗ thông hơi khiến chó nghiệp vụ Berger bị sặc và mất khả năng đánh mùi.',
        },
    },
    {
        id: 'layer1',
        discoveryKey: 'depth:layer1',
        quizKey: 'depth_quiz:layer1',
        depthLabel: '-3m đến -4m · Tầng 1',
        title: 'Tầng Chiến Đấu Cơ Động & Sinh Hoạt Dã Chiến',
        subtitle: 'Tuyến xương sống kết nối các ấp chiến đấu và bếp ăn không khói',
        temp: '28°C – 30°C',
        oxygen: '85%',
        oxygenSub: 'Thông qua ống tre',
        bombResistance: 'Chống đạn pháo 105mm & sức ép xe tăng M41',
        structures: [
            'Bếp Hoàng Cầm với rãnh tản khói ngầm 3 ngăn',
            'Hầm hội họp, hầm chiếu phim và văn nghệ',
            'Xưởng cưa bom, chế tạo vũ khí tự tạo',
            'Các nút chặn chữ Z triệt tiêu sóng xung kích lựu đạn',
        ],
        secretFact:
            'Đường hầm được đào lắt léo theo hình chữ Z để khi đối phương ném lựu đạn hoặc bắn thẳng xuống, mảnh đạn và khí độc bị chặn lại ở góc cua đầu tiên.',
        colorAccent: 'from-[#0275FB] to-[#015CC8]',
        xp: 15,
        image: '/depth/layer-1.png',
        aiPrompt: 'Chrono hãy giải thích chi tiết cấu tạo "nút chặn chữ Z" giúp địa đạo chống lại sức ép của lựu đạn ném xuống hầm?',
        quiz: {
            question: 'Tại sao các nhánh đường hầm ở Tầng 1 lại được thiết kế gập khúc theo hình chữ Z thay vì đào thẳng tắp?',
            options: [
                'Để tiết kiệm công sức đào xuyên qua các mạch đá ngầm',
                'Ngăn cản sóng xung kích, mảnh văng lựu đạn và đường đạn bắn thẳng truyền sâu vào hầm',
                'Để chứa được nhiều lương thực và vũ khí hơn dọc hai bên vách hầm',
                'Để tạo độ dốc cho nước mưa tự chảy ngược lên mặt đất',
            ],

            failMessage: 'Rất tiếc! Cấu trúc chữ Z giúp triệt tiêu sóng xung kích và chặn đứng mảnh văng lựu đạn ngay tại góc cua đầu tiên.',
        },
    },
    {
        id: 'layer2',
        discoveryKey: 'depth:layer2',
        quizKey: 'depth_quiz:layer2',
        depthLabel: '-6m đến -8m · Tầng 2',
        title: 'Tầng Trú Ẩn, Y Tế & Chỉ Huy Chiến Dịch',
        subtitle: 'Không gian sinh tồn qua những đợt rải thảm bom B-52 khốc liệt',
        temp: '26°C – 28°C',
        oxygen: '65%',
        oxygenSub: 'Hạn chế thắp đèn dầu',
        bombResistance: 'Chịu được bom tấn & bom khoan cỡ vừa',
        structures: [
            'Hầm giải phẫu dã chiến thắp sáng bằng dynamo xe đạp',
            'Kho dự trữ lương thực (khoai mì, gạo sấy, muối mè)',
            'Hầm nghỉ ngơi của thương binh, phụ nữ và trẻ em',
            'Nắp hầm ngầm bẫy nước chống khí độc CS',
        ],
        secretFact:
            'Khi quân Mỹ bơm khí độc vào đường hầm, du kích sử dụng các "nút chặn bẫy nước" (giống nguyên lý ống siphon) và chăn thấm nước vôi để lọc độc ngay giữa tầng 1 và tầng 2.',
        colorAccent: 'from-amber-500 to-orange-600',
        xp: 15,
        image: '/depth/layer-2.png',
        aiPrompt: 'Cơ chế hoạt động của bẫy nước (water-trap) dưới địa đạo Củ Chi giúp chống lại khí độc CS của Mỹ như thế nào?',
        quiz: {
            question: 'Biện pháp sáng tạo nào đã được sử dụng tại Tầng 2 để cô lập khí độc CS khi đối phương bơm vào hầm ngầm?',
            options: [
                'Thiết kế nút chặn "bẫy nước" (nguyên lý siphon) kết hợp chăn thấm nước vôi lọc độc',
                'Trang bị mặt nạ phòng độc công nghiệp cho toàn bộ thương binh và dân thường',
                'Khoét nhiều lỗ thông hơi lớn thẳng lên mặt đất để gió tự thổi bay khí độc',
                'Đốt củi khô tại các ngã ba hầm để đẩy luồng khí độc ngược ra ngoài',
            ],

            failMessage: 'Rất tiếc! Du kích đã thiết kế các đoạn hầm trũng chứa nước ("nắp bẫy nước" giống ống siphon) và chăn thấm nước vôi để chặn đứng khí độc CS.',
        },
    },
    {
        id: 'layer3',
        discoveryKey: 'depth:layer3',
        quizKey: 'depth_quiz:layer3',
        depthLabel: '-10m đến -12m · Tầng 3',
        title: 'Tầng Đáy Sinh Tồn & Lối Thoát Ra Sông Sài Gòn',
        subtitle: 'Thành trì cuối cùng nằm sâu trong lòng đất sét pha đá ong cứng như thép',
        temp: '24°C – 26°C',
        tempSub: 'Độ ẩm >90%',
        oxygen: '45% – 50%',
        oxygenSub: 'Rất loãng',
        bombResistance: 'An toàn trước bom rải thảm B-52',
        structures: [
            'Giếng nước ngầm cung cấp nước uống cho toàn khu',
            'Hầm trú ẩn tối mật của Bộ Tư Lệnh và Khu Ủy',
            'Ngách thoát hiểm bí mật thông thẳng ra bờ sông Sài Gòn',
        ],
        secretFact:
            'Ở độ sâu hơn 10m, đất sét đá ong Củ Chi kết dính bền vững đến mức không cần bất kỳ trụ bê tông hay gỗ chống đỡ nào mà vẫn không sập suốt hàng chục năm.',
        colorAccent: 'from-indigo-700 to-slate-900',
        xp: 15,
        image: '/depth/layer-3.png',
        aiPrompt: 'Tại sao đất sét pha đá ong ở Củ Chi lại có khả năng tự chịu lực kỳ diệu mà không cần đổ bê tông gia cố?',
        quiz: {
            question: 'Yếu tố địa chất nào ở độ sâu 10m–12m giúp vách địa đạo Củ Chi đứng vững hàng chục năm mà không cần trụ bê tông?',
            options: [
                'Bên dưới lòng đất Củ Chi là một phiến đá hoa cương nguyên khối',
                'Sử dụng hỗn hợp nhựa cây rừng trộn với cát sông Sài Gòn để trát vách',
                'Đặc tính đất sét pha đá ong kết dính cực cao, khi tiếp xúc không khí trong hầm thì cứng như gạch nung',
                'Hệ thống cọc sắt được đóng dày đặc dọc theo toàn bộ 250km đường hầm',
            ],

            failMessage: 'Rất tiếc! Chính kết cấu tự nhiên của đất sét pha đá ong (laterite) kết hợp trần hầm vát hình vòm đã tạo nên độ bền tự chịu lực kỳ diệu.',
        },
    },
]

// ============================================================================
// PHẦN 3: DỮ LIỆU 3 MẬT THƯ CHIẾN KHU (225 XP)
// ============================================================================
const SECRET_CIPHERS: CipherItem[] = [
    {
        id: 'cipher_hoang_cam',
        discoveryKey: 'cipher:hoang-cam',
        codeName: 'MẬT LỆNH SỐ 19-HC',
        date: '14/02/1967',
        location: 'Phân khu Bến Dược — Tầng 1',
        difficulty: 'Dễ',
        xpReward: 50,
        encryptedPreview:
            'Tuyệt đối không để máy bay trinh sát L-19 phát hiện vị trí đóng quân. Khi nấu cơm ban ngày, phải dẫn khói qua [████████████] phủ lá tươi và đất ẩm để khói tan thành hơi sương...',
        riddleQuestion:
            'Để máy bay trinh sát không phát hiện khói bếp bốc lên giữa rừng, hệ thống Bếp Hoàng Cầm đã xử lý khói bằng nguyên lý nào?',
        hint: 'Khói nóng bốc cao, nhưng khi đi qua hệ thống rãnh dài phủ đất ẩm và lá tươi thì nhiệt độ khói giảm xuống.',
        options: [
            'Dùng quạt gió thổi khói ngược xuống đáy giếng sâu 12m',
            'Dẫn khói qua các rãnh ngầm phủ cành lá tươi và đất ẩm làm nguội khói thành làn sương mỏng là là mặt đất',
            'Đốt than đá công nghiệp nhập khẩu hoàn toàn không sinh khói',
        ],

        decryptedContent:
            'TOÀN VĂN MẬT LỆNH: "Các tiểu đội hậu cần khi nổi lửa nấu ăn ban ngày bắt buộc sử dụng bếp 3 rãnh tản khói Hoàng Cầm. Rãnh dẫn khói phải dài tối thiểu 5m, lót cành cây tươi và phủ một lớp đất mỏng tưới ẩm. Khói đi qua đất ẩm sẽ nguội dần, nặng hơn không khí và chỉ tỏa ra như sương mù nhẹ sát mặt đất, máy bay trinh sát bay ngay trên ngọn cây cũng không thể phát hiện."',
        historicalNote:
            'Bếp mang tên anh nuôi Hoàng Cầm (ra đời từ chiến dịch Hòa Bình 1951–1952) và được quân dân Củ Chi cải tiến kết hợp ống dẫn khói ngầm cực kỳ tinh vi.',
    },
    {
        id: 'cipher_two_wells',
        discoveryKey: 'cipher:two-wells',
        codeName: 'MẬT THƯ KỸ THUẬT 68-ĐH',
        date: '05/08/1966',
        location: 'Căn cứ Khu Ủy Sài Gòn - Gia Định',
        difficulty: 'Trung bình',
        xpReward: 75,
        encryptedPreview:
            'Để đẩy nhanh tốc độ đào đường hầm trục chính mà không cần la bàn hiện đại dưới lòng đất tối đen, hai tổ đào hầm từ hai giếng cách nhau 10m sẽ định hướng gặp nhau bằng [████████████]...',
        riddleQuestion:
            'Trong lòng đất tối đen và không có thiết bị trắc địa, làm sao hai tổ du kích đào từ hai giếng khác nhau có thể đục thông nhau chính xác?',
        hint: 'Họ sử dụng sự truyền âm thanh trong lòng đất sét cứng kết hợp với cọc tiêu trên mặt đất.',
        options: [
            'Định hướng bằng tiếng gõ cuốc thuổng vang qua vách đất kết hợp đo dây dọi và cọc ngắm từ miệng giếng',
            'Sử dụng máy bộ đàm sóng ngắn đo khoảng cách điện từ',
            'Đào theo mạch nước ngầm tự nhiên chảy giữa hai giếng',
        ],

        decryptedContent:
            'TOÀN VĂN MẬT THƯ: "Mỗi tổ 3 người đào một giếng thẳng đứng xuống độ sâu quy định, sau đó dùng cọc tiêu trên mặt đất và dây dọi để lấy hướng ban đầu. Khi hai mũi đào tiến lại gần nhau khoảng vài mét, hai bên dùng cán cuốc gõ nhịp vào vách đất cứng và áp tai nghe độ vang để điều chỉnh hướng đục thông chính xác tuyệt đối."',
        historicalNote:
            'Với phương pháp đào "nhiều giếng cùng lúc" và dùng đất đổ xuống các hố bom B-52 để phi tang dấu vết, hơn 250km địa đạo đã được kiến tạo chỉ bằng cuốc lưỡi cùn và ki xúc đất đan bằng tre.',
    },
    {
        id: 'cipher_sandals',
        discoveryKey: 'cipher:sandals',
        codeName: 'MẬT LỆNH TRINH SÁT 07-DR',
        date: '22/11/1968',
        location: 'Vành đai Trảng Lớn — Củ Chi',
        difficulty: 'Khó',
        xpReward: 100,
        encryptedPreview:
            'Khi giao liên và trinh sát vượt qua bãi đất trống gần đồn bốt địch, bắt buộc phải mang [████████████] để đánh lừa hướng truy kích của toán thám báo...',
        riddleQuestion:
            'Bí mật của đôi "Dép râu Củ Chi" chuyên dùng cho trinh sát khi đi qua vùng đất cát hoặc bùn lầy gần đồn địch là gì?',
        hint: 'Hãy chú ý đến vị trí của phần mũi dép và gót dép so với quai dép.',
        options: [
            'Đế dép được gắn lò xo giúp nhảy xa 3 mét không để lại dấu chân',
            'Đế dép được thiết kế phần gót ở phía trước và phần mũi ở phía sau để tạo dấu chân ngược hướng di chuyển thực tế',
            'Đế dép làm bằng vỏ cây thông tự xóa dấu vết sau 5 phút',
        ],

        decryptedContent:
            'TOÀN VĂN MẬT LỆNH: "Các tổ giao liên mật khi băng qua đường mòn đất cát phải sử dụng loại dép cao su đóng quai ngược (gót dép nằm ở mũi bàn chân). Khi ta đi vào căn cứ, dấu chân in trên đất sẽ chỉ hướng đi ra ngoài, khiến toán thám báo địch phán đoán sai hoàn toàn hướng rút quân của đơn vị."',
        historicalNote:
            'Đôi dép cao su (dép râu) cắt từ lốp xe quân sự hỏng không chỉ bền bỉ mà còn trở thành công cụ nghi binh tâm lý chiến độc đáo tại Củ Chi.',
    },
]

// ============================================================================
// PHẦN 4: DỮ LIỆU BÀN ĐIỀU TRA CHỨNG CỨ LỊCH SỬ (130 XP + 100 XP KẾT LUẬN)
// ============================================================================
const INVESTIGATION_CLUES: EvidenceClue[] = [
    {
        code: 'EV-01',
        discoveryKey: 'clue:ev-01',
        title: 'Vết cắt vát chữ V trên miệng nắp hầm gỗ sao',
        sourceCitation: 'Hồ sơ hiện vật Bảo tàng Địa đạo Củ Chi · Mã HV-1967-04',
        typeLabel: 'Quan sát hiện trường',
        icon: 'visibility',
        summary: 'Tại sao nắp hầm Củ Chi không đóng vuông góc 90 độ mà luôn vát nghiêng hình nêm?',
        detailFinding:
            'Miệng nắp hầm được vát nghiêng 45 độ như nút chai. Sức nặng của xe tăng hoặc bước chân đi phía trên càng đè xuống thì nắp gỗ càng khít chặt vào khung đất đá ong, không bao giờ bị sập lọt xuống dưới.',
        xp: 30,
    },
    {
        code: 'EV-02',
        discoveryKey: 'clue:ev-02',
        title: 'Ống thông hơi tre đục thông qua ụ mối tự nhiên',
        sourceCitation: 'Tài liệu Kỹ thuật Công binh Khu Sài Gòn - Gia Định (1966)',
        typeLabel: 'Đối chiếu cấu trúc',
        icon: 'compare',
        summary: 'Làm sao hàng trăm chiến sĩ thở dưới độ sâu 8m mà đối phương đi càn phía trên không phát hiện lỗ thông khí?',
        detailFinding:
            'Ống thông hơi được khoét xuyên qua các ụ mối đất tự nhiên và hướng miệng ống về phía đón gió. Phía dưới miệng ống có bẫy ngăn lựu đạn: nếu địch thả lựu đạn xuống lỗ thông hơi, viên đạn sẽ lăn sang hố phụ chứ không rơi vào hầm chính.',
        xp: 30,
    },
    {
        code: 'EV-03',
        discoveryKey: 'clue:ev-03',
        title: 'Bản đồ hành quân Chiến dịch Crimp của Sư đoàn 25 Mỹ',
        sourceCitation: 'Báo cáo Giải mật Lầu Năm Góc · Tháng 01/1966',
        typeLabel: 'So sánh sử liệu đối phương',
        icon: 'fact_check',
        summary: 'Đối chiếu nhật ký tác chiến của Sư đoàn 25 Mỹ với sơ đồ hầm ngầm của xã Nhuận Đức.',
        detailFinding:
            'Báo cáo của Mỹ ghi nhận các đợt pháo kích và khói mù hóa học bị chặn đứng sau 15 mét đường hầm đầu tiên. Nguyên nhân chính là hệ thống nút chặn chữ Z và nắp bẫy nước (water-trap) do du kích thiết lập giữa các phân khu.',
        xp: 30,
    },
    {
        code: 'EV-04',
        discoveryKey: 'clue:ev-04',
        title: 'Bố cục "Liên hoàn ấp" nối thông ra sông Sài Gòn',
        sourceCitation: 'Bản vẽ Mặt cắt Địa đạo Bến Dược – Bến Đình (1968)',
        typeLabel: 'Ghép bản đồ · Timeline',
        icon: 'timeline',
        summary: 'Giải mã lý do vì sao bao vây một ấp tại Củ Chi không bao giờ cô lập được lực lượng bên dưới.',
        detailFinding:
            'Hệ thống địa đạo không phải là các hầm rời rạc mà có một "đường trục xương sống" chạy xuyên qua nhiều ấp và thông thẳng ra bờ sông Sài Gòn ở tầng 3, cho phép rút quân bằng đường thủy trong đêm tối.',
        xp: 40,
    },
]

// ============================================================================
// PHẦN 5: KHO LƯU TRỮ 6 HỒ SƠ "MẢNH CHUYỆN ĐẤT THÉP" (615 XP)
// ============================================================================
const STORY_DOSSIERS: StoryDossier[] = [
    {
        id: 'dossier_architecture',
        discoveryKey: 'dossier:architecture',
        code: 'HS-01 · KIẾN TRÚC NGẦM',
        title: 'Giải Mã Kỳ Quan 250km "Thành Phố Ngầm" Không Cần Xi Măng',
        category: 'architecture',
        categoryLabel: 'Kiến trúc Ngầm',
        readTime: '4 phút đọc',
        xp: 100,
        image: '/media/cu-chi/hotspots/sa-ban-3d.jpg',
        fallbackImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        summary:
            'Làm thế nào một mạng lưới đường hầm dài hơn 250km, chằng chịt như mạng nhện với 3 tầng sâu lại có thể đứng vững trước hàng vạn tấn bom rải thảm mà không có một thanh sắt hay bao xi măng nào?',
        contextStory:
            'Bắt đầu từ những năm 1948 trong kháng chiến chống Pháp với những đoạn hầm ngắn ẩn nấp, đến giai đoạn 1961–1968, quân và dân Củ Chi đã phát triển hệ thống địa đạo thành một "thành phố ngầm" liên hoàn nối liền các xã từ Tân Phú Trung đến Bến Dược. Điểm kỳ diệu nhất nằm ở địa chất vùng đất Củ Chi: lớp đất sét pha đá ong (laterite) nằm ở độ sâu từ 3m trở xuống có đặc tính mềm khi ẩm nhưng khi tiếp xúc với không khí trong lòng hầm lại kết tảng cứng như gạch nung.',
        technicalAnatomy: [
            'Kích thước lòng hầm cực hẹp: Rộng chỉ từ 0.5m – 0.8m, cao 0.8m – 1.2m, vừa vặn cho vóc dáng nhỏ nhắn của người Việt nhưng là cơn ác mộng với lính Mỹ cao lớn.',
            'Cấu trúc vòm cuốn tự chịu lực: Trần hầm được vát cong hình vòm giúp phân tán áp lực sóng xung kích từ bom nổ phía trên sang hai bên vách đất.',
            'Hệ thống nút chặn đa tầng: Giữa các tầng đều có nắp gỗ lim hoặc bẫy sập kín khít, có thể cô lập ngay lập tức một đoạn hầm nếu bị địch phát hiện hoặc bơm khí độc.',
        ],
        witnessQuote: {
            quote: 'Chỉ với chiếc cuốc cùn cán ngắn bằng gang tay và chiếc ki đan bằng tre, mỗi người dân từ cụ già đến em nhỏ đều nhận chỉ tiêu đào từ 1 đến 2 mét hầm mỗi ngày.',
            author: 'Tư liệu Bảo tàng Địa đạo Củ Chi',
            role: 'Hồ sơ Lịch sử Kháng chiến',
        },
        quickQuiz: {
            question: 'Yếu tố tự nhiên nào giúp vách hầm Củ Chi đứng vững hàng chục năm mà không cần bê tông cốt thép?',
            options: [
                'Lớp đá hoa cương nguyên khối dưới lòng đất',
                'Kết cấu đất sét pha đá ong tự kết dính cứng như gạch kết hợp thiết kế trần hầm hình vòm',
                'Hệ thống rễ cây cổ thụ đan kín tới độ sâu 12m',
            ],

            explanation:
                'Đất sét pha đá ong ở Củ Chi có độ kết dính cực cao, cộng với thiết kế trần vòm giúp phân tán lực chấn động của bom pháo.',
        },
    },
    {
        id: 'dossier_trap_warfare',
        discoveryKey: 'dossier:trap-warfare',
        code: 'HS-02 · SÁNG CHẾ QUÂN SỰ',
        title: 'Nghệ Thuật Biến Bom Đạn Thành Trận Địa Chông Mìn Tự Tạo',
        category: 'tactics',
        categoryLabel: 'Sáng chế Quân sự',
        readTime: '5 phút đọc',
        xp: 120,
        image: '/media/cu-chi/hotspots/khi-tai.jpg',
        fallbackImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
        summary:
            'Từ những quả bom câm chưa nổ và mảnh vỏ máy bay, những "công binh chân đất" tại Củ Chi đã cưa bom lấy thuốc nổ, chế tạo ra hàng chục loại mìn gạt và bẫy chông biến thiên khôn lường.',
        contextStory:
            'Trong các cuộc hành quân càn quét lớn như Crimp (1966) và Cedar Falls (1967), quân đội Mỹ đã trút xuống Củ Chi hàng trăm ngàn tấn bom đạn. Khoảng 5% đến 10% số bom đạn đó không phát nổ. Thay vì khiếp sợ, các chiến sĩ công xưởng Củ Chi đã thu gom bom câm, dùng cưa tay vừa cưa vừa nhỏ nước làm mát để lấy thuốc nổ TNT, kết hợp với sắt thép phế liệu để đúc thành mìn gạt chống tăng — thứ vũ khí đã làm tê liệt chiếc xe tăng M41 ngay tại Bến Dược.',
        technicalAnatomy: [
            'Hầm chông xoay & Chông kẹp nách: Khi giẫm lên nắp ván ngụy trang, trục xoay lật úp làm hai hàng chông sắt khép chặt lại theo nguyên lý đòn bẩy một chiều.',
            'Mìn gạt chống tăng Tô Hoài Đức: Tận dụng thuốc nổ từ bom câm nhồi vào vỏ bình dưỡng khí máy bay, điểm nổ bằng kíp điện hoặc dây gạt ngụy trang bằng nhánh cây rừng.',
            'Tổ hợp bẫy liên hoàn: Nắp hầm giả thường được gài mìn; nếu đối phương phá nắp hầm bằng thuốc nổ, sức ép sẽ kích hoạt bẫy thứ hai ngay bên cạnh.',
        ],
        witnessQuote: {
            quote: 'Mỗi gốc cây, mỗi ụ mối, mỗi bước chân trên mặt đất Củ Chi đều có thể là một mắt thần hoặc một cái bẫy được tính toán đến từng centimet.',
            author: 'Anh hùng LLVT Tô Hoài Đức',
            role: 'Kiến trúc sư trưởng các loại mìn tự tạo Củ Chi',
        },
        quickQuiz: {
            question: 'Nguồn nguyên liệu thuốc nổ chính để công xưởng Củ Chi chế tạo mìn chống tăng lấy từ đâu?',
            options: [
                'Cưa thủ công những quả bom, đạn pháo của đối phương ném xuống nhưng chưa phát nổ',
                'Khai thác lưu huỳnh tự nhiên dưới tầng đáy địa đạo',
                'Vận chuyển bằng tàu ngầm từ biển Đông vào sông Sài Gòn',
            ],

            explanation:
                'Du kích và công nhân quân giới Củ Chi đã dũng cảm thu gom hàng ngàn quả bom câm chưa nổ để cưa lấy thuốc nổ TNT và vỏ thép.',
        },
    },
    {
        id: 'dossier_underground_life',
        discoveryKey: 'dossier:underground-life',
        code: 'HS-03 · ĐỜI SỐNG DƯỚI HẦM',
        title: 'Chiếu Phim, Ca Hát & Phẫu Thuật Dưới Lòng Đất Sâu 6 Mét',
        category: 'daily_life',
        categoryLabel: 'Đời sống Dưới hầm',
        readTime: '4 phút đọc',
        xp: 90,
        image: '/media/cu-chi/hotspots/bep-hoang-cam.jpg',
        fallbackImage: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
        summary:
            'Dưới làn mưa bom bão đạn trên mặt đất, bên dưới lòng hầm tối đặc và thiếu dưỡng khí vẫn diễn ra những ca phẫu thuật cứu người, những lớp học xóa mù chữ và cả những buổi chiếu phim nhựa sôi nổi.',
        contextStory:
            'Sống dưới địa đạo không chỉ là ẩn nấp chờ thời cơ chiến đấu, mà là duy trì một xã hội thu nhỏ đầy sức sống. Ban ngày, mọi hoạt động rút sâu xuống lòng đất. Trong những căn hầm rộng chỉ vài mét vuông, các y bác sĩ thực hiện hàng trăm ca mổ dưới ánh đèn pin nối với dynamo xe đạp do một chiến sĩ đạp liên tục bên góc hầm. Khi đêm xuống hoặc giữa các đợt nghỉ bom, đoàn văn công Giải phóng lại tổ chức biểu diễn ca múa nhạc và chiếu phim ngay trong hầm hội họp.',
        technicalAnatomy: [
            'Nguồn điện "Dynamo xe đạp": Một chiếc xe đạp kê cao bánh sau, nối với bộ phát điện nhỏ để cấp sáng cho bàn mổ hoặc máy chiếu phim nhựa 16mm.',
            'Thực đơn chiến khu: Khoai mì (sắn) luộc chấm muối mè là lương thực chủ đạo vì cây khoai mì dễ trồng, củ nằm dưới đất nên không bị cháy rụi khi rừng bị rải chất độc hóa học hay bom napalm.',
            'Kỷ luật âm thanh & ánh sáng: Khi có động trên mặt đất, toàn bộ hầm phải tắt đèn dầu để tiết kiệm oxy và giữ im lặng tuyệt đối.',
        ],
        witnessQuote: {
            quote: 'Lúc bước ra khỏi hầm sau nhiều tuần liền dưới đất, mắt ai cũng chói lòa trước ánh nắng mặt trời, da xanh xao nhưng nụ cười thì luôn rạng rỡ.',
            author: 'Hồi ký Cựu chiến binh Quân khu Sài Gòn - Gia Định',
            role: 'Nhân chứng lịch sử',
        },
        quickQuiz: {
            question: 'Vì sao củ khoai mì (sắn) trở thành nguồn lương thực sinh tồn quan trọng nhất của quân dân Củ Chi?',
            options: [
                'Vì khoai mì có thể tự phát sáng trong đêm tối',
                'Vì củ nằm sâu dưới đất nên vẫn sống sót và thu hoạch được ngay cả khi mặt đất bị bom cháy và rải chất độc hóa học',
                'Vì khoai mì không cần nấu chín vẫn bảo quản được 10 năm',
            ],

            explanation:
                'Phần củ khoai mì nằm dưới lòng đất nên được bảo vệ khỏi lửa bom napalm và hóa chất rải thảm trên bề mặt.',
        },
    },
    {
        id: 'dossier_command_center',
        discoveryKey: 'dossier:command-center',
        code: 'HS-04 · ĐẦU NÃO CHỈ HUY',
        title: 'Bí Mật Sở Chỉ Huy Ngầm Điều Hành Chiến Dịch Mậu Thân 1968',
        category: 'architecture',
        categoryLabel: 'Kiến trúc Ngầm',
        readTime: '4 phút đọc',
        xp: 95,
        image: '/media/cu-chi/hotspots/bo-tu-lenh.jpg',
        fallbackImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        summary:
            'Chỉ cách trung tâm Sài Gòn chưa đầy 40km đường chim bay, Căn cứ Khu ủy và Bộ Tư lệnh Quân khu Sài Gòn - Gia Định tại Củ Chi là nơi phát đi những mệnh lệnh lịch sử làm rung chuyển chiến trường.',
        contextStory:
            'Nằm ẩn mình dưới những tán rừng giáng hương cổ thụ dọc bờ sông Sài Gòn, khu căn cứ Bộ Tư lệnh và Khu Ủy được thiết kế với quy mô kiên cố bậc nhất. Các hầm làm việc của các đồng chí lãnh đạo được gia cố bằng những thân cây gỗ lớn ghép sát nhau, phía trên đắp đất đá ong dày hàng mét theo kiểu "hầm chữ A" kết hợp địa đạo sâu 8m. Từ các căn hầm thông tin cơ yếu này, mạng lưới giao liên mật và điện đài đã kết nối thông suốt với các cánh quân biệt động nội thành Sài Gòn.',
        technicalAnatomy: [
            'Cấu trúc Hầm Chữ A chịu lực: Khung gỗ rừng chịu lực xếp hình tam giác giúp triệt tiêu lực nén thẳng đứng của bom pháo.',
            'Hệ thống giao thông hào có nắp: Kết nối từ hầm làm việc xuống thẳng hệ thống địa đạo ngầm 3 tầng chỉ trong vòng 10 giây khi có báo động B-52.',
            'Mạng lưới thông tin kép: Kết hợp máy thu phát vô tuyến điện công suất nhỏ (chỉ phát sóng trong vài phút để tránh bị định vị) và đội ngũ giao liên chạy bộ xuyên địa đạo.',
        ],
        witnessQuote: {
            quote: 'Đứng ngay trên nóc hầm chỉ huy của ta mà đối phương không hề hay biết bên dưới là cả một bộ máy tham mưu đang hoạt động ngày đêm.',
            author: 'Hồ sơ Di tích Quốc gia Đặc biệt Địa đạo Củ Chi',
            role: 'Tư liệu Lưu trữ',
        },
        quickQuiz: {
            question: 'Thiết kế khung gỗ chịu lực trong các căn hầm chỉ huy tại Củ Chi thường được ghép theo hình chữ gì để chống sập?',
            options: ['Hình chữ A (tam giác cân chịu lực)', 'Hình chữ O tròn xoay', 'Hình chữ U ngược không đáy'],

            explanation:
                'Hầm chữ A sử dụng kết cấu tam giác giúp phân tán lực nén cực tốt trước sức ép của bom đạn nổ gần.',
        },
    },
    {
        id: 'dossier_tunnel_rats',
        discoveryKey: 'dossier:tunnel-rats',
        code: 'HS-05 · TƯ LIỆU ĐỐI CHỨNG',
        title: 'Hồ Sơ Giải Mật: Đội Quân "Tunnel Rats" (Chuột Cống) Của Mỹ Nói Gì Về Củ Chi?',
        category: 'perspective',
        categoryLabel: 'Tư liệu Đối chứng',
        readTime: '6 phút đọc',
        xp: 110,
        image: '/media/cu-chi/hotspots/khu-uy.jpg',
        fallbackImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
        summary:
            'Đầu năm 1966, Sư đoàn Bộ binh 25 của Mỹ đóng căn cứ tại Đồng Dù với quyết tâm xóa sổ địa đạo, nhưng trớ trêu thay, doanh trại của họ lại được dựng ngay bên trên nóc mạng lưới hầm ngầm của du kích!',
        contextStory:
            'Trong chiến dịch Crimp (tháng 1/1966), binh lính Mỹ kinh ngạc khi thấy đối phương nổ súng rồi biến mất không dấu vết ngay giữa vòng vây. Khi phát hiện các miệng hầm nhỏ xíu, những vũ khí tối tân nhất như xe tăng, máy bay, chất hóa học đều bất lực. Quân đội Mỹ buộc phải tuyển chọn những binh sĩ có vóc dáng nhỏ bé nhất để lập ra đội "Tunnel Rats" (Lính Chuột Cống), chỉ mang theo một khẩu súng ngắn ổ quay, một đèn pin và con dao găm chui xuống hầm. Tuy nhiên, cấu trúc mê cung 3 tầng và các nút chặn của Củ Chi đã khiến lực lượng này luôn rơi vào thế bị động.',
        technicalAnatomy: [
            'Nghịch lý Căn cứ Đồng Dù: Sư đoàn 25 ("Tia Chớp Nhiệt Đới") lập căn cứ ngay trên đất Củ Chi mà không biết các ngách địa đạo chạy xuyên qua ngay dưới chân hàng rào kẽm gai của mình.',
            'Thất bại của Chiến dịch Cedar Falls (1967): Dù huy động 30.000 quân, xe ủi đất Rome Plow và bom tấn để san phẳng vùng "Tam giác sắt", hệ thống địa đạo ngầm vẫn tồn tại nguyên vẹn.',
            'Sự thừa nhận trong sử liệu phương Tây: Các học giả quân sự quốc tế xếp Địa đạo Củ Chi vào danh sách những công trình ngầm quân sự kỳ vĩ nhất thế kỷ 20.',
        ],
        witnessQuote: {
            quote: 'Khi chui xuống lòng đất Củ Chi, mọi ưu thế về hỏa lực và công nghệ của chúng tôi đều bằng không. Đó là thế giới do họ làm chủ hoàn toàn.',
            author: 'Trích hồi ký cựu binh đội Tunnel Rats (Sư đoàn 25 Mỹ)',
            role: 'Tư liệu Đối chứng Quốc tế',
        },
        quickQuiz: {
            question: 'Sự kiện trớ trêu nào đã xảy ra khi Sư đoàn 25 của Mỹ xây dựng căn cứ lớn tại Đồng Dù (Củ Chi) năm 1966?',
            options: [
                'Căn cứ được xây dựng ngay phía trên mạng lưới địa đạo đang hoạt động của quân dân Củ Chi',
                'Căn cứ bị ngập nước hoàn toàn do triều cường biển Đông',
                'Họ xây nhầm căn cứ sang địa phận tỉnh Tây Ninh',
            ],

            explanation:
                'Căn cứ Đồng Dù nằm ngay trên hệ thống địa đạo sẵn có, giúp du kích có thể xuất hiện bất ngờ ngay trong lòng căn cứ đối phương.',
        },
    },
    {
        id: 'dossier_ben_duoc',
        discoveryKey: 'dossier:ben-duoc',
        code: 'HS-06 · KÝ ỨC & TRI ÂN',
        title: 'Đền Tưởng Niệm Bến Dược — Bản Anh Hùng Ca Khắc Trên Đá Hoa Cương',
        category: 'daily_life',
        categoryLabel: 'Đời sống Dưới hầm',
        readTime: '3 phút đọc',
        xp: 100,
        image: '/media/cu-chi/hotspots/ben-duoc.jpg',
        fallbackImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        summary:
            'Nơi lưu danh 45.639 người con ưu tú đã ngã xuống trên vùng đất Sài Gòn – Chợ Lớn – Gia Định, cùng bức tranh ghép gốm Bát Tràng khổng lồ tái hiện trọn vẹn lịch sử khai hoang và giữ đất.',
        contextStory:
            'Khánh thành giai đoạn đầu vào ngày 19/12/1995 trên diện tích 7ha tại chính vùng đất từng bị bom đạn cày xới ác liệt nhất, Đền Tưởng niệm Liệt sĩ Bến Dược mang kiến trúc truyền thống Việt Nam thanh thoát mà trang nghiêm. Dưới tầng hầm của ngôi đền là không gian trưng bày điêu khắc tái hiện lại cảnh "Đất thép thành đồng", nơi mỗi thước đất ngầm Củ Chi đều thấm đẫm mồ hôi và máu xương của hàng vạn đồng bào, chiến sĩ và những Bà mẹ Việt Nam Anh hùng.',
        technicalAnatomy: [
            'Bia đá hoa cương mạ vàng: Khắc tên tuổi của 45.639 liệt sĩ (bao gồm các Mẹ Việt Nam Anh hùng và các chiến sĩ vô danh) hy sinh tại chiến trường Sài Gòn – Chợ Lớn – Gia Định.',
            'Tháp 9 tầng cao 39m: Tượng trưng cho 9 tầng cao vợi của lòng biết ơn và khát vọng hòa bình vĩnh cửu.',
            'Bộ tranh ghép gốm Bát Tràng lớn nhất miền Nam: Gồm 3 phần nối tiếp nhau kể câu chuyện từ thuở cha ông đi mở cõi, kháng chiến giữ đất đến ngày đất nước thống nhất.',
        ],
        witnessQuote: {
            quote: 'Dân tộc Việt Nam đời đời ghi nhớ công ơn các anh hùng liệt sĩ đã ngã xuống để đất thép nở hoa độc lập.',
            author: 'Văn bia tại Đền Tưởng niệm Bến Dược',
            role: 'Di tích Lịch sử Văn hóa',
        },
        quickQuiz: {
            question: 'Ngọn tháp biểu tượng tại Đền Tưởng niệm Liệt sĩ Bến Dược có chiều cao và số tầng là bao nhiêu?',
            options: [
                'Tháp 9 tầng, cao 39 mét',
                'Tháp 3 tầng, cao 12 mét',
                'Tháp 15 tầng, cao 68 mét',
            ],

            explanation:
                'Ngọn tháp tại Đền Bến Dược có 9 tầng với chiều cao 39m, trên vách tháp có những phù điêu hoa văn tái hiện cuộc sống và chiến đấu của nhân dân Củ Chi.',
        },
    },
]

// ============================================================================
// PHẦN 6: HỆ THỐNG 9 HUY HIỆU THÀNH TÍCH (KHỚP 9 HÌNH ẢNH BADGE CỦA BẠN)
// Đặt ảnh tại: public/media/badges/badge-1.jpg ... badge-10.jpg
// ============================================================================
const CATEGORY_TABS: { id: StoryCategory; label: string; icon: string }[] = [
    { id: 'all', label: 'Tất Cả Hồ Sơ', icon: 'folder_special' },
    { id: 'architecture', label: 'Kiến Trúc Ngầm', icon: 'foundation' },
    { id: 'tactics', label: 'Sáng Chế Quân Sự', icon: 'military_tech' },
    { id: 'daily_life', label: 'Đời Sống & Ký Ức', icon: 'local_fire_department' },
    { id: 'perspective', label: 'Tư Liệu Đối Chứng', icon: 'menu_book' },
]

// Tổng điểm XP tối đa của toàn bộ hoạt động trên trang Khám Phá
const MAX_ARCHIVE_XP =
    DEPTH_LAYERS.reduce((s, l) => s + l.xp, 0) +
    SECRET_CIPHERS.reduce((s, c) => s + c.xpReward, 0) +
    INVESTIGATION_CLUES.reduce((s, cl) => s + cl.xp, 0) +
    100 + // Điểm kết luận bàn điều tra
    STORY_DOSSIERS.reduce((s, d) => s + d.xp, 0) + MAX_VIDEO_XP

// ============================================================================
// Thành tích chỉ được khôi phục từ server sau khi đăng nhập.

export function ExplorePage() {
    const [honorsParams] = useSearchParams()
    const appliedHonorsLink = useRef<string | null>(null)
    const { user } = useAuth()
    const userId = user?.id
    const legacyQuestRecord = questRecordFromSearch(honorsParams)
    const legacyLocationId = honorsParams.get('locationId')
    useEffect(() => {
        if (!userId || !legacyQuestRecord || !legacyLocationId) return
        let timer: ReturnType<typeof setTimeout> | undefined
        const schedule = () => {
            if (timer) clearTimeout(timer)
            if (!document.hidden) timer = setTimeout(() => {
                void recordQuestStepEngagement(legacyQuestRecord, legacyLocationId, 'map').catch(() => {})
            }, 5000)
        }
        schedule()
        document.addEventListener('visibilitychange', schedule)
        return () => { if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', schedule) }
    }, [userId, legacyQuestRecord, legacyLocationId])
    const navigate = useNavigate()
    const { mode, setMode } = useAppMode()
    useEffect(() => {
        if (!mode) {
            setMode('online')
        }
    }, [mode, setMode])
    const { showToast } = useToast()
    const [profile, setProfile] = useState<ProfileMe | null>(null)

    const [categoryFilter, setCategoryFilter] = useState<StoryCategory>('all')
    const [activeDepthId, setActiveDepthId] = useState<string>(
        () => sessionStorage.getItem('timelens_explore_active_depth') || 'surface'
    )

    const [unlockedKeys, setUnlockedKeys] = useState<string[]>([])
    const [badgeProgress, setBadgeProgress] = useState<ExploreBadgeProgress[]>([])
    const [archiveXp, setArchiveXp] = useState(0)
    const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [snapshotOwner, setSnapshotOwner] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const submittingRef = useRef(false)
    const requestVersion = useRef(0)
    const accountEpoch = useRef(0)
    const modalRef = useRef<HTMLDivElement>(null)
    const exploreScrollYRef = useRef<number>(0)
    const [failedDepthKey, setFailedDepthKey] = useState<string | null>(null)
    const [dossierPassed, setDossierPassed] = useState(false)

    const [activeClueCode, setActiveClueCode] = useState<string>('EV-01')

    // State Modal Giải mã Mật thư
    const [activeCipher, setActiveCipher] = useState<CipherItem | null>(null)
    const [selectedCipherOption, setSelectedCipherOption] = useState<number | null>(null)
    const [cipherFeedback, setCipherFeedback] = useState<'idle' | 'wrong' | 'success'>('idle')
    const cipherViewVersion = useRef(0)

    // State Modal Đọc Hồ Sơ Chuyên Sâu
    const [activeDossier, setActiveDossier] = useState<StoryDossier | null>(null)
    const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null)
    const [quizSubmitted, setQuizSubmitted] = useState(false)
    const dossierViewVersion = useRef(0)

    // State Modal Xem Chi Tiết Huy Hiệu
    const [selectedBadge, setSelectedBadge] = useState<HeritageBadge | null>(null)

    // State & Ref phát hiện Huy hiệu MỚI vừa mở khóa để bật Popup Chúc mừng
    const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<HeritageBadge[]>([])
    const knownEarnedBadgeIdsRef = useRef<Set<string> | null>(null)
    // Finish the current reading/quiz view before presenting queued congratulations.
    const celebratingBadge = !activeCipher && !activeDossier && !selectedBadge ? newlyUnlockedBadges[0] ?? null : null

    const displayName = profile?.displayName ?? user?.displayName ?? 'Nhà Khám Phá TimeLens'

    const applySnapshot = useCallback((snapshot: ExploreSnapshot) => {
        setProfile(snapshot.profile)
        setUnlockedKeys(snapshot.discovery.keys)
        setBadgeProgress(snapshot.badges)
        setArchiveXp(snapshot.archiveXp)
        setSnapshotOwner(snapshot.profile.id)
        setDataStatus('ready')

        // So sánh danh sách huy hiệu vừa nhận từ Server với trạng thái trước đó
        const currentEarnedIds = new Set(
            snapshot.badges.filter((b) => b.earned).map((b) => b.id)
        )

        if (knownEarnedBadgeIdsRef.current === null) {
            // Lần đầu tiên tải trang: Chỉ ghi nhận các huy hiệu đã có sẵn (không bật popup)
            knownEarnedBadgeIdsRef.current = currentEarnedIds
        } else {
            // Các lần cập nhật sau hành động của người dùng: Tìm ra các huy hiệu MỚI vừa đạt được
            const justUnlocked = HERITAGE_BADGES.filter(
                (badge) => currentEarnedIds.has(badge.id) && !knownEarnedBadgeIdsRef.current?.has(badge.id)
            )
            if (justUnlocked.length > 0) {
                justUnlocked.forEach((b) => knownEarnedBadgeIdsRef.current?.add(b.id))
                setNewlyUnlockedBadges((prev) => {
                    const existingIds = new Set(prev.map((item) => item.id))
                    const uniqueNew = justUnlocked.filter((item) => !existingIds.has(item.id))
                    return [...prev, ...uniqueNew]
                })
            } else {
                knownEarnedBadgeIdsRef.current = currentEarnedIds
            }
        }
    }, [])

    const loadBackendState = useCallback(async () => {
        if (!userId) return
        const owner = userId
        const epoch = accountEpoch.current
        const version = ++requestVersion.current
        try {
            const snapshot = await exploreApi.snapshot()
            if (epoch !== accountEpoch.current || version !== requestVersion.current || snapshot.profile.id !== owner) return
            applySnapshot(snapshot)
        } catch {
            if (epoch === accountEpoch.current && version === requestVersion.current) setDataStatus('error')
        }
    }, [userId, applySnapshot])

    useEffect(() => {
        accountEpoch.current++
        setProfile(null)
        setUnlockedKeys([])
        setBadgeProgress([])
        setArchiveXp(0)
        submittingRef.current = false
        setIsSubmitting(false)
        setSnapshotOwner(null)
        setDataStatus('loading')
        setActiveCipher(null)
        setActiveDossier(null)
        setSelectedBadge(null)
        setNewlyUnlockedBadges([])
        knownEarnedBadgeIdsRef.current = null
        setFailedDepthKey(null)
        void loadBackendState()
        const reload = () => { void loadBackendState() }
        window.addEventListener(DISCOVERY_RECORDED_EVENT, reload)
        window.addEventListener('focus', reload)
        window.addEventListener('online', reload)
        return () => {
            accountEpoch.current++
            window.removeEventListener(DISCOVERY_RECORDED_EVENT, reload)
            window.removeEventListener('focus', reload)
            window.removeEventListener('online', reload)
        }
    }, [loadBackendState])

    // One keyboard handler and one scroll lock for the visible dialog.
    const modalOpen = !!(celebratingBadge || selectedBadge || activeCipher)
    useEffect(() => {
        if (!modalOpen) return
        const previous = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        modalRef.current?.focus()
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (celebratingBadge) {
                    setNewlyUnlockedBadges((prev) => prev.slice(1))
                    return
                }
                setSelectedBadge(null); setActiveCipher(null)
            }
            if (event.key !== 'Tab') return
            const focusable = modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')
            if (!focusable?.length) { event.preventDefault(); return }
            const first = focusable[0], last = focusable[focusable.length - 1]
            if (event.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) {
                event.preventDefault(); last.focus()
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modalRef.current)) {
                event.preventDefault(); first.focus()
            }
        }
        document.addEventListener('keydown', keydown)
        return () => {
            document.removeEventListener('keydown', keydown)
            document.body.style.overflow = previousOverflow
            previous?.focus()
        }
    }, [modalOpen, celebratingBadge])

    // Khi mở trang chi tiết Hồ sơ: Đảm bảo mở khóa scroll và đưa màn hình lên đầu trang ngay lập tức
    useEffect(() => {
        if (!activeDossier) return
        document.body.style.overflow = ''
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }, [activeDossier])

    useEffect(() => {
        if (sessionStorage.getItem('pilot_session_start_sent')) return
        emitEvent('session_start')
        sessionStorage.setItem('pilot_session_start_sent', '1')
    }, [])

    // Khôi phục đúng vị trí cuộn trang & Tab tầng sâu khi từ Chat quay về
    useEffect(() => {
        // Lấy cờ báo hiệu có phải đang từ trang Chat quay về hay không
        const isReturningFromQuiz = sessionStorage.getItem('timelens_return_to_quiz') === '1'

        if (isReturningFromQuiz) {
            // Xóa cờ để tránh lỗi khi người dùng F5
            sessionStorage.removeItem('timelens_return_to_quiz')

            // 1. Khôi phục lại Tab Tầng sâu đang chọn trước đó
            const savedDepth = sessionStorage.getItem('timelens_explore_active_depth')
            if (savedDepth) {
                setActiveDepthId(savedDepth)
            }

            // 2. Chờ DOM render xong (100ms) rồi khôi phục vị trí cuộn (Scroll)
            const timer = setTimeout(() => {
                const savedScrollY = Number(sessionStorage.getItem('timelens_explore_scroll_y') || '0')
                if (savedScrollY > 0) {
                    window.scrollTo({ top: savedScrollY, behavior: 'smooth' })
                } else {
                    document.getElementById('depth-quiz-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 100)
            return () => clearTimeout(timer)

        } else {
            // Nếu truy cập từ trang chủ vào thì cuộn lên trên cùng
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [])

    // Không cập nhật thành tích trước khi server chấm và commit thành công.
    const recordDiscoveryKey = useCallback(
        async (key: string, actionLabel: string, answer?: number): Promise<boolean | null> => {
            if (!userId || submittingRef.current) return null
            const owner = userId
            const epoch = accountEpoch.current
            submittingRef.current = true
            setIsSubmitting(true)
            try {
                const result = await exploreApi.submit(CU_CHI_LOCATION_ID, key, answer)
                if (epoch !== accountEpoch.current || result.snapshot.profile.id !== owner) return null
                ++requestVersion.current
                applySnapshot(result.snapshot)
                if (!result.passed) {
                    showToast({ message: 'Đáp án chưa chính xác. Bạn có thể đọc lại và thử lại.', type: 'error' })
                    return false
                }
                showToast({ message: result.alreadyCompleted
                    ? 'Hoạt động này đã được ghi nhận. Không cộng XP lần nữa.'
                    : `${actionLabel} đã được lưu${result.xpEarned > 0 ? ` · +${result.xpEarned} XP` : ''}.`,
                    type: result.alreadyCompleted ? 'info' : 'success' })
                window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT))
                return true
            } catch (error) {
                if (epoch === accountEpoch.current) showToast({ message: error instanceof ApiError && error.status < 500
                    ? getFriendlyErrorMessage(error, 'quest')
                    : 'Chưa thể xác nhận kết quả. Vui lòng kiểm tra kết nối hoặc thử lại sau. XP chưa được xác nhận trên màn hình này.', type: 'error' })
                return null
            } finally {
                if (epoch === accountEpoch.current) {
                    submittingRef.current = false
                    setIsSubmitting(false)
                }
            }
        }, [userId, applySnapshot, showToast]
    )

    // =========================================================================
    // KHỐI 1: KHAI BÁO CÁC BIẾN CƠ SỞ (BASE VARIABLES)
    // Phải nằm trên cùng để các khối sau sử dụng
    // =========================================================================
    const exploredDepthIds = useMemo(
        () => DEPTH_LAYERS.filter((l) => unlockedKeys.includes(l.quizKey)).map((l) => l.id),
        [unlockedKeys]
    )

    const depthEarnedXp = useMemo(
        () => DEPTH_LAYERS.filter((l) => unlockedKeys.includes(l.quizKey)).reduce((sum, l) => sum + l.xp, 0),
        [unlockedKeys]
    )

    const unlockedCipherIds = useMemo(
        () => SECRET_CIPHERS.filter((c) => unlockedKeys.includes(c.discoveryKey)).map((c) => c.id),
        [unlockedKeys]
    )

    const cipherEarnedXp = useMemo(
        () => SECRET_CIPHERS.filter((c) => unlockedKeys.includes(c.discoveryKey)).reduce((sum, c) => sum + c.xpReward, 0),
        [unlockedKeys]
    )

    const completedDossierIds = useMemo(
        () => STORY_DOSSIERS.filter((d) => unlockedKeys.includes(d.discoveryKey)).map((d) => d.id),
        [unlockedKeys]
    )

    const dossierEarnedXp = useMemo(
        () => STORY_DOSSIERS.filter((d) => unlockedKeys.includes(d.discoveryKey)).reduce((sum, d) => sum + d.xp, 0),
        [unlockedKeys]
    )

    const verifiedClueCodes = useMemo(
        () => INVESTIGATION_CLUES.filter((cl) => unlockedKeys.includes(cl.discoveryKey)).map((cl) => cl.code),
        [unlockedKeys]
    )

    const investigationConcluded = useMemo(
        () => unlockedKeys.includes(CONCLUSION_DISCOVERY_KEY),
        [unlockedKeys]
    )

    const clueEarnedXp = useMemo(
        () =>
            INVESTIGATION_CLUES.filter((cl) => unlockedKeys.includes(cl.discoveryKey)).reduce((sum, cl) => sum + cl.xp, 0) +
            (investigationConcluded ? 100 : 0),
        [unlockedKeys, investigationConcluded]
    )

    // =========================================================================
    // KHỐI 2: TÍNH TỔNG ĐIỂM DỰA TRÊN KHỐI 1
    // =========================================================================
    const earnedArchiveXp = archiveXp
    const xpProgressPercent = Math.min(100, Math.round((earnedArchiveXp / MAX_ARCHIVE_XP) * 100))

    const totalAccountXp = profile?.totalPoints ?? 0
    const displayLevel = profile?.level ?? 1
    const levelName = profile?.levelName ?? 'Đang tải'
    const xpForNextLevel = totalAccountXp + (profile?.pointsToNextLevel ?? 0)
    const isMaxLevel = profile?.pointsToNextLevel === 0
    const progressToNextLevel = profile?.levelProgressPercent ?? 0
    const badgeState = (badge: HeritageBadge) => badgeProgress.find(p => p.id === badge.id)
    const isBadgeEarned = (badge: HeritageBadge) => badgeState(badge)?.earned === true
    const badgeProgressText = (badge: HeritageBadge) => {
        const raw = badgeState(badge)?.progressText ?? 'Chưa có dữ liệu'
        return raw
            .replace(/:\s*true\b/gi, ': ✓')
            .replace(/:\s*false\b/gi, ': ○')
    }
    const badgeProgressPercent = (badge: HeritageBadge) => badgeState(badge)?.progressPercent ?? 0
    const unlockedBadges = HERITAGE_BADGES.filter(isBadgeEarned)
    const nextTargetBadge = HERITAGE_BADGES.find(badge => !isBadgeEarned(badge)) ?? null

    const currentDepthLayer = useMemo(() => {
        return DEPTH_LAYERS.find((l) => l.id === activeDepthId) || DEPTH_LAYERS[0]
    }, [activeDepthId])

    const currentClue = useMemo(() => {
        return INVESTIGATION_CLUES.find((c) => c.code === activeClueCode) || INVESTIGATION_CLUES[0]
    }, [activeClueCode])

    const filteredDossiers = useMemo(() => {
        return STORY_DOSSIERS.filter((d) => categoryFilter === 'all' || d.category === categoryFilter)
    }, [categoryFilter])

    // =========================================================================
    // KHỐI 3: CÁC HÀM XỬ LÝ SỰ KIỆN (EVENT HANDLERS)
    // =========================================================================
    const handleSelectDepthLayer = (layer: DepthLayerInfo) => {
        setActiveDepthId(layer.id)
        sessionStorage.setItem('timelens_explore_active_depth', layer.id)
    }

    const handleOpenCipher = (cipher: CipherItem) => {
        ++cipherViewVersion.current
        setActiveCipher(cipher)
        setSelectedCipherOption(null)
        setCipherFeedback(unlockedKeys.includes(cipher.discoveryKey) ? 'success' : 'idle')
    }

    const handleVerifyCipher = async () => {
        if (!activeCipher || selectedCipherOption === null) return
        const cipher = activeCipher
        const viewVersion = cipherViewVersion.current
        const passed = await recordDiscoveryKey(cipher.discoveryKey, `Giải mật ${cipher.codeName}`, selectedCipherOption)
        if (passed !== null && viewVersion === cipherViewVersion.current) setCipherFeedback(passed ? 'success' : 'wrong')
    }

    const handleOpenDossier = (dossier: StoryDossier) => {
        ++dossierViewVersion.current
        if (!activeDossier) {
            exploreScrollYRef.current = window.scrollY
        }
        setActiveDossier(dossier)
        setSelectedQuizOption(null)
        setQuizSubmitted(unlockedKeys.includes(dossier.discoveryKey))
        setDossierPassed(unlockedKeys.includes(dossier.discoveryKey))
    }

    const handleCloseDossier = () => {
        const savedY = exploreScrollYRef.current
        setActiveDossier(null)
        window.setTimeout(() => {
            window.scrollTo({ top: savedY, behavior: 'smooth' })
        }, 60)
    }

    const handleSubmitDossierQuiz = async () => {
        if (!activeDossier || selectedQuizOption === null) return
        const dossier = activeDossier
        const viewVersion = dossierViewVersion.current
        const passed = await recordDiscoveryKey(dossier.discoveryKey, `Lĩnh hội hồ sơ ${dossier.code}`, selectedQuizOption)
        if (passed !== null && viewVersion === dossierViewVersion.current) { setQuizSubmitted(true); setDossierPassed(passed) }
    }

    const handleDepthAnswer = async (key: string, label: string, answer: number) => {
        setFailedDepthKey(null)
        const passed = await recordDiscoveryKey(key, label, answer)
        if (passed === false) setFailedDepthKey(key)
    }

    const handleVerifyClue = (clue: EvidenceClue) => {
        setActiveClueCode(clue.code)
        if (!unlockedKeys.includes(clue.discoveryKey)) {
            void recordDiscoveryKey(clue.discoveryKey, `Ghi nhận chứng cứ ${clue.code}`)
        }
    }

    const handleConcludeInvestigation = () => {
        if (verifiedClueCodes.length < INVESTIGATION_CLUES.length || investigationConcluded) return
        void recordDiscoveryKey(CONCLUSION_DISCOVERY_KEY, 'Hoàn tất Hồ sơ Điều tra Củ Chi')
    }

    const allCiphersUnlocked = unlockedCipherIds.length === SECRET_CIPHERS.length

    // A vinh danh link selects a view only. It never records evidence or submits a quiz.
    useEffect(() => {
        if (dataStatus !== 'ready' || !userId || snapshotOwner !== userId) return
        const path = honorsParams.get('honorsPath')
        const target = honorsParams.get('target')
        const sections: Record<string, string> = { depths: 'depth-quiz-section', ciphers: 'honors-ciphers', evidence: 'honors-evidence', dossiers: 'honors-dossiers', videos: 'cu-chi-videos' }
        if (!path || !Object.prototype.hasOwnProperty.call(sections, path)) return
        const identity = `${userId}:${path}:${target ?? ''}`
        if (appliedHonorsLink.current === identity) return
        if (path === 'depths' && target) {
            const layer = DEPTH_LAYERS.find(item => item.id === target)
            if (!layer) return
            setActiveDepthId(layer.id)
        } else if (path === 'ciphers' && target) {
            const cipher = SECRET_CIPHERS.find(item => item.discoveryKey === `cipher:${target}`)
            if (!cipher) return
            ++cipherViewVersion.current
            setActiveCipher(cipher)
            setSelectedCipherOption(null)
            setCipherFeedback(unlockedKeys.includes(cipher.discoveryKey) ? 'success' : 'idle')
        } else if (path === 'dossiers' && target) {
            const dossier = STORY_DOSSIERS.find(item => item.discoveryKey === `dossier:${target}`)
            if (!dossier) return
            const archive = document.getElementById('honors-dossiers')
            exploreScrollYRef.current = archive ? archive.getBoundingClientRect().top + window.scrollY : window.scrollY
            ++dossierViewVersion.current
            setActiveDossier(dossier)
            setSelectedQuizOption(null)
            setQuizSubmitted(unlockedKeys.includes(dossier.discoveryKey))
            setDossierPassed(unlockedKeys.includes(dossier.discoveryKey))
        } else if (path === 'evidence' && target && target !== 'conclusion') {
            const clue = INVESTIGATION_CLUES.find(item => item.discoveryKey === `clue:${target}`)
            if (!clue) return
            setActiveClueCode(clue.code)
        }
        appliedHonorsLink.current = identity
        const frame = requestAnimationFrame(() => document.getElementById(sections[path])?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start',
        }))
        return () => cancelAnimationFrame(frame)
    }, [dataStatus, userId, snapshotOwner, honorsParams, unlockedKeys])

    if (!user || snapshotOwner !== user.id || dataStatus !== 'ready') {
        return <AppLayout activeBorder="right" mobileTitle="Khám phá">
            <ExploreLoading signedIn={!!user} error={dataStatus === 'error'} onRetry={() => { setDataStatus('loading'); void loadBackendState() }} />
        </AppLayout>
    }

    // =========================================================================
    // MÀN HÌNH TOÀN TRANG: TRÌNH BÀY THẲNG DỌC 1 CỘT (KHÔNG CHIA TAB, KHÔNG CHIA CỘT)
    // =========================================================================
    if (activeDossier) {
        const isDossierCompleted = unlockedKeys.includes(activeDossier.discoveryKey)

        return (
            <AppLayout activeBorder="right" mobileTitle={activeDossier.code}>
                <main className="bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 min-h-screen w-full text-[#0F1B33] font-sans pb-24 relative">
                    {isSubmitting && (
                        <p
                            role="status"
                            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-slate-900 text-white px-5 py-3 shadow-lg"
                        >
                            Đang xác nhận kết quả…
                        </p>
                    )}

                    {/* 1. THANH ĐIỀU HƯỚNG CỐ ĐỊNH TRÊN CÙNG (ĐÃ BỎ 3 NÚT TAB 1, 2, 3) */}
                    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b-2 border-[#0275FB]/15 shadow-[0_8px_30px_rgba(2,117,251,0.08)]">
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
                            {/* Nút Quay lại Kho Sử Liệu */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseDossier}
                                    className="px-4 py-2.5 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_6px_18px_rgba(2,117,251,0.3)] transition-all cursor-pointer"
                                >
                                    <MaterialIcon name="arrow_back" className="text-base" />
                                    <span>Quay lại Kho Sử Liệu</span>
                                </button>
                            </div>

                            {/* Nhãn trạng thái điểm XP */}
                            <span
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm ${
                                    isDossierCompleted
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-[#FDC908] text-[#0F1B33]'
                                }`}
                            >
                                <MaterialIcon name={isDossierCompleted ? 'verified' : 'stars'} className="text-sm" />
                                <span className="whitespace-nowrap">
                                    {isDossierCompleted ? `✓ Đã lĩnh hội (+${activeDossier.xp} XP)` : `Thử thách +${activeDossier.xp} XP`}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* 2. LUỒNG NỘI DUNG THẲNG DỌC 1 CỘT DUY NHẤT (MAX-W-5XL) */}
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

                        {/* KHỐI MỞ ĐẦU: ẢNH TƯ LIỆU LỚN + TIÊU ĐỀ + TÓM TẮT + TRÍCH DẪN */}
                        <section className="bg-white border-2 border-[#0275FB]/20 rounded-[2.2rem] overflow-hidden shadow-[0_18px_45px_rgba(2,117,251,0.08)]">
                            {/* Hình ảnh tư liệu tràn ngang rõ nét */}
                            <div className="relative h-64 sm:h-80 md:h-[400px] w-full bg-slate-900 overflow-hidden">
                                <img
                                    src={resolveMediaUrl(activeDossier.image)}
                                    alt={activeDossier.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = activeDossier.fallbackImage
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33] via-[#0F1B33]/35 to-transparent" />

                                <div className="absolute bottom-5 left-6 right-6 sm:left-8 sm:right-8 space-y-2 text-white">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-3.5 py-1 rounded-full bg-[#FDC908] text-[#0F1B33] text-xs font-black uppercase tracking-wider shadow-sm">
                                            {activeDossier.code}
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md text-[#FFF2C3] text-xs font-bold border border-white/20 flex items-center gap-1">
                                            <MaterialIcon name="schedule" className="text-sm text-[#FDC908]" />
                                            {activeDossier.readTime}
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                                            {activeDossier.categoryLabel}
                                        </span>
                                    </div>

                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                                        {activeDossier.title}
                                    </h1>
                                </div>
                            </div>

                            {/* Phần Tóm tắt & Lời chứng Lịch sử */}
                            <div className="p-6 sm:p-8 lg:p-10 space-y-6">
                                <p className="text-base sm:text-lg text-[#0F1B33] font-bold leading-relaxed bg-[#F2F7FF] p-5 sm:p-6 rounded-2xl border border-[#0275FB]/20">
                                    {activeDossier.summary}
                                </p>

                                <blockquote className="p-5 sm:p-6 rounded-2xl bg-[#FFFBEB] border-l-4 border-[#FDC908] space-y-2 shadow-sm">
                                    <p className="text-sm sm:text-base font-bold italic text-[#0F1B33] leading-relaxed">
                                        "{activeDossier.witnessQuote.quote}"
                                    </p>
                                    <footer className="text-xs font-black text-[#0275FB] uppercase">
                                        — {activeDossier.witnessQuote.author} ({activeDossier.witnessQuote.role})
                                    </footer>
                                </blockquote>
                            </div>
                        </section>

                        {/* KHỐI 1: CÂU CHUYỆN & BỐI CẢNH LỊCH SỬ CHUYÊN SÂU */}
                        <section className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 lg:p-10 shadow-[0_15px_40px_rgba(2,117,251,0.06)] space-y-5">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center border border-[#0275FB]/20 shrink-0">
                                    <MaterialIcon name="article" className="text-2xl" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-[#0275FB]">
                                        BỐI CẢNH & DIỄN BIẾN SỬ LIỆU
                                    </p>
                                    <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                        Câu Chuyện Lịch Sử Chuyên Sâu
                                    </h2>
                                </div>
                            </div>

                            <p className="text-base sm:text-[17px] text-slate-700 leading-[1.85] font-medium">
                                {activeDossier.contextStory}
                            </p>
                        </section>

                        {/* KHỐI 2: BÓC TÁCH CẤU TẠO & NGUYÊN LÝ HOẠT ĐỘNG */}
                        <section className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 lg:p-10 shadow-[0_15px_40px_rgba(2,117,251,0.06)] space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#FFF2C3] text-[#0F1B33] flex items-center justify-center border border-[#FDC908] shrink-0">
                                    <MaterialIcon name="schema" className="text-2xl text-[#0275FB]" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-[#0275FB]">
                                        GIẢI PHẪU KỸ THUẬT & CƠ CHẾ
                                    </p>
                                    <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                        Bóc Tách Cấu Tạo & Nguyên Lý Hoạt Động
                                    </h2>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {activeDossier.technicalAnatomy.map((point, idx) => (
                                    <div
                                        key={idx}
                                        className="p-5 rounded-2xl bg-gradient-to-r from-[#F4F9FF] to-white border-2 border-[#0275FB]/15 hover:border-[#0275FB]/40 transition-all flex items-start gap-4 shadow-sm"
                                    >
                                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white text-sm font-black flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm sm:text-base text-[#0F1B33] font-semibold leading-relaxed">
                                            {point}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* KHỐI 3: THỬ THÁCH XÁC THỰC KIẾN THỨC & LĨNH HỘI HỒ SƠ */}
                        <section className="bg-white border-2 border-[#0275FB] rounded-[2.2rem] p-6 sm:p-8 lg:p-10 shadow-[0_18px_45px_rgba(2,117,251,0.12)] space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src="/mascot/mascot-6.png"
                                        alt="Chrono Quiz"
                                        className="w-12 h-12 object-contain drop-shadow-md shrink-0"
                                    />
                                    <div>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-[#0275FB]">
                                            XÁC THỰC KIẾN THỨC HỒ SƠ
                                        </span>
                                        <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                            Thử Thách Lĩnh Hội Hồ Sơ
                                        </h2>
                                    </div>
                                </div>
                                <span className="px-4 py-1.5 rounded-full bg-[#FFF2C3] border border-[#FDC908] text-xs font-black text-[#0F1B33] whitespace-nowrap">
                                    +{activeDossier.xp} XP
                                </span>
                            </div>

                            <div className="p-5 rounded-2xl bg-[#FFF2C3]/60 border border-[#FDC908]">
                                <p className="text-xs font-black text-[#92400e] uppercase">Câu hỏi xác thực kiến thức:</p>
                                <p className="text-base sm:text-lg font-black text-[#0F1B33] mt-1.5 leading-snug">
                                    {activeDossier.quickQuiz.question}
                                </p>
                            </div>

                            <div className="space-y-3">
                                {activeDossier.quickQuiz.options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setSelectedQuizOption(idx)
                                            setQuizSubmitted(false)
                                        }}
                                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 text-sm sm:text-base font-bold transition-all cursor-pointer flex items-start gap-3.5 ${
                                            selectedQuizOption === idx
                                                ? 'border-[#0275FB] bg-[#EAF3FF] text-[#0275FB] shadow-sm'
                                                : 'border-slate-200 hover:border-[#0275FB]/40 text-[#0F1B33] bg-white'
                                        }`}
                                    >
                                        <span
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                                                selectedQuizOption === idx
                                                    ? 'bg-[#0275FB] text-white'
                                                    : 'bg-slate-100 text-[#0F1B33] border border-slate-300'
                                            }`}
                                        >
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="leading-relaxed">{opt}</span>
                                    </button>
                                ))}
                            </div>

                            {quizSubmitted && (
                                <div
                                    className={`p-4 sm:p-5 rounded-2xl border text-sm sm:text-base font-bold leading-relaxed ${
                                        dossierPassed
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                            : 'bg-rose-50 border-rose-200 text-rose-700'
                                    }`}
                                >
                                    {dossierPassed ? (
                                        <>
                                            🎉 <strong>Chính xác! (+{activeDossier.xp} XP):</strong>{' '}
                                            {activeDossier.quickQuiz.explanation}
                                        </>
                                    ) : (
                                        <>Chưa đúng rồi! Hãy xem lại nội dung Câu chuyện hoặc Giải phẫu kỹ thuật phía trên để tìm đáp án đúng nhé.</>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleSubmitDossierQuiz}
                                    disabled={selectedQuizOption === null || isSubmitting}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] disabled:opacity-40 text-white font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow-md transition-all"
                                >
                                    Kiểm Tra Đáp Án & Lĩnh Hội Hồ Sơ (+{activeDossier.xp} XP)
                                </button>
                            </div>
                        </section>

                    </div>
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout activeBorder="right" mobileTitle="Khám phá">
            <main className="bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 min-h-screen w-full text-[#0F1B33] font-sans selection:bg-[#FDC908] selection:text-[#0F1B33] pb-24 relative overflow-hidden">

                {isSubmitting && <p role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-slate-900 text-white px-5 py-3 shadow-lg">Đang xác nhận kết quả…</p>}
                {/* ========================================================= */}
                {/* HERO BANNER: HƯỚNG DẪN KHÁM PHÁ & BẢNG TIẾN ĐỘ TỔNG HỢP     */}
                {/* ========================================================= */}
                <section className="relative overflow-hidden bg-gradient-to-br from-[#0353B8] via-[#0275FB] to-[#014296] border-b-4 border-[#FDC908] shadow-[0_18px_45px_rgba(2,117,251,0.28)] py-6 lg:py-7">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] pointer-events-none" />
                    <div className="absolute -top-24 right-[15%] w-[500px] h-[500px] bg-[#FDC908]/25 rounded-full blur-[120px] animate-pulse pointer-events-none" />

                    <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 z-10">
                        {/* Chia 2 cột: Cột trái (Thông tin chức năng) - Cột phải (Bảng tiến độ kép) */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-center">

                            {/* CỘT TRÁI (7 PHẦN): TÊN NGƯỜI DÙNG & HƯỚNG DẪN TÍNH NĂNG CHI TIẾT */}
                            <div className="xl:col-span-7 space-y-3 text-center xl:text-left min-w-0">
                                <div className="inline-flex flex-wrap items-center justify-center xl:justify-start gap-2.5">
                                    <span className="px-3.5 py-1.5 rounded-full bg-[#FDC908] text-[#0F1B33] font-black text-[11px] uppercase tracking-wider shadow-[0_0_20px_rgba(253,201,8,0.6)] flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#0275FB] animate-ping" />
                                        TRUNG TÂM GIẢI MÃ DI SẢN SỐ
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.12em] text-[#FFF2C3]">
                                        ✦ Chào mừng nhà thám hiểm trở lại ✦
                                    </p>
                                    <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                                        <span className="whitespace-nowrap">Xin chào,</span>{' '}
                                        <span className="break-words text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2C3] via-[#FDC908] to-[#FFD93D] drop-shadow-[0_2px_12px_rgba(253,201,8,0.5)]">
                                            {displayName}!
                                        </span>
                                    </h1>
                                </div>

                                <p className="text-sm text-blue-50 font-medium leading-relaxed max-w-2xl mx-auto xl:mx-0">
                                    Giải mã Địa đạo Củ Chi qua 5 nhóm hoạt động. Tích lũy XP, thăng cấp và chinh phục <strong>9 Huy Hiệu Đất Thép</strong>!
                                </p>

                                {/* LƯỚI HƯỚNG DẪN 4 TÍNH NĂNG CHÍNH MỚI BỔ SUNG */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-left hover:bg-white/15 transition-colors group">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-8 h-8 rounded-lg bg-[#0275FB] flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                                                <MaterialIcon name="layers" className="text-base" />
                                            </div>
                                            <h3 className="font-black text-white text-xs uppercase tracking-wide">1. Khảo sát 4 Tầng ngầm</h3>
                                        </div>
                                        <p className="text-xs text-blue-100/90 leading-relaxed font-medium">Khám phá cấu trúc và khả năng sinh tồn từ 0 đến −12m.</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-left hover:bg-white/15 transition-colors group">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-8 h-8 rounded-lg bg-[#FDC908] flex items-center justify-center text-[#0F1B33] shadow-inner group-hover:scale-110 transition-transform">
                                                <MaterialIcon name="vpn_key" className="text-base" />
                                            </div>
                                            <h3 className="font-black text-white text-xs uppercase tracking-wide">2. Phòng Cơ Yếu Mật</h3>
                                        </div>
                                        <p className="text-xs text-blue-100/90 leading-relaxed font-medium">Giải câu đố lịch sử, mở khóa 3 mật lệnh chiến khu.</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-left hover:bg-white/15 transition-colors group">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                                                <MaterialIcon name="fact_check" className="text-base" />
                                            </div>
                                            <h3 className="font-black text-white text-xs uppercase tracking-wide">3. Bàn Điều Tra Chứng Cứ</h3>
                                        </div>
                                        <p className="text-xs text-blue-100/90 leading-relaxed font-medium">Thu thập 4 chứng cứ, giải mã hệ thống ngụy trang.</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-left hover:bg-white/15 transition-colors group">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                                                <MaterialIcon name="auto_stories" className="text-base" />
                                            </div>
                                            <h3 className="font-black text-white text-xs uppercase tracking-wide">4. Đọc Hồ Sơ Chuyên Sâu</h3>
                                        </div>
                                        <p className="text-xs text-blue-100/90 leading-relaxed font-medium">Đọc 6 câu chuyện Đất Thép và làm trắc nghiệm nhận XP.</p>
                                    </div>
                                    <a href="#cu-chi-videos" className="sm:col-span-2 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-left hover:bg-white/15 transition-colors group">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-8 h-8 rounded-lg bg-[#FDC908] flex items-center justify-center text-[#0F1B33] shadow-inner group-hover:scale-110 transition-transform">
                                                <MaterialIcon name="play_circle" className="text-base" />
                                            </div>
                                            <h3 className="font-black text-white text-xs uppercase tracking-wide">5. Khám phá qua 7 video</h3>
                                        </div>
                                        <p className="text-xs text-blue-100/90 leading-relaxed font-medium">Xem câu chuyện tại di tích, vượt thử thách và nhận thêm 210 XP.</p>
                                    </a>
                                </div>
                            </div>

                            {/* CỘT PHẢI (5 PHẦN): BẢNG TIẾN ĐỘ KÉP (GLOBAL LEVEL & CU CHI XP) */}
                            <div className="xl:col-span-5 relative flex flex-col items-center w-full min-w-0">

                                {/* Dành không gian riêng cho linh vật để ảnh lớn không tràn lên mép banner. */}
                                <div className="relative h-40 sm:h-44 pt-4 z-0 pointer-events-none flex justify-center w-full">
                                    <div className="absolute top-10 w-44 h-44 bg-gradient-to-t from-[#FDC908]/90 to-transparent blur-[30px] rounded-full opacity-60" />

                                    {/* Ảnh Chrono */}
                                    <img
                                        src={mascotImg}
                                        alt="Chrono"
                                        className="relative h-full w-auto max-w-[55%] object-contain -translate-x-6 sm:-translate-x-3 drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                                    />

                                    <div className="absolute top-6 sm:top-8 right-0 sm:right-[3%] bg-white text-[#0F1B33] border-2 border-[#FDC908] px-3 py-1.5 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.15)] flex items-center gap-1.5 z-20">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase whitespace-nowrap">Bắt đầu nào!</span>
                                    </div>
                                </div>

                                {/* BẢNG TIẾN ĐỘ TỔNG HỢP NẰM LỚP TRÊN (z-10) */}
                                <div className="w-full max-w-[540px] xl:max-w-[480px] -mt-10 sm:-mt-12 shrink-0 bg-white border-2 border-[#FDC908] p-4 rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.25)] space-y-3 text-[#0F1B33] relative z-10 mx-auto">

                                    {/* PHẦN 1: THANH CẤP ĐỘ TÀI KHOẢN TOÀN CỤC */}
                                    <div>
                                        <div className="flex justify-between items-end mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-xl bg-[#0F1B33] text-white flex items-center justify-center font-black text-xs shadow-inner">
                                                    {displayLevel}
                                                </div>
                                                <div>
                                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                                                        Cấp độ Tài khoản
                                                    </p>
                                                    <p className="text-xs sm:text-sm font-black text-[#0F1B33] whitespace-nowrap mt-0.5">
                                                        <span data-testid="account-level-name">{levelName}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#0275FB]">Tổng XP toàn hệ thống</p>
                                                <p className="text-xs sm:text-sm font-black text-[#0F1B33] mt-0.5">
                                                    <span data-testid="account-xp">{totalAccountXp.toLocaleString()}</span> <span className="text-[10px] sm:text-xs text-slate-400 font-bold">/ {!isMaxLevel ? xpForNextLevel.toLocaleString() : 'MAX'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#0275FB] to-[#015CC8] rounded-full transition-all duration-700"
                                                style={{ width: `${Math.min(100, Math.max(0, progressToNextLevel))}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 border-dashed" />

                                    {/* PHẦN 2: TIẾN ĐỘ KHÁM PHÁ CỦ CHI & HUY HIỆU */}
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-hidden">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FDC908] to-[#FFD93D] text-[#0F1B33] flex items-center justify-center shrink-0 shadow-sm border border-[#FDC908]">
                                                    <MaterialIcon name="explore" className="text-lg" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                                        TIẾN ĐỘ CỦ CHI
                                                    </p>
                                                    <p className="text-sm font-black text-[#0F1B33] whitespace-nowrap mt-0.5">
                                                        {earnedArchiveXp.toLocaleString()}{' '}
                                                        <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                                                            / {MAX_ARCHIVE_XP.toLocaleString()} XP
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex justify-end">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF2C3] border border-[#FDC908] text-[10px] sm:text-[11px] font-black text-[#0F1B33] whitespace-nowrap">
                                                    <MaterialIcon name="military_tech" className="text-[13px] text-[#0275FB]" />
                                                    {unlockedBadges.length}/{HERITAGE_BADGES.length} Huy hiệu
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="h-2.5 w-full bg-[#EAF3FF] rounded-full overflow-hidden p-0.5 border border-[#0275FB]/20">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#0275FB] via-[#388cf1] to-[#FDC908] rounded-full transition-all duration-700"
                                                    style={{ width: `${xpProgressPercent}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-slate-500 gap-1">
                                                <span className="whitespace-nowrap">Đạt {xpProgressPercent}% Củ Chi</span>
                                                {nextTargetBadge ? (
                                                    <span className="text-[#0275FB] font-black truncate max-w-[140px] sm:max-w-[200px] text-right">
                                                        Kế tiếp: {nextTargetBadge.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600 font-black whitespace-nowrap text-right">
                                                        🎉 Đã mở đủ 9/9 Huy hiệu!
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Điểm thành phần, bao gồm video đã được server xác nhận */}
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-2 text-center">
                                        <div className="p-2 rounded-xl bg-[#F2F7FF] border border-[#0275FB]/10">
                                            <p className="text-xs sm:text-sm font-black text-[#0275FB]">+{depthEarnedXp}</p>
                                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase mt-0.5">Tầng ({exploredDepthIds.length}/4)</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-[#F2F7FF] border border-[#0275FB]/10">
                                            <p className="text-xs sm:text-sm font-black text-[#0275FB]">+{cipherEarnedXp}</p>
                                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase mt-0.5">Mật thư ({unlockedCipherIds.length}/3)</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-[#F2F7FF] border border-[#0275FB]/10">
                                            <p className="text-xs sm:text-sm font-black text-[#0275FB]">+{clueEarnedXp}</p>
                                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase mt-0.5">Chứng cứ ({verifiedClueCodes.length}/4)</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDC908]/40 shadow-sm">
                                            <p className="text-xs sm:text-sm font-black text-amber-600">+{dossierEarnedXp}</p>
                                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase mt-0.5">Hồ sơ ({completedDossierIds.length}/6)</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-[#EDFFF6] border border-emerald-200"><p className="text-xs sm:text-sm font-black text-emerald-700">+{videoRewardTotal(unlockedKeys)}</p><p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase mt-0.5">Video ({videoCompletionCount(unlockedKeys)}/7)</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========================================================= */}
                {/* NỘI DUNG TƯƠNG TÁC CHÍNH TRÊN TRANG                       */}
                {/* ========================================================= */}
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-14 relative z-10">

                    {/* --------------------------------------------------------- */}
                    {/* MODULE MỚI: PHÒNG TRUYỀN THỐNG 9 HUY HIỆU THÀNH TÍCH      */}
                    {/* --------------------------------------------------------- */}
                    <section className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(2,117,251,0.07)] space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-black text-[#0275FB] uppercase tracking-wider">
                                    <MaterialIcon name="military_tech" className="text-xl text-[#FDC908]" />
                                    <span>HỆ THỐNG THÀNH TÍCH & DANH HIỆU DI SẢN</span>
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-[#0F1B33] mt-1.5 tracking-tight">
                                    Bộ Sưu Tập Huy Hiệu Giải Mã Củ Chi
                                </h2>
                            </div>
                            <span className="text-sm font-black text-[#0F1B33] bg-[#FFF2C3] px-4 py-2 rounded-full border border-[#FDC908] shadow-sm">
                                Đã mở khóa: {unlockedBadges.length} / {HERITAGE_BADGES.length} Huy hiệu
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {HERITAGE_BADGES.map((badge) => {
                                const unlocked = isBadgeEarned(badge)
                                const pct = badgeProgressPercent(badge)
                                return (
                                    <div
                                        key={badge.id}
                                        data-testid={badge.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Xem huy hiệu ${badge.name}`}
                                        onClick={() => setSelectedBadge(badge)}
                                        onKeyDown={event => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault(); setSelectedBadge(badge)
                                            }
                                        }}
                                        className={`p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-start sm:items-center gap-4 group ${
                                            unlocked
                                                ? 'bg-gradient-to-br from-white via-[#FFFBEB]/60 to-[#F2F7FF] border-[#FDC908] shadow-[0_12px_30px_rgba(253,201,8,0.18)] hover:-translate-y-1'
                                                : 'bg-[#F8FAFC] border-slate-200 hover:border-[#0275FB]/30 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Hình ảnh Huy hiệu thu gọn nhẹ (w-24/w-28) để nhường thêm không gian cho chữ */}
                                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center select-none">
                                            {unlocked ? (
                                                <>
                                                    <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-[#FDC908]/65 via-amber-300/45 to-[#0275FB]/50 blur-xl animate-pulse pointer-events-none" />
                                                    <div className="absolute inset-3 rounded-full bg-[#FDC908]/30 blur-md pointer-events-none" />
                                                </>
                                            ) : (
                                                <div className="absolute inset-4 rounded-full bg-slate-200/70 blur-md pointer-events-none" />
                                            )}

                                            <img
                                                src={badge.image}
                                                alt={badge.name}
                                                className={`relative z-10 w-full h-full object-contain transition-all duration-500 group-hover:scale-110 ${
                                                    unlocked
                                                        ? 'drop-shadow-[0_0_18px_rgba(253,201,8,0.85)]'
                                                        : 'grayscale contrast-75 opacity-45'
                                                }`}
                                            />

                                            {!unlocked && (
                                                <div className="absolute z-20 w-9 h-9 rounded-full bg-[#0F1B33]/80 border border-white/40 flex items-center justify-center shadow-lg">
                                                    <MaterialIcon name="lock" className="text-white text-lg" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Thông tin & Thanh tiến độ mở khóa từng Huy hiệu (Hiển thị trọn vẹn, không cắt chữ) */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <span
                                                className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                                    unlocked
                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                        : 'bg-slate-200 text-slate-600'
                                                }`}
                                            >
                                                {unlocked ? '✓ ĐÃ SỞ HỮU' : badge.rankLabel}
                                            </span>

                                            <div>
                                                <h3 className="text-base sm:text-[17px] font-black text-[#0F1B33] leading-snug group-hover:text-[#0275FB] transition-colors">
                                                    {badge.name}
                                                </h3>
                                                {/* Đã gỡ bỏ line-clamp-2 để hiển thị đầy đủ 100% nội dung yêu cầu */}
                                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                                    {badge.requirementText}
                                                </p>
                                            </div>

                                            {/* Tách nhãn TIẾN ĐỘ và chuỗi thông số thành 2 dòng riêng biệt để không bao giờ đè nhau */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0">
                                                        Tiến độ
                                                    </span>
                                                    <span className={`text-[11px] font-black whitespace-nowrap shrink-0 ${unlocked ? 'text-emerald-600' : 'text-[#0275FB]'}`}>
                                                        {pct}%
                                                    </span>
                                                </div>

                                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            unlocked ? 'bg-emerald-500' : 'bg-[#0275FB]'
                                                        }`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>

                                                <p className="text-[11px] sm:text-xs font-black text-[#0275FB] leading-snug break-words pt-0.5">
                                                    {badgeProgressText(badge)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {/* --------------------------------------------------------- */}
                    {/* MODULE 1: THƯỚC ĐO MẶT CẮT ĐỘ SÂU ĐỊA ĐẠO (0m -> -12m)     */}
                    {/* --------------------------------------------------------- */}
                    <section id="depth-quiz-section" className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(2,117,251,0.07)] space-y-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-black text-[#0275FB] uppercase tracking-wider">
                                    <MaterialIcon name="layers" className="text-base" />
                                    <span>MÔ PHỎNG ĐỊA CHẤT & KIẾN TRÚC NGẦM</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1">
                                    Mặt Cắt Tương Tác 3 Tầng Độ Sâu Địa Đạo
                                </h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            {/* Cột chọn tầng độ sâu (4 tầng) - Đã bỏ justify-between và thay bằng gap-4 để các card khít lại */}
                            {/* CỘT TRÁI: DANH SÁCH 4 TẦNG & WIDGET THỬ THÁCH LIỀN MẠCH (KHÔNG CÒN KHOẢNG TRỐNG) */}
                            <div className="lg:col-span-5 flex flex-col gap-5">

                                {/* Nhóm 4 nút chọn tầng */}
                                <div className="flex flex-col gap-3">
                                    {DEPTH_LAYERS.map((layer) => {
                                        const isSelected = layer.id === activeDepthId
                                        const isQuizPassed = unlockedKeys.includes(layer.quizKey)
                                        return (
                                            <button
                                                key={layer.id}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => handleSelectDepthLayer(layer)}
                                                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                    isSelected
                                                        ? 'bg-[#0275FB] text-white border-[#0275FB] shadow-[0_10px_25px_rgba(2,117,251,0.3)] scale-[1.01]'
                                                        : 'bg-[#F8FAFC] hover:bg-[#EAF3FF] text-[#0F1B33] border-slate-200 hover:border-[#0275FB]/40'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <span
                                                            className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                                                isSelected ? 'bg-[#FDC908] text-[#0F1B33]' : 'bg-white text-[#0275FB] border border-[#0275FB]/20'
                                                            }`}
                                                        >
                                                            {layer.depthLabel}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-black whitespace-nowrap ${
                                                                isSelected
                                                                    ? 'text-[#FFF2C3]'
                                                                    : isQuizPassed
                                                                        ? 'text-emerald-600'
                                                                        : 'text-amber-600'
                                                            }`}
                                                        >
                                                            {isQuizPassed
                                                                ? `✓ Đã hoàn thành · ${layer.xp} XP`
                                                                : `Thử thách +${layer.xp} XP`}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-sm font-black leading-snug pr-2">
                                                        {layer.title}
                                                    </h3>
                                                </div>
                                                <MaterialIcon
                                                    name={isSelected ? 'radio_button_checked' : 'chevron_right'}
                                                    className={`text-xl shrink-0 ${isSelected ? 'text-[#FDC908]' : 'text-slate-400'}`}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* WIDGET "THỬ THÁCH SINH TỒN" 4 ĐÁP ÁN A, B, C, D (LIGHT MODE BRANDING) */}
                                <div className="p-5 sm:p-6 rounded-[1.5rem] bg-white border-2 border-[#0275FB] relative overflow-hidden group shadow-[0_15px_40px_rgba(2,117,251,0.12)]">
                                    {/* Hiệu ứng nền sáng & pattern lưới chìm */}
                                    <div className="absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.04] pointer-events-none" />
                                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#FDC908]/20 rounded-full blur-3xl pointer-events-none transition-all duration-1000 group-hover:bg-[#FDC908]/30" />
                                    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#0275FB]/15 rounded-full blur-3xl pointer-events-none" />

                                    <div className="relative z-10 space-y-4">
                                        {/* Header: Hình ảnh Mascot thay thế Icon & Điểm XP xanh */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                                            <div className="flex items-center gap-3">
                                                {/* Ảnh Chrono "Suy nghĩ" */}
                                                <div className="relative w-12 h-12 shrink-0">
                                                    <img
                                                        src="/mascot/mascot-6.png"
                                                        alt="Chrono Quiz"
                                                        className="w-full h-full object-contain relative z-10 drop-shadow-md animate-[organicFloat_4s_ease-in-out_infinite]"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">CÂU HỎI TỪ CHRONO</span>
                                                    <span className="text-[12px] font-black uppercase tracking-widest text-[#0F1B33] leading-tight">
                                                        THỬ THÁCH {currentDepthLayer.depthLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-[#0275FB] bg-[#EAF3FF] px-3 py-1.5 rounded-full border border-[#0275FB]/20 shadow-inner">
                                                +{currentDepthLayer.xp} XP
                                            </span>
                                        </div>

                                        {/* Câu hỏi tương phản cao */}
                                        <p className="text-base sm:text-lg font-black text-[#0F1B33] leading-snug">
                                            {currentDepthLayer.quiz.question}
                                        </p>

                                        {/* Hướng dẫn thử lại và nhận thưởng một lần, khớp quy tắc server. */}
                                        <div className="flex items-start gap-2 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3.5 py-2.5 rounded-xl shadow-sm">
                                            <MaterialIcon name="info" className="text-sm shrink-0 mt-0.5 text-blue-600" />
                                            <span className="leading-relaxed">{unlockedKeys.includes(currentDepthLayer.quizKey)
                                                ? 'Thử thách đã hoàn thành và phần thưởng đã được ghi nhận. Bạn có thể xem lại nội dung; hệ thống không cộng thêm XP cho thử thách này.'
                                                : `Bạn có thể thử lại khi trả lời sai. Hoàn thành đúng thử thách để nhận +${currentDepthLayer.xp} XP một lần duy nhất; xem lại không cộng thêm XP.`}</span>
                                        </div>

                                        {/* Nút Gọi AI hỗ trợ: Chỉ hiển thị khi CHƯA HOÀN THÀNH thử thách */}
                                        {!unlockedKeys.includes(currentDepthLayer.quizKey) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    saveSelectedLocationId(CU_CHI_LOCATION_ID)

                                                    sessionStorage.setItem('timelens_explore_active_depth', activeDepthId)
                                                    sessionStorage.setItem('timelens_explore_scroll_y', String(window.scrollY))
                                                    sessionStorage.setItem('timelens_return_to_quiz', '1')

                                                    const targetUrl = buildChatPath({
                                                        locationId: CU_CHI_LOCATION_ID,
                                                        persona: 'chrono',
                                                        prompt: currentDepthLayer.aiPrompt,
                                                        from: 'explore',
                                                    })
                                                    navigate(targetUrl)
                                                }}
                                                className="w-full py-3.5 rounded-xl border-2 border-[#0275FB] bg-[#EAF3FF] hover:bg-[#0275FB] transition-all text-[#0275FB] hover:text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm group/btn"
                                            >
                                                <MaterialIcon name="forum" className="text-lg group-hover/btn:text-[#FDC908] transition-colors" />
                                                <span>Nhờ Chrono giải đáp</span>
                                            </button>
                                        )}

                                        {/* 4 Đáp án A, B, C, D (Tone trắng, chữ đen, nút A/B/C/D xanh chìm) */}
                                        <div className="space-y-2.5 pt-1">
                                            {failedDepthKey === currentDepthLayer.quizKey && <p role="status" className="text-sm text-rose-700">Chưa chính xác. Hãy đọc lại nội dung và chọn lại đáp án.</p>}
                                            {unlockedKeys.includes(currentDepthLayer.quizKey) ? (
                                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-3 shadow-sm">
                                                    <MaterialIcon name="verified" className="text-xl text-emerald-600 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-black text-emerald-800">Chính xác!</p>
                                                        <p data-testid="depth-completed" className="text-xs font-medium text-emerald-700 mt-0.5 leading-relaxed">Thử thách này đã được hệ thống ghi nhận.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                currentDepthLayer.quiz.options.map((opt, idx) => (
                                                    <button
                                                        key={idx}
                                                        data-testid={`depth-answer-${idx}`}
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => void handleDepthAnswer(currentDepthLayer.quizKey, `Vượt qua thử thách ${currentDepthLayer.depthLabel}`, idx)}
                                                        className="w-full text-left p-3.5 rounded-xl border-2 border-slate-200 hover:border-[#0275FB] bg-white hover:bg-[#F4F9FF] text-sm font-bold text-[#0F1B33] transition-all cursor-pointer flex items-start gap-3.5 shadow-sm group/opt"
                                                    >
                                                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0275FB] to-[#015CC8] flex items-center justify-center text-[11px] font-black text-white shrink-0 mt-0.5 shadow-md group-hover/opt:scale-110 transition-transform">
                                                            {String.fromCharCode(65 + idx)}
                                                        </span>
                                                        <span className="leading-relaxed">{opt}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-[#F4F9FF] via-white to-[#FFFBEB] border-2 border-[#0275FB]/20 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm">
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${currentDepthLayer.colorAccent} text-white text-xs font-black uppercase tracking-wider shadow-sm`}>
                                            ĐỘ SÂU KHẢO SÁT: {currentDepthLayer.depthLabel}
                                        </span>
                                        <span className="text-[11px] font-black text-[#0275FB] bg-[#EAF3FF] px-3 py-1 rounded-full border border-[#0275FB]/20">
                                            Đất sét pha đá ong tự chịu lực
                                        </span>
                                    </div>

                                    {/* Tiêu đề tầng */}
                                    <div className="pr-2">
                                        <h3 className="text-2xl sm:text-[26px] font-black text-[#0F1B33] tracking-tight leading-tight">
                                            {currentDepthLayer.title}
                                        </h3>
                                        <p className="text-sm text-slate-600 font-medium mt-2">{currentDepthLayer.subtitle}</p>
                                    </div>

                                    {/* HÌNH ẢNH MẶT CẮT & 3 THÔNG SỐ (OVERLAY KÍNH MỜ LÊN ẢNH) */}
                                    <div className="w-full relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner group flex items-center justify-center bg-[#0F1B33]">
                                        {/* Hình ảnh nền */}
                                        <img
                                            src={currentDepthLayer.image}
                                            alt={currentDepthLayer.title}
                                            className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-[1.03]"
                                        />

                                        {/* Lớp màng gradient làm tối phần đáy ảnh để chữ dễ đọc hơn */}
                                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0F1B33] via-[#0F1B33]/60 to-transparent pointer-events-none" />

                                        {/* 3 Chỉ số môi trường nằm đè lên đáy ảnh */}
                                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 w-full">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {/* Nhiệt độ */}
                                                <div className="h-full px-3.5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex flex-col justify-center cursor-default">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase flex items-center gap-1.5">
                                                        <MaterialIcon name="thermostat" className="text-sm text-rose-400" /> Nhiệt độ & Độ ẩm
                                                    </span>
                                                    {/* Chuyển thành flex-col để luôn ép xuống dòng */}
                                                    <div className="flex flex-col mt-0.5">
                                                        <span className="text-sm font-black text-white drop-shadow-md truncate">
                                                            {currentDepthLayer.temp}
                                                        </span>
                                                        {currentDepthLayer.tempSub && (
                                                            <span className="text-[11px] font-semibold text-slate-300 truncate">
                                                                ({currentDepthLayer.tempSub})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Oxy */}
                                                <div className="h-full px-3.5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex flex-col justify-center cursor-default">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase flex items-center gap-1.5">
                                                        <MaterialIcon name="air" className="text-sm text-[#4DB8FF]" /> Lượng Dưỡng Khí
                                                    </span>
                                                    {/* Chuyển thành flex-col để luôn ép xuống dòng */}
                                                    <div className="flex flex-col mt-0.5">
                                                        <span className="text-sm font-black text-white drop-shadow-md truncate">
                                                            {currentDepthLayer.oxygen}
                                                        </span>
                                                        {currentDepthLayer.oxygenSub && (
                                                            <span className="text-[11px] font-semibold text-slate-300 truncate">
                                                                ({currentDepthLayer.oxygenSub})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Kháng bom */}
                                                <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-colors hover:bg-white/20 cursor-default flex flex-col justify-center">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase flex items-center gap-1.5">
                                                        <MaterialIcon name="shield" className="text-sm text-emerald-400" /> Sức Chịu Đựng
                                                    </span>
                                                    <p className="text-[11px] sm:text-xs font-black text-white mt-1 leading-snug drop-shadow-md line-clamp-2">
                                                        {currentDepthLayer.bombResistance}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Danh sách hạng mục công trình */}
                                    <div className="space-y-3 pt-2">
                                        <p className="text-xs font-black uppercase tracking-wider text-[#0275FB]">
                                            Các cấu trúc & hạng mục nằm tại độ sâu này:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {currentDepthLayer.structures.map((st, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white border border-[#0275FB]/15 text-xs font-bold text-[#0F1B33] hover:border-[#0275FB]/40 transition-colors"
                                                >
                                                    <MaterialIcon name="check_circle" className="text-base text-[#0275FB] shrink-0 mt-0.5" />
                                                    <span className="leading-relaxed">{st}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Hộp Bí mật kỹ thuật */}
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FFF2C3] to-[#FFFBEB] border border-[#FDC908] flex items-start gap-4 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-[#FDC908] text-[#0F1B33] flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                                        <MaterialIcon name="lightbulb" className="text-xl" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-wider text-[#92400e]">
                                            Bí mật sinh tồn tại {currentDepthLayer.depthLabel}:
                                        </p>
                                        <p className="text-sm font-bold text-[#0F1B33] leading-relaxed mt-1">
                                            {currentDepthLayer.secretFact}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* --------------------------------------------------------- */}
                    {/* MODULE 2: BÀN GIẢI MÃ MẬT LỆNH & MẬT THƯ CHIẾN KHU        */}
                    {/* --------------------------------------------------------- */}
                    <section id="honors-ciphers" className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-black text-[#0275FB] uppercase tracking-wider">
                                    <MaterialIcon name="vpn_key" className="text-base text-[#FDC908]" />
                                    <span>PHÒNG CƠ YẾU NGẦM · MỞ KHÓA HUY HIỆU "BẬC THẦY CƠ YẾU"</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] tracking-tight mt-1">
                                    Giải Mã Mật Lệnh & Mật Thư Chiến Khu
                                </h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {SECRET_CIPHERS.map((cipher) => {
                                const isUnlocked = unlockedKeys.includes(cipher.discoveryKey)
                                return (
                                    <div
                                        key={cipher.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Mở mật thư ${cipher.codeName}`}
                                        onClick={() => handleOpenCipher(cipher)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault()
                                                handleOpenCipher(cipher)
                                            }
                                        }}
                                        className={`rounded-[2rem] p-6 border-2 transition-all duration-300 flex flex-col justify-between cursor-pointer group ${
                                            isUnlocked
                                                ? 'bg-white border-emerald-400 shadow-[0_12px_30px_rgba(16,185,129,0.12)] hover:-translate-y-1'
                                                : 'bg-gradient-to-b from-white to-[#F4F9FF] border-[#0275FB]/25 hover:border-[#0275FB] shadow-[0_12px_30px_rgba(2,117,251,0.08)] hover:-translate-y-1.5'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                                        isUnlocked
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                            : 'bg-[#FFF2C3] text-[#0F1B33] border border-[#FDC908]'
                                                    }`}
                                                >
                                                    <MaterialIcon name={isUnlocked ? 'verified' : 'lock'} className="text-xs" />
                                                    {isUnlocked ? 'ĐÃ GIẢI MẬT' : 'TÀI LIỆU MẬT'}
                                                </span>
                                                <span className="text-xs font-black text-[#0275FB] bg-[#EAF3FF] px-2.5 py-1 rounded-full">
                                                    +{cipher.xpReward} XP
                                                </span>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-mono font-bold text-slate-400">
                                                    {cipher.codeName} · {cipher.date}
                                                </p>
                                                <h3 className="text-lg font-black text-[#0F1B33] group-hover:text-[#0275FB] transition-colors mt-0.5">
                                                    {cipher.location}
                                                </h3>
                                            </div>

                                            <div
                                                className={`p-4 rounded-2xl border text-xs leading-relaxed font-mono ${
                                                    isUnlocked
                                                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-700'
                                                        : 'bg-slate-900 text-amber-200 border-slate-700'
                                                }`}
                                            >
                                                {isUnlocked ? cipher.decryptedContent : cipher.encryptedPreview}
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-500">
                                                Độ khó: <strong className="text-[#0F1B33]">{cipher.difficulty}</strong>
                                            </span>
                                            <span className="text-xs font-black text-[#0275FB] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                <span>{isUnlocked ? 'Xem lại mật lệnh' : 'Bấm để giải mã'}</span>
                                                <MaterialIcon name="arrow_forward" className="text-base" />
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {/* Tư liệu đặc biệt mở khóa sau ba mật thư */}
                        <section className="rounded-[2.2rem] border-2 border-[#FDC908] bg-gradient-to-r from-[#FFFBEB] via-white to-[#EAF3FF] p-6 sm:p-8 shadow-lg space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-11 h-11 rounded-2xl bg-[#FDC908] text-[#0F1B33] flex items-center justify-center shadow-sm">
                                        <MaterialIcon name={allCiphersUnlocked ? 'lock_open' : 'lock'} className="text-2xl" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#0275FB]">
                                            KHO LƯU TRỮ ĐẶC BIỆT · GẮN VỚI HUY HIỆU "NGƯỜI GIỮ KHO BÁU"
                                        </span>
                                        <h3 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                            Chuyện Chưa Kể: Bức Điện Mật Đêm Giao Thừa 1968 Dưới Đáy Địa Đạo
                                        </h3>
                                    </div>
                                </div>
                                <span
                                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${
                                        allCiphersUnlocked
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[#FFF2C3] text-[#0F1B33] border border-[#FDC908]'
                                    }`}
                                >
                                    {allCiphersUnlocked ? 'ĐÃ MỞ NIÊM PHONG' : `Cần giải mã ${unlockedCipherIds.length}/3 Mật thư`}
                                </span>
                            </div>

                            {allCiphersUnlocked ? (
                                <div className="p-6 rounded-2xl bg-white border border-emerald-300 space-y-3 text-sm text-slate-700 leading-relaxed font-medium">
                                    <p className="font-black text-[#0275FB]">
                                        [TƯ LIỆU ĐẶC BIỆT ĐÃ MỞ KHÓA]:
                                    </p>
                                    <p>
                                        Đêm 29 Tết Mậu Thân (1968), dưới căn hầm sâu 8 mét tại Bến Dược, ánh đèn dầu leo lét chiếu lên tấm bản đồ tác chiến Sài Gòn - Gia Định. Hàng ngàn cán bộ, chiến sĩ đã lặng lẽ di chuyển qua các ngách địa đạo ngầm để tập kết sát ven đô mà không một máy bay trinh sát nào phát hiện. Trước giờ xuất kích, bữa cơm Tết dưới lòng đất chỉ có bánh tét gói bằng lá chuối rừng và nước giếng ngầm, nhưng lời thề "Quyết tử cho Tổ quốc quyết sinh" đã vang vọng khắp 250km lòng đất thép.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl bg-white/70 border border-dashed border-[#0275FB]/30 text-center space-y-2">
                                    <p className="text-xs sm:text-sm font-bold text-slate-600">
                                        Nội dung tuyệt mật này đang được bảo vệ. Bạn chỉ cần giải mã đủ <strong>3 Mật Thư Chiến Khu</strong> ở phía trên để tự động mở khóa toàn văn câu chuyện!
                                    </p>
                                </div>
                            )}
                        </section>
                    </section>

                    {/* --------------------------------------------------------- */}
                    {/* MODULE 3: BẢNG ĐIỀU TRA CHỨNG CỨ LỊCH SỬ (LIGHT MODE)     */}
                    {/* --------------------------------------------------------- */}
                    <section id="honors-evidence" className="bg-white border-2 border-[#0275FB]/20 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(2,117,251,0.08)] space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-black text-[#0275FB] uppercase tracking-wider">
                                    <MaterialIcon name="fact_check" className="text-base text-[#FDC908]" />
                                    <span>HỒ SƠ ĐIỀU TRA · MỞ KHÓA HUY HIỆU "THÁM TỬ SỬ LIỆU"</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1">
                                    Bàn Đối Chiếu Tư Liệu: Giải Mã Hệ Thống Ngụy Trang Củ Chi
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                                    Thu thập đủ 4 mảnh chứng cứ khảo cổ và công bố kết luận điều tra để nhận trọn +230 XP.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            <div className="lg:col-span-5 space-y-3">
                                {INVESTIGATION_CLUES.map((clue) => {
                                    const isVerified = unlockedKeys.includes(clue.discoveryKey)
                                    const isCurrent = activeClueCode === clue.code
                                    return (
                                        <button
                                            key={clue.code}
                                            type="button"
                                            onClick={() => handleVerifyClue(clue)}
                                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                                isCurrent
                                                    ? 'bg-[#EAF3FF] border-[#0275FB] shadow-md'
                                                    : isVerified
                                                        ? 'bg-emerald-50/50 border-emerald-300 hover:border-[#0275FB]'
                                                        : 'bg-[#F8FAFC] border-slate-200 hover:border-[#0275FB]/50'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                                        isVerified
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-white text-[#0275FB] border border-[#0275FB]/20'
                                                    }`}
                                                >
                                                    <MaterialIcon name={isVerified ? 'check_circle' : clue.icon} className="text-xl" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0275FB]">
                                                        {clue.code} · {clue.typeLabel}
                                                    </span>
                                                    <h4 className="text-sm font-black text-[#0F1B33] mt-0.5">{clue.title}</h4>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-black text-amber-700 bg-[#FFF2C3] px-2.5 py-0.5 rounded-full shrink-0">
                                                {isVerified ? '✓ Đã nhận' : `+${clue.xp} XP`}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-[#F4F9FF] via-white to-[#FFFBEB] border-2 border-[#0275FB]/20 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="px-3.5 py-1 rounded-full bg-[#0275FB] text-white text-[11px] font-black uppercase">
                                            ĐANG PHÂN TÍCH: {currentClue.code}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500">
                                            Nguồn: {currentClue.sourceCitation}
                                        </span>
                                    </div>

                                    <h3 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                        {currentClue.title}
                                    </h3>

                                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                                        <p className="text-xs font-black uppercase text-[#0275FB]">Câu hỏi đặt ra:</p>
                                        <p className="text-sm font-bold text-[#0F1B33]">{currentClue.summary}</p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-[#EAF3FF]/70 border border-[#0275FB]/25 space-y-1.5">
                                        <p className="text-xs font-black uppercase text-[#0275FB] flex items-center gap-1.5">
                                            <MaterialIcon name="science" className="text-base" />
                                            Kết quả giám định kỹ thuật & lịch sử:
                                        </p>
                                        <p className="text-xs sm:text-sm font-semibold text-[#0F1B33] leading-relaxed">
                                            {currentClue.detailFinding}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    {investigationConcluded ? (
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3">
                                            <MaterialIcon name="emoji_events" className="text-2xl text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-black uppercase text-emerald-800">
                                                    ĐÃ HOÀN TẤT HỒ SƠ ĐIỀU TRA (+100 XP THƯỞNG · ĐÃ MỞ HUY HIỆU THÁM TỬ SỬ LIỆU)
                                                </p>
                                                <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                                                    Kết luận: Sức mạnh của Địa đạo Củ Chi không chỉ nằm ở độ sâu dưới lòng đất mà là sự kết hợp hoàn hảo giữa địa chất tự nhiên, vật lý cơ học (nắp vát chữ V, bẫy nước chữ Z) và thế trận lòng dân liên hoàn.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={verifiedClueCodes.length < INVESTIGATION_CLUES.length || isSubmitting}
                                            onClick={handleConcludeInvestigation}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FDC908] to-[#FDB900] hover:scale-[1.01] disabled:opacity-45 text-[#0F1B33] font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                                        >
                                            <MaterialIcon name="verified" className="text-lg text-[#0275FB]" />
                                            <span>
                                                {verifiedClueCodes.length < INVESTIGATION_CLUES.length
                                                    ? `Hãy bấm xem đủ 4 mảnh chứng cứ bên trái (${verifiedClueCodes.length}/4) để mở Kết luận`
                                                    : 'Tổng Hợp 4 Chứng Cứ & Công Bố Kết Luận Điều Tra (+100 XP)'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* --------------------------------------------------------- */}
                    {/* MODULE 4: KHO LƯU TRỮ "MẢNH CHUYỆN ĐẤT THÉP"              */}
                    {/* --------------------------------------------------------- */}
                    <section id="honors-dossiers" className="space-y-6">
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 pb-4">
                            <div className="pr-2">
                                <div className="flex items-center gap-2 text-xs font-black text-[#0275FB] uppercase tracking-wider">
                                    <MaterialIcon name="auto_stories" className="text-base" />
                                    <span>THƯ VIỆN KHẢO CỨU · MỞ KHÓA HUY HIỆU "TINH HOA BÁC HỌC"</span>
                                </div>
                                {/* Thu gọn cỡ chữ tiêu đề để không rớt chữ "Đắt Giá" */}
                                <h2 className="text-xl sm:text-[26px] font-black text-[#0F1B33] tracking-tight mt-1.5 leading-tight">
                                    Những Mảnh Chuyện & Hồ Sơ Lịch Sử Đắt Giá
                                </h2>
                            </div>

                            {/* Bộ lọc chuyên đề: Thu gọn khoảng cách, padding và cỡ chữ */}
                            <div className="flex flex-wrap gap-1.5">
                                {CATEGORY_TABS.map((tab) => {
                                    const active = categoryFilter === tab.id
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setCategoryFilter(tab.id)}
                                            className={`px-3 py-2 rounded-2xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                                                active
                                                    ? 'bg-[#0275FB] text-white border-[#0275FB] shadow-[0_8px_20px_rgba(2,117,251,0.3)]'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#0275FB]/50 hover:text-[#0275FB]'
                                            }`}
                                        >
                                            <MaterialIcon name={tab.icon} className="text-sm" />
                                            <span className="whitespace-nowrap">{tab.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                            {filteredDossiers.map((dossier) => {
                                const isDone = unlockedKeys.includes(dossier.discoveryKey)
                                return (
                                    <article
                                        key={dossier.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Mở hồ sơ ${dossier.code}`}
                                        onClick={() => handleOpenDossier(dossier)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault()
                                                handleOpenDossier(dossier)
                                            }
                                        }}
                                        className="bg-white border-2 border-white hover:border-[#0275FB]/50 rounded-[2rem] overflow-hidden shadow-[0_12px_35px_rgba(2,117,251,0.07)] hover:shadow-[0_24px_50px_rgba(2,117,251,0.16)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                                    >
                                        <div>
                                            <div className="h-52 relative overflow-hidden bg-slate-100">
                                                <img
                                                    src={resolveMediaUrl(dossier.image)}
                                                    alt={dossier.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => {
                                                        e.currentTarget.src = dossier.fallbackImage
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33]/75 via-transparent to-transparent" />

                                                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#0275FB] text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                    {dossier.code}
                                                </span>

                                                <span
                                                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black shadow-md ${
                                                        isDone
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-[#FDC908] text-[#0F1B33]'
                                                    }`}
                                                >
                                                    {isDone ? '✓ Đã lĩnh hội' : `+${dossier.xp} XP`}
                                                </span>

                                                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-[11px] font-bold">
                                                    <span className="flex items-center gap-1">
                                                        <MaterialIcon name="schedule" className="text-sm text-[#FDC908]" />
                                                        {dossier.readTime}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                                                        {dossier.categoryLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-6 space-y-3">
                                                <h3 className="text-lg font-black text-[#0F1B33] group-hover:text-[#0275FB] transition-colors leading-snug">
                                                    {dossier.title}
                                                </h3>
                                                <p className="text-[13px] text-slate-600 leading-relaxed font-medium line-clamp-3">
                                                    {dossier.summary}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="px-6 pb-6 pt-2">
                                            <div className="w-full py-3 px-4 rounded-xl bg-[#F2F7FF] group-hover:bg-[#0275FB] text-[#0275FB] group-hover:text-white border border-[#0275FB]/20 text-xs font-black transition-all flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <MaterialIcon name="menu_book" className="text-base" />
                                                    <span>{isDone ? 'Đọc lại Hồ sơ Chuyên sâu' : 'Mở Hồ Sơ & Giải Mã Kiến Thức'}</span>
                                                </span>
                                                <MaterialIcon name="open_in_full" className="text-sm" />
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </section>



                    {/* KHÁM PHÁ QUA VIDEO: SAU CÁC PHẦN KHẢO CỨU VÀ HỒ SƠ */}
                    {userId && <ExploreVideoLibrary key={userId} userId={userId} onSnapshot={applySnapshot} />}
                </div>

                {/* ========================================================= */}
                {/* POPUP CHÚC MỪNG KHI VỪA MỞ KHÓA HUY HIỆU MỚI (Z-70)       */}
                {/* ========================================================= */}
                {celebratingBadge && (
                    <div
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Chúc mừng mở khóa huy hiệu ${celebratingBadge.name}`}
                        tabIndex={-1}
                        className="fixed inset-0 z-[70] bg-[#0F1B33]/80 backdrop-blur-md flex items-center justify-center p-4 sm:py-8 animate-[fadeIn_0.25s_ease-out]"
                        onClick={() => setNewlyUnlockedBadges((prev) => prev.slice(1))}
                    >
                        <style>
                            {`
                            @keyframes badgePopIn {
                                0% { opacity: 0; transform: scale(0.85) translateY(16px); }
                                70% { opacity: 1; transform: scale(1.02) translateY(-2px); }
                                100% { opacity: 1; transform: scale(1) translateY(0); }
                            }
                            @keyframes badgeFloatGlow {
                                0%, 100% { transform: translateY(0px) scale(1); }
                                50% { transform: translateY(-6px) scale(1.03); }
                            }
                            `}
                        </style>

                        <div
                            className="relative bg-white border-4 border-[#FDC908] rounded-[2.2rem] max-w-[540px] w-full max-h-[88vh] overflow-y-auto shadow-[0_25px_80px_rgba(253,201,8,0.45)] text-center animate-[badgePopIn_0.4s_cubic-bezier(0.16,1,0.3,1)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header Banner Xanh - Vàng Thương Hiệu (Thu gọn chiều cao) */}
                            <div className="relative bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] pt-4 pb-12 px-6 overflow-hidden border-b-4 border-[#FDC908]">
                                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-28 bg-[#FDC908]/35 blur-2xl rounded-full pointer-events-none" />

                                {/* Nút đóng nhanh góc phải */}
                                <button
                                    type="button"
                                    onClick={() => setNewlyUnlockedBadges((prev) => prev.slice(1))}
                                    className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer z-20"
                                    aria-label="Đóng thông báo"
                                >
                                    <MaterialIcon name="close" className="text-base" />
                                </button>

                                <div className="relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDC908] text-[#0F1B33] text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[0_0_20px_rgba(253,201,8,0.8)]">
                                    <MaterialIcon name="auto_awesome" className="text-sm text-[#0275FB]" />
                                    <span>CHÚC MỪNG MỞ KHÓA HUY HIỆU MỚI!</span>
                                </div>

                                <p className="relative z-10 text-xs font-bold text-[#FFF2C3] mt-1.5">
                                    Hành trình giải mã Đất Thép của bạn vừa ghi dấu một cột mốc rực rỡ
                                </p>
                            </div>

                            {/* Hào quang & Hình ảnh Huy Hiệu Trung Tâm (Kích thước cân đối w-36/w-40) */}
                            <div className="relative -mt-11 mb-1 mx-auto w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center select-none">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FDC908] via-amber-300 to-[#0275FB] blur-xl opacity-75 animate-pulse pointer-events-none" />
                                <div className="absolute inset-2 rounded-full bg-white shadow-lg pointer-events-none" />
                                <div className="absolute inset-3 rounded-full border-2 border-dashed border-[#FDC908] animate-[spin_20s_linear_infinite] pointer-events-none" />
                                <div className="absolute inset-4 rounded-full bg-gradient-to-b from-[#FFF2C3]/70 to-white pointer-events-none" />

                                <img
                                    src={celebratingBadge.image}
                                    alt={celebratingBadge.name}
                                    className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_10px_20px_rgba(253,201,8,0.85)] animate-[badgeFloatGlow_3.5s_ease-in-out_infinite]"
                                />
                            </div>

                            {/* Nội dung chi tiết Huy hiệu */}
                            <div className="px-5 sm:px-7 pb-5 pt-0.5 space-y-3">
                                <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                                        <MaterialIcon name="verified" className="text-xs" />
                                        {celebratingBadge.rankLabel}
                                    </span>

                                    <h3 className="text-xl sm:text-2xl font-black text-[#0F1B33] tracking-tight pt-0.5">
                                        {celebratingBadge.name}
                                    </h3>

                                    <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed px-2">
                                        {celebratingBadge.description}
                                    </p>
                                </div>

                                {/* Hộp xác nhận hoàn thành điều kiện */}
                                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#F2F7FF] via-[#EAF3FF] to-[#FFFBEB] border-2 border-[#0275FB]/20 text-left flex items-center gap-3 shadow-inner">
                                    <div className="w-8 h-8 rounded-xl bg-[#0275FB] text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <MaterialIcon name="military_tech" className="text-base text-[#FDC908]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-[#0275FB]">
                                            Thành tựu vừa chinh phục:
                                        </p>
                                        <p className="text-xs sm:text-[13px] font-bold text-[#0F1B33] mt-0.5 leading-snug">
                                            {celebratingBadge.requirementText}
                                        </p>
                                    </div>
                                </div>

                                {/* Cụm nút bấm hành động (Ép 1 dòng bằng whitespace-nowrap) */}
                                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewlyUnlockedBadges([])
                                            document.querySelector('[data-testid="' + celebratingBadge.id + '"]')?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'center',
                                            })
                                        }}
                                        className="sm:flex-1 py-3 px-4 rounded-2xl border-2 border-[#0275FB]/25 bg-[#F2F7FF] hover:bg-[#EAF3FF] text-[#0275FB] font-black text-[11px] sm:text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                                    >
                                        <MaterialIcon name="collections_bookmark" className="text-base shrink-0" />
                                        <span className="whitespace-nowrap">Xem trong Bộ Sưu Tập</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNewlyUnlockedBadges((prev) => prev.slice(1))}
                                        className="sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 text-[#0F1B33] font-black text-[11px] sm:text-xs uppercase tracking-wide transition-all cursor-pointer shadow-[0_8px_20px_rgba(253,201,8,0.45)] flex items-center justify-center gap-1.5 whitespace-nowrap"
                                    >
                                        <MaterialIcon name="celebration" className="text-base text-[#0275FB] shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {newlyUnlockedBadges.length > 1
                                                ? `Nhận & Xem tiếp (${newlyUnlockedBadges.length - 1})`
                                                : 'Tuyệt vời! Nhận Huy Hiệu'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* MODAL CHI TIẾT HUY HIỆU DANH GIÁ                          */}
                {/* ========================================================= */}
                {selectedBadge && (
                    <div
                        ref={modalRef} role="dialog" aria-modal="true" aria-label="Chi tiết khám phá" tabIndex={-1}
                        className="fixed inset-0 z-50 bg-[#0F1B33]/65 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedBadge(null)}
                    >
                        <div
                            className="bg-white border-2 border-[#FDC908] rounded-[2.2rem] max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Hình ảnh Huy hiệu cỡ lớn không đóng khung + Hào quang rực rỡ trong Modal */}
                            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center select-none">
                                {isBadgeEarned(selectedBadge) && (
                                    <>
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FDC908]/70 via-amber-300/50 to-[#0275FB]/50 blur-2xl animate-pulse pointer-events-none" />
                                        <div className="absolute inset-3 rounded-full border-2 border-dashed border-[#FDC908]/60 animate-[spin_25s_linear_infinite] pointer-events-none" />
                                    </>
                                )}
                                <img
                                    src={selectedBadge.image}
                                    alt={selectedBadge.name}
                                    className={`relative z-10 w-full h-full object-contain transition-transform duration-500 ${
                                        isBadgeEarned(selectedBadge)
                                            ? 'drop-shadow-[0_0_28px_rgba(253,201,8,0.95)] scale-105'
                                            : 'grayscale opacity-55'
                                    }`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <span
                                    className={`inline-block px-3.5 py-1 rounded-full text-[11px] font-black uppercase ${
                                        isBadgeEarned(selectedBadge)
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[#FFF2C3] text-[#0F1B33] border border-[#FDC908]'
                                    }`}
                                >
                                    {isBadgeEarned(selectedBadge)
                                        ? '✓ ĐÃ CHINH PHỤC HUY HIỆU'
                                        : `TIẾN ĐỘ: ${badgeProgressText(selectedBadge)}`}
                                </span>
                                <h3 className="text-2xl font-black text-[#0F1B33] pt-1">{selectedBadge.name}</h3>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                    {selectedBadge.description}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 text-left space-y-1">
                                <p className="text-[10px] font-black uppercase text-[#0275FB]">Điều kiện mở khóa:</p>
                                <p className="text-xs sm:text-sm font-bold text-[#0F1B33]">{selectedBadge.requirementText}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedBadge(null)}
                                className="w-full py-3.5 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                            >
                                Đóng Cửa Sổ
                            </button>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* MODAL 1: HỘP THOẠI GIẢI MÃ MẬT THƯ TẠI CHỖ                */}
                {/* ========================================================= */}
                {activeCipher && (
                    <div
                        ref={modalRef} role="dialog" aria-modal="true" aria-label="Chi tiết khám phá" tabIndex={-1}
                        className="fixed inset-0 z-50 bg-[#0F1B33]/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setActiveCipher(null)}
                    >
                        <div
                            className="bg-white border-2 border-[#0275FB] rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <span className="px-3 py-1 rounded-full bg-[#FFF2C3] border border-[#FDC908] text-[10px] font-black uppercase text-[#0F1B33]">
                                        {activeCipher.codeName} · {activeCipher.date}
                                    </span>
                                    <h3 className="text-2xl font-black text-[#0F1B33] mt-2">{activeCipher.location}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveCipher(null)}
                                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                >
                                    <MaterialIcon name="close" />
                                </button>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-900 text-amber-200 font-mono text-xs sm:text-sm leading-relaxed border border-slate-700">
                                {cipherFeedback === 'success' ? activeCipher.decryptedContent : activeCipher.encryptedPreview}
                            </div>

                            {cipherFeedback !== 'success' ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 space-y-1">
                                        <p className="text-xs font-black text-[#0275FB] uppercase">Câu hỏi khóa mã:</p>
                                        <p className="text-sm font-bold text-[#0F1B33]">{activeCipher.riddleQuestion}</p>
                                        <p className="text-xs text-slate-500 italic pt-1">💡 Gợi ý: {activeCipher.hint}</p>
                                    </div>

                                    <div className="space-y-2.5">
                                        {activeCipher.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCipherOption(idx)
                                                    setCipherFeedback('idle')
                                                }}
                                                className={`w-full text-left p-4 rounded-2xl border-2 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-3 ${
                                                    selectedCipherOption === idx
                                                        ? 'border-[#0275FB] bg-[#EAF3FF] text-[#0275FB]'
                                                        : 'border-slate-200 hover:border-[#0275FB]/40 text-[#0F1B33]'
                                                }`}
                                            >
                                                <span className="w-6 h-6 rounded-full bg-white border border-current flex items-center justify-center text-xs font-black shrink-0">
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <span>{opt}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {cipherFeedback === 'wrong' && (
                                        <p className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                                            Mã khóa chưa chính xác! Hãy đọc kỹ gợi ý lịch sử phía trên và thử lại nhé.
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleVerifyCipher}
                                        disabled={selectedCipherOption === null || isSubmitting}
                                        className="w-full py-4 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] disabled:opacity-40 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                                    >
                                        Xác Thực Khóa Mã & Mở Niêm Phong (+{activeCipher.xpReward} XP)
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1.5">
                                        <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase">
                                            <MaterialIcon name="verified" className="text-base" />
                                            <span>Giải mật thành công · Đã lưu vào hồ sơ (+{activeCipher.xpReward} XP)</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                                            <strong>Ghi chú sử liệu:</strong> {activeCipher.historicalNote}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setActiveCipher(null)}
                                        className="w-full py-3.5 rounded-2xl bg-[#0F1B33] text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        Đóng Hồ Sơ Mật Thư
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </AppLayout>
    )
}
