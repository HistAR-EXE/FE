// src/pages/ProfilePage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type MyBadge, type PassportMe, type ProfileMe } from '../features/profile/api'
import { gamificationApi, discoveriesApi, type QuestProgress, type VisitedLocations } from '../features/gamification/api'
import { locationsApi, type Location } from '../features/locations/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { ProgressSummaryCard } from '../features/gamification/ProgressSummaryCard'
import { normalizeHeritageName } from '../features/explore/vietnamMap'
import { viralApi, type UserCreation } from '../features/viral/api'
import { useToast } from '../shared/ui/toast/useToast'
import { useAuth } from '../shared/auth/useAuth'
import { hasBasicGamificationAccess, hasFullGamificationAccess } from '../shared/access/contentAccess'
import { UpgradePrompt } from '../components/monetization/UpgradePrompt'
import { exploreApi, type ExploreBadgeProgress } from '../features/explore/api'
import { HERITAGE_BADGES, type HeritageBadge } from '../features/explore/heritageBadges'

type ProfileTab = 'overview' | 'passport'

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'passport', label: 'Hộ chiếu & Huy hiệu' },
]

// ============================================================================
// CẤU HÌNH ĐỒNG BỘ TIẾN ĐỘ & 9 HUY HIỆU TỪ TRANG KHÁM PHÁ (EXPLORE PAGE)
// ============================================================================
// Component hiển thị ảnh Huy hiệu thông minh (Tự động tìm cả /media/badges/ và /badges/ mà không qua resolveMediaUrl)
type BadgeArtworkProps = {
    badgeNumber: number
    alt: string
    unlocked: boolean
    className?: string
}

function BadgeArtwork({ badgeNumber, alt, unlocked, className = '' }: BadgeArtworkProps) {
    const candidates = useMemo(
        () => [
            `/media/badges/badge-${badgeNumber}.png`,
            `/badges/badge-${badgeNumber}.png`,
            `/media/badges/badge-${badgeNumber}.jpg`,
            `/badges/badge-${badgeNumber}.jpg`,
        ],
        [badgeNumber]
    )
    const [attemptIndex, setAttemptIndex] = useState(0)

    return (
        <img
            src={candidates[attemptIndex]}
            alt={alt}
            onError={() => {
                if (attemptIndex < candidates.length - 1) {
                    setAttemptIndex((prev) => prev + 1)
                }
            }}
            className={`w-full h-full object-cover transition-transform duration-500 ${
                unlocked ? '' : 'grayscale contrast-75 opacity-60'
            } ${className}`}
        />
    )
}

export function ProfilePage() {
    const { user } = useAuth()
    const userId = user?.id
    const navigate = useNavigate()
    const { showToast } = useToast()
    const passportUnlocked = hasBasicGamificationAccess(user)
    const premiumGamification = hasFullGamificationAccess(user)

    const [storedProfile, setProfile] = useState<ProfileMe | null>(null)
    const profile = storedProfile?.id === userId ? storedProfile : null
    const [badges, setBadges] = useState<MyBadge[]>([])
    const [quests, setQuests] = useState<QuestProgress[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [visitedCount, setVisitedCount] = useState(0)
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
    const [creations, setCreations] = useState<UserCreation[]>([])
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [passportStampDates, setPassportStampDates] = useState<Map<string, string>>(new Map())

    const [badgeProgress, setBadgeProgress] = useState<ExploreBadgeProgress[]>([])
    const [archiveXp, setArchiveXp] = useState(0)
    const [selectedBadge, setSelectedBadge] = useState<HeritageBadge | null>(null)
    const [profileError, setProfileError] = useState(false)
    const requestVersion = useRef(0)

    const loadProfileAndArchive = useCallback(async () => {
        if (!userId) return
        const version = ++requestVersion.current
        try {
            const snapshot = await exploreApi.snapshot()
            if (version !== requestVersion.current || snapshot.profile.id !== userId) return
            setProfile(snapshot.profile)
            setBadgeProgress(snapshot.badges)
            setArchiveXp(snapshot.archiveXp)
            setProfileError(false)
            const requests: [
                Promise<MyBadge[]>, Promise<PassportMe>, Promise<QuestProgress[]>,
                Promise<Location[]>, Promise<VisitedLocations>, Promise<UserCreation[]>,
            ] = [
                profileApi.myBadges(), profileApi.passport(), gamificationApi.myQuests(),
                locationsApi.list({ size: 50 }), discoveriesApi.visitedLocations(), viralApi.myCreations(),
            ]
            const results = await Promise.allSettled(requests)
            if (version !== requestVersion.current) return
            const [badgeResult, passportResult, questResult, locationResult, visitResult, creationResult] = results
            setBadges(badgeResult.status === 'fulfilled' ? badgeResult.value : [])
            setPassportStampDates(passportResult.status === 'fulfilled'
                ? new Map((passportResult.value.stamps ?? []).filter(s => s.completedAt).map(s => [s.locationId, s.completedAt!])) : new Map())
            setQuests(questResult.status === 'fulfilled' ? questResult.value : [])
            setLocations(locationResult.status === 'fulfilled' ? locationResult.value : [])
            setVisitedCount(visitResult.status === 'fulfilled' ? visitResult.value.visitedLocationIds.length : 0)
            setCreations(creationResult.status === 'fulfilled' ? creationResult.value : [])
        } catch {
            if (version === requestVersion.current) setProfileError(true)
        }
    }, [userId])

    useEffect(() => {
        setProfile(null); setBadgeProgress([]); setBadges([]); setQuests([])
        setLocations([]); setVisitedCount(0); setCreations([]); setPassportStampDates(new Map())
        setConfirmDeleteId(null); setDeletingId(null)
        setSelectedBadge(null); setProfileError(false)
        void loadProfileAndArchive()
        const reload = () => { void loadProfileAndArchive() }
        window.addEventListener(DISCOVERY_RECORDED_EVENT, reload)
        window.addEventListener('focus', reload)
        return () => {
            ++requestVersion.current
            window.removeEventListener(DISCOVERY_RECORDED_EVENT, reload)
            window.removeEventListener('focus', reload)
        }
    }, [loadProfileAndArchive])

    const deleteCreation = async (creationId: string) => {
        if (deletingId) return
        setDeletingId(creationId)
        try {
            await viralApi.deleteCreation(creationId)
            setCreations((current) => current.filter((creation) => creation.id !== creationId))
            setConfirmDeleteId(null)
            showToast({ message: 'Đã xóa ảnh khỏi hồ sơ.', type: 'success' })
        } catch {
            showToast({ message: 'Không thể xóa ảnh. Vui lòng thử lại.', type: 'error' })
        } finally {
            setDeletingId(null)
        }
    }

    const badgeState = (badge: HeritageBadge) => badgeProgress.find(p => p.id === badge.id)
    const isBadgeEarned = (badge: HeritageBadge) => badgeState(badge)?.earned === true
    const badgeProgressText = (badge: HeritageBadge) => badgeState(badge)?.progressText ?? 'Chưa có dữ liệu'
    const badgeProgressPercent = (badge: HeritageBadge) => badgeState(badge)?.progressPercent ?? 0
    const totalDisplayXp = profile?.totalPoints ?? 0
    const displayLevel = profile?.level ?? 1
    const unlockedHeritageBadges = HERITAGE_BADGES.filter(isBadgeEarned)

    const completedQuests = useMemo(
        () => quests.filter((q) => q.status === 'completed'),
        [quests]
    )

    const passportStamps = useMemo(() => {
        const locById = new Map(locations.map((l) => [l.id, l]))
        const stampedLocationIds = new Set(passportStampDates.keys())

        const stamped = locations
            .filter((l) => stampedLocationIds.has(l.id))
            .map((l) => {
                const quest = completedQuests.find((q) => q.locationId === l.id)
                const completedAt = quest?.completedAt ?? passportStampDates.get(l.id)
                return { location: l, completedAt }
            })
        const unstamped = locations.filter((l) => !stampedLocationIds.has(l.id))
        return { stamped, unstamped, locById }
    }, [locations, completedQuests, passportStampDates])

    return (
        <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Hồ sơ" />}>
            <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full pb-24">
                {!profile && (
                    <div className="space-y-md">
                        <div className="h-40 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
                        <p role={profileError ? 'alert' : 'status'} className="text-on-surface-variant text-sm">{profileError ? 'Không thể tải hồ sơ đã lưu.' : 'Đang tải hồ sơ...'}</p>
                        {profileError && <button type="button" onClick={() => void loadProfileAndArchive()} className="text-blue-700 underline">Thử lại</button>}
                    </div>
                )}

                {profile && (
                    <>
                        <div className="flex gap-md border-b border-neutral-200 mb-md overflow-x-auto">
                            {PROFILE_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`shrink-0 pb-sm px-xs font-title-md text-sm whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                                        activeTab === tab.id
                                            ? 'border-primary-500 text-primary-500'
                                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ========================================================= */}
                        {/* TAB 1: TỔNG QUAN HỒ SƠ & KỆ TRƯNG BÀY HUY HIỆU ĐÃ ĐẠT     */}
                        {/* ========================================================= */}
                        {activeTab === 'overview' && (
                            <section className="bg-surface-container border border-outline-variant rounded-xl p-lg relative overflow-hidden space-y-6">
                                <div className="absolute -top-20 -right-10 h-48 w-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="grid md:grid-cols-3 gap-md items-center relative pb-md border-b border-outline-variant/40">
                                    <div className="flex items-center gap-md md:col-span-2">
                                        <img
                                            src={profile.avatarUrl || images.profileAvatar}
                                            alt={profile.displayName}
                                            className="w-24 h-24 rounded-full object-cover border-2 border-primary shadow-[0_0_24px_rgba(242,191,80,0.30)]"
                                        />
                                        <div>
                                            <h1 className="font-display-lg text-on-surface leading-none">{profile.displayName}</h1>
                                            <p className="text-on-surface-variant">{profile.email}</p>
                                            <div className="flex flex-wrap gap-xs mt-xs">
                                                <span className="inline-flex px-xs py-[2px] text-xs rounded-full border border-secondary/40 text-secondary font-bold">
                                                    Level {displayLevel} {profile.levelName ? `· ${profile.levelName}` : ''}
                                                </span>
                                                <span className="inline-flex px-xs py-[2px] text-xs rounded-full border border-outline-variant text-on-surface-variant">
                                                    {profile.role === 'ADMIN'
                                                        ? 'Quản trị'
                                                        : profile.role === 'TEACHER'
                                                            ? 'Giáo viên'
                                                            : profile.role === 'ORG_MEMBER'
                                                                ? 'Thành viên tổ chức'
                                                                : 'Thành viên'}
                                                </span>
                                                {profile.role === 'ADMIN' && (
                                                    <span className="inline-flex px-xs py-[2px] text-xs rounded-full border border-primary/40 bg-primary/10 text-primary">
                                                        Admin · xem trước toàn bộ
                                                    </span>
                                                )}
                                                <span
                                                    className={`inline-flex px-xs py-[2px] text-xs rounded-full border ${
                                                        profile.tier === 'PREMIUM'
                                                            ? 'border-primary text-primary'
                                                            : 'border-outline-variant text-on-surface-variant'
                                                    }`}
                                                >
                                                    {profile.tier === 'PREMIUM' ? 'Premium' : 'Miễn phí'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:justify-self-end flex flex-col gap-2 items-stretch md:items-end">
                                        <Link
                                            to="/journey-wrapped"
                                            className="inline-flex items-center gap-2 px-md py-sm border border-primary text-primary rounded-lg hover:bg-primary/10"
                                        >
                                            <MaterialIcon name="auto_awesome" className="text-sm" /> Journey Wrapped
                                        </Link>
                                        <Link
                                            to="/leaderboard"
                                            className="inline-flex items-center gap-2 px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10"
                                        >
                                            <MaterialIcon name="leaderboard" className="text-sm" /> Bảng xếp hạng
                                        </Link>
                                        {typeof localStorage !== 'undefined' && localStorage.getItem('histar_referral_code') && (
                                            <p className="text-[11px] font-mono text-on-surface-variant">
                                                Mã giới thiệu: {localStorage.getItem('histar_referral_code')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <ProgressSummaryCard />
                                </div>

                                {/* 4 Ô Thống Kê Chính (Bổ sung ô Huy Hiệu Di Sản) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                                    <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                                        <MaterialIcon name="star" className="text-primary mx-auto mb-xs" />
                                        <p className="text-[32px] leading-tight font-bold"><span data-testid="profile-account-xp">{totalDisplayXp.toLocaleString()}</span></p>
                                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">Tổng XP</p>
                                    </div>
                                    <div
                                        onClick={() => setActiveTab('passport')}
                                        className="bg-surface-container-high rounded-lg p-md border border-outline-variant hover:border-primary text-center cursor-pointer transition-colors"
                                    >
                                        <MaterialIcon name="military_tech" className="text-amber-500 mx-auto mb-xs" />
                                        <p className="text-[32px] leading-tight font-bold">
                                            {unlockedHeritageBadges.length}/{HERITAGE_BADGES.length}
                                        </p>
                                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">Huy hiệu Củ Chi</p>
                                    </div>
                                    <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                                        <MaterialIcon name="map" className="text-secondary mx-auto mb-xs" />
                                        <p className="text-[32px] leading-tight font-bold">{completedQuests.length}</p>
                                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">Nhiệm vụ</p>
                                    </div>
                                    <div className="bg-surface-container-high rounded-lg p-md border border-outline-variant text-center">
                                        <MaterialIcon name="location_on" className="text-tertiary mx-auto mb-xs" />
                                        <p className="text-[32px] leading-tight font-bold">
                                            {Math.max(visitedCount, unlockedHeritageBadges.length > 0 ? 1 : 0)}
                                        </p>
                                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">Di tích</p>
                                    </div>
                                </div>

                                {/* KỆ TRƯNG BÀY NHANH 9 HUY HIỆU NGAY TRONG TAB TỔNG QUAN */}
                                <div className="border-t border-outline-variant/40 pt-md space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h2 className="font-title-md inline-flex items-center gap-1.5">
                                                <MaterialIcon name="military_tech" className="text-amber-500" />
                                                <span>Bộ Sưu Tập Huy Hiệu Giải Mã Củ Chi ({unlockedHeritageBadges.length}/9)</span>
                                            </h2>
                                            <p className="text-xs text-on-surface-variant">
                                                Đồng bộ trực tiếp với tiến độ giải mã mật thư, tầng ngầm và hồ sơ lịch sử tại trang Khám Phá.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('passport')}
                                            className="text-xs font-bold text-primary-500 hover:underline cursor-pointer"
                                        >
                                            Xem chi tiết 9 huy hiệu →
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                                        {HERITAGE_BADGES.map((badge) => {
                                            const unlocked = isBadgeEarned(badge)
                                            return (
                                                <button
                                                    key={badge.id}
                                                    type="button"
                                                    onClick={() => setSelectedBadge(badge)}
                                                    title={`${badge.name} (${badgeProgressText(badge)})`}
                                                    className={`group flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer ${
                                                        unlocked
                                                            ? 'border-amber-400 bg-amber-500/10 shadow-sm hover:-translate-y-1'
                                                            : 'border-outline-variant bg-surface-container-high/50 opacity-70 hover:opacity-100'
                                                    }`}
                                                >
                                                    <div className="relative w-14 h-14 rounded-xl bg-slate-900 border border-amber-400/50 overflow-hidden flex items-center justify-center">
                                                        <BadgeArtwork
                                                            badgeNumber={badge.badgeNumber}
                                                            alt={badge.name}
                                                            unlocked={unlocked}
                                                            className="group-hover:scale-110"
                                                        />
                                                        {!unlocked && (
                                                            <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
                                                                <MaterialIcon name="lock" className="text-white text-base" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-center line-clamp-1 mt-1.5 text-on-surface">
                                                        {badge.name}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-sm pt-2">
                                    <Link
                                        to="/explore"
                                        className="inline-flex items-center gap-1 px-md py-sm bg-primary text-black font-bold rounded-lg hover:opacity-90"
                                    >
                                        <MaterialIcon name="explore" className="text-sm" /> Tiếp tục Giải mã Củ Chi
                                    </Link>
                                    <Link
                                        to="/leaderboard"
                                        className="inline-flex items-center gap-1 px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10"
                                    >
                                        <MaterialIcon name="leaderboard" className="text-sm" /> Bảng xếp hạng
                                    </Link>
                                    <Link
                                        to="/artifacts"
                                        className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant rounded-lg hover:border-secondary"
                                    >
                                        <MaterialIcon name="history_edu" className="text-sm" /> Bộ sưu tập
                                    </Link>
                                    <Link
                                        to="/photo-frame?returnTo=%2Fprofile"
                                        className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant rounded-lg hover:border-secondary"
                                    >
                                        <MaterialIcon name="photo_camera" className="text-sm" /> Khung ảnh
                                    </Link>
                                </div>

                                <section className="border-t border-outline-variant/40 pt-md">
                                    <h2 className="font-title-md mb-sm inline-flex items-center gap-1">
                                        <MaterialIcon name="photo_library" className="text-secondary" />
                                        Ảnh khung của bạn
                                    </h2>
                                    {creations.length === 0 ? (
                                        <p className="text-sm text-on-surface-variant">
                                            Chưa có ảnh nào.{' '}
                                            <Link to="/photo-frame?returnTo=%2Fprofile" className="text-secondary underline">
                                                Tạo tại Khung ảnh
                                            </Link>
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                                            {creations.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="relative min-w-0 overflow-hidden rounded-lg border border-outline-variant transition-colors hover:border-secondary"
                                                >
                                                    <Link to={`/share?creationId=${encodeURIComponent(c.id)}`} aria-label={`Xem ảnh ngày ${new Date(c.createdAt).toLocaleDateString('vi-VN')}`} className="block">
                                                        <img src={c.outputUrl} alt="" className="w-full aspect-square object-cover" />
                                                        <p className="text-[10px] text-on-surface-variant p-1 pr-9 truncate">
                                                            {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                                            {c.kind === 'heritage' && c.stationCode ? ` · ${c.stationCode}${c.roleId ? ` · ${c.roleId}` : ''}` : ''}
                                                            {c.shared ? ' · đã chia sẻ' : ''}
                                                        </p>
                                                    </Link>
                                                    {confirmDeleteId === c.id ? (
                                                        <div role="group" aria-label="Xác nhận xóa ảnh" className="absolute inset-x-1 bottom-1 flex flex-wrap items-center justify-end gap-1 rounded-lg bg-white/95 p-1 shadow-md">
                                                            <span className="mr-auto text-[11px] font-semibold text-on-surface">Xóa ảnh này?</span>
                                                            <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={deletingId === c.id} className="rounded-md px-2 py-1 text-xs text-on-surface hover:bg-surface-container">Hủy</button>
                                                            <button type="button" onClick={() => void deleteCreation(c.id)} disabled={deletingId === c.id} className="rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-60">{deletingId === c.id ? 'Đang xóa...' : 'Xóa'}</button>
                                                        </div>
                                                    ) : (
                                                        <button type="button" onClick={() => setConfirmDeleteId(c.id)} aria-label={`Xóa ảnh ngày ${new Date(c.createdAt).toLocaleDateString('vi-VN')}`} title="Xóa ảnh" className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                                                            <MaterialIcon name="delete" className="text-lg" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </section>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 2: HỘ CHIẾU DI SẢN & TRƯNG BÀY 9 HUY HIỆU DANH GIÁ    */}
                        {/* ========================================================= */}
                        {activeTab === 'passport' && (
                            <div className="space-y-6">
                                {!passportUnlocked && (
                                    <p className="text-sm text-on-surface-variant mb-md">
                                        Đăng nhập để xem Hộ chiếu & Huy hiệu.
                                    </p>
                                )}
                                {passportUnlocked && !premiumGamification && (
                                    <UpgradePrompt
                                        title="Đóng dấu AR tại di tích — Premium"
                                        message="Bạn vẫn xem được tem và huy hiệu đã đạt. Nâng cấp Premium để mở khóa đóng dấu Hộ chiếu khi check-in AR onsite và huy hiệu hiếm."
                                    />
                                )}

                                {/* PHẦN 1: BỘ SƯU TẬP 9 HUY HIỆU GIẢI MÃ ĐỊA ĐẠO CỦ CHI */}
                                <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
                                        <div>
                                            <h2 className="font-title-md inline-flex items-center gap-2 text-lg font-bold">
                                                <MaterialIcon name="workspace_premium" className="text-amber-500 text-2xl" />
                                                <span>Phòng Truyền Thống 9 Huy Hiệu Đất Thép</span>
                                            </h2>
                                            <p className="text-xs text-on-surface-variant mt-0.5">
                                                Mở khóa tự động khi bạn tích lũy XP, giải mã mật thư, khảo sát tầng sâu và đọc hồ sơ tại trang Khám Phá.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/50 text-amber-500 text-xs font-bold">
                                                Đã sở hữu: {unlockedHeritageBadges.length} / {HERITAGE_BADGES.length}
                                            </span>
                                            <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-bold">
                                                {archiveXp.toLocaleString()} / 1.130 XP Củ Chi
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {HERITAGE_BADGES.map((badge) => {
                                            const unlocked = isBadgeEarned(badge)
                                            const pct = badgeProgressPercent(badge)
                                            return (
                                                <div
                                                    key={badge.id}
                                                    onClick={() => setSelectedBadge(badge)}
                                                    className={`p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-4 group ${
                                                        unlocked
                                                            ? 'border-amber-400 bg-gradient-to-br from-amber-500/10 via-transparent to-primary/10 shadow-[0_8px_24px_rgba(253,201,8,0.14)] hover:-translate-y-1'
                                                            : 'border-outline-variant bg-surface-container-high/40 opacity-80 hover:opacity-100'
                                                    }`}
                                                >
                                                    <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border-2 border-amber-400/60 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                                                        <BadgeArtwork
                                                            badgeNumber={badge.badgeNumber}
                                                            alt={badge.name}
                                                            unlocked={unlocked}
                                                            className="group-hover:scale-110"
                                                        />
                                                        {!unlocked && (
                                                            <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center">
                                                                <MaterialIcon name="lock" className="text-white text-2xl drop-shadow" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span
                                                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                                    unlocked
                                                                        ? 'bg-emerald-500 text-white'
                                                                        : 'bg-surface-container-highest text-on-surface-variant'
                                                                }`}
                                                            >
                                                                {unlocked ? '✓ ĐÃ MỞ KHÓA' : badge.rankLabel}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-primary">
                                                                {badgeProgressText(badge)}
                                                            </span>
                                                        </div>

                                                        <h3 className="text-base font-bold text-on-surface truncate">
                                                            {badge.name}
                                                        </h3>

                                                        <p className="text-xs text-on-surface-variant line-clamp-2">
                                                            {badge.requirementText}
                                                        </p>

                                                        <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    unlocked ? 'bg-emerald-500' : 'bg-primary'
                                                                }`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>

                                {/* PHẦN 2: HỘ CHIẾU DI SẢN */}
                                <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
                                    <h2 className="font-title-md mb-sm inline-flex items-center gap-1">
                                        <MaterialIcon name="menu_book" className="text-primary" />
                                        Hộ chiếu Di sản
                                    </h2>
                                    <p className="text-xs text-on-surface-variant mb-sm">
                                        Đóng dấu khi hoàn thành nhiệm vụ hoặc giải mã sử liệu tại mỗi di tích.
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-sm">
                                        {passportStamps.stamped.map(({ location, completedAt }) => (
                                            <Link
                                                key={location.id}
                                                to="/explore"
                                                className="border border-secondary/50 rounded-xl overflow-hidden bg-secondary/5 hover:border-secondary transition-colors"
                                            >
                                                {location.coverImage ? (
                                                    <img src={location.coverImage} alt="" className="h-20 w-full object-cover" />
                                                ) : (
                                                    <div className="h-20 bg-surface-container-high" />
                                                )}
                                                <div className="p-2 text-center">
                                                    <p className="text-xs font-title-sm text-on-surface line-clamp-2">
                                                        {normalizeHeritageName(location.name)}
                                                    </p>
                                                    {completedAt && (
                                                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                                                            {new Date(completedAt).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                        {passportStamps.unstamped
                                            .slice(0, Math.max(0, 8 - passportStamps.stamped.length))
                                            .map((location) => (
                                                <div
                                                    key={location.id}
                                                    className="border border-dashed border-outline-variant rounded-xl p-sm flex flex-col items-center justify-center min-h-[7rem] opacity-50"
                                                >
                                                    <MaterialIcon name="lock" className="text-on-surface-variant mb-1" />
                                                    <p className="text-xs text-on-surface-variant">???</p>
                                                </div>
                                            ))}
                                    </div>
                                </section>

                                {/* PHẦN 3: CÁC HUY HIỆU HỆ THỐNG KHÁC TỪ BACKEND (NẾU CÓ) */}
                                {badges.length > 0 && (
                                    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
                                        <h2 className="font-title-md mb-sm">Huy hiệu sự kiện & cộng đồng</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-sm">
                                            {badges.map((b) => (
                                                <div
                                                    key={b.id}
                                                    className={`border rounded-xl p-sm flex flex-col gap-xs ${
                                                        b.earned
                                                            ? 'border-secondary bg-secondary/5 shadow-[0_0_12px_rgba(68,219,213,0.15)]'
                                                            : 'border-outline-variant opacity-70'
                                                    }`}
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
                                                        <MaterialIcon
                                                            name={b.earned ? 'workspace_premium' : 'lock'}
                                                            className={b.earned ? 'text-secondary' : 'text-on-surface-variant'}
                                                        />
                                                    </div>
                                                    <p className="text-sm">{b.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ========================================================= */}
                {/* MODAL CHI TIẾT HUY HIỆU DANH GIÁ                          */}
                {/* ========================================================= */}
                {selectedBadge && (
                    <div
                        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedBadge(null)}
                    >
                        <div
                            className="bg-white text-[#0F1B33] border-2 border-[#FDC908] rounded-[2.2rem] max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative w-36 h-36 mx-auto rounded-3xl bg-slate-900 border-4 border-[#FDC908] shadow-xl overflow-hidden flex items-center justify-center">
                                <BadgeArtwork
                                    badgeNumber={selectedBadge.badgeNumber}
                                    alt={selectedBadge.name}
                                    unlocked={isBadgeEarned(selectedBadge)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <span
                                    className={`inline-block px-3.5 py-1 rounded-full text-[11px] font-black uppercase ${
                                        isBadgeEarned(selectedBadge)
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[#FFF2C3] text-[#0F1B33] border border-[#FDC908]'
                                    }`}
                                >
                                    {isBadgeEarned(selectedBadge)
                                        ? '✓ ĐÃ CHINH PHỤC HUY HIỆU'
                                        : `TIẾN ĐỘ: ${badgeProgressText(selectedBadge)}`}
                                </span>
                                <h3 className="text-2xl font-black text-[#0F1B33] pt-1">{selectedBadge.name}</h3>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                    {selectedBadge.description}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 text-left space-y-1">
                                <p className="text-[10px] font-black uppercase text-[#0275FB]">Điều kiện mở khóa:</p>
                                <p className="text-xs sm:text-sm font-bold text-[#0F1B33]">{selectedBadge.requirementText}</p>
                            </div>

                            <div className="flex gap-2.5">
                                {!isBadgeEarned(selectedBadge) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedBadge(null)
                                            navigate('/explore')
                                        }}
                                        className="flex-1 py-3.5 rounded-2xl bg-[#FDC908] hover:bg-[#eab308] text-[#0F1B33] font-black text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        Đến Trang Giải Mã
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedBadge(null)}
                                    className="flex-1 py-3.5 rounded-2xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    Đóng Cửa Sổ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </AppLayout>
    )
}
