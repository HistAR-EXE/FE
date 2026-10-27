import { useTeacherWorkspace } from '../features/org/teacher-workspace-context'
import { teacherSnapshotCsv } from '../features/org/teacherWorkspaceState'
import type { OrgReportSnapshot } from '../features/org/api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { fieldTripApi } from '../features/field-trips/api'
import type { FieldTripResponse } from '../features/field-trips/types'
import { orgApi, type LiveBoardRally, type LiveBoardSnapshot } from '../features/org/api'
import { ApiError } from '../shared/api/contracts'
import { appEnv } from '../shared/config/env'
import { getToken } from '../shared/auth/session'
import { useToast } from '../shared/ui/toast/useToast'

type ConnectionMode = 'connecting' | 'stream' | 'poll'

const POLL_MS = 5000
const STREAM_RETRY_MS = 30000

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * Minimal SSE reader over fetch (native EventSource cannot send the Authorization header).
 * Resolves when the stream ends; throws on non-2xx / network errors.
 */
async function readSse(
  url: string,
  token: string | null,
  signal: AbortSignal,
  onOpen: () => void,
  onEvent: (event: string, data: string) => void,
) {
  const res = await fetch(url, {
    headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`)
  onOpen()
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (data.length) onEvent(event, data.join('\n'))
    }
  }
}

export function TeacherLiveBoardPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { capabilities, orgId, setOrgId, memberships } = useTeacherWorkspace()
  const [reports, setReports] = useState<OrgReportSnapshot[]>([])
  const [reportError, setReportError] = useState('')
  const [capturing, setCapturing] = useState(false)

  const [trips, setTrips] = useState<FieldTripResponse[]>([])


  const [snapshot, setSnapshot] = useState<LiveBoardSnapshot | null>(null)
  const [mode, setMode] = useState<ConnectionMode>('connecting')
  const [rallying, setRallying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lastRallyAt, setLastRallyAt] = useState<string | null>(null)
  const lastRallySeen = useRef<string | null>(null)

  const applyRally = useCallback(
    (at: string | null, notify: boolean) => {
      if (!at) return
      setLastRallyAt(at)
      if (notify && lastRallySeen.current && lastRallySeen.current !== at) {
        showToast({ message: `Đã phát lệnh tập trung lúc ${formatTime(at)}`, type: 'success' })
      }
      lastRallySeen.current = at
    },
    [showToast],
  )

  useEffect(() => {
    if (!capabilities?.fieldTrips) return
    let cancelled = false
    fieldTripApi.listMine()
      .then((items) => {
        if (!cancelled) setTrips(items)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [capabilities?.fieldTrips])

  // Realtime: SSE via fetch; falls back to 5s polling and periodically retries the stream.
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    let pollTimer: number | undefined
    let retryTimer: number | undefined
    let controller: AbortController | null = null

    lastRallySeen.current = null
    setSnapshot(null)
    setLastRallyAt(null)
    setMode('connecting')

    const accept = (next: LiveBoardSnapshot) => {
      if (cancelled) return
      setSnapshot(next)
      applyRally(next.lastRallyAt, true)
    }

    const stopPolling = () => {
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer)
        pollTimer = undefined
      }
    }

    const startPolling = () => {
      if (cancelled) return
      setMode('poll')
      if (pollTimer === undefined) {
        const tick = () => orgApi.liveBoard(orgId).then(accept).catch(() => undefined)
        void tick()
        pollTimer = window.setInterval(tick, POLL_MS)
      }
      if (retryTimer === undefined) {
        retryTimer = window.setTimeout(() => {
          retryTimer = undefined
          void startStream()
        }, STREAM_RETRY_MS)
      }
    }

    const startStream = async () => {
      if (cancelled) return
      controller = new AbortController()
      const url = `${appEnv.apiUrl || ''}/api/org/${orgId}/live-board/stream`
      try {
        await readSse(
          url,
          getToken(),
          controller.signal,
          () => {
            stopPolling()
            if (!cancelled) setMode('stream')
          },
          (event, data) => {
            try {
              if (event === 'snapshot') accept(JSON.parse(data) as LiveBoardSnapshot)
              else if (event === 'gather') {
                const rally = JSON.parse(data) as LiveBoardRally
                applyRally(rally.rallyAt, true)
              }
            } catch {
              /* ignore malformed frame */
            }
          },
        )
      } catch {
        /* falls through to polling */
      }
      if (!cancelled) startPolling()
    }

    void startStream()

    return () => {
      cancelled = true
      controller?.abort()
      stopPolling()
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [orgId, applyRally])

  useEffect(() => {
    if (!orgId || !capabilities?.reports) return
    let cancelled = false
    orgApi.reportSnapshots(orgId).then(items => { if (!cancelled) setReports(items) })
      .catch(() => { if (!cancelled) setReportError('Chưa tải được lịch sử report snapshot.') })
    return () => { cancelled = true }
  }, [orgId, capabilities?.reports])

  const captureReport = async () => {
    setCapturing(true); setReportError('')
    try { const next = await orgApi.captureReportSnapshot(orgId); setReports(items => [next, ...items]); showToast({ message: 'Đã lưu bản chụp báo cáo tại thời điểm hiện tại.', type: 'success' }) }
    catch { setReportError('Không lưu được report snapshot. Vui lòng thử lại.') }
    finally { setCapturing(false) }
  }
  const downloadSnapshot = (report: OrgReportSnapshot) => {
    const blob = new Blob([teacherSnapshotCsv(report.snapshot.rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `histar-report-${report.id}.csv`; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const onRally = async () => {
    if (!orgId) return
    try {
      setRallying(true)
      const res = await orgApi.liveBoardRally(orgId)
      lastRallySeen.current = res.rallyAt
      setLastRallyAt(res.rallyAt)
      showToast({ message: 'Đã phát lệnh tập trung (gather).', type: 'success' })
    } catch (err) {
      showToast({ message: err instanceof ApiError ? err.message : 'Không thể phát lệnh tập trung.', type: 'error' })
    } finally {
      setRallying(false)
    }
  }

  const onExport = async () => {
    if (!orgId) return
    try {
      setExporting(true)
      const blob = await orgApi.liveBoardCsv(orgId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'histar-live-board.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast({ message: err instanceof ApiError ? err.message : 'Xuất CSV thất bại.', type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const modeLabel =
    mode === 'stream' ? 'Realtime (SSE)' : mode === 'poll' ? 'Polling 5s (dự phòng)' : 'Đang kết nối…'

  return (
    <>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-4xl mx-auto w-full space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <h1 className="font-display-md text-on-surface">Live Board</h1>
            <p className="text-sm text-on-surface-variant">
              Tiến độ check-in trạm của học sinh trong 24 giờ qua.{' '}
              <span className={mode === 'stream' ? 'text-secondary' : 'text-on-surface-variant'}>{modeLabel}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void onExport()} disabled={!orgId || exporting}>
              <MaterialIcon name="download" className="text-base mr-1" />
              Xuất CSV
            </Button>
            <Button type="button" onClick={() => void onRally()} disabled={!orgId || rallying}>
              <MaterialIcon name="campaign" className="text-base mr-1" />
              Tập trung lớp
            </Button>
          </div>
        </div>

        <label className="flex items-center gap-sm text-sm" htmlFor="teacher-live-trip">
          Chuyến đi
          <select
            id="teacher-live-trip"
            aria-label="Chuyến đi"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) navigate(`/teacher/trips/${event.target.value}/live`)
            }}
            className="bg-surface-container border border-outline-variant rounded-full px-md py-xs"
          >
            <option value="">Chọn chuyến</option>
            {trips.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        {memberships.length > 1 && (
          <label className="flex items-center gap-sm text-sm">
            Tổ chức
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-full px-md py-xs"
            >
              {memberships.map((m) => (
                <option key={m.organizationId} value={m.organizationId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {lastRallyAt && (
          <div className="bg-surface-container border border-outline-variant rounded-xl px-md py-sm text-sm">
            Lệnh tập trung gần nhất: <strong>{formatTime(lastRallyAt)}</strong>
          </div>
        )}

        {!orgId && (
          <p className="text-sm text-on-surface-variant">Bạn chưa thuộc tổ chức nào.</p>
        )}

        {orgId && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-md overflow-x-auto">
            <div className="flex justify-between text-xs text-on-surface-variant mb-sm">
              <span>
                Đang hoạt động: {snapshot?.activeMembers ?? 0}/{snapshot?.memberCount ?? 0}
              </span>
              <span>Cập nhật: {formatTime(snapshot?.generatedAt)}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                  <th className="py-2 pr-2">Học sinh</th>
                  <th className="py-2 pr-2 text-right">Trạm hoàn thành</th>
                  <th className="py-2 pr-2 text-right">Điểm</th>
                  <th className="py-2 pr-2">Trạm cuối</th>
                  <th className="py-2">Hoạt động cuối</th>
                </tr>
              </thead>
              <tbody>
                {!snapshot ? (
                  <tr>
                    <td colSpan={5} className="py-md text-on-surface-variant">
                      Đang tải…
                    </td>
                  </tr>
                ) : snapshot.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-md text-on-surface-variant">
                      Chưa có học sinh trong tổ chức.
                    </td>
                  </tr>
                ) : (
                  snapshot.rows.map((row) => (
                    <tr key={row.userId} className="border-b border-outline-variant/40">
                      <td className="py-2 pr-2">
                        <div>{row.displayName}</div>
                        <div className="text-xs text-on-surface-variant">{row.email}</div>
                      </td>
                      <td className="py-2 pr-2 text-right font-mono">{row.stationsCompleted}</td>
                      <td className="py-2 pr-2 text-right font-mono">{row.score}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{row.lastStationCode ?? '—'}</td>
                      <td className="py-2 text-xs">{formatTime(row.lastActivityAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {capabilities?.reports && <section className="tw-card">
          <div className="tw-section-row"><div><span className="tw-eyebrow">LƯU LẠI MỖI CỘT MỐC</span><h2>Report snapshot</h2><p>Bản chụp giữ nguyên số liệu tại lúc lưu, để đối chiếu tiến độ lớp học sau này.</p></div><button className="tw-button" disabled={capturing || !orgId} onClick={() => void captureReport()}>{capturing ? 'Đang lưu…' : 'Lưu snapshot hiện tại'}</button></div>
          {reportError && <p className="tw-note error" role="alert">{reportError}</p>}
          {reports.length === 0 ? <p className="tw-note">Chưa có bản chụp báo cáo. Bấm Lưu snapshot để ghi nhận cột mốc đầu tiên.</p> : <ul className="tw-invites">{reports.map(report => <li key={report.id}><div><strong>{new Date(report.createdAt).toLocaleString('vi-VN')}</strong><small>{report.snapshot.memberCount} thành viên · {report.snapshot.activeMembers} đang hoạt động · {report.snapshot.rows.length} dòng dữ liệu</small></div><button className="tw-button secondary" onClick={() => downloadSnapshot(report)}>Tải CSV</button></li>)}</ul>}
        </section>}
        <Link to="/teacher" className="text-sm text-secondary underline">
          ← Về Teacher Dashboard
        </Link>
      </main>
    </>
  )
}
