// src/pages/HomePage.tsx
import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomeTopNav } from '../components/layout/TopNav'
import { demoApi, type Ready } from '../features/demo/api'
import { profileApi, type ProfileMe } from '../features/profile/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { buildChatPath } from '../features/chat/chatRoute'
import { useAppMode } from '../shared/context/useAppMode'
import { MaterialIcon } from '../components/ui/MaterialIcon'

const CU_CHI_HERO = '/media/cu-chi/map/hero.jpg'

const LuxuryCompass3D: React.FC = () => {
    return (
        <div className="relative flex items-center justify-center w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 shrink-0 my-3 lg:my-0 select-none group cursor-pointer">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#fe951c]/35 via-[#fdb438]/25 to-[#1a79e5]/35 blur-3xl animate-pulse" />
            <div className="absolute -left-3 top-5 w-8 h-8 rounded-full bg-gradient-to-br from-white/60 via-white/10 to-transparent border border-white/50 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.6)] animate-bounce duration-1000 z-30" />
            <div className="absolute right-2 -top-2 w-6 h-6 rounded-full bg-gradient-to-br from-white/70 via-white/10 to-transparent border border-white/40 backdrop-blur-md shadow-md z-30" />
            <div className="absolute -right-4 bottom-8 w-9 h-9 rounded-full bg-gradient-to-br from-white/50 via-white/5 to-transparent border border-white/35 backdrop-blur-md shadow-xl z-30" />

            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#64748b] via-[#1e2330] to-[#0f1015] p-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.85),0_0_30px_rgba(253,180,56,0.3)] border border-white/25 relative z-10 transition-transform duration-700 group-hover:rotate-6">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#fe951c] via-[#fff2a1] to-[#1a79e5] p-[3px]">
                    <div className="w-full h-full rounded-full bg-gradient-to-b from-[#181b26] via-[#11131c] to-[#0a0b0e] flex items-center justify-center relative overflow-hidden shadow-inner">
                        <div className="absolute inset-3 rounded-full border border-dashed border-white/20 animate-[spin_60s_linear_infinite]" />
                        <div className="absolute inset-6 rounded-full border border-white/5" />

                        <svg className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_8px_15px_rgba(0,0,0,0.85)] transition-transform duration-500 group-hover:scale-110" viewBox="0 0 100 100" fill="none">
                            <defs>
                                <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="35%" stopColor="#fff2a1" />
                                    <stop offset="70%" stopColor="#fdb438" />
                                    <stop offset="100%" stopColor="#d97706" />
                                </linearGradient>
                                <linearGradient id="goldDark" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#e07d0b" />
                                    <stop offset="100%" stopColor="#5c2b00" />
                                </linearGradient>
                                <linearGradient id="silverLight" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="100%" stopColor="#94a3b8" />
                                </linearGradient>
                                <linearGradient id="silverDark" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#64748b" />
                                    <stop offset="100%" stopColor="#1e293b" />
                                </linearGradient>
                            </defs>
                            <polygon points="50,4 50,50 62,50" fill="url(#goldLight)" />
                            <polygon points="50,4 50,50 38,50" fill="url(#goldDark)" />
                            <polygon points="50,96 50,50 38,50" fill="url(#silverLight)" />
                            <polygon points="50,96 50,50 62,50" fill="url(#silverDark)" />
                            <polygon points="96,50 50,50 50,62" fill="url(#goldLight)" />
                            <polygon points="96,50 50,50 50,38" fill="url(#goldDark)" />
                            <polygon points="4,50 50,50 50,38" fill="url(#silverLight)" />
                            <polygon points="4,50 50,50 50,62" fill="url(#silverDark)" />
                            <polygon points="76,24 50,50 57,43" fill="#e2e8f0" />
                            <polygon points="76,76 50,50 57,57" fill="#475569" />
                            <polygon points="24,76 50,50 43,57" fill="#e2e8f0" />
                            <polygon points="24,24 50,50 43,43" fill="#475569" />
                            <circle cx="50" cy="50" r="7" fill="url(#goldLight)" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface RecommendationCard {
    unlockKey: string
    name: string
    reason: string
    tag: string
    xp: number
    image: string
}

const SMART_RECOMMENDATIONS: Record<string, RecommendationCard[]> = {
    study: [
        {
            unlockKey: 'poi_bep_hoang_cam',
            name: 'Bếp Hoàng Cầm — Không Khói',
            reason: '⭐ Ôn tập & Tích lũy XP: Trọng tâm câu hỏi kiểm tra lịch sử chiến thuật Củ Chi.',
            tag: '+50 XP · TRẮC NGHIỆM',
            xp: 50,
            image: '/media/cu-chi/hotspots/bep-hoang-cam.jpg', // Ảnh đã có sẵn
        },
        {
            unlockKey: 'poi_ham_chong',
            name: 'Hệ Thống Hầm Chông & Bẫy',
            reason: '📚 Tiến độ học tập: Mở khóa cấu tạo 8 loại bẫy du kích tự tạo.',
            tag: '+40 XP · MÔ HÌNH 3D',
            xp: 40,
            image: '/media/cu-chi/ham-chong.jpg', // Thay bằng đường dẫn local
        },
        {
            unlockKey: 'poi_lo_thong_hoi',
            name: 'Lỗ Thông Hơi Ổ Mối',
            reason: '💡 Gợi ý tiếp theo: Bài học về nghệ thuật ngụy trang sinh tồn dưới lòng đất.',
            tag: '+35 XP · TOUR 360°',
            xp: 35,
            image: '/media/cu-chi/lo-thong-hoi.jpg', // Thay bằng đường dẫn local
        }
    ],
    research: [
        {
            unlockKey: 'poi_sa_ban_3_tang',
            name: 'Cấu Trúc Địa Đạo 3 Tầng Ngầm',
            reason: '🔍 Khảo cứu tư liệu chuyên sâu: Phân tích thông số kỹ thuật độ sâu từ 3m đến 12m.',
            tag: 'SỬ LIỆU RAG · BẢN ĐỒ',
            xp: 60,
            image: '/media/banner-main.jpg', // Ảnh đã có sẵn
        },
        {
            unlockKey: 'poi_ben_duoc',
            name: 'Đền Tưởng Niệm Bến Dược',
            reason: '📜 Khảo cứu kiến trúc: Hồ sơ lưu trữ hơn 45.639 liệt sĩ hy sinh tại vùng đất thép.',
            tag: 'TƯ LIỆU GỐC · 4K',
            xp: 55,
            image: '/media/cu-chi/ben-duoc.jpg', // Thay bằng đường dẫn local
        },
        {
            unlockKey: 'poi_xe_tang_m41',
            name: 'Xác Xe Tăng M41 Mỹ Bị Phá Hủy',
            reason: '⚙️ Khảo cứu vũ khí: Đối chiếu chiến thuật mìn gạt chống tăng của anh hùng Tô Hoài Đức.',
            tag: 'PHÂN TÍCH QUÂN SỰ',
            xp: 45,
            image: '/media/cu-chi/xe-tang-m41.jpg', // Thay bằng đường dẫn local
        }
    ],
    travel: [
        {
            unlockKey: 'poi_khu_ban_sung',
            name: 'Khu Trải Nghiệm Bắn Súng Thể Thao',
            reason: '🎒 Điểm tham quan nổi bật: Trải nghiệm thực tế tháo lắp và bắn đạn thật quốc phòng.',
            tag: 'CHECK-IN HOT · ONSITE',
            xp: 30,
            image: '/media/cu-chi/ban-sung.jpg', // Thay bằng đường dẫn local
        },
        {
            unlockKey: 'poi_ham_chui_ben_dinh',
            name: 'Chui Hầm Thực Tế Bến Đình',
            reason: '📸 Lộ trình check-in: Thử thách đi bộ 50m dưới hầm ngầm nguyên bản.',
            tag: 'THỬ THÁCH THỰC TẾ',
            xp: 45,
            image: '/media/cu-chi/chui-ham.jpg', // Thay bằng đường dẫn local
        },
        {
            unlockKey: 'poi_thuong_thuc_khoai_mi',
            name: 'Bếp Ăn Chiến Khu — Khoai Mì Muối Mè',
            reason: '🍵 Ẩm thực di sản: Thưởng thức món ăn đặc trưng nuôi sống quân dân Củ Chi.',
            tag: 'ẨM THỰC · CHECK-IN',
            xp: 25,
            image: '/media/cu-chi/khoai-mi.jpg', // Thay bằng đường dẫn local
        }
    ]
}

export function HomePage() {
    const { mode: appMode } = useAppMode()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<ProfileMe | null>(null)
    const [ready, setReady] = useState<Ready | null>(null)

    const personaGoal = useMemo(() => {
        return (localStorage.getItem('timelens_pref_goal') || 'study') as 'study' | 'research' | 'travel'
    }, [])

    const sessionDuration = useMemo(() => {
        return localStorage.getItem('timelens_pref_duration') || '30'
    }, [])

    const aiTone = useMemo(() => {
        return localStorage.getItem('timelens_pref_ai_tone') || 'heritage'
    }, [])

    const recommendations = useMemo(() => {
        return SMART_RECOMMENDATIONS[personaGoal] || SMART_RECOMMENDATIONS['study']
    }, [personaGoal])

    useEffect(() => {
        profileApi.me().then(setProfile).catch(() => setProfile(null))
        demoApi.ready().then(setReady).catch(() => setReady({ status: 'UP', database: 'UP' }))
    }, [])

    const goalBadgeInfo = useMemo(() => {
        switch (personaGoal) {
            case 'research':
                return { label: 'Khảo Cứu Chuyên Sâu', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: 'science' }
            case 'travel':
                return { label: 'Du Lịch Tự Do', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: 'explore' }
            default:
                return { label: 'Học Tập & Lấy XP', color: 'bg-[#fe951c]/20 text-[#fdb438] border-[#fe951c]/40', icon: 'school' }
        }
    }, [personaGoal])

    return (
        <AppLayout activeBorder="right" topNav={<HomeTopNav />}>
            <main className="flex-grow pt-[88px] px-4 md:px-8 pb-20 w-full space-y-8 bg-[#0f1015] text-white selection:bg-[#fe951c] selection:text-black">

                {/* --- MODULE BẢNG CẤU HÌNH CÁ NHÂN HÓA CHI TIẾT --- */}
                <section className="bg-gradient-to-r from-[#161824] via-[#1a1d2c] to-[#161824] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#fe951c]/15 border border-[#fdb438]/40 flex items-center justify-center text-[#fdb438] shrink-0">
                                <MaterialIcon name="manage_accounts" className="text-xl" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white">Cấu Hình Trải Nghiệm & Trợ Lý AI</h2>
                                <p className="text-xs text-gray-400">Hệ thống đang tối ưu hóa lộ trình khám phá theo lựa chọn của bạn</p>
                            </div>
                        </div>
                        <Link
                            to="/mode-select"
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-[#fdb438] hover:text-white transition-all flex items-center justify-center gap-1.5 shrink-0"
                        >
                            <MaterialIcon name="tune" className="text-sm" />
                            <span>Điều chỉnh cấu hình</span>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-1">
                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <MaterialIcon name="place" className="text-sm text-[#388cf1]" /> Điểm đến đã chọn
                            </span>
                            <p className="text-xs sm:text-sm font-black text-white truncate">Địa Đạo Củ Chi</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <MaterialIcon name={goalBadgeInfo.icon} className="text-sm text-[#fe951c]" /> Mục đích trải nghiệm
                            </span>
                            <p className="text-xs sm:text-sm font-black text-[#fdb438] truncate">{goalBadgeInfo.label}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <MaterialIcon name="schedule" className="text-sm text-emerald-400" /> Thời lượng dự kiến
                            </span>
                            <p className="text-xs sm:text-sm font-black text-white truncate">{sessionDuration} Phút tham quan</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <MaterialIcon name="smart_toy" className="text-sm text-purple-400" /> Phong cách AI RAG
                            </span>
                            <p className="text-xs sm:text-sm font-black text-purple-300 truncate">
                                {aiTone === 'modern' ? 'Hiện đại súc tích' : 'Trầm hùng truyền cảm hứng'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* --- HERO DASHBOARD COMMAND CENTER --- */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c1f2e]/95 via-[#13151f]/95 to-[#0c0d12] p-6 sm:p-8 md:p-10 border border-[#fdb438]/35 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                    <div className="absolute -left-20 -top-20 w-80 h-80 bg-[#fe951c]/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute right-10 bottom-0 w-72 h-72 bg-[#1a79e5]/12 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">

                        <div className="space-y-4 text-center lg:text-left max-w-xl">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-[#fe951c]/20 border border-[#fdb438]/50 text-[#fdb438] text-[11px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(253,180,56,0.25)]">
                                HỒ SƠ NHÀ KHÁM PHÁ DI SẢN
                            </span>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md">
                                {profile?.displayName || 'Nguyễn Quốc Huy'}
                            </h1>
                            <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-medium">
                                Bạn đang giữ danh hiệu <strong className="text-[#fdb438] font-black text-lg">{profile?.levelName || 'Senior Explorer'} (Cấp {profile?.level || 4})</strong> với tổng điểm <strong className="text-white font-black">{((profile?.totalPoints || 1250)).toLocaleString()} XP</strong>. Hoàn thành các gợi ý RAG bên dưới để thăng hạng Legend!
                            </p>

                            <div className="pt-2 flex flex-wrap gap-3 justify-center lg:justify-start">
                                <button
                                    onClick={() => navigate('/explore')}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] hover:scale-105 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(254,149,28,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <MaterialIcon name="explore" className="text-base font-bold" />
                                    <span>Trung Tâm Khám Phá Củ Chi</span>
                                </button>
                                <button
                                    onClick={() => navigate(`/tour/360/${CU_CHI_LOCATION_ID}`)}
                                    className="px-5 py-3 rounded-xl bg-[#388cf1]/20 hover:bg-[#388cf1]/30 border border-[#388cf1]/50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <MaterialIcon name="360" className="text-base text-[#388cf1]" />
                                    <span>Tham Quan 360°</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 w-full lg:w-auto">
                            <LuxuryCompass3D />

                            <div className="bg-[#151722]/95 border border-white/10 p-6 rounded-2xl w-full sm:w-64 backdrop-blur-xl shadow-2xl space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-extrabold text-white">Tiến độ cấp độ</span>
                                    <span className="text-xs font-black text-[#fdb438]">{(profile?.levelProgressPercent || 65)}%</span>
                                </div>

                                <div className="h-3 w-full bg-black/70 rounded-full overflow-hidden p-0.5 border border-white/10">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#fff2a1] rounded-full shadow-[0_0_12px_#fe951c] transition-all duration-1000"
                                        style={{ width: `${profile?.levelProgressPercent || 65}%` }}
                                    />
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-gray-300">
                                    <div className="flex justify-between">
                                        <span>Đã mở khóa POI:</span>
                                        <span className="font-bold text-white">12 / 36</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Huy hiệu đạt được:</span>
                                        <span className="font-bold text-[#fdb438]">5 Thẻ</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                                    <span>Trạng thái máy chủ:</span>
                                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                        <span>API {ready?.status || 'UP'} · DB {ready?.database || 'UP'}</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* --- THẺ TỔNG QUAN ĐỊA ĐIỂM SỬ DỤNG CU_CHI_HERO --- */}
                <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#161824] shadow-xl">
                    <div className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url('${CU_CHI_HERO}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#161824] via-[#161824]/90 to-transparent pointer-events-none" />

                    <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded bg-[#fe951c] text-black font-black text-[10px] uppercase">MVP PILOT CHÍNH THỨC</span>
                                <span className="text-xs font-bold text-gray-400">TP. Hồ Chí Minh</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">Khám Phá Địa Đạo Củ Chi — Đất Thép Thành Đồng</h2>
                            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                                Tái hiện trọn vẹn hệ thống hầm ngầm 3 tầng huyền thoại, kết nối trực tiếp với cẩm nang RAG AI giúp bạn trả lời mọi câu hỏi về chiến thuật đào hầm và sinh hoạt kháng chiến.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                            <button
                                onClick={() => navigate(`/time-portal/${CU_CHI_LOCATION_ID}`)}
                                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#388cf1] to-cyan-500 hover:scale-105 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <MaterialIcon name="compare" className="text-base" />
                                <span>Cổng Thời Gian</span>
                            </button>
                            <button
                                onClick={() => navigate(buildChatPath())}
                                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <MaterialIcon name="forum" className="text-base text-[#fdb438]" />
                                <span>Trợ Lý AI</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* --- MODULE GỢI Ý KHÁM PHÁ THÔNG MINH TỪ AI --- */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black text-[#fdb438] uppercase tracking-wider">
                                <MaterialIcon name="auto_awesome" className="text-base" />
                                <span>RAG AI RECOMMENDATIONS ENGINE</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                                Lộ Trình Đề Xuất Cho Bạn
                            </h2>
                        </div>
                        <Link to="/explore" className="text-xs font-bold text-[#388cf1] hover:text-[#fdb438] transition-colors flex items-center gap-1 group">
                            <span>Mở toàn bộ bản đồ 36 Hotspots</span>
                            <MaterialIcon name="arrow_forward" className="text-sm transform group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recommendations.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => navigate('/explore')}
                                className="group bg-[#161824] hover:bg-[#1a1d2c] border border-white/10 hover:border-[#fe951c]/60 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                            >
                                <div>
                                    <div className="h-44 relative overflow-hidden bg-black">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-85 group-hover:brightness-100" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-transparent to-transparent" />
                                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-black text-[#fdb438] uppercase tracking-wider">
                                            {item.tag}
                                        </span>
                                    </div>

                                    <div className="p-6 space-y-2.5">
                                        <h3 className="text-lg font-black text-white group-hover:text-[#fdb438] transition-colors line-clamp-1">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 font-medium">
                                            {item.reason}
                                        </p>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                                    <span>Khám phá ngay</span>
                                    <MaterialIcon name="arrow_forward" className="text-base text-[#fe951c] transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- MODULE BENTO GRID - NHIỆM VỤ ĐANG CHẠY & TRỢ LÝ AI NHANH --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                    <div className="lg:col-span-7 bg-[#161824] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#388cf1]/20 text-[#388cf1] flex items-center justify-center font-bold">
                                        <MaterialIcon name="flag" />
                                    </div>
                                    <h3 className="text-xl font-black text-white">Nhiệm Vụ Đang Thực Hiện</h3>
                                </div>
                                <Link to="/quests" className="text-xs font-bold text-[#fdb438] hover:underline">Tất cả nhiệm vụ</Link>
                            </div>

                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="px-2.5 py-0.5 rounded bg-[#fe951c]/20 text-[#fdb438] text-[10px] font-black uppercase">QUEST CHÍNH</span>
                                        <h4 className="text-base font-black text-white mt-1">Hành Trình Dưới Lòng Đất — Củ Chi 1968</h4>
                                    </div>
                                    <span className="text-sm font-black text-emerald-400">+250 XP</span>
                                </div>

                                <p className="text-xs text-gray-300 font-medium">
                                    Tìm kiếm và xác thực 4 tọa độ cốt lõi bên trong khu tái hiện hầm ngầm Bến Dược.
                                </p>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-gray-400">Tiến độ hoàn thành:</span>
                                        <span className="text-white">2 / 4 Bước (50%)</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-black/50 rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-gradient-to-r from-[#388cf1] to-cyan-400 rounded-full w-1/2" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/5">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                                        <MaterialIcon name="military_tech" className="text-2xl" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-400 uppercase">Huy hiệu sắp mở khóa</p>
                                        <p className="text-sm font-black text-white">Chiến Sĩ Đất Thép (Cấp Đồng)</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/profile')} className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 cursor-pointer">Xem kho thẻ</button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-gradient-to-b from-[#181a28] to-[#12141e] border-2 border-[#388cf1]/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#388cf1]/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span className="text-xs font-black text-[#388cf1] tracking-wider uppercase">TRỢ LÝ LỊCH SỬ RAG AI</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">Ollama 3B</span>
                            </div>

                            <h3 className="text-2xl font-black text-white leading-snug">
                                Trò Chuyện Trực Tiếp Cùng Nhân Vật Lịch Sử
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                                Đặt câu hỏi về chiến thuật đào hầm, bẫy chông hay cuộc sống kháng chiến. Trợ lý RAG cam kết minh bạch 100% sử liệu trích dẫn.
                            </p>

                            <div className="space-y-2 pt-2">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hỏi nhanh Trợ lý:</p>
                                <div className="flex flex-col gap-2">
                                    {[
                                        'Chiến thuật đào hầm 2 giếng diễn ra thế nào?',
                                        'Bếp Hoàng Cầm hoạt động ra sao để không khói?',
                                        'Giải thích nguyên lý bẫy chông kẹp nách Củ Chi'
                                    ].map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => navigate(buildChatPath({ prompt }))}
                                            className="text-left text-xs font-semibold text-gray-200 hover:text-white p-3 rounded-xl bg-white/5 hover:bg-[#388cf1]/20 border border-white/10 hover:border-[#388cf1]/50 transition-all flex items-center justify-between group cursor-pointer"
                                        >
                                            <span className="line-clamp-1">"{prompt}"</span>
                                            <MaterialIcon name="send" className="text-sm text-gray-500 group-hover:text-[#388cf1] shrink-0 ml-2" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(buildChatPath())}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#388cf1] to-[#1a79e5] hover:scale-[1.02] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10"
                        >
                            <MaterialIcon name="forum" className="text-lg" />
                            <span>Vào Phòng Đối Thoại Trọn Vẹn</span>
                        </button>
                    </div>

                </div>

                {/* --- MODULE 4: LỐI TẮT NHANH CÔNG NGHỆ --- */}
                <section className="pt-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4">
                        Công cụ & Trải nghiệm thực tế ảo
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Link
                            to={`/time-portal/${CU_CHI_LOCATION_ID}?view=ar`}
                            className="p-5 rounded-2xl bg-[#161824] hover:bg-[#1f2335] border border-white/10 hover:border-[#fe951c] transition-all group flex flex-col justify-between h-32"
                        >
                            <MaterialIcon name="view_in_ar" className="text-3xl text-[#fdb438] group-hover:scale-110 transition-transform" />
                            <div>
                                <h4 className="text-sm font-bold text-white">Cổng AR Củ Chi</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">Đối chiếu xưa & nay</p>
                            </div>
                        </Link>

                        <Link
                            to="/photo-frame"
                            className="p-5 rounded-2xl bg-[#161824] hover:bg-[#1f2335] border border-white/10 hover:border-[#388cf1] transition-all group flex flex-col justify-between h-32"
                        >
                            <MaterialIcon name="photo_camera" className="text-3xl text-[#388cf1] group-hover:scale-110 transition-transform" />
                            <div>
                                <h4 className="text-sm font-bold text-white">Photo Frame</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">Chụp ảnh đóng dấu di sản</p>
                            </div>
                        </Link>

                        <Link
                            to="/leaderboard"
                            className="p-5 rounded-2xl bg-[#161824] hover:bg-[#1f2335] border border-white/10 hover:border-amber-400 transition-all group flex flex-col justify-between h-32"
                        >
                            <MaterialIcon name="leaderboard" className="text-3xl text-amber-400 group-hover:scale-110 transition-transform" />
                            <div>
                                <h4 className="text-sm font-bold text-white">Bảng Xếp Hạng</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">Vinh danh cộng đồng</p>
                            </div>
                        </Link>

                        {appMode === 'offline' && (
                            <Link
                                to="/scan"
                                className="p-5 rounded-2xl bg-[#161824] hover:bg-[#1f2335] border border-white/10 hover:border-emerald-400 transition-all group flex flex-col justify-between h-32"
                            >
                                <MaterialIcon name="qr_code_scanner" className="text-3xl text-emerald-400 group-hover:scale-110 transition-transform" />
                                <div>
                                    <h4 className="text-sm font-bold text-white">Quét Thực Địa</h4>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Check-in QR & GPS</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </section>

            </main>
        </AppLayout>
    )
}