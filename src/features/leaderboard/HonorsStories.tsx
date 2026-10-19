// src/features/leaderboard/HonorsStories.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { ExplorerAvatar } from './HonorsPeople'
import { formatXp } from './format'
import type { AchievementSpotlight, JourneyMoment, JourneyPath } from './storiesApi'

// Khai báo component nhưng KHÔNG render gì cả (Dùng _paths để fix lỗi TS6133)
export function NextJourneyStep({ paths: _paths }: { paths: JourneyPath[] }) {
    // Không hiển thị giao diện này theo yêu cầu
    return null;
}

const categoryIcons: Record<string, string> = {
    ciphers: 'key',
    locations: 'explore',
    'challenge-sets': 'flag',
    badges: 'military_tech',
}

export function AchievementSpotlights({ items }: { items: AchievementSpotlight[] }) {
    return (
        <section
            className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(2,117,251,0.07)] space-y-6"
            data-testid="honors-spotlights"
            aria-labelledby="honors-spotlights-title"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#0275FB] flex items-center gap-1.5">
                        <MaterialIcon name="auto_awesome" className="text-base text-[#FDC908]" />
                        <span>Không chỉ một vị trí. Muôn vàn dấu ấn.</span>
                    </p>
                    <h2
                        id="honors-spotlights-title"
                        className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1 tracking-tight"
                    >
                        Muôn cách để tỏa sáng
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((item, i) => {
                    const top = item.leaders[0]?.count
                    const shared =
                        top !== undefined &&
                        item.leaders.filter((person) => person.count === top).length > 1

                    return (
                        <article
                            key={item.id}
                            className="rounded-3xl bg-gradient-to-b from-[#F8FAFC] via-white to-[#F2F7FF]/60 border-2 border-slate-200/90 hover:border-[#0275FB]/50 p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white flex items-center justify-center shadow-md">
                                        <MaterialIcon
                                            name={categoryIcons[item.id] ?? 'auto_awesome'}
                                            className="text-xl text-[#FDC908]"
                                        />
                                    </span>
                                    <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                        0{i + 1}
                                    </span>
                                </div>

                                <h3 className="text-base sm:text-lg font-black text-[#0F1B33] leading-snug">
                                    {item.title}
                                </h3>

                                <details className="group rounded-2xl bg-white border border-slate-200 p-3 text-xs">
                                    <summary className="font-bold text-[#0275FB] cursor-pointer list-none flex items-center justify-between gap-2">
                                        <span>Điều gì làm nên dấu ấn này?</span>
                                        <MaterialIcon
                                            name="expand_more"
                                            className="text-base transition-transform group-open:rotate-180"
                                        />
                                    </summary>
                                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 text-slate-600 font-medium leading-relaxed">
                                        <p>{item.description}</p>
                                        <small className="block text-[11px] font-bold text-slate-400">
                                            Cùng kết quả, cùng hạng. Áp dụng như nhau cho Free và Premium.
                                        </small>
                                    </div>
                                </details>

                                {item.leaders.length ? (
                                    <div className="space-y-2 pt-1">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            {shared ? 'Cùng dẫn đầu' : 'Những dấu ấn tiêu biểu'}
                                        </p>
                                        <ul className="space-y-2">
                                            {item.leaders.map((person) => (
                                                <li
                                                    key={person.userId}
                                                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 ${
                                                        person.currentUser
                                                            ? 'bg-[#FFFBEB] border-[#FDC908]'
                                                            : 'bg-white border-slate-100'
                                                    }`}
                                                >
                                                    <div className="flex flex-1 items-center gap-2.5 min-w-0">
                                                        <ExplorerAvatar
                                                            entry={{
                                                                ...person,
                                                                rank: null,
                                                                totalPoints: 0,
                                                                level: 1,
                                                                badgeCount: 0,
                                                            }}
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <b title={person.displayName} className="text-sm font-black text-[#0F1B33] block break-words leading-relaxed">
                                                                {person.displayName.replace(/ · Mẫu UI$/, '')}
                                                                {person.currentUser && (
                                                                    <small className="ml-1.5 px-1.5 py-0.5 rounded bg-[#0275FB] text-white text-[9px] font-black uppercase">
                                                                        Bạn
                                                                    </small>
                                                                )}
                                                            </b>
                                                            <small className="block text-[10px] font-semibold text-slate-500 mt-0.5">
                                                                {shared && person.count === top ? 'Đồng hạng 1' : `Hạng ${item.leaders.findIndex(leader => leader.count === person.count) + 1}`}
                                                            </small>
                                                            {person.displayName.endsWith(' · Mẫu UI') && (
                                                                <small className="inline-block whitespace-nowrap px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                                                                    Mẫu UI
                                                                </small>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <strong className="text-base font-black text-[#0275FB] shrink-0 text-right">
                                                        {formatXp(person.count)}{' '}
                                                        <small className="block whitespace-nowrap text-[10px] font-bold text-slate-500">
                                                            {item.unit}
                                                        </small>
                                                    </strong>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-1">
                                        <MaterialIcon name="footprint" className="text-xl text-slate-400" />
                                        <p className="text-xs font-medium text-slate-500">
                                            Những dấu ấn đầu tiên đang chờ được ghi nhận.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <footer className="pt-3 border-t border-slate-200/80 space-y-1 text-xs">
                                <span className="block font-semibold text-slate-700 leading-snug">
                                    {item.viewerCount > 0 ? (
                                        <>
                                            <b className="font-black text-[#0275FB]">
                                                Dấu ấn của bạn: {formatXp(item.viewerCount)}
                                            </b>{' '}
                                            {item.unit}
                                            {item.viewerRank !== null && (
                                                <small className="block text-[11px] font-bold text-slate-500 mt-0.5">
                                                    Đồng hành ở hạng #{formatXp(item.viewerRank)} theo tiêu chí này
                                                </small>
                                            )}
                                        </>
                                    ) : (
                                        'Mỗi hành trình đều bắt đầu từ một bước chân.'
                                    )}
                                </span>
                                <small className="block text-[11px] font-bold text-slate-400">
                                    {formatXp(item.totalAchievers)} người đã ghi dấu
                                </small>
                            </footer>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}

export function HonorsTimeline({ moments }: { moments: JourneyMoment[] }) {
    const [expanded, setExpanded] = useState(false)
    const shown = expanded ? moments : moments.slice(0, 3)

    return (
        <section
            className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(2,117,251,0.07)] space-y-5"
            data-testid="honors-timeline"
            aria-labelledby="honors-timeline-title"
        >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#0275FB]">
                        Nhìn lại để bước xa hơn
                    </p>
                    <h2
                        id="honors-timeline-title"
                        className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1 tracking-tight"
                    >
                        Hành trình làm nên bạn
                    </h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFF2C3] border border-[#FDC908] text-[#0F1B33] flex items-center justify-center shrink-0 shadow-sm">
                    <MaterialIcon name="history_edu" className="text-2xl text-[#0275FB]" />
                </div>
            </div>

            <p className="text-xs sm:text-sm font-medium text-slate-600">
                Mỗi cột mốc là một lần bạn đi xa hơn trên hành trình khám phá.
            </p>

            {shown.length ? (
                <>
                    <style>
                        {`
                        /* Thiết kế Scrollbar thanh mảnh, bo tròn và ẩn nút scroll mũi tên */
                        #honors-moments-list::-webkit-scrollbar {
                            width: 6px;
                        }
                        #honors-moments-list::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        #honors-moments-list::-webkit-scrollbar-thumb {
                            background: #E2E8F0; /* Màu xám rất nhạt, tinh tế */
                            border-radius: 20px;
                        }
                        #honors-moments-list::-webkit-scrollbar-thumb:hover {
                            background: #CBD5E1;
                        }
                        /* Ẩn hoàn toàn 2 nút mũi tên lên/xuống ở 2 đầu thanh cuộn (nếu có) */
                        #honors-moments-list::-webkit-scrollbar-button {
                            display: none;
                        }
                        `}
                    </style>
                    <ol
                        className="relative border-l-2 border-[#0275FB]/25 ml-4 pl-6 space-y-5 max-h-[400px] overflow-y-auto pr-3"
                        id="honors-moments-list"
                    >
                        {shown.map((moment) => (
                            <li
                                key={moment.id}
                                className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F4F9FF] to-white border border-[#0275FB]/15 hover:border-[#0275FB]/40 transition-all shadow-sm"
                            >
                                <span
                                    className="absolute -left-[2.35rem] top-5 w-8 h-8 rounded-full bg-[#0275FB] text-white ring-4 ring-white flex items-center justify-center shadow-md"
                                    aria-hidden="true"
                                >
                                    <MaterialIcon
                                        name={
                                            [
                                                'military_tech',
                                                'explore',
                                                'auto_awesome',
                                                'flag',
                                                'verified',
                                                'key',
                                                'layers',
                                                'auto_stories',
                                                'footprint',
                                            ].includes(moment.icon)
                                                ? moment.icon
                                                : 'auto_awesome'
                                        }
                                        className="text-sm text-[#FDC908]"
                                    />
                                </span>

                                <div className="space-y-1.5">
                                    {moment.occurredAt ? (
                                        <time
                                            dateTime={moment.occurredAt}
                                            className="inline-block px-2.5 py-0.5 rounded-full bg-[#FFF2C3] border border-[#FDC908] text-[10px] font-black text-[#0F1B33]"
                                        >
                                            {new Date(moment.occurredAt).toLocaleDateString('vi-VN', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                            })}
                                        </time>
                                    ) : (
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                            Đã đạt · Chưa có ngày ghi nhận
                                        </span>
                                    )}

                                    <h3 className="text-base font-black text-[#0F1B33]">
                                        {moment.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                        {moment.description}
                                    </p>
                                    <Link
                                        to={moment.href}
                                        className="inline-flex items-center gap-1 text-xs font-black text-[#0275FB] hover:underline pt-1"
                                    >
                                        <span>Nhìn lại dấu ấn</span>
                                        <span aria-hidden="true">↗</span>
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ol>
                </>
            ) : (
                <div className="p-8 rounded-3xl bg-[#F8FAFC] border-2 border-dashed border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center mx-auto">
                        <MaterialIcon name="route" className="text-2xl" />
                    </div>
                    <h3 className="text-lg font-black text-[#0F1B33]">
                        Trang đầu tiên đang chờ bạn viết.
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
                        Những cột mốc đã được hệ thống xác nhận sẽ xuất hiện tại đây khi bạn khám phá.
                    </p>
                    <Link
                        to="/explore"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0275FB] text-white text-xs font-black uppercase tracking-wider"
                    >
                        Bắt đầu hành trình
                    </Link>
                </div>
            )}

            {moments.length > 3 && (
                <button
                    className="w-full py-3 rounded-xl border border-[#0275FB]/25 bg-[#F2F7FF] hover:bg-[#EAF3FF] text-xs font-black text-[#0275FB] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls="honors-moments-list"
                    onClick={() => setExpanded((value) => !value)}
                >
                    <span>
                        {expanded
                            ? 'Thu gọn hành trình'
                            : `Xem thêm ${moments.length - 3} dấu ấn`}
                    </span>
                    <MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} className="text-base" />
                </button>
            )}
        </section>
    )
}