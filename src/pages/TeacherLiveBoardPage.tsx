import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { orgApi, type LiveBoardRally, type LiveBoardSnapshot, type OrgMembership } from '../features/org/api'
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
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const [membershipsLoaded, setMembershipsLoaded] = useState(false)
  const [orgId, setOrgId] = useState('')
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
    orgApi
      .mine()
      .then((items) => {
        const teacherOrgs = items.filter((m) => m.orgRole?.toLowerCase() === 'teacher')
        const usable = teacherOrgs.length ? teacherOrgs : items
        setMemberships(usable)
        if (usable[0]) setOrgId(usable[0].organizationId)
      })
      .catch(() => showToast({ message: 'Không tải được tổ chức.', type: 'error' }))
      .finally(() => setMembershipsLoaded(true))
  }, [showToast])

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
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Live Board" backTo="/teacher" />}>
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
              Rally
            </Button>
          </div>
        </div>

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

        {membershipsLoaded && !orgId && (
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

        <Link to="/teacher" className="text-sm text-secondary underline">
          ← Về Teacher Dashboard
        </Link>
      </main>
    </AppLayout>
  )
}
