// src/features/leaderboard/CommunityFootprint.tsx
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { CommunityFootprint as CommunityData } from './extrasApi'
import { formatXp } from './format'

export function CommunityFootprint({
                                       data,
                                       loading,
                                       onRetry,
                                       group,
                                   }: {
    data: CommunityData | null
    loading: boolean
    onRetry: () => void
    group: boolean
}) {
    const metrics = data
        ? [
            {
                key: 'explorers',
                value: data.explorers,
                label: 'Nhà thám hiểm có dấu ấn',
                icon: 'groups',
                accent: 'bg-[#0275FB] text-white',
                cardBg: 'from-[#F2F7FF] to-white border-[#0275FB]/20',
                definition:
                    'Tài khoản có XP, khám phá hoặc huy hiệu được ghi nhận.',
            },
            {
                key: 'challenges',
                value: data.completedChallenges,
                label: 'Thử thách Củ Chi hoàn thành',
                icon: 'flag',
                accent: 'bg-[#FDC908] text-[#0F1B33]',
                cardBg: 'from-[#FFFBEB] to-white border-[#FDC908]/60',
                definition:
                    'Mỗi thử thách hợp lệ tại Củ Chi được tính một lần cho mỗi người.',
            },
            {
                key: 'discoveries',
                value: data.discoveries,
                label: 'Kết nối người · di sản',
                icon: 'explore',
                accent: 'bg-emerald-500 text-white',
                cardBg: 'from-emerald-50/70 to-white border-emerald-200',
                definition:
                    'Mỗi người tại một địa điểm có khám phá được ghi nhận được tính một lần; không phải số lần đến thực địa.',
            },
            {
                key: 'badges',
                value: data.badges,
                label: 'Huy hiệu được trao',
                icon: 'military_tech',
                accent: 'bg-[#0F1B33] text-[#FDC908]',
                cardBg: 'from-[#F8FAFC] to-white border-slate-200',
                definition:
                    'Mỗi loại huy hiệu đã trao được tính một lần cho mỗi người.',
            },
        ]
        : []

    return (
        <section
            className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between space-y-6"
            data-testid={
                data
                    ? 'honors-community'
                    : loading
                        ? 'honors-community-loading'
                        : 'honors-community-error'
            }
            aria-labelledby="honors-community-title"
        >
            <div className="space-y-6">
                {/* Header Dấu ấn cộng đồng */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0275FB] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#FDC908]" />
                            <span>
                                {group
                                    ? 'Dấu ấn chung của nhóm'
                                    : 'Dấu ấn chung của cộng đồng'}
                            </span>
                        </span>
                        <h2
                            id="honors-community-title"
                            className="text-2xl sm:text-3xl font-black text-[#0F1B33] mt-1 tracking-tight"
                        >
                            Di sản được tiếp nối.
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                            Mỗi người một bước chân. Cùng nhau tiếp nối di sản.
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF2C3] border border-[#FDC908] text-[#0F1B33] flex items-center justify-center shrink-0 shadow-xs">
                        <MaterialIcon name="public" className="text-2xl text-[#0275FB]" />
                    </div>
                </div>

                {/* Lưới 4 chỉ số cộng đồng */}
                {data ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {metrics.map((metric) => (
                            <article
                                key={metric.key}
                                className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${metric.cardBg} border-2 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-all`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`w-10 h-10 rounded-xl ${metric.accent} flex items-center justify-center shadow-sm shrink-0`}
                                        >
                                            <MaterialIcon
                                                name={metric.icon}
                                                className="text-xl"
                                            />
                                        </span>
                                        <b className="text-2xl sm:text-3xl font-black text-[#0F1B33] tracking-tight">
                                            {formatXp(metric.value)}
                                        </b>
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-black text-[#0F1B33] leading-snug pt-1">
                                        {metric.label}
                                    </h3>
                                </div>

                                <details className="group rounded-xl bg-white/90 border border-slate-200/80 p-2.5 text-[11px]">
                                    <summary className="font-bold text-[#0275FB] cursor-pointer list-none flex items-center justify-between gap-1">
                                        <span>Cách ghi nhận</span>
                                        <MaterialIcon
                                            name="expand_more"
                                            className="text-sm transition-transform group-open:rotate-180"
                                        />
                                    </summary>
                                    <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-600 font-medium leading-relaxed">
                                        {metric.definition}
                                    </p>
                                </details>
                            </article>
                        ))}
                    </div>
                ) : loading ? (
                    <p
                        role="status"
                        className="text-sm font-bold text-[#0275FB] animate-pulse py-6 text-center"
                    >
                        Đang kết nối những bước chân cộng đồng…
                    </p>
                ) : (
                    <div className="p-5 rounded-2xl bg-amber-50 border border-[#FDC908] space-y-3">
                        <p className="text-xs sm:text-sm font-medium text-[#0F1B33] leading-relaxed">
                            Chưa tải được số liệu cộng đồng. Thành tích cá nhân của bạn vẫn được giữ nguyên.
                        </p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="px-4 py-2 rounded-xl bg-white border border-[#0275FB]/30 text-xs font-black text-[#0275FB] hover:bg-[#EAF3FF] cursor-pointer transition-colors"
                        >
                            Tải lại dấu ấn cộng đồng
                        </button>
                    </div>
                )}
            </div>

            {data && (
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 bg-[#F8FAFC] border border-slate-200/80 p-4 rounded-2xl leading-relaxed">
                    Số liệu toàn hành trình {group ? 'trong nhóm' : 'trong cộng đồng'}, không tính tài khoản quản trị và hồ sơ mẫu.{' '}
                    {data.explorers === 0
                        ? 'Những dấu ấn đầu tiên đang chờ được viết.'
                        : 'Mỗi thành tích được ghi nhận góp thêm một phần vào hành trình chung.'}
                    <br />
                    <time
                        dateTime={data.updatedAt}
                        className="inline-block text-[#0275FB] font-black mt-1"
                    >
                        Cập nhật lúc{' '}
                        {new Date(data.updatedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </time>
                </p>
            )}
        </section>
    )
}