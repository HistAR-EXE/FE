import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { groupApi, type GroupSummary } from '../features/group/api'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { MultiplayerLockedModal } from '../components/monetization/MultiplayerLockedModal'
import { getData, httpClient } from '../shared/api/httpClient'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function GroupHubPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [multiplayerAllowed, setMultiplayerAllowed] = useState<boolean | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  const reload = () => {
    groupApi.mine().then(setGroups).catch(() => setGroups([]))
  }

  useEffect(() => {
    getData<boolean>(httpClient.get('/api/groups/multiplayer-access'))
      .then(setMultiplayerAllowed)
      .catch(() => setMultiplayerAllowed(false))
    reload()
  }, [])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) return
    if (multiplayerAllowed === false) {
      setPaywallOpen(true)
      return
    }
    try {
      setLoading(true)
      const created = await groupApi.create(createName.trim())
      showToast({ message: `Đã tạo nhóm — mã: ${created.code}`, type: 'success' })
      setCreateName('')
      reload()
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    if (multiplayerAllowed === false) {
      setPaywallOpen(true)
      return
    }
    try {
      setLoading(true)
      await groupApi.join(joinCode.trim().toUpperCase())
      showToast({ message: 'Đã tham gia nhóm!', type: 'success' })
      setJoinCode('')
      reload()
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Nhóm học tập" backTo="/settings" backLabel="Cài đặt" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-3xl mx-auto w-full space-y-lg">
        <div>
          <h1 className="font-display-md text-on-surface">Nhóm học tập</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Tạo Team-based Quest Room để chia đội, vào bằng mã phòng và theo dõi tiến độ quest theo lớp học.
          </p>
        </div>

        <section className="grid md:grid-cols-2 gap-md">
          <form onSubmit={onCreate} className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
            <h2 className="font-title-md">Tạo nhóm mới</h2>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Tên nhóm / lớp"
              className="w-full neo-input rounded-lg px-md py-sm"
            />
            <Button type="submit" disabled={loading} className="w-full">
              Tạo & nhận mã
            </Button>
          </form>
          <form onSubmit={onJoin} className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
            <h2 className="font-title-md">Tham gia bằng mã</h2>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Mã 6 ký tự"
              maxLength={6}
              className="w-full neo-input rounded-lg px-md py-sm uppercase tracking-widest"
            />
            <Button type="submit" disabled={loading} className="w-full">
              Tham gia
            </Button>
          </form>
        </section>

        <section className="space-y-sm">
          <h2 className="font-title-md">Nhóm của bạn ({groups.length})</h2>
          {groups.length === 0 && (
            <p className="text-sm text-on-surface-variant border border-dashed border-outline-variant rounded-xl p-md text-center">
              Chưa có nhóm nào. Tạo hoặc nhập mã để bắt đầu.
            </p>
          )}
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex flex-wrap items-center gap-sm justify-between bg-surface-container border border-outline-variant rounded-xl p-md"
            >
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-on-surface-variant">
                  Mã: <span className="font-mono tracking-wider text-secondary">{g.code}</span> · {g.memberCount} thành viên
                </p>
              </div>
              <div className="flex gap-sm">
                <Link
                  to={`/leaderboard?groupId=${g.id}`}
                  className="text-sm text-secondary underline inline-flex items-center gap-1"
                >
                  <MaterialIcon name="leaderboard" className="text-base" />
                  BXH nhóm
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(`/groups/${g.id}/progress`)}
                  className="text-sm px-sm py-xs border border-outline-variant rounded-lg hover:border-secondary"
                >
                  Tiến độ
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
      <MultiplayerLockedModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </AppLayout>
  )
}
