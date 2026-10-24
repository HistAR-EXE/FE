import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { MembersAndSettingsPanel } from '../features/site-workspace/MembersAndSettingsPanel'
import { ReviewQueue } from '../features/site-workspace/ReviewQueue'
import { SiteProfileDraftEditor } from '../features/site-workspace/SiteProfileDraftEditor'
import { StationDraftEditor } from '../features/site-workspace/StationDraftEditor'
import {
  siteWorkspaceApi,
  workspaceErrorMessage,
  type ContentVersion,
  type SiteMember,
  type SiteMembership,
  type SiteOperationsSummary,
  type SiteRole,
  type StationSummary,
} from '../features/site-workspace/api'

const TABS = [
  ['profile', 'Hồ sơ di tích'],
  ['stations', 'Trạm'],
  ['review', 'Chờ duyệt'],
  ['published', 'Đã phát hành'],
  ['members', 'Thành viên'],
  ['operations', 'Vận hành'],
] as const

type TabId = (typeof TABS)[number][0]

const ROLE_LABEL: Record<SiteRole, string> = {
  SITE_MANAGER: 'Quản lý di tích',
  CONTENT_EDITOR: 'Biên tập viên',
  CONTENT_REVIEWER: 'Người duyệt',
}

type SiteWorkspacePageProps = {
  memberships: SiteMembership[]
}

export function SiteWorkspacePage({ memberships }: SiteWorkspacePageProps) {
  const [siteCode, setSiteCode] = useState(memberships[0]?.siteCode ?? '')
  const membership = memberships.find((item) => item.siteCode === siteCode) ?? memberships[0]
  const [tab, setTab] = useState<TabId>('profile')
  const [role, setRole] = useState<SiteRole>(membership?.role ?? 'CONTENT_EDITOR')
  const [locationName, setLocationName] = useState(membership?.locationName ?? '')
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [stations, setStations] = useState<StationSummary[]>([])
  const [members, setMembers] = useState<SiteMember[]>([])
  const [requiresTripConfirmation, setRequiresTripConfirmation] = useState(membership?.requiresTripConfirmation ?? false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!siteCode) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const canManage = membership?.role === 'SITE_MANAGER'
    Promise.all([
      siteWorkspaceApi.get(siteCode),
      siteWorkspaceApi.listVersions(siteCode),
      siteWorkspaceApi.stations(siteCode),
    ])
      .then(async ([summary, nextVersions, nextStations]) => {
        if (cancelled) return
        const nextMembers = canManage ? await siteWorkspaceApi.members(siteCode) : summary.members ?? []
        if (cancelled) return
        setRole(summary.callerRole ?? membership?.role ?? 'CONTENT_EDITOR')
        setLocationName(summary.locationName ?? membership?.locationName ?? siteCode)
        setRequiresTripConfirmation(summary.requiresTripConfirmation)
        setVersions(nextVersions)
        setStations(nextStations)
        setMembers(nextMembers)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(workspaceErrorMessage(cause))
        setVersions([])
        setStations([])
        setMembers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [siteCode, membership?.role, membership?.locationName])

  const upsertVersion = (version: ContentVersion) => {
    setVersions((current) => {
      const index = current.findIndex((item) => item.id === version.id)
      if (index < 0) return [version, ...current]
      const copy = current.slice()
      copy[index] = version
      return copy
    })
  }

  return (
    <AppLayout>
      <main className="px-4 py-6 md:px-8 md:py-8">
        <header className="mb-5 max-w-5xl">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Quản lý di tích</h1>
          <p className="mt-1 text-sm text-slate-600">
            {locationName ? `${locationName} · ` : ''}
            Vai trò của bạn: {ROLE_LABEL[role]}
          </p>
          <label htmlFor="workspace-site" className="mt-4 block max-w-md text-sm font-semibold text-slate-800">
            Di tích
          </label>
          <select
            id="workspace-site"
            className="mt-1 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            value={siteCode}
            onChange={(event) => setSiteCode(event.target.value)}
          >
              {memberships.map((item) => (
                <option key={item.siteCode} value={item.siteCode}>
                  {item.locationName || item.siteCode}
                </option>
              ))}
            </select>
        </header>
        {error && (
          <p role="alert" className="mb-4 max-w-3xl rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}
        {loading && <p className="text-sm text-slate-600">Đang tải dữ liệu di tích...</p>}
        {!loading && !error && (
          <>
            <div role="tablist" aria-label="Phân hệ quản lý di tích" className="mb-5 flex flex-wrap gap-2">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] ${
                    tab === id ? 'bg-[#FFF2C3] text-[#0F1B33] ring-1 ring-[#FDC908]' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'profile' && (
              <SiteProfileDraftEditor siteCode={siteCode} role={role} versions={versions} onSaved={upsertVersion} />
            )}
            {tab === 'stations' && (
              <StationDraftEditor siteCode={siteCode} role={role} stations={stations} versions={versions} onSaved={upsertVersion} />
            )}
            {tab === 'review' && <ReviewQueue siteCode={siteCode} role={role} versions={versions} onUpdated={upsertVersion} />}
            {tab === 'published' && <PublishedPanel versions={versions} />}
            {tab === 'members' && (
              <MembersAndSettingsPanel
                siteCode={siteCode}
                role={role}
                members={members}
                requiresTripConfirmation={requiresTripConfirmation}
                onMembers={setMembers}
                onTripConfirmation={setRequiresTripConfirmation}
              />
            )}
            {tab === 'operations' && <OperationsPanel siteCode={siteCode} />}
          </>
        )}
      </main>
    </AppLayout>
  )
}

function PublishedPanel({ versions }: { versions: ContentVersion[] }) {
  const published = versions.filter((version) => version.status === 'PUBLISHED')
  if (published.length === 0) return <p className="text-sm text-slate-600">Chưa có bản phát hành.</p>
  return (
    <ul className="max-w-3xl space-y-3">
      {published.map((version) => (
        <li key={version.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">
            {version.contentKind === 'SITE_PROFILE' ? 'Hồ sơ di tích' : `Trạm ${version.resourceKey}`}
          </h2>
          <p className="mt-1 text-sm text-slate-600">Phiên bản {version.version} · Đã phát hành</p>
          {snapshotName(version.snapshotJson) && <p className="mt-2 text-sm text-slate-800">{snapshotName(version.snapshotJson)}</p>}
        </li>
      ))}
    </ul>
  )
}

function OperationsPanel({ siteCode }: { siteCode: string }) {
  const [from, setFrom] = useState(() => formatDateInput(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => formatDateInput(new Date()))
  const [summary, setSummary] = useState<SiteOperationsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    const fromInstant = new Date(`${from}T00:00:00.000Z`).toISOString()
    const toInstant = new Date(`${to}T23:59:59.999Z`).toISOString()
    siteWorkspaceApi
      .operations(siteCode, fromInstant, toInstant)
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setSummary(null)
          setError(workspaceErrorMessage(cause))
        }
      })
    return () => {
      cancelled = true
    }
  }, [siteCode, from, to])

  const visitCount = summary?.visitCount ?? null
  const checkins = summary?.checkinsByStation ?? []
  const questCompletions = summary?.questCompletions ?? null
  const interactions = summary?.contentInteractions ?? {}

  return (
    <section className="max-w-3xl space-y-4" aria-label="Vận hành">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm font-semibold text-slate-800">
          Từ ngày
          <input className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Đến ngày
          <input className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      {summary && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Metric label="Lượt tham quan" value={String(visitCount ?? 0)} />
          <Metric label="Hoàn thành nhiệm vụ" value={String(questCompletions ?? 0)} />
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <dt className="text-sm font-semibold text-slate-600">Check-in theo trạm</dt>
            <dd className="mt-2">
              {checkins.length === 0 && <p className="text-sm text-slate-500">Chưa có check-in.</p>}
              <ul>
                {checkins.map((row) => (
                  <li key={row.stationCode} className="text-lg font-bold text-slate-900">
                    {row.stationCode}: {row.count}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <dt className="text-sm font-semibold text-slate-600">Tương tác nội dung</dt>
            <dd className="mt-2">
              {Object.keys(interactions).length === 0 && <p className="text-sm text-slate-500">Chưa có tương tác.</p>}
              <ul>
                {Object.entries(interactions).map(([key, count]) => (
                  <li key={key} className="text-lg font-bold text-slate-900">
                    {key}: {count}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-black text-slate-900">{value}</dd>
    </div>
  )
}

function snapshotName(snapshotJson: string): string | null {
  try {
    const parsed = JSON.parse(snapshotJson) as { name?: unknown }
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : null
  } catch {
    return null
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
