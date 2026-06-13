import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import {
  adminApi,
  type AdminArtifact,
  type AdminDiscoveryPoint,
  type AdminQuest,
} from '../features/admin/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'

type Tab = 'discovery' | 'artifacts' | 'quests'

export function AdminContentPage() {
  const [tab, setTab] = useState<Tab>('discovery')
  const [discovery, setDiscovery] = useState<AdminDiscoveryPoint[]>([])
  const [artifacts, setArtifacts] = useState<AdminArtifact[]>([])
  const [quests, setQuests] = useState<AdminQuest[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const load = () => {
    setLoading(true)
    const loc = CU_CHI_LOCATION_ID
    Promise.all([adminApi.listDiscoveryPoints(loc), adminApi.listArtifacts(loc), adminApi.listQuests(loc)])
      .then(([d, a, q]) => {
        setDiscovery(d)
        setArtifacts(a)
        setQuests(q)
      })
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [showToast])

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'discovery', label: 'Điểm khám phá', count: discovery.length },
    { id: 'artifacts', label: 'Hiện vật', count: artifacts.length },
    { id: 'quests', label: 'Nhiệm vụ', count: quests.length },
  ]

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Quản trị nội dung" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-md">
          <h1 className="font-display-lg text-on-surface">Nội dung Củ Chi</h1>
          <div className="flex gap-2 text-sm">
            <Link to="/admin/analytics" className="text-secondary inline-flex items-center gap-1">
              <MaterialIcon name="analytics" className="text-sm" /> Analytics
            </Link>
            <Link to="/admin/users" className="text-secondary inline-flex items-center gap-1">
              <MaterialIcon name="group" className="text-sm" /> Người dùng
            </Link>
            <Link to="/profile" className="text-secondary inline-flex items-center gap-1">
              <MaterialIcon name="arrow_back" className="text-sm" /> Hồ sơ
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-md border-b border-outline-variant">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-md py-sm text-sm border-b-2 -mb-px ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading && <p className="text-on-surface-variant text-sm">Đang tải...</p>}

        {!loading && tab === 'discovery' && (
          <ContentTable
            headers={['Tên', 'unlock_key', 'Vị trí map', 'Thứ tự']}
            rows={discovery.map((p) => [
              p.name,
              p.unlockKey,
              `${p.mapXPct ?? '—'} / ${p.mapYPct ?? '—'}`,
              String(p.sortOrder),
            ])}
          />
        )}

        {!loading && tab === 'artifacts' && (
          <ContentTable
            headers={['Tên', 'unlock_key', 'Độ tin cậy', 'Thứ tự']}
            rows={artifacts.map((a) => [a.name, a.unlockKey, a.reliability ?? '—', String(a.sortOrder)])}
          />
        )}

        {!loading && tab === 'quests' && (
          <ContentTable
            headers={['Tiêu đề', 'Điểm']}
            rows={quests.map((q) => [q.title, String(q.pointsReward)])}
          />
        )}

        <p className="mt-md text-xs text-on-surface-variant">
          Chế độ xem CMS — POST/PATCH qua API admin khi cần chỉnh sửa. Route mới, không ảnh hưởng Explore/Artifacts.
        </p>
      </main>
    </AppLayout>
  )
}

function ContentTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="text-on-surface-variant text-sm">Chưa có dữ liệu.</p>
  }
  return (
    <div className="overflow-x-auto border border-outline-variant rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-surface-container-high text-on-surface-variant">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left p-sm">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-outline-variant/50">
              {row.map((cell, j) => (
                <td key={j} className="p-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
