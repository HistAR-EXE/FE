import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { adminApi, type AdminAnalyticsOverview } from '../features/admin/api'
import { analyticsDemoOverview, useDemoAnalytics } from '../features/admin/analyticsDemo'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'

function BarChart({ items, labelKey }: { items: { label: string; value: number; pct: number }[]; labelKey: string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-on-surface-variant truncate pr-2">{item.label}</span>
            <span className="text-on-surface tabular-nums shrink-0">{item.value}</span>
          </div>
          <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              title={`${labelKey}: ${item.pct}%`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null)
  const [usingDemo, setUsingDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    setLoading(true)
    adminApi
      .analyticsOverview(CU_CHI_LOCATION_ID)
      .then((overview) => {
        const empty =
          overview.poiUnlockRates.every((p) => p.unlockCount === 0) &&
          overview.questFunnel.every((q) => q.started === 0)
        if (useDemoAnalytics(empty)) {
          setData(analyticsDemoOverview(CU_CHI_LOCATION_ID))
          setUsingDemo(true)
        } else {
          setData(overview)
          setUsingDemo(false)
        }
      })
      .catch((e) => {
        setData(analyticsDemoOverview(CU_CHI_LOCATION_ID))
        setUsingDemo(true)
        showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [showToast])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Analytics B2B" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <h1 className="font-display-md text-on-surface">Dashboard ban quản lý di tích</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              HistAR SaaS — POI Unlock Rate, Quest funnel, Online → Onsite
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/content" className="text-sm text-secondary underline">
              CMS nội dung
            </Link>
            <Link to="/admin/users" className="text-sm text-secondary underline">
              Users
            </Link>
            <Link to="/admin/organizations" className="text-sm text-secondary underline">
              Organizations
            </Link>
          </div>
        </div>

        {usingDemo && (
          <p className="text-xs text-amber-600/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-md py-sm">
            Dữ liệu demo — bật traffic thật hoặc tắt VITE_ANALYTICS_DEMO để xem DB live.
          </p>
        )}

        {loading && <div className="h-48 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />}

        {data && !loading && (
          <>
            <section className="grid md:grid-cols-3 gap-md">
              <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                <p className="text-xs uppercase text-on-surface-variant">Online discovery</p>
                <p className="font-display-sm text-primary tabular-nums">{data.onlineToOnsite.usersWithDiscovery}</p>
              </div>
              <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                <p className="text-xs uppercase text-on-surface-variant">Onsite check-in</p>
                <p className="font-display-sm text-secondary tabular-nums">{data.onlineToOnsite.usersWithCheckin}</p>
              </div>
              <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                <p className="text-xs uppercase text-on-surface-variant">Online → Onsite</p>
                <p className="font-display-sm text-on-surface tabular-nums">{data.onlineToOnsite.conversionRatePct}%</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {data.onlineToOnsite.usersDiscoveryThenCheckin} khách discovery rồi check-in
                </p>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-md">
              <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                <p className="text-xs uppercase text-on-surface-variant">Average Session Duration</p>
                <p className="font-display-sm text-on-surface tabular-nums">
                  {data.sessionQuality.avgDurationMinutes > 0
                    ? `${data.sessionQuality.avgDurationMinutes}m`
                    : '—'}
                </p>
              </div>
              <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                <p className="text-xs uppercase text-on-surface-variant">Average Discoveries / Session</p>
                <p className="font-display-sm text-on-surface tabular-nums">
                  {data.sessionQuality.avgDiscoveriesPerSession > 0
                    ? data.sessionQuality.avgDiscoveriesPerSession
                    : '—'}
                </p>
              </div>
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
              <h2 className="font-title-md text-on-surface mb-1 flex items-center gap-2">
                <MaterialIcon name="place" className="text-secondary" />
                POI Unlock Rate
              </h2>
              <p className="text-xs text-on-surface-variant mb-md">
                Tỷ lệ khám phá POI (unlock) — không phải lượt xem / traffic
              </p>
              <BarChart
                labelKey="POI Unlock Rate"
                items={data.poiUnlockRates.map((p) => ({
                  label: p.name,
                  value: p.unlockCount,
                  pct: p.unlockRatePct,
                }))}
              />
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
              <h2 className="font-title-md text-on-surface mb-1 flex items-center gap-2">
                <MaterialIcon name="assignment" className="text-secondary" />
                Quest Completion Rate (Check-in-based MVP)
              </h2>
              <p className="text-xs text-on-surface-variant mb-md">
                Completed = đủ discovery steps (nếu có) + GPS check-in onsite — không phải hoàn thành tuần tự từng bước trên UI.
              </p>
              {data.questFunnel.length === 0 && (
                <p className="text-sm text-on-surface-variant">Chưa có quest tại địa điểm.</p>
              )}
              {data.questFunnel.map((q) => (
                <div key={q.questId} className="border-t border-outline-variant/50 pt-md mt-md first:border-0 first:pt-0 first:mt-0">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{q.title}</span>
                    <span className="text-on-surface-variant tabular-nums">
                      {q.completed}/{q.started} hoàn thành ({q.completionRatePct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, q.completionRatePct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
              <h2 className="font-title-md text-on-surface mb-md flex items-center gap-2">
                <MaterialIcon name="route" className="text-secondary" />
                Journey drop-off
              </h2>
              {data.journeyDropOff.length === 0 && (
                <p className="text-sm text-on-surface-variant">Chưa có session events.</p>
              )}
              {data.journeyDropOff.map((j) => (
                <div key={j.unlockKey} className="flex justify-between text-sm py-1 border-b border-outline-variant/30 last:border-0">
                  <span>{j.poiName}</span>
                  <span className="text-on-surface-variant tabular-nums">{j.sessionCount} visits · drop {j.dropOffPct}%</span>
                </div>
              ))}
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
              <h2 className="font-title-md text-on-surface mb-md flex items-center gap-2">
                <MaterialIcon name="map" className="text-secondary" />
                POI Heatmap (visit vs unlock)
              </h2>
              <BarChart
                labelKey="Visit count"
                items={data.poiHeatmap.map((p) => ({
                  label: p.dropOffHotspot ? `${p.name} ⚠` : p.name,
                  value: p.visitCount,
                  pct: p.unlockCount,
                }))}
              />
            </section>

            <section className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-md">
              <p className="text-sm text-on-surface-variant">{data.journeyNote}</p>
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}
