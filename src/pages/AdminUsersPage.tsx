import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { adminApi, type AdminUserSummary } from '../features/admin/api'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const load = () => {
    setLoading(true)
    adminApi
      .listUsers()
      .then((page) => setUsers(page.items))
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [showToast])

  const onRoleChange = async (userId: string, role: 'USER' | 'ADMIN') => {
    try {
      await adminApi.updateRole(userId, role)
      showToast({ message: 'Đã cập nhật quyền', type: 'success' })
      load()
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Quản trị người dùng" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-md">
          <h1 className="font-display-lg text-on-surface">Người dùng</h1>
          <div className="flex gap-3 text-sm">
            <Link to="/admin/content" className="text-secondary inline-flex items-center gap-1">
              <MaterialIcon name="inventory_2" className="text-sm" /> Nội dung
            </Link>
            <Link to="/profile" className="text-secondary inline-flex items-center gap-1">
              <MaterialIcon name="arrow_back" className="text-sm" /> Hồ sơ
            </Link>
          </div>
        </div>
        {loading && <p className="text-on-surface-variant text-sm">Đang tải...</p>}
        {!loading && (
          <div className="overflow-x-auto border border-outline-variant rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-high text-on-surface-variant">
                <tr>
                  <th className="text-left p-sm">Email</th>
                  <th className="text-left p-sm">Tên</th>
                  <th className="text-left p-sm">Role</th>
                  <th className="text-left p-sm">XP</th>
                  <th className="text-left p-sm">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-outline-variant/50">
                    <td className="p-sm">{u.email}</td>
                    <td className="p-sm">{u.displayName}</td>
                    <td className="p-sm">
                      <span className="px-2 py-0.5 rounded-full border border-outline-variant text-xs">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-sm">{u.totalPoints}</td>
                    <td className="p-sm">
                      <select
                        className="bg-surface border border-outline-variant rounded px-2 py-1"
                        value={u.role}
                        onChange={(e) => onRoleChange(u.id, e.target.value as 'USER' | 'ADMIN')}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
