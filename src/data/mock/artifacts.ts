// src/data/mock/artifacts.ts

export type ArtifactCategory = 'aircraft' | 'armor' | 'artillery' | 'ammunition';

export interface Artifact {
    id: string;
    title: string;
    category: ArtifactCategory;
    sketchfabId: string;
    shortDescription: string;
    history: string;
    specs: Record<string, string>;
    thumbnail: string; // Tạm thời dùng ID để tự tạo thumbnail từ Sketchfab API sau
}

export const MOCK_ARTIFACTS: Artifact[] = [
    {
        id: 'art-c130',
        title: 'Máy bay vận tải C-130 Hercules',
        category: 'aircraft',
        sketchfabId: '6ca6750c8be9465c9f779b0c4c275fbb',
        shortDescription: 'Ngựa thồ không trung chủ lực của Không lực Hoa Kỳ.',
        history: 'C-130 Hercules là loại máy bay vận tải chiến thuật đa dụng hạng trung. Trong chiến tranh Việt Nam, C-130 đóng vai trò cực kỳ quan trọng trong việc thả dù tiếp tế, vận chuyển quân, và thậm chí được cải hoán thành các phiên bản máy bay cường kích hạng nặng (AC-130) mang pháo tự động để bắn phá mục tiêu mặt đất, đặc biệt là trên tuyến đường mòn Hồ Chí Minh.',
        specs: {
            'Trọng tải': 'Khoảng 20 tấn',
            'Tốc độ tối đa': '~592 km/h',
            'Tầm bay': '3.800 km',
            'Kíp lái': '5 người'
        },
        thumbnail: '/images/artifacts/c130-thumb.jpg' // Bạn cần thêm ảnh thật sau
    },
    {
        id: 'art-mig17',
        title: 'Tiêm kích MiG-17 (Số hiệu 6173)',
        category: 'aircraft',
        sketchfabId: '6e3a0e66435d42c8b520b7466becf65a',
        shortDescription: 'Cánh én bạc làm nên huyền thoại Không quân Việt Nam.',
        history: 'Dù bị đánh giá là lỗi thời so với các dòng F-4 Phantom của Mỹ, MiG-17 với sự linh hoạt xuất sắc trong không chiến quần vòng (dogfight) dưới bàn tay các phi công Việt Nam đã lập nên những chiến công vang dội. Nó là biểu tượng của tinh thần lấy nhỏ đánh lớn, lấy vũ khí thô sơ đánh bại khí tài hiện đại.',
        specs: {
            'Tốc độ tối đa': '1.145 km/h (Cận âm)',
            'Vũ khí': '1 pháo 37mm, 2 pháo 23mm',
            'Trần bay': '16.600 m',
            'Xuất xứ': 'Liên Xô'
        },
        thumbnail: '/images/artifacts/mig17-thumb.jpg'
    },
    {
        id: 'art-m48',
        title: 'Xe tăng chiến đấu chủ lực M48 Patton',
        category: 'armor',
        sketchfabId: '9dd1a1f178444688aa04a2fcd1b4dc9a',
        shortDescription: 'Nắm đấm thép của thiết giáp Mỹ trên chiến trường.',
        history: 'M48 Patton là dòng xe tăng chiến đấu chủ lực được Mỹ sử dụng rộng rãi. Tại Việt Nam, do địa hình rừng núi lầy lội, xe tăng thường được triển khai để bảo vệ căn cứ, càn quét hoặc yểm trợ bộ binh. Dù có hỏa lực mạnh, M48 lại trở thành mục tiêu lý tưởng cho các loại vũ khí chống tăng vác vai của Quân Giải phóng (như B-40, B-41).',
        specs: {
            'Trọng lượng': '49.6 tấn',
            'Vũ khí chính': 'Pháo 90mm M41',
            'Lớp giáp': 'Thép đúc (dày đến 110mm)',
            'Kíp xe': '4 người'
        },
        thumbnail: '/images/artifacts/m48-thumb.jpg'
    },
    {
        id: 'art-howitzer105',
        title: 'Pháo lựu 105mm',
        category: 'artillery',
        sketchfabId: '8a5a8a93fa214b04b2ca3c7eac7c9821',
        shortDescription: 'Xương sống hỏa lực pháo binh hạng nhẹ.',
        history: 'Lựu pháo 105mm là vũ khí yểm trợ cận chiến cực kỳ phổ biến. Chúng thường được đặt tại các "Căn cứ hỏa lực" (Firebases) xung quanh các khu vực trọng yếu để bắn dọn đường hoặc phản pháo. Đặc điểm nổi bật là tốc độ bắn nhanh và có thể dễ dàng vận chuyển bằng trực thăng đến các đỉnh đồi.',
        specs: {
            'Trọng lượng': '2.260 kg',
            'Tầm bắn tối đa': '11.27 km',
            'Tốc độ bắn': 'Tối đa 10 phát/phút',
            'Đạn': '105x372R (Đạn nổ, xuyên giáp, khói)'
        },
        thumbnail: '/images/artifacts/105mm-thumb.jpg'
    }
];

export const CATEGORY_LABELS: Record<ArtifactCategory, string> = {
    aircraft: 'Không Quân',
    armor: 'Thiết Giáp',
    artillery: 'Hỏa Lực',
    ammunition: 'Bom Đạn'
};