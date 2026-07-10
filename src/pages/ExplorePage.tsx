// src/pages/ExplorePage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ExploreTopNav } from '../components/layout/TopNav'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { buildChatPath } from '../features/chat/chatRoute'
import { MaterialIcon } from '../components/ui/MaterialIcon'

type ZoneFilter = 'all' | 'military' | 'memorial' | 'underground' | 'tech'

interface HotspotCard {
    id: string
    name: string
    zone: ZoneFilter
    desc: string
    image: string
    xp: number
    arSlug?: string
}

const CU_CHI_HOTSPOTS: HotspotCard[] = [
    {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Đền Tưởng Niệm Liệt Sĩ Bến Dược',
        zone: 'memorial',
        desc: 'Công trình kiến trúc mang đậm bản sắc văn hóa Việt, nơi tưởng niệm 45.639 liệt sĩ đã hy sinh vì độc lập dân tộc.',
        image: '/media/cu-chi/hotspots/ben-duoc.jpg',
        xp: 100
    },
    {
        id: '22222222-2222-2222-2222-222222222224',
        name: 'Khu Trưng Bày Khí Tài Ngoài Trời',
        zone: 'military',
        desc: 'Trưng bày xác xe tăng M41, M48, pháo 105mm, máy bay C-130 chiến lợi phẩm thu được của quân đội Mỹ.',
        image: '/media/cu-chi/hotspots/khi-tai.jpg',
        xp: 80,
        arSlug: 'xe-tang-m41'
    },
    {
        id: '22222222-2222-2222-2222-222222222227',
        name: 'Khu Tái Hiện Vùng Giải Phóng & Bếp Hoàng Cầm',
        zone: 'underground',
        desc: 'Trải nghiệm sinh hoạt dưới hầm ngầm, hệ thống thoát khói Hoàng Cầm trứ danh và thưởng thức khoai mì.',
        image: '/media/cu-chi/hotspots/bep-hoang-cam.jpg',
        xp: 120
    },
    {
        id: '22222222-2222-2222-2222-222222222223',
        name: 'Căn Cứ Bộ Tư Lệnh Quân Khu Sài Gòn - Gia Định',
        zone: 'military',
        desc: 'Sở chỉ huy ngầm với hệ thống hầm họp, phòng giải phẫu và sa bàn chỉ đạo chiến dịch.',
        image: '/media/cu-chi/hotspots/bo-tu-lenh.jpg',
        xp: 90
    },
    {
        id: '22222222-2222-2222-2222-222222222226',
        name: 'Nhà Biểu Diễn Sa Bàn & Phim Lịch Sử 3D',
        zone: 'tech',
        desc: 'Không gian trình chiếu công nghệ cao mô phỏng chiến thuật đào hầm 3 tầng ngầm kỳ công của du kích.',
        image: '/media/cu-chi/hotspots/sa-ban-3d.jpg',
        xp: 70
    },
    {
        id: '22222222-2222-2222-2222-222222222225',
        name: 'Căn Cứ Khu Ủy Sài Gòn - Gia Định',
        zone: 'underground',
        desc: 'Hệ thống hầm ngầm sâu 8m ẩn giấu giữa rừng cây giáng hương già, kiên cố trước bom đạn B-52.',
        image: '/media/cu-chi/hotspots/khu-uy.jpg',
        xp: 85
    }
]

const ZONE_BUTTONS: { id: ZoneFilter; label: string }[] = [
    { id: 'all', label: 'Tất Cả Điểm Chạm' },
    { id: 'underground', label: 'Hầm Ngầm & Đời Sống' },
    { id: 'military', label: 'Khí Tài Quân Sự' },
    { id: 'memorial', label: 'Đền Tưởng Niệm' },
    { id: 'tech', label: 'Sa Bàn & AR 3D' },
]

export function ExplorePage() {
    const navigate = useNavigate()
    const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all')

    const filteredHotspots = useMemo(() => {
        if (zoneFilter === 'all') return CU_CHI_HOTSPOTS
        return CU_CHI_HOTSPOTS.filter(h => h.zone === zoneFilter)
    }, [zoneFilter])

    return (
        <AppLayout activeBorder="right" topNav={<ExploreTopNav backTo="/home" backLabel="Trang chủ" />}>
            <main className="flex-grow pt-[88px] px-4 md:px-8 pb-20 w-full space-y-8 bg-[#0f1015] text-white selection:bg-[#fe951c] selection:text-black">

                {/* --- HERO BANNER CỦ CHI VỚI SÂN KHẤU ĐẠI SỨ DU KÍCH 3D --- */}
                <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-r from-[#1a1d2c] via-[#161824] to-[#0f1015] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                    {/* Hào quang nền sinh động */}
                    <div className="absolute -left-20 -top-20 w-96 h-96 bg-[#fe951c]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
                    <div className="absolute right-10 -bottom-20 w-96 h-96 bg-[#388cf1]/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(#fe951c_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                        {/* Cột trái 7 phần: Cốt truyện & Giới thiệu vai trò Đại sứ */}
                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                                <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black font-black text-[10px] uppercase tracking-wider shadow-[0_0_15px_rgba(254,149,28,0.4)]">
                                    ✦ ĐẠI SỨ DI SẢN TIMELENS
                                </span>
                                <span className="px-3.5 py-1 rounded-full bg-white/10 text-gray-200 font-bold text-[10px] uppercase border border-white/15 backdrop-blur-md">
                                    ĐỊA ĐẠO CỦ CHI
                                </span>
                            </div>

                            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                                Gặp Gỡ Người Dẫn Đường <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fe951c] via-[#fff2a1] to-[#388cf1]">
                                    Chị Năm & Anh Ba
                                </span>
                            </h1>

                            {/* Thẻ giới thiệu cốt truyện gần gũi */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 backdrop-blur-md shadow-inner text-left">
                                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal">
                                    Chào mừng bạn đến với vùng Đất Thép! Hãy để hai đại sứ AI đồng hành cùng bạn xuyên suốt hành trình khám phá:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/10">
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-[#fdb438] shrink-0 mt-1.5 shadow-[0_0_8px_#fdb438]" />
                                        <p className="text-xs text-gray-300 leading-normal">
                                            <strong className="text-[#fff2a1] font-bold">Chị Năm (Nữ du kích):</strong> Người con gái kiên trung, am hiểu từng ngóc ngách địa đạo. Chị sẽ kể cho bạn nghe những câu chuyện sinh hoạt, nghĩa tình quân dân ấm áp dưới lòng đất.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-[#388cf1] shrink-0 mt-1.5 shadow-[0_0_8px_#388cf1]" />
                                        <p className="text-xs text-gray-300 leading-normal">
                                            <strong className="text-cyan-300 font-bold">Anh Ba (Chiến sĩ):</strong> Chuyên gia sa bàn và kỹ thuật quân sự. Anh sẽ hướng dẫn bạn giải mã cấu trúc hầm chông, bẫy du kích và chiến thuật chiến tranh nhân dân độc đáo.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Các nút thao tác nhanh */}
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-1">
                                <button
                                    onClick={() => navigate(buildChatPath())}
                                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] hover:scale-105 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(254,149,28,0.5)] flex items-center gap-2 cursor-pointer"
                                >
                                    <MaterialIcon name="forum" className="text-lg" />
                                    <span>Trò Chuyện Cùng Đại Sứ</span>
                                </button>

                                <button
                                    onClick={() => navigate(`/tour/360/${CU_CHI_LOCATION_ID}`)}
                                    className="px-5 py-3.5 rounded-xl bg-[#388cf1]/20 hover:bg-[#388cf1]/30 border border-[#388cf1]/50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
                                >
                                    <MaterialIcon name="360" className="text-base text-[#388cf1]" />
                                    <span>Vào Tour 360° Thực Tế</span>
                                </button>
                            </div>
                        </div>

                        {/* Cột phải 5 phần: Sân khấu 2 Nhân vật đứng kề vai sát cánh */}
                        <div className="lg:col-span-5 relative flex items-center justify-center pt-8 lg:pt-0">

                            {/* Thảm hào quang nền mờ dưới chân (Chỉ giữ ánh sáng blur mờ, ĐÃ XÓA SẠCH thanh khung ngang có viền) */}
                            <div className="absolute bottom-10 w-64 sm:w-80 h-16 bg-gradient-to-r from-[#fe951c]/25 via-transparent to-[#388cf1]/25 rounded-full blur-2xl pointer-events-none" />

                            {/* Khối chứa 2 nhân vật kề sát nhau */}
                            <div className="relative z-10 flex items-end justify-center gap-4 sm:gap-8 h-64 sm:h-72 pb-2">

                                {/* Nhân vật Nữ (Chị Năm Du Kích - VÀNG CAM) */}
                                <div
                                    onClick={() => navigate(buildChatPath({ persona: 'chi-nam' }))}
                                    className="relative group cursor-pointer flex flex-col items-center transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 z-10"
                                >
                                    {/* Bong bóng thoại */}
                                    <div className="absolute -top-11 bg-[#1b1e2c]/95 border border-[#fdb438]/60 text-[#fff2a1] text-[11px] font-bold px-3 py-1.5 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                                        Hỏi Chị chuyện về địa đạo nha!
                                    </div>

                                    {/* Ảnh nhân vật */}
                                    <img
                                        src="/media/characters/nu-du-kich.png"
                                        alt="Chị Năm Du Kích"
                                        className="h-56 sm:h-64 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)] filter contrast-105 transition-transform duration-500 group-hover:drop-shadow-[0_0_25px_rgba(253,180,56,0.5)] relative z-10"
                                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' }}
                                    />

                                    {/* Đốm hào quang ngay dưới bàn chân Chị Năm */}
                                    <div className="absolute bottom-7 w-20 sm:w-24 h-3 bg-[#fe951c]/50 rounded-full blur-md z-0 group-hover:bg-[#fe951c]/80 transition-all" />

                                    {/* Thẻ tên màu Vàng Cam (Độc lập, không bị thanh nào đè phía sau) */}
                                    <div className="mt-2 px-3 py-1 rounded-lg bg-[#161824]/95 border border-[#fdb438]/60 shadow-lg flex items-center gap-1.5 z-20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#fdb438] animate-ping" />
                                        <span className="text-[10px] font-black text-[#fdb438] tracking-wide">
                                            CHỊ NĂM DU KÍCH
                                        </span>
                                    </div>
                                </div>

                                {/* Nhân vật Nam (Anh Ba Chiến Sĩ - XANH CÔNG NGHỆ) */}
                                <div
                                    onClick={() => navigate(buildChatPath({ persona: 'anh-ba' }))}
                                    className="relative group cursor-pointer flex flex-col items-center transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 z-10"
                                >
                                    {/* Bong bóng thoại */}
                                    <div className="absolute -top-11 bg-[#1b1e2c]/95 border border-[#388cf1]/60 text-cyan-300 text-[11px] font-bold px-3 py-1.5 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                                        Xem sa bàn tác chiến cùng Anh!
                                    </div>

                                    {/* Ảnh nhân vật */}
                                    <img
                                        src="/media/characters/nam-du-kich.png"
                                        alt="Anh Ba Chiến Sĩ"
                                        className="h-56 sm:h-64 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)] filter contrast-105 transition-transform duration-500 group-hover:drop-shadow-[0_0_25px_rgba(56,140,241,0.5)] relative z-10"
                                        onError={(e) => { e.currentTarget.src = '/media/characters/nam-du-kich.jpg' }}
                                    />

                                    {/* Đốm hào quang ngay dưới bàn chân Anh Ba */}
                                    <div className="absolute bottom-7 w-20 sm:w-24 h-3 bg-[#388cf1]/50 rounded-full blur-md z-0 group-hover:bg-[#388cf1]/80 transition-all" />

                                    {/* Thẻ tên màu Xanh Cyan (Độc lập, sắc nét) */}
                                    <div className="mt-2 px-3 py-1 rounded-lg bg-[#161824]/95 border border-[#388cf1]/60 shadow-lg flex items-center gap-1.5 z-20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#388cf1] animate-ping" />
                                        <span className="text-[10px] font-black text-[#388cf1] tracking-wide">
                                            ANH BA CHIẾN SĨ
                                        </span>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </section>

                {/* --- BỘ LỌC PHÂN KHU DI TÍCH --- */}
                <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161824] p-4 rounded-2xl border border-white/10 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <MaterialIcon name="filter_list" className="text-base text-[#fe951c]" />
                        <span>Phân khu điểm chạm:</span>
                    </div>

                    <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 custom-scrollbar">
                        {ZONE_BUTTONS.map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setZoneFilter(btn.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                    zoneFilter === btn.id
                                        ? 'bg-[#fe951c] text-black shadow-[0_0_15px_rgba(254,149,28,0.4)] scale-105'
                                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* --- DANH SÁCH HOTSPOTS CỦ CHI --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredHotspots.map((item) => (
                        <article
                            key={item.id}
                            className="bg-[#161824] hover:bg-[#1a1d2c] border border-white/10 hover:border-[#fe951c]/60 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between group"
                        >
                            <div>
                                <div className="h-48 relative overflow-hidden bg-black">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-transparent to-transparent" />
                                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-xs font-black text-emerald-400 shadow-md">
                                        +{item.xp} XP
                                    </span>
                                </div>

                                <div className="p-6 space-y-2.5">
                                    <h3 className="text-lg font-black text-white group-hover:text-[#fdb438] transition-colors leading-snug">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-300 leading-relaxed font-medium line-clamp-3">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>

                            {/* CÁC NÚT THAO TÁC CÔNG NGHỆ CHUẨN TRÊN MỖI HOTSPOT */}
                            <div className="p-6 pt-0 flex flex-wrap gap-2">
                                <button
                                    onClick={() => navigate(`/tour/360/${CU_CHI_LOCATION_ID}`)}
                                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <MaterialIcon name="360" className="text-sm text-[#fdb438]" />
                                    <span>360°</span>
                                </button>

                                <button
                                    onClick={() => navigate(`/time-portal/${CU_CHI_LOCATION_ID}`)}
                                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <MaterialIcon name="compare" className="text-sm text-[#388cf1]" />
                                    <span>Time Portal</span>
                                </button>

                                <button
                                    onClick={() => navigate(buildChatPath())}
                                    className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#fe951c]/20 to-[#fdb438]/20 border border-[#fe951c]/40 hover:border-[#fe951c] text-xs font-bold text-[#fdb438] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <MaterialIcon name="forum" className="text-sm" />
                                    <span>Hỏi AI</span>
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

            </main>
        </AppLayout>
    )
}