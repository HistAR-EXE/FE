// src/pages/ArtifactsPage.tsx
import { useState, useMemo } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { SmartImage } from '../shared/ui/SmartImage'

type StatusFilter = 'all' | 'unlocked' | 'locked'

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
}

// ==========================================
// DATA BẢO TÀNG 3D - ĐỢT 1 (11 Hiện vật)
// ==========================================
const MOCK_ARTIFACTS: Artifact[] = [
    // --- KHÔNG QUÂN (AIRCRAFT) ---
    {
        id: 'art-mig17-6173',
        name: 'Tiêm kích MiG-17 (Số hiệu 6173)',
        category: 'aircraft',
        sketchfabId: '6e3a0e66435d42c8b520b7466becf65a',
        description: 'Cánh én bạc làm nên huyền thoại Không quân Việt Nam.',
        story: 'Dù bị đánh giá là lỗi thời so với các dòng F-4 Phantom của Mỹ, MiG-17 với sự linh hoạt xuất sắc trong không chiến quần vòng (dogfight) dưới bàn tay các phi công Việt Nam đã lập nên những chiến công vang dội. Nó là biểu tượng của tinh thần lấy nhỏ đánh lớn, lấy vũ khí thô sơ đánh bại khí tài hiện đại.\n\nThông số kỹ thuật:\n- Tốc độ tối đa: 1.145 km/h\n- Vũ khí: 1 pháo 37mm, 2 pháo 23mm\n- Xuất xứ: Liên Xô',
        unlocked: true,
        thumbnail: 'https://media.sketchfab.com/models/6e3a0e66435d42c8b520b7466becf65a/thumbnails/ef6905541ea34cf69ba943a53e5e1bb3/d710cc52c6f14022a8ca6a2c91811e58.jpeg'
    },
    {
        id: 'art-aircraft-935',
        name: 'Tiêm kích (Số hiệu 935)',
        category: 'aircraft',
        sketchfabId: '793cfbd1a9e647339e73f16b50d54790',
        description: 'Mảnh ghép quan trọng của lưới lửa phòng không không quân.',
        story: 'Những chiếc tiêm kích với phù hiệu cờ đỏ sao vàng đã trở thành nỗi ám ảnh của các phi đội ném bom đối phương. Với chiến thuật "bay thấp kéo cao", tận dụng khả năng tăng tốc đột ngột, các biên đội tiêm kích Việt Nam thường xuyên tổ chức phục kích, đánh nhanh rút gọn, bảo vệ thành công bầu trời miền Bắc.\n\nThông số kỹ thuật:\n- Trạng thái: Đang phục dựng 3D\n- Loại nhiệm vụ: Đánh chặn / Hộ tống',
        unlocked: false, // Để khóa thử nghiệm UI
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-c130',
        name: 'Máy bay vận tải C-130 Hercules',
        category: 'aircraft',
        sketchfabId: '6ca6750c8be9465c9f779b0c4c275fbb',
        description: 'Ngựa thồ không trung chủ lực của Không lực Hoa Kỳ.',
        story: 'C-130 Hercules là loại máy bay vận tải chiến thuật đa dụng hạng trung. Trong chiến tranh Việt Nam, C-130 đóng vai trò cực kỳ quan trọng trong việc thả dù tiếp tế, vận chuyển quân, và thậm chí được cải hoán thành các phiên bản máy bay cường kích hạng nặng (AC-130) mang pháo tự động để bắn phá mục tiêu mặt đất.\n\nThông số kỹ thuật:\n- Trọng tải: Khoảng 20 tấn\n- Tốc độ tối đa: ~592 km/h\n- Tầm bay: 3.800 km',
        unlocked: true,
        thumbnail: 'https://media.sketchfab.com/models/6ca6750c8be9465c9f779b0c4c275fbb/thumbnails/266ad8cf3e284a65b7941dcfa25cc5df/3de7a5e0d4c14828b6d859b52a420b92.jpeg'
    },

    // --- THIẾT GIÁP (ARMOR) ---
    {
        id: 'art-m48',
        name: 'Xe tăng chiến đấu chủ lực M48 Patton',
        category: 'armor',
        sketchfabId: '9dd1a1f178444688aa04a2fcd1b4dc9a',
        description: 'Nắm đấm thép của thiết giáp Mỹ trên chiến trường.',
        story: 'M48 Patton là dòng xe tăng chiến đấu chủ lực được Mỹ sử dụng rộng rãi. Tại Việt Nam, do địa hình rừng núi lầy lội, xe tăng thường được triển khai để bảo vệ căn cứ, càn quét hoặc yểm trợ bộ binh. M48 thường là mục tiêu lý tưởng cho các loại vũ khí chống tăng vác vai của Quân Giải phóng (như B-40, B-41).\n\nThông số kỹ thuật:\n- Trọng lượng: 49.6 tấn\n- Vũ khí chính: Pháo 90mm M41\n- Lớp giáp: Thép đúc (dày đến 110mm)',
        unlocked: true,
        thumbnail: 'https://media.sketchfab.com/models/9dd1a1f178444688aa04a2fcd1b4dc9a/thumbnails/2b8429b699c2401f8df9e8e668ca05fc/449cd54050224424a1eab0ce0c5d6c8e.jpeg'
    },

    // --- HỎA LỰC SÚNG CỐI (ARTILLERY: MORTARS) ---
    {
        id: 'art-coi-82',
        name: 'Súng Cối 82mm',
        category: 'artillery',
        sketchfabId: 'a3917b80e1654276a3e3ca89c7ea8f35',
        description: 'Hỏa lực cầu vồng, khắc tinh của hầm hào công sự.',
        story: 'Súng cối 82mm là hỏa lực cấp tiểu đoàn cực kỳ lợi hại của Quân Giải phóng. Thiết kế đơn giản, dễ dàng tháo rời thành 3 phần (nòng, chân chống, đế) giúp các chiến sĩ dễ dàng mang vác xuyên rừng. Quỹ đạo đạn cầu vồng cho phép xạ thủ bắn vòng qua đồi núi, dội hỏa lực chính xác vào các căn cứ Mỹ - ngụy từ những góc khuất.\n\nThông số kỹ thuật:\n- Cỡ nòng: 82 mm\n- Trọng lượng: 56 kg\n- Tầm bắn tối đa: 3.040 m\n- Tốc độ bắn: 15-25 phát/phút',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-coi-81',
        name: 'Súng Cối 81mm',
        category: 'artillery',
        sketchfabId: '10a5c6cd795f4de7a2342287bce37767',
        description: 'Hỏa lực hỗ trợ bộ binh chiến thuật.',
        story: 'Súng cối 81mm là vũ khí hỏa lực gián tiếp tiêu chuẩn của cả hai phe trong chiến tranh. Nhờ tốc độ bắn nhanh và sức sát thương lớn đối với bộ binh không có công sự che chắn, súng cối thường được dùng để bẻ gãy các đợt tấn công của đối phương hoặc dọn đường trước khi xung phong.\n\nThông số kỹ thuật:\n- Cỡ nòng: 81 mm\n- Đặc điểm: Bắn đạn nổ phá, đạn khói, đạn chiếu sáng.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-coi-60',
        name: 'Súng Cối 60mm',
        category: 'artillery',
        sketchfabId: '928efef6bfda4a0784c98297f4c78031',
        description: 'Vũ khí yểm trợ cận chiến cấp đại đội.',
        story: 'Súng cối 60mm nổi bật nhờ sự nhỏ gọn, cơ động cao, có thể do một người lính mang vác và vận hành. Trong chiến thuật đánh du kích tại Củ Chi và miền Nam, cối 60mm thường được dùng để tập kích chớp nhoáng đồn bốt địch, bắn vài loạt đạn tạo sự hỗn loạn rồi lập tức rút lui qua hệ thống địa đạo trước khi địch kịp phản pháo.\n\nThông số kỹ thuật:\n- Cỡ nòng: 60 mm\n- Trọng lượng: Khoảng 19 kg\n- Tầm bắn tối đa: ~1.800 m',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },

    // --- HỎA LỰC ROCKET (ARTILLERY: ROCKET TUBES) ---
    {
        id: 'art-rocket-10',
        name: 'Ống phóng Rocket (Mẫu 10)',
        category: 'artillery',
        sketchfabId: 'df6fa99eef6d4a7e853a3e5c16b0b727',
        description: 'Khí tài phóng đạn phản lực đất đối đất.',
        story: 'Hệ thống ống phóng đạn phản lực (Rocket) là một phát minh quân sự đem lại sức ép tâm lý khủng khiếp. Không cần những nòng pháo khổng lồ, Quân Giải phóng có thể chế tạo những bệ phóng bằng tre hoặc ống thép đơn giản (như DKB 122mm, A-12) để dội những trận "mưa lửa" vào các sân bay, căn cứ hậu cần của địch trong chiến dịch Mậu Thân 1968.\n\nĐặc điểm:\n- Không có độ giật, chân đế nhẹ.\n- Hỏa lực áp chế diện rộng.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-11',
        name: 'Ống phóng Rocket (Mẫu 11)',
        category: 'artillery',
        sketchfabId: 'f0d7b807998945089b44b8c5ffdab343',
        description: 'Ống phóng rocket tự tạo cải tiến.',
        story: 'Sự sáng tạo của Quân giới Việt Nam thể hiện qua việc thu gom, chế tác lại các ống phóng rocket hỏng hoặc đạn chưa nổ của đối phương để đánh trả lại chính chúng. Những ống phóng này thường được chôn giấu bí mật trong rừng cao su, cài sẵn góc tọa độ, canh giờ khai hỏa tự động để bảo toàn lực lượng.\n\nThông tin hiện vật:\n- Tình trạng: Hoen rỉ do thời gian và khói đạn.\n- Khai quật tại: Khu vực vành đai Củ Chi.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-12',
        name: 'Ống phóng Rocket (Mẫu 12)',
        category: 'artillery',
        sketchfabId: '1d847e96c899471382fb4d72317bed68',
        description: 'Mảnh ghép của chiến tranh pháo binh du kích.',
        story: 'Trong bóng tối của những đêm tập kích, tia lửa phản lực từ ống phóng rocket thắp sáng cả một góc trời. Các dàn rocket được ngụy trang cẩn thận, tấn công bất ngờ và biến mất nhanh chóng khiến đối phương không thể dò tìm được vị trí phản pháo. Hiện vật này là minh chứng cho lối đánh xuất quỷ nhập thần của Quân Giải phóng.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-13',
        name: 'Ống phóng Rocket (Mẫu 13)',
        category: 'artillery',
        sketchfabId: '3c7d5ae0ceb8433487384b6073c94664',
        description: 'Di vật từ những trận pháo kích cường độ cao.',
        story: 'Mô hình số hóa 3D cho thấy rõ những vết nứt và biến dạng nhiệt trên thân ống phóng, minh chứng cho sức nóng khủng khiếp khi viên đạn phản lực thoát nòng. Việc bảo tồn và số hóa các ống phóng này giúp thế hệ sau hình dung được mức độ khốc liệt của chiến trường xưa.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    // ... (Giữ nguyên các hiện vật Không quân, Thiết giáp, Pháo/Cối ở trên) ...

    // ==========================================
    // DATA BẢO TÀNG 3D - ĐỢT 2 (12 Quả Bom MK82)
    // ==========================================
    // --- KHU VỰC BOM ĐẠN (AMMUNITION) ---
    {
        id: 'art-mk82-30',
        name: 'Bom MK82 (Mẫu 30) - Nguyên bản',
        category: 'ammunition',
        sketchfabId: 'b0ffea73263e4dcc8de89c991299894e',
        description: 'Vũ khí không kích chiến thuật phổ biến nhất của Hoa Kỳ.',
        story: 'Bom MK82 (Mark 82) là loại bom công dụng chung (general-purpose bomb) nặng 500 pound (~227 kg). Đây là một trong những loại vũ khí được thả xuống chiến trường Việt Nam, đặc biệt là vành đai Củ Chi nhiều nhất nhằm san phẳng hệ thống địa đạo.\n\nThông số kỹ thuật:\n- Trọng lượng: 227 kg\n- Lượng thuốc nổ: 89 kg (Tritonal/Minol)\n- Chiều dài: 2.22 m',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-29',
        name: 'Bom MK82 (Mẫu 29) - Chiến thuật rải thảm',
        category: 'ammunition',
        sketchfabId: '364b2532ea7e4c75b1eba675d2d48f1e',
        description: 'Mảnh ghép của chiến dịch "Rải thảm" B-52.',
        story: 'Một chiếc pháo đài bay B-52 Stratofortress có thể mang theo hàng chục quả bom MK82. Khi thực hiện chiến thuật rải thảm (carpet bombing), hàng trăm quả bom được trút xuống tạo thành các "hộp bom" hủy diệt mọi sự sống trên mặt đất, biến những cánh rừng cao su Củ Chi thành bình địa.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-28',
        name: 'Bom MK82 (Mẫu 28) - Biến thể ngòi nổ',
        category: 'ammunition',
        sketchfabId: 'ed4a5a2d31b1479883dc5b9527fc70ed',
        description: 'Được thiết kế để phá hủy bề mặt và công sự cạn.',
        story: 'MK82 có thể gắn nhiều loại ngòi nổ khác nhau: nổ chạm (impact), nổ chậm (delayed) hoặc ngòi nổ cận đích (proximity). Khi tấn công Củ Chi, địch thường dùng ngòi nổ chậm để bom cắm sâu xuống đất rồi mới nổ, nhằm tạo sóng xung kích phá vỡ các tầng hầm địa đạo.',
        unlocked: false, // Để khóa thử nghiệm UI
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-27',
        name: 'Bom MK82 (Mẫu 27) - Mảnh vỏ hoen rỉ',
        category: 'ammunition',
        sketchfabId: '1650a584c0c44f2f958367b194ba9bc0',
        description: 'Di tích được khai quật sau hàng chục năm nằm trong lòng đất.',
        story: 'Hiện vật này được người dân Củ Chi phát hiện trong quá trình canh tác nông nghiệp sau chiến tranh. Lớp vỏ thép dày đã bị rỉ sét nghiêm trọng. Những mảnh vỏ bom như thế này từng được người dân tận dụng để rèn thành dao, cuốc, xẻng phục vụ tái thiết đất nước.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-26',
        name: 'Bom MK82 (Mẫu 26) - Lưới lửa mặt đất',
        category: 'ammunition',
        sketchfabId: '50627c48512742c2ac0236024eb26c72',
        description: 'Minh chứng cho sức ép khốc liệt của chiến tranh.',
        story: 'Sức ép từ một quả bom MK82 có thể gây sát thương nghiêm trọng trong bán kính hàng chục mét. Mặc dù vậy, hệ thống địa đạo Củ Chi với thiết kế giật cấp, các ngã rẽ chữ Z và cửa sập chống sức ép đã vô hiệu hóa phần lớn uy lực của những quả bom này.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-25',
        name: 'Bom MK82 (Mẫu 25) - Chế tạo mìn tự tạo',
        category: 'ammunition',
        sketchfabId: '704d4bf0f2c94a58a286356ec16c35e5',
        description: 'Từ vũ khí của địch thành vũ khí của ta.',
        story: 'Do lỗi kỹ thuật hoặc tiếp đất trên nền phù sa mềm, nhiều quả MK82 không phát nổ. Quân giới Củ Chi đã liều mình tổ chức "cưa bom" (tháo ngòi nổ) để lấy thuốc nổ Tritonal bên trong. Số thuốc nổ này sau đó được dùng để chế tạo mìn định hướng, mìn chống tăng đánh trả lại xe bọc thép Mỹ.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-24',
        name: 'Bom MK82 (Mẫu 24) - Tàn tích hố bom',
        category: 'ammunition',
        sketchfabId: 'a978eceda2504ef7a51c0b5a5cb6520d',
        description: 'Những vết sẹo vĩnh viễn trên bản đồ Củ Chi.',
        story: 'Nếu bạn xem ảnh vệ tinh hoặc đi dạo trong khu bảo tồn địa đạo Củ Chi ngày nay, bạn sẽ dễ dàng bắt gặp những ao nước hình tròn liên tiếp nhau. Đó chính là những hố bom do MK82 tạo ra, nay đã được thiên nhiên và con người chữa lành.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-23',
        name: 'Bom MK82 (Mẫu 23) - Vũ khí chưa nổ (UXO)',
        category: 'ammunition',
        sketchfabId: '766a82f185314c52859dc23250a56333',
        description: 'Mối đe dọa thầm lặng sau ngày hòa bình.',
        story: 'Hàng ngàn quả bom MK82 vẫn còn nằm im lìm dưới lòng đất Việt Nam sau năm 1975, tạo thành khu vực ô nhiễm bom mìn (UXO) rộng lớn. Việc số hóa mô hình này là lời nhắc nhở về nỗ lực không ngừng nghỉ của lực lượng công binh trong việc rà phá, trả lại sự bình yên cho những vùng đất chết.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-22',
        name: 'Bom MK82 (Mẫu 22) - Tái sinh',
        category: 'ammunition',
        sketchfabId: '9471719def1746a69e8e07a639708aad',
        description: 'Vỏ bom được tái sử dụng thành kẻng báo động.',
        story: 'Trong thời chiến, những chiếc vỏ bom cạn thuốc nổ thường được treo lên cây làm "kẻng báo động". Tiếng vang đanh thép từ vỏ bom MK82 báo hiệu máy bay địch đang đến, giúp người dân kịp thời sơ tán xuống các hệ thống hầm trú ẩn.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-21',
        name: 'Bom MK82 (Mẫu 21) - Bằng chứng lịch sử',
        category: 'ammunition',
        sketchfabId: '8fdab390d6b446d3bd0ed0a58afd63c8',
        description: 'Hiện vật lịch sử lưu trữ tại các bảo tàng.',
        story: 'Mô hình 3D này được quét (scan) trực tiếp từ một vỏ bom MK82 đang được trưng bày tại Bảo tàng Chứng tích Chiến tranh. Việc số hóa giúp bảo quản trạng thái của hiện vật mãi mãi trên không gian mạng, không bị ăn mòn bởi thời gian.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-20',
        name: 'Bom MK82 (Mẫu 20) - Phục dựng 3D',
        category: 'ammunition',
        sketchfabId: 'df07168232bf4e7d85c24d55e35fc2e6',
        description: 'Quá trình làm sạch và phục hồi kết cấu 3D.',
        story: 'Để có được mô hình 3D hoàn chỉnh này, nhóm nghiên cứu đã phải chụp hàng trăm bức ảnh photogrammetry từ mọi góc độ của quả bom thực tế, sau đó dùng thuật toán để đan lưới (meshing) và phủ lớp vân bề mặt (texture) để tái tạo chính xác từng vết xước.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-19',
        name: 'Bom MK82 (Mẫu 19) - Ký ức thép',
        category: 'ammunition',
        sketchfabId: 'eb5f10a205564b21b64cd150f3957470',
        description: 'Lời nhắc nhở về một thời hoa lửa oai hùng.',
        story: 'Nhìn vào quả bom lạnh lẽo này, thế hệ trẻ hôm nay có thể cảm nhận một phần nào đó sức nặng và sự tàn khốc của chiến tranh. Qua đó càng thêm trân quý giá trị của hòa bình và sự kiên cường, bất khuất của những người lính đã giữ đất, giữ làng.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    // --- KHU VỰC HỎA LỰC ROCKET (ARTILLERY) ---
    {
        id: 'art-rocket-base',
        name: 'Ống phóng Rocket - Bệ phóng mặt đất',
        category: 'artillery',
        sketchfabId: '32f7a901e02c481aa8302a2a6558257c',
        description: 'Bệ phóng dã chiến tự tạo của bộ đội đặc công.',
        story: 'Khác với các pháo đài cố định của địch, hỏa tiễn của Quân Giải phóng dựa vào yếu tố bất ngờ. Các ống phóng thường được gá trên những chân đế chữ A hoặc chôn cọc tre rỗng ruột để định hướng. Đánh xong, bộ đội lập tức tháo rời và di chuyển nhanh chóng, để lại trận địa trống không khiến máy bay địch ném bom trả đũa vào hư vô.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },

    // --- KHU VỰC BOM ĐẠN (AMMUNITION) - BỘ SƯU TẬP MK82 ---
    {
        id: 'art-mk82-18',
        name: 'Bom MK82 (Mẫu 18) - Khí động học',
        category: 'ammunition',
        sketchfabId: '3323a1a39ed54b25b72035ff41f7f0f1',
        description: 'Thiết kế thon dài xé gió giảm lực cản.',
        story: 'Thiết kế hình giọt nước thuôn dài của MK82 giúp nó đạt được tốc độ rơi tối ưu và giảm thiểu lực cản không khí. Nhờ thiết kế này, các máy bay tiêm kích ném bom (như F-4 Phantom) có thể bay với tốc độ siêu âm mà không bị ảnh hưởng nhiều đến tính năng khí động học khi mang theo hàng chục quả bom dưới cánh.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-17',
        name: 'Bom MK82 (Mẫu 17) - Cánh đuôi',
        category: 'ammunition',
        sketchfabId: 'aed96266facd48489d8b14ea95a9ceac',
        description: 'Bộ vây đuôi ổn định quỹ đạo rơi.',
        story: 'Phần đuôi hình nón (conical fin) có rãnh xoắn là thiết kế tiêu chuẩn giúp quả bom xoay tròn nhẹ trong không trung, tạo sự ổn định theo nguyên lý con quay hồi chuyển (gyroscopic). Nếu không có cụm đuôi này, quả bom sẽ lộn nhào vô định và trượt mục tiêu.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-16',
        name: 'Bom MK82 (Mẫu 16) - Biến thể Snakeye',
        category: 'ammunition',
        sketchfabId: '90c754e49beb479ca72f4c4893f3d023',
        description: 'Bom hãm tốc độ bằng cánh xòe.',
        story: 'Để ném bom ở độ cao cực thấp mà không bị dính mảnh văng từ chính quả bom của mình, lính Mỹ sử dụng cụm đuôi hãm "Snakeye". Khi cắt bom, 4 cánh thép ở đuôi sẽ bung rộng như chiếc ô, hãm tốc độ quả bom lại, tạo thời gian cho máy bay thoát khỏi vùng nguy hiểm.',
        unlocked: false, // Để khóa UI
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-15',
        name: 'Bom MK82 (Mẫu 15) - Lớp sơn cảnh báo',
        category: 'ammunition',
        sketchfabId: '3e3c23d02ab142d0b6000860f6600246',
        description: 'Giải mã các vòng sơn vàng trên mũi bom.',
        story: 'Theo chuẩn NATO, lớp sơn ngoài màu xanh Olive Drab giúp ngụy trang, nhưng vạch màu vàng sọc quanh mũi bom mang ý nghĩa cảnh báo: "Bên trong có chứa thuốc nổ mạnh (High Explosive)". Các chuyên gia công binh Việt Nam thường dựa vào các vạch màu này để phân loại và xử lý.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-14',
        name: 'Bom MK82 (Mẫu 14) - Chứng tích rỉ sét',
        category: 'ammunition',
        sketchfabId: 'd9f86cbd3a624337b69785fcfd27decd',
        description: 'Sự ăn mòn của đất đai Củ Chi.',
        story: 'Trải qua nửa thế kỷ nằm dưới lớp đất đá cằn cỗi và bom mìn của Củ Chi, vỏ thép carbon của quả bom bị oxy hóa nặng nề tạo thành bề mặt sần sùi đặc trưng. Quá trình quét 3D (Photogrammetry) đã bảo lưu được nguyên vẹn màu sắc thời gian này.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-12',
        name: 'Bom MK82 (Mẫu 12) - Công tác Hậu cần',
        category: 'ammunition',
        sketchfabId: '95523ebae02b4994ba97cfbe035aa53e',
        description: 'Hành trình từ tàu sân bay đến chiến trường.',
        story: 'Để duy trì hỏa lực ném bom liên tục, quân đội Mỹ phải vận chuyển hàng triệu tấn MK82 từ các căn cứ ở Guam, Thái Lan hoặc từ tàu sân bay ở Biển Đông. Quá trình bốc xếp thường dùng xe nâng chuyên dụng với các đai thép cố định trên thân bom (lugs) mà bạn có thể nhìn thấy trên mô hình.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-13',
        name: 'Bom MK82 (Mẫu 13) - Tàn phá Môi trường',
        category: 'ammunition',
        sketchfabId: 'd40ba28d1f944198bacf08b4a13df7bd',
        description: 'Sức mạnh hủy diệt màu xanh của rừng núi.',
        story: 'Bên cạnh sát thương vật lý, hàng triệu tấn đất đá bị đào xới bởi MK82 đã phá hủy hệ sinh thái rừng tự nhiên. Rừng cao su, rừng rậm nhiệt đới biến thành "vùng đất chết" với bề mặt lồi lõm hố bom, khiến việc canh tác nông nghiệp sau năm 1975 vô cùng khó khăn.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-11',
        name: 'Bom MK82 (Mẫu 11) - Dấu ấn Công binh',
        category: 'ammunition',
        sketchfabId: '2de65a4b734240edad26fa223c977991',
        description: 'Những vết cắt thô sơ để vô hiệu hóa.',
        story: 'Trên mô hình này, nếu phóng to, bạn có thể nhận ra các dấu vết cưa cắt. Công binh Việt Nam bằng sự mưu trí và dũng cảm đã tìm ra nguyên lý hoạt động của ngòi nổ, dùng cưa tay và nước để làm mát, mở đường tháo thuốc nổ bên trong một cách cẩn trọng nhất.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-9',
        name: 'Bom MK82 (Mẫu 9) - Chiếc xuồng đặc biệt',
        category: 'ammunition',
        sketchfabId: '926beeca483e4ce6b635e8301b7748aa',
        description: 'Sự sáng tạo vô bờ bến của dân gian.',
        story: 'Sau khi lấy hết thuốc nổ, vỏ bom MK82 có đặc tính cực kỳ bền chắc và chống nước. Ở nhiều vùng quê sông nước miền Nam, người dân đã cắt dọc vỏ bom, hàn kín hai đầu để làm thành những chiếc vỏ lãi, xuồng ba lá thu nhỏ dùng để đi lại trên kênh rạch.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-10',
        name: 'Bom MK82 (Mẫu 10) - Cột trụ nhà',
        category: 'ammunition',
        sketchfabId: '30a6acad80a040ba9e6b06f449e31495',
        description: 'Tái thiết cuộc sống từ đống tro tàn.',
        story: 'Ở những vùng quê thiếu thốn vật liệu xây dựng hậu chiến, nhiều gia đình đã dựng đứng các vỏ bom MK82 rỗng ruột để làm cột nhà, chân đế trụ cầu. Quả bom mang sứ mệnh hủy diệt nay lại trở thành vật chống đỡ mái ấm cho con người.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-8',
        name: 'Bom MK82 (Mẫu 8) - Âm thanh tử thần',
        category: 'ammunition',
        sketchfabId: '7ae47a890f6e49b8b3aed0888ce1f08f',
        description: 'Tiếng rít xé gió ám ảnh bao thế hệ.',
        story: 'Khi rơi tự do với vận tốc lớn, các rãnh cắt và cánh đuôi của MK82 cọ xát với không khí tạo ra một tiếng rít chói tai. Âm thanh này là tín hiệu báo động duy nhất, tính bằng giây, trước khi mặt đất chao đảo. Mọi người lập tức buông bỏ mọi thứ để chui xuống nắp hầm bí mật.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-7',
        name: 'Bom MK82 (Mẫu 7) - Bơm mìn tự chế',
        category: 'ammunition',
        sketchfabId: '6b7b569c2d2f48fda3cfca2b5eaa958d',
        description: 'Bản sắc của chiến tranh nhân dân.',
        story: 'Chỉ với 89kg thuốc nổ lấy từ một quả MK82 lép, công trường xưởng vũ khí trong lòng địa đạo có thể chế tạo ra hàng trăm quả lựu đạn gài, mìn kíp hộp, hay mìn định hướng đánh phá xe tăng địch. Kẻ thù đã vô tình "tiếp tế" vũ khí cho Quân Giải phóng.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-6',
        name: 'Bom MK82 (Mẫu 6) - Cụm kíp nổ',
        category: 'ammunition',
        sketchfabId: 'fb9f0b622be14fabafb79b92f355cfb2',
        description: 'Phân tích cơ chế nổ cơ học bên trong.',
        story: 'Phần mũi và đuôi của MK82 đều có hốc để lắp kíp nổ. Khi được ném xuống, một cánh quạt nhỏ xíu ở mũi bom sẽ quay trong gió, tháo chốt an toàn để kích hoạt trạng thái "sẵn sàng nổ". Nếu cánh quạt này bị kẹt (do bùn đất, tán cây), bom sẽ tịt ngòi.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-5',
        name: 'Bom MK82 (Mẫu 5) - Công nghệ số hóa',
        category: 'ammunition',
        sketchfabId: 'ec37fc042ed14835a14df192e9c4266c',
        description: 'Hệ thống lưới (Mesh) phức tạp.',
        story: 'Để đảm bảo độ phân giải cao cho Bảo tàng số 3D, mô hình này sở hữu hàng trăm ngàn đa giác (polygons). Nếu bạn bật chế độ xem dây (Wireframe), bạn có thể thấy cấu trúc hình học được các lập trình viên tối ưu hóa để có thể chạy mượt mà trên nền tảng WebGL.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-4',
        name: 'Bom MK82 (Mẫu 4) - Cân nặng 500 Lbs',
        category: 'ammunition',
        sketchfabId: 'd0046c5a4f2e47d6888426ce42f01761',
        description: 'Khối lượng tiêu chuẩn của Không lực Mỹ.',
        story: '500 lbs (khoảng 227 kg) là kích cỡ tiêu chuẩn "vàng" của bom không kích: đủ nhẹ để một máy bay F-4 có thể mang tới 18 quả, và đủ nặng để một quả có thể làm nổ tung một boong-ke bê tông vững chắc.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-3',
        name: 'Bom MK82 (Mẫu 3) - Nghệ thuật điêu khắc',
        category: 'ammunition',
        sketchfabId: 'd9770aaa3463479aa4c68125af00faa0',
        description: 'Khi chiến tranh lùi xa, nhường chỗ cho nghệ thuật.',
        story: 'Một số vỏ bom MK82 được các nghệ nhân và nhà điêu khắc đục đẽo, chạm khắc các họa tiết hoa sen, rồng phượng để làm vật trang trí tại các khu di tích. Nó biểu tượng cho sự chuyển mình của dân tộc: biến đau thương thành khát vọng hòa bình tươi đẹp.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-mk82-2',
        name: 'Bom MK82 (Mẫu 2) - Bằng chứng lịch sử',
        category: 'ammunition',
        sketchfabId: '9e2e8e948b4d4ccbb7e9066ac6083578',
        description: 'Lưu giữ sự thật cho thế hệ mai sau.',
        story: 'Việc đưa những hiện vật này vào không gian ảo là bước đi thiết thực trong giáo dục lịch sử. Không cần phải bay đến tận Việt Nam, một học sinh ở bên kia nửa vòng trái đất cũng có thể xoay, lật, phóng to quả bom MK82 để hiểu về quy mô của cuộc chiến tranh.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    // ==========================================
    // DATA BẢO TÀNG 3D - ĐỢT CUỐI (19 Hiện vật)
    // ==========================================

    // --- BOM MK82 (Mẫu cuối cùng) ---
    {
        id: 'art-mk82-final',
        name: 'Bom MK82 - Nguyên khối',
        category: 'ammunition',
        sketchfabId: '9321a9c5a3124605b6a2fb303c3954cf',
        description: 'Vũ khí định hình chiến trường không kích.',
        story: 'Khép lại bộ sưu tập MK82 là phiên bản nguyên khối với lớp sơn và cụm đuôi hoàn chỉnh. Đây là đại diện tiêu biểu nhất cho sức mạnh không quân chiến thuật, thường được thả chùm từ 4 đến 6 quả mỗi lần cắt bom, tạo ra những đợt rung chấn lan xa hàng chục kilomet.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },

    // --- HỎA LỰC ROCKET (Ống phóng tự tạo/bắt giữ) ---
    {
        id: 'art-rocket-9',
        name: 'Ống phóng Rocket (Mẫu 9)',
        category: 'artillery',
        sketchfabId: '5ce6a1f2792446c6af5ce4b1adb320c7',
        description: 'Khí tài pháo binh gọn nhẹ, cơ động.',
        story: 'Không có xe kéo pháo hay đường xá thuận lợi, bộ đội Củ Chi vận chuyển những ống phóng rocket này bằng xe đạp thồ hoặc sức người xuyên rừng. Đến điểm tập kết, chúng được ngụy trang cẩn thận dưới những tán lá dày đặc.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-8',
        name: 'Ống phóng Rocket (Mẫu 8)',
        category: 'artillery',
        sketchfabId: 'b6321f74ae9444db96e2ae56a0ccea66',
        description: 'Đòn đánh úp từ cự ly xa.',
        story: 'Rocket là cơn ác mộng của các căn cứ đóng quân tĩnh. Không cần ngắm bắn trực tiếp qua thước ngắm quang học, xạ thủ tính toán phần tử bắn qua bản đồ và la bàn, gá góc tà bằng những chiếc thước đo tự chế mộc mạc nhưng độ chính xác lại rất đáng gờm.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-7',
        name: 'Ống phóng Rocket (Mẫu 7) - Hệ thống kích hỏa',
        category: 'artillery',
        sketchfabId: '14688d5e735445029394e71a61f26530',
        description: 'Bắn bằng điện, hẹn giờ bằng hương (nhang).',
        story: 'Để đảm bảo an toàn và rút lui trước khi địch phản pháo, chiến sĩ ta thường dùng hệ thống điểm hỏa bằng điện, kết hợp với các công tắc hẹn giờ tự chế làm từ nến hoặc những nén nhang cháy chậm.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-6-1',
        name: 'Ống phóng Rocket (Mẫu 6) - Cụm nòng',
        category: 'artillery',
        sketchfabId: 'c013e0951144428c8d49c471b015e200',
        description: 'Ống thép chịu áp lực cao.',
        story: 'Mỗi lần phóng, luồng khí phụt từ đạn rocket tạo ra nhiệt độ lên đến hàng ngàn độ C. Các ống phóng này được rèn từ hợp kim thép đặc biệt. Việc bảo quản chúng trong điều kiện độ ẩm cao ở địa đạo Củ Chi đòi hỏi rất nhiều công sức lau chùi, bôi trơn.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-5-1',
        name: 'Ống phóng Rocket (Mẫu 5)',
        category: 'artillery',
        sketchfabId: '1cd8f9fbfb784166964282f5a1b72d13',
        description: 'Mảnh ghép của hỏa lực du kích.',
        story: 'Trong nhiều trận đánh lớn, hàng chục ống phóng như thế này được bố trí đồng loạt, tạo thành một "Dàn nhạc lửa" gầm rít xé toạc màn đêm, giáng những đòn sấm sét vào trung tâm đầu não của đối phương.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-3',
        name: 'Ống phóng Rocket (Mẫu 3)',
        category: 'artillery',
        sketchfabId: '2e847610d6fd466e9d25aa280c3e09ca',
        description: 'Lưu lại dấu ấn thời gian.',
        story: 'Nhiều cụm ống phóng sau khi hoàn thành nhiệm vụ đã bị phá hủy để không lọt vào tay địch, số khác bị vùi lấp do bom đạn văng trúng. Mô hình này phục dựng lại một cụm ống phóng bị biến dạng sau một trận bom ác liệt.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-4-1',
        name: 'Ống phóng Rocket (Mẫu 4)',
        category: 'artillery',
        sketchfabId: '4efe479e359848779a15231571d4c052',
        description: 'Vũ khí ám ảnh các căn cứ tiền tiêu.',
        story: 'Tiếng nổ đầu nòng của rocket rất lớn, kèm theo quầng lửa sáng rực. Do đó, vị trí đặt bệ phóng thường cách xa khu vực hầm trú ẩn chính của quân ta để tránh thương vong khi pháo binh địch dội bão lửa phản công.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-rocket-2-1',
        name: 'Ống phóng Rocket (Mẫu 2)',
        category: 'artillery',
        sketchfabId: '886d5c0fac184238a759249f3b173ac7',
        description: 'Sức mạnh tinh thần của người lính.',
        story: 'Đằng sau sự thô sơ của những ống thép lạnh lẽo này là trí tuệ, mồ hôi và cả máu của lực lượng quân giới. Đưa được một ống phóng cùng những quả đạn nặng trĩu vào trận địa an toàn là cả một kỳ tích của nghệ thuật ngụy trang.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },

    // --- PHÁO BINH (ARTILLERY: HOWITZERS) ---
    {
        id: 'art-howitzer-105-2',
        name: 'Pháo Lựu 105mm (Khẩu số 2)',
        category: 'artillery',
        sketchfabId: '22d4841d41bb4526b8d65f1c59030c09',
        description: 'Vũ khí yểm trợ cận chiến cấp tiểu đoàn.',
        story: '105mm là cỡ nòng pháo phổ biến nhất trong các căn cứ hỏa lực (Firebases) của quân đội Mỹ và VNCH. Chúng được thiết kế để bắn đạn nổ mảnh sát thương bộ binh hoặc đạn khói chỉ điểm. Khẩu pháo này có thể quay 360 độ để bắn chi viện cho mọi hướng.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-howitzer-105-1',
        name: 'Pháo Lựu 105mm (Khẩu số 1)',
        category: 'artillery',
        sketchfabId: '8a5a8a93fa214b04b2ca3c7eac7c9821',
        description: 'Gắn liền với chiến thuật Căn cứ Hỏa lực.',
        story: 'Để yểm trợ cho các cuộc hành quân càn quét, địch thường bốc các khẩu 105mm bằng trực thăng Chinook thả xuống các đỉnh đồi trọc, tạo thành các cụm pháo đài tiền tiêu. Rất nhiều khẩu 105mm đã bị quân ta đánh chiếm và quay nòng nã đạn ngược lại vào căn cứ địch.',
        unlocked: true,
        thumbnail: 'https://media.sketchfab.com/models/8a5a8a93fa214b04b2ca3c7eac7c9821/thumbnails/a3cdb7c7dbf842deba4ecdf3fce3b8ff/a23270bb19c745cfbc320f78cc31464b.jpeg'
    },
    {
        id: 'art-howitzer-155-3',
        name: 'Pháo Lựu 155mm (Khẩu số 3)',
        category: 'artillery',
        sketchfabId: '56b72a53ac5745248de7a0c165a84c8c',
        description: 'Pháo binh hạng nặng yểm trợ tầm xa.',
        story: 'So với pháo 105mm, lựu pháo 155mm có kích thước và uy lực khủng khiếp hơn nhiều. Mỗi viên đạn 155mm nặng hơn 40kg, chứa lượng thuốc nổ cực lớn, đủ sức xé toạc các hầm ngầm hoặc hầm chữ A vững chắc nhất.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-howitzer-155-2',
        name: 'Pháo Lựu 155mm (Khẩu số 2)',
        category: 'artillery',
        sketchfabId: '3ba9afd665824c6f99082b369945aa5b',
        description: 'Sức mạnh hủy diệt tầm xa.',
        story: 'Pháo 155mm thường được kéo bằng xe tải hoặc xe xích chuyên dụng. Trong cuộc kháng chiến, thu được những khẩu pháo 155mm là chiến lợi phẩm mang tính chiến lược, giúp quân đội ta thành lập các trung đoàn pháo binh cơ giới hóa, thay đổi cục diện các trận đánh lớn.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-howitzer-155-1',
        name: 'Pháo Lựu 155mm (Khẩu số 1)',
        category: 'artillery',
        sketchfabId: '951bbc568ba143c284b53970e0ead5d8',
        description: 'Quái thú bằng thép trên trận địa.',
        story: 'Khi khai hỏa, sóng xung kích từ khẩu 155mm làm rung chuyển mặt đất xung quanh, hất tung bụi mù mịt. Việc mô phỏng 3D hiện vật này giúp người xem thấy rõ hệ thống hãm giật thủy lực khổng lồ được thiết kế để chịu tải cho những phát bắn sấm sét.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-m113-2',
        name: 'Xe Thiết giáp M113 (Mẫu 2)',
        category: 'armor',
        sketchfabId: '7521ff2c7f3346e3a220a0989493ec9e',
        description: 'Taxi chiến trường của bộ binh cơ giới.',
        story: 'M113 là dòng xe bọc thép chở quân (APC) mang tính biểu tượng, sử dụng hợp kim nhôm để giảm trọng lượng, giúp xe có thể bơi qua sông rạch. Tại miền Nam, M113 thường gắn súng máy 12.7mm trên nóc, yểm trợ hỏa lực cực mạnh cho bộ binh càn quét.',
        unlocked: false,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-m113-1',
        name: 'Xe Thiết giáp M113 (Mẫu 1)',
        category: 'armor',
        sketchfabId: 'b3b5269946c74b54a3244b4849963d63',
        description: 'Khắc tinh của đạn xuyên lõm B-40.',
        story: 'Dù linh hoạt, nhưng lớp giáp nhôm của M113 cực kỳ mỏng manh trước hỏa lực chống tăng vác vai (B-40, B-41) của quân ta. Khi trúng đạn xuyên lõm, hợp kim nhôm sẽ bốc cháy dữ dội ở nhiệt độ cao, biến chiếc xe thành "lò thiêu" sống.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    },
    {
        id: 'art-uh1a',
        name: 'Trực thăng UH-1A Huey',
        category: 'aircraft',
        sketchfabId: 'ce1ba25bdde84707a0ddc1f5202de3ae',
        description: 'Biểu tượng của chiến thuật "Trực thăng vận".',
        story: 'Tiếng cánh quạt phạch phạch đặc trưng của UH-1 Huey là âm thanh không thể thiếu của cuộc chiến. UH-1 thực hiện mọi nhiệm vụ: đổ quân chớp nhoáng (Air assault), tải thương (Dustoff), và yểm trợ hỏa lực bằng súng máy gắn ở cửa sườn. Rất nhiều UH-1 đã bị bắn hạ bởi mạng lưới súng phòng không tầm thấp bắn đón của du kích Củ Chi.',
        unlocked: true,
        thumbnail: '/images/fallback.jpg'
    }
]

// ==========================================
// COMPONENT: TRÌNH XEM 3D TỪ SKETCHFAB
// ==========================================
function Artifact3DViewer({ sketchfabId, title }: { sketchfabId: string; title: string }) {
    const [isLoading, setIsLoading] = useState(true)

    const embedUrl = `https://sketchfab.com/models/${sketchfabId}/embed?autostart=1&preload=1&transparent=1&ui_theme=light&ui_watermark=0&ui_infos=0&ui_inspector=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_animations=0`

    return (
        <div className="relative w-full h-full bg-slate-50 overflow-hidden group flex items-center justify-center rounded-2xl md:rounded-l-[2rem]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[80%] bg-[radial-gradient(ellipse_at_top,rgba(253,201,8,0.15)_0%,transparent_70%)] pointer-events-none z-10" />

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                    <MaterialIcon name="3d_rotation" className="text-4xl text-[#0275FB] animate-spin mb-4" />
                    <span className="text-xs font-bold text-[#0275FB] uppercase tracking-[0.2em] animate-pulse">
                        Đang kết nối thư viện 3D...
                    </span>
                </div>
            )}

            <iframe
                title={title}
                src={embedUrl}
                onLoad={() => setIsLoading(false)}
                className="absolute inset-0 w-full h-full z-0 border-none mix-blend-multiply"
                allowFullScreen
                allow="autoplay; fullscreen; xr-spatial-tracking"
            />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-[#0275FB]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30 flex items-center gap-2 shadow-[0_10px_25px_rgba(2,117,251,0.15)]">
                <MaterialIcon name="touch_app" className="text-[#0275FB] text-base animate-pulse" />
                <span className="text-[11px] text-[#0275FB] font-black uppercase tracking-widest">
                    Kéo để xoay • Cuộn để thu phóng
                </span>
            </div>
        </div>
    )
}

export function ArtifactsPage() {
    const artifacts = MOCK_ARTIFACTS

    // Khai báo state
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [selected, setSelected] = useState<Artifact | null>(null)

    // Khai báo useMemo sau state
    const filteredArtifacts = useMemo(
        () => artifacts.filter((a) => {
            if (statusFilter === 'unlocked' && !a.unlocked) return false
            if (statusFilter === 'locked' && a.unlocked) return false
            return true
        }),
        [artifacts, statusFilter]
    )

    return (
        <AppLayout
            activeBorder="right"
            mobileBackTo="/explore"
            mobileTitle="Bảo Tàng 3D"
        >
            <main className="bg-slate-50 min-h-screen w-full text-slate-800 font-sans selection:bg-[#FDC908] selection:text-[#0275FB] pb-24">

                {/* ========================================= */}
                {/* HERO BANNER - NỀN XANH THƯƠNG HIỆU & HIỆU ỨNG AR 3D */}
                {/* ========================================= */}
                <section className="relative overflow-visible bg-gradient-to-br from-[#0275FB] to-[#015cc8] border-b-4 border-[#FDC908] shadow-[0_10px_30px_rgba(2,117,251,0.3)] pt-6 md:pt-10 pb-12 md:pb-16 lg:pb-20">

                    {/* BỘ HIỆU ỨNG: LƯỚI KHÔNG GIAN 3D (HOLOGRAM GRID) */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

                    {/* BỘ HIỆU ỨNG: TIA QUÉT AR (SCAN LINE) */}
                    <div className="absolute top-0 left-0 w-full h-[200%] bg-gradient-to-b from-transparent via-[#388cf1]/20 to-transparent animate-[ar-scan_6s_linear_infinite] pointer-events-none" />

                    {/* Gradient Ánh sáng nổi bật Mascot */}
                    <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-[#FDC908]/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-[10%] w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />

                    {/* ĐÃ FIX: Mở rộng max-w-[1600px] để tràn đều 2 bên, giảm pt (padding-top) để đẩy nội dung lên cao hơn */}
                    <div className="relative max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-10 w-full flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 z-10 pt-10 md:pt-6 lg:pt-2">

                        {/* KHỐI TRÁI: TEXT & HƯỚNG DẪN */}
                        {/* ĐÃ FIX: Tăng tỷ lệ w-[60%] để khối text lấp đầy không gian trống tốt hơn */}
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

                            {/* Mô tả - ĐÃ FIX: Đổi max-w-xl thành max-w-3xl để chữ dàn đều ra chiều ngang thay vì bị bó hẹp */}
                            <p className="text-sm md:text-base lg:text-lg text-blue-50 font-medium leading-relaxed mb-8 max-w-3xl drop-shadow-md">
                                Vượt qua rào cản địa lý để chạm tay vào quá khứ. Khám phá và tương tác trực tiếp với các kỷ vật chiến tranh được phục dựng 3D, mang lại trải nghiệm lịch sử sống động ngay trên thiết bị của bạn.
                            </p>

                            {/* CÁC THẺ TÍNH NĂNG - ĐÃ FIX: Gỡ bỏ max-w-2xl để 2 thẻ tự do co giãn lấp đầy khoảng trống */}
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
                            {/* Hiệu ứng: Lùi về sau, mờ nhẹ, ám xanh, nghiêng 3D */}
                            <div className="absolute left-[0%] md:-left-[5%] top-[5%] md:top-[10%] w-[75%] max-w-[340px] aspect-[4/3] rounded-3xl border border-[#388cf1]/30 overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] z-0 transform rotate-y-[15deg] translate-z-[-60px] opacity-80 blur-[1px] transition-all duration-700 hover:blur-none hover:opacity-100 hover:z-30 hover:scale-105 hover:rotate-y-[0deg] cursor-pointer bg-[#050a14] group">
                                {/* Lớp phủ xanh tạo cảm giác chìm vào nền (sẽ biến mất khi hover) */}
                                <div className="absolute inset-0 bg-[#0275FB]/20 mix-blend-overlay z-10 pointer-events-none transition-opacity duration-500 group-hover:opacity-0" />

                                <img
                                    src="/huy/3d-museum-hologram-1.png" // Thay đường dẫn ảnh La Bàn vào đây
                                    alt="Digital Artifact Scan"
                                    className="w-full h-full object-cover scale-105"
                                />
                                <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] pointer-events-none z-20" />
                            </div>

                            {/* [HÌNH ẢNH PHÍA TRƯỚC] - Mũ Cối Hologram */}
                            {/* Hiệu ứng: Nổi bật, viền kính (Glassmorphism), bóng tỏa sáng vàng */}
                            <div className="absolute right-[5%] md:right-0 top-[20%] w-[85%] max-w-[380px] aspect-[4/3] rounded-[2rem] border-2 border-white/10 overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.7),0_0_40px_rgba(253,201,8,0.15)] z-20 transform rotate-y-[-8deg] translate-z-[40px] transition-all duration-700 hover:scale-[1.03] hover:rotate-y-[0deg] bg-[#080d1a]">
                                <img
                                    src="/huy/3d-museum-hologram-2.png" // Thay đường dẫn ảnh Mũ Cối vào đây
                                    alt="3D Hologram Artifact"
                                    className="w-full h-full object-cover animate-[float_8s_ease-in-out_infinite]"
                                />
                                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] pointer-events-none z-10" />

                                {/* BẢNG ĐIỀU KHIỂN NỔI (Floating HUD) BÊN TRONG ẢNH */}
                                <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
                                    <button className="w-10 h-10 rounded-xl bg-[#0B1120]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-[#0275FB] hover:border-[#0275FB] transition-all group">
                                        <MaterialIcon name="memory" className="text-[20px] text-[#FDC908] group-hover:text-white" />
                                    </button>
                                    <button className="w-10 h-10 rounded-xl bg-[#0B1120]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-[#0275FB] hover:border-[#0275FB] transition-all group">
                                        <MaterialIcon name="document_scanner" className="text-[20px] text-cyan-400 group-hover:text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* [ẢNH MASCOT LƠ LỬNG] */}
                            <div className="absolute -bottom-10 md:-bottom-16 right-[-5%] md:-right-8 z-40 w-[180px] md:w-[220px] animate-[float_4s_ease-in-out_infinite] drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]">
                                <img src="/huy/mascot-8.png" alt="Chrono Mascot" className="w-full h-auto object-contain" />

                                {/* Bong bóng thoại - Đặt chếch lên góc trái của Mascot */}
                                <div className="absolute -top-12 -left-10 md:-top-16 md:-left-16 z-50 bg-white px-4 md:px-5 py-2 md:py-2.5 rounded-2xl rounded-br-none border-2 border-[#FDC908] shadow-[0_10px_25px_rgba(0,0,0,0.2)] animate-bounce w-max">
                                    <p className="text-[10px] md:text-xs font-black text-[#0275FB]">Wow! Cổ vật 3D kìa! ✨</p>
                                </div>
                            </div>

                            <style>{`
                                @keyframes float {
                                    0%, 100% { transform: translateY(0px); }
                                    50% { transform: translateY(-12px); }
                                }
                                @keyframes ar-scan {
                                    0% { transform: translateY(-50%); }
                                    100% { transform: translateY(0%); }
                                }
                            `}</style>
                        </div>

                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 md:px-8 mt-20">

                    {/* ========================================= */}
                    {/* BỘ LỌC ĐẸP MẮT */}
                    {/* ========================================= */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200 pb-6 mb-10">
                        <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            {(['all', 'unlocked', 'locked'] as const).map((f) => {
                                const isActive = statusFilter === f;
                                let label = 'TẤT CẢ';
                                if(f === 'unlocked') label = 'ĐANG TRƯNG BÀY';
                                if(f === 'locked') label = 'ĐANG PHỤC DỰNG';

                                return (
                                    <button
                                        key={f}
                                        onClick={() => setStatusFilter(f)}
                                        className={`px-6 md:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-[#0275FB] text-white shadow-[0_5px_15px_rgba(2,117,251,0.3)]'
                                                : 'text-slate-500 hover:text-[#0275FB] hover:bg-blue-50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                            <MaterialIcon name="dataset" className="text-[#FDC908] text-lg" />
                            SỐ LƯỢNG: <span className="text-[#0275FB] text-base mx-1">{filteredArtifacts.length}</span>
                        </div>
                    </div>

                    {/* ========================================= */}
                    {/* LƯỚI THẺ CỔ VẬT */}
                    {/* ========================================= */}
                    {filteredArtifacts.length === 0 ? (
                        <div className="text-center py-32 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white shadow-sm">
                            <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-6">
                                <MaterialIcon name="architecture" className="text-6xl text-[#0275FB]/40" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Không Có Dữ Liệu</h3>
                            <p className="text-base text-slate-500 font-medium">Hồ sơ không khớp với phân loại hiện tại. Đề nghị thay đổi tùy chọn.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredArtifacts.map((artifact) => {
                                const isSelected = selected?.id === artifact.id

                                if (!artifact.unlocked) {
                                    return (
                                        <button
                                            key={artifact.id}
                                            onClick={() => setSelected(artifact)}
                                            className={`group text-left rounded-[2rem] overflow-hidden border bg-white transition-all duration-500 hover:shadow-[0_15px_30px_rgba(2,117,251,0.1)] cursor-pointer h-full flex flex-col ${isSelected ? 'border-[#0275FB] ring-2 ring-[#0275FB]' : 'border-slate-200 hover:border-[#0275FB]/50'}`}
                                        >
                                            <div className="aspect-[4/3] w-full relative bg-slate-50 flex items-center justify-center overflow-hidden">
                                                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(2,117,251,0.05)_50%)] bg-[length:100%_4px] z-10 pointer-events-none" />
                                                <img
                                                    src={artifact.thumbnail}
                                                    alt="Maintenance"
                                                    className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 blur-[4px]"
                                                />
                                                <div className="relative z-20 w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.05)] group-hover:scale-110 transition-transform">
                                                    <MaterialIcon name="construction" className="text-3xl text-[#0275FB]" />
                                                </div>
                                            </div>
                                            <div className="p-6 border-t border-slate-100 bg-white flex-1 flex flex-col justify-center">
                                                <h3 className="font-mono text-base font-bold text-slate-400 uppercase tracking-[0.2em] line-clamp-1 mb-2">
                                                    [ BẢO TRÌ KỸ THUẬT ]
                                                </h3>
                                                <p className="text-[10px] text-[#0275FB] uppercase tracking-widest font-black flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FDC908] animate-pulse" /> ĐANG PHỤC DỰNG 3D
                                                </p>
                                            </div>
                                        </button>
                                    )
                                }

                                return (
                                    <button
                                        key={artifact.id}
                                        onClick={() => setSelected(artifact)}
                                        className={`group text-left rounded-[2rem] overflow-hidden border transition-all duration-500 bg-white hover:-translate-y-2 cursor-pointer h-full flex flex-col ${
                                            isSelected ? `ring-2 ring-[#0275FB] border-[#0275FB]` : `border-slate-200 hover:border-[#0275FB]/30 hover:shadow-[0_20px_40px_rgba(2,117,251,0.1)]`
                                        }`}
                                    >
                                        <div className="aspect-[4/3] w-full relative overflow-hidden bg-slate-100">
                                            <SmartImage
                                                src={artifact.thumbnail}
                                                fallback="/images/fallback.jpg"
                                                alt={artifact.name}
                                                fill
                                                className="transition-transform duration-1000 group-hover:scale-110 object-cover mix-blend-multiply"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                            <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#FDC908] flex items-center justify-center shadow-md">
                                                <MaterialIcon name="3d_rotation" className="text-sm font-black text-[#0275FB]" />
                                            </div>
                                        </div>

                                        <div className="p-6 border-t border-slate-100 bg-white flex-1 flex flex-col justify-center relative overflow-hidden">
                                            <h3 className="font-black text-xl text-slate-800 leading-snug line-clamp-2 relative z-10 group-hover:text-[#0275FB] transition-colors">
                                                {artifact.name}
                                            </h3>
                                            <p className="text-[10px] text-slate-500 mt-3 uppercase tracking-[0.2em] font-black relative z-10 flex items-center gap-1.5">
                                                <MaterialIcon name="view_in_ar" className="text-[14px] text-[#0275FB]" /> XEM MÔ HÌNH 3D
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ========================================= */}
                {/* MODAL CHI TIẾT SÁNG SỦA, SANG TRỌNG */}
                {/* ========================================= */}
                {selected && (
                    <div
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all"
                        onClick={() => setSelected(null)}
                        role="presentation"
                    >
                        <div
                            className="w-full sm:max-w-6xl h-[92vh] sm:h-[85vh] overflow-hidden rounded-t-[3rem] sm:rounded-[3rem] bg-white shadow-[0_30px_60px_rgba(0,0,0,0.2)] flex flex-col animate-[fadeInUp_0.3s_ease-out]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={`h-2.5 w-full bg-gradient-to-r ${selected.unlocked ? 'from-[#0275FB] via-[#388cf1] to-[#0275FB]' : 'from-slate-300 to-slate-400'} shrink-0`} />

                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                                {/* KHU VỰC TRÌNH DIỄN 3D */}
                                <div className="w-full md:w-[55%] h-[40vh] md:h-full relative shrink-0 bg-slate-50">
                                    {selected.unlocked ? (
                                        <div className="absolute inset-0 p-2 sm:p-6">
                                            <Artifact3DViewer sketchfabId={selected.sketchfabId} title={selected.name} />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center flex-col p-6 text-center border-r border-slate-200">
                                            <div className="w-32 h-32 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                                                <MaterialIcon name="construction" className="text-6xl text-slate-300" />
                                            </div>
                                            <p className="font-mono text-slate-400 text-xl font-bold tracking-[0.4em] uppercase">RESTORING</p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setSelected(null)}
                                        className="absolute top-4 right-4 md:hidden w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-50 text-slate-600"
                                    >
                                        <MaterialIcon name="close" className="text-xl" />
                                    </button>
                                </div>

                                {/* KHU VỰC THÔNG TIN */}
                                <div className="w-full md:w-[45%] h-[52vh] md:h-full p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar border-l border-slate-100 bg-white">
                                    <div className="flex items-start justify-between gap-4 mb-6">
                                        <div>
                                            {selected.unlocked && (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0275FB]/5 border border-[#0275FB]/10 text-[10px] font-black text-[#0275FB] uppercase tracking-[0.2em] mb-4">
                                                    HỒ SƠ HIỆN VẬT <span className="text-[#FDC908]">#{selected.id.split('-')[1].toUpperCase()}</span>
                                                </span>
                                            )}
                                            <h2 className={`text-3xl md:text-4xl font-black leading-tight tracking-tighter ${selected.unlocked ? 'text-[#0275FB]' : 'text-slate-400 font-mono'}`}>
                                                {selected.unlocked ? selected.name : 'ĐANG PHỤC DỰNG SỐ HÓA'}
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(null)}
                                            className="hidden md:flex w-10 h-10 rounded-full bg-slate-100 items-center justify-center text-slate-500 hover:text-white hover:bg-red-500 transition-colors shrink-0"
                                        >
                                            <MaterialIcon name="close" className="text-xl" />
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        {selected.unlocked ? (
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                        <MaterialIcon name="info" className="text-base text-[#0275FB]" /> THÔNG TIN TỔNG QUAN
                                                    </h4>
                                                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                                        {selected.description}
                                                    </p>
                                                </div>

                                                <div className="p-6 rounded-3xl bg-[#FFF2C3]/30 border border-[#FDC908]/30 relative overflow-hidden">
                                                    <h4 className="text-[10px] font-black text-[#0275FB] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                                        <MaterialIcon name="history_edu" className="text-lg" /> CÂU CHUYỆN LỊCH SỬ
                                                    </h4>
                                                    <div className="space-y-4 font-sans text-sm text-slate-700 leading-relaxed font-medium relative z-10 whitespace-pre-line">
                                                        {selected.story}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8 h-full flex flex-col">
                                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                                    Hiện vật này hiện đang trong quá trình số hóa và phục dựng 3D bởi các chuyên gia. Dữ liệu quang trắc đang được xử lý để mang lại độ chân thực cao nhất. Vui lòng quay lại tham quan trong thời gian tới!
                                                </p>

                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 mt-auto relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0275FB]" />
                                                    <h4 className="text-[10px] font-black text-[#0275FB] uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                                        <MaterialIcon name="architecture" className="text-base animate-pulse" /> TIẾN ĐỘ BẢO TRÌ
                                                    </h4>
                                                    <div className="space-y-4">
                                                        <div className="flex gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                                                                <MaterialIcon name="memory" className="text-lg text-[#FDC908]" />
                                                            </div>
                                                            <p className="text-sm text-slate-600 font-medium leading-relaxed mt-1">
                                                                Hệ thống đang tiến hành xử lý <strong className="text-[#0275FB]">mô hình lưới (Mesh)</strong> và vân bề mặt (Texture).
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </AppLayout>
    )
}