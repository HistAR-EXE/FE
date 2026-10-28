// src/features/profile/ProfileJourneyTab.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { profileApi, type ProfileOverview } from './api'
import { ProfileIcon, ProfileImage, ProfileResourceState } from './ProfileUi'
import { profileDate, stampsForLocation } from './profileState'
import { useProfileResource, type ProfileResource } from './useProfileResource'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { discoveriesApi } from '../gamification/api'
import { collectionApi } from '../collection/api'
import { exploreApi } from '../explore/api'
import { HERITAGE_BADGES, type HeritageBadge } from '../explore/heritageBadges'

export function ProfileJourneyTab({
                                      userId,
                                      overview,
                                  }: {
    userId: string
    overview: ProfileResource<ProfileOverview>
}) {
    const [selectedLocation, setSelectedLocation] = useState(CU_CHI_LOCATION_ID)
    const [onlySelectedStamps, setOnlySelectedStamps] = useState(false)
    const [selectedBadge, setSelectedBadge] = useState<HeritageBadge | null>(null)
    const dialog = useRef<HTMLDialogElement>(null)

    const locationId = overview.data?.locations.some(
        (location) => location.id === selectedLocation,
    )
        ? selectedLocation
        : overview.data?.locations[0]?.id || selectedLocation

    const location = overview.data?.locations.find(
        (item) => item.id === locationId,
    )

    const loadDiscovery = useCallback(
        () => discoveriesApi.summary(locationId),
        [locationId],
    )
    const loadArtifacts = useCallback(
        () => collectionApi.mine(locationId),
        [locationId],
    )
    const loadQuests = useCallback(
        () => profileApi.questsAtLocation(locationId),
        [locationId],
    )

    const discovery = useProfileResource(
        `${userId}:${locationId}:discovery`,
        loadDiscovery,
    )
    const artifacts = useProfileResource(
        `${userId}:${locationId}:artifacts`,
        loadArtifacts,
    )
    const quests = useProfileResource(
        `${userId}:${locationId}:quests`,
        loadQuests,
    )
    const badges = useProfileResource(
        locationId === CU_CHI_LOCATION_ID ? `${userId}:cu-chi-badges` : null,
        exploreApi.readSnapshot,
    )

    useEffect(() => {
        if (selectedBadge && !dialog.current?.open) dialog.current?.showModal()
    }, [selectedBadge])

    const closeBadge = () => {
        dialog.current?.close()
        setSelectedBadge(null)
    }

    const badgeState = selectedBadge
        ? badges.data?.badges.find((item) => item.id === selectedBadge.id)
        : null

    return (
        <div className="pf-tab-content">
            <div className="pf-section-heading">
                <div>
                    <span className="pf-kicker">ĐI QUA DI SẢN, GIỮ LẠI DẤU ẤN</span>
                    <h2>Hành trình &amp; thành tích</h2>
                    <p>
                        Chọn một di tích để xem tiến độ riêng. Dấu hộ chiếu và huy hiệu hệ
                        thống được hiển thị tách biệt.
                    </p>
                </div>
            </div>

            <ProfileResourceState
                resource={overview}
                label="danh mục di tích và hộ chiếu"
            >
                {(data) => (
                    <>
                        <section className="pf-site-picker">
                            <label htmlFor="profile-site">Di tích đang xem</label>
                            <select
                                id="profile-site"
                                value={locationId}
                                onChange={(event) => setSelectedLocation(event.target.value)}
                            >
                                {data.locations.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                            <span>Phạm vi: {location?.name || 'Chưa có tên di tích'}</span>
                        </section>

                        <section className="pf-card">
                            <div className="pf-section-heading">
                                <div>
                                    <h2>Tiến độ tại {location?.name || 'di tích đang chọn'}</h2>
                                    <p>Số lượng dưới đây chỉ thuộc di tích này.</p>
                                </div>
                                <Link
                                    className="pf-text-button"
                                    to={`/quests?locationId=${encodeURIComponent(locationId)}`}
                                >
                                    Xem nhiệm vụ ↗
                                </Link>
                            </div>

                            <div className="pf-columns">
                                <div className="pf-progress-block">
                                    <h3>
                                        <ProfileIcon name="travel_explore" /> Điểm khám phá
                                    </h3>
                                    <ProfileResourceState
                                        resource={discovery}
                                        label="tiến độ khám phá"
                                    >
                                        {(summary) => {
                                            const pct = summary.total
                                                ? Math.min(
                                                    100,
                                                    Math.round(
                                                        (summary.discovered / summary.total) * 100,
                                                    ),
                                                )
                                                : 0
                                            return (
                                                <>
                                                    <strong>
                                                        {summary.discovered} / {summary.total}
                                                    </strong>
                                                    <div
                                                        className="pf-meter"
                                                        role="progressbar"
                                                        aria-label="Tiến độ khám phá tại di tích"
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={pct}
                                                    >
                            <span
                                style={{
                                    width: `${
                                        summary.total
                                            ? Math.min(
                                                100,
                                                (summary.discovered / summary.total) *
                                                100,
                                            )
                                            : 0
                                    }%`,
                                }}
                            />
                                                    </div>
                                                    <p>Điểm nội dung đã được hệ thống ghi nhận.</p>
                                                </>
                                            )
                                        }}
                                    </ProfileResourceState>
                                </div>

                                <div className="pf-progress-block">
                                    <h3>
                                        <ProfileIcon name="deployed_code" /> Bộ sưu tập cổ vật
                                    </h3>
                                    <ProfileResourceState
                                        resource={artifacts}
                                        label="bộ sưu tập cổ vật"
                                    >
                                        {(collection) => {
                                            const pct = collection.total
                                                ? Math.min(
                                                    100,
                                                    Math.round(
                                                        (collection.collected / collection.total) * 100,
                                                    ),
                                                )
                                                : 0
                                            return (
                                                <>
                                                    <strong>
                                                        {collection.collected} / {collection.total}
                                                    </strong>
                                                    <div
                                                        className="pf-meter gold"
                                                        role="progressbar"
                                                        aria-label="Tiến độ bộ sưu tập cổ vật"
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={pct}
                                                    >
                            <span
                                style={{
                                    width: `${
                                        collection.total
                                            ? Math.min(
                                                100,
                                                (collection.collected /
                                                    collection.total) *
                                                100,
                                            )
                                            : 0
                                    }%`,
                                }}
                            />
                                                    </div>
                                                    <p>Cổ vật đã mở trong bộ sưu tập tại di tích.</p>
                                                </>
                                            )
                                        }}
                                    </ProfileResourceState>
                                </div>
                            </div>
                        </section>

                        <section className="pf-card">
                            <div className="pf-card-heading">
                                <ProfileIcon name="task_alt" />
                                <h2>Nhiệm vụ đã tham gia tại di tích</h2>
                            </div>
                            <ProfileResourceState resource={quests} label="tiến độ nhiệm vụ">
                                {(items) =>
                                    items.length ? (
                                        <ul className="pf-quest-list">
                                            {items.map((quest) => (
                                                <li key={quest.questId}>
                                                    <div>
                                                        <strong>{quest.title}</strong>
                                                        <small>
                                                            {quest.status.toLowerCase() === 'completed'
                                                                ? `Hoàn thành · ${profileDate(quest.completedAt)}`
                                                                : 'Đang thực hiện'}
                                                        </small>
                                                    </div>
                                                    <span
                                                        className={`pf-pill ${
                                                            quest.status.toLowerCase() === 'completed'
                                                                ? 'green'
                                                                : ''
                                                        }`}
                                                    >
                            {quest.status.toLowerCase() === 'completed'
                                ? 'Đã hoàn thành'
                                : 'Đang tiến hành'}
                          </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="pf-empty compact">
                                            <p>Chưa tham gia nhiệm vụ tại di tích này.</p>
                                        </div>
                                    )
                                }
                            </ProfileResourceState>
                        </section>

                        <section className="pf-card">
                            <div className="pf-section-heading">
                                <div>
                                    <span className="pf-kicker">HỘ CHIẾU DI SẢN</span>
                                    <h2>Những dấu mốc đã ghi nhận</h2>
                                    <p>
                                        Mốc thời gian lấy từ dữ liệu hộ chiếu. Khám phá trực tuyến
                                        và xác thực QR tại di tích được phân biệt rõ.
                                    </p>
                                </div>
                                <label className="pf-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={onlySelectedStamps}
                                        onChange={(event) =>
                                            setOnlySelectedStamps(event.target.checked)
                                        }
                                    />{' '}
                                    Chỉ di tích đang chọn
                                </label>
                            </div>
                            {stampsForLocation(
                                data.passportStamps,
                                onlySelectedStamps ? locationId : '',
                            ).length ? (
                                <div className="pf-stamps">
                                    {stampsForLocation(
                                        data.passportStamps,
                                        onlySelectedStamps ? locationId : '',
                                    ).map((stamp) => (
                                        <article key={stamp.locationId} className="pf-stamp">
                                            <ProfileImage
                                                src={stamp.coverImage}
                                                alt={stamp.locationName}
                                            />
                                            <div>
                                                <ProfileIcon name="approval" />
                                                <h3>{stamp.locationName}</h3>
                                                <p>Mốc ghi nhận hộ chiếu</p>
                                                <strong>{profileDate(stamp.completedAt, true)}</strong>
                                                <span
                                                    className={`pf-pill ${
                                                        stamp.arVerified ? 'green' : ''
                                                    }`}
                                                >
                          {stamp.arVerified
                              ? 'Đã xác thực QR tại di tích'
                              : 'Chưa có xác thực QR tại di tích'}
                        </span>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="pf-empty">
                                    <ProfileIcon name="menu_book" />
                                    <h3>Chưa có dấu hộ chiếu trong phạm vi này</h3>
                                    <p>
                                        Hoàn thành trải nghiệm phù hợp để hệ thống ghi nhận dấu mốc.
                                    </p>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </ProfileResourceState>

            <section className="pf-card">
                <div className="pf-section-heading">
                    <div>
                        <span className="pf-kicker">BỘ SƯU TẬP RIÊNG THEO DI TÍCH</span>
                        <h2>Huy hiệu giải mã Củ Chi</h2>
                        <p>
                            Điều kiện và tiến độ lấy từ hệ thống; đây không phải tổng huy hiệu
                            toàn tài khoản.
                        </p>
                    </div>
                </div>
                {locationId === CU_CHI_LOCATION_ID ? (
                    <ProfileResourceState resource={badges} label="huy hiệu Củ Chi">
                        {(snapshot) => (
                            <>
                                <p className="pf-badge-count">
                                    Đã đạt{' '}
                                    {
                                        HERITAGE_BADGES.filter((badge) =>
                                            snapshot.badges.some(
                                                (state) => state.id === badge.id && state.earned,
                                            ),
                                        ).length
                                    }{' '}
                                    / {HERITAGE_BADGES.length} huy hiệu Củ Chi
                                </p>
                                <div className="pf-badges">
                                    {HERITAGE_BADGES.map((badge) => {
                                        const state = snapshot.badges.find(
                                            (item) => item.id === badge.id,
                                        )
                                        return (
                                            <button
                                                key={badge.id}
                                                type="button"
                                                className={`pf-badge ${state?.earned ? 'earned' : ''}`}
                                                onClick={() => setSelectedBadge(badge)}
                                            >
                                                <ProfileImage src={badge.image} alt={badge.name} />
                                                <strong>{badge.name}</strong>
                                                <span>
                          {state?.earned
                              ? 'Đã chinh phục'
                              : state?.progressText || 'Chưa có dữ liệu tiến độ'}
                        </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </ProfileResourceState>
                ) : (
                    <div className="pf-empty compact">
                        <p>
                            Bộ huy hiệu này chỉ dành cho Củ Chi. Chọn Địa đạo Củ Chi ở trên để
                            xem; chưa có bộ huy hiệu riêng được công bố cho di tích đang chọn.
                        </p>
                    </div>
                )}
            </section>

            <SystemBadges userId={userId} />

            <dialog
                className="pf-badge-dialog"
                ref={dialog}
                onClose={() => setSelectedBadge(null)}
                onClick={(event) => {
                    if (event.target === event.currentTarget) closeBadge()
                }}
                aria-labelledby="profile-badge-title"
            >
                {selectedBadge && (
                    <>
                        <button
                            type="button"
                            className="pf-dialog-close"
                            aria-label="Đóng chi tiết huy hiệu"
                            onClick={closeBadge}
                        >
                            <ProfileIcon name="close" />
                        </button>
                        <ProfileImage src={selectedBadge.image} alt={selectedBadge.name} />
                        <span className={`pf-pill ${badgeState?.earned ? 'green' : ''}`}>
              {badgeState?.earned
                  ? 'Đã chinh phục'
                  : badgeState?.progressText || 'Chưa có dữ liệu'}
            </span>
                        <h2 id="profile-badge-title">{selectedBadge.name}</h2>
                        <p>{selectedBadge.description}</p>
                        <div className="pf-notice">
                            <p>{selectedBadge.requirementText}</p>
                        </div>
                        {badgeState?.earnedAt && (
                            <p>Ghi nhận {profileDate(badgeState.earnedAt, true)}</p>
                        )}
                        <button className="pf-button" type="button" onClick={closeBadge}>
                            Đóng
                        </button>
                    </>
                )}
            </dialog>
        </div>
    )
}

function SystemBadges({ userId }: { userId: string }) {
    const badges = useProfileResource(
        `${userId}:system-badges`,
        profileApi.myBadges,
    )
    return (
        <section className="pf-card">
            <div className="pf-card-heading">
                <ProfileIcon name="military_tech" />
                <h2>Huy hiệu sự kiện &amp; cộng đồng</h2>
            </div>
            <ProfileResourceState resource={badges} label="huy hiệu hệ thống">
                {(items) =>
                    items.length ? (
                        <ul className="pf-system-badges">
                            {items.map((badge) => (
                                <li key={badge.id}>
                                    <ProfileIcon name={badge.earned ? 'verified' : 'lock'} />
                                    <strong>{badge.name}</strong>
                                    <span>{badge.earned ? 'Đã đạt' : 'Chưa đạt'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="pf-empty compact">
                            <p>Chưa có huy hiệu sự kiện hoặc cộng đồng được cung cấp.</p>
                        </div>
                    )
                }
            </ProfileResourceState>
        </section>
    )
}