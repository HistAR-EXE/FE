// src/pages/AdminAnalyticsPage.tsx
import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { AdminSubNav } from '../components/admin/AdminSubNav'
import {
    adminApi,
    type AdminAnalyticsOverview,
    type PilotKpi,
    type ReferralStatsItem,
    type SessionReplay,
} from '../features/admin/api'
import { analyticsDemoOverview } from '../features/admin/analyticsDemo'
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
    const [isEmpty, setIsEmpty] = useState(false)
    const [replaySessionId, setReplaySessionId] = useState('')
    const [replay, setReplay] = useState<SessionReplay | null>(null)
    const [replayLoading, setReplayLoading] = useState(false)

    const { showToast } = useToast()
    const [pilotKpi, setPilotKpi] = useState<PilotKpi | null>(null)
    const [referralStats, setReferralStats] = useState<ReferralStatsItem[]>([])

    useEffect(() => {
        adminApi
            .pilotKpi()
            .then(setPilotKpi)
            .catch(() => setPilotKpi(null))
        adminApi
            .referralStats(30)
            .then(setReferralStats)
            .catch(() => setReferralStats([]))
    }, [])

    useEffect(() => {
        setLoading(true)
        setIsEmpty(false)
        setUsingDemo(false)
        adminApi
            .analyticsOverview(CU_CHI_LOCATION_ID)
            .then((overview) => {
                const empty =
                    overview.poiUnlockRates.every((p) => p.unlockCount === 0) &&
                    overview.questFunnel.every((q) => q.started === 0)

                if (empty) {
                    setData(null)
                    setIsEmpty(true)
                } else {
                    setData(overview)
                    setIsEmpty(false)
                }
            })
            .catch((e) => {
                setData(null)
                setIsEmpty(true)
                showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
            })
            .finally(() => setLoading(false))
    }, [showToast])

    const loadDemoPitch = () => {
        setData(analyticsDemoOverview(CU_CHI_LOCATION_ID))
        setUsingDemo(true)
        setIsEmpty(false)
    }

    const loadReplay = async () => {
        const id = replaySessionId.trim()
        if (!id) return
        try {
            setReplayLoading(true)
            setReplay(null)
            const result = await adminApi.sessionReplay(id)
            setReplay(result)
        } catch (e) {
            showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        } finally {
            setReplayLoading(false)
        }
    }

    return (
        <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Thống kê quản trị" />}>
            <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
                <div>
                    <h1 className="font-display-md text-on-surface">Bảng thống kê quản lý di tích</h1>
                    <p className="text-sm text-on-surface-variant mt-1">
                        HistAR SaaS — tỷ lệ mở khóa POI, phễu nhiệm vụ, chuyển đổi trực tuyến → tại chỗ
                    </p>
                </div>

                <AdminSubNav />

                {referralStats.length > 0 && (
                    <section data-testid="referral-stats" className="bg-surface-container border border-outline-variant rounded-xl p-md">
                        <div className="flex items-center justify-between mb-sm">
                            <h2 className="font-title-md text-on-surface">Creator referral (30 ngày)</h2>
                            <span className="text-xs text-on-surface-variant">GET /api/admin/referral/stats</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-on-surface-variant text-xs uppercase">
                                        <th className="py-1 pr-2">Code</th>
                                        <th className="py-1 pr-2">Creator</th>
                                        <th className="py-1 pr-2 tabular-nums">Visits</th>
                                        <th className="py-1 pr-2 tabular-nums">Sessions</th>
                                        <th className="py-1 pr-2 tabular-nums">Users</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referralStats.map((r) => (
                                        <tr key={r.code} className="border-t border-outline-variant/40">
                                            <td className="py-2 pr-2 font-mono text-secondary">/{r.code}</td>
                                            <td className="py-2 pr-2">{r.creatorName}</td>
                                            <td className="py-2 pr-2 tabular-nums">{r.visits}</td>
                                            <td className="py-2 pr-2 tabular-nums">{r.uniqueSessions}</td>
                                            <td className="py-2 pr-2 tabular-nums">{r.uniqueUsers}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {pilotKpi && (
                    <section data-testid="pilot-kpi" className="bg-surface-container border border-outline-variant rounded-xl p-md">
                        <div className="flex items-center justify-between mb-sm">
                            <h2 className="font-title-md text-on-surface">Pilot KPI (7 ngày)</h2>
                            <span className="text-xs text-on-surface-variant">
                                Events §13A thật · siteCode trong payload · GET /api/admin/analytics/pilot-kpi
                            </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mb-sm">
                            Funnel onsite: pack_loaded → checkin_result → video/game/chat → paywall_shown → purchase_success.
                            Báo sai liệu: tab Nội dung → Báo sai liệu.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                            {(
                                [
                                    ['Session bắt đầu', pilotKpi.sessionStart],
                                    ['Session kết thúc', pilotKpi.sessionEnd],
                                    ['Đến trạm', pilotKpi.stationArrived],
                                    ['Hoàn thành trạm', pilotKpi.stationCompleted],
                                    ['Check-in (7 ngày)', pilotKpi.checkinsLast7Days],
                                    ['Kết quả check-in', pilotKpi.checkinResult],
                                    ['Pack đã tải', pilotKpi.packLoaded],
                                    ['Export tạo', pilotKpi.exportCreated],
                                    ['Chia sẻ', pilotKpi.shareInitiated],
                                    ['NPS gửi', pilotKpi.npsSubmitted],
                                    ['Landing visit', pilotKpi.landingVisit],
                                    ['Paywall hiển thị', pilotKpi.paywallShown],
                                    ['Mua thành công', pilotKpi.purchaseSuccess],
                                    ['Portal dùng', pilotKpi.byEventType?.portal_used ?? 0],
                                    ['Video phát', pilotKpi.byEventType?.video_played ?? 0],
                                    ['Audio phát', pilotKpi.byEventType?.audio_played ?? 0],
                                    ['Game xong', pilotKpi.byEventType?.game_completed ?? 0],
                                    ['Chat message', pilotKpi.byEventType?.chat_message ?? 0],
                                    ['Camera mở', pilotKpi.byEventType?.camera_opened ?? 0],
                                    ['Báo sai liệu', pilotKpi.byEventType?.content_report ?? 0],
                                ] as const
                            ).map(([label, value]) => (
                                <div key={label} className="bg-surface-container-high rounded-lg p-sm border border-outline-variant">
                                    <p className="text-[11px] uppercase text-on-surface-variant">{label}</p>
                                    <p className="font-title-md text-on-surface tabular-nums">{value}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {usingDemo && (
                    <p className="text-xs text-amber-600/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-md py-sm">
                        Dữ liệu demo pitch — không phải số liệu production.
                    </p>
                )}

                {loading && <div className="h-48 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />}

                {!loading && isEmpty && !data && (
                    <section className="bg-surface-container border border-dashed border-outline-variant rounded-xl p-lg text-center space-y-md">
                        <MaterialIcon name="insights" className="text-4xl text-on-surface-variant mx-auto" />
                        <h2 className="font-title-md text-on-surface">Chưa có dữ liệu phân tích</h2>
                        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                            Bắt đầu ghi nhận phiên thăm quan (visit_sessions) khi người dùng khám phá POI và check-in onsite.
                        </p>
                        <button
                            type="button"
                            onClick={loadDemoPitch}
                            className="inline-flex px-md py-sm rounded-lg bg-secondary text-on-secondary text-sm font-medium"
                        >
                            Xem demo pitch
                        </button>
                    </section>
                )}

                {data && !loading && (
                    <>
                        <section className="grid md:grid-cols-3 gap-md">
                            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                                <p className="text-xs uppercase text-on-surface-variant">Khám phá trực tuyến</p>
                                <p className="font-display-sm text-primary tabular-nums">{data.onlineToOnsite.usersWithDiscovery}</p>
                            </div>
                            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                                <p className="text-xs uppercase text-on-surface-variant">Check-in tại chỗ</p>
                                <p className="font-display-sm text-secondary tabular-nums">{data.onlineToOnsite.usersWithCheckin}</p>
                            </div>
                            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                                <p className="text-xs uppercase text-on-surface-variant">Trực tuyến → Tại chỗ</p>
                                <p className="font-display-sm text-on-surface tabular-nums">{data.onlineToOnsite.conversionRatePct}%</p>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {data.onlineToOnsite.usersDiscoveryThenCheckin} khách khám phá rồi check-in
                                </p>
                            </div>
                        </section>

                        <section className="grid md:grid-cols-2 gap-md">
                            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                                <p className="text-xs uppercase text-on-surface-variant">Thời lượng phiên trung bình</p>
                                <p className="font-display-sm text-on-surface tabular-nums">
                                    {data.sessionQuality.avgDurationMinutes > 0
                                        ? `${data.sessionQuality.avgDurationMinutes} phút`
                                        : '—'}
                                </p>
                            </div>
                            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
                                <p className="text-xs uppercase text-on-surface-variant">Khám phá / phiên (TB)</p>
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
                                Tỷ lệ mở khóa POI
                            </h2>
                            <p className="text-xs text-on-surface-variant mb-md">
                                Tỷ lệ khám phá POI (unlock) — không phải lượt xem / traffic
                            </p>
                            <BarChart
                                labelKey="Tỷ lệ mở khóa POI"
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
                                Tỷ lệ hoàn thành nhiệm vụ
                            </h2>
                            <p className="text-xs text-on-surface-variant mb-md">
                                Hoàn thành = đủ bước khám phá (nếu có) + GPS check-in tại chỗ — không phải hoàn thành tuần tự từng bước trên UI.
                            </p>
                            {data.questFunnel.length === 0 && (
                                <p className="text-sm text-on-surface-variant">Chưa có nhiệm vụ tại địa điểm.</p>
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
                                Điểm rời bỏ hành trình
                            </h2>
                            {data.journeyDropOff.length === 0 && (
                                <p className="text-sm text-on-surface-variant">Chưa có sự kiện phiên thăm quan.</p>
                            )}
                            {data.journeyDropOff.map((j) => (
                                <div key={j.unlockKey} className="flex justify-between text-sm py-1 border-b border-outline-variant/30 last:border-0">
                                    <span>{j.poiName}</span>
                                    <span className="text-on-surface-variant tabular-nums">{j.sessionCount} lượt · rời {j.dropOffPct}%</span>
                                </div>
                            ))}
                        </section>

                        <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
                            <h2 className="font-title-md text-on-surface mb-md flex items-center gap-2">
                                <MaterialIcon name="map" className="text-secondary" />
                                Bản đồ nhiệt POI (lượt xem vs mở khóa)
                            </h2>
                            <BarChart
                                labelKey="Lượt xem"
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

                        <section className="bg-surface-container border border-dashed border-outline-variant rounded-xl p-md md:p-lg opacity-95">
                            <h2 className="font-title-md text-on-surface mb-1 flex items-center gap-2">
                                <MaterialIcon name="history" className="text-secondary" />
                                Phát lại phiên thăm quan
                            </h2>
                            <p className="text-xs text-on-surface-variant mb-md">
                                Nhập UUID phiên để xem timeline từ visit_sessions (dữ liệu thật khi có bước ghi nhận).
                            </p>
                            <div className="flex flex-wrap gap-sm mb-md">
                                <input
                                    value={replaySessionId}
                                    onChange={(e) => setReplaySessionId(e.target.value)}
                                    placeholder="uuid-phiên-thăm-quan"
                                    className="flex-1 min-w-[12rem] neo-input rounded-lg px-md py-sm text-sm font-mono"
                                />
                                <button
                                    type="button"
                                    disabled={replayLoading || !replaySessionId.trim()}
                                    onClick={() => void loadReplay()}
                                    className="px-md py-sm rounded-lg bg-primary text-on-primary text-sm disabled:opacity-50"
                                >
                                    {replayLoading ? 'Đang tải...' : 'Xem phát lại'}
                                </button>
                            </div>
                            {replay && (
                                <div className="space-y-sm text-sm">
                                    {replay.steps.length > 0 && (
                                        <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-md py-sm">
                                            Dữ liệu phát lại lấy từ visit_sessions — sự kiện thật của phiên thăm quan.
                                        </p>
                                    )}
                                    <p className="text-on-surface-variant">
                                        Chế độ: {replay.mode} · {replay.steps.length} bước
                                        {replay.startedAt && (
                                            <> · bắt đầu {new Date(replay.startedAt).toLocaleString('vi-VN')}</>
                                        )}
                                    </p>
                                    {replay.steps.length === 0 ? (
                                        <p className="text-on-surface-variant">Không có sự kiện trong phiên này.</p>
                                    ) : (
                                        <ol className="space-y-1 border-l-2 border-secondary/40 pl-md">
                                            {replay.steps.map((step, i) => (
                                                <li key={`${step.unlockKey}-${step.at}-${i}`} className="text-on-surface">
                                                    <span className="font-medium">{step.poiName || step.unlockKey}</span>
                                                    <span className="text-on-surface-variant text-xs ml-2">
                            {step.eventType} · {step.source}
                                                        {step.at && ` · ${new Date(step.at).toLocaleTimeString('vi-VN')}`}
                          </span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </AppLayout>
    )
}