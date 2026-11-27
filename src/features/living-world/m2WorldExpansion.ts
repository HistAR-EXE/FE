/**
 * G5 / M2 Full World Expansion Contract (Baseline 01/11/2026 Chapters 6, 10, 14, 15, 25, 27):
 * - 18 zones: S0..S5, L1-A..L1-D, L2-A..L2-D, L3-A..L3-D
 * - 24 activities: A01..A24 with truth labels, 6-step rhythm, 1-tap accessibility alternatives, and source notes
 * - 8 cross-activity chains: C01..C08 (Table 105, Chapter 27)
 * - Free multi-turn NPC conversations (A22), sound echoes (A16), Cedar Falls context table (A23),
 *   and owner-scoped personal creative tools (A18 Postcard, A19 Exhibition, A20 Director's Cut, A21 Future Letter)
 */

export type TruthClassification = 'RECONSTRUCTED' | 'FICTIONAL_EDUCATIONAL' | 'MODERN_MEMORIAL' | 'GATED_SOURCE_PENDING'

export type M2InteractiveTarget = {
  id: string
  activity: string
  zone: 'S2' | 'S3' | 'S4' | 'L2-B'
  label: string
  action: string
  requires?: string
  description: string
  why: string
  payoff: string
  oneTapHint: string
  truth: TruthClassification
  at: [number, number]
  approach: [number, number]
  anchor: [number, number, number]
}

export const m2SurfaceTargets: Record<string, M2InteractiveTarget> = {
  // S2 FULL: A03 (Tráng bánh tráng Củ Chi) & A12 (Nghề dép cao su)
  A03_BATTER: {
    id: 'A03_BATTER',
    activity: 'A03',
    zone: 'S2',
    label: 'Bếp tráng bánh · Khuôn vải và bột gạo',
    action: 'Múc bột gạo lên khuôn vải',
    description: 'Từ hạt gạo sau cối giã (A04), bột gạo pha nước lắng trong thau đất bên bếp hơi nước nóng để tráng thành bánh tráng phơi nắng.',
    why: 'Bánh tráng phơi khô vừa là nghề truyền thống của Củ Chi vừa là nguồn lương thực để dành gọn nhẹ cho đời sống cộng đồng.',
    payoff: 'Muôi bột gạo đã dàn trên mặt vải căng hơi nước. Bước tiếp theo là tráng mỏng và nhấc bánh lên phen tre phơi nắng.',
    oneTapHint: 'Có thể dùng nút một chạm “Múc bột gạo lên khuôn vải” trong bảng điều khiển thay cho thao tác kéo tay.',
    truth: 'RECONSTRUCTED',
    at: [-2.5, -1.0],
    approach: [-2.0, -1.0],
    anchor: [-2.5, 0.85, -1.0],
  },
  A03_SPREAD: {
    id: 'A03_SPREAD',
    activity: 'A03',
    zone: 'S2',
    label: 'Phen tre phơi bánh tráng',
    action: 'Tráng đều và đặt bánh lên phen tre',
    requires: 'A03_BATTER',
    description: 'Chiếc bánh mỏng chín bằng hơi nước được nhấc khéo bằng ống tre và trải lên phen đan dưới nắng xóm nghề.',
    why: 'Hoàn tất mẻ bánh tráng nối liền mạch lương thực từ sân giã gạo (S2) xuống bếp Hoàng Cầm (L1-C) và nguồn nước (L3-C).',
    payoff: 'Bánh tráng trắng mỏng đã nằm ngay ngắn trên phen tre đón nắng. Tuyến lương thực (C01) tiến thêm một mắt xích.',
    oneTapHint: 'Nút một chạm “Tráng đều và đặt bánh lên phen tre” thực hiện trọn thao tác nhấc bánh không giới hạn thời gian.',
    truth: 'RECONSTRUCTED',
    at: [-3.5, 0.5],
    approach: [-3.0, 0.5],
    anchor: [-3.5, 0.88, 0.5],
  },
  A12_SOLE: {
    id: 'A12_SOLE',
    activity: 'A12',
    zone: 'S2',
    label: 'Bàn thợ dép · Đế cao su tái chế',
    action: 'Quan sát và đục rãnh đế dép',
    description: 'Những mảnh vỏ lốp cao su cũ được cắt theo khuôn bàn chân và mở rãnh nhỏ để luồn quai.',
    why: 'Tận dụng vật liệu sẵn có để làm đôi dép bền bỉ đi rừng, lội ruộng phản ánh sự tháo vát trong đời sống thường ngày.',
    payoff: 'Đế dép cao su đã được mở rãnh cân đối. Hãy luồn quai dép ở điểm kế bên để hoàn thiện đôi dép.',
    oneTapHint: 'Thao tác minh họa an toàn bằng một chạm, không mô phỏng dao cắt sắc nhọn.',
    truth: 'RECONSTRUCTED',
    at: [2.5, -1.0],
    approach: [2.0, -1.0],
    anchor: [2.5, 0.78, -1.0],
  },
  A12_STRAP: {
    id: 'A12_STRAP',
    activity: 'A12',
    zone: 'S2',
    label: 'Khung luồn quai dép cao su',
    action: 'Luồn quai dép bằng dùi kẹp',
    requires: 'A12_SOLE',
    description: 'Chiếc dùi gỗ kẹp đầu quai cao su luồn qua khe đế, giữ chặt mà không cần đinh hay keo dán.',
    why: 'Đôi dép hoàn chỉnh sẽ theo bước chân người dân từ mặt đất xuống góc nghỉ ngơi dưới hầm (L2-C).',
    payoff: 'Quai dép đã khớp chắc vào đế cao su. Bạn có thể gặp lại đôi dép giản dị này ở góc nghỉ ngơi tầng 2 (L2-C).',
    oneTapHint: 'Nút một chạm “Luồn quai dép bằng dùi kẹp” hoàn tất thao tác thủ công chính xác.',
    truth: 'RECONSTRUCTED',
    at: [3.5, 0.5],
    approach: [3.0, 0.5],
    anchor: [3.5, 0.78, 0.5],
  },

  // S3 FULL: A05 (Đan lát dưới ánh trăng), A06 (Lao động đào địa đạo), A10 (Hò đối đáp trên đồng ruộng)
  A05_STRIPS: {
    id: 'A05_STRIPS',
    activity: 'A05',
    zone: 'S3',
    label: 'Chiếu đan tre · Bó nan dưới ánh trăng',
    action: 'Chọn và xếp nan tre đều tay',
    description: 'Dưới ánh trăng dịu nơi bờ ruộng, những thanh nan tre chẻ mỏng được xếp vuông góc làm khung đáy nong, rổ.',
    why: 'Buổi tối yên ả là lúc người dân tranh thủ đan nong phơi lúa, thúng đựng đất và rổ rá cho gia đình.',
    payoff: 'Khung nan dọc và nan ngang đã vào nếp. Hãy đan cài lớp nan viền để hoàn thành chiếc rổ tre.',
    oneTapHint: 'Nút một chạm “Chọn và xếp nan tre đều tay” hỗ trợ xếp nan không cần kéo thả phức tạp.',
    truth: 'RECONSTRUCTED',
    at: [-2.5, -1.5],
    approach: [-2.0, -1.0],
    anchor: [-2.5, 0.55, -1.5],
  },
  A05_WEAVE: {
    id: 'A05_WEAVE',
    activity: 'A05',
    zone: 'S3',
    label: 'Khung đan nong và thúng tre',
    action: 'Đan cài nan tre theo nhịp một đè một',
    requires: 'A05_STRIPS',
    description: 'Từng nan tre đan cài khít nhau tạo nên chiếc thúng, chiếc nong bền chắc vừa dùng cho mùa gặt vừa phục vụ việc đào đất.',
    why: 'Nghề đan lát gắn bó trực tiếp với cả sản xuất nông nghiệp trên đồng lẫn lao động kiến tạo không gian ngầm.',
    payoff: 'Chiếc thúng tre đã đan xong vành miệng. Tiếng trò chuyện đêm trăng làm dịu đi những vất vả ban ngày.',
    oneTapHint: 'Nút một chạm hoàn tất nhịp đan truyền thống.',
    truth: 'RECONSTRUCTED',
    at: [-3.5, -0.5],
    approach: [-3.0, -0.5],
    anchor: [-3.5, 0.58, -0.5],
  },
  A06_DIG: {
    id: 'A06_DIG',
    activity: 'A06',
    zone: 'S3',
    label: 'Điểm đào đất · Cuốc ngắn và sọt đất sét',
    action: 'Quan sát phân công đào và xúc đất vào thúng',
    description: 'Mô hình diễn giải cảnh người dân chia tổ đào đất sét pha sỏi bằng cuốc cán ngắn và gom đất vào thúng tre.',
    why: 'Cho thấy hệ thống địa đạo nhiều tầng (Q1–Q3) được hình thành từ sức lao động tập thể bền bỉ, không phải tự nhiên mà có.',
    payoff: 'Đất sét đã được xúc đầy thúng tre. Bước tiếp theo là chuyền thúng đất đi tản gọn để giữ kín dấu vết.',
    oneTapHint: 'Mô phỏng giáo dục về phân công lao động tập thể; không hướng dẫn kỹ thuật công sự thực chiến.',
    truth: 'RECONSTRUCTED',
    at: [2.5, -1.5],
    approach: [2.0, -1.0],
    anchor: [2.5, 0.65, -1.5],
  },
  A06_BASKET: {
    id: 'A06_BASKET',
    activity: 'A06',
    zone: 'S3',
    label: 'Đường chuyền thúng đất',
    action: 'Chuyền thúng đất theo hàng người cùng làm',
    requires: 'A06_DIG',
    description: 'Những chiếc thúng tre đan tay (A05) được chuyền nhịp nhàng từ miệng hố đào ra bờ đất xa để san phẳng.',
    why: 'Kết nối trực tiếp lao động trên mặt đất với cấu trúc cửa hầm ngụy trang (Q1), thông khí (Q2) và ba tầng hầm (Q3).',
    payoff: 'Chuyền thúng đất hoàn tất. Bạn đã thấy rõ gốc rễ lao động con người phía sau mạng lưới địa đạo (Tuyến công trình C02).',
    oneTapHint: 'Nút một chạm thực hiện nhịp chuyền thúng phối hợp cùng NPC.',
    truth: 'RECONSTRUCTED',
    at: [3.5, -0.5],
    approach: [3.0, -0.5],
    anchor: [3.5, 0.68, -0.5],
  },
  A10_LISTEN: {
    id: 'A10_LISTEN',
    activity: 'A10',
    zone: 'S3',
    label: 'Bờ ruộng lúa · Nhịp hò lao động',
    action: 'Lắng nghe câu hò mở đầu từ bờ ruộng',
    description: 'Giữa đồng lúa chiều tối, tiếng hò lao động cất lên vừa giữ nhịp tay làm việc vừa gửi gắm tình làng nghĩa xóm.',
    why: 'Âm nhạc dân gian và câu hò đối đáp là sợi dây tinh thần giữ sự lạc quan của cộng đồng nông thôn Củ Chi.',
    payoff: 'Đã nghe trọn câu hò xướng từ phía bờ ruộng: “Trăng lên soi bóng bờ tre / Ai đan chiếc thúng nhớ nghe câu hò…”.',
    oneTapHint: 'Hiển thị đầy đủ lời câu hò bằng văn bản rõ ràng cho cả chế độ tắt âm thanh.',
    truth: 'FICTIONAL_EDUCATIONAL',
    at: [-0.5, -2.2],
    approach: [-0.5, -1.5],
    anchor: [-0.5, 0.9, -2.2],
  },
  A10_CHANT: {
    id: 'A10_CHANT',
    activity: 'A10',
    zone: 'S3',
    label: 'Nhịp đáp lời hò trên đồng',
    action: 'Hòa giọng đáp lại câu hò lao động',
    requires: 'A10_LISTEN',
    description: 'Chọn lời đáp mộc mạc để nối nhịp câu hò cùng những người đang làm việc trên cánh đồng.',
    why: 'Từ tiếng hò trên đồng ruộng (A10), mạch văn hóa cộng đồng sẽ nối tiếp sang đêm văn nghệ (A07) ở sân sinh hoạt (S4).',
    payoff: 'Câu hò đáp vang lên ấm áp: “Thúng đan giữ hạt lúa vàng / Giữ tình xóm nhỏ, giữ làng bình yên.” (Biên tập phục dựng văn hóa).',
    oneTapHint: 'Chọn lời đáp bằng một nút bấm, không yêu cầu thu âm giọng nói hay chấm điểm nhịp.',
    truth: 'FICTIONAL_EDUCATIONAL',
    at: [0.8, -2.2],
    approach: [0.5, -1.5],
    anchor: [0.8, 0.9, -2.2],
  },

  // S4 FULL: A07 (Một đêm văn nghệ), A09 (Thanh niên đăng ký tòng quân), A11 (Phiên chợ kể chuyện)
  A07_WATCH: {
    id: 'A07_WATCH',
    activity: 'A07',
    zone: 'S4',
    label: 'Sân khấu tre · Đêm sinh hoạt văn nghệ',
    action: 'Dừng lại xem tiết mục ca kịch dưới ánh đèn dầu',
    description: 'Dưới mái lá và ánh đèn dầu ấm, đội văn nghệ quần chúng biểu diễn khúc hát quê hương cho bà con và thanh niên cùng nghe.',
    why: 'Đời sống ở Củ Chi không chỉ có hầm đất và thử thách mà còn có nghệ thuật, tiếng cười và đời sống tinh thần phong phú.',
    payoff: 'Khúc hát mộc mạc kết nối mọi người quanh sân. Hãy hòa nhịp vỗ tay cổ vũ ở điểm kế bên.',
    oneTapHint: 'Có lời mô tả tiết mục bằng văn bản; bạn có thể đọc và thực hiện bằng một chạm, không bắt buộc bật âm thanh.',
    truth: 'FICTIONAL_EDUCATIONAL',
    at: [-2.5, -1.8],
    approach: [-2.0, -1.0],
    anchor: [-2.5, 1.0, -1.8],
  },
  A07_CHORUS: {
    id: 'A07_CHORUS',
    activity: 'A07',
    zone: 'S4',
    label: 'Hàng ghế tre cổ vũ văn nghệ',
    action: 'Hòa nhịp vỗ tay và sẻ chia cùng bà con',
    requires: 'A07_WATCH',
    description: 'Tiếng vỗ tay nhịp nhàng và ánh mắt sẻ chia của người già, người trẻ sau mỗi câu hát giữ ấm tinh thần cả xóm.',
    why: 'Khi đi qua nhịp bầu trời đổi sắc (A08) rồi trở lại tiếng hát (A07), sự kiên cường của đời sống văn hóa càng hiện rõ.',
    payoff: 'Nhịp vỗ tay hòa cùng khúc ca khép lại tiết mục trong sự gắn kết ấm áp của cộng đồng.',
    oneTapHint: 'Nút một chạm “Hòa nhịp vỗ tay” hoàn tất trọn vẹn trải nghiệm văn nghệ.',
    truth: 'FICTIONAL_EDUCATIONAL',
    at: [-3.5, -0.5],
    approach: [-3.0, -0.5],
    anchor: [-3.5, 0.85, -0.5],
  },
  A09_LISTEN: {
    id: 'A09_LISTEN',
    activity: 'A09',
    zone: 'S4',
    label: 'Điểm đăng ký tòng quân · Tâm sự tuổi trẻ',
    action: 'Lắng nghe tâm sự bên bàn đăng ký tòng quân',
    description: 'Trong gian nhà vách phên tre đan trang nghiêm có bàn thờ Tổ quốc treo cờ Mặt trận nửa đỏ nửa xanh sao vàng và bình hoa cúc vàng, người thanh niên áo xanh chàm quấn khăn rằn đang nghiêng mình ghi tên lên đường.',
    why: 'Tái hiện góc nhìn nhân văn, chân thực về lòng yêu nước gắn liền với nỗi lưu luyến gia đình, ruộng vườn của tuổi trẻ Củ Chi.',
    payoff: 'Bạn đã lắng nghe lời trò chuyện trầm ấm giữa người cán bộ tuyển quân và người thanh niên trước giờ lên đường.',
    oneTapHint: 'Trải nghiệm quan sát và lắng nghe tự nguyện; không bắt người chơi đăng ký hay chấm điểm.',
    truth: 'FICTIONAL_EDUCATIONAL',
    at: [2.5, -1.8],
    approach: [2.0, -1.0],
    anchor: [2.5, 0.9, -1.8],
  },
  A09_FAREWELL: {
    id: 'A09_FAREWELL',
    activity: 'A09',
    zone: 'S4',
    label: 'Bàn trà tre · Lời dặn dò và khăn rằn kỷ vật',
    action: 'Chứng kiến lời dặn bên ấm trà và mảnh thư gửi lại',
    requires: 'A09_LISTEN',
    description: 'Bên bộ bàn ghế tre mộc mạc đặt ấm trà gốm trắng hoa lam, gia đình trao chiếc khăn rằn kỷ vật và lời dặn giữ gìn sức khỏe; người trẻ gửi lại mảnh thư hẹn ngày quê hương bình yên.',
    why: 'Mảnh thư của tuổi trẻ tại điểm đăng ký tòng quân (A09) dẫn mạch cảm xúc tới hoạt động “Một lá thư gửi tương lai” (A21) dưới ánh đèn dầu L2-B.',
    payoff: 'Khoảnh khắc chia tay bên bàn trà tre đã được ghi nhận, nối liền với tuyến Văn hóa cộng đồng (C04).',
    oneTapHint: 'Nút một chạm ghi nhận câu chuyện nhân văn mà không tạo áp lực lựa chọn đúng/sai.',
    truth: 'FICTIONAL_EDUCATIONAL',
    at: [3.5, -0.5],
    approach: [3.0, -0.5],
    anchor: [3.5, 0.85, -0.5],
  },
  A11_BROWSE: {
    id: 'A11_BROWSE',
    activity: 'A11',
    zone: 'S4',
    label: 'Gian chợ quê · Nông sản và vật dụng đời thường',
    action: 'Quan sát các sạp bánh tráng, rau củ và đồ đan tre',
    description: 'Phiên chợ nhỏ quy tụ bánh tráng từ xóm nghề (S2), thúng rổ đan tay từ bờ ruộng (S3) và củ mì, rau xanh cho bữa ăn.',
    why: 'Mỗi món hàng nhỏ trong chợ là một đầu mối kể chuyện về cách người dân tự túc và san sẻ nguồn lực.',
    payoff: 'Bạn đã nhận ra mối liên hệ giữa các vật phẩm trên sạp chợ với những khu lao động vừa đi qua.',
    oneTapHint: 'Quan sát trực quan bằng một chạm trên từng nhóm vật phẩm.',
    truth: 'RECONSTRUCTED',
    at: [-1.2, 1.2],
    approach: [-1.0, 0.5],
    anchor: [-1.2, 0.82, 1.2],
  },
  A11_CONNECT: {
    id: 'A11_CONNECT',
    activity: 'A11',
    zone: 'S4',
    label: 'Góc sẻ chia nhu yếu phẩm xuống hầm',
    action: 'Kết nối nguồn lương thực, thuốc lá cây và vải sạch',
    requires: 'A11_BROWSE',
    description: 'Một phần gạo, bánh tráng, thảo dược và vải sạch từ phiên chợ được gói gọn để chuyển xuống bếp (L1-C) và nơi chăm sóc (L3-B).',
    why: 'Hoàn chỉnh bức tranh hậu cần nhân dân: mặt đất và lòng đất nuôi dưỡng, nâng đỡ lẫn nhau (Tuyến con người C05).',
    payoff: 'Chuỗi sẻ chia từ phiên chợ mặt đất xuống không gian chăm sóc dưới hầm đã được kết nối trọn vẹn.',
    oneTapHint: 'Nút một chạm kết nối mạch hậu cần đời sống.',
    truth: 'RECONSTRUCTED',
    at: [1.2, 1.2],
    approach: [1.0, 0.5],
    anchor: [1.2, 0.82, 1.2],
  },
}

export const isM2SurfaceTarget = (id: string): boolean => Object.hasOwn(m2SurfaceTargets, id)
export const getM2SurfaceTarget = (id: string): M2InteractiveTarget | undefined => m2SurfaceTargets[id]

export const ALL_M2_ACTIVITY_TARGET_IDS: readonly string[] = [
  ...Object.keys(m2SurfaceTargets),
  'L2B_RECORDS',
  'L2B_LETTER',
  'A23_CAMPAIGN',
]

export const SERVER_CHECKPOINT_ZONES = new Set<string>([
  'S0', 'S1', 'S2', 'S3', 'S4', 'S5',
  'L1-A', 'L1-B', 'L1-C', 'L1-D',
  'L2-A', 'L2-B', 'L2-C', 'L2-D',
  'L3-A', 'L3-B', 'L3-C', 'L3-D',
])

export const SERVER_ACTIVITY_TARGETS = new Set<string>([
  'A02_PREPARE', 'A02_SMOKE',
  'A13_BELONGINGS', 'A13_REST',
  'A14_WATER', 'A14_SHARE',
  'A15_CLOTH', 'A15_CARE',
  ...ALL_M2_ACTIVITY_TARGET_IDS,
])

export type PostcardItem = {
  id: string
  zone: string
  zoneTitle: string
  caption: string
  frameStyle: 'SEPIA_SKETCH' | 'LANTERN_GLOW' | 'DAYLIGHT_ARCHIVE'
  watermark: 'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS'
  createdAt: string
  /** Missing on legacy metadata drafts; completed postcards contain an actual image. */
  imageDataUrl?: string
}

export type HeritageExhibitItem = {
  id: string
  title: string
  zone: string
  truth: TruthClassification
  reflection: string
}

export type HeritageExhibition = {
  themeTitle: string
  curatorNote: string
  itemIds: string[]
  updatedAt: string
  previewVerified?: true
}

export type DirectorsCutPlan = {
  title: string
  momentIds: string[]
  narrationStyle: 'EMPATHY' | 'ARCHITECTURAL' | 'COMMUNITY'
  durationSeconds: 45
  completed: boolean
  updatedAt: string
  rendered?: true
  playbackVerified?: true
}

export type FutureLetterEntry = {
  promptId: string
  recipient: string
  message: string
  savedAt: string
}

export type M2OwnerState = {
  version: 1
  activities: string[]
  echoesHeard: string[]
  npcTopicsSeen: string[]
  cedarFallsSections: string[]
  consentAccepted: boolean
  consentVersion?: 2
  postcards: PostcardItem[]
  exhibition: HeritageExhibition | null
  directorsCut: DirectorsCutPlan | null
  futureLetter: FutureLetterEntry | null
}

const M2_STORAGE_PREFIX = 'timelens-m2-state:'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const textValue = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const timestamp = (value: unknown): value is string => textValue(value) && Number.isFinite(Date.parse(value))
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string')
const uniqueStrings = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : []

function isImageDataUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4 * 1024 * 1024) return false
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[2].length % 4 !== 0) return false
  // Reject placeholder strings and mismatched MIME signatures without decoding private images.
  return match[1] === 'png' ? match[2].startsWith('iVBORw0KGgo') && match[2].length >= 64
    : match[1] === 'jpeg' ? match[2].startsWith('/9j/') && match[2].length >= 64
      : match[2].length >= 32 && atob(match[2].slice(0, 24)).slice(0, 4) === 'RIFF' && atob(match[2].slice(0, 24)).slice(8, 12) === 'WEBP'
}

function readPostcard(value: unknown): PostcardItem | null {
  if (!isRecord(value) || !textValue(value.id) || !textValue(value.zone) || !textValue(value.zoneTitle)
    || typeof value.caption !== 'string' || typeof value.frameStyle !== 'string' || !['SEPIA_SKETCH', 'LANTERN_GLOW', 'DAYLIGHT_ARCHIVE'].includes(value.frameStyle)
    || value.watermark !== 'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS' || !timestamp(value.createdAt)) return null
  return {
    id: value.id, zone: value.zone, zoneTitle: value.zoneTitle, caption: value.caption,
    frameStyle: value.frameStyle as PostcardItem['frameStyle'], watermark: value.watermark, createdAt: value.createdAt,
    ...(isImageDataUrl(value.imageDataUrl) ? { imageDataUrl: value.imageDataUrl } : {}),
  }
}

export function isValidPostcard(value: unknown): value is PostcardItem {
  return readPostcard(value) !== null && isRecord(value) && isImageDataUrl(value.imageDataUrl)
}

function readExhibition(value: unknown): HeritageExhibition | null {
  if (!isRecord(value) || !textValue(value.themeTitle) || typeof value.curatorNote !== 'string'
    || !stringArray(value.itemIds) || !timestamp(value.updatedAt)) return null
  return {
    themeTitle: value.themeTitle, curatorNote: value.curatorNote, itemIds: [...value.itemIds], updatedAt: value.updatedAt,
    ...(value.previewVerified === true ? { previewVerified: true } : {}),
  }
}

export function isValidHeritageExhibition(value: unknown): value is HeritageExhibition {
  const exhibit = readExhibition(value)
  return exhibit !== null && exhibit.previewVerified === true && exhibit.itemIds.length >= 3 && exhibit.itemIds.length <= 5
    && new Set(exhibit.itemIds).size === exhibit.itemIds.length
    && exhibit.itemIds.every(id => HERITAGE_CANDIDATE_ITEMS.some(item => item.id === id))
}

function readDirectorsCut(value: unknown): DirectorsCutPlan | null {
  if (!isRecord(value) || !textValue(value.title) || !stringArray(value.momentIds)
    || typeof value.narrationStyle !== 'string' || !['EMPATHY', 'ARCHITECTURAL', 'COMMUNITY'].includes(value.narrationStyle)
    || value.durationSeconds !== 45 || !timestamp(value.updatedAt)) return null
  return {
    title: value.title, momentIds: [...value.momentIds], narrationStyle: value.narrationStyle as DirectorsCutPlan['narrationStyle'],
    durationSeconds: 45, updatedAt: value.updatedAt,
    completed: value.completed === true && value.rendered === true && value.playbackVerified === true,
    ...(value.rendered === true ? { rendered: true } : {}),
    ...(value.playbackVerified === true ? { playbackVerified: true } : {}),
  }
}

export function isValidDirectorsCut(value: unknown): value is DirectorsCutPlan {
  const film = readDirectorsCut(value)
  return film !== null && film.completed && film.rendered === true && film.playbackVerified === true
    && film.momentIds.length === 3 && new Set(film.momentIds).size === 3
    && film.momentIds.every(id => DIRECTORS_CUT_MOMENTS.some(moment => moment.id === id))
}

export function isValidFutureLetter(value: unknown): value is FutureLetterEntry {
  return isRecord(value) && textValue(value.promptId) && FUTURE_LETTER_PROMPTS.some(prompt => prompt.id === value.promptId)
    && textValue(value.recipient) && textValue(value.message) && timestamp(value.savedAt)
}

function normalizeM2OwnerState(value: unknown): M2OwnerState {
  if (!isRecord(value) || value.version !== 1) return initialM2OwnerState()
  const directorsCut = readDirectorsCut(value.directorsCut)
  if (directorsCut && !isValidDirectorsCut(value.directorsCut)) directorsCut.completed = false
  return {
    version: 1,
    activities: uniqueStrings(value.activities), echoesHeard: uniqueStrings(value.echoesHeard),
    npcTopicsSeen: uniqueStrings(value.npcTopicsSeen), cedarFallsSections: uniqueStrings(value.cedarFallsSections),
    consentAccepted: value.consentAccepted === true && value.consentVersion === 2, consentVersion: 2,
    postcards: Array.isArray(value.postcards) ? value.postcards.map(readPostcard).filter((item): item is PostcardItem => item !== null) : [],
    exhibition: readExhibition(value.exhibition), directorsCut,
    futureLetter: isValidFutureLetter(value.futureLetter) ? {
      promptId: value.futureLetter.promptId, recipient: value.futureLetter.recipient,
      message: value.futureLetter.message, savedAt: value.futureLetter.savedAt,
    } : null,
  }
}

export function initialM2OwnerState(): M2OwnerState {
  return {
    version: 1,
    activities: [],
    echoesHeard: [],
    npcTopicsSeen: [],
    cedarFallsSections: [],
    consentAccepted: false, consentVersion: 2,
    postcards: [],
    exhibition: null,
    directorsCut: null,
    futureLetter: null,
  }
}

export function readM2OwnerState(owner = 'guest', storage?: Pick<Storage, 'getItem'>): M2OwnerState {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(M2_STORAGE_PREFIX + owner)
    if (!raw) return initialM2OwnerState()
    return normalizeM2OwnerState(JSON.parse(raw))
  } catch {
    return initialM2OwnerState()
  }
}

export function saveM2OwnerState(owner = 'guest', state: M2OwnerState, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? globalThis.localStorage
    if (!target) return false
    target.setItem(M2_STORAGE_PREFIX + owner, JSON.stringify(normalizeM2OwnerState(state)))
    return true
  } catch {
    return false
  }
}

export function clearM2PersonalCreations(owner = 'guest', storage?: Pick<Storage, 'getItem' | 'setItem'>): M2OwnerState {
  const current = readM2OwnerState(owner, storage)
  const next: M2OwnerState = {
    ...current,
    consentAccepted: false, consentVersion: 2,
    postcards: [],
    exhibition: null,
    directorsCut: null,
    futureLetter: null,
  }
  if (!saveM2OwnerState(owner, next, storage)) throw new Error('Không thể xóa dữ liệu: bộ nhớ lưu trữ của thiết bị không khả dụng.')
  return next
}

export type ActivityCatalogEntry = {
  code: string
  title: string
  zone: string
  category: 'CRAFT_LABOR' | 'CULTURE_COMMUNITY' | 'UNDERGROUND_LIFE' | 'CREATIVE_REFLECTION' | 'BRIDGE_CONTEXT'
  truth: TruthClassification
  summary: string
  isCompleted: (ctx: ActivityCompletionContext) => boolean
}

export type ActivityCompletionContext = {
  facts: readonly string[]
  livingDone: readonly string[]
  riceProcessed: number
  memorialChoice?: string | null
  memorialPhase?: string | null
  atmosphereSeen?: boolean
  echoSeen?: boolean
  modelCompared?: boolean
  m2: M2OwnerState
}

export const ACTIVITY_CATALOG_24: readonly ActivityCatalogEntry[] = [
  {
    code: 'A01',
    title: 'Tưởng niệm yên lặng',
    zone: 'S5',
    category: 'CREATIVE_REFLECTION',
    truth: 'MODERN_MEMORIAL',
    summary: 'Đặt hoa, thắp hương hoặc đứng lặng tự nguyện tại không gian tưởng niệm Củ Chi hiện đại (khởi công 1993, khánh thành 1995).',
    isCompleted: ctx => Boolean(ctx.memorialPhase && ctx.memorialPhase !== 'IDLE'),
  },
  {
    code: 'A02',
    title: 'Nấu cơm bếp Hoàng Cầm',
    zone: 'L1-C',
    category: 'UNDERGROUND_LIFE',
    truth: 'RECONSTRUCTED',
    summary: 'Chuẩn bị nồi gạo, nước và quan sát nguyên lý tản khói qua các khoang đất ẩm dưới lòng đất.',
    isCompleted: ctx => ctx.livingDone.includes('A02_PREPARE') && ctx.livingDone.includes('A02_SMOKE'),
  },
  {
    code: 'A03',
    title: 'Tráng bánh tráng Củ Chi',
    zone: 'S2',
    category: 'CRAFT_LABOR',
    truth: 'RECONSTRUCTED',
    summary: 'Múc bột gạo lên khuôn vải căng hơi nước và trải bánh lên phen tre phơi nắng tại xóm nghề.',
    isCompleted: ctx => ctx.livingDone.includes('A03_BATTER') && ctx.livingDone.includes('A03_SPREAD'),
  },
  {
    code: 'A04',
    title: 'Giã gạo cùng nhau',
    zone: 'S2',
    category: 'CRAFT_LABOR',
    truth: 'RECONSTRUCTED',
    summary: 'Phối hợp 6 nhịp chày luân phiên cùng người dân xóm nghề và đối chiếu mẻ lúa trước/sau.',
    isCompleted: ctx => ctx.riceProcessed >= 6,
  },
  {
    code: 'A05',
    title: 'Đan lát dưới ánh trăng',
    zone: 'S3',
    category: 'CRAFT_LABOR',
    truth: 'RECONSTRUCTED',
    summary: 'Chọn nan tre và đan nong, thúng dưới ánh trăng chiều tối nơi bờ ruộng.',
    isCompleted: ctx => ctx.livingDone.includes('A05_STRIPS') && ctx.livingDone.includes('A05_WEAVE'),
  },
  {
    code: 'A06',
    title: 'Lao động đào địa đạo',
    zone: 'S3',
    category: 'CRAFT_LABOR',
    truth: 'RECONSTRUCTED',
    summary: 'Quan sát phân công đào đất sét và chuyền thúng đất tập thể tạo dựng mạng lưới hầm ngầm.',
    isCompleted: ctx => ctx.livingDone.includes('A06_DIG') && ctx.livingDone.includes('A06_BASKET'),
  },
  {
    code: 'A07',
    title: 'Một đêm văn nghệ',
    zone: 'S4',
    category: 'CULTURE_COMMUNITY',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Xem tiết mục ca kịch dưới ánh đèn dầu và hòa nhịp vỗ tay cổ vũ đời sống tinh thần.',
    isCompleted: ctx => ctx.livingDone.includes('A07_WATCH') && ctx.livingDone.includes('A07_CHORUS'),
  },
  {
    code: 'A08',
    title: 'Khi bầu trời đổi sắc',
    zone: 'S1 / S3 / S4 / L1-C',
    category: 'BRIDGE_CONTEXT',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Trải nghiệm nhịp cảnh báo trước – lắng nghe – trở lại nhịp sống yên bình, có phụ đề và quyền bỏ qua.',
    isCompleted: ctx => Boolean(ctx.atmosphereSeen),
  },
  {
    code: 'A09',
    title: 'Thanh niên đăng ký tòng quân',
    zone: 'S4',
    category: 'CULTURE_COMMUNITY',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Lắng nghe tâm sự đa chiều của người trẻ và gia đình trước lúc lên đường, giữ sắc thái nhân văn.',
    isCompleted: ctx => ctx.livingDone.includes('A09_LISTEN') && ctx.livingDone.includes('A09_FAREWELL'),
  },
  {
    code: 'A10',
    title: 'Hò đối đáp trên đồng ruộng',
    zone: 'S3',
    category: 'CULTURE_COMMUNITY',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Lắng nghe và đáp lại câu hò lao động đã biên tập trên cánh đồng lúa Củ Chi.',
    isCompleted: ctx => ctx.livingDone.includes('A10_LISTEN') && ctx.livingDone.includes('A10_CHANT'),
  },
  {
    code: 'A11',
    title: 'Phiên chợ kể chuyện',
    zone: 'S4',
    category: 'CULTURE_COMMUNITY',
    truth: 'RECONSTRUCTED',
    summary: 'Khám phá sạp nông sản, bánh tráng, đồ đan và kết nối nguồn hậu cần sẻ chia xuống hầm.',
    isCompleted: ctx => ctx.livingDone.includes('A11_BROWSE') && ctx.livingDone.includes('A11_CONNECT'),
  },
  {
    code: 'A12',
    title: 'Nghề dép cao su',
    zone: 'S2',
    category: 'CRAFT_LABOR',
    truth: 'RECONSTRUCTED',
    summary: 'Quan sát đế cao su tái chế, mở rãnh và luồn quai dép bằng dùi kẹp thủ công.',
    isCompleted: ctx => ctx.livingDone.includes('A12_SOLE') && ctx.livingDone.includes('A12_STRAP'),
  },
  {
    code: 'A13',
    title: 'Góc nghỉ ngơi và đồ dùng',
    zone: 'L2-C',
    category: 'UNDERGROUND_LIFE',
    truth: 'RECONSTRUCTED',
    summary: 'Xếp túi vải, dép cao su lên kệ gỗ và trải lại góc chiếu nghỉ ngơi nơi tầng hầm giữa.',
    isCompleted: ctx => ctx.livingDone.includes('A13_BELONGINGS') && ctx.livingDone.includes('A13_REST'),
  },
  {
    code: 'A14',
    title: 'Gánh nước và chia nước',
    zone: 'L3-C',
    category: 'UNDERGROUND_LIFE',
    truth: 'RECONSTRUCTED',
    summary: 'Múc nước từ chum dự trữ và chia sẻ nguồn nước quý cho cả gian bếp lẫn nơi chăm sóc.',
    isCompleted: ctx => ctx.livingDone.includes('A14_WATER') && ctx.livingDone.includes('A14_SHARE'),
  },
  {
    code: 'A15',
    title: 'Chuẩn bị góc chăm sóc',
    zone: 'L3-B',
    category: 'UNDERGROUND_LIFE',
    truth: 'RECONSTRUCTED',
    summary: 'Chuẩn bị khăn sạch, nước ấm tại bàn sơ cứu và đưa khay vật dụng tới bên giường chăm sóc.',
    isCompleted: ctx => ctx.livingDone.includes('A15_CLOTH') && ctx.livingDone.includes('A15_CARE'),
  },
  {
    code: 'A16',
    title: 'Đi theo tiếng vọng',
    zone: 'S1 / S2 / S3 / S4 / L1-C / L2-B',
    category: 'BRIDGE_CONTEXT',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Lần theo âm thanh không gian (hoặc chỉ dẫn chữ tương đương khi tắt tiếng) để gặp con người và câu chuyện.',
    isCompleted: ctx => Boolean(ctx.echoSeen || ctx.m2.echoesHeard.length > 0),
  },
  {
    code: 'A17',
    title: 'Hai lớp thời gian, một địa điểm',
    zone: 'S4 / L2-D / S5',
    category: 'BRIDGE_CONTEXT',
    truth: 'GATED_SOURCE_PENDING',
    summary: 'Cầu nối đối chiếu 1967 và hiện tại; giữ trạng thái khóa tọa độ thực địa cho tới khi có hai lớp tư liệu cùng vị trí đủ căn cứ.',
    // Reading a limitation or completing synthesis cannot supply the missing same-site sources.
    isCompleted: () => false,
  },
  {
    code: 'A18',
    title: 'Máy ảnh thời gian & Bưu thiếp',
    zone: 'Mọi khu / L2-B',
    category: 'CREATIVE_REFLECTION',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Lưu lại khung hình ấn tượng kèm chú thích cá nhân và nhãn “TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO”.',
    isCompleted: ctx => ctx.m2.consentAccepted && ctx.m2.postcards.some(isValidPostcard),
  },
  {
    code: 'A19',
    title: 'Triển lãm di sản của tôi',
    zone: 'Atlas / L2-B',
    category: 'CREATIVE_REFLECTION',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Chọn 3–5 hiện vật, công việc hoặc mảnh chuyện để sắp xếp thành góc trưng bày ký ức cá nhân.',
    isCompleted: ctx => ctx.m2.consentAccepted && isValidHeritageExhibition(ctx.m2.exhibition),
  },
  {
    code: 'A20',
    title: 'Phim hành trình 30–60 giây',
    zone: 'Atlas / S5',
    category: 'CREATIVE_REFLECTION',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Kết hợp ba minh họa giáo dục gốc với phụ đề thành trình chiếu tóm tắt hành trình 45 giây.',
    isCompleted: ctx => ctx.m2.consentAccepted && isValidDirectorsCut(ctx.m2.directorsCut),
  },
  {
    code: 'A21',
    title: 'Một lá thư gửi tương lai',
    zone: 'L2-B / S5',
    category: 'CREATIVE_REFLECTION',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Đọc mảnh ghi chép tại phòng họp ngầm (L2-B) và lưu lại lời nhắn suy ngẫm gửi từ hôm nay.',
    isCompleted: ctx => ctx.m2.consentAccepted && isValidFutureLetter(ctx.m2.futureLetter),
  },
  {
    code: 'A22',
    title: 'Trò chuyện tự do với người dân',
    zone: 'S1 / S2 / S3 / S4 / L1-C / L2-B / L2-C / L3-B / L3-C',
    category: 'CULTURE_COMMUNITY',
    truth: 'FICTIONAL_EDUCATIONAL',
    summary: 'Trò chuyện nhiều lượt theo chủ đề với các nhân vật hư cấu giáo dục; lời kể đổi theo những gì bạn đã khám phá.',
    isCompleted: ctx => Boolean(ctx.echoSeen || ctx.m2.npcTopicsSeen.length > 0),
  },
  {
    code: 'A23',
    title: 'Sa bàn bối cảnh chiến dịch Cedar Falls',
    zone: 'S4',
    category: 'BRIDGE_CONTEXT',
    truth: 'RECONSTRUCTED',
    summary: 'Đọc bản đồ bối cảnh tháng 01/1967 có dẫn nguồn [R01, R02, R03], phân biệt vùng Tam giác sắt với địa đạo Củ Chi.',
    isCompleted: ctx => ctx.livingDone.includes('A23_CAMPAIGN'),
  },
  {
    code: 'A24',
    title: 'Xem mô hình tương tác & đối chiếu tư liệu',
    zone: 'L2-D',
    category: 'BRIDGE_CONTEXT',
    truth: 'RECONSTRUCTED',
    summary: 'Tách/ghép 4 lớp địa đạo trên sa bàn L2-D kèm sơ đồ 2D; phần video/360 thực địa giữ cổng chờ tư liệu bản quyền.',
    isCompleted: ctx => Boolean(ctx.modelCompared),
  },
]

export type ActivityStatus = 'LOCKED' | 'PARTIAL' | 'COMPLETE' | 'AVAILABLE'

/** Catalog status includes source scope; A24's working model does not clear its gated video/360 material. */
export function getActivityStatus(entryOrCode: ActivityCatalogEntry | string, ctx: ActivityCompletionContext): ActivityStatus {
  const entry = typeof entryOrCode === 'string' ? ACTIVITY_CATALOG_24.find(item => item.code === entryOrCode) : entryOrCode
  if (!entry || entry.truth === 'GATED_SOURCE_PENDING') return 'LOCKED'
  if (entry.code === 'A24') return ctx.modelCompared ? 'PARTIAL' : 'AVAILABLE'
  if (entry.isCompleted(ctx)) return 'COMPLETE'
  const partial = ctx.livingDone.some(id => id.startsWith(`${entry.code}_`))
    || (entry.code === 'A04' && ctx.riceProcessed > 0)
    || (entry.code === 'A18' && ctx.m2.postcards.length > 0)
    || (entry.code === 'A19' && ctx.m2.exhibition !== null)
    || (entry.code === 'A20' && ctx.m2.directorsCut !== null)
    || (entry.code === 'A21' && (ctx.livingDone.includes('L2B_LETTER') || ctx.m2.futureLetter !== null))
    || (entry.code === 'A23' && ctx.m2.cedarFallsSections.length > 0)
  return partial ? 'PARTIAL' : 'AVAILABLE'
}

export type CrossActivityChain = {
  code: 'C01' | 'C02' | 'C03' | 'C04' | 'C05' | 'C06' | 'C07' | 'C08'
  title: string
  steps: readonly string[]
  meaning: string
  callbackLine: string
  isUnlocked: (ctx: ActivityCompletionContext) => boolean
  progressCount: (ctx: ActivityCompletionContext) => { done: number; total: number }
}

const hasActivity = (code: string, ctx: ActivityCompletionContext): boolean =>
  ACTIVITY_CATALOG_24.find(a => a.code === code)?.isCompleted(ctx) ?? false

export const CROSS_ACTIVITY_CHAINS_8: readonly CrossActivityChain[] = [
  {
    code: 'C01',
    title: 'Tuyến Lương thực',
    steps: ['A04', 'A03', 'A02', 'A14'],
    meaning: 'Hạt gạo đi qua bàn tay giã gạo, khuôn bánh tráng, căn bếp không khói và từng gàu nước chia sẻ dưới đất.',
    callbackLine: 'Người nấu bếp (L1-C) & Người tráng bánh (S2): “Mẻ gạo giã trên sân và gàu nước tầng sâu đã gặp nhau trong bữa ăn ấm của cả xóm.”',
    progressCount: ctx => {
      const checks = [hasActivity('A04', ctx), hasActivity('A03', ctx), hasActivity('A02', ctx), hasActivity('A14', ctx)]
      return { done: checks.filter(Boolean).length, total: 4 }
    },
    isUnlocked: ctx => ['A04', 'A03', 'A02', 'A14'].every(c => hasActivity(c, ctx)),
  },
  {
    code: 'C02',
    title: 'Tuyến Công trình',
    steps: ['A06', 'Q1', 'Q2', 'Q3'],
    meaning: 'Mỗi đoạn hầm, nắp cửa ngụy trang và lỗ thông khí đều là kết quả của lao động tập thể bền bỉ.',
    callbackLine: 'Người đào đất (S3): “Từng thúng đất chuyền tay trên mặt ruộng chính là điểm khởi đầu của ba tầng hầm vững chãi dưới chân bạn.”',
    progressCount: ctx => {
      const checks = [
        hasActivity('A06', ctx),
        ctx.facts.includes('ENTRANCE_CONFIRMED'),
        ctx.facts.includes('AIR_MEANING_CONFIRMED'),
        ctx.facts.includes('STRUCT_MEANING_CONFIRMED'),
      ]
      return { done: checks.filter(Boolean).length, total: 4 }
    },
    isUnlocked: ctx =>
      hasActivity('A06', ctx) &&
      ctx.facts.includes('ENTRANCE_CONFIRMED') &&
      ctx.facts.includes('AIR_MEANING_CONFIRMED') &&
      ctx.facts.includes('STRUCT_MEANING_CONFIRMED'),
  },
  {
    code: 'C03',
    title: 'Tuyến Nghề và sáng tạo',
    steps: ['A12', 'A13', 'A22'],
    meaning: 'Những vật dụng nhỏ như đôi dép cao su và chiếc túi vải giữ nhịp sống bình thường trong hoàn cảnh đặc biệt.',
    callbackLine: 'Người thợ dép (S2) & Người giữ góc nghỉ (L2-C): “Đôi dép luồn quai trên sân nắng nay nằm gọn bên góc chiếu nghỉ dưới hầm.”',
    progressCount: ctx => {
      const checks = [hasActivity('A12', ctx), hasActivity('A13', ctx), hasActivity('A22', ctx)]
      return { done: checks.filter(Boolean).length, total: 3 }
    },
    isUnlocked: ctx => ['A12', 'A13', 'A22'].every(c => hasActivity(c, ctx)),
  },
  {
    code: 'C04',
    title: 'Tuyến Văn hóa cộng đồng',
    steps: ['A10', 'A07', 'A09', 'A21'],
    meaning: 'Tiếng hò đồng ruộng, đêm văn nghệ, lời tiễn biệt tuổi trẻ và lá thư gửi tương lai đặt niềm vui cạnh hy vọng.',
    callbackLine: 'Đội văn nghệ (S4) & Người ghi chép (L2-B): “Câu hò ngoài đồng và lời ca dưới ánh đèn dầu đã hóa thành dòng chữ gửi lại cho mai sau.”',
    progressCount: ctx => {
      const checks = [hasActivity('A10', ctx), hasActivity('A07', ctx), hasActivity('A09', ctx), hasActivity('A21', ctx)]
      return { done: checks.filter(Boolean).length, total: 4 }
    },
    isUnlocked: ctx => ['A10', 'A07', 'A09', 'A21'].every(c => hasActivity(c, ctx)),
  },
  {
    code: 'C05',
    title: 'Tuyến Con người',
    steps: ['A11', 'A04', 'A15', 'Q5'],
    meaning: 'Một cộng đồng đứng vững nhờ sự nâng đỡ lẫn nhau từ phiên chợ mặt đất tới giường chăm sóc tầng sâu.',
    callbackLine: 'Người chăm sóc (L3-B): “Mảnh vải sạch từ phiên chợ và phần gạo giã chung đã trở thành sự chăm lo ấm áp dưới lòng đất.”',
    progressCount: ctx => {
      const checks = [hasActivity('A11', ctx), hasActivity('A04', ctx), hasActivity('A15', ctx), ctx.facts.includes('CARE_MEANING_CONFIRMED')]
      return { done: checks.filter(Boolean).length, total: 4 }
    },
    isUnlocked: ctx => hasActivity('A11', ctx) && hasActivity('A04', ctx) && hasActivity('A15', ctx) && ctx.facts.includes('CARE_MEANING_CONFIRMED'),
  },
  {
    code: 'C06',
    title: 'Tuyến Không gian / thời gian',
    steps: ['Q3', 'A17', 'A23'],
    meaning: 'Hiểu cả cấu trúc ba tầng dưới đất lẫn bối cảnh lịch sử tháng 01/1967 và giới hạn tư liệu đối chiếu trên mặt đất.',
    callbackLine: 'Chrono: “Khi đặt mặt cắt ba tầng cạnh sa bàn bối cảnh 01/1967, ta hiểu vì sao từng lớp đất lại gắn chặt với lịch sử vùng đất này.”',
    progressCount: ctx => {
      const checks = [ctx.facts.includes('STRUCT_MEANING_CONFIRMED'), hasActivity('A17', ctx), hasActivity('A23', ctx)]
      return { done: checks.filter(Boolean).length, total: 3 }
    },
    isUnlocked: ctx => ctx.facts.includes('STRUCT_MEANING_CONFIRMED') && hasActivity('A17', ctx) && hasActivity('A23', ctx),
  },
  {
    code: 'C07',
    title: 'Tuyến Ký ức cá nhân',
    steps: ['A16', 'A18', 'A19', 'A20'],
    meaning: 'Người chơi đi từ lắng nghe tiếng vọng đến lưu giữ bưu thiếp, trưng bày di sản và kể lại thước phim hành trình.',
    callbackLine: 'Kha: “Từ một người ghé thăm, bạn đã trở thành người lưu giữ và kể lại câu chuyện Mạch Sống bằng góc nhìn trân trọng.”',
    progressCount: ctx => {
      const checks = [hasActivity('A16', ctx), hasActivity('A18', ctx), hasActivity('A19', ctx), hasActivity('A20', ctx)]
      return { done: checks.filter(Boolean).length, total: 4 }
    },
    isUnlocked: ctx => ['A16', 'A18', 'A19', 'A20'].every(c => hasActivity(c, ctx)),
  },
  {
    code: 'C08',
    title: 'Tuyến Khép lại',
    steps: ['Q6', 'Epilogue', 'A01', 'A21'],
    meaning: 'Lịch sử khép lại bằng sự hội tụ Mạch Sống, bước trở về Củ Chi hôm nay, nghi thức tri ân và lời nhắn gửi tương lai.',
    callbackLine: 'Chrono: “Hành trình 1967 khép lại nơi sân tưởng niệm hôm nay, nhưng lời nhắn bạn gửi lại vẫn tiếp nối mạch ký ức ấy.”',
    progressCount: ctx => {
      const checks = [
        ctx.facts.includes('MS_SYNTHESIS_COMPLETE'),
        ctx.facts.includes('MS_SYNTHESIS_COMPLETE') && Boolean(ctx.memorialPhase),
        hasActivity('A01', ctx),
        hasActivity('A21', ctx),
      ]
      return { done: checks.filter(Boolean).length, total: 4 }
    },
    isUnlocked: ctx => ctx.facts.includes('MS_SYNTHESIS_COMPLETE') && hasActivity('A01', ctx) && hasActivity('A21', ctx),
  },
]

export type NpcTopicDefinition = {
  id: string
  question: string
  title: string
  reply: (ctx: ActivityCompletionContext) => string
}

export type ZoneNpcProfile = {
  targetId: string
  zone: string
  speakerLabel: string
  roleTitle: string
  sceneIntro: string
  echoId: string
  echoPrompt: string
  echoDescription: string
  topics: readonly NpcTopicDefinition[]
}

export const ZONE_NPC_PROFILES: Record<string, ZoneNpcProfile> = {
  NPC_LIAISON: {
    targetId: 'NPC_LIAISON',
    zone: 'S1',
    speakerLabel: 'CHIẾN SĨ GIAO LIÊN · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người dẫn đường thầm lặng nơi chòi lá bìa rừng',
    sceneIntro: 'Dưới mái chòi lá khuất dưới tán cây, nữ chiến sĩ giao liên chỉnh lại vành nón tai bèo xanh lá, tấm áo choàng vải dù ngụy trang và chiếc khăn rằn Nam Bộ quàng cổ.',
    echoId: 'ECHO_S1_CANOPY',
    echoPrompt: 'Tiếng lá khô xào xạc rất khẽ và tiếng quai dép cao su dừng lại dưới mái chòi phía tây.',
    echoDescription: 'Âm thanh rừng cây và tiếng trò chuyện nhỏ của người giao liên tại bìa rừng S1. Âm thanh tổng hợp minh họa.',
    topics: [
      {
        id: 'S1_LIAISON_ATTIRE',
        question: 'Vì sao các anh chị thường đội nón tai bèo, quàng khăn rằn và khoác áo vải dù?',
        title: 'Trang phục hòa vào tán lá rừng Củ Chi',
        reply: () =>
          'Ở vùng rừng chồi Củ Chi, chiếc nón tai bèo mềm che nắng mưa mà không vướng cành thấp; tấm vải dù pháo sáng hoặc dù hàng thu được may lại thành áo choàng ngụy trang tiệp màu lá mục; còn chiếc khăn rằn Nam Bộ và đôi dép cao su thì gắn bó với từng bước chân giao liên.',
      },
      {
        id: 'S1_LIAISON_OBSERVE',
        question: 'Đi giữa bìa rừng này cần chú ý điều gì để hiểu đời sống nơi đây?',
        title: 'Quan sát bằng đôi mắt chậm rãi và tôn trọng',
        reply: ctx =>
          ctx.facts.includes('ENTRANCE_CONFIRMED')
            ? 'Bạn đã tự mình nhận ra quy luật ngụy trang của mặt đất rừng Củ Chi rồi đó. Từng chiếc lá phủ lại đều là sự cẩn trọng để bảo vệ cả một cộng đồng đang sinh sống bên dưới.'
            : 'Rừng Củ Chi nhìn thoáng qua chỉ thấy cây bụi và lá rụng, nhưng nếu quan sát kỹ chỗ lối mòn dừng lại hay sắc lá thay đổi trên mặt đất, bạn sẽ dần đọc được câu chuyện ẩn dưới tán rừng.',
      },
    ],
  },
  NPC_CRAFTER: {
    targetId: 'NPC_CRAFTER',
    zone: 'S2',
    speakerLabel: 'NGƯỜI TRÁNG BÁNH · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người giữ lửa bếp bánh tráng xóm nghề',
    sceneIntro: 'Hơi nước từ nồi tráng bánh bốc lên thơm mùi gạo mới. Người tráng bánh ngừng tay gạt ống tre, mỉm cười chào bạn.',
    echoId: 'ECHO_S2_STEAM',
    echoPrompt: 'Tiếng nước sôi lăn tăn và tiếng phen tre khẽ chạm bên hiên nhà.',
    echoDescription: 'Âm thanh hơi nước và tiếng nan tre đưa bạn tới góc bếp tráng bánh Củ Chi. Âm thanh tổng hợp minh họa.',
    topics: [
      {
        id: 'S2_CRAFT_RICE',
        question: 'Hạt gạo từ cối giã chuyển thành bánh tráng thế nào?',
        title: 'Từ cối giã gạo đến phen bánh phơi nắng',
        reply: ctx =>
          ctx.riceProcessed >= 6
            ? 'Bạn vừa giúp giã xong mẻ gạo bên sân đó! Gạo giã đều tay thì ngâm xay bột mới mịn. Tráng mỏng trên mặt vải căng hơi nước rồi phơi nắng, bánh để dành được rất lâu.'
            : 'Muốn có bột ngon phải bắt đầu từ cối giã gạo giữa sân. Khi nào rảnh tay, bạn thử qua phối hợp vài nhịp chày rồi quay lại xem mẻ bột này nhé.',
      },
      {
        id: 'S2_CRAFT_UNDERGROUND',
        question: 'Bánh tráng được dùng ra sao trong đời sống dưới hầm?',
        title: 'Lương thực gọn nhẹ cho những ngày dưới đất',
        reply: ctx =>
          ctx.facts.includes('KITCHEN_MEANING_CONFIRMED')
            ? 'Bạn đã xuống bếp Hoàng Cầm (L1-C) rồi nên hiểu rõ: khi không thể nhóm lửa lâu, bánh tráng chỉ cần nhúng qua chút nước dự trữ từ tầng sâu (L3-C) là thành bữa ăn gọn nhẹ cho mọi người.'
            : 'Những khi phải xuống hầm dài ngày, bánh tráng phơi khô là thứ quý lắm: nhẹ, dễ cất trong túi vải, chỉ cần thấm chút nước là ăn được ngay.',
      },
      {
        id: 'S2_CRAFT_LIFE',
        question: 'Vì sao giữa hoàn cảnh khó khăn mọi người vẫn giữ nghề?',
        title: 'Giữ nghề là giữ nhịp sống quê hương',
        reply: () =>
          'Còn nghe tiếng chày giã gạo, còn thấy phen bánh trắng phơi bên hiên là bà con còn thấy nếp nhà mình vững chãi. Nghề truyền thống nuôi sống con người cả lúc bình yên lẫn lúc thử thách.',
      },
    ],
  },
  NPC_COBBLER: {
    targetId: 'NPC_COBBLER',
    zone: 'S2',
    speakerLabel: 'NGƯỜI THỢ DÉP · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người chế tác dép cao su tái chế bên chồng vỏ lốp cũ',
    sceneIntro: 'Bên chồng vỏ lốp xe cao su cũ xếp sát mái hiên, người chiến sĩ thợ dép khoác áo vải dù ngụy trang đang miết lại quai dép râu bằng chiếc dùi kẹp nhỏ.',
    echoId: 'ECHO_S2_COBBLER',
    echoPrompt: 'Tiếng dùi gỗ gõ nhịp nhẹ trên mặt bàn thợ phía đông sân.',
    echoDescription: 'Tiếng gõ đều đặn của người thợ làm dép cao su bên hiên xóm nghề. Âm thanh tổng hợp phục vụ dẫn hướng.',
    topics: [
      {
        id: 'S2_SHOE_MATERIAL',
        question: 'Đôi dép này được làm từ những vật liệu gì?',
        title: 'Tận dụng từng mảnh cao su cũ',
        reply: () =>
          'Đế cắt từ vỏ lốp xe cũ dày và bền, còn quai cắt từ ruột cao su dẻo. Không cần đinh hay keo, chỉ mở rãnh nhỏ rồi dùng dùi luồn quai khít vào đế là đi mưa lội bùn đều chắc chân.',
      },
      {
        id: 'S2_SHOE_TUNNEL',
        question: 'Đôi dép đi về đâu trong hành trình của người dân?',
        title: 'Dấu chân từ mặt đất xuống góc hầm nghỉ',
        reply: ctx =>
          ctx.livingDone.includes('A13_BELONGINGS')
            ? 'Bạn đã xếp đôi dép lên kệ ở góc nghỉ tầng 2 (L2-C) rồi đó. Mỗi đôi dép làm ở sân này đều theo chân người dân qua bao lối hầm hẹp.'
            : 'Khi xuống khu nghỉ ngơi ở tầng hầm giữa (L2-C), bạn sẽ thấy những đôi dép như thế này được xếp gọn bên chiếu sau một ngày làm việc.',
      },
    ],
  },
  NPC_WEAVER: {
    targetId: 'NPC_WEAVER',
    zone: 'S3',
    speakerLabel: 'NGƯỜI ĐAN TRE · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người đan nong, thúng bên bờ ruộng đêm trăng',
    sceneIntro: 'Dưới ánh trăng thanh, đôi tay người đan tre thoăn thoắt cài từng nan mỏng, tiếng tre cọ vào nhau xào xạc.',
    echoId: 'ECHO_S3_BAMBOO',
    echoPrompt: 'Tiếng nan tre đan xào xạc hòa cùng tiếng gió đồng ruộng.',
    echoDescription: 'Âm thanh nan tre chạm nhau dưới ánh trăng nơi góc chiếu đan lát. Âm thanh tổng hợp minh họa.',
    topics: [
      {
        id: 'S3_WEAVE_MOON',
        question: 'Vì sao bà con thường đan lát và làm đồng dưới ánh trăng?',
        title: 'Nhịp sống đêm trăng trên cánh đồng Củ Chi',
        reply: () =>
          'Ban ngày nắng gắt và nhiều biến động, nên đêm trăng sáng là khoảng thời gian quý để bà con vừa làm đồng, vừa ngồi bên nhau đan thúng, đan nong và trò chuyện.',
      },
      {
        id: 'S3_WEAVE_BASKET',
        question: 'Những chiếc thúng tre này giúp ích gì cho công trình dưới đất?',
        title: 'Chiếc thúng nối nghề đan với việc đào hầm',
        reply: ctx =>
          ctx.livingDone.includes('A06_BASKET')
            ? 'Chính chiếc thúng bạn vừa chuyền tay ở khu đào đất bên kia được đan từ chiếu tre này. Hàng ngàn thúng đất sét đã được chuyển đi nhẹ nhàng nhờ những nan tre dẻo dai.'
            : 'Không chỉ đựng lúa gạo đâu, những chiếc thúng đan dày còn dùng để chuyền đất sét khi đào hầm ở góc đồng bên kia nữa.',
      },
    ],
  },
  NPC_EXCAVATOR: {
    targetId: 'NPC_EXCAVATOR',
    zone: 'S3',
    speakerLabel: 'NGƯỜI ĐÀO ĐẤT · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người phụ trách tổ lao động đào hầm và chuyền đất',
    sceneIntro: 'Người lao động lau mồ hôi trên trán, chỉ tay về phía những chiếc thúng đựng đất sét pha sỏi đỏ nâu.',
    echoId: 'ECHO_S3_DIG',
    echoPrompt: 'Tiếng cuốc chạm đất sét trầm đục và tiếng thúng tre chuyền tay.',
    echoDescription: 'Tiếng lao động nhịp nhàng từ khu đào đất phía đông cánh đồng. Âm thanh tổng hợp giáo dục.',
    topics: [
      {
        id: 'S3_DIG_SOIL',
        question: 'Chất đất Củ Chi có gì đặc biệt để đào được nhiều tầng?',
        title: 'Đất sét pha sỏi kết dính tự nhiên',
        reply: ctx =>
          ctx.facts.includes('STRUCT_MEANING_CONFIRMED')
            ? 'Bạn đã nối sơ đồ ba tầng hầm (Q3) nên thấy rõ: tầng đất sét pha sỏi đá ong ở đây có độ kết dính rất cao, nhờ vậy các khoang hầm mới đứng vững qua nhiều mùa mưa nắng.'
            : 'Đất ở vùng gò Củ Chi là đất sét pha sỏi kết dính rất chặt. Khi đào đúng độ sâu và độ vòm, vách đất tự giữ được kết cấu mà ít bị sụt lở.',
      },
      {
        id: 'S3_DIG_TEAMWORK',
        question: 'Làm sao chuyển hết lượng đất đào lên mà vẫn kín đáo?',
        title: 'Sức mạnh của sự phối hợp tập thể',
        reply: () =>
          'Một người đào trong lòng đất thì trên mặt ruộng có cả hàng người chuyền thúng, đem đất rải đều ra bờ ruộng, hố trũng rồi phủ lá lên. Mỗi mét hầm là mồ hôi của cả cộng đồng.',
      },
    ],
  },
  NPC_TROUPE: {
    targetId: 'NPC_TROUPE',
    zone: 'S4',
    speakerLabel: 'NGƯỜI ĐỘI VĂN NGHỆ · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người giữ nhịp đàn và lời ca sân sinh hoạt',
    sceneIntro: 'Bên ánh đèn dầu ấm áp dưới mái tre, người nghệ sĩ quần chúng đang chỉnh lại dây đàn trước giờ diễn tiếp theo.',
    echoId: 'ECHO_S4_SONG',
    echoPrompt: 'Tiếng đàn mộc mạc và tiếng vỗ tay rộn ràng từ sân mái tre.',
    echoDescription: 'Tiếng nhạc và tiếng trò chuyện ấm áp tại sân sinh hoạt cộng đồng. Âm thanh tổng hợp minh họa.',
    topics: [
      {
        id: 'S4_ART_SPIRIT',
        question: 'Tiếng hát có ý nghĩa gì sau những giờ phút căng thẳng?',
        title: 'Giữ ngọn lửa lạc quan giữa đời thường',
        reply: ctx =>
          hasActivity('A10', ctx)
            ? 'Từ câu hò bạn vừa đáp trên đồng ruộng (S3) tới khúc hát trên sân này (S4), lời ca giúp bà con quên đi mệt nhọc và nhớ rằng mình đang giữ gìn một cuộc sống có tình, có nghĩa.'
            : 'Sau mỗi lần bầu trời đổi sắc (A08), khi tiếng ù xa dần và đèn dầu thắp lại, một khúc hát quê hương giúp mọi người thấy lòng mình bình tĩnh và gắn bó hơn.',
      },
      {
        id: 'S4_ART_MARKET',
        question: 'Sân sinh hoạt này còn kết nối những hoạt động nào của xóm?',
        title: 'Nơi gặp gỡ của chợ quê, văn nghệ và tuổi trẻ',
        reply: () =>
          'Sân này ban ngày là phiên chợ nhỏ trao đổi bánh tráng, rau củ; tối đến là nơi biểu diễn văn nghệ và cũng là nơi bà con tiễn những người trẻ lên đường.',
      },
    ],
  },
  NPC_YOUTH: {
    targetId: 'NPC_YOUTH',
    zone: 'S4',
    speakerLabel: 'THANH NIÊN ĐĂNG KÝ TÒNG QUÂN · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người trẻ áo xanh chàm quấn khăn rằn tại Điểm đăng ký tòng quân',
    sceneIntro: 'Trong gian nhà phên tre ấm ánh đèn dầu, cạnh bàn thờ Tổ quốc treo lá cờ nửa đỏ nửa xanh sao vàng và bình hoa cúc vàng, người thanh niên vừa ghi tên vào sổ tòng quân.',
    echoId: 'ECHO_S4_YOUTH',
    echoPrompt: 'Tiếng trò chuyện trầm ấm và lời dặn dò bên bàn gỗ phía đông sân.',
    echoDescription: 'Lời trò chuyện chân thành của những người trẻ và gia đình tại góc sân sinh hoạt.',
    topics: [
      {
        id: 'S4_YOUTH_THOUGHTS',
        question: 'Bạn nghĩ gì trước giờ tạm biệt gia đình và xóm nhỏ?',
        title: 'Nỗi nhớ nhà và ước mong ngày bình yên',
        reply: () =>
          'Ai lớn lên trên mảnh đất này cũng thương ruộng lúa, thương mái nhà và bữa cơm chiều của mẹ. Quyết định lên đường không phải vì thích hiểm nguy, mà vì mong sớm có ngày quê mình được sống yên lành.',
      },
      {
        id: 'S4_YOUTH_LETTER',
        question: 'Mảnh thư bạn đang giữ viết về điều gì?',
        title: 'Lời nhắn gửi tới những người ở tương lai',
        reply: ctx =>
          hasActivity('A21', ctx)
            ? 'Bạn cũng đã viết một lá thư gửi tương lai ở phòng họp tầng 2 (L2-B) rồi phải không? Những dòng chữ của chúng tôi năm 1967 và suy ngẫm của bạn hôm nay đã gặp nhau qua thời gian.'
            : 'Tôi viết vài dòng gửi lại ở bàn họp tầng hầm giữa (L2-B), mong những người đến sau sẽ hiểu chúng tôi đã yêu cuộc sống và mảnh đất này biết nhường nào.',
      },
    ],
  },
  NPC_ORGANIZER: {
    targetId: 'NPC_ORGANIZER',
    zone: 'L2-B',
    speakerLabel: 'NGƯỜI GHI CHÉP · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người phụ trách sổ phân công và lưu giữ thư từ tại L2-B',
    sceneIntro: 'Dưới ánh đèn dầu nơi phòng họp tầng 2, người ghi chép đang đối chiếu sơ đồ các tổ lao động, bếp ăn và trạm chăm sóc.',
    echoId: 'ECHO_L2B_PEN',
    echoPrompt: 'Tiếng lật trang sổ giấy và tiếng trao đổi khẽ bên bàn họp gỗ.',
    echoDescription: 'Âm thanh lật sổ và tiếng thì thầm bàn bạc công việc trong phòng họp ngầm L2-B.',
    topics: [
      {
        id: 'L2B_ORG_COORDINATE',
        question: 'Căn phòng này kết nối công việc của các tầng hầm như thế nào?',
        title: 'Trái tim tổ chức của đời sống dưới lòng đất',
        reply: ctx =>
          ctx.facts.includes('CARE_MEANING_CONFIRMED') && ctx.facts.includes('KITCHEN_MEANING_CONFIRMED')
            ? 'Bạn đã đi qua cả gian bếp (L1-C), nguồn nước (L3-C) và nơi chăm sóc (L3-B). Tại bàn họp này, từng gàu nước, từng phần cơm và lịch đào hầm được điều phối để không ai bị bỏ lại phía sau.'
            : 'Mọi việc dưới lòng đất từ giờ nấu bếp ở tầng 1, góc nghỉ tầng 2 đến việc chia nước và chăm sóc ở tầng 3 đều cần sự bàn bạc, phân công rõ ràng tại đây.',
      },
      {
        id: 'L2B_ORG_LETTER',
        question: 'Vì sao trên bàn họp lại có những phong thư để ngỏ?',
        title: 'Những lá thư gửi cho ngày mai bình yên',
        reply: () =>
          'Giữa những trang sổ phân công công việc, nhiều người vẫn viết lại vài dòng ước nguyện cho gia đình và cho thế hệ mai sau. Bạn có thể đọc và gửi lại lời nhắn của chính mình ở góc bàn bên phải (A21).',
      },
    ],
  },
  NPC_MENDER: {
    targetId: 'NPC_MENDER',
    zone: 'L2-C',
    speakerLabel: 'NGƯỜI GIỮ GÓC NGHỈ · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người sắp xếp đồ dùng và khâu vá tại khu nghỉ tầng 2',
    sceneIntro: 'Bên kệ gỗ nhỏ, người phụ việc đang xếp lại chiếc túi vải và đôi dép cao su để nhường chỗ nằm nghỉ cho người vừa đổi ca.',
    echoId: 'ECHO_L2C_REST',
    echoPrompt: 'Tiếng trải chiếu cói và tiếng đặt túi vải nhẹ nhàng bên kệ gỗ.',
    echoDescription: 'Âm thanh sinh hoạt yên tĩnh trong khoang nghỉ ngơi tầng hầm giữa L2-C.',
    topics: [
      {
        id: 'L2C_REST_ORDER',
        question: 'Vì sao việc xếp gọn từng món đồ nhỏ lại quan trọng đến vậy?',
        title: 'Trật tự nhỏ giữ sự bình tâm trong không gian hẹp',
        reply: ctx =>
          hasActivity('A12', ctx)
            ? 'Đôi dép cao su bạn vừa thấy người thợ làm trên sân (S2) khi xuống đây đều được lau sạch, đặt ngay ngắn lên kệ. Không gian chỉ rộng vài mét vuông nên sự ngăn nắp chính là sự tôn trọng nhau.'
            : 'Khoang hầm nhỏ nhưng nhiều người thay phiên nghỉ ngơi. Xếp gọn chiếc túi, đôi dép và vuốt phẳng góc chiếu giúp người vừa làm việc mệt có ngay một chỗ ngả lưng ấm áp.',
      },
      {
        id: 'L2C_REST_NEIGHBORS',
        question: 'Từ góc nghỉ này liên hệ thế nào với phòng họp và tầng sâu?',
        title: 'Điểm dừng chân giữa các tầng sinh hoạt',
        reply: () =>
          'Từ đây qua ngách bên phải là tới phòng họp tầng 2 (L2-B), còn xuống thang sâu hơn là tới nơi chăm sóc (L3-B) và nguồn nước (L3-C). Nghỉ lại sức rồi mọi người lại tiếp tục phần việc của mình.',
      },
    ],
  },
  NPC_CARER: {
    targetId: 'NPC_CARER',
    zone: 'L3-B',
    speakerLabel: 'CHIẾN SĨ QUÂN Y · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Chiến sĩ quân y chăm sóc bên giường chiếu cói tầng 3',
    sceneIntro: 'Dưới ánh sáng dịu của ngọn đèn dầu truyền thống bóng thủy tinh cao, người chiến sĩ quân y đội nón tai bèo xanh lá đang ân cần chăm sóc người dân quấn khăn rằn nằm nghỉ bên chiếc võng cáng đòn tre dựng góc vách.',
    echoId: 'ECHO_L3B_CARE',
    echoPrompt: 'Tiếng vắt khăn nước ấm và lời hỏi thăm khẽ bên giường tre.',
    echoDescription: 'Âm thanh chăm sóc tận tình trong không gian sâu và yên tĩnh của tầng 3 (L3-B).',
    topics: [
      {
        id: 'L3B_CARE_WATER',
        question: 'Việc chăm sóc dưới tầng sâu phụ thuộc vào những điều kiện nào?',
        title: 'Mỗi tấm khăn sạch đều gắn với nguồn nước và sự sẻ chia',
        reply: ctx =>
          ctx.facts.includes('CARE_MEANING_CONFIRMED')
            ? 'Bạn đã kết nối trọn vẹn nguồn nước (L3-C) với góc chăm sóc này (Q5). Dưới tầng đất sâu, từng ca nước sạch và từng tấm vải chuyển từ phiên chợ (S4) đều quý như sự sống.'
            : 'Để lau vết thương hay hạ sốt cho người ốm, chúng tôi cần nước sạch chia sẻ từ khoang dự trữ bên cạnh (L3-C) và những tấm khăn sạch được chuẩn bị sẵn từ bàn bên trái.',
      },
      {
        id: 'L3B_CARE_HUMANITY',
        question: 'Điều gì giúp người bị thương hay mệt mỏi vững tâm nhất?',
        title: 'Sự hiện diện của bàn tay chăm lo',
        reply: () =>
          'Dưới lòng đất thiếu ánh mặt trời, biết rằng luôn có người thức canh bên giường, có phần cháo nóng từ bếp (L1-C) đưa xuống là liều thuốc tinh thần lớn nhất.',
      },
    ],
  },
  NPC_WATER: {
    targetId: 'NPC_WATER',
    zone: 'L3-C',
    speakerLabel: 'NGƯỜI GIỮ NGUỒN NƯỚC · NHÂN VẬT HƯ CẤU GIÁO DỤC',
    roleTitle: 'Người trông coi chum nước dự trữ và phân phối tầng 3',
    sceneIntro: 'Bên những chiếc chum sành đặt nơi góc hầm mát lạnh, người giữ nước đang cẩn thận đậy lại nắp gỗ sau khi múc từng gàu.',
    echoId: 'ECHO_L3C_WATER',
    echoPrompt: 'Tiếng gàu múc nước chạm thành chum sành vang nhẹ nơi tầng sâu.',
    echoDescription: 'Âm thanh nước nhỏ giọt và tiếng gàu múc nước trong khoang lưu trữ tầng 3 (L3-C).',
    topics: [
      {
        id: 'L3C_WATER_SHARE',
        question: 'Nguồn nước dự trữ ở đây được chia cho những đâu?',
        title: 'Một nguồn nước nuôi nhiều mạch sống',
        reply: ctx =>
          ctx.facts.includes('WATER_USES_CONNECTED')
            ? 'Như bạn vừa thực hành trên mô hình chia nước: một nửa dành cho bếp Hoàng Cầm (L1-C) nấu cơm, một nửa chuyển sang phòng bên (L3-B) để rửa vết thương và chăm sóc người ốm.'
            : 'Nước dưới hầm phải tính từng gàu. Chúng tôi chia đều cho hai nơi cần nhất: gian bếp ở tầng 1 để nấu bữa ăn chung và phòng chăm sóc ngay kế bên.',
      },
      {
        id: 'L3C_WATER_SYNTHESIS',
        question: 'Khi nhìn từ nguồn nước này, bạn thấy toàn bộ hệ thống hầm ra sao?',
        title: 'Hội tụ về bức tranh cộng đồng ở L3-D',
        reply: ctx =>
          ctx.facts.includes('CARE_MEANING_CONFIRMED')
            ? 'Khi đã hiểu chuyện nước và chăm sóc, bạn hãy bước qua lối nối tới sa bàn tổng hợp (L3-D). Tất cả năm nền tảng của Mạch Sống đã sẵn sàng hội tụ ở đó.'
            : 'Hãy hoàn tất việc chia nước ở đây và chuẩn bị góc chăm sóc ở L3-B, bạn sẽ thấy công trình ngầm này thực sự là một ngôi nhà chung giữ gìn sự sống.',
      },
    ],
  },
}

export type CedarFallsSection = {
  id: 'TIMELINE_1967' | 'GEOGRAPHY_DISTINCTION' | 'CIVILIAN_IMPACT' | 'TIME_LAYER_GATE'
  title: string
  period: string
  truth: TruthClassification
  sourceCitation: string
  content: string
  takeaway: string
}

export const CEDAR_FALLS_SECTIONS: readonly CedarFallsSection[] = [
  {
    id: 'TIMELINE_1967',
    title: '1. Bối cảnh tháng 01/1967 (Chiến dịch Cedar Falls)',
    period: '08/01/1967 – 26/01/1967',
    truth: 'RECONSTRUCTED',
    sourceCitation: 'Cục Di sản văn hóa [R01]; Mangold & Penycate (1985), The Tunnels of Cu Chi [R03].',
    content:
      'Tháng 01/1967, chiến dịch quy mô lớn mang tên Cedar Falls diễn ra tại khu vực phía bắc Sài Gòn (vùng Tam giác sắt và lân cận Củ Chi) với mục tiêu triệt phá hệ thống căn cứ, làng mạc và mạng lưới địa đạo.',
    takeaway: 'Giải thích vì sao mốc thời gian 01/1967 trong TimeLens đặt người chơi vào bối cảnh áp lực bên ngoài rất cao đối với đời sống ngầm.',
  },
  {
    id: 'GEOGRAPHY_DISTINCTION',
    title: '2. Phân biệt địa bàn: Tam giác sắt (Bến Súc) và Củ Chi (Bến Dược / Bến Đình)',
    period: 'Không gian lịch sử & di tích',
    truth: 'RECONSTRUCTED',
    sourceCitation: 'Hồ sơ Di tích quốc gia đặc biệt Địa đạo Củ Chi [R01]; Ban Quản lý Di tích Lịch sử Địa đạo Củ Chi [R02].',
    content:
      'Trọng tâm càn quét mặt đất của Cedar Falls nằm ở vùng Tam giác sắt (Bến Súc, Bến Cát, dọc sông Sài Gòn), tiếp giáp mạng lưới địa đạo Củ Chi. Hai điểm di tích mở cửa tham quan hôm nay là Bến Dược (xã Phú Mỹ Hưng) và Bến Đình (xã Nhuận Đức) đại diện cho hệ thống địa đạo Củ Chi rộng lớn.',
    takeaway: 'Tránh nhầm lẫn toàn bộ các phân khu diễn giải (S1–S4, L1–L3) là bản đo vẽ GPS 1:1 của một căn hầm duy nhất tại Bến Súc hay Bến Dược.',
  },
  {
    id: 'CIVILIAN_IMPACT',
    title: '3. Đời sống con người giữa biến động mặt đất và lòng đất',
    period: 'Góc nhìn nhân văn & giáo dục',
    truth: 'RECONSTRUCTED',
    sourceCitation: 'Tư liệu trưng bày Di tích Địa đạo Củ Chi [R01, R02].',
    content:
      'Trước sự tàn phá làng mạc, đồng ruộng trên mặt đất, hệ thống hầm ngầm nhiều tầng, bếp không khói, chum nước dự trữ và góc chăm sóc trở thành không gian duy trì sự sống, sinh hoạt và tinh thần tương trợ của cộng đồng.',
    takeaway: 'Trải nghiệm TimeLens tập trung vào sức sống, lao động và nghị lực con người thay vì mô phỏng bạo lực hay mini-game chiến sự.',
  },
  {
    id: 'TIME_LAYER_GATE',
    title: '4. Đối chiếu hai lớp thời gian (Cầu nối A17 · Giới hạn tư liệu)',
    period: '01/1967 ↔ Củ Chi hiện tại',
    truth: 'GATED_SOURCE_PENDING',
    sourceCitation: 'Quy tắc kiểm chứng tư liệu TimeLens Baseline (Chương 8 & Chương 25.17).',
    content:
      'Hoạt động A17 (“Hai lớp thời gian, một địa điểm”) yêu cầu tư liệu ảnh/bản đồ khảo sát xác minh cùng một tọa độ thực địa ở cả hai mốc 1967 và hiện tại. Hiện nay bản web hiển thị đối chiếu chủ đề giữa khu tái dựng 1967 và khu tưởng niệm hiện đại (S5, xây dựng 1993–1995), đồng thời giữ khóa tính năng trượt chồng tọa độ thực địa 1:1 cho đến khi hồ sơ khảo sát được duyệt.',
    takeaway: 'Minh bạch ranh giới giữa đối chiếu chủ đề đã có căn cứ và tính năng đối chiếu tọa độ thực địa đang chờ duyệt tư liệu.',
  },
]

export const HERITAGE_CANDIDATE_ITEMS: readonly HeritageExhibitItem[] = [
  {
    id: 'EX_HATCH_Q1',
    title: 'Nắp hầm ngụy trang dưới lớp lá rừng (Q1)',
    zone: 'S1',
    truth: 'RECONSTRUCTED',
    reflection: 'Ranh giới mỏng manh giữa mặt đất rừng cây và không gian trú ẩn bên dưới.',
  },
  {
    id: 'EX_MORTAR_A04',
    title: 'Cối giã gạo đôi và hai mẹt lúa – gạo (A04)',
    zone: 'S2',
    truth: 'RECONSTRUCTED',
    reflection: 'Nhịp lao động phối hợp mở đầu cho chuỗi lương thực nuôi sống cộng đồng.',
  },
  {
    id: 'EX_RICEPAPER_A03',
    title: 'Khuôn vải tráng bánh và phen tre phơi nắng (A03)',
    zone: 'S2',
    truth: 'RECONSTRUCTED',
    reflection: 'Nghề truyền thống Củ Chi tạo ra nguồn lương thực khô gọn nhẹ.',
  },
  {
    id: 'EX_SANDAL_A12',
    title: 'Đôi dép cao su luồn quai thủ công (A12)',
    zone: 'S2',
    truth: 'RECONSTRUCTED',
    reflection: 'Sự tháo vát tận dụng vật liệu cũ thành vật dụng bền bỉ gắn với từng bước chân.',
  },
  {
    id: 'EX_BASKET_A05_A06',
    title: 'Chiếc thúng tre đan tay và đất sét đào hầm (A05/A06)',
    zone: 'S3',
    truth: 'RECONSTRUCTED',
    reflection: 'Mỗi đoạn địa đạo nhiều tầng đều bắt nguồn từ đôi tay đan thúng và chuyền đất.',
  },
  {
    id: 'EX_STAGE_A07_A10',
    title: 'Khúc hò đồng ruộng và ánh đèn đêm văn nghệ (A10/A07)',
    zone: 'S3 / S4',
    truth: 'FICTIONAL_EDUCATIONAL',
    reflection: 'Tiếng hát và câu hò giữ ấm đời sống tinh thần giữa những ngày gian khó.',
  },
  {
    id: 'EX_HEARTH_A02_Q4',
    title: 'Bếp Hoàng Cầm và rãnh tản khói âm đất (A02/Q4)',
    zone: 'L1-C',
    truth: 'RECONSTRUCTED',
    reflection: 'Sáng tạo kỹ thuật dân gian gắn liền với bữa cơm ấm của cả cộng đồng ngầm.',
  },
  {
    id: 'EX_CARE_A14_A15_Q5',
    title: 'Chum nước chia sẻ và khay khăn chăm sóc (A14/A15/Q5)',
    zone: 'L3-C / L3-B',
    truth: 'RECONSTRUCTED',
    reflection: 'Sự sống dưới tầng sâu được giữ gìn bằng từng gàu nước và bàn tay chăm lo.',
  },
  {
    id: 'EX_MEMORIAL_A01',
    title: 'Nhành hoa và nén hương tri ân tại Củ Chi hôm nay (A01)',
    zone: 'S5',
    truth: 'MODERN_MEMORIAL',
    reflection: 'Khoảng lặng trang trọng nối ký ức năm 1967 với lòng biết ơn của thế hệ hôm nay.',
  },
]

export const DIRECTORS_CUT_MOMENTS: readonly { id: string; title: string; zone: string; subtitle: string; visualNote: string }[] = [
  {
    id: 'DC_M1_ENTRANCE',
    title: 'Cảnh 1 · Từ dấu lá rừng đến lòng đất ba tầng',
    zone: 'S1 → L1-B → L2-A',
    subtitle: 'Dưới lớp lá khô bình lặng ở bìa rừng Củ Chi là cả một hệ thống hầm ba tầng có thông khí và phân lớp chặt chẽ.',
    visualNote: 'Khung hình: Nắp hầm S1 mở ra → luồng khí L1-B → mặt cắt ba tầng.',
  },
  {
    id: 'DC_M2_LABOR',
    title: 'Cảnh 2 · Nhịp chày, phen bánh và thúng đất đêm trăng',
    zone: 'S2 → S3',
    subtitle: 'Trên mặt đất, nhịp giã gạo, tráng bánh và chuyền thúng đất dưới ánh trăng âm thầm nuôi dưỡng mạch sống bên dưới.',
    visualNote: 'Khung hình: Cối giã gạo S2 → bếp tráng bánh → cánh đồng đêm trăng S3.',
  },
  {
    id: 'DC_M3_COMMUNITY',
    title: 'Cảnh 3 · Tiếng hát sân tre và phiên chợ sẻ chia',
    zone: 'S4 → L2-B',
    subtitle: 'Giữa hoàn cảnh khắc nghiệt tháng 01/1967, tiếng đàn đêm văn nghệ và những lời dặn dò vẫn thắp sáng niềm hy vọng.',
    visualNote: 'Khung hình: Sân khấu đèn dầu S4 → gian chợ quê → bàn sổ ghi chép L2-B.',
  },
  {
    id: 'DC_M4_HEARTH_CARE',
    title: 'Cảnh 4 · Lửa ấm không khói, nước quý và bàn tay chăm sóc',
    zone: 'L1-C → L3-C → L3-B',
    subtitle: 'Từ làn khói tản qua đất ẩm của bếp Hoàng Cầm đến từng gàu nước chia cho giường chăm sóc, con người nâng đỡ nhau vượt qua tất cả.',
    visualNote: 'Khung hình: Gian bếp L1-C → chum nước L3-C → khay khăn ấm L3-B.',
  },
  {
    id: 'DC_M5_EPILOGUE',
    title: 'Cảnh 5 · Hội tụ Mạch Sống và khoảng lặng hôm nay',
    zone: 'L3-D → S5',
    subtitle: 'Năm nền tảng hội tụ thành bức tranh cộng đồng, khép lại nơi sân tưởng niệm Củ Chi yên bình hôm nay.',
    visualNote: 'Khung hình: Sa bàn tổng hợp L3-D → bia tưởng niệm và nhành hoa tại S5.',
  },
]

export const FUTURE_LETTER_PROMPTS: readonly { id: string; title: string; excerpt1967: string; suggestedReply: string }[] = [
  {
    id: 'LETTER_PEACE',
    title: 'Mảnh thư 1 · Gửi ngày mặt đất nở hoa',
    excerpt1967:
      '“Đêm nay dưới ánh đèn dầu tầng hầm giữa, nghe tiếng cuốc đào đất xa xa mà lòng nhớ mùi lúa mới trên đồng. Mong người của ngày mai khi bước trên mặt đất bình yên sẽ nhớ chúng tôi đã trân quý từng ngọn cỏ, từng gàu nước nơi này…” (Bản dựng hư cấu giáo dục)',
    suggestedReply:
      'Gửi những con người năm 1967: Hôm nay Củ Chi đã xanh bóng cây và bình yên. Chúng tôi bước đi với lòng biết ơn những bàn tay đã giữ gìn sự sống nơi lòng đất.',
  },
  {
    id: 'LETTER_COMMUNITY',
    title: 'Mảnh thư 2 · Gửi những người giữ lửa và chăm sóc',
    excerpt1967:
      '“Bếp cơm hôm nay chia đủ cho cả tổ đào hầm và mấy anh chị đang nghỉ dưỡng sức ở tầng sâu. Chỉ mong mai sau, dù ở hoàn cảnh nào, con người vẫn giữ được sự đùm bọc, nhường nhau từng ca nước ấm như thế…” (Bản dựng hư cấu giáo dục)',
    suggestedReply:
      'Câu chuyện về bếp không khói, gàu nước chia đôi và góc chăm sóc dưới lòng đất nhắc chúng tôi rằng sức mạnh lớn nhất luôn nằm ở sự tương trợ và lòng nhân ái.',
  },
  {
    id: 'LETTER_YOUTH',
    title: 'Mảnh thư 3 · Gửi tuổi trẻ của những mùa sau',
    excerpt1967:
      '“Trước giờ lên đường sau đêm văn nghệ, tôi kẹp lại trang viết này nơi bàn họp L2-B. Tuổi trẻ của chúng tôi gắn với những lối hầm hẹp, để tuổi trẻ mai sau được tự do học tập và dựng xây dưới bầu trời rộng mở…” (Bản dựng hư cấu giáo dục)',
    suggestedReply:
      'Chúng tôi xin lưu giữ ký ức về những ước mơ giản dị mà cao đẹp của tuổi trẻ Củ Chi, để mỗi bước đi hướng tới tương lai đều có chiều sâu của lòng tri ân.',
  },
]
