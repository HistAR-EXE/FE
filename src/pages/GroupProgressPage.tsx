import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { groupApi, type GroupDetail, type GroupProgress } from '../features/group/api'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function GroupProgressPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { showToast } = useToast()
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [progress, setProgress] = useState<GroupProgress | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!groupId) return
    try {
      setLoading(true)
      const [d, p] = await Promise.all([groupApi.detail(groupId), groupApi.progress(groupId)])
      setDetail(d)
      setProgress(p)
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [groupId, showToast])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <AppLayout
      activeBorder="left"
      topNav={<SimpleTopNav title={detail?.name ?? 'Tiến độ nhóm'} backTo="/groups" backLabel="Nhóm" />}
    >
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <h1 className="font-display-md text-on-surface">{detail?.name ?? 'Tiến độ nhóm'}</h1>
            {detail && (
              <p className="text-sm text-on-surface-variant">
                Mã: <span className="font-mono text-secondary">{detail.code}</span> · {detail.members.length} thành viên
              </p>
            )}
          </div>
          <Button type="button" onClick={() => void reload()} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>

        {!progress?.quests.length && !loading && (
          <p className="text-sm text-on-surface-variant border border-dashed border-outline-variant rounded-xl p-md text-center">
            Chưa có tiến độ quest chung. Thành viên hãy bắt đầu quest để xem bảng tiến độ.
          </p>
        )}

        {progress?.quests.map((quest) => (
          <section key={quest.questId} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-md border-b border-outline-variant">
              <h2 className="font-title-md">{quest.questTitle}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-high text-on-surface-variant">
                  <tr>
                    <th className="text-left p-sm">Thành viên</th>
                    <th className="text-left p-sm">Trạng thái</th>
                    <th className="text-left p-sm">Tiến độ</th>
                  </tr>
                </thead>
                <tbody>
                  {quest.members.map((m) => (
                    <tr key={m.userId} className="border-t border-outline-variant/40">
                      <td className="p-sm">{m.displayName}</td>
                      <td className="p-sm capitalize">{m.status.replace('_', ' ')}</td>
                      <td className="p-sm">
                        <div className="flex items-center gap-sm min-w-[8rem]">
                          <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className="h-full bg-secondary"
                              style={{ width: `${m.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-on-surface-variant w-10">{m.progressPercent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <Link to="/groups" className="inline-flex items-center gap-1 text-secondary text-sm">
          <MaterialIcon name="arrow_back" className="text-base" />
          Quay lại danh sách nhóm
        </Link>
      </main>
    </AppLayout>
  )
}
