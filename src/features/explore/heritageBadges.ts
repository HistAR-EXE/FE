// Shared presentation metadata. Eligibility, progress and awards come only from the server.
export interface HeritageBadge {
    id: string
    name: string
    rankLabel: string
    image: string
    badgeNumber: number
    description: string
    requirementText: string
    xpRequired: number
}

export const HERITAGE_BADGES: HeritageBadge[] = [
    {
        id: 'badge_compass_pioneer',
        name: 'La Bàn Khởi Nguyên',
        rankLabel: 'Khởi Hành · 50 XP',
        image: '/badges/badge-2.png',
        badgeNumber: 2,
        description:
            'Chiếc la bàn vàng kim xoay giữa tinh vân lịch sử, vinh danh bước chân đầu tiên của nhà thám hiểm tiến vào lòng đất Củ Chi.',
        requirementText: 'Đạt tối thiểu 50 XP toàn tài khoản hoặc hoàn thành 1 thử thách tầng ngầm',
        xpRequired: 50,
    },
    {
        id: 'badge_steel_footprint',
        name: 'Dấu Chân Đất Thép',
        rankLabel: 'Địa Chất · 4 Tầng Hầm',
        image: '/badges/badge-5.png',
        badgeNumber: 5,
        description:
            'Dấu chân rực sáng khắc họa tiết cổ đại in trên tấm bản đồ di sản, chứng nhận bạn đã thấu hiểu toàn bộ kết cấu 3 tầng sâu địa đạo.',
        requirementText: 'Hoàn thành trọn vẹn 4/4 thử thách Tầng Độ Sâu',
        xpRequired: 60,
    },
    {
        id: 'badge_cipher_master',
        name: 'Bậc Thầy Cơ Yếu',
        rankLabel: 'Mật Mã · 3 Mật Thư',
        image: '/badges/badge-8.png',
        badgeNumber: 8,
        description:
            'Cuộn mật thư đá khắc ký tự phát quang cùng ổ khóa vàng mở tung, trao tặng cho chuyên gia phá giải trọn bộ mật lệnh kháng chiến.',
        requirementText: 'Phá giải thành công cả 3/3 Mật Thư Chiến Khu',
        xpRequired: 225,
    },
    {
        id: 'badge_relic_detective',
        name: 'Thám Tử Sử Liệu',
        rankLabel: 'Điều Tra · 4 Chứng Cứ',
        image: '/badges/badge-6.png',
        badgeNumber: 6,
        description:
            'Chiếc kính lúp vàng soi rọi từng vết cắt vát chữ V và họa tiết lịch sử, minh chứng cho tư duy giám định chứng cứ sắc bén.',
        requirementText: 'Thu thập đủ 4/4 Mảnh Chứng Cứ & Công bố Kết luận điều tra',
        xpRequired: 230,
    },
    {
        id: 'badge_ancestor_soulmate',
        name: 'Tri Kỷ Tiền Nhân',
        rankLabel: 'Đối Thoại AI · 300 XP',
        image: '/badges/badge-1.png',
        badgeNumber: 1,
        description:
            'Khoảnh khắc người lữ hành trẻ đối thoại cùng bậc tiền nhân và Trợ lý AI Chrono giữa những trang sử vàng.',
        requirementText: 'Trò chuyện cùng Trợ lý AI Chrono, đạt 300 XP & lĩnh hội 2 Hồ sơ lịch sử',
        xpRequired: 300,
    },
    {
        id: 'badge_treasure_keeper',
        name: 'Người Giữ Kho Báu',
        rankLabel: 'Cổ Vật 3D · 500 XP',
        image: '/badges/badge-7.png',
        badgeNumber: 7,
        description:
            'Rương báu xanh viền vàng mở tung ánh hào quang của Trống đồng và hiện vật 3D, dành cho người khám phá Kho Cổ Vật & Điện mật 1968.',
        requirementText: 'Mở khóa cổ vật, giải đủ 3 Mật thư & đạt 500 XP toàn tài khoản',
        xpRequired: 500,
    },
    {
        id: 'badge_scholar_mind',
        name: 'Tinh Hoa Bác Học',
        rankLabel: 'Khảo Cứu · 6 Hồ Sơ',
        image: '/badges/badge-3.png',
        badgeNumber: 3,
        description:
            'Trí tuệ tỏa sáng giữa những thẻ bài thành cổ và cổ vật, tôn vinh nhà nghiên cứu đã vượt qua toàn bộ thử thách kiến thức tại Củ Chi.',
        requirementText: 'Hoàn thành trắc nghiệm & lĩnh hội trọn vẹn 6/6 Hồ sơ Đất Thép',
        xpRequired: 615,
    },
    {
        id: 'badge_time_envoy',
        name: 'Sứ Giả Thời Không',
        rankLabel: 'Tour 360° & Sa Bàn',
        image: '/badges/badge-4.png',
        badgeNumber: 4,
        description:
            'Ngôi sao la bàn lồng trong vòng nguyệt quế vàng trước Cổng Thời Gian, biểu tượng của lữ khách đã bước qua Tour 360° và Sa bàn Lịch sử.',
        requirementText: 'Trải nghiệm Tham quan 360°, Sa bàn Lịch sử Cedar Falls & đạt 600 XP',
        xpRequired: 600,
    },
    {
        id: 'badge_all_seeing_eye',
        name: 'Nhãn Quan Xuyên Thấu',
        rankLabel: 'Huyền Thoại · Toàn Diện',
        image: '/badges/badge-10.png',
        badgeNumber: 10,
        description:
            'Mắt thần công nghệ phóng chiếu luồng sáng xuyên qua lớp đất đá, mở ra cánh cổng di sản rực rỡ — danh hiệu tối thượng của TimeLens.',
        requirementText: 'Đạt 1.130 XP & hoàn tất mọi trải nghiệm (360°, Sa bàn, AI, Cổ vật)',
        xpRequired: 1130,
    },
]

