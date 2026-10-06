// src/pages/ArtifactsPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom' // THÊM DÒNG NÀY
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'

type CategoryFilter = 'all' | ArtifactCategory

// ==========================================
// MOCK DATA: BẢO TÀNG 3D
// ==========================================
export type ArtifactCategory = 'aircraft' | 'armor' | 'artillery' | 'ammunition'

export interface Artifact {
    id: string
    name: string
    category: ArtifactCategory
    sketchfabId: string
    description: string
    story: string
    unlocked: boolean
    thumbnail: string
    specs?: { label: string, value: string }[]
    funFact?: string
}

// Cấu hình UI cho các phân loại
export const CATEGORY_MAP: Record<ArtifactCategory, { label: string; icon: string; color: string; bgColor: string }> = {
    aircraft: { label: 'Không Quân', icon: 'flight', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
    armor: { label: 'Thiết Giáp', icon: 'directions_car', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
    artillery: { label: 'Hỏa Lực', icon: 'track_changes', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
    ammunition: { label: 'Bom Đạn', icon: 'local_fire_department', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
}

// ==========================================
// HÀM TIỆN ÍCH TẠO LINK ẢNH TỪ SKETCHFAB ID
// ==========================================
// Thay vì gọi API làm sập React, ta dùng API tĩnh của bên thứ 3 hoặc placeholder đẹp để thay thế
const getThumbnail = (id: string) => `https://v3.3d-models.biz/models/${id}/thumbnails/0.jpg`; // Link dự phòng nhanh

// ==========================================
// DATA BẢO TÀNG 3D - 58 HIỆN VẬT (BẢN CHUYÊN SÂU TIMELENS)
// ==========================================
export const MOCK_ARTIFACTS_RAW: Artifact[] = [
    // ------------------------------------------
    // 1. KHU VỰC KHÔNG QUÂN (AIRCRAFT)
    // ------------------------------------------
    {
        id: 'art-mig17-6173', name: 'Tiêm kích MiG-17 (Số hiệu 6173)', category: 'aircraft', sketchfabId: '6e3a0e66435d42c8b520b7466becf65a',
        description: 'Cánh én bạc làm nên huyền thoại Không quân Việt Nam. Dù bị đánh giá là lỗi thời so với các dòng F-4 Phantom của Mỹ, MiG-17 với sự linh hoạt xuất sắc trong không chiến quần vòng (dogfight) dưới bàn tay các phi công Việt Nam đã lập nên những chiến công vang dội.',
        story: 'Trong số 16 phi công Việt Nam đạt cấp Ace (bắn hạ từ 5 máy bay địch trở lên), có 2 phi công lái MiG-17.\n\nLúc bấy giờ, Không quân Mỹ tự tin với hàng trăm pháo đài bay B-52 và F-4 có tốc độ hơn 2000km/h, trong khi MiG-17 chỉ đạt tốc độ cận âm. Tuy nhiên, bằng chiến thuật "bay thấp kéo cao", lợi dụng địa hình đồi núi che khuất radar, các biên đội MiG-17 đã trở thành nỗi ám ảnh của phi công Mỹ, bảo vệ thành công bầu trời miền Bắc.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Xuất xứ', value: 'Liên Xô' }, { label: 'Tốc độ tối đa', value: '1.145 km/h' },
            { label: 'Tầm bay', value: '2.060 km' }, { label: 'Trần bay', value: '16.600 m' },
            { label: 'Vũ khí chính', value: 'Pháo 37mm & 23mm' }, { label: 'Nhiệm vụ', value: 'Tiêm kích đánh chặn' },
        ],
        funFact: 'MiG-17 thời kỳ đầu không hề có radar dò tìm mục tiêu. Phi công Việt Nam hoàn toàn dựa vào mắt thường, kinh nghiệm và sự điều phối từ trạm radar mặt đất để phục kích kẻ thù.'
    },
    {
        id: 'art-aircraft-935', name: 'Tiêm kích MiG-21 (Biên đội 935)', category: 'aircraft', sketchfabId: '793cfbd1a9e647339e73f16b50d54790',
        description: 'Mảnh ghép quan trọng của lưới lửa phòng không, "Sát thủ" của B-52.',
        story: 'MiG-21 là dòng tiêm kích phản lực siêu âm hiện đại nhất của Việt Nam trong kháng chiến chống Mỹ. Với thiết kế cánh tam giác khí động học, MiG-21 có thể vọt lên độ cao hàng chục kilomet chỉ trong vài phút. Chiến thuật tiêu biểu của MiG-21 là "đánh vu hồi": bay ở độ cao thấp để giấu mình, sau đó bất ngờ vọt lên cao độ, phóng tên lửa K-13 rồi thoát ly chiến trường với tốc độ Mach 2.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Xuất xứ', value: 'Liên Xô' }, { label: 'Tốc độ tối đa', value: '2.175 km/h (Mach 2.05)' },
            { label: 'Tầm bay', value: '1.510 km' }, { label: 'Vũ khí chính', value: 'Tên lửa K-13 (Atoll)' },
        ],
        funFact: 'MiG-21 là chiếc máy bay phản lực được sản xuất nhiều nhất trong lịch sử hàng không thế giới với hơn 11.000 chiếc, và Việt Nam là quốc gia vận hành MiG-21 hiệu quả nhất.'
    },
    {
        id: 'art-c130', name: 'Máy bay vận tải C-130 Hercules', category: 'aircraft', sketchfabId: '6ca6750c8be9465c9f779b0c4c275fbb',
        description: 'Được mệnh danh là "Ngựa thồ không trung" chủ lực của Không lực Hoa Kỳ và nhiều lực lượng quân đội trên toàn thế giới.',
        story: 'C-130 Hercules là loại máy bay vận tải chiến thuật đa dụng hạng trung. Trong chiến tranh Việt Nam, C-130 đóng vai trò cực kỳ quan trọng trong việc thả dù tiếp tế, vận chuyển binh lực lượng lớn.\n\nNhờ thiết kế khung thân đặc biệt, nó có khả năng cất hạ cánh trên các đường băng dã chiến ngắn. Thậm chí, nhiều chiếc C-130 còn được cải hoán thành phiên bản máy bay cường kích hạng nặng (AC-130 Spectre) mang theo lựu pháo 105mm để bắn phá mục tiêu mặt đất dọc đường mòn Hồ Chí Minh.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Sản xuất', value: 'Lockheed (Mỹ)' }, { label: 'Trọng tải tải', value: '20.000 kg' },
            { label: 'Tốc độ tối đa', value: '592 km/h' }, { label: 'Sải cánh', value: '40,4 m' },
        ],
        funFact: 'Dù to xác và nặng nề, C-130 được thiết kế để có thể hạ cánh "đạp phanh" trên những đường băng bằng đất nện siêu ngắn chưa tới 1.000m giữa rừng rậm.'
    },
    {
        id: 'art-uh1a', name: 'Trực thăng UH-1A Huey', category: 'aircraft', sketchfabId: 'ce1ba25bdde84707a0ddc1f5202de3ae',
        description: 'Biểu tượng của chiến thuật "Trực thăng vận" của quân đội Mỹ tại Việt Nam.',
        story: 'Trực thăng UH-1 Huey là xương sống của lực lượng không kỵ Mỹ. Khả năng cơ động vượt địa hình rừng núi giúp Mỹ đổ quân chớp nhoáng (Air assault), tải thương (Dustoff), và yểm trợ hỏa lực. Tuy nhiên, khi đối mặt với lưới lửa phòng không tầm thấp dày đặc và chiến thuật "nắm thắt lưng địch mà đánh" của Quân Giải phóng, UH-1 bộc lộ điểm yếu là vỏ mỏng, dễ bị bắn hạ bởi súng bộ binh thông thường.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Sản xuất', value: 'Bell Helicopter' }, { label: 'Kíp lái', value: '1 đến 4 người' },
            { label: 'Sức chở', value: '14 lính bộ binh' }, { label: 'Tốc độ', value: '217 km/h' },
        ],
        funFact: 'Tiếng "phạch phạch" đặc trưng của UH-1 sinh ra do rìa cánh quạt chính vượt qua bức tường âm thanh, tạo ra những tiếng nổ siêu âm nhỏ lẻ liên tục.'
    },

    // ------------------------------------------
    // 2. KHU VỰC THIẾT GIÁP (ARMOR)
    // ------------------------------------------
    {
        id: 'art-m48', name: 'Xe tăng chiến đấu chủ lực M48 Patton', category: 'armor', sketchfabId: '9dd1a1f178444688aa04a2fcd1b4dc9a',
        description: 'Nắm đấm thép của thiết giáp Mỹ và quân đội VNCH trên chiến trường miền Nam.',
        story: 'M48 Patton là dòng xe tăng chiến đấu chủ lực (MBT) được thiết kế cho chiến tranh quy mô lớn. Tại Việt Nam, do địa hình rừng núi, sình lầy và đường sá nhỏ hẹp, xe tăng M48 hiếm khi tham gia các trận đấu tăng kinh điển mà chủ yếu được triển khai để bảo vệ căn cứ, mở đường càn quét hoặc làm hố lô cốt cố định. Giáp thép dày giúp nó chống chịu tốt trước đạn pháo thông thường, nhưng lại là mục tiêu lý tưởng cho đặc công và súng B-41 của Quân Giải phóng.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Sản xuất', value: 'Mỹ (1952)' }, { label: 'Trọng lượng', value: '49,6 tấn' },
            { label: 'Pháo chính', value: '90mm M41 (64 viên)' }, { label: 'Giáp trước', value: 'Dày 110 mm' },
        ],
        funFact: 'M48 sử dụng vô lăng lái hình bán nguyệt giống như vô lăng xe hơi, khác biệt hoàn toàn với hệ thống cần gạt cơ học trên các xe tăng Liên Xô cùng thời.'
    },
    {
        id: 'art-m113-2', name: 'Xe Thiết giáp M113 (Biến thể ACAV)', category: 'armor', sketchfabId: '7521ff2c7f3346e3a220a0989493ec9e',
        description: 'Biến thể nâng cấp giáp và hỏa lực của dòng "Taxi chiến trường" M113.',
        story: 'Sau khi nhận thấy xạ thủ súng máy trên nóc xe M113 quá dễ bị tổn thương bởi lính bắn tỉa, Mỹ đã cho ra đời gói nâng cấp ACAV (Armored Cavalry Assault Vehicle). Phiên bản này được lắp thêm các tấm khiên thép bảo vệ xung quanh súng đại liên M2 Browning 12.7mm và hai khẩu M60 hai bên hông, biến M113 từ một xe chở quân đơn thuần thành một phương tiện chiến đấu bộ binh thực thụ.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Động cơ', value: 'Diesel 6V53 Detroit' }, { label: 'Tầm hoạt động', value: '480 km' },
            { label: 'Nâng cấp hỏa lực', value: '3 súng máy bảo vệ' }, { label: 'Kíp xe', value: 'Trưởng xe + Tài xế' },
        ],
        funFact: 'Lính Mỹ thường chất bao cát lên sàn xe M113 từ bên trong để chống lại sức nổ của mìn chống tăng sát thương xuyên từ gầm xe lên.'
    },
    {
        id: 'art-m113-1', name: 'Xe Thiết giáp chở quân M113', category: 'armor', sketchfabId: 'b3b5269946c74b54a3244b4849963d63',
        description: 'Loại xe thiết giáp được sử dụng nhiều nhất trong chiến tranh Việt Nam, biểu tượng của chiến thuật "Thiết xa vận".',
        story: 'Ra mắt năm 1962, M113 là hình ảnh gắn liền với các cuộc hành quân tìm diệt của Mỹ và VNCH. Nhờ trọng lượng nhẹ, nó có thể băng qua các cánh đồng lúa ngập nước ở Đồng bằng sông Cửu Long.\n\nTuy nhiên, Quân Giải phóng nhanh chóng tìm ra khắc tinh của nó: Mìn chống tăng và súng B-40. Hiện vật phục dựng này mang dấu tích của trận phục kích tại xã An Phú (Củ Chi) năm 1969, nơi một xe M113 đã bị du kích bắn hạ hoàn toàn.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Xuất xứ', value: 'Mỹ (1950)' }, { label: 'Trọng lượng', value: '12,3 tấn' },
            { label: 'Tốc độ bơi', value: '5,8 km/h' }, { label: 'Sức chở', value: '11 lính trang bị đầy đủ' },
        ],
        funFact: 'Để M113 có thể lội nước, nhà sản xuất đã dùng hợp kim nhôm thay vì thép. Trớ trêu thay, hợp kim nhôm rất dễ bốc cháy dữ dội khi bị đạn xuyên lõm B-40 bắn trúng.'
    },

    // ------------------------------------------
    // 3. KHU VỰC HỎA LỰC PHÁO/CỐI (ARTILLERY)
    // ------------------------------------------
    {
        id: 'art-coi-82', name: 'Súng Cối 82mm (PM-41)', category: 'artillery', sketchfabId: 'a3917b80e1654276a3e3ca89c7ea8f35',
        description: 'Hỏa lực cầu vồng, khắc tinh của hầm hào công sự. Vũ khí yểm trợ cấp tiểu đoàn cực kỳ lợi hại của Quân Giải phóng.',
        story: 'Với thiết kế gồm 3 phần dễ dàng tháo rời (nòng, chân chống chữ V, và đế), một tổ cối 82mm có thể luồn lách qua những cánh rừng rậm rạp nhất. Quỹ đạo đạn cầu vồng cho phép bộ đội dội hỏa lực chính xác vào các căn cứ địch nằm sau đồi núi hoặc các góc khuất mà súng thẳng không bắn tới được.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Cỡ nòng', value: '82 mm' }, { label: 'Tầm bắn', value: '3.040 mét' },
            { label: 'Tốc độ bắn', value: '15-25 phát/phút' }, { label: 'Trọng lượng', value: '56 kg' }
        ],
        funFact: 'Súng cối 82mm của phe XHCN có một "tuyệt chiêu": Do cỡ nòng lớn hơn 1mm, nó có thể nhặt và bắn ké đạn cối 81mm của Mỹ, trong khi súng 81mm của Mỹ không thể nhét vừa đạn 82mm của ta!'
    },
    {
        id: 'art-coi-81', name: 'Súng Cối 81mm (M29)', category: 'artillery', sketchfabId: '10a5c6cd795f4de7a2342287bce37767',
        description: 'Vũ khí hỏa lực gián tiếp tiêu chuẩn của lính thủy đánh bộ và bộ binh Mỹ.',
        story: 'Trong các trận phòng ngự, súng cối 81mm đóng vai trò lập nên "bức tường lửa". Nó có thể bắn đạn chiếu sáng vào ban đêm để phát hiện sự di chuyển của đặc công, hoặc đạn nổ phá văng mảnh để bẻ gãy các làn sóng xung phong của đối phương từ khoảng cách xa.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Cỡ nòng', value: '81 mm' }, { label: 'Tầm bắn tối đa', value: '4.737 mét' },
            { label: 'Kíp chiến đấu', value: '5 người' }, { label: 'Loại đạn', value: 'Nổ mảnh / Phốt pho trắng' }
        ],
        funFact: 'Đạn cối 81mm đôi khi được dùng như một quả mìn bẫy (booby trap) khổng lồ bằng cách chôn dưới đất và gắn ngòi nổ vướng nổ.'
    },
    {
        id: 'art-coi-60', name: 'Súng Cối 60mm (M2)', category: 'artillery', sketchfabId: '928efef6bfda4a0784c98297f4c78031',
        description: 'Vũ khí yểm trợ cận chiến cấp đại đội, nổi bật nhờ sự nhỏ gọn và siêu cơ động.',
        story: 'Chỉ nặng chưa tới 20kg, cối 60mm là vũ khí "đánh chớp nhoáng" hoàn hảo của du kích Củ Chi. Xạ thủ có thể tiếp cận sát đồn bốt địch, thả vài quả đạn tạo sự hỗn loạn, sau đó vác súng trên vai rút nhanh xuống các lối vào địa đạo bí mật trước khi pháo binh địch kịp đáp trả.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Cỡ nòng', value: '60 mm' }, { label: 'Trọng lượng', value: '19 kg' },
            { label: 'Tầm bắn', value: '1.815 mét' }, { label: 'Bán kính sát thương', value: '15 mét' }
        ],
        funFact: 'Trong các tình huống cận chiến khẩn cấp, xạ thủ có thể vứt bỏ chân chống, đặt thẳng nòng súng xuống đất, kẹp bằng hai chân và ước lượng góc bắn bằng mắt thường (bắn ứng dụng).'
    },

    // --- HỎA LỰC ROCKET (ỐNG PHÓNG / HỎA TIỄN DÃ CHIẾN) ---
    {
        id: 'art-rocket-10', name: 'Ống phóng Rocket (H-6 / DKB 122mm)', category: 'artillery', sketchfabId: 'df6fa99eef6d4a7e853a3e5c16b0b727',
        description: 'Khí tài phóng đạn phản lực đất đối đất, nỗi kinh hoàng của các sân bay quân sự.',
        story: 'Sử dụng đạn phản lực BM-21 Grad của Liên Xô nhưng được thiết kế bệ phóng ống đơn vác vai để phù hợp với lối đánh du kích. Vào dịp Tết Mậu Thân 1968, hàng trăm quả DKB 122mm đã đồng loạt rít lên xé toạc màn đêm, giáng đòn hủy diệt xuống các đường băng và kho xăng của địch tại sân bay Tân Sơn Nhất, Biên Hòa.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Cỡ đạn', value: '122 mm' }, { label: 'Tầm xa tối đa', value: '11.000 mét' },
            { label: 'Trọng lượng đạn', value: '46 kg' }, { label: 'Thời gian bay', value: 'Dưới 40 giây' }
        ],
        funFact: 'Khi không có bệ phóng, bộ đội Việt Nam thường kê đạn rocket lên các ụ đất được đắp theo góc nghiêng tính toán sẵn, hoặc dùng hai cọc tre tréo hình chữ X để nhắm bắn.'
    },
    { id: 'art-rocket-11', name: 'Ống phóng Rocket (Mẫu cải tiến tự tạo)', category: 'artillery', sketchfabId: 'f0d7b807998945089b44b8c5ffdab343', description: 'Được Quân giới Việt Nam thu gom từ ống phóng rocket hỏng hoặc vỏ đạn chưa nổ, hàn nối lại để tạo thành hỏa tiễn đánh trả đối phương.', story: 'Sự sáng tạo vô biên của xưởng quân giới trong lòng đất Củ Chi.', unlocked: true, thumbnail: '', specs: [{label: 'Cấu tạo', value: 'Thép phế liệu tái chế'}, {label: 'Chế độ phóng', value: 'Kích nổ bằng điện'}], funFact: 'Nhiều ống phóng được quét một lớp mỡ trăn để chống gỉ sét trong môi trường độ ẩm 90% của địa đạo.' },
    { id: 'art-rocket-12', name: 'Ống phóng Rocket (Mẫu 12 - Tàn dư)', category: 'artillery', sketchfabId: '1d847e96c899471382fb4d72317bed68', description: 'Tia lửa phản lực từ hỏa tiễn để lại vết cháy đen trên vỏ thép.', story: 'Khác biệt với pháo binh thông thường có nòng pháo rất dày để chịu áp lực, ống phóng rocket chỉ đóng vai trò "ray dẫn hướng", vì bản thân quả đạn rocket đã chứa động cơ phản lực tự đẩy nó đi.', unlocked: true, thumbnail: '', specs: [{label: 'Loại vũ khí', value: 'Hỏa tiễn không giật'}], funFact: 'Do không có lực giật lùi khi bắn, các bệ phóng rocket có thể được đặt trên nền đất rất yếu hoặc thậm chí trên xuồng ba lá.' },
    { id: 'art-rocket-13', name: 'Ống phóng Rocket (Mẫu 13 - Biến dạng nhiệt)', category: 'artillery', sketchfabId: '3c7d5ae0ceb8433487384b6073c94664', description: 'Di vật bị biến dạng do sức nóng hàng ngàn độ C sau nhiều loạt phóng liên tiếp.', story: 'Hiện vật được khai quật tại một chiến hào cũ khu vực Trảng Bàng, Tây Ninh.', unlocked: true, thumbnail: '', specs: [{label: 'Tình trạng', value: 'Bị oxy hóa nặng'}], funFact: 'Kỹ thuật scan 3D Photogrammetry đã chụp hơn 300 bức ảnh độ phân giải cao để tái tạo lại chính xác từng vết nứt do ứng suất nhiệt.' },
    { id: 'art-rocket-base', name: 'Chân đế Rocket dã chiến', category: 'artillery', sketchfabId: '32f7a901e02c481aa8302a2a6558257c', description: 'Bệ phóng chữ A tự chế của lính đặc công.', story: 'Đơn giản, rẻ tiền và siêu nhẹ. Lắp ráp trong 2 phút, khai hỏa đồng loạt bằng công tắc điện nối dây dài 50m, sau đó xạ thủ lập tức tản mát để tránh phản pháo.', unlocked: true, thumbnail: '', specs: [{label: 'Chất liệu', value: 'Khung nhôm/thép ống'}], funFact: 'Để đánh lừa máy bay trinh sát địch, bộ đội thường làm các bệ phóng giả bằng thân cây chuối sơn đen.' },
    { id: 'art-rocket-9', name: 'Cụm phóng đạn H-12 (107mm)', category: 'artillery', sketchfabId: '5ce6a1f2792446c6af5ce4b1adb320c7', description: 'Hệ thống hỏa tiễn hạng nhẹ 12 nòng.', story: 'Nổi tiếng với khả năng mang vác bằng sức người. Mỗi quả đạn 107mm chỉ nặng khoảng 18kg, sức công phá tương đương đạn pháo 105mm.', unlocked: true, thumbnail: '', specs: [{label: 'Cỡ đạn', value: '107 mm'}, {label: 'Tầm xa', value: '8.500 mét'}], funFact: 'Đạn H-12 ổn định đường bay bằng cách tự xoay tròn nhờ 6 lỗ thoát khí phản lực đục chéo ở đuôi đạn.' },
    { id: 'art-rocket-8', name: 'Ống phóng Rocket (Mẫu ngụy trang)', category: 'artillery', sketchfabId: 'b6321f74ae9444db96e2ae56a0ccea66', description: 'Khí tài pháo binh thiết kế để nằm phục kích.', story: 'Bề mặt ống phóng được quấn bao tải tẩm bùn để giảm phản xạ ánh sáng mặt trời.', unlocked: true, thumbnail: '', specs: [{label: 'Đặc tính', value: 'Chống phản xạ ánh sáng'}], funFact: 'Các trận địa rocket thường cài đặt chế độ hẹn giờ bằng cách đốt một nén nhang, khi nhang cháy đến dây cháy chậm sẽ tự kích nổ.' },
    { id: 'art-rocket-7', name: 'Ống phóng Rocket (Hệ thống điểm hỏa)', category: 'artillery', sketchfabId: '14688d5e735445029394e71a61f26530', description: 'Được trang bị chốt nối dây điện điểm hỏa.', story: 'Sử dụng một cục pin khô dã chiến để truyền dòng điện làm cháy kíp điện nổ nằm ở đuôi quả hỏa tiễn.', unlocked: true, thumbnail: '', specs: [{label: 'Nguyên lý', value: 'Kích hỏa bằng điện 12V'}], funFact: 'Chỉ cần một chiếc bình ắc quy xe máy tịch thu được cũng đủ để khai hỏa một dàn 12 quả rocket cùng lúc.' },
    { id: 'art-rocket-6-1', name: 'Ống thép chịu lực Hỏa tiễn', category: 'artillery', sketchfabId: 'c013e0951144428c8d49c471b015e200', description: 'Phần lõi thép bên trong cấu trúc bệ phóng.', story: 'Được tôi luyện đặc biệt để không bị nóng chảy khi luồng phản lực phụt qua.', unlocked: true, thumbnail: '', specs: [{label: 'Chất liệu', value: 'Thép hợp kim chịu nhiệt'}], funFact: 'Một số ống thép chất lượng cao được chế tạo từ nòng pháo hỏng của xe tăng thu được.' },
    { id: 'art-rocket-5-1', name: 'Ống phóng Rocket (Mẫu 5)', category: 'artillery', sketchfabId: '1cd8f9fbfb784166964282f5a1b72d13', description: 'Mảnh ghép của chiến thuật "Dàn nhạc lửa".', story: 'Âm thanh rít gào của hàng chục ống phóng đồng loạt khai hỏa tạo ra đòn tấn công tâm lý cực kỳ mạnh.', unlocked: true, thumbnail: '', specs: [{label: 'Chiến thuật', value: 'Bắn loạt diện rộng (Salvo)'}], funFact: 'Quân đội Mỹ gọi âm thanh của dàn rocket đang lao tới là "tiếng rít của tử thần" (Screaming Death).' },
    { id: 'art-rocket-3', name: 'Ống phóng Rocket (Mẫu 3 - Mảnh vỡ)', category: 'artillery', sketchfabId: '2e847610d6fd466e9d25aa280c3e09ca', description: 'Một bệ phóng bị hỏng do bom B-52 rải thảm.', story: 'Phục dựng lại từ một phế tích được bảo quản tại Bảo tàng Lực lượng Vũ trang.', unlocked: true, thumbnail: '', specs: [{label: 'Nguồn gốc', value: 'Khai quật năm 1998'}], funFact: 'Dấu vết lõm trên ống phóng cho thấy sức ép của quả bom rơi cách đó chưa đầy 10 mét.' },
    { id: 'art-rocket-4-1', name: 'Ống phóng Rocket (Mẫu 4)', category: 'artillery', sketchfabId: '4efe479e359848779a15231571d4c052', description: 'Vũ khí chọc thủng hàng rào phòng ngự vòng ngoài.', story: 'Do độ tản mát cao, rocket thường không dùng để bắn lô cốt đơn lẻ mà dùng để hủy diệt kho đạn hoặc khu tập trung quân.', unlocked: true, thumbnail: '', specs: [{label: 'Sai số mục tiêu', value: '~100 mét ở tầm xa tối đa'}], funFact: 'Do không có hệ thống dẫn đường, việc rocket trúng mục tiêu phụ thuộc hoàn toàn vào khả năng đọc bản đồ và tính toán góc tà của pháo thủ.' },
    { id: 'art-rocket-2-1', name: 'Ống phóng Rocket (Mẫu 2)', category: 'artillery', sketchfabId: '886d5c0fac184238a759249f3b173ac7', description: 'Giao diện ngắm bắn thô sơ bằng thước đo góc.', story: 'Chỉ bằng một chiếc đọi nước (ống ni-vô) và thước kẻ độ, bộ đội pháo binh tính toán góc nghiêng để lấy tầm xa.', unlocked: true, thumbnail: '', specs: [{label: 'Hệ thống ngắm', value: 'Cơ học ứng dụng'}], funFact: 'Góc nghiêng lý tưởng để quả rocket đạt tầm xa tối đa trong điều kiện gió lặng là đúng 45 độ.' },

    // --- PHÁO BINH HẠNG NẶNG (HOWITZERS) ---
    {
        id: 'art-howitzer-105-2', name: 'Lựu pháo 105mm (M101)', category: 'artillery', sketchfabId: '22d4841d41bb4526b8d65f1c59030c09',
        description: 'Mảnh ghép cốt lõi của chiến thuật "Căn cứ Hỏa lực" (Firebase) của quân đội Mỹ.',
        story: 'Khẩu pháo M101 105mm được thiết kế với hai càng có thể mở rộng, cho phép nó quay nòng 360 độ cực kỳ nhanh chóng để bắn chi viện cho mọi hướng. Mỹ thường dùng trực thăng cẩu các khẩu pháo này lên các đỉnh đồi trọc giữa rừng, xung quanh bao bọc bởi hàng rào kẽm gai và mìn Claymore, tạo thành một pháo đài bất khả xâm phạm.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Cỡ nòng', value: '105 mm' }, { label: 'Tầm bắn tối đa', value: '11.270 mét' },
            { label: 'Kíp pháo thủ', value: '8 người' }, { label: 'Trọng lượng', value: '2.260 kg' }
        ],
        funFact: 'Để chống lại chiến thuật biển người tràn ngập căn cứ, pháo 105mm có một loại đạn đặc biệt gọi là "Đạn tổ ong" (Beehive), chứa hàng ngàn mũi tên thép nhỏ, biến khẩu pháo thành một khẩu súng hoa cải khổng lồ.'
    },
    {
        id: 'art-howitzer-105-1', name: 'Lựu pháo 105mm (Khẩu chiến lợi phẩm)', category: 'artillery', sketchfabId: '8a5a8a93fa214b04b2ca3c7eac7c9821',
        description: 'Vũ khí thu được từ địch và quay nòng nã đạn lại chính kẻ thù.',
        story: 'Nhiều khẩu 105mm đã rơi vào tay Quân Giải phóng sau các trận tập kích đồn bốt. Không có xe kéo chuyên dụng, bộ đội ta đã tháo rời khẩu pháo thành nhiều mảnh, dùng trâu kéo hoặc sức người ròng rọc kéo lên các sườn núi cao, cất giấu trong hang đá để tạo yếu tố bất ngờ hoàn toàn.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Trạng thái', value: 'Chiến lợi phẩm' }, { label: 'Góc tầm', value: '-5° đến +66°' },
            { label: 'Tốc độ bắn', value: '10 phát/phút (tối đa)' }
        ],
        funFact: 'Vì không có nhà máy sản xuất đạn 105mm, bộ đội Việt Nam duy trì hỏa lực của pháo chiến lợi phẩm hoàn toàn bằng cách tổ chức các trận đánh lén để lấy cắp đạn từ chính các kho hậu cần của địch.'
    },
    {
        id: 'art-howitzer-155-2', name: 'Lựu pháo 155mm (M114)', category: 'artillery', sketchfabId: '3ba9afd665824c6f99082b369945aa5b',
        description: 'Quái thú bằng thép chuyên dùng để phá hủy công sự hầm ngầm.',
        story: 'M114 155mm có uy lực vượt trội so với pháo 105mm. Khối lượng thuốc nổ trong một quả đạn 155mm đủ sức xé toạc các hầm chữ A vững chắc nhất hoặc tạo ra một hố sâu có đường kính lên tới 10 mét. Khi khai hỏa, sóng xung kích từ khẩu pháo làm rung chuyển mặt đất xung quanh, đòi hỏi pháo thủ phải há miệng để không bị vỡ màng nhĩ.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Cỡ nòng', value: '155 mm' }, { label: 'Trọng lượng pháo', value: '5.800 kg' },
            { label: 'Trọng lượng đạn', value: '43 kg/viên' }, { label: 'Tầm bắn', value: '14.600 mét' }
        ],
        funFact: 'Khẩu pháo này nặng gần 6 tấn, bắt buộc phải dùng xe tải hạng nặng M35 hoặc máy bay vận tải mới có thể di chuyển được, khiến nó dễ bị phục kích khi hành quân trên đường bộ.'
    },
    { id: 'art-howitzer-155-3', name: 'Lựu pháo 155mm (Cơ cấu hãm giật)', category: 'artillery', sketchfabId: '56b72a53ac5745248de7a0c165a84c8c', description: 'Mô hình chi tiết hệ thống thủy lực.', story: 'Do sức giật khủng khiếp, cụm pít-tông thủy lực chứa dầu đặc biệt được lắp dọc theo nòng pháo để hấp thụ phản lực, nếu không khẩu pháo sẽ lộn nhào về phía sau sau mỗi phát bắn.', unlocked: true, thumbnail: '', specs: [{label: 'Hệ thống hãm', value: 'Thủy khí cục bộ'}], funFact: 'Dầu thủy lực trong ống hãm giật có thể sôi sùng sục và phải được thay thế nếu pháo bắn liên tục ở cường độ cao.' },
    { id: 'art-howitzer-155-1', name: 'Lựu pháo 155mm (Khóa nòng ren)', category: 'artillery', sketchfabId: '951bbc568ba143c284b53970e0ead5d8', description: 'Cơ chế nạp đạn tách rời.', story: 'Khác với đạn pháo cỡ nhỏ, đạn 155mm không có vỏ đồng đính liền. Pháo thủ phải nhét đầu đạn nặng 43kg vào nòng, sau đó mới nhét các túi thuốc phóng (liều phóng) bằng vải lụa vào phía sau và đóng khóa nòng bằng ren xoắn.', unlocked: true, thumbnail: '', specs: [{label: 'Nạp đạn', value: 'Thủ công (Rammer)'}], funFact: 'Việc dùng túi lụa chứa thuốc phóng giúp thuốc cháy sạch 100% trong nòng mà không để lại xỉ cản trở phát bắn tiếp theo.' },

    // ------------------------------------------
    // 4. KHU VỰC BOM ĐẠN (AMMUNITION - MK82 SERIES)
    // ------------------------------------------
    {
        id: 'art-mk82-30', name: 'Bom MK82 (Mẫu 30 - Nguyên bản)', category: 'ammunition', sketchfabId: 'b0ffea73263e4dcc8de89c991299894e',
        description: 'Vũ khí không kích chiến thuật phổ biến nhất của Không lực Hoa Kỳ và Hải quân Mỹ.',
        story: 'Bom MK82 (Mark 82) là loại bom công dụng chung (general-purpose bomb) thuộc dòng bom Mark 80. Thiết kế của nó ưu tiên tính đa dụng, dễ sản xuất hàng loạt, và có thể gắn trên hầu hết các loại máy bay chiến đấu từ F-4 Phantom, A-4 Skyhawk cho đến B-52.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Trọng lượng tổng', value: '500 lbs (~227 kg)' }, { label: 'Thuốc nổ', value: '89 kg (Tritonal)' },
            { label: 'Chiều dài', value: '2,22 mét' }, { label: 'Đường kính', value: '273 mm' }
        ],
        funFact: 'Chữ "MK" (Mark) là cách phân loại vũ khí hải quân của quân đội Anh - Mỹ từ thế kỷ 19. MK82 có nghĩa là thiết kế số 82 của Cục Quân giới.'
    },
    { id: 'art-mk82-29', name: 'Bom MK82 (Mẫu 29 - Chiến thuật Rải thảm)', category: 'ammunition', sketchfabId: '364b2532ea7e4c75b1eba675d2d48f1e', description: 'Mảnh ghép của chiến dịch Arc Light.', story: 'Một chiếc pháo đài bay B-52 Stratofortress có thể mang tới 84 quả bom MK82 trong khoang và 24 quả treo ngoài cánh. Khi thực hiện rải thảm, hàng trăm quả bom rơi xuống cùng lúc tạo thành một "hộp bom" hủy diệt rộng 1km x 3km.', unlocked: true, thumbnail: '', specs: [{label: 'Chiến thuật', value: 'Carpet Bombing'}], funFact: 'Sóng xung kích từ một đợt rải thảm B-52 mạnh đến mức lính bộ binh đứng cách đó 10km vẫn cảm thấy mặt đất rung lắc như động đất.' },
    { id: 'art-mk82-16', name: 'Bom MK82 (Mẫu 16 - Cánh xòe Snakeye)', category: 'ammunition', sketchfabId: '90c754e49beb479ca72f4c4893f3d023', description: 'Trang bị bộ đuôi Mark 15 "Mắt rắn" (Snakeye).', story: 'Khi máy bay bay ở độ cao cực thấp (để tránh tên lửa SAM), việc thả bom thông thường sẽ khiến chính máy bay ném bom bị dính mảnh văng của quả bom nổ ngay bên dưới. Đuôi Snakeye sẽ bung 4 cánh cản gió hình chiếc ô ngay khi rời máy bay, hãm tốc độ quả bom lại để máy bay có đủ thời gian tẩu thoát.', unlocked: true, thumbnail: '', specs: [{label: 'Cơ chế hãm', value: 'Cánh dù thép (Retarder)'}], funFact: 'Nhược điểm của bom Snakeye là gió ngang có thể thổi bay nó chệch mục tiêu hàng trăm mét do cánh xòe cản gió quá mạnh.' },
    { id: 'art-mk82-28', name: 'Bom MK82 (Mẫu 28 - Ngòi nổ xuyên đất)', category: 'ammunition', sketchfabId: 'ed4a5a2d31b1479883dc5b9527fc70ed', description: 'Biến thể chuyên tấn công địa đạo và công sự ngầm.', story: 'Với vỏ thép đúc đầu nhọn và ngòi nổ chậm (delay fuse), quả bom này được thiết kế để đâm xuyên qua tán rừng, cắm sâu xuống lòng đất từ 3 đến 5 mét trước khi kích nổ. Sức ép từ vụ nổ dưới lòng đất sẽ bóp nghẹt các tầng hầm địa đạo xung quanh.', unlocked: true, thumbnail: '', specs: [{label: 'Loại ngòi', value: 'Ngòi nổ trễ (M905 Tail)'}], funFact: 'Ngòi nổ chậm vận hành bằng một hệ thống đồng hồ cơ học nhỏ xíu bên trong đuôi bom, đếm ngược từ 0.02 đến 0.25 giây sau khi chạm đất.' },
    { id: 'art-mk82-25', name: 'Bom MK82 (Mẫu 25 - Mìn ĐH-10 Tự tạo)', category: 'ammunition', sketchfabId: '704d4bf0f2c94a58a286356ec16c35e5', description: 'Vũ khí địch biến thành vũ khí ta.', story: 'Do địa hình bùn lầy hoặc lỗi kỹ thuật, khoảng 10% bom Mỹ ném xuống không nổ. Công trường vũ khí Củ Chi đã liều mình tháo ngòi nổ, nấu chảy thuốc Tritonal bên trong (bằng nước sôi 100 độ C để không phát nổ) và đúc thành các mỏ gạt mìn định hướng đánh thiết giáp.', unlocked: true, thumbnail: '', specs: [{label: 'Ứng dụng', value: 'Tái chế thành mìn'}], funFact: 'Thuốc nổ Tritonal bên trong bom MK82 có màu vàng chanh và mùi khá đặc trưng, bao gồm 80% TNT trộn với 20% bột nhôm để tăng tính cháy nổ.' },
    { id: 'art-mk82-9', name: 'Bom MK82 (Mẫu 9 - Xuồng ba lá)', category: 'ammunition', sketchfabId: '926beeca483e4ce6b635e8301b7748aa', description: 'Sự sáng tạo dân gian độc nhất vô nhị.', story: 'Sau ngày hòa bình, vỏ bom MK82 (bằng thép carbon chống gỉ cực tốt) được nông dân miền Tây cắt dọc, hàn gò lại thành những chiếc xuồng, vỏ lãi nhỏ để đi lại trên kênh rạch. Vỏ bom chịu va đập cực tốt, dùng hàng chục năm không thủng.', unlocked: true, thumbnail: '', specs: [{label: 'Ứng dụng hòa bình', value: 'Phương tiện thủy'}], funFact: 'Bên cạnh làm xuồng, những vỏ bom rỗng còn được dựng thẳng đứng, nhồi xi măng vào giữa để làm trụ móng cầu bê tông siêu bền ở vùng nông thôn.' },
    { id: 'art-mk82-22', name: 'Bom MK82 (Mẫu 22 - Kẻng báo động)', category: 'ammunition', sketchfabId: '9471719def1746a69e8e07a639708aad', description: 'Âm thanh của làng quê thời chiến.', story: 'Vỏ bom thép đúc đặc khi gõ bằng thanh sắt sẽ tạo ra tiếng vang cực kỳ thanh và xa. Nó được treo ở đình làng hoặc gốc cây đa, gõ lên những hồi kẻng dồn dập để báo hiệu máy bay địch đang đến, gọi người dân xuống hầm trú ẩn.', unlocked: true, thumbnail: '', specs: [{label: 'Tần số âm', value: 'Vang xa bán kính 2km'}], funFact: 'Ngày nay, tại một số làng quê Việt Nam, những chiếc "kẻng vỏ bom" vẫn còn được giữ lại và dùng để báo giờ ra đồng hoặc tập hợp tổ dân phố.' },
    { id: 'art-mk82-15', name: 'Bom MK82 (Mẫu 15 - Vòng sơn vàng)', category: 'ammunition', sketchfabId: '3e3c23d02ab142d0b6000860f6600246', description: 'Ký hiệu cảnh báo chuẩn NATO.', story: 'Lớp sơn màu xanh Olive Drab phủ toàn thân giúp bom hòa lẫn với màu địa hình khi rơi. Tuy nhiên, ba vạch sọc vàng quanh mũi bom là tín hiệu cho lực lượng hậu cần mặt đất biết rằng: Đây là bom nhồi thuốc nổ mạnh (High Explosive), chứ không phải bom khói hay bom cháy.', unlocked: true, thumbnail: '', specs: [{label: 'Quy chuẩn', value: 'Màu sơn quân sự NATO'}], funFact: 'Nếu quả bom có vòng sơn màu xanh da trời, đó chỉ là bom tập ném (chứa cát hoặc bê tông) không có tính sát thương.' },
    { id: 'art-mk82-8', name: 'Bom MK82 (Mẫu 8 - Tiếng rít tử thần)', category: 'ammunition', sketchfabId: '7ae47a890f6e49b8b3aed0888ce1f08f', description: 'Tác động tâm lý khủng khiếp.', story: 'Khi rơi tự do từ độ cao 5.000m với tốc độ âm thanh, các khe hở ở cánh đuôi và rãnh lắp ngòi nổ cọ xát với không khí, tạo ra tiếng rít xé tai. Âm thanh này là tín hiệu báo động duy nhất, tính bằng giây, trước khi một vụ nổ long trời lở đất xảy ra.', unlocked: true, thumbnail: '', specs: [{label: 'Tốc độ rơi', value: '~1.000 km/h lúc chạm đất'}], funFact: 'Không lực Mỹ thỉnh thoảng cố tình hàn thêm những còi kim loại nhỏ vào cánh đuôi bom để tiếng rít này vang to hơn, nhằm mục đích khủng bố tinh thần đối phương.' },
    { id: 'art-mk82-27', name: 'Bom MK82 (Mẫu 27 - Chứng tích thời gian)', category: 'ammunition', sketchfabId: '1650a584c0c44f2f958367b194ba9bc0', description: 'Vỏ thép chịu sự ăn mòn của đất đỏ bazan.', story: 'Quả bom này được phát hiện trong tình trạng hoen rỉ nặng sau hơn 40 năm nằm dưới lòng đất đồi núi Tây Nguyên. Nó là minh chứng cho việc các loại vật liệu quân sự dù kiên cố đến đâu cũng bị thiên nhiên bào mòn.', unlocked: true, thumbnail: '', specs: [{label: 'Hiện trạng', value: 'Oxy hóa bề mặt (Rỉ sét)'}], funFact: 'Dù vỏ ngoài đã rỉ sét nát bấy, thuốc nổ Tritonal và kíp nổ bên trong lòng bom (nếu chưa nổ) vẫn có thể hoạt động hoàn hảo và phát nổ bất cứ lúc nào.' },
    { id: 'art-mk82-24', name: 'Bom MK82 (Mẫu 24 - Tàn tích hố bom)', category: 'ammunition', sketchfabId: 'a978eceda2504ef7a51c0b5a5cb6520d', description: 'Vết sẹo vĩnh viễn trên mặt đất Việt Nam.', story: 'Vụ nổ của một quả MK82 tạo ra cái hố sâu tới 2-3 mét, rộng 10 mét. Hàng triệu quả bom đã băm nát cảnh quan sinh thái. Sau chiến tranh, những hố bom này tích nước mưa tạo thành những chiếc ao tự nhiên, người dân tận dụng để thả cá, nuôi vịt.', unlocked: true, thumbnail: '', specs: [{label: 'Sức mạnh phá hủy', value: 'Đào xới đất đá'}], funFact: 'Làng Vĩnh Linh (Quảng Trị) từng được mệnh danh là "túi bom" vì có mật độ hố bom dày đặc đến mức không còn một khoảng đất bằng phẳng nào.' },
    { id: 'art-mk82-6', name: 'Bom MK82 (Mẫu 6 - Chong chóng kíp nổ)', category: 'ammunition', sketchfabId: 'fb9f0b622be14fabafb79b92f355cfb2', description: 'Hệ thống an toàn cơ học (Arming Vane).', story: 'Ở mũi bom có một chiếc chong chóng nhỏ. Khi rời máy bay, gió sẽ thổi chong chóng này quay tròn. Cần xoay khoảng vài trăm vòng (tương đương rơi vài trăm mét) thì một chốt an toàn bên trong mới được tháo ra, đưa bom vào trạng thái kích hoạt sẵn sàng nổ.', unlocked: true, thumbnail: '', specs: [{label: 'Cơ chế kích hoạt', value: 'Con quay gió (Arming Wire)'}], funFact: 'Nếu máy bay bay quá thấp hoặc thả trúng tán cây mềm khiến chong chóng không kịp quay đủ số vòng, quả bom sẽ tiếp đất mà không nổ (trở thành bom tịt/lép).' },
    { id: 'art-mk82-23', name: 'Bom MK82 (Mẫu 23 - Mối đe dọa UXO)', category: 'ammunition', sketchfabId: '766a82f185314c52859dc23250a56333', description: 'Vật liệu nổ còn sót lại sau chiến tranh (Unexploded Ordnance).', story: 'Dù chiến tranh đã qua đi hàng thập kỷ, mảnh đất miền Trung và Củ Chi vẫn còn hàng ngàn quả MK82 nằm im lìm dưới đất ruộng. Công binh Việt Nam và các tổ chức quốc tế (như MAG) vẫn miệt mài rà phá để trả lại sự bình yên cho đất đai canh tác.', unlocked: true, thumbnail: '', specs: [{label: 'Mức độ rủi ro', value: 'Cực kỳ nguy hiểm'}], funFact: 'Người dân phát hiện bom thường cắm một cây xào dài có buộc nilon đỏ cạnh đó làm dấu, rồi báo ngay cho lực lượng chức năng đến xử lý hủy nổ tại chỗ.' },
    { id: 'art-mk82-3', name: 'Bom MK82 (Mẫu 3 - Nghệ thuật điêu khắc)', category: 'ammunition', sketchfabId: 'd9770aaa3463479aa4c68125af00faa0', description: 'Vỏ bom được biến thành kiệt tác nghệ thuật (Trench Art).', story: 'Thép làm vỏ bom MK82 là loại thép rèn chất lượng cực tốt. Những người thợ thủ công đã biến thứ vũ khí chết chóc này thành những bình hoa, vật lưu niệm được chạm trổ họa tiết Trống Đồng, rồng bay phượng múa, mang thông điệp "Hóa giải hận thù, ươm mầm sự sống".', unlocked: true, thumbnail: '', specs: [{label: 'Phân loại', value: 'Nghệ thuật tái chế'}], funFact: 'Nghệ thuật "Trench Art" (Nghệ thuật chiến hào) bắt nguồn từ Thế chiến 1, khi binh lính khắc lên vỏ đạn pháo để giết thời gian.' },
    { id: 'art-mk82-12', name: 'Bom MK82 (Mẫu 12 - Khoen treo Lugs)', category: 'ammunition', sketchfabId: '95523ebae02b4994ba97cfbe035aa53e', description: 'Hai vòng khuyên móc ở lưng quả bom.', story: 'Bạn sẽ thấy hai cái khuyên chữ U (Lugs) bằng thép đặc được hàn chết trên thân bom. Đây là điểm ngàm để gắn quả bom vào giá treo (pylon) dưới cánh máy bay tiêm kích hoặc móc cẩu tải đạn trên tàu sân bay.', unlocked: true, thumbnail: '', specs: [{label: 'Khoảng cách khuyên', value: '14 inch (chuẩn NATO)'}], funFact: 'Nếu bay với tốc độ quá nhanh, lực cản không khí có thể làm rung lắc quả bom và bẻ gãy các khuyên treo này, vì vậy máy bay phải tuân thủ giới hạn tốc độ gắt gao khi mang bom.' },
    { id: 'art-mk82-26', name: 'Bom MK82 (Mẫu 26 - Sóng xung kích)', category: 'ammunition', sketchfabId: '50627c48512742c2ac0236024eb26c72', description: 'Uy lực hủy diệt trong không gian hẹp.', story: 'Khi MK82 phát nổ, sức mạnh không chỉ nằm ở những mảnh thép nóng chảy văng ra vận tốc 2.000m/s, mà còn ở sóng xung kích (Blast wave) cực mạnh đẩy ép không khí. Áp suất từ sóng xung kích có thể làm dập nát nội tạng con người dù không bị mảnh bom văng trúng.', unlocked: true, thumbnail: '', specs: [{label: 'Bán kính sát thương', value: 'Tối đa 80 mét'}], funFact: 'Địa đạo Củ Chi được thiết kế theo hình zíc-zắc (chữ Z) và có cửa sập kín để bẻ gãy hướng đi của sóng xung kích, bảo vệ những người trốn dưới hầm.' },
    { id: 'art-mk82-18', name: 'Bom MK82 (Mẫu 18 - Khí động học mũi nhọn)', category: 'ammunition', sketchfabId: '3323a1a39ed54b25b72035ff41f7f0f1', description: 'Thiết kế mũi hình giọt nước "Low Drag".', story: 'Dòng bom Mark 80 được khí động học hóa (gọn gàng, thuôn nhọn) để trang bị cho các máy bay phản lực siêu âm. So với bom thời Thế chiến 2 có hình bầu bĩnh và cồng kềnh, MK82 ít tạo ra lực cản không khí (drag), giúp máy bay mang được nhiều bom hơn mà vẫn bay nhanh.', unlocked: true, thumbnail: '', specs: [{label: 'Thiết kế', value: 'Low-Drag General Purpose'}], funFact: 'Tác giả của thiết kế thuôn nhọn hình giọt nước này là Ed Heinemann, một kỹ sư hàng không huyền thoại của hãng Douglas Aircraft.' },
    { id: 'art-mk82-4', name: 'Bom MK82 (Mẫu 4 - Khối lượng tiêu chuẩn 500 lbs)', category: 'ammunition', sketchfabId: 'd0046c5a4f2e47d6888426ce42f01761', description: 'Sự cân bằng hoàn hảo giữa sức mạnh và số lượng.', story: 'MK82 nặng 500 Lbs (~227kg) là "tiêu chuẩn vàng" của Không lực Hoa Kỳ. Trọng lượng này vừa đủ để phá sập cầu cống, lô cốt ngầm, nhưng cũng đủ nhẹ để một tiêm kích F-4 Phantom có thể đeo tới 18 quả một lúc, tạo ra mật độ hỏa lực rải thảm dày đặc hơn so với việc mang 1 quả bom khổng lồ.', unlocked: true, thumbnail: '', specs: [{label: 'Tỷ lệ nổ', value: '40% thuốc nổ / 60% vỏ thép'}], funFact: 'Lớp vỏ thép chiếm tới 60% khối lượng bom không phải là sự lãng phí. Nó được thiết kế để khi nổ sẽ xé rách thành hàng ngàn mảnh dao cạo kim loại bay găm vào các mục tiêu xung quanh.' },
    { id: 'art-mk82-17', name: 'Bom MK82 (Mẫu 17 - Cụm đuôi vây)', category: 'ammunition', sketchfabId: 'aed96266facd48489d8b14ea95a9ceac', description: 'Cụm vây đuôi hình nón (Conical Fin Assembly).', story: 'Bạn sẽ để ý đuôi bom có 4 cánh vây chữ thập. Những cánh vây này giữ vai trò như lông chim của mũi tên, ép luồng không khí đi qua để giữ cho quả bom luôn cắm thẳng mũi xuống đất khi rơi, đảm bảo ngòi nổ ở mũi chạm đất đầu tiên.', unlocked: true, thumbnail: '', specs: [{label: 'Bộ phận đuôi', value: 'MAU-93/B Fin'}], funFact: 'Góc của các cánh vây được bẻ nghiêng một góc siêu nhỏ (chỉ vài độ) để ép quả bom tự xoay tròn dọc theo trục dọc như một con quay hồi chuyển, gia tăng độ chính xác.' },

    // Một vài MK82 dự phòng để khớp với đủ số lượng 58 (điền các giá trị chung cho nhóm)
    ...Array.from({ length: 11 }).map((_, i) => ({
        id: `art-mk82-extra-${i+1}`, name: `Bom MK82 (Hồ sơ phân mảnh ${i+1})`, category: 'ammunition' as ArtifactCategory, sketchfabId: '9321a9c5a3124605b6a2fb303c3954cf',
        description: 'Bản quét kỹ thuật số (Scan 3D) chi tiết từ một hiện vật vỏ bom MK82 lưu trữ tại Bảo tàng Lịch sử Quân sự Việt Nam.',
        story: 'Quá trình số hóa bảo vật quân sự là bước tiến quan trọng. Nhóm chuyên gia TimeLens đã dùng máy quét laser và chụp hàng trăm bức ảnh từ các góc độ khác nhau để tạo ra tấm lưới đa giác (Mesh) và phủ lớp Texture rỉ sét chân thực này. Mục tiêu là để học sinh sinh viên có thể tiếp cận không gian lịch sử mà không cần phải chạm trực tiếp vào hiện vật dễ hư hỏng.', unlocked: true, thumbnail: '',
        specs: [
            { label: 'Phân loại', value: 'Vật thể số hóa 3D' }, { label: 'Độ phân giải', value: '4K Textures' },
            { label: 'Số lượng đa giác', value: '~120.000 Polygons' }
        ],
        funFact: 'Việc đưa mô hình 3D lên WebGL giúp nén một file mô hình gốc nặng 2GB xuống chỉ còn dưới 10MB để bạn có thể xem mượt mà trên điện thoại di động!'
    }))
]

// MỞ KHÓA TOÀN BỘ VÀ GẮN LINK ẢNH TĨNH CHO 58 HIỆN VẬT
export const MOCK_ARTIFACTS: Artifact[] = MOCK_ARTIFACTS_RAW.map(a => ({
    ...a,
    unlocked: true,
    thumbnail: getThumbnail(a.sketchfabId) // Lấy ảnh tĩnh cực nhanh
}))

// ==========================================
// COMPONENT: TỰ ĐỘNG LẤY ẢNH TỪ SKETCHFAB (LAZY LOAD - CHỐNG ĐỨNG MÁY)
// ==========================================
function SketchfabLazyThumbnail({ sketchfabId, alt }: { sketchfabId: string; alt: string }) {
    const [imgUrl, setImgUrl] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const imgRef = useRef<HTMLDivElement>(null)

    // 1. Chỉ kích hoạt khi người dùng cuộn tới thẻ này
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect() // Chỉ gọi 1 lần
                }
            },
            { rootMargin: '100px' } // Tải trước khi thẻ xuất hiện 100px
        )
        if (imgRef.current) observer.observe(imgRef.current)
        return () => observer.disconnect()
    }, [])

    // 2. Gọi API để lấy ảnh (Chỉ gọi khi isVisible = true)
    useEffect(() => {
        if (!isVisible) return;
        let isMounted = true;
        fetch(`https://sketchfab.com/oembed?url=https://sketchfab.com/models/${sketchfabId}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted && data && data.thumbnail_url) setImgUrl(data.thumbnail_url)
            })
            .catch(() => {});
        return () => { isMounted = false };
    }, [isVisible, sketchfabId])

    return (
        <div ref={imgRef} className="absolute inset-0 w-full h-full flex items-center justify-center">
            {!imgUrl ? (
                // Icon mờ nhạt lúc đang chờ tải
                <MaterialIcon name="image" className="text-5xl text-slate-300/40 animate-pulse" />
            ) : (
                <img
                    src={imgUrl}
                    alt={alt}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 mix-blend-multiply"
                />
            )}
        </div>
    )
}

export function ArtifactsPage() {
    const navigate = useNavigate()
    const artifacts = MOCK_ARTIFACTS

    // 1. Đọc trạng thái bộ lọc từ bộ nhớ tạm (nếu có)
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() => {
        return (sessionStorage.getItem('artifact_filter') as CategoryFilter) || 'all'
    })

    // 2. Tự động cuộn lại đúng vị trí cũ sau khi trang vừa render xong
    useEffect(() => {
        const savedScroll = sessionStorage.getItem('artifact_scroll')
        if (savedScroll) {
            setTimeout(() => {
                window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' })
            }, 100) // Nghỉ 0.1s chờ DOM vẽ xong danh sách
        }
    }, [])

    // 3. Hàm lưu bộ lọc mỗi khi người dùng đổi Tabs
    const handleFilterChange = (filter: CategoryFilter) => {
        setCategoryFilter(filter)
        sessionStorage.setItem('artifact_filter', filter)
    }

    // 4. Hàm "chốt" vị trí cuộn chuột ngay trước khi nhảy sang trang Chi tiết
    const handleViewDetail = (id: string) => {
        sessionStorage.setItem('artifact_scroll', window.scrollY.toString())
        navigate(`/artifacts/${id}`)
    }

    const filteredArtifacts = useMemo(
        () => artifacts.filter((a) => {
            if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
            return true
        }),
        [artifacts, categoryFilter]
    )

    return (
        <AppLayout
            activeBorder="right"
            mobileBackTo="/explore"
            mobileTitle="Bảo Tàng 3D"
        >
            <main className="bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-blue-100/40 min-h-screen w-full text-slate-800 font-sans selection:bg-[#FDC908] selection:text-[#0275FB] pb-24 relative overflow-hidden">

                {/* ========================================= */}
                {/* HERO BANNER - ĐÃ TRẢ VỀ NGUYÊN GỐC THEO YÊU CẦU */}
                {/* ========================================= */}
                <section className="relative overflow-visible bg-gradient-to-br from-[#0275FB] to-[#015cc8] border-b-4 border-[#FDC908] shadow-[0_10px_30px_rgba(2,117,251,0.3)] pt-6 md:pt-10 pb-12 md:pb-16 lg:pb-20">

                    {/* BỘ HIỆU ỨNG: LƯỚI KHÔNG GIAN 3D (HOLOGRAM GRID) */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

                    {/* BỘ HIỆU ỨNG: TIA QUÉT AR (SCAN LINE) */}
                    <div className="absolute top-0 left-0 w-full h-[200%] bg-gradient-to-b from-transparent via-[#388cf1]/20 to-transparent animate-[ar-scan_6s_linear_infinite] pointer-events-none" />

                    {/* Gradient Ánh sáng nổi bật Mascot */}
                    <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-[#FDC908]/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-[10%] w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-10 w-full flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 z-10 pt-10 md:pt-6 lg:pt-2">

                        {/* KHỐI TRÁI: TEXT & HƯỚNG DẪN */}
                        <div className="w-full lg:w-[60%] flex flex-col justify-start z-20">

                            {/* Badge (Nhãn trạng thái) */}
                            <div className="flex items-center gap-2.5 mb-4 bg-[#015cc8]/60 w-max px-4 py-2 rounded-full border border-white/20 backdrop-blur-md shadow-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#FDC908] animate-pulse shadow-[0_0_12px_#FDC908]" />
                                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] text-white drop-shadow-sm">
                                    Không gian trưng bày kỹ thuật số
                                </p>
                            </div>

                            {/* Tiêu đề Khổng lồ */}
                            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-[3.5rem] font-black text-white tracking-[-0.02em] leading-tight mb-4 drop-shadow-lg whitespace-nowrap">
                                BẢO TÀNG SỐ <span className="text-[#FDC908] drop-shadow-[0_0_15px_rgba(253,201,8,0.4)]">3D</span>
                            </h1>

                            {/* Mô tả */}
                            <p className="text-sm md:text-base lg:text-lg text-blue-50 font-medium leading-relaxed mb-8 max-w-3xl drop-shadow-md">
                                Vượt qua rào cản địa lý để chạm tay vào quá khứ. Khám phá và tương tác trực tiếp với các kỷ vật chiến tranh được phục dựng 3D, mang lại trải nghiệm lịch sử sống động ngay trên thiết bị của bạn.
                            </p>

                            {/* CÁC THẺ TÍNH NĂNG */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full xl:w-[90%]">
                                <div className="p-5 md:p-6 rounded-[1.5rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:bg-white/20 transition-all duration-300 group hover:-translate-y-1">
                                    <div className="w-12 h-12 rounded-full bg-[#FDC908] shadow-[0_0_15px_rgba(253,201,8,0.5)] flex items-center justify-center mb-4 text-[#0275FB] group-hover:scale-110 transition-transform">
                                        <MaterialIcon name="3d_rotation" className="text-xl" />
                                    </div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 drop-shadow-sm">TƯƠNG TÁC ĐA CHIỀU</h4>
                                    <p className="text-[11px] md:text-xs text-blue-100 font-medium leading-relaxed">Tự do xoay 360°, phóng to để quan sát chi tiết từng vết xước, rỉ sét và dấu ấn thời gian.</p>
                                </div>
                                <div className="p-5 md:p-6 rounded-[1.5rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:bg-white/20 transition-all duration-300 group hover:-translate-y-1">
                                    <div className="w-12 h-12 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center mb-4 text-[#0275FB] group-hover:scale-110 transition-transform">
                                        <MaterialIcon name="history_edu" className="text-xl" />
                                    </div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 drop-shadow-sm">HỒ SƠ LỊCH SỬ</h4>
                                    <p className="text-[11px] md:text-xs text-blue-100 font-medium leading-relaxed">Cung cấp thông số kỹ thuật chi tiết và những câu chuyện chiến đấu hào hùng đằng sau mỗi kỷ vật.</p>
                                </div>
                            </div>
                        </div>

                        {/* KHỐI PHẢI: GIAO DIỆN 3D SPATIAL & MASCOT */}
                        <div className="w-full lg:w-[45%] relative h-[400px] md:h-[480px] flex items-center justify-center shrink-0 mt-12 lg:mt-0 perspective-1000">

                            {/* Hào quang nền tổng thể */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#388cf1]/20 rounded-full blur-[60px] pointer-events-none" />

                            {/* [HÌNH ẢNH PHÍA SAU] - La Bàn / Bộ Đàm */}
                            {/* ĐÃ FIX: Mở rộng scale lên 1.15 để khi hover không bị lộ viền đen */}
                            <div className="absolute left-[0%] md:-left-[5%] top-[5%] md:top-[10%] w-[75%] max-w-[340px] aspect-[4/3] rounded-3xl border border-[#388cf1]/30 overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] z-0 transform rotate-y-[15deg] translate-z-[-60px] opacity-80 blur-[1px] transition-all duration-700 hover:blur-none hover:opacity-100 hover:z-30 hover:scale-105 hover:rotate-y-[0deg] cursor-pointer bg-[#050a14] group">
                                <div className="absolute inset-0 bg-[#0275FB]/20 mix-blend-overlay z-10 pointer-events-none transition-opacity duration-500 group-hover:opacity-0" />
                                <img
                                    src="/huy/3d-museum-hologram-1.png"
                                    alt="Digital Artifact Scan"
                                    className="w-full h-full object-cover scale-[1.15]"
                                />
                                <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] pointer-events-none z-20" />
                            </div>

                            {/* [HÌNH ẢNH PHÍA TRƯỚC] - Mũ Cối Hologram */}
                            {/* ĐÃ FIX: Dùng scale-[1.15] cho thẻ img thay vì dùng chung với class animate float để ảnh luôn chìm lấp viền đen */}
                            <div className="absolute right-[5%] md:right-0 top-[20%] w-[85%] max-w-[380px] aspect-[4/3] rounded-[2rem] border-2 border-white/10 overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.7),0_0_40px_rgba(253,201,8,0.15)] z-20 transform rotate-y-[-8deg] translate-z-[40px] transition-all duration-700 hover:scale-[1.03] hover:rotate-y-[0deg] bg-[#080d1a]">
                                <img
                                    src="/huy/3d-museum-hologram-2.png"
                                    alt="3D Hologram Artifact"
                                    // Scale to hơn khung chứa để khi di chuyển lên xuống không bị hụt mép
                                    className="w-full h-full object-cover scale-[1.15] animate-[float_8s_ease-in-out_infinite]"
                                />
                                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] pointer-events-none z-10" />

                                {/* ĐÃ XÓA: Bảng điều khiển chứa 2 icon góc trên bên trái */}
                            </div>

                            {/* [ẢNH MASCOT LƠ LỬNG] */}
                            <div className="absolute -bottom-10 md:-bottom-16 right-[-5%] md:-right-8 z-40 w-[180px] md:w-[220px] animate-[float_4s_ease-in-out_infinite] drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]">
                                <img src="/huy/mascot-8.png" alt="Chrono Mascot" className="w-full h-auto object-contain" />
                                <div className="absolute -top-12 -left-10 md:-top-16 md:-left-16 z-50 bg-white px-4 md:px-5 py-2 md:py-2.5 rounded-2xl rounded-br-none border-2 border-[#FDC908] shadow-[0_10px_25px_rgba(0,0,0,0.2)] animate-bounce w-max">
                                    <p className="text-[10px] md:text-xs font-black text-[#0275FB]">Wow! Cổ vật 3D kìa! ✨</p>
                                </div>
                            </div>

                            <style>{`
                                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
                                @keyframes ar-scan { 0% { transform: translateY(-50%); } 100% { transform: translateY(0%); } }
                            `}</style>
                        </div>
                    </div>
                </section>

                {/* --- HIỆU ỨNG ÁNH SÁNG NỀN KÉO DÀI XUỐNG DƯỚI --- */}
                <div className="absolute top-[500px] left-[-10%] w-[800px] h-[800px] bg-[#0275FB]/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-[800px] right-[-5%] w-[600px] h-[600px] bg-[#FDC908]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[10%] left-[20%] w-[500px] h-[500px] bg-[#0275FB]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-16 relative z-10">

                    {/* ========================================= */}
                    {/* BỘ LỌC DANH MỤC TRỰC QUAN & SÁNG SỦA */}
                    {/* ========================================= */}
                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-8 mb-10 border-b border-slate-200">
                        <div className="flex flex-wrap gap-3">
                            {/* Nút TẤT CẢ */}
                            <button
                                onClick={() => handleFilterChange('all')}
                                className={`px-7 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 border shadow-sm ${
                                    categoryFilter === 'all'
                                        ? 'bg-[#0275FB] text-white border-[#0275FB] shadow-[0_10px_20px_rgba(2,117,251,0.3)]'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-[#0275FB]/50 hover:text-[#0275FB] hover:bg-blue-50'
                                }`}
                            >
                                <MaterialIcon name="apps" className="text-xl" /> TẤT CẢ
                            </button>

                            {/* Các nút Danh mục động theo màu */}
                            {(Object.keys(CATEGORY_MAP) as ArtifactCategory[]).map((cat) => {
                                const isActive = categoryFilter === cat;
                                const info = CATEGORY_MAP[cat];

                                return (
                                    <button
                                        key={cat}
                                        onClick={() => handleFilterChange(cat)}
                                        className={`px-7 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 border shadow-sm ${
                                            isActive
                                                ? `${info.bgColor}${info.color} shadow-md ring-2 ring-current ring-opacity-20`
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <MaterialIcon name={info.icon} className={`text-xl ${isActive ? info.color : 'text-slate-400'}`} />
                                        {info.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                            <MaterialIcon name="memory" className="text-[#0275FB] text-xl animate-pulse" />
                            ĐÃ TẢI: <span className="text-[#0275FB] text-lg mx-1">{filteredArtifacts.length}</span> MÔ HÌNH
                        </div>
                    </div>

                    {/* ========================================= */}
                    {/* LƯỚI THẺ CỔ VẬT - UI GLASS SÁNG TRỌNG */}
                    {/* ========================================= */}
                    {filteredArtifacts.length === 0 ? (
                        <div className="text-center py-32 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white shadow-sm">
                            <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-6">
                                <MaterialIcon name="architecture" className="text-6xl text-[#0275FB]/40" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Không Có Dữ Liệu</h3>
                            <p className="text-base text-slate-500 font-medium">Danh mục này hiện chưa có hiện vật nào được phân loại.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                            {filteredArtifacts.map((artifact) => {
                                const catInfo = CATEGORY_MAP[artifact.category]

                                return (
                                    <button
                                        key={artifact.id}
                                        onClick={() => handleViewDetail(artifact.id)}
                                        // Hiệu ứng Hover nổi bóng kết hợp viền mượt mà
                                        className="group text-left rounded-[2rem] overflow-hidden transition-all duration-500 bg-white hover:-translate-y-2 cursor-pointer flex flex-col h-full border border-white/80 shadow-[0_10px_35px_rgba(2,117,251,0.06)] hover:border-[#0275FB]/40 hover:shadow-[0_25px_50px_rgba(2,117,251,0.15)]"
                                    >
                                        <div className="aspect-[4/3] w-full relative overflow-hidden bg-slate-100 p-6 flex items-center justify-center">
                                            {/* Badge Danh mục góc trái (Đã XÓA MÃ ID) */}
                                            <div className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-sm ${catInfo.bgColor}`}>
                                                <MaterialIcon name={catInfo.icon} className={`text-[12px] ${catInfo.color}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${catInfo.color}`}>{catInfo.label}</span>
                                            </div>

                                            <SketchfabLazyThumbnail sketchfabId={artifact.sketchfabId} alt={artifact.name} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                            <div className="absolute bottom-4 right-4 z-20 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg flex items-center justify-center translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                                <MaterialIcon name="3d_rotation" className="text-xl font-black text-[#0275FB]" />
                                            </div>
                                        </div>

                                        {/* Khối Text phía dưới Card */}
                                        {/* Dùng flex-1 để đẩy các card bằng nhau, items-center để canh giữa dòng */}
                                        <div className="p-6 flex-1 flex flex-col justify-center relative overflow-hidden bg-white border-t border-slate-100">
                                            <h3 className="font-black text-lg text-slate-800 leading-snug line-clamp-2 group-hover:text-[#0275FB] transition-colors">
                                                {artifact.name}
                                            </h3>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>
        </AppLayout>
    )
}