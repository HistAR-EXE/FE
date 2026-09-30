import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { squadApi, squadWebSocketUrl, type SquadMe } from '../features/squad/api'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

const POLL_MS = 8000

export function SquadLobbyPage() {
  const { showToast } = useToast()
  const [squad, setSquad] = useState<SquadMe | null>(null)
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [wsStatus, setWsStatus] = useState<'off' | 'connecting' | 'live'>('off')
  const wsRef = useRef<WebSocket | null>(null)

  const refreshMe = useCallback(async () => {
    try {
      const me = await squadApi.me()
      setSquad(me)
      return me
    } catch {
      setSquad(null)
      return null
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  useEffect(() => {
    if (!squad?.id) {
      setWsStatus('off')
      wsRef.current?.close()
      wsRef.current = null
      return
    }
    const url = squadWebSocketUrl(squad.id)
    if (!url) {
      setWsStatus('off')
      return
    }
    setWsStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => {
      setWsStatus('live')
      ws.send(JSON.stringify({ type: 'join' }))
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string
          members?: SquadMe['members']
          userId?: string
          stationCode?: string | null
          progressPercent?: number | null
          progressLabel?: string | null
        }
        if (msg.type === 'snapshot' && Array.isArray(msg.members)) {
          setSquad((prev) =>
            prev
              ? {
                  ...prev,
                  members: msg.members!.map((m) => ({
                    userId: m.userId,
                    displayName: m.displayName ?? 'Thành viên',
                    avatarUrl: m.avatarUrl ?? null,
                    joinedAt: m.joinedAt ?? prev.createdAt,
                    stationCode: m.stationCode ?? null,
                    progressPercent: m.progressPercent ?? null,
                    progressLabel: m.progressLabel ?? null,
                  })),
                }
              : prev,
          )
        } else if (msg.type === 'member_update' && msg.userId) {
          setSquad((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              members: prev.members.map((m) =>
                m.userId === msg.userId
                  ? {
                      ...m,
                      stationCode: msg.stationCode ?? m.stationCode,
                      progressPercent: msg.progressPercent ?? m.progressPercent,
                      progressLabel: msg.progressLabel ?? m.progressLabel,
                    }
                  : m,
              ),
            }
          })
        }
      } catch {
        // ignore malformed frames
      }
    }
    ws.onclose = () => setWsStatus('off')
    ws.onerror = () => setWsStatus('off')
    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [squad?.id])

  useEffect(() => {
    if (!squad?.id) return
    const id = window.setInterval(() => {
      void refreshMe()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [squad?.id, refreshMe])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const created = await squadApi.create(siteCode.trim() || undefined)
      showToast({ message: `Tiểu đội ${created.code} — chia sẻ mã cho bạn bè`, type: 'success' })
      await refreshMe()
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      showToast({ message: 'Mã tiểu đội gồm 6 ký tự', type: 'error' })
      return
    }
    try {
      setLoading(true)
      await squadApi.join(code)
      showToast({ message: 'Đã vào tiểu đội!', type: 'success' })
      setJoinCode('')
      await refreshMe()
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <SimpleTopNav title="Tiểu đội" backTo="/home" />
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          Tạo hoặc tham gia tiểu đội tại di tích — đồng bộ trạm và tiến độ (WebSocket + poll). Plan B: nếu mất mạng, chia sẻ mã phòng / mã manh mối bằng tay giữa các thành viên.
        </p>

        {!squad ? (
          <div className="flex flex-col gap-4">
            <form onSubmit={onCreate} className="rounded-xl border border-[var(--color-border)] p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <MaterialIcon name="groups" /> Tạo tiểu đội
              </h2>
              <label className="mb-2 block text-sm">Mã điểm (tuỳ chọn)</label>
              <input
                className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                placeholder="vd. cu-chi"
              />
              <Button type="submit" disabled={loading}>
                Tạo mã 6 ký tự
              </Button>
            </form>

            <form onSubmit={onJoin} className="rounded-xl border border-[var(--color-border)] p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <MaterialIcon name="login" /> Tham gia
              </h2>
              <input
                className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 uppercase tracking-widest"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="Mã 6 ký tự"
              />
              <Button type="submit" variant="outline" disabled={loading}>
                Vào tiểu đội
              </Button>
            </form>
          </div>
        ) : (
          <section className="rounded-xl border border-[var(--color-border)] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Mã tiểu đội</p>
                <p className="text-2xl font-bold tracking-[0.2em]">{squad.code}</p>
                {squad.siteCode ? (
                  <p className="text-sm text-[var(--color-text-muted)]">Điểm: {squad.siteCode}</p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  wsStatus === 'live'
                    ? 'bg-emerald-500/15 text-emerald-700'
                    : 'bg-amber-500/15 text-amber-800'
                }`}
              >
                {wsStatus === 'live' ? 'Live WS' : wsStatus === 'connecting' ? 'Đang kết nối…' : 'Poll REST'}
              </span>
            </div>
            <h3 className="mb-2 text-sm font-semibold">Thành viên & trạm</h3>
            <ul className="flex flex-col gap-2">
              {squad.members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
                >
                  <span>{m.displayName}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {m.stationCode ? `Trạm ${m.stationCode}` : '—'}
                    {m.progressPercent != null ? ` · ${m.progressPercent}%` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </AppLayout>
  )
}
