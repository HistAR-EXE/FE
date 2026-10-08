// src/pages/ArtifactDetailPage.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
// Import dữ liệu từ trang ArtifactsPage
import { MOCK_ARTIFACTS, CATEGORY_MAP } from './ArtifactsPage'

// Component Trình xem 3D (Đã tinh chỉnh cho trang chi tiết rộng rãi)
function Fullscreen3DViewer({ sketchfabId, title }: { sketchfabId: string; title: string }) {
    const [isLoading, setIsLoading] = useState(true)
    const embedUrl = `https://sketchfab.com/models/${sketchfabId}/embed?autostart=1&preload=1&transparent=1&ui_theme=light&ui_watermark=0&ui_infos=0&ui_inspector=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_animations=0`

    return (
        <div className="relative w-full h-full bg-blue-50/30 overflow-hidden flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(253,201,8,0.1)_0%,transparent_70%)] pointer-events-none z-10" />

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                    <MaterialIcon name="3d_rotation" className="text-6xl text-[#0275FB] animate-spin mb-6 drop-shadow-md" />
                    <span className="text-xs font-black text-[#0275FB] uppercase tracking-[0.4em] animate-pulse">
                        Đang đồng bộ không gian 3D...
                    </span>
                </div>
            )}

            {/* THỦ THUẬT CẮT (CROP) LOGO SKETCHFAB BẰNG CSS:
                - Đẩy iframe lên trên 60px (-top-[60px]) để giấu thanh tiêu đề/logo Di sản VN ở mép trên.
                - Đẩy iframe xuống dưới 60px (-bottom-[60px]) để giấu dải công cụ HD, VR, Fullscreen ở mép dưới.
                - Tăng chiều cao lên tương ứng (h-[calc(100%+120px)]) để lấp đầy khoảng trống.
            */}
            <iframe
                title={title}
                src={embedUrl}
                onLoad={() => setIsLoading(false)}
                className="absolute -top-[60px] -bottom-[60px] left-0 w-full h-[calc(100%+120px)] z-0 border-none mix-blend-multiply"
                allowFullScreen
                allow="autoplay; fullscreen; xr-spatial-tracking"
            />

            {/* BẢNG HƯỚNG DẪN TƯƠNG TÁC ĐA ĐIỂM (CÂN ĐỐI & CHUẨN MÀU THƯƠNG HIỆU) */}
            {/* ĐÃ FIX: Dùng w-max và max-w-[95vw] để khung tự động giãn theo chữ, kết hợp thanh cuộn ngang ẩn trên mobile */}
            <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl px-5 py-3 md:px-8 md:py-4 rounded-full border border-[#0275FB]/20 pointer-events-none z-30 flex items-center gap-5 md:gap-8 shadow-[0_20px_50px_rgba(2,117,251,0.15)] w-max max-w-[95vw] overflow-x-auto custom-scrollbar animate-[fadeInUp_0.8s_ease-out]">

                {/* Hành động 1: XOAY */}
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    {/* Icon nền vàng nhạt (#FFF2C3), viền vàng (#FDC908), icon xanh (#0275FB) */}
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#FFF2C3] flex items-center justify-center shrink-0 shadow-inner border border-[#FDC908]/50">
                        <MaterialIcon name="360" className="text-[#0275FB] text-[20px] md:text-[22px]" />
                    </div>
                    <div className="flex flex-col">
                        {/* ĐÃ FIX: Thêm whitespace-nowrap để chữ KHÔNG BAO GIỜ bị rớt dòng */}
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mb-1.5 whitespace-nowrap">Chuột trái / Vuốt</span>
                        <span className="text-[11px] md:text-xs text-[#0275FB] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap">Xoay mô hình</span>
                    </div>
                </div>

                {/* Đường chia cách (Divider) */}
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-[#0275FB]/20 to-transparent shrink-0"></div>

                {/* Hành động 2: THU PHÓNG (ZOOM) */}
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    {/* Icon nền xanh nhạt, viền xanh, icon xanh */}
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#0275FB]/10 flex items-center justify-center shrink-0 shadow-inner border border-[#0275FB]/20">
                        <MaterialIcon name="zoom_in" className="text-[#0275FB] text-[20px] md:text-[22px]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mb-1.5 whitespace-nowrap">Cuộn / Chụm ngón</span>
                        <span className="text-[11px] md:text-xs text-slate-700 font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap">Thu Phóng</span>
                    </div>
                </div>

                <div className="hidden md:block w-px h-10 bg-gradient-to-b from-transparent via-[#0275FB]/20 to-transparent shrink-0"></div>

                {/* Hành động 3: DI CHUYỂN (PAN) */}
                {/* Ẩn bớt text di chuyển trên màn hình điện thoại dọc để tránh bị tràn quá dài */}
                <div className="hidden md:flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#0275FB]/10 flex items-center justify-center shrink-0 shadow-inner border border-[#0275FB]/20">
                        <MaterialIcon name="pan_tool" className="text-[#0275FB] text-[20px] md:text-[22px]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mb-1.5 whitespace-nowrap">Chuột phải / 2 Ngón</span>
                        <span className="text-[11px] md:text-xs text-slate-700 font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap">Di chuyển</span>
                    </div>
                </div>

            </div>
        </div>
    )
}

export function ArtifactDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    // Tìm hiện vật dựa trên ID trên thanh URL
    const artifact = MOCK_ARTIFACTS.find(a => a.id === id)

    // Hiển thị Lỗi 404 nếu người dùng gõ bậy ID
    if (!artifact) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
                <MaterialIcon name="search_off" className="text-8xl text-slate-300 mb-6" />
                <h1 className="text-4xl font-black text-slate-800 mb-4">KHÔNG TÌM THẤY</h1>
                <p className="text-slate-500 mb-8">Hồ sơ hiện vật bạn tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.</p>
                <button onClick={() => navigate('/artifacts')} className="px-8 py-4 bg-[#0275FB] text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform">
                    QUAY LẠI KHO LƯU TRỮ
                </button>
            </div>
        )
    }

    const catInfo = CATEGORY_MAP[artifact.category]

    return (
        <div className="min-h-screen bg-white w-full flex flex-col lg:flex-row font-sans selection:bg-[#FDC908] selection:text-[#0275FB]">

            {/* NÚT BACK DÀNH CHO CẢ MOBILE & DESKTOP (NỔI TRÊN CÙNG) */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-6 left-6 z-50 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-[0_5px_20px_rgba(0,0,0,0.15)] border border-slate-200 flex items-center justify-center text-slate-700 hover:text-[#0275FB] hover:scale-110 transition-all cursor-pointer group"
            >
                <MaterialIcon name="arrow_back" className="text-2xl group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* BÊN TRÁI: KHU VỰC 3D (Cố định trên Desktop, chiếm 60%) */}
            <div className="w-full lg:w-[60%] h-[50vh] lg:h-screen relative lg:fixed lg:top-0 lg:left-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 shrink-0">
                <Fullscreen3DViewer sketchfabId={artifact.sketchfabId} title={artifact.name} />
            </div>

            {/* BÊN PHẢI: KHU VỰC NỘI DUNG (Cuộn tự do, chiếm 40%) */}
            {/* ĐÃ FIX: Áp dụng nền xanh nhạt (#f4f8ff) thay vì trắng toát */}
            <div className="w-full lg:w-[40%] lg:ml-[60%] min-h-screen relative overflow-hidden bg-[#f4f8ff]">

                {/* --- HIỆU ỨNG AMBIENT NỀN THƯƠNG HIỆU --- */}
                {/* Dải gradient mờ lót nền: Xanh dương nhạt -> Trắng -> Vàng nhạt */}
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,117,251,0.03)_0%,rgba(255,255,255,0.8)_50%,rgba(253,201,8,0.05)_100%)] z-0" />

                {/* 3 Quả cầu ánh sáng (Orbs) phát sáng ở các góc */}
                <div className="absolute top-[-5%] right-[-10%] w-[400px] h-[400px] bg-[#0275FB]/10 rounded-full blur-[100px] pointer-events-none z-0" />
                <div className="absolute top-[40%] left-[-15%] w-[350px] h-[350px] bg-[#FDC908]/15 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="absolute bottom-[-5%] right-[10%] w-[300px] h-[300px] bg-[#0275FB]/10 rounded-full blur-[100px] pointer-events-none z-0" />

                {/* Dải gradient trang trí nét đứt mép trên cùng */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0275FB] via-[#FDC908] to-[#0275FB] z-20" />
                {/* -------------------------------------- */}

                {/* Khu vực nội dung chính nằm đè lên hiệu ứng nền (z-10) */}
                <div className="relative z-10 p-8 lg:p-12 xl:p-14">

                    {/* Header Bài viết */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm bg-white border-white/50 ${catInfo.color}`}>
                                <MaterialIcon name={catInfo.icon} className="text-[14px]" />
                                {catInfo.label}
                            </span>
                        </div>
                        {/* Xử lý Tiêu đề: Tự động ngắt dòng thông minh khi có dấu ngoặc đơn */}
                        <h1 className="text-4xl md:text-5xl font-black leading-[1.15] tracking-tighter text-slate-800 drop-shadow-sm">
                            {artifact.name.includes(' (') ? (
                                <>
                                    {/* Phần tên chính (Ví dụ: Tiêm kích MiG-17) */}
                                    {artifact.name.split(' (')[0]}

                                    {/* Phần trong ngoặc (Ép xuống dòng bằng 'block', tô màu Xanh, thu nhỏ size một chút cho tinh tế) */}
                                    <span className="block mt-2 text-3xl md:text-4xl text-[#0275FB]">
                                        ({artifact.name.split(' (')[1]}
                                    </span>
                                </>
                            ) : (
                                // Nếu tên không có dấu ngoặc thì hiển thị bình thường
                                artifact.name
                            )}
                        </h1>
                    </div>

                    {/* Đường phân cách */}
                    <hr className="border-[#0275FB]/10 mb-10" />

                    {/* Danh sách các khối Thông tin */}
                    <div className="space-y-10">

                        {/* 1. MỤC MỚI: BẠN CÓ BIẾT (FUN FACTS) */}
                        {artifact.funFact && (
                            <div className="flex gap-4 md:gap-5 p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-[#0275FB] to-[#015cc8] text-white shadow-[0_15px_30px_rgba(2,117,251,0.25)] transform -rotate-1 hover:rotate-0 transition-all duration-300 cursor-default border border-[#0275FB]/50 relative overflow-hidden group">
                                {/* Vầng sáng vàng lót bên dưới Icon */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FDC908]/20 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/3 group-hover:scale-150 transition-transform duration-700"></div>

                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#FDC908] flex items-center justify-center shrink-0 shadow-[0_5px_15px_rgba(0,0,0,0.2)] border-2 border-[#FFF2C3]/50 z-10">
                                    <MaterialIcon name="lightbulb" className="text-2xl md:text-3xl text-[#0275FB] animate-pulse" />
                                </div>
                                <div className="z-10 flex-1">
                                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#FFF2C3] mb-2 drop-shadow-md">Kiến thức thú vị</h4>
                                    <p className="text-[14px] md:text-[15px] font-medium leading-relaxed text-blue-50 drop-shadow-sm">{artifact.funFact}</p>
                                </div>
                            </div>
                        )}

                        {/* 2. BẢNG THÔNG SỐ KỸ THUẬT */}
                        {artifact.specs && artifact.specs.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-black text-[#0275FB] uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                    <MaterialIcon name="tune" className="text-xl text-[#FDC908]" /> THÔNG SỐ KỸ THUẬT
                                </h4>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    {artifact.specs.map((spec, idx) => (
                                        // Các Card được bo tròn mạnh, nền trắng kính mờ, viền xanh nhạt
                                        <div key={idx} className="bg-white/80 backdrop-blur-md border border-[#0275FB]/15 p-5 md:p-6 rounded-[1.5rem] flex flex-col justify-center hover:border-[#0275FB]/40 hover:bg-white hover:shadow-[0_10px_25px_rgba(2,117,251,0.1)] transition-all">
                                            <span className="text-[9px] text-[#0275FB] font-black uppercase tracking-widest mb-1.5">{spec.label}</span>
                                            <span className="text-[14px] md:text-[15px] font-bold text-slate-700">{spec.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. THÔNG TIN TỔNG QUAN */}
                        <div>
                            <h4 className="text-[11px] font-black text-[#0275FB] uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                <MaterialIcon name="info" className="text-xl text-[#FDC908]" /> THÔNG TIN TỔNG QUAN
                            </h4>
                            <div className="text-[15px] text-slate-700 leading-[1.8] font-medium bg-white/80 backdrop-blur-md p-8 rounded-[2rem] border border-[#0275FB]/15 shadow-sm hover:shadow-[0_10px_30px_rgba(2,117,251,0.08)] transition-shadow">
                                {artifact.description}
                            </div>
                        </div>

                        {/* 4. HỒ SƠ LỊCH SỬ CHUYÊN SÂU */}
                        <div className="p-8 md:p-10 rounded-[2rem] bg-gradient-to-br from-white to-[#FFF2C3]/60 border border-[#FDC908]/40 relative overflow-hidden shadow-sm hover:shadow-[0_15px_30px_rgba(253,201,8,0.15)] transition-shadow">
                            {/* Dải line trang trí dọc theo mép trái (Chuyển sắc Vàng -> Xanh) */}
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FDC908] to-[#0275FB]" />

                            <h4 className="text-[11px] font-black text-[#0275FB] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                                <MaterialIcon name="history_edu" className="text-2xl text-[#0275FB]" /> HỒ SƠ LỊCH SỬ
                            </h4>
                            <div className="font-sans text-[15px] text-slate-700 leading-[1.9] font-medium relative z-10 whitespace-pre-line text-justify">
                                {artifact.story}
                            </div>
                        </div>

                    </div>

                    {/* Footer trang chi tiết */}
                    <div className="mt-16 pt-8 border-t border-[#0275FB]/10 flex flex-col items-center justify-center opacity-80">
                        <div className="flex gap-1.5 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0275FB]"></span>
                            <span className="w-2 h-2 rounded-full bg-[#FDC908]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0275FB]"></span>
                        </div>
                        <p className="text-[10px] text-[#0275FB] font-black tracking-widest uppercase">
                            Khám phá Di sản cùng Đội Trình sát TimeLens
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}