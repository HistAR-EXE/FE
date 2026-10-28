// src/pages/ProfilePage.tsx
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../shared/auth/useAuth'
import { profileApi, type ProfileMe } from '../features/profile/api'
import { useProfileResource } from '../features/profile/useProfileResource'
import {
    ProfileAvatar,
    ProfileIcon,
    ProfileResourceState,
} from '../features/profile/ProfileUi'
import { ProfileOverviewTab } from '../features/profile/ProfileOverviewTab'
import { ProfileJourneyTab } from '../features/profile/ProfileJourneyTab'
import { ProfileAccessTab } from '../features/profile/ProfileAccessTab'
import { ProfilePersonalTab } from '../features/profile/ProfilePersonalTab'
import { roleLabel } from '../features/profile/profileState'
import '../features/profile/profile.css'

const tabs = [
    'Tổng quan',
    'Hành trình & thành tích',
    'Gói & tổ chức',
    'Thông tin cá nhân',
]

export function ProfilePage() {
    const { user } = useAuth()
    return (
        <AppLayout
            hideTopNav
            mobileTitle="Hồ sơ"
            className="profile-workspace"
        >
            <main className="pf-main">
                {user ? (
                    <ProfileWorkspace key={user.id} userId={user.id} />
                ) : (
                    <div className="pf-card">
                        <h1>Hồ sơ của bạn</h1>
                        <Link to="/login">Đăng nhập để xem hồ sơ</Link>
                    </div>
                )}
            </main>
        </AppLayout>
    )
}

function ProfileWorkspace({ userId }: { userId: string }) {
    const identity = useProfileResource(userId, profileApi.me)
    const overview = useProfileResource(`${userId}:overview`, profileApi.overview)
    const [savedProfile, setSavedProfile] = useState<ProfileMe | null>(null)
    const [tab, setTab] = useState(0)
    const buttons = useRef<Array<HTMLButtonElement | null>>([])

    const onSaved = (profile: ProfileMe) => {
        setSavedProfile(profile)
        void identity.reload().then(() => setSavedProfile(null))
        void overview.reload()
    }

    return (
        <>
            <header className="pf-page-heading">
                <div>
                    <span className="pf-kicker">TIMELENS / KHÔNG GIAN CÁ NHÂN</span>
                    <h1>
                        Hồ sơ của bạn<span>.</span>
                    </h1>
                    <p>Mỗi trải nghiệm, một dấu ấn riêng.</p>
                </div>
                <Link className="pf-button secondary" to="/settings">
                    <ProfileIcon name="settings" /> Cài đặt
                </Link>
            </header>

            <ProfileResourceState resource={identity} label="hồ sơ cá nhân">
                {(loaded) => {
                    const profile = savedProfile || loaded
                    const progress = profile.levelProgressPercent

                    return (
                        <>
                            <section className="pf-hero">
                                <div className="pf-identity">
                                    <ProfileAvatar
                                        name={profile.displayName}
                                        src={profile.avatarUrl}
                                    />
                                    <div>
                                        <div className="pf-pills">
                                            <span className="pf-pill">{roleLabel(profile.role)}</span>
                                            {overview.data && (
                                                <span className="pf-pill blue">
                          {overview.data.profile.tier === 'PREMIUM'
                              ? 'Quyền Premium'
                              : 'Miễn phí'}
                        </span>
                                            )}
                                        </div>
                                        <h2>{profile.displayName}</h2>
                                        <p className="pf-email">{profile.email}</p>
                                        <span
                                            className={`pf-verification ${
                                                profile.emailVerified ? 'verified' : ''
                                            }`}
                                        >
                      <ProfileIcon
                          name={profile.emailVerified ? 'verified' : 'mail'}
                      />
                                            {profile.emailVerified
                                                ? 'Email đã xác thực'
                                                : 'Email chưa xác thực'}
                    </span>
                                    </div>
                                </div>

                                <div className="pf-level">
                                    <span className="pf-kicker">CẤP ĐỘ HÀNH TRÌNH</span>
                                    <strong>
                                        Cấp {profile.level}{' '}
                                        <span>· {profile.levelName || 'Nhà khám phá'}</span>
                                    </strong>
                                    <div className="pf-xp">
                                        {profile.totalPoints.toLocaleString('vi-VN')}{' '}
                                        <span>XP tích lũy</span>
                                    </div>
                                    {typeof progress === 'number' && (
                                        <div
                                            className="pf-meter"
                                            role="progressbar"
                                            aria-label="Tiến độ cấp độ"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.max(0, Math.min(100, progress))}
                                        >
                      <span
                          style={{
                              width: `${Math.max(0, Math.min(100, progress))}%`,
                          }}
                      />
                                        </div>
                                    )}
                                    <small>
                                        {typeof profile.pointsToNextLevel === 'number'
                                            ? profile.pointsToNextLevel > 0
                                                ? `Còn ${profile.pointsToNextLevel.toLocaleString('vi-VN')} XP đến cấp tiếp theo`
                                                : 'Đã đạt mốc cấp độ hiện tại'
                                            : 'XP và cấp độ được tính từ hoạt động đã ghi nhận.'}
                                    </small>
                                </div>
                            </section>

                            <div
                                className="pf-tabs"
                                role="tablist"
                                aria-label="Các phần hồ sơ"
                            >
                                {tabs.map((label, index) => (
                                    <button
                                        type="button"
                                        key={label}
                                        ref={(element) => {
                                            buttons.current[index] = element
                                        }}
                                        role="tab"
                                        id={`profile-tab-${index}`}
                                        aria-selected={tab === index}
                                        aria-controls={`profile-panel-${index}`}
                                        tabIndex={tab === index ? 0 : -1}
                                        onClick={() => setTab(index)}
                                        onKeyDown={(event) => {
                                            const next =
                                                event.key === 'ArrowRight'
                                                    ? (index + 1) % tabs.length
                                                    : event.key === 'ArrowLeft'
                                                        ? (index + tabs.length - 1) % tabs.length
                                                        : event.key === 'Home'
                                                            ? 0
                                                            : event.key === 'End'
                                                                ? tabs.length - 1
                                                                : null
                                            if (next !== null) {
                                                event.preventDefault()
                                                setTab(next)
                                                buttons.current[next]?.focus()
                                            }
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <section
                                role="tabpanel"
                                id={`profile-panel-${tab}`}
                                aria-labelledby={`profile-tab-${tab}`}
                                tabIndex={0}
                            >
                                {tab === 0 && (
                                    <ProfileOverviewTab
                                        userId={userId}
                                        profile={profile}
                                        overview={overview}
                                        onJourney={() => setTab(1)}
                                    />
                                )}
                                {tab === 1 && (
                                    <ProfileJourneyTab userId={userId} overview={overview} />
                                )}
                                {tab === 2 && (
                                    <ProfileAccessTab
                                        userId={userId}
                                        profile={profile}
                                        overview={overview}
                                    />
                                )}
                                {tab === 3 && (
                                    <ProfilePersonalTab
                                        profile={profile}
                                        overview={overview}
                                        onSaved={onSaved}
                                    />
                                )}
                            </section>
                        </>
                    )
                }}
            </ProfileResourceState>
        </>
    )
}