// src/pages/LeaderboardPage.tsx
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useAuth } from '../shared/auth/useAuth'
import { HERITAGE_BADGES } from '../features/explore/heritageBadges'
import { useHonors } from '../features/leaderboard/useHonors'
import { HonorsPodium, HonorsTable, ExplorerAvatar } from '../features/leaderboard/HonorsPeople'
import { formatXp } from '../features/leaderboard/format'
import { HonorsRules } from '../features/leaderboard/HonorsRules'
import { NextJourneyStep, AchievementSpotlights, HonorsTimeline } from '../features/leaderboard/HonorsStories'
import { HonorsPassport } from '../features/leaderboard/HonorsPassport'
import { CommunityFootprint } from '../features/leaderboard/CommunityFootprint'
import mascotImg from '../assets/mascot.png'
import '../features/leaderboard/honors.css'
import '../features/leaderboard/honors-polish.css'
import '../features/leaderboard/honors-stories.css'
import '../features/leaderboard/honors-complete.css'

export function LeaderboardPage() {
    const { user } = useAuth()
    const [params] = useSearchParams()
    const groupId = params.get('groupId')
    const {
        board,
        personal,
        personalLoading,
        loading,
        error,
        refresh,
        stories,
        storiesLoading,
        storiesError,
        passport,
        passportLoading,
        community,
        communityLoading,
    } = useHonors(user?.id, groupId)
    const [rulesOpen, setRulesOpen] = useState(false)

    const viewer = board?.viewer
    const previewData =
        import.meta.env.DEV &&
        ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
        board?.entries.some((entry) => entry.displayName.endsWith(' · Mẫu UI'))

    const progress = HERITAGE_BADGES.flatMap((badge) => {
        const status = personal?.badges.find((item) => item.id === badge.id)
        return status ? [{ badge, status }] : []
    })
    const earned = progress.filter((item) => item.status.earned)
    const higher = board?.nearby
        .filter((entry) => viewer && entry.totalPoints > viewer.totalPoints)
        .at(-1)
    const syncedPersonal =
        personal && viewer && personal.profile.totalPoints === viewer.totalPoints
            ? personal
            : null
    const pointsToNextLevel = syncedPersonal?.profile.pointsToNextLevel
    const levelProgressPercent = syncedPersonal?.profile.levelProgressPercent ?? 0

    const updatedAt =
        board && !Number.isNaN(Date.parse(board.updatedAt))
            ? new Date(board.updatedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
            })
            : null

    const badgeCompletionPct = Math.round((earned.length / HERITAGE_BADGES.length) * 100)
    const featuredEntries = board?.entries.slice(0, 10) ?? []
    const compactGallery = featuredEntries.length <= 3

    // =========================================================================
    // KHỐI 1: BẢNG VÀNG NHÀ THÁM HIỂM TIÊU BIỂU (TOP 10)
    // =========================================================================
    const featuredCard = board && (
        <section className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between space-y-6 relative overflow-hidden">
            {/* Họa tiết góc trang trí tinh tế */}
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-[#FDC908]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0275FB] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FDC908] ring-4 ring-[#FFF2C3]" />
                            <span>Những dấu ấn dẫn đầu</span>
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1.5 tracking-tight">
                            Nhà thám hiểm tiêu biểu
                        </h2>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDC908] text-[11px] font-black text-[#0F1B33] shadow-xs">
                            <MaterialIcon name="stars" className="text-sm text-[#0275FB]" />
                            <span>Bảng vàng danh dự</span>
                        </span>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFF2C3] via-[#FDC908] to-[#FDB900] text-[#0F1B33] flex items-center justify-center shadow-[0_8px_20px_rgba(253,201,8,0.35)] border border-white">
                            <MaterialIcon name="workspace_premium" className="text-2xl text-[#0F1B33]" />
                        </div>
                    </div>
                </div>

                {featuredEntries.length ? (
                    <div className="space-y-6">
                        {/* Bục Vinh Danh Top 3 */}
                        <div className="p-4 sm:p-6 rounded-[1.8rem] bg-gradient-to-b from-[#F4F9FF] via-white to-[#FFFBEB]/50 border border-[#0275FB]/15 shadow-inner">
                            <HonorsPodium entries={featuredEntries} />
                        </div>

                        {/* Thông báo đồng hạng tại ranh giới Top 10 */}
                        {(board.omittedTiedAtCutoff ?? 0) > 0 && (
                            <div
                                className="honors-cutoff-note p-4 rounded-2xl bg-gradient-to-r from-[#FFFBEB] via-[#FFF2C3]/50 to-white border-l-4 border-[#FDC908] flex items-start gap-3 shadow-xs"
                                data-testid="honors-cutoff-note"
                            >
                                <MaterialIcon name="info" className="text-lg text-[#d97706] shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-[13px] font-bold text-[#0F1B33] leading-relaxed">
                                    Có {formatXp(board.omittedTiedAtCutoff!)} nhà thám hiểm khác cùng{' '}
                                    {formatXp(board.cutoffXp ?? 0)} XP tại ranh giới top 10 chưa nằm trong danh sách hiển thị. Tất cả vẫn giữ cùng hạng XP; vị trí của bạn luôn được hiển thị riêng.
                                </p>
                            </div>
                        )}

                        {/* Danh sách từ hạng 4 đến hạng 10 */}
                        {featuredEntries.length > 3 && (
                            <div className="space-y-4 pt-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-5 rounded-full bg-[#0275FB]" />
                                        <h3 className="text-lg sm:text-xl font-black text-[#0F1B33]">
                                            Tiếp bước những người bền bỉ
                                        </h3>
                                    </div>
                                    <span className="px-3.5 py-1 rounded-full bg-[#EAF3FF] border border-[#0275FB]/20 text-xs font-black text-[#0275FB]">
                                        {featuredEntries.length}/10 người tiêu biểu
                                    </span>
                                </div>
                                <HonorsTable
                                    entries={featuredEntries.slice(3)}
                                    label="Bảng vinh danh toàn hành trình"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className="p-10 rounded-3xl bg-gradient-to-b from-[#F4F9FF] to-white border-2 border-dashed border-[#0275FB]/30 text-center space-y-4"
                        data-testid="honors-empty"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center mx-auto shadow-sm">
                            <MaterialIcon name="explore" className="text-3xl" />
                        </div>
                        <h3 className="text-xl font-black text-[#0F1B33]">
                            Những dấu ấn đầu tiên đang chờ được viết
                        </h3>
                        <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                            Hãy bắt đầu khám phá để tích lũy XP và cùng cộng đồng ghi dấu hành trình.
                        </p>
                        <Link
                            to="/explore"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                        >
                            <span>Khám phá di sản →</span>
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )

    // =========================================================================
    // KHỐI 2: DẤU ẤN TRÊN HÀNH TRÌNH CỦA BẠN TẠI CỦ CHI
    // =========================================================================
    const journeyCard = (
        <section className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0275FB] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0275FB]" />
                            <span>Giá trị tích lũy theo từng bước chân</span>
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1.5 tracking-tight">
                            Dấu ấn trên hành trình của bạn
                        </h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center border border-[#0275FB]/20 shadow-sm shrink-0">
                        <MaterialIcon name="footprint" className="text-2xl" />
                    </div>
                </div>

                {personal ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Thẻ Khám phá Củ Chi */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#F2F7FF] via-white to-[#EAF3FF]/60 border-2 border-[#0275FB]/20 flex flex-col justify-between gap-4 shadow-xs hover:border-[#0275FB]/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white flex items-center justify-center shrink-0 shadow-md">
                                        <MaterialIcon name="travel_explore" className="text-2xl text-[#FDC908]" />
                                    </div>
                                    <div>
                                        <b className="text-2xl sm:text-3xl font-black text-[#0275FB] block leading-none">
                                            {personal.discovery.discovered}
                                        </b>
                                        <span className="text-xs font-bold text-slate-600 mt-1 block">
                                            Khám phá tại Củ Chi
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold text-[#0275FB] bg-white/80 px-3 py-1.5 rounded-xl border border-[#0275FB]/10">
                                    <span>Hồ sơ thực địa</span>
                                    <span>Đã xác thực ✓</span>
                                </div>
                            </div>

                            {/* Thẻ Huy hiệu Di sản */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-white to-[#FFF2C3]/60 border-2 border-[#FDC908] flex flex-col justify-between gap-4 shadow-xs">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FDC908] to-[#FDB900] text-[#0F1B33] flex items-center justify-center shrink-0 shadow-md">
                                        <MaterialIcon name="military_tech" className="text-2xl text-[#0275FB]" />
                                    </div>
                                    <div>
                                        <b className="text-2xl sm:text-3xl font-black text-[#0F1B33] block leading-none">
                                            {earned.length}
                                            <small className="text-base font-bold text-slate-500">
                                                {' '}/ {HERITAGE_BADGES.length}
                                            </small>
                                        </b>
                                        <span className="text-xs font-bold text-slate-600 mt-1 block">
                                            Huy hiệu di sản Củ Chi
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-[#FDC908]/50">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#0275FB] to-[#FDC908] rounded-full transition-all duration-700"
                                            style={{ width: `${Math.max(6, badgeCompletionPct)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-amber-900/80 block text-right">
                                        Hoàn thành {badgeCompletionPct}% bộ sưu tập
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FFF2C3]/75 via-[#FFFBEB] to-white border-l-4 border-[#FDC908] text-xs sm:text-sm font-bold text-[#0F1B33] leading-relaxed flex items-center justify-between gap-4">
                            <span>
                                {earned.length === HERITAGE_BADGES.length
                                    ? '🎉 Bạn đã chinh phục trọn bộ huy hiệu di sản Củ Chi. Hành trình học hỏi vẫn tiếp tục!'
                                    : '✨ Mỗi khám phá mở ra một cột mốc mới. Những điều đã học sẽ là hành trang của bạn.'}
                            </span>
                            <Link
                                to="/explore"
                                className="shrink-0 px-3.5 py-2 rounded-xl bg-white border border-[#FDC908] text-xs font-black text-[#0275FB] hover:bg-[#0275FB] hover:text-white transition-colors"
                            >
                                Khám phá →
                            </Link>
                        </div>
                    </div>
                ) : personalLoading ? (
                    <p className="text-sm font-bold text-[#0275FB] animate-pulse py-4" role="status">
                        Đang tải chi tiết dấu ấn cá nhân…
                    </p>
                ) : (
                    <div
                        data-testid="honors-personal-error"
                        className="p-5 rounded-2xl bg-amber-50 border border-[#FDC908] flex flex-wrap items-center justify-between gap-3"
                    >
                        <p className="text-xs sm:text-sm font-medium text-[#0F1B33]">
                            Chưa tải được chi tiết dấu ấn cá nhân. Tổng XP và vị trí của bạn vẫn được hiển thị từ bảng vinh danh.
                        </p>
                        <button
                            className="px-4 py-2 rounded-xl bg-white border border-[#0275FB]/30 text-xs font-black text-[#0275FB] hover:bg-[#EAF3FF] cursor-pointer"
                            type="button"
                            onClick={refresh}
                        >
                            Tải lại dấu ấn cá nhân
                        </button>
                    </div>
                )}
            </div>
        </section>
    )

    // =========================================================================
    // KHỐI 3: NHỮNG NGƯỜI BẠN ĐỒNG HÀNH QUANH VỊ TRÍ CỦA BẠN
    // =========================================================================
    const nearbyCard = board && board.nearby.length > 0 && (
        <section className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0275FB] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Mỗi người một hành trình</span>
                    </p>
                    <h2 className="text-2xl font-black text-[#0F1B33] mt-1">
                        Những người bạn đồng hành
                    </h2>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#F2F7FF] border border-[#0275FB]/20 text-xs font-black text-[#0275FB]">
                    Các vị trí quanh bạn
                </span>
            </div>
            <HonorsTable
                entries={board.nearby}
                label="Các nhà thám hiểm quanh vị trí của bạn"
            />
        </section>
    )

    // =========================================================================
    // KHỐI 4: THẺ ĐỊNH DANH CÁ NHÂN (VIEWER VIP PASS)
    // =========================================================================
    const viewerCard = viewer && board && (
        <section
            className="honors-surface-card bg-white border-2 border-[#FDC908] rounded-[2.2rem] overflow-hidden shadow-[0_20px_50px_rgba(2,117,251,0.14)] flex flex-col justify-between"
            data-testid="honors-viewer"
        >
            {/* Header Thẻ Định Danh Hoàng Gia */}
            <div className="relative bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] px-6 py-4 border-b-2 border-[#FDC908] flex items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] opacity-15 pointer-events-none" />
                <p className="relative z-10 text-[11px] font-black uppercase tracking-[0.16em] text-[#FFF2C3] flex items-center gap-1.5">
                    <MaterialIcon name="verified_user" className="text-base text-[#FDC908]" />
                    <span>Dấu ấn của bạn</span>
                </p>
                <span className="relative z-10 px-3 py-1 rounded-full bg-[#FDC908] text-[#0F1B33] text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Cấp {viewer.level}
                </span>
            </div>

            <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                    {/* Avatar & Tên Nhà Thám Hiểm */}
                    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#F4F9FF] via-white to-[#FFFBEB]/60 border border-[#0275FB]/15">
                        <div className="relative shrink-0 p-1 rounded-full bg-gradient-to-tr from-[#FDC908] via-amber-300 to-[#0275FB] shadow-md">
                            <ExplorerAvatar
                                key={`${viewer.userId}:${viewer.avatarUrl}`}
                                entry={viewer}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-black text-[#0F1B33] truncate">
                                {viewer.displayName}
                            </h2>
                            <p className="text-xs font-bold text-[#0275FB] mt-0.5 flex items-center gap-1">
                                <MaterialIcon name="military_tech" className="text-sm text-[#FDC908]" />
                                <span className="truncate">
                                    {syncedPersonal?.profile.levelName ??
                                        `Nhà thám hiểm · Cấp ${viewer.level}`}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Khối Thứ hạng & Tổng XP */}
                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#F2F7FF] to-white border-2 border-[#0275FB]/20 flex flex-col justify-between shadow-xs">
                            {viewer.rank ? (
                                <>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Thứ hạng hiện tại
                                    </span>
                                    <b className="text-2xl sm:text-3xl font-black text-[#0275FB] my-1 tracking-tight">
                                        #{formatXp(viewer.rank)}
                                    </b>
                                    <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                                        trên {formatXp(board.totalParticipants)} nhà thám hiểm có XP
                                    </span>
                                </>
                            ) : (
                                <>
                                    <b className="text-sm font-black text-[#0F1B33]">
                                        Chưa xếp hạng
                                    </b>
                                    <span className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">
                                        {viewer.totalPoints === 0
                                            ? 'XP đầu tiên sẽ mở dấu mốc của bạn.'
                                            : 'Tài khoản không thuộc phạm vi vinh danh hiện tại.'}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#FFFBEB] to-white border-2 border-[#FDC908]/70 flex flex-col justify-between shadow-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/70">
                                Tổng XP toàn hệ thống
                            </span>
                            <b className="text-2xl sm:text-3xl font-black text-[#0F1B33] my-1 tracking-tight">
                                {formatXp(viewer.totalPoints)}{' '}
                                <small className="text-xs font-black text-[#0275FB]">XP</small>
                            </b>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span>Cấp {viewer.level}</span>
                                <span>{viewer.badgeCount} huy hiệu đã đạt</span>
                            </div>
                        </div>
                    </div>

                    {/* Thanh Tiến Độ Cấp Độ Tài Khoản */}
                    {syncedPersonal && typeof pointsToNextLevel === 'number' && (
                        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between text-xs font-black">
                                <span className="text-slate-500 uppercase tracking-wider text-[10px]">
                                    Tiến độ thăng cấp
                                </span>
                                <span className="text-[#0275FB]">{levelProgressPercent}%</span>
                            </div>

                            <progress
                                className="sr-only"
                                aria-label="Tiến độ cấp độ tài khoản"
                                max={100}
                                value={levelProgressPercent}
                            />
                            <div className="h-3 w-full bg-[#EAF3FF] rounded-full overflow-hidden p-0.5 border border-[#0275FB]/20 relative">
                                <div
                                    className="h-full bg-gradient-to-r from-[#0275FB] via-[#388cf1] to-[#FDC908] rounded-full transition-all duration-700 relative overflow-hidden"
                                    style={{
                                        width: `${Math.min(100, Math.max(4, levelProgressPercent))}%`,
                                    }}
                                >
                                    <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-[honorsShimmer_2.5s_infinite]" />
                                </div>
                            </div>

                            <p className="text-xs font-bold text-slate-600">
                                {pointsToNextLevel > 0
                                    ? `Còn ${formatXp(pointsToNextLevel)} XP đến cấp tiếp theo.`
                                    : 'Bạn đã đạt cấp cao nhất hiện tại.'}
                            </p>
                        </div>
                    )}

                    {/* Khoảng cách điểm để bắt kịp người phía trước (Đã fix lỗi toán tử trừ) */}
                    {higher && (
                        <p className="p-3.5 rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 text-xs font-semibold text-[#0F1B33] flex items-center gap-2.5">
                            <MaterialIcon name="trending_up" className="text-lg text-[#0275FB] shrink-0" />
                            <span>
                                Thêm{' '}
                                <b className="font-black text-[#0275FB]">
                                    {formatXp(higher.totalPoints - viewer.totalPoints)} XP
                                </b>{' '}
                                để bắt kịp một vị trí phía trước.
                            </span>
                        </p>
                    )}
                </div>

                <Link
                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 text-[#0F1B33] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_8px_22px_rgba(253,201,8,0.45)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                    to="/explore"
                >
                    <span>Tiếp tục hành trình</span>
                    <MaterialIcon name="arrow_forward" className="text-lg text-[#0275FB]" />
                </Link>
            </div>
        </section>
    )

    // =========================================================================
    // KHỐI 5: BỘ SƯU TẬP NHỮNG HUY HIỆU TỰ HÀO
    // =========================================================================
    const badgesCard = personal && (
        <section
            data-testid="honors-badges"
            className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-7 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between space-y-5"
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0275FB]">
                            Bộ sưu tập danh giá
                        </p>
                        <h2 className="text-lg sm:text-xl font-black text-[#0F1B33] flex items-center gap-2 mt-0.5">
                            <MaterialIcon name="military_tech" className="text-xl text-[#FDC908]" />
                            <span>Những huy hiệu tự hào</span>
                        </h2>
                    </div>
                    <Link
                        to="/profile"
                        className="px-3 py-1.5 rounded-xl bg-[#F2F7FF] hover:bg-[#EAF3FF] border border-[#0275FB]/20 text-xs font-black text-[#0275FB] transition-colors whitespace-nowrap"
                    >
                        Xem hồ sơ →
                    </Link>
                </div>

                {earned.length ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3.5">
                            {earned.slice(0, 6).map(({ badge }) => (
                                <Link
                                    to="/profile"
                                    key={badge.id}
                                    title={badge.name}
                                    className="group relative p-3.5 rounded-2xl bg-gradient-to-b from-[#FFFBEB] via-white to-[#F2F7FF] border-2 border-[#FDC908]/60 hover:border-[#0275FB] flex flex-col items-center justify-center transition-all hover:-translate-y-1 shadow-xs"
                                >
                                    <div className="absolute inset-2 rounded-full bg-[#FDC908]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <img
                                        src={badge.image}
                                        alt={badge.name}
                                        loading="lazy"
                                        className="relative z-10 w-16 h-16 object-contain drop-shadow-[0_6px_12px_rgba(253,201,8,0.65)] group-hover:scale-110 transition-transform"
                                    />
                                    <span className="relative z-10 text-[11px] font-black text-[#0F1B33] text-center line-clamp-1 mt-2 group-hover:text-[#0275FB]">
                                        {badge.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl bg-[#F8FAFC] border-2 border-dashed border-slate-200 text-center space-y-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF2C3] text-[#0F1B33] flex items-center justify-center mx-auto">
                            <MaterialIcon name="military_tech" className="text-2xl text-[#0275FB]" />
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500">
                            Huy hiệu đầu tiên đang chờ bạn trên hành trình khám phá di sản.
                        </p>
                        <Link
                            to="/explore"
                            className="inline-block text-xs font-black text-[#0275FB] hover:underline pt-1"
                        >
                            Mở khóa huy hiệu tại Củ Chi →
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )

    return (
        <AppLayout
            activeBorder="left"
            mobileTitle="Bảng vinh danh"
            showCta={false}
            className="honors-layout"
        >
            <main className="honors-page bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 min-h-screen w-full text-[#0F1B33] font-sans selection:bg-[#FDC908] selection:text-[#0F1B33] pb-24 relative overflow-x-hidden">
                {/* HỆ THỐNG STYLE ĐỒNG BỘ BỐ CỤC CÂN XỨNG & CÁC COMPONENT CON */}
                <style>
                    {`
                    @keyframes honorsFloat {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        25% { transform: translateY(-8px) rotate(-1.5deg); }
                        50% { transform: translateY(2px) rotate(0deg); }
                        75% { transform: translateY(-5px) rotate(1.5deg); }
                    }
                    @keyframes honorsShimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                    .honors-mascot-float {
                        animation: honorsFloat 6s ease-in-out infinite;
                    }
                    .honors-page {
                        padding: 0 !important;
                        max-width: none !important;
                    }
                    /* Hệ thống Lưới Cân Đối 3 Tầng (Balanced 12-Column Grid) */
                    .honors-balanced-content {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                    }
                    .honors-balanced-row {
                        display: grid;
                        grid-template-columns: repeat(1, minmax(0, 1fr));
                        gap: 2rem;
                        align-items: stretch;
                    }
                    @media (min-width: 1280px) {
                        .honors-balanced-row {
                            grid-template-columns: repeat(12, minmax(0, 1fr));
                        }
                        .honors-balanced-row > :first-child {
                            grid-column: span 7 / span 7;
                        }
                        .honors-balanced-row > :last-child {
                            grid-column: span 5 / span 5;
                        }
                    }
                    .honors-cell-stack {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                        height: 100%;
                    }
                    .honors-cell-stack > * {
                        flex: 1 1 auto;
                    }
                    /* Thẻ Châm Ngôn Di Sản (Balanced Quote Card) */
                    .honors-balanced-quote {
                        position: relative;
                        overflow: hidden;
                        border-radius: 2.2rem;
                        border: 2px solid rgba(253, 201, 8, 0.75);
                        background: linear-gradient(135deg, #0F1B33 0%, #13284c 55%, #0353B8 100%);
                        color: #ffffff;
                        padding: 1.75rem 2rem;
                        box-shadow: 0 18px 45px rgba(15, 27, 51, 0.16);
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        gap: 0.65rem;
                    }
                    .honors-balanced-quote::after {
                        content: '';
                        position: absolute;
                        right: -2.5rem;
                        bottom: -2.5rem;
                        width: 9rem;
                        height: 9rem;
                        border-radius: 9999px;
                        background: radial-gradient(circle, rgba(253, 201, 8, 0.28) 0%, transparent 70%);
                        pointer-events: none;
                    }
                    .honors-balanced-quote .material-symbols-outlined {
                        font-size: 2rem;
                        color: #FDC908;
                    }
                    .honors-balanced-quote b {
                        font-size: 1.125rem;
                        font-weight: 900;
                        color: #FFF2C3;
                        letter-spacing: -0.01em;
                        line-height: 1.35;
                    }
                    .honors-balanced-quote p {
                        font-size: 0.875rem;
                        color: rgba(224, 242, 254, 0.92);
                        line-height: 1.65;
                        font-weight: 500;
                    }
                    .honors-balanced-quote a {
                        display: inline-flex;
                        align-items: center;
                        align-self: flex-start;
                        gap: 0.4rem;
                        margin-top: 0.5rem;
                        padding: 0.6rem 1.15rem;
                        border-radius: 0.9rem;
                        background: #FDC908;
                        color: #0F1B33;
                        font-size: 0.75rem;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 0.06em;
                        box-shadow: 0 6px 16px rgba(253, 201, 8, 0.35);
                        transition: transform 0.2s ease, filter 0.2s ease;
                    }
                    .honors-balanced-quote a:hover {
                        transform: translateY(-2px);
                        filter: brightness(1.05);
                    }
                    /* Đồng bộ các thẻ Hộ chiếu (HonorsPassport) & Cộng đồng (CommunityFootprint) */
                    .honors-balanced-content > .honors-balanced-row section:not(.honors-surface-card) {
                        border-radius: 2.2rem !important;
                        border: 2px solid rgba(2, 117, 251, 0.16) !important;
                        background: #ffffff !important;
                        box-shadow: 0 18px 45px rgba(2, 117, 251, 0.07) !important;
                        padding: 1.75rem !important;
                    }
                    `}
                </style>

                {/* ========================================================= */}
                {/* HERO BANNER: ĐÀI VINH DANH TRI THỨC & BỀN BỈ               */}
                {/* ========================================================= */}
                <section className="relative overflow-hidden bg-gradient-to-br from-[#0353B8] via-[#0275FB] to-[#014296] border-b-4 border-[#FDC908] shadow-[0_18px_45px_rgba(2,117,251,0.28)] pt-6 pb-12 lg:py-12">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] pointer-events-none" />
                    <div className="absolute -top-24 right-[12%] w-[480px] h-[480px] bg-[#FDC908]/25 rounded-full blur-[120px] animate-pulse pointer-events-none" />
                    <div className="absolute -bottom-24 left-[5%] w-[360px] h-[360px] bg-sky-300/20 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 z-10 space-y-8">
                        {/* Nội dung chính của Hero Banner */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-center">
                            {/* CỘT TRÁI (7 PHẦN): THÔNG ĐIỆP VINH DANH & 3 THẺ ẤN CHỈ */}
                            <div className="xl:col-span-7 space-y-5 text-center xl:text-left">
                                <div className="inline-flex flex-wrap items-center justify-center xl:justify-start gap-3">
                                    <span className="px-3.5 py-1.5 rounded-full bg-[#FDC908] text-[#0F1B33] font-black text-[11px] uppercase tracking-wider shadow-[0_0_20px_rgba(253,201,8,0.6)] inline-flex items-center gap-1.5">
                                        <MaterialIcon name="auto_awesome" className="text-sm text-[#0275FB]" />
                                        <span>Thành tích toàn hành trình</span>
                                    </span>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FFF2C3]">
                                        ✦ Tôn vinh tri thức · Ghi nhận sự bền bỉ ✦
                                    </p>
                                </div>

                                <h1 className="text-3xl sm:text-5xl 2xl:text-[3.25rem] font-black text-white tracking-tight leading-[1.15] drop-shadow-md">
                                    Những bước chân bền bỉ.
                                    <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2C3] via-[#FDC908] to-[#FFD93D] drop-shadow-[0_2px_12px_rgba(253,201,8,0.45)]">
                                        Một hành trình đáng tự hào.
                                    </span>
                                </h1>

                                <p className="text-sm sm:text-base text-blue-50/95 font-medium leading-relaxed max-w-2xl mx-auto xl:mx-0">
                                    Tôn vinh những nhà thám hiểm mang theo sự tò mò, tích lũy tri thức và bền bỉ khám phá di sản. Mỗi dấu ấn hôm nay góp nên giá trị của cả hành trình.
                                </p>

                                {/* 3 Thẻ Ấn Chỉ Di Sản trên Hero */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                                    <div className="bg-white/12 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-left hover:bg-white/18 transition-all shadow-inner">
                                        <div className="flex items-center justify-between text-[#FFF2C3] text-[11px] font-black uppercase tracking-wider">
                                            <span>Vị thế hiện tại</span>
                                            <MaterialIcon name="emoji_events" className="text-base text-[#FDC908]" />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-black text-white mt-1.5 tracking-tight">
                                            {viewer?.rank ? `#${formatXp(viewer.rank)}` : 'Khởi hành'}
                                        </p>
                                        <p className="text-[11px] text-blue-100/90 font-semibold mt-0.5">
                                            {board ? `Trong ${formatXp(board.totalParticipants)} nhà thám hiểm` : 'Cùng cộng đồng TimeLens'}
                                        </p>
                                    </div>

                                    <div className="bg-white/12 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-left hover:bg-white/18 transition-all shadow-inner">
                                        <div className="flex items-center justify-between text-[#FFF2C3] text-[11px] font-black uppercase tracking-wider">
                                            <span>Tích lũy tri thức</span>
                                            <MaterialIcon name="bolt" className="text-base text-[#FDC908]" />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-black text-white mt-1.5 tracking-tight">
                                            {viewer ? `${formatXp(viewer.totalPoints)} XP` : '0 XP'}
                                        </p>
                                        <p className="text-[11px] text-blue-100/90 font-semibold mt-0.5 truncate">
                                            {syncedPersonal?.profile.levelName ?? (viewer ? `Cấp độ ${viewer.level}` : 'Sẵn sàng khám phá')}
                                        </p>
                                    </div>

                                    <div className="bg-white/12 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-left hover:bg-white/18 transition-all shadow-inner">
                                        <div className="flex items-center justify-between text-[#FFF2C3] text-[11px] font-black uppercase tracking-wider">
                                            <span>Huy hiệu Đất Thép</span>
                                            <MaterialIcon name="military_tech" className="text-base text-[#FDC908]" />
                                        </div>
                                        <p className="text-2xl sm:text-3xl font-black text-white mt-1.5 tracking-tight">
                                            {earned.length} / {HERITAGE_BADGES.length}
                                        </p>
                                        <p className="text-[11px] text-blue-100/90 font-semibold mt-0.5">
                                            {earned.length > 0 ? `Đã mở khóa ${badgeCompletionPct}% bộ sưu tập` : 'Chinh phục ngay tại Củ Chi'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* CỘT PHẢI (5 PHẦN): LINH VẬT CHRONO & LA BÀN THỜI GIAN */}
                            <div className="xl:col-span-5 relative flex items-center justify-center py-4">
                                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FDC908]/45 via-amber-200/20 to-transparent blur-2xl animate-pulse pointer-events-none" />
                                    <div className="absolute w-full h-full rounded-full border-2 border-dashed border-[#FDC908]/60 animate-[spin_24s_linear_infinite] pointer-events-none" />
                                    <div className="absolute w-4/5 h-4/5 rounded-full border-2 border-dotted border-white/40 animate-[spin_16s_linear_infinite_reverse] pointer-events-none" />
                                    <div className="absolute w-3/5 h-3/5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 pointer-events-none" />

                                    <img
                                        className="honors-mascot-float relative z-10 w-48 h-48 sm:w-60 sm:h-60 object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.45)] select-none"
                                        src={mascotImg}
                                        alt="Chrono đồng hành cùng nhà thám hiểm"
                                    />

                                    <div className="absolute -top-2 right-0 sm:right-2 z-20 bg-white text-[#0F1B33] border-2 border-[#FDC908] px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                            Đài Vinh Danh Di Sản
                                        </span>
                                    </div>

                                    <div className="absolute -bottom-3 left-2 sm:left-4 z-20 bg-[#0F1B33]/90 backdrop-blur-md text-[#FFF2C3] border border-[#FDC908]/60 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                        <MaterialIcon name="workspace_premium" className="text-sm text-[#FDC908]" />
                                        <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                            Tiếp nối tri thức Việt
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========================================================= */}
                {/* KHÔNG GIAN NỘI DUNG CHÍNH TRÊN TRANG                       */}
                {/* ========================================================= */}
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8 relative z-10">

                    {/* Thông báo dữ liệu mẫu trên môi trường Dev Local */}
                    {previewData && (
                        <aside
                            className="bg-amber-50 border-2 border-[#FDC908] rounded-2xl p-4 flex items-start gap-3.5 shadow-sm"
                            role="note"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#FDC908] text-[#0F1B33] flex items-center justify-center shrink-0">
                                <MaterialIcon name="science" className="text-xl" />
                            </div>
                            <div className="text-xs sm:text-sm">
                                <b className="font-black text-[#0F1B33] block">Đang xem dữ liệu mẫu trên local</b>
                                <p className="text-slate-600 font-medium mt-0.5">
                                    Các hồ sơ có nhãn “Mẫu UI” dùng để kiểm tra bố cục nhiều tài khoản. XP và thành tích của tài khoản thật được giữ nguyên.
                                </p>
                            </div>
                        </aside>
                    )}

                    {/* BẢNG ĐIỀU KHIỂN HỢP NHẤT: CỘNG ĐỒNG & THÔNG ĐIỆP DI SẢN */}
                    <div className="bg-[#F8FBFF] border border-[#0275FB]/15 rounded-3xl p-5 shadow-sm space-y-4">
                        {/* Hàng trên: Tiêu đề Cộng đồng + Nút tương tác */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-[#0275FB] text-white flex items-center justify-center shadow-md">
                                    <MaterialIcon name={groupId ? 'groups' : 'public'} className="text-xl text-[#FDC908]" />
                                </span>
                                <div>
                                    <h2 className="text-base sm:text-[17px] font-black text-[#0F1B33] flex items-center gap-2">
                                        <span>{groupId ? 'Vinh danh trong nhóm' : 'Cộng đồng TimeLens'}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDC908] text-[9px] font-black uppercase text-[#0F1B33]">
                                            XP Toàn hệ thống
                                        </span>
                                    </h2>
                                    {updatedAt && (
                                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                            Cập nhật lúc {updatedAt}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                {groupId && (
                                    <Link
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-[#0275FB] transition-all"
                                        to="/leaderboard"
                                    >
                                        ← Về cộng đồng
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-xs font-black text-[#0275FB] uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                    onClick={() => setRulesOpen(true)}
                                    aria-label="Nguyên tắc vinh danh"
                                >
                                    <MaterialIcon name="info" className="text-[15px]" />
                                    <span>Nguyên tắc vinh danh</span>
                                </button>
                                <button
                                    type="button"
                                    className={`w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-[#0275FB] shadow-sm transition-colors cursor-pointer ${loading ? 'opacity-50' : ''}`}
                                    onClick={refresh}
                                    aria-label="Làm mới bảng vinh danh"
                                    disabled={loading}
                                >
                                    <MaterialIcon name="refresh" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Hàng dưới: Thông điệp truyền cảm hứng */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <span className="w-11 h-11 rounded-2xl bg-[#FDC908] text-[#0F1B33] flex items-center justify-center shadow-md shrink-0 border border-white">
                                    <MaterialIcon name="menu_book" className="text-2xl text-[#0275FB]" />
                                </span>
                                <div>
                                    <h3 className="text-[15px] sm:text-base font-black text-[#0F1B33]">
                                        Di sản được tiếp nối từ những người không ngừng khám phá.
                                    </h3>
                                    <p className="text-xs sm:text-[13px] font-medium text-slate-600 mt-0.5">
                                        Vị trí trên bảng vinh danh là một dấu mốc. Những điều bạn học được mới là hành trang đi cùng bạn.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TRẠNG THÁI CHƯA ĐĂNG NHẬP */}
                    {!user && (
                        <section className="bg-white border-2 border-[#0275FB]/20 rounded-[2.2rem] p-8 text-center space-y-4 shadow-lg">
                            <div className="w-16 h-16 rounded-2xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center mx-auto">
                                <MaterialIcon name="lock_open" className="text-3xl" />
                            </div>
                            <h2 className="text-2xl font-black text-[#0F1B33]">Đăng nhập để ghi dấu hành trình</h2>
                            <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                                Cùng cộng đồng khám phá di sản và tự hào với những thành tích của bạn.
                            </p>
                            <Link
                                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                                to="/login"
                            >
                                <span>Đăng nhập</span>
                            </Link>
                        </section>
                    )}

                    {/* TRẠNG THÁI ĐANG TẢI (SKELETON LOADING) */}
                    {loading && (
                        <div
                            className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-8 sm:p-10 text-center space-y-4 shadow-md"
                            role="status"
                            aria-label="Đang tải bảng vinh danh"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                                <span className="h-28 rounded-2xl bg-slate-100 animate-pulse block" />
                                <span className="h-32 rounded-2xl bg-[#EAF3FF] animate-pulse block" />
                                <span className="h-28 rounded-2xl bg-slate-100 animate-pulse block" />
                            </div>
                            <p className="text-sm font-black text-[#0275FB] animate-pulse pt-2">
                                Đang mở những dấu ấn hành trình…
                            </p>
                        </div>
                    )}

                    {/* TRẠNG THÁI LỖI TẢI BẢNG VINH DANH */}
                    {error && (
                        <section
                            className="bg-white border-2 border-rose-200 rounded-[2.2rem] p-8 text-center space-y-4 shadow-md"
                            data-testid="honors-error"
                            role="alert"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                                <MaterialIcon name="cloud_off" className="text-3xl" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                Bảng vinh danh tạm thời chưa sẵn sàng
                            </h2>
                            <p className="text-sm text-slate-600 font-medium max-w-lg mx-auto">{error}</p>
                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    className="px-6 py-3 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all"
                                    onClick={refresh}
                                >
                                    Thử lại bảng vinh danh
                                </button>
                            </div>
                        </section>
                    )}

                    {/* TRẠNG THÁI TẢI CÂU CHUYỆN HÀNH TRÌNH (STORIES) */}
                    {board && storiesLoading && (
                        <p
                            className="bg-white/80 border border-[#0275FB]/20 rounded-2xl p-4 text-center text-xs sm:text-sm font-bold text-[#0275FB] animate-pulse"
                            role="status"
                        >
                            Đang kết nối những dấu ấn hành trình…
                        </p>
                    )}

                    {board && storiesError && (
                        <section
                            className="bg-amber-50/90 border-2 border-[#FDC908] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
                            data-testid="honors-stories-error"
                        >
                            <p className="text-xs sm:text-sm font-semibold text-[#0F1B33]">
                                Câu chuyện hành trình tạm thời chưa tải được. Thành tích đã lưu và bảng vinh danh của bạn vẫn được giữ nguyên.
                            </p>
                            <button
                                className="px-4 py-2 rounded-xl bg-white border border-[#FDC908] text-xs font-black text-[#0275FB] hover:bg-[#FFF2C3] cursor-pointer transition-colors"
                                type="button"
                                onClick={refresh}
                            >
                                Tải lại câu chuyện hành trình
                            </button>
                        </section>
                    )}

                    {/* GỢI Ý BƯỚC TIẾP THEO & TIÊU ĐIỂM THÀNH TÍCH */}
                    {board && stories && (
                        <div className="space-y-8">
                            <NextJourneyStep paths={stories.paths} />
                            <AchievementSpotlights items={stories.spotlights} />
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* LƯỚI BỐ CỤC CÂN ĐỐI 3 TẦNG: CỘNG ĐỒNG (TRÁI) & CÁ NHÂN (PHẢI) */}
                    {/* ========================================================= */}
                    {board && viewer && (
                        <div className="honors-balanced-content">
                            {/* TẦNG 1: BẢNG VÀNG TIÊU BIỂU (TRÁI) & HỘ CHIẾU ĐỊNH DANH (PHẢI) */}
                            <div className="honors-balanced-row">
                                <div className="honors-cell-stack" data-testid="honors-featured">
                                    {featuredCard}
                                    {compactGallery && stories && (
                                        <HonorsTimeline
                                            key={`${user?.id}:${groupId ?? ''}`}
                                            moments={stories.timeline}
                                        />
                                    )}
                                </div>
                                <aside className="honors-cell-stack" data-testid="honors-identity-column">
                                    {viewerCard}
                                    <HonorsPassport
                                        key={user?.id}
                                        data={passport}
                                        loading={passportLoading}
                                        owner={viewer.userId}
                                        onRetry={refresh}
                                    />
                                </aside>
                            </div>

                            {/* TẦNG 2: DÒNG THỜI GIAN HÀNH TRÌNH (TRÁI) & BỘ SƯU TẬP HUY HIỆU (PHẢI) */}
                            <div className="honors-balanced-row">
                                <div className="honors-cell-stack">
                                    {!compactGallery && stories ? (
                                        <HonorsTimeline
                                            key={`${user?.id}:${groupId ?? ''}`}
                                            moments={stories.timeline}
                                        />
                                    ) : (
                                        journeyCard
                                    )}
                                </div>
                                <div className="honors-cell-stack">
                                    {badgesCard}
                                    {!compactGallery && stories && journeyCard}
                                    {(compactGallery || !stories) && (
                                        <div className="honors-balanced-quote">
                                            <MaterialIcon name="format_quote" />
                                            <b>Chậm một bước cũng là đang tiến lên.</b>
                                            <p>
                                                Không cần đứng đầu để hành trình của bạn trở nên đáng tự hào.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* TẦNG 3: NGƯỜI BẠN ĐỒNG HÀNH (TRÁI) & DẤU CHÂN CỘNG ĐỒNG (PHẢI) */}
                            <div className="honors-balanced-row">
                                <div className="honors-cell-stack">
                                    {nearbyCard}
                                    <div className="honors-balanced-quote">
                                        <MaterialIcon name="diversity_3" />
                                        <b>
                                            {nearbyCard
                                                ? 'Mỗi dấu ấn riêng, cùng một hành trình.'
                                                : 'Một hành trình đang mở ra.'}
                                        </b>
                                        <p>
                                            {nearbyCard
                                                ? 'Thành tích của bạn góp thêm một câu chuyện vào hành trình khám phá di sản của cộng đồng. Bước tiếp theo luôn bắt đầu từ sự tò mò.'
                                                : 'Khi có XP đầu tiên, những người đồng hành quanh vị trí của bạn sẽ xuất hiện tại đây.'}
                                        </p>
                                        <Link to="/explore">Tiếp tục khám phá →</Link>
                                    </div>
                                </div>
                                <CommunityFootprint
                                    data={community}
                                    loading={communityLoading}
                                    onRetry={refresh}
                                    group={Boolean(groupId)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================= */}
                {/* CHÂN TRANG (FOOTER)                                       */}
                {/* ========================================================= */}
                <footer className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-[#0275FB]/15 text-center space-y-1 text-xs sm:text-sm font-bold text-[#0F1B33]">
                    <p>Mang theo sự tò mò. Để lại những dấu ấn.</p>
                    <span className="block text-xs font-semibold text-[#0275FB]">
                        TimeLens · Khám phá di sản, tiếp nối tri thức.
                    </span>
                </footer>

                {/* MODAL NGUYÊN TẮC VINH DANH */}
                {rulesOpen && <HonorsRules onClose={() => setRulesOpen(false)} />}
            </main>
        </AppLayout>
    )
}
