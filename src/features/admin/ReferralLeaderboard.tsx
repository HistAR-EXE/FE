import { useCallback, useEffect, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { adminApi, type ReferralStatsItem } from './api'
import { formatSuppressedMetric } from './state'

const RANGE_OPTIONS = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
] as const

function medal(index: number) {
  if (index === 0) return { icon: 'emoji_events', tone: 'text-[#FFD700]' }
  if (index === 1) return { icon: 'emoji_events', tone: 'text-[#C0C0C0]' }
  if (index === 2) return { icon: 'emoji_events', tone: 'text-[#CD7F32]' }
  return null
}

export function ReferralLeaderboard() {
  const [items, setItems] = useState<ReferralStatsItem[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await adminApi.referralStats(days))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = [...items]
    .filter((r) => !r.suppressed)
    .sort((a, b) => (b.uniqueUsers ?? 0) - (a.uniqueUsers ?? 0))

  const totalVisits = sorted.reduce((s, r) => s + (r.visits ?? 0), 0)
  const totalUsers = sorted.reduce((s, r) => s + (r.uniqueUsers ?? 0), 0)

  return (
    <section className="space-y-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="leaderboard" className="text-[20px] text-primary" />
          <h2 className="font-headline-md text-headline-md text-on-surface">Referral Leaderboard</h2>
        </div>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`rounded-lg px-3 py-1.5 font-headline-sm text-headline-sm transition-colors ${
                days === opt.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 shadow-sm">
          <MaterialIcon name="confirmation_number" className="text-[24px] text-primary" />
          <div>
            <span className="font-headline-md text-headline-md text-on-surface">{sorted.length}</span>
            <span className="ml-1 font-body-sm text-body-sm text-outline">mã giới thiệu</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 shadow-sm">
          <MaterialIcon name="visibility" className="text-[24px] text-secondary" />
          <div>
            <span className="font-headline-md text-headline-md text-on-surface">{totalVisits.toLocaleString('vi-VN')}</span>
            <span className="ml-1 font-body-sm text-body-sm text-outline">lượt truy cập</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 shadow-sm">
          <MaterialIcon name="person_add" className="text-[24px] text-tertiary" />
          <div>
            <span className="font-headline-md text-headline-md text-on-surface">{totalUsers.toLocaleString('vi-VN')}</span>
            <span className="ml-1 font-body-sm text-body-sm text-outline">người dùng mới</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-body-md text-body-md text-outline">Đang tải...</span>
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center font-body-md text-body-md text-outline">Chưa có dữ liệu referral.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-container-low shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container-high font-label-sm text-label-sm uppercase text-outline">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Creator</th>
                <th className="hidden sm:table-cell px-4 py-3">Mã</th>
                <th className="hidden sm:table-cell px-4 py-3 text-center">Trạng thái</th>
                <th className="hidden md:table-cell px-4 py-3 text-right">Lượt truy cập</th>
                <th className="px-4 py-3 text-right">Người dùng mới</th>
                <th className="px-4 py-3 text-right">Tỷ lệ chuyển đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/50">
              {sorted.map((item, index) => {
                const rank = medal(index)
                const visits = item.visits ?? 0
                const users = item.uniqueUsers ?? 0
                const convRate = visits > 0 ? ((users / visits) * 100).toFixed(1) : '—'
                return (
                  <tr key={item.code} className="hover:bg-surface-container-high/30">
                    <td className="px-4 py-3">
                      {rank ? (
                        <MaterialIcon name={rank.icon} className={`text-[20px] ${rank.tone}`} />
                      ) : (
                        <span className="font-code-sm text-code-sm text-outline">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-headline-sm text-headline-sm text-on-surface">{item.creatorName}</td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-code-sm text-primary">
                        {item.code}
                      </code>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      {item.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 font-code-sm text-code-sm text-secondary">
                          <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-error/15 px-2 py-0.5 font-code-sm text-code-sm text-error">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-code-sm text-code-sm text-on-surface">
                      {formatSuppressedMetric(visits, item.suppressed)}
                    </td>
                    <td className="px-4 py-3 text-right font-code-sm text-code-sm text-on-surface">
                      {formatSuppressedMetric(users, item.suppressed)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-headline-sm text-headline-sm ${
                        convRate !== '—' && Number(convRate) >= 30 ? 'text-secondary' : 'text-outline'
                      }`}>
                        {convRate}{convRate !== '—' ? '%' : ''}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
