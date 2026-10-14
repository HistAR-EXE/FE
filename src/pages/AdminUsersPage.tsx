import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminPagination } from '../components/admin/AdminPagination'
import { adminApi, type AdminUserSummary, type PageResponse } from '../features/admin/api'
import { parseAdminListState } from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

type AdminRole = 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN'

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, size } = parseAdminListState(searchParams)
  const [result, setResult] = useState<PageResponse<AdminUserSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { showToast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi
      .listUsers(page, size)
      .then(setResult)
      .catch((cause) => {
        setResult(null)
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => setLoading(false))
  }, [page, size])

  useEffect(() => {
    load()
  }, [load])

  const setPage = (nextPage: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextPage <= 0) next.delete('page')
      else next.set('page', String(nextPage + 1))
      return next
    })
  }

  const onRoleChange = async (user: AdminUserSummary, role: AdminRole) => {
    if (role === user.role) return
    const warning = role === 'ADMIN'
      ? `Promote ${user.email} lên ADMIN? Họ sẽ có quyền quản trị toàn hệ thống.`
      : `Đổi vai trò của ${user.email} từ ${user.role} sang ${role}?`
    if (!window.confirm(warning)) return

    try {
      setUpdatingId(user.id)
      await adminApi.updateRole(user.id, role)
      showToast({ message: 'Đã cập nhật quyền', type: 'success' })
      load()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="w-full max-w-6xl" aria-busy={loading}>
      {loading && <AdminLoading label="Đang tải danh sách người dùng" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && (
        <AdminEmptyState title="Chưa có người dùng" detail="Không có tài khoản nào trong trang hiện tại." />
      )}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {['Email', 'Tên', 'Xác minh', 'Tier', 'Vai trò', 'XP', 'Thao tác'].map((label) => (
                    <th key={label} className="p-3 text-left font-bold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{user.displayName}</td>
                    <td className="p-3">{user.emailVerified === false ? 'Chưa xác minh' : 'Đã xác minh'}</td>
                    <td className="p-3">{user.tier ?? '—'}</td>
                    <td className="p-3"><span className="rounded-full border border-slate-300 px-2 py-1 text-xs">{user.role}</span></td>
                    <td className="p-3 tabular-nums">{user.totalPoints}</td>
                    <td className="p-3">
                      <select
                        aria-label={`Vai trò của ${user.email}`}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                        value={user.role}
                        disabled={updatingId === user.id}
                        onChange={(event) => void onRoleChange(user, event.target.value as AdminRole)}
                      >
                        <option value="USER">USER</option>
                        <option value="ORG_MEMBER">ORG_MEMBER</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPageChange={setPage} />
        </>
      )}
    </section>
  )
}
