// src/features/leaderboard/HonorsPeople.tsx
import { useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { HonorsEntry } from './api'
import { formatXp } from './format'

export function ExplorerAvatar({
                                   entry,
                                   large = false,
                               }: {
    entry: HonorsEntry
    large?: boolean
}) {
    const [failed, setFailed] = useState(false)
    const initials =
        entry.displayName
            .replace(/ · Mẫu UI$/, '')
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map((s) => s[0])
            .join('')
            .toLocaleUpperCase('vi') || 'TL'

    const palette = [
        ['#e7efff', '#0275FB'],
        ['#e4f6ee', '#0f766e'],
        ['#fff0dc', '#b45309'],
        ['#f1eaff', '#6d28d9'],
        ['#e0f4fa', '#0369a1'],
    ]
    const color =
        palette[
        [...entry.userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        palette.length
            ]
    const golden = entry.currentUser || (large && entry.rank === 1)
    const safeUrl =
        entry.avatarUrl &&
        (/^https?:\/\//i.test(entry.avatarUrl) || entry.avatarUrl.startsWith('/'))

    return (
        <span
            style={{
                backgroundColor: golden ? '#FFF2C3' : color[0],
                color: golden ? '#92400e' : color[1],
            }}
            className={`inline-flex items-center justify-center rounded-full font-black select-none overflow-hidden shrink-0 transition-transform duration-300 ${
                large
                    ? 'w-20 h-20 sm:w-24 sm:h-24 text-xl sm:text-2xl ring-4 ring-white shadow-lg'
                    : 'w-11 h-11 text-xs sm:text-sm ring-2 ring-white shadow-sm'
            } ${entry.currentUser ? 'ring-[#FDC908]' : ''}`}
        >
            {safeUrl && !failed ? (
                <img
                    src={entry.avatarUrl!}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                initials
            )}
        </span>
    )
}

function ExplorerName({ entry }: { entry: HonorsEntry }) {
    const sample = entry.displayName.endsWith(' · Mẫu UI')
    return (
        <>
            <span>
                {sample
                    ? entry.displayName.slice(0, -' · Mẫu UI'.length)
                    : entry.displayName}
            </span>
            {sample && (
                <span className="ml-1.5 inline-block px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[10px] font-black uppercase text-amber-900 align-middle">
                    Mẫu UI
                </span>
            )}
        </>
    )
}

export function HonorsPodium({ entries }: { entries: HonorsEntry[] }) {
    const winners = entries.slice(0, 3)
    const shared = (rank: number | null) =>
        winners.filter((e) => e.rank === rank).length > 1

    return (
        <div
            className={`grid grid-cols-1 ${
                winners.length === 1
                    ? 'max-w-md mx-auto'
                    : 'md:grid-cols-3'
            } gap-5 items-stretch pt-2`}
            data-testid="honors-podium"
        >
            {winners.map((entry) => {
                const isFirst = entry.rank === 1
                const isSecond = entry.rank === 2
                const cardStyle = isFirst
                    ? 'bg-gradient-to-b from-[#FFFBEB] via-white to-[#FFF2C3]/60 border-2 border-[#FDC908] shadow-[0_18px_40px_rgba(253,201,8,0.22)] md:-translate-y-2'
                    : isSecond
                        ? 'bg-gradient-to-b from-[#F2F7FF] via-white to-[#EAF3FF]/70 border-2 border-[#0275FB]/30 shadow-[0_12px_30px_rgba(2,117,251,0.1)]'
                        : 'bg-gradient-to-b from-orange-50/70 via-white to-amber-50/50 border-2 border-amber-300/70 shadow-[0_12px_30px_rgba(217,119,6,0.08)]'

                const stepBadgeStyle = isFirst
                    ? 'bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] text-[#0F1B33] border border-[#FDC908] shadow-sm'
                    : isSecond
                        ? 'bg-gradient-to-r from-[#0275FB] to-[#015CC8] text-white'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'

                return (
                    <article
                        key={entry.userId}
                        className={`relative rounded-[2rem] p-6 flex flex-col items-center text-center justify-between transition-all duration-300 hover:-translate-y-1.5 ${cardStyle}`}
                    >
                        {/* Vương miện / Huy chương đỉnh thẻ */}
                        <div className="w-full flex items-center justify-between mb-2">
                            <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${stepBadgeStyle}`}
                            >
                                <MaterialIcon name="military_tech" className="text-sm" />
                                <span>
                                    {shared(entry.rank)
                                        ? `Đồng hạng ${entry.rank}`
                                        : `Hạng ${entry.rank}`}
                                </span>
                            </span>

                            <div className="h-8 flex items-center justify-center" aria-hidden="true">
                                {isFirst ? (
                                    <span className="w-9 h-9 rounded-xl bg-[#FDC908] text-[#0F1B33] flex items-center justify-center shadow-[0_0_15px_rgba(253,201,8,0.7)]">
                                        <MaterialIcon name="workspace_premium" className="text-xl" />
                                    </span>
                                ) : (
                                    <span className="text-xs font-black text-slate-400">
                                        TOP {entry.rank}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Avatar trung tâm có hào quang */}
                        <div className="relative my-3 flex items-center justify-center">
                            {isFirst && (
                                <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#FDC908]/60 to-[#0275FB]/30 blur-lg animate-pulse pointer-events-none" />
                            )}
                            <div
                                className={`relative p-1 rounded-full ${
                                    isFirst
                                        ? 'bg-gradient-to-tr from-[#FDC908] via-amber-300 to-[#0275FB]'
                                        : 'bg-gradient-to-tr from-[#0275FB]/40 to-slate-200'
                                }`}
                            >
                                <ExplorerAvatar
                                    key={`${entry.userId}:${entry.avatarUrl}`}
                                    entry={entry}
                                    large
                                />
                            </div>
                        </div>

                        {/* Tên & Điểm số XP */}
                        <div className="w-full space-y-1.5 mt-1">
                            <h3
                                title={entry.displayName}
                                className="text-base sm:text-lg font-black text-[#0F1B33] line-clamp-1"
                            >
                                <ExplorerName entry={entry} />
                                {entry.currentUser && (
                                    <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full bg-[#0275FB] text-white text-[10px] font-black uppercase align-middle">
                                        Bạn
                                    </span>
                                )}
                            </h3>

                            <p className="text-2xl sm:text-3xl font-black text-[#0275FB] tracking-tight">
                                {formatXp(entry.totalPoints)}{' '}
                                <span className="text-xs font-black uppercase text-[#0F1B33]">
                                    XP
                                </span>
                            </p>

                            <small className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 text-xs font-bold text-slate-600">
                                <span>Cấp {entry.level}</span>
                                <span>·</span>
                                <span>{entry.badgeCount} huy hiệu</span>
                            </small>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}

export function HonorsTable({
                                entries,
                                label,
                            }: {
    entries: HonorsEntry[]
    label: string
}) {
    return (
        <div className="overflow-x-auto rounded-2xl border-2 border-[#0275FB]/15 bg-white shadow-sm">
            <table className="w-full text-left border-collapse" aria-label={label}>
                <thead>
                <tr className="bg-gradient-to-r from-[#F2F7FF] via-[#EAF3FF] to-[#FFFBEB] border-b-2 border-[#0275FB]/15 text-[11px] font-black uppercase tracking-wider text-[#0275FB]">
                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-24">
                        Hạng
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                        Nhà thám hiểm
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">
                        Tổng XP
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                    <tr
                        key={entry.userId}
                        className={`transition-colors ${
                            entry.currentUser
                                ? 'bg-gradient-to-r from-[#FFFBEB] via-[#FFF2C3]/40 to-[#EAF3FF]/60 font-bold'
                                : 'hover:bg-[#F4F9FF]'
                        }`}
                    >
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                                <span
                                    className={`inline-flex items-center justify-center min-w-[2.25rem] px-2.5 py-1 rounded-xl text-xs font-black ${
                                        entry.currentUser
                                            ? 'bg-[#FDC908] text-[#0F1B33] shadow-sm'
                                            : 'bg-[#F2F7FF] text-[#0275FB] border border-[#0275FB]/15'
                                    }`}
                                >
                                    {entry.rank ? `#${entry.rank}` : '—'}
                                </span>
                        </td>

                        <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3.5">
                                <ExplorerAvatar
                                    key={`${entry.userId}:${entry.avatarUrl}`}
                                    entry={entry}
                                />
                                <div className="min-w-0">
                                    <b className="text-sm sm:text-base font-black text-[#0F1B33] block truncate">
                                        <ExplorerName entry={entry} />
                                        {entry.currentUser && (
                                            <span className="ml-2 inline-block px-2.5 py-0.5 rounded-full bg-[#0275FB] text-white text-[10px] font-black uppercase align-middle shadow-sm">
                                                    Bạn
                                                </span>
                                        )}
                                    </b>
                                    <small className="text-xs font-semibold text-slate-500 block mt-0.5">
                                        Cấp {entry.level} · {entry.badgeCount} huy hiệu
                                    </small>
                                </div>
                            </div>
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                                <span className="inline-flex items-baseline gap-1 px-3 py-1.5 rounded-xl bg-[#F2F7FF] border border-[#0275FB]/15 text-sm sm:text-base font-black text-[#0275FB]">
                                    {formatXp(entry.totalPoints)}
                                    <span className="text-[10px] font-black uppercase text-[#0F1B33]">
                                        XP
                                    </span>
                                </span>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
