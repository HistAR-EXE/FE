// src/pages/LeaderboardPage.tsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { viralApi, type LeaderboardResponse } from '../features/viral/api'
import { ApiError } from '../shared/api/contracts'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useAppMode } from '../shared/context/useAppMode'
import { useAuth } from '../shared/auth/useAuth'
import { hasFullGamificationAccess } from '../shared/access/contentAccess'
import { UpgradePrompt } from '../components/monetization/UpgradePrompt'

export function LeaderboardPage() {
    const { mode: appMode } = useAppMode()
    const { user } = useAuth()

    // Logic của Backend: Kiểm tra quyền truy cập Gamification
    const gamificationUnlocked = hasFullGamificationAccess(user)
    const [searchParams] = useSearchParams()
    const groupId = searchParams.get('groupId')

    const [scope, setScope] = useState<'all' | 'city' | 'week'>('all')
    const [city, setCity] = useState('TP.HCM')
    const [data, setData] = useState<LeaderboardResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [archivedMessage, setArchivedMessage] = useState<string | null>(null)
    const { showToast } = useToast()

    const podium = data?.entries.slice(0, 3) ?? []
    const others = data?.entries.slice(3) ?? []
    const currentUserEntry = data?.entries.find((entry) => entry.currentUser) ?? null

    useEffect(() => {
        setLoading(true)

        // Cập nhật Logic Xử lý lỗi (Hết hạn gói / Không có quyền)
        const handleLeaderboardError = (error: unknown) => {
            if (error instanceof ApiError && (error.code === 'TRIAL_EXPIRED' || error.status === 403)) {
                setArchivedMessage(error.message || 'Gói của trường đã hết hạn, bảng xếp hạng hiện ở chế độ lưu trữ.')
                setData({ scope: groupId ? 'group' : scope, city: scope === 'city' ? city.trim() || null : null, entries: [] } as any)
            } else {
                setArchivedMessage(null)
                showToast({ message: getFriendlyErrorMessage(error, 'leaderboard'), type: 'error' })
            }
            setLoading(false)
        }

        if (groupId) {
            viralApi
                .leaderboard('all', undefined, groupId)
                .then((res) => {
                    setArchivedMessage(null)
                    setData(res)
                    setLoading(false)
                })
                .catch(handleLeaderboardError)
            return
        }
        if (scope === 'city' && !city.trim()) {
            setLoading(false)
            return
        }
        viralApi
            .leaderboard(scope, scope === 'city' ? city.trim() : undefined)
            .then((res) => {
                setArchivedMessage(null)
                setData(res)
                setLoading(false)
            })
            .catch(handleLeaderboardError)
    }, [scope, city, groupId, showToast])

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'from-[#ffd700] to-[#d4af37] text-black shadow-[0_0_15px_#ffd700]'
        if (rank === 2) return 'from-[#e2e8f0] to-[#94a3b8] text-black shadow-[0_0_15px_#cbd5e1]'
        if (rank === 3) return 'from-[#b45309] to-[#78350f] text-white shadow-[0_0_15px_#b45309]'
        if (rank <= 10) return 'from-purple-500 to-indigo-600 text-white shadow-[0_0_10px_#8b5cf6]'
        return 'from-[#1e293b] to-[#0f1015] text-gray-400 border border-white/10'
    }

    return (
        <AppLayout
            activeBorder="left"
            topNav={<SimpleTopNav showSearch title={groupId ? 'Xếp Hạng Nhóm' : 'Bảng Vinh Danh'} />}
            className="bg-[#0B1120] min-h-screen text-white font-sans selection:bg-[#fe951c] selection:text-black"
        >
            <main className="mt-14 md:mt-16 pb-24">

                {/* BẢNG THÔNG BÁO LƯU TRỮ (NẾU API TRẢ VỀ LỖI EXPIRED) */}
                {archivedMessage && (
                    <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8">
                        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm font-bold text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center gap-3 backdrop-blur-md">
                            <MaterialIcon name="warning" className="text-red-400 text-2xl" />
                            {archivedMessage}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* HERO BANNER - SÂN KHẤU HOLOGRAM ĐẲNG CẤP */}
                {/* ========================================= */}
                <section className="relative overflow-hidden border-b border-[#fe951c]/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-[#0B1120] pt-8 pb-16 md:pt-12 md:pb-24">
                    <div className="absolute inset-0 bg-[url('/media/grid.svg')] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,149,28,0.05)_0%,transparent_70%)]" />

                    <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-[#fe951c]/15 rounded-full blur-[150px] pointer-events-none" />
                    <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-[#388cf1]/10 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 z-10">

                        {/* KHỐI TRÁI: TYPOGRAPHY SANG TRỌNG OMBRE */}
                        <div className="w-full lg:w-[55%] flex flex-col items-center lg:items-start text-center lg:text-left pt-4 lg:pt-0">

                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3.5 py-1.5 rounded-full bg-[#1a79e5]/20 border border-[#388cf1]/50 text-[#388cf1] text-[10px] md:text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(56,140,241,0.3)]">
                                    {groupId ? 'GIẢI ĐẤU NỘI BỘ' : 'MÙA GIẢI TOÀN QUỐC'}
                                </span>
                                <span className="px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-black tracking-tighter leading-tight mb-2 uppercase whitespace-nowrap">
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-md">BẢNG PHONG THẦN</span>
                            </h1>

                            <h1 className="text-[3.5rem] md:text-[5rem] lg:text-[5.5rem] font-black tracking-tighter leading-[1] mb-8 uppercase">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a79e5] via-[#fdb438] to-[#fe951c] drop-shadow-[0_0_30px_rgba(254,149,28,0.4)]">
                                    TIMELENS
                                </span>
                            </h1>

                            <p className="text-sm md:text-base text-gray-300 font-medium leading-relaxed mb-10 max-w-lg">
                                {groupId
                                    ? 'Cạnh tranh trực tiếp với các thành viên trong nhóm. Ai sẽ là Đặc vụ dẫn đầu trong chiến dịch lần này?'
                                    : 'Nơi tôn vinh những Đặc vụ thời gian kiệt xuất nhất. Khám phá di sản, tích lũy XP và ghi danh vào lịch sử.'}
                            </p>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                <button className="px-6 py-3.5 rounded-xl bg-[#161824] hover:bg-[#1a1c29] border border-white/10 text-[11px] font-black text-white uppercase tracking-[0.15em] transition-all flex items-center gap-2.5 cursor-pointer shadow-lg hover:shadow-[0_5px_15px_rgba(253,180,56,0.3)] hover:-translate-y-1 hover:border-[#fdb438]/50 group">
                                    <MaterialIcon name="military_tech" className="text-lg text-[#fdb438] group-hover:scale-110 transition-transform" /> Phần Thưởng
                                </button>
                                <button className="px-6 py-3.5 rounded-xl bg-[#161824] hover:bg-[#1a1c29] border border-white/10 text-[11px] font-black text-white uppercase tracking-[0.15em] transition-all flex items-center gap-2.5 cursor-pointer shadow-lg hover:shadow-[0_5px_15px_rgba(56,140,241,0.3)] hover:-translate-y-1 hover:border-[#388cf1]/50 group">
                                    <MaterialIcon name="gavel" className="text-lg text-[#388cf1] group-hover:scale-110 transition-transform" /> Thể Lệ
                                </button>
                                <button className="px-6 py-3.5 rounded-xl bg-[#161824] hover:bg-[#1a1c29] border border-white/10 text-[11px] font-black text-white uppercase tracking-[0.15em] transition-all flex items-center gap-2.5 cursor-pointer shadow-lg hover:shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:-translate-y-1 hover:border-emerald-500/50 group">
                                    <MaterialIcon name="history" className="text-lg text-emerald-400 group-hover:scale-110 transition-transform" /> Mùa Giải Cũ
                                </button>
                            </div>
                        </div>

                        {/* KHỐI PHẢI: HOLOGRAM SÂN KHẤU CÚP VÀNG */}
                        <div className="w-full lg:w-[45%] relative h-[320px] md:h-[400px] flex items-center justify-center shrink-0 mt-12 lg:mt-0">

                            <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex items-center justify-center transform transition-transform duration-700 hover:scale-105">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#fe951c]/30 to-[#388cf1]/20 rounded-full blur-[80px] animate-pulse" />

                                <div className="absolute w-[90%] h-[90%] rounded-full border border-white/5 border-t-[#388cf1]/80 border-r-[#1a79e5]/40 animate-[spin_15s_linear_infinite]" />
                                <div className="absolute w-[75%] h-[75%] rounded-full border-[2px] border-dashed border-[#fe951c]/40 animate-[spin_25s_linear_infinite_reverse]" />
                                <div className="absolute w-[60%] h-[60%] rounded-full border border-white/5 border-b-[#fdb438]/80 animate-[spin_10s_linear_infinite]" />

                                <div className="absolute bottom-10 md:bottom-16 w-48 h-12 bg-gradient-to-t from-[#fe951c]/40 to-transparent rounded-[100%] blur-[4px] border-b border-[#fe951c]" />

                                <div className="relative z-20 animate-[bounce_4s_ease-in-out_infinite] flex flex-col items-center">
                                    <div className="w-32 h-32 md:w-40 md:h-40 relative flex items-center justify-center">
                                        <div className="absolute inset-4 bg-[#fdb438]/40 rounded-full blur-xl" />
                                        <MaterialIcon name="emoji_events" className="text-[7rem] md:text-[9rem] text-transparent bg-clip-text bg-gradient-to-br from-[#fff2a1] via-[#fdb438] to-[#b45309] drop-shadow-[0_10px_20px_rgba(254,149,28,0.8)] relative z-10" />
                                    </div>
                                    <div className="mt-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#fdb438]/50 text-[10px] font-black tracking-[0.2em] text-[#fdb438] shadow-[0_0_15px_rgba(254,149,28,0.3)]">
                                        MÙA GIẢI: KHỞI NGUYÊN
                                    </div>
                                </div>

                                <div className="absolute top-10 left-10 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] animate-[ping_3s_infinite]" />
                                <div className="absolute bottom-20 right-10 w-2 h-2 bg-[#fe951c] rounded-full shadow-[0_0_10px_#fe951c] animate-[ping_4s_infinite_reverse]" />
                                <div className="absolute top-1/2 right-4 w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_20px_#34d399] animate-[bounce_5s_infinite]" />
                            </div>

                        </div>
                    </div>
                </section>

                {/* KHUNG CẢNH BÁO UPGRADE B2C */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8">
                    {!gamificationUnlocked && (
                        <div className="mb-8">
                            <UpgradePrompt
                                title="BẢNG XẾP HẠNG TOÀN CỘNG ĐỒNG"
                                message="Nâng cấp Premium để mở khóa Rankings Global, so tài Điểm kinh nghiệm (XP) với hàng ngàn người chơi khác và hoàn thiện Digital Passport của riêng bạn."
                            />
                        </div>
                    )}
                </div>

                {/* LỚP PHỦ KÍNH MỜ BẢO VỆ (KHI CHƯA UNLOCK) */}
                <div className={`relative max-w-7xl mx-auto ${!gamificationUnlocked ? 'overflow-hidden rounded-[3rem]' : ''}`}>
                    {!gamificationUnlocked && (
                        <div className="absolute inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl pointer-events-none flex flex-col items-center pt-32" aria-hidden>
                            <div className="w-24 h-24 rounded-full bg-[#1a79e5]/20 border border-[#388cf1]/50 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(56,140,241,0.5)]">
                                <MaterialIcon name="lock" className="text-5xl text-[#388cf1] drop-shadow-md" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-widest drop-shadow-md">KHU VỰC ĐÃ BỊ KHÓA</h3>
                        </div>
                    )}

                    {/* THANH CHỈ SỐ MÙA GIẢI (SEASON STATS) */}
                    {!groupId && (
                        <div className="px-4 md:px-12 -mt-10 mb-12 relative z-20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#161b29]/95 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                                <div className="text-center border-r border-white/10 last:border-0 px-2">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Đặc Vụ Tham Gia</p>
                                    <p className="text-2xl md:text-3xl font-black text-white drop-shadow-md">24,592</p>
                                </div>
                                <div className="text-center border-r border-white/10 md:border-r last:border-0 px-2">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tổng XP Cày Được</p>
                                    <p className="text-2xl md:text-3xl font-black text-[#fdb438] drop-shadow-[0_0_10px_rgba(253,180,56,0.3)]">8.2M</p>
                                </div>
                                <div className="text-center border-r border-white/10 last:border-0 px-2">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Kết Thúc Sau</p>
                                    <p className="text-2xl md:text-3xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(56,140,241,0.3)]">14 Ngày</p>
                                </div>
                                <div className="text-center px-2">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tọa Độ Cạnh Tranh</p>
                                    <p className="text-2xl md:text-3xl font-black text-white truncate">Củ Chi</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="max-w-5xl mx-auto px-4 md:px-8 mt-10">

                        {/* BỘ LỌC PHÂN HẠNG (SCOPE FILTERS) */}
                        {!groupId && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8 mb-16">
                                <div className="flex gap-2 p-1.5 bg-[#161b29] rounded-2xl border border-white/5 shadow-inner w-full md:w-auto overflow-x-auto custom-scrollbar">
                                    {(['all', 'city', 'week'] as const).map((s) => {
                                        const isActive = scope === s;
                                        let label = 'MỌI LÚC';
                                        if(s === 'city') label = 'THÀNH PHỐ';
                                        if(s === 'week') label = 'TUẦN NÀY';

                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setScope(s)}
                                                className={`flex-1 md:flex-none px-6 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.15em] transition-all cursor-pointer whitespace-nowrap ${
                                                    isActive
                                                        ? 'bg-gradient-to-r from-[#1a79e5] to-[#388cf1] text-white shadow-[0_0_20px_rgba(56,140,241,0.5)]'
                                                        : 'text-gray-500 hover:text-gray-300'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>

                                {scope === 'city' && (
                                    <div className="relative w-full md:w-64 animate-[fadeInRight_0.3s_ease-out]">
                                        <MaterialIcon name="location_city" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#388cf1] text-lg" />
                                        <input
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Nhập tên thành phố..."
                                            className="w-full bg-[#161b29] border border-white/15 focus:border-[#388cf1] rounded-2xl pl-12 pr-4 py-3 text-sm text-white font-bold placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#388cf1] transition-all shadow-inner"
                                        />
                                        {!city.trim() && <p className="absolute -bottom-5 left-2 text-[10px] text-red-400 font-bold uppercase">Yêu cầu nhập tên</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {loading && (
                            <div className="flex justify-center items-center py-20">
                                <MaterialIcon name="radar" className="text-5xl text-[#388cf1] animate-spin" />
                            </div>
                        )}

                        {!loading && data && data.entries.length === 0 && (
                            <div className="text-center py-24 border border-dashed border-white/10 rounded-[3rem] bg-[#161824]/40 backdrop-blur-xl shadow-2xl">
                                <div className="w-24 h-24 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                    <MaterialIcon name="emoji_events" className="text-6xl text-gray-600" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Chưa Có Dữ Liệu</h3>
                                <p className="text-sm text-gray-500 font-medium max-w-md mx-auto mb-6">Bảng xếp hạng chưa ghi nhận thành tích nào. Hãy là người đầu tiên ghi danh vào lịch sử!</p>
                                <Link
                                    to={appMode === 'offline' ? '/scan' : '/explore'}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs uppercase tracking-widest shadow-[0_5px_20px_rgba(254,149,28,0.4)] transition-all hover:scale-105"
                                >
                                    <MaterialIcon name="explore" className="text-lg" />
                                    {appMode === 'offline' ? 'MỞ BỘ QUÉT AR NGAY' : 'BẮT ĐẦU KHÁM PHÁ'}
                                </Link>
                            </div>
                        )}

                        {/* BỆ PHÓNG 3D PODIUM (TOP 3) - CẤU TRÚC ĐÃ FIX LỖI ESLINT */}
                        {!loading && podium.length > 0 && (
                            <div className="flex items-end justify-center gap-2 sm:gap-6 mb-16 pt-16 relative">
                                <div className="absolute bottom-0 w-full max-w-2xl h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm" />

                                {[podium[1], podium[0], podium[2]].filter(Boolean).map((entry) => {
                                    const isTop1 = entry.rank === 1;
                                    const isTop2 = entry.rank === 2;

                                    let podiumHeight = 'h-48 sm:h-56';
                                    let themeColor = 'text-[#388cf1]';
                                    let borderColor = 'border-[#388cf1]/50';
                                    let bgGradient = 'from-[#388cf1]/20 to-transparent';
                                    let glow = 'shadow-[0_0_20px_rgba(56,140,241,0.2)]';
                                    let icon = 'military_tech';

                                    if (isTop1) {
                                        podiumHeight = 'h-64 sm:h-72 z-20';
                                        themeColor = 'text-[#fdb438]';
                                        borderColor = 'border-[#fe951c]';
                                        bgGradient = 'from-[#fe951c]/30 via-[#fdb438]/10 to-[#0B1120]';
                                        glow = 'shadow-[0_0_40px_rgba(254,149,28,0.4)]';
                                        icon = 'diamond';
                                    } else if (!isTop2) {
                                        // Rank 3
                                        podiumHeight = 'h-40 sm:h-48';
                                        themeColor = 'text-emerald-400';
                                        borderColor = 'border-emerald-500/50';
                                        bgGradient = 'from-emerald-500/20 to-transparent';
                                        glow = 'shadow-[0_0_20px_rgba(16,185,129,0.2)]';
                                    }

                                    return (
                                        <div
                                            key={entry.userId}
                                            className={`relative w-[30%] max-w-[160px] flex flex-col items-center justify-end rounded-t-[2rem] border-t-2 border-x border-b-0 bg-gradient-to-b px-2 sm:px-4 pb-6 pt-12 text-center transition-all hover:-translate-y-2 ${podiumHeight} ${borderColor} ${bgGradient} ${glow}`}
                                        >
                                            <div className="absolute -top-12 sm:-top-16 flex flex-col items-center">
                                                <div className="relative">
                                                    <div className={`absolute inset-0 rounded-full blur-md opacity-70 ${isTop1 ? 'bg-[#fe951c]' : 'bg-transparent'}`} />
                                                    <img
                                                        src={entry.avatarUrl || (isTop1 ? images.leaderboardRank1 : isTop2 ? images.leaderboardRank2 : images.leaderboardRank3)}
                                                        alt={entry.displayName}
                                                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 relative z-10 ${isTop1 ? 'border-[#fe951c]' : 'border-white/20'}`}
                                                        onError={(e) => { e.currentTarget.src = images.leaderboardRank1 }}
                                                    />
                                                    {isTop1 && (
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 text-[#fdb438] drop-shadow-[0_0_10px_#fe951c] animate-bounce">
                                                            <MaterialIcon name="crown" className="text-4xl" />
                                                        </div>
                                                    )}
                                                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 border-[#0B1120] z-20 shadow-lg ${isTop1 ? 'bg-[#fe951c] text-black' : 'bg-[#161b29] text-white'}`}>
                                                        {entry.rank}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 sm:mt-6 w-full relative z-10">
                                                <h3 className={`font-black text-xs sm:text-sm uppercase tracking-wider truncate mb-1 ${isTop1 ? 'text-white' : 'text-gray-300'}`}>
                                                    {entry.displayName}
                                                </h3>
                                                <p className={`font-black text-sm sm:text-base flex items-center justify-center gap-1 ${themeColor}`}>
                                                    {entry.totalPoints.toLocaleString()} <span className="text-[10px]">XP</span>
                                                </p>
                                            </div>
                                            <MaterialIcon name={icon} className={`absolute bottom-2 text-6xl opacity-10 ${themeColor}`} />
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* BẢNG DANH SÁCH (RANK 4 TRỞ XUỐNG) */}
                        {!loading && others.length > 0 && (
                            <div className="space-y-4">
                                {others.map((entry) => {
                                    const isMe = entry.currentUser;
                                    const rankColorClass = getRankColor(entry.rank);
                                    return (
                                        <div
                                            key={entry.userId}
                                            className={`p-4 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-300 transform hover:scale-[1.01] ${
                                                isMe
                                                    ? 'bg-gradient-to-r from-[#fe951c]/20 to-transparent border border-[#fe951c]/50 shadow-[0_0_20px_rgba(254,149,28,0.2)] scale-[1.02]'
                                                    : 'bg-[#161824] border border-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4 md:gap-6 w-2/3">
                                                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm bg-gradient-to-br ${rankColorClass}`}>
                                                    #{entry.rank}
                                                </div>
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={entry.avatarUrl || images.leaderboardRank3}
                                                        alt={entry.displayName}
                                                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 ${isMe ? 'border-[#fdb438]' : 'border-white/10'}`}
                                                    />
                                                    {isMe && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#388cf1] border-2 border-[#0B1120]" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={`font-black text-sm md:text-base uppercase tracking-wider truncate ${isMe ? 'text-[#fdb438]' : 'text-gray-200'}`}>
                                                        {isMe ? 'BẠN' : entry.displayName}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 truncate">Đặc vụ TimeLens</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-black text-lg md:text-xl flex items-baseline justify-end gap-1 ${isMe ? 'text-white' : 'text-cyan-400'}`}>
                                                    {entry.totalPoints.toLocaleString()} <span className="text-xs text-gray-500 hidden sm:inline">XP</span>
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* HIỂN THỊ CURRENT USER NẾU NẰM NGOÀI TOP HIỂN THỊ */}
                        {!loading && !others.some(o => o.currentUser) && !podium.some(p => p?.currentUser) && currentUserEntry && (
                            <div className="mt-8 p-1 rounded-2xl bg-gradient-to-r from-[#fe951c] to-[#fdb438]">
                                <div className="p-4 md:p-5 rounded-xl bg-[#0B1120] flex items-center justify-between">
                                    <div className="flex items-center gap-4 md:gap-6 w-2/3">
                                        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm bg-gradient-to-br from-[#fe951c] to-[#b45309] text-white shadow-inner">
                                            #{currentUserEntry.rank}
                                        </div>
                                        <div className="relative shrink-0">
                                            <img
                                                src={currentUserEntry.avatarUrl || images.avatarHomeV3}
                                                alt="Bạn"
                                                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-[#fdb438]"
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0B1120]" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-sm md:text-base uppercase tracking-wider text-[#fdb438] truncate">BẠN</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 truncate">Thành tích của tôi</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-lg md:text-xl text-white flex items-baseline justify-end gap-1">
                                            {currentUserEntry.totalPoints.toLocaleString()} <span className="text-xs text-gray-500 hidden sm:inline">XP</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </AppLayout>
    )
}