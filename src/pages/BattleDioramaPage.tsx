// src/pages/BattleDioramaPage.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useAuth } from '../shared/auth/useAuth'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { exploreApi } from '../features/explore/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import mascotImg from '../assets/mascot.png'
import { HeritageRolePicker } from '../features/heritage-studio/HeritageRolePicker'
import type { HeritageRoleTemplate } from '../features/heritage-studio/types'
import { appendHeritageEntrySource, buildStationHeritagePath } from '../features/stations/stationRoutes'

const BattleDioramaViewer = lazy(() =>
    import('../features/diorama/BattleDioramaViewer').then((module) => ({
        default: module.BattleDioramaViewer,
    })),
)
const HistoryFilm = lazy(() => import('../features/history/HistoryFilm'))

export function BattleDioramaPage() {
    const navigate = useNavigate()
    const [experience, setExperience] = useState<'diorama' | 'film' | null>(null)
    const [dioramaComplete, setDioramaComplete] = useState(false)
    const { locationId } = useParams<{ locationId?: string }>()
    const activeLocationId = locationId ?? CU_CHI_LOCATION_ID

    // Vẫn giữ lại tracking session người dùng truy cập địa điểm
    const { isAuthenticated } = useAuth()
    useVisitSessionForLocation(activeLocationId, isAuthenticated)
    const [saveFailed, setSaveFailed] = useState(false)
    const saving = useRef(false)

    const recordExperience = useCallback(async () => {
        try {
            localStorage.setItem('timelens_exp_diorama', '1')
        } catch {
            /* Optional local progress. */
        }
        if (!isAuthenticated || activeLocationId !== CU_CHI_LOCATION_ID || saving.current) return
        saving.current = true
        try {
            await exploreApi.recordDiorama(activeLocationId)
            setSaveFailed(false)
            window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT))
        } catch {
            setSaveFailed(true)
        } finally {
            saving.current = false
        }
    }, [activeLocationId, isAuthenticated])

    const openHeritageRole = useCallback((role: HeritageRoleTemplate) => {
        if (!role.published) return
        const base = buildStationHeritagePath({
            siteCode: role.siteCode,
            stationCode: role.stationCode,
            locationId: activeLocationId,
        })
        navigate(`${appendHeritageEntrySource(base, 'battle-diorama')}&role=${encodeURIComponent(role.id)}`)
    }, [activeLocationId, navigate])

    return (
        <AppLayout
            activeBorder="left"
            mobileBackTo={'/explore'}
            mobileTitle="Tái hiện lịch sử"
            showCta={false}
        >
            <main className="flex-1 flex flex-col relative mt-14 md:mt-0 h-[calc(100dvh-3.5rem)] md:h-screen pb-16 md:pb-0 bg-[#f2f7ff] text-[#0F1B33] font-sans selection:bg-[#FDC908] selection:text-[#0F1B33]">
                <style>
                    {`
                    @keyframes tlDioramaFloat {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        25% { transform: translateY(-8px) rotate(-1.5deg); }
                        50% { transform: translateY(2px) rotate(0deg); }
                        75% { transform: translateY(-5px) rotate(1.5deg); }
                    }
                    .tl-diorama-mascot-float {
                        animation: tlDioramaFloat 6s ease-in-out infinite;
                    }
                    `}
                </style>

                <section className="relative flex-1 min-h-0 bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 overflow-auto flex flex-col">
                    {/* ========================================================= */}
                    {/* THANH ĐIỀU HƯỚNG KHI ĐANG MỞ SA BÀN HOẶC PHIM 3D           */}
                    {/* ========================================================= */}
                    {experience && (
                        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#FDC908] bg-gradient-to-r from-[#042A6B] via-[#0275FB] to-[#014296] px-4 sm:px-6 py-3 text-white shadow-[0_10px_25px_rgba(2,117,251,0.22)]">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setExperience(null)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 px-3.5 py-2 text-xs sm:text-sm font-black text-white transition-all cursor-pointer backdrop-blur-md"
                                >
                                    ← Chọn trải nghiệm
                                </button>
                                <div className="h-5 w-[1px] bg-white/25 hidden sm:block" />
                                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDC908] text-xs sm:text-sm font-black text-[#0F1B33] shadow-xs">
                                    <MaterialIcon
                                        name={experience === 'film' ? 'movie' : 'map'}
                                        className="text-base text-[#0275FB]"
                                    />
                                    <span>
                                        {experience === 'film' ? 'Phim 3D Củ Chi' : 'Sa bàn tương tác'}
                                    </span>
                                </span>
                            </div>

                            <div className="hidden sm:flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#FFF2C3]">
                                <span className="w-2 h-2 rounded-full bg-[#FDC908] animate-ping" />
                                <span>Không gian tái hiện lịch sử TimeLens</span>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* MÀN HÌNH CHỌN PHƯƠNG THỨC TÁI HIỆN LỊCH SỬ                 */}
                    {/* ========================================================= */}
                    {!experience && (
                        <div className="pb-20">
                            {/* HERO BANNER ĐỒNG BỘ THƯƠNG HIỆU TIMELENS */}
                            <header className="relative overflow-hidden bg-gradient-to-br from-[#0353B8] via-[#0275FB] to-[#014296] border-b-4 border-[#FDC908] shadow-[0_18px_45px_rgba(2,117,251,0.26)] pt-6 pb-12 lg:py-12 text-white">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] pointer-events-none" />
                                <div className="absolute -top-24 right-[12%] w-[460px] h-[460px] bg-[#FDC908]/25 rounded-full blur-[120px] pointer-events-none" />
                                <div className="absolute -bottom-24 left-[5%] w-[340px] h-[340px] bg-sky-300/20 rounded-full blur-[100px] pointer-events-none" />

                                <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 z-10">
                                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-center">
                                        {/* Cột trái: Tiêu đề & 3 ấn chỉ */}
                                        <div className="xl:col-span-7 space-y-5 text-center xl:text-left">
                                            <div className="inline-flex flex-wrap items-center justify-center xl:justify-start gap-3">
                                                <span className="px-3.5 py-1.5 rounded-full bg-[#FDC908] text-[#0F1B33] font-black text-[11px] uppercase tracking-wider shadow-[0_0_20px_rgba(253,201,8,0.55)] inline-flex items-center gap-1.5">
                                                    <MaterialIcon
                                                        name="history_edu"
                                                        className="text-sm text-[#0275FB]"
                                                    />
                                                    <span>Không gian ký ức 3D</span>
                                                </span>
                                                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FFF2C3]">
                                                    Củ Chi · Ký ức đất thép
                                                </p>
                                            </div>

                                            <h1 className="text-3xl sm:text-5xl 2xl:text-[3.25rem] font-black text-white tracking-tight leading-[1.12] drop-shadow-md">
                                                Tái hiện lịch sử
                                            </h1>

                                            <p className="text-sm sm:text-base text-blue-50/95 font-medium leading-relaxed max-w-2xl mx-auto xl:mx-0">
                                                Chạm vào những lớp ký ức. Khám phá chiến dịch trên sa bàn hoặc theo dõi câu chuyện địa đạo qua thước phim 3D.
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                                                <div className="bg-white/12 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-left">
                                                    <div className="flex items-center justify-between text-[#FFF2C3] text-[10px] font-black uppercase tracking-wider">
                                                        <span>Chiến dịch 1967</span>
                                                        <MaterialIcon
                                                            name="map"
                                                            className="text-base text-[#FDC908]"
                                                        />
                                                    </div>
                                                    <strong className="block text-lg font-black text-white mt-1">
                                                        Sa bàn Cedar Falls
                                                    </strong>
                                                    <small className="text-[11px] text-blue-100/90 font-semibold block mt-0.5">
                                                        Diễn biến theo dòng thời gian
                                                    </small>
                                                </div>

                                                <div className="bg-white/12 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-left">
                                                    <div className="flex items-center justify-between text-[#FFF2C3] text-[10px] font-black uppercase tracking-wider">
                                                        <span>Điện ảnh tư liệu</span>
                                                        <MaterialIcon
                                                            name="movie"
                                                            className="text-base text-[#FDC908]"
                                                        />
                                                    </div>
                                                    <strong className="block text-lg font-black text-white mt-1">
                                                        Phim 3D 1080p
                                                    </strong>
                                                    <small className="text-[11px] text-blue-100/90 font-semibold block mt-0.5">
                                                        Thời lượng 11 phút 03 giây
                                                    </small>
                                                </div>

                                                <div className="bg-white/12 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-left">
                                                    <div className="flex items-center justify-between text-[#FFF2C3] text-[10px] font-black uppercase tracking-wider">
                                                        <span>Lưu dấu tự động</span>
                                                        <MaterialIcon
                                                            name="bookmark_added"
                                                            className="text-base text-[#FDC908]"
                                                        />
                                                    </div>
                                                    <strong className="block text-lg font-black text-white mt-1">
                                                        Tiếp nối linh hoạt
                                                    </strong>
                                                    <small className="text-[11px] text-blue-100/90 font-semibold block mt-0.5">
                                                        Ghi nhớ vị trí đang xem
                                                    </small>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cột phải: Linh vật Chrono & La bàn ký ức */}
                                        <div
                                            className="xl:col-span-5 relative hidden md:flex items-center justify-center py-2"
                                            aria-hidden="true"
                                        >
                                            <div className="relative w-64 h-64 sm:w-76 sm:h-76 flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FDC908]/40 via-amber-200/20 to-transparent blur-2xl animate-pulse pointer-events-none" />
                                                <div className="absolute w-full h-full rounded-full border-2 border-dashed border-[#FDC908]/60 animate-[spin_26s_linear_infinite] pointer-events-none" />
                                                <div className="absolute w-4/5 h-4/5 rounded-full border-2 border-dotted border-white/40 animate-[spin_18s_linear_infinite_reverse] pointer-events-none" />
                                                <div className="absolute w-3/5 h-3/5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 pointer-events-none" />

                                                <img
                                                    src={mascotImg}
                                                    alt=""
                                                    className="tl-diorama-mascot-float relative z-10 w-44 h-44 sm:w-56 sm:h-56 object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.45)] select-none"
                                                />

                                                <span className="absolute -top-2 right-0 z-20 bg-white text-[#0F1B33] border-2 border-[#FDC908] px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                    TAM GIÁC SẮT · CỦ CHI
                                                </span>

                                                <span className="absolute -bottom-3 left-2 z-20 bg-[#0F1B33]/90 backdrop-blur-md text-[#FFF2C3] border border-[#FDC908]/60 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                                    <MaterialIcon
                                                        name="auto_awesome"
                                                        className="text-sm text-[#FDC908]"
                                                    />
                                                    <span>SỐNG LẠI TỪNG KHOẢNH KHẮC</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            {/* 2 THẺ CHỌN TRẢI NGHIỆM CHÍNH */}
                            <div className="max-w-[1440px] mx-auto px-5 sm:px-8 -mt-6 relative z-20 space-y-8">
                                <div className="grid gap-6 lg:gap-8 md:grid-cols-2 items-stretch">
                                    {/* THẺ 01: SA BÀN TƯƠNG TÁC */}
                                    <button
                                        type="button"
                                        onClick={() => setExperience('diorama')}
                                        className="group rounded-[2.2rem] border-2 border-[#0275FB]/18 hover:border-[#FDC908] bg-white p-4 sm:p-5 text-left transition-all duration-300 shadow-[0_18px_45px_rgba(2,117,251,0.08)] hover:shadow-[0_22px_55px_rgba(2,117,251,0.16)] hover:-translate-y-1 flex flex-col justify-between cursor-pointer focus-visible:outline-4 focus-visible:outline-[#0275FB]"
                                    >
                                        <div>
                                            {/* Khung đồ họa mô phỏng Sa bàn Chiến thuật */}
                                            <div className="relative h-48 sm:h-56 w-full rounded-[1.6rem] overflow-hidden bg-gradient-to-br from-[#07132C] via-[#0E224D] to-[#033980] border-2 border-[#FDC908]/80 p-5 flex flex-col justify-between">
                                                <img src="/huy/nen-sa-ban.png" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#07132C]/90 to-[#07132C]/55 pointer-events-none" />
                                                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px] opacity-15 pointer-events-none" />
                                                <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full border-2 border-dashed border-[#FDC908]/40 pointer-events-none" />

                                                <div className="relative z-10 flex items-center justify-between gap-2">
                                                    <span className="px-3.5 py-1 rounded-full bg-[#FDC908] text-[#0F1B33] text-[11px] font-black uppercase tracking-wider shadow-xs">
                                                        01 / Chủ động khám phá
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[10px] font-black uppercase tracking-wider text-[#FFF2C3]">
                                                        Interactive Map
                                                    </span>
                                                </div>

                                                <div className="relative z-10 flex items-center gap-4 my-auto">
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0275FB] to-[#042A6B] border-2 border-[#FDC908] text-[#FDC908] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                                                        <MaterialIcon name="map" className="text-3xl" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-black uppercase tracking-widest text-[#FFF2C3]">
                                                            Chiến dịch Cedar Falls (1967)
                                                        </p>
                                                        <p className="text-xs sm:text-sm font-bold text-blue-100 leading-snug">
                                                            Mô phỏng 3 tầng địa đạo, các mũi tiến công và thế trận lòng dân.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="relative z-10 flex items-center gap-2 text-[11px] font-bold text-[#FFF2C3]">
                                                    <MaterialIcon
                                                        name="volume_up"
                                                        className="text-sm text-[#FDC908]"
                                                    />
                                                    <span>Tích hợp thuyết minh âm thanh & mốc thời gian</span>
                                                </div>
                                            </div>

                                            <div className="px-3 pt-6 pb-2">
                                                <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] group-hover:text-[#0275FB] transition-colors tracking-tight">
                                                    Sa bàn tương tác
                                                </h2>
                                                <p className="mt-2.5 text-sm sm:text-[15px] font-medium leading-relaxed text-slate-600">
                                                    Theo dõi diễn biến chiến dịch Cedar Falls qua các mốc thời gian và thuyết minh.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="px-3 pt-5 pb-2 mt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#0275FB] to-[#015CC8] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md group-hover:brightness-110 transition-all">
                                                <span>Khám phá sa bàn →</span>
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">
                                                Tương tác trực tiếp
                                            </span>
                                        </div>
                                    </button>

                                    {/* THẺ 02: PHIM 3D CỦ CHI */}
                                    <button
                                        type="button"
                                        onClick={() => setExperience('film')}
                                        className="group rounded-[2.2rem] border-2 border-[#0275FB]/18 hover:border-[#FDC908] bg-white p-4 sm:p-5 text-left transition-all duration-300 shadow-[0_18px_45px_rgba(2,117,251,0.08)] hover:shadow-[0_22px_55px_rgba(2,117,251,0.16)] hover:-translate-y-1 flex flex-col justify-between cursor-pointer focus-visible:outline-4 focus-visible:outline-[#0275FB]"
                                    >
                                        <div>
                                            {/* Khung ảnh Poster Phim 3D */}
                                            <div className="relative h-48 sm:h-56 w-full rounded-[1.6rem] overflow-hidden border-2 border-[#FDC908] bg-[#07132C]">
                                                <img
                                                    src="/films/cu-chi-film-poster-v1.png"
                                                    alt=""
                                                    className="h-full w-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#07132C] via-[#07132C]/35 to-transparent" />

                                                <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                                                    <span className="px-3.5 py-1 rounded-full bg-[#FDC908] text-[#0F1B33] text-[11px] font-black uppercase tracking-wider shadow-xs">
                                                        02 / 11:03 · Full HD 1080p
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-[#0F1B33]/80 backdrop-blur-md border border-white/25 text-[10px] font-black uppercase tracking-wider text-[#FFF2C3]">
                                                        3D Cinema
                                                    </span>
                                                </div>

                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <span className="w-16 h-16 rounded-full bg-[#FDC908]/95 text-[#0F1B33] border-2 border-white flex items-center justify-center shadow-[0_10px_28px_rgba(0,0,0,0.45)] group-hover:scale-110 transition-transform">
                                                        <MaterialIcon
                                                            name="play_arrow"
                                                            className="text-4xl text-[#0275FB]"
                                                        />
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="px-3 pt-6 pb-2">
                                                <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] group-hover:text-[#0275FB] transition-colors tracking-tight">
                                                    Phim 3D Củ Chi
                                                </h2>
                                                <p className="mt-2.5 text-sm sm:text-[15px] font-medium leading-relaxed text-slate-600">
                                                    Phim 1080p được nâng cấp từ nguồn 720p. Xem theo nhịp của bạn, tiếp tục bất cứ lúc nào.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="px-3 pt-5 pb-2 mt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] text-[#0F1B33] font-black text-xs sm:text-sm uppercase tracking-wider shadow-md group-hover:brightness-105 transition-all">
                                                <span>Xem phim →</span>
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">
                                                Tự động lưu tiến độ
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* THÔNG BÁO LỖI LƯU TRẢI NGHIỆM (NẾU CÓ)                    */}
                    {/* ========================================================= */}
                    {saveFailed && (
                        <div
                            role="status"
                            className="mx-4 mt-3 z-50 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDC908] px-4 py-3 text-xs sm:text-sm font-bold text-[#0F1B33] shadow-md flex items-center justify-between gap-3"
                        >
                            <span>Chưa lưu được trải nghiệm sa bàn.</span>
                            <button
                                type="button"
                                onClick={() => void recordExperience()}
                                className="px-3.5 py-1.5 rounded-xl bg-[#0275FB] text-white text-xs font-black underline cursor-pointer"
                            >
                                Thử lưu lại
                            </button>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* KHÔNG GIAN HIỂN THỊ COMPONENT CON (SA BÀN / PHIM 3D)       */}
                    {/* ========================================================= */}
                    <Suspense
                        fallback={
                            <div
                                role="status"
                                className="p-10 text-center text-sm font-black text-[#0275FB] animate-pulse"
                            >
                                Đang mở trải nghiệm…
                            </div>
                        }
                    >
                        {experience === 'diorama' && (
                            <div className="relative flex-1 h-[calc(100dvh-8.5rem)] min-h-[480px] bg-[#07132C]">
                                <BattleDioramaViewer onStart={() => void recordExperience()} onComplete={() => setDioramaComplete(true)} />
                                {dioramaComplete && (
                                    <aside className="absolute inset-x-3 bottom-3 top-3 z-[220] mx-auto flex max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-[#e5bd62]/70 bg-[#07111f]/97 text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-md" data-testid="cedar-falls-heritage-entry">
                                        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-[linear-gradient(110deg,rgba(228,183,86,0.14),transparent_55%)] p-4 sm:p-5">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#efc96e]">Bộ sưu tập hóa thân · 1968</p>
                                                <h2 className="mt-1 max-w-3xl text-lg font-black sm:text-xl">Chọn một vai diễn trong đời sống địa đạo</h2>
                                                <p className="mt-1 text-xs font-semibold text-[#efd58f]">Từ chiến dịch Cedar Falls 1967, tiếp tục khám phá đời sống dưới địa đạo năm 1968.</p>
                                                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-blue-100/80 sm:text-sm">12 vai nam/nữ được dựng từ 24 lớp ảnh đã duyệt. Chọn vai để mở studio. Việc mở studio không tạo check-in hoặc cộng điểm.</p>
                                            </div>
                                            <button type="button" onClick={() => setDioramaComplete(false)} aria-label="Đóng chọn vai" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-xl transition hover:border-[#efc96e] hover:text-[#efc96e]">×</button>
                                        </div>
                                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                                            <HeritageRolePicker siteCode="cu-chi" variant="gallery" onSelect={openHeritageRole} />
                                        </div>
                                    </aside>
                                )}
                            </div>
                        )}
                        {experience === 'film' && <HistoryFilm />}
                    </Suspense>
                </section>
            </main>
        </AppLayout>
    )
}
