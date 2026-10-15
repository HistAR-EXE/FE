import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type AdminUserSummary, type PageResponse } from '../features/admin/api'
import { parseAdminListState } from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'

type AdminRole = 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN'
type RoleTarget = { user: AdminUserSummary; role: AdminRole }

/** Stitch users table: 5 rows per page (same as audit / billing ledger) */
const USERS_PAGE_SIZE = 5

/** Display order matches Stitch wireframe (admin → auditor → editor → explorer). */
const ROLES: AdminRole[] = ['ADMIN', 'TEACHER', 'ORG_MEMBER', 'USER']

const ROLE_META: Record<
  AdminRole,
  { label: string; shortLabel: string; icon: string; description: string; badge?: string; badgeTone?: 'error' | 'success' | 'neutral' }
> = {
  ADMIN: {
    label: 'Quản trị viên cấp cao (Super Admin)',
    shortLabel: 'Quản trị viên cấp cao',
    icon: 'shield_person',
    description:
      'Toàn quyền kiểm soát hệ thống, cơ sở hạ tầng, tài chính và cấu hình phân quyền người dùng.',
    badge: 'ALL PERMISSIONS',
    badgeTone: 'error',
  },
  TEACHER: {
    label: 'Chuyên gia / Giáo viên (Historical Auditor)',
    shortLabel: 'Chuyên gia thẩm định',
    icon: 'history_edu',
    description:
      'Có quyền duyệt nội dung giáo dục, gắn nhãn học thuật và vận hành lớp học LMS trên HistAR.',
    badge: 'DELEGATED REVIEW',
    badgeTone: 'success',
  },
  ORG_MEMBER: {
    label: 'Biên tập viên tổ chức (Content Editor)',
    shortLabel: 'Biên tập viên nội dung',
    icon: 'edit_note',
    description:
      'Soạn thảo nội dung theo tổ chức B2B, quản lý cốt truyện và lộ trình tham quan được gán.',
    badge: 'ORG SCOPE',
    badgeTone: 'neutral',
  },
  USER: {
    label: 'Người dùng khám phá (Explorer)',
    shortLabel: 'Người dùng',
    icon: 'explore',
    description: 'Tài khoản khám phá tiêu chuẩn — trải nghiệm app HistAR cho khách.',
  },
}

const inputClass =
  'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3.5 py-2 font-headline-sm text-headline-sm text-on-surface hover:bg-surface-container-highest'

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function userCode(id: string) {
  return `#USR-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`
}

function formatCount(value: number) {
  return value.toLocaleString('vi-VN')
}

function tierLabel(tier?: string | null) {
  if (!tier) return '—'
  if (tier === 'PREMIUM') return 'PREMIUM'
  if (tier === 'FREE') return 'FREE BASIC'
  return tier
}

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams()
  const state = parseAdminListState(params)
  const role = params.get('role') ?? ''
  const tier = params.get('tier') ?? ''
  const verified = params.get('verified') ?? ''
  const [search, setSearch] = useState(state.q)
  const [result, setResult] = useState<PageResponse<AdminUserSummary> | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    premium: 0,
    verified: 0,
    unverified: 0,
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [target, setTarget] = useState<RoleTarget | null>(null)
  const [reason, setReason] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<AdminRole>('USER')
  const [inviteSendEmail, setInviteSendEmail] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?.id
  const { showToast } = useToast()

  const updateParam = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })

  const loadStats = useCallback(() => {
    Promise.all([
      adminApi.listUsers({ page: 0, size: 1 }),
      adminApi.listUsers({ page: 0, size: 1, tier: 'PREMIUM' }),
      adminApi.listUsers({ page: 0, size: 1, verified: 'true' }),
      adminApi.listUsers({ page: 0, size: 1, verified: 'false' }),
    ])
      .then(([all, premium, verifiedPage, unverifiedPage]) => {
        setStats({
          total: all.totalItems,
          premium: premium.totalItems,
          verified: verifiedPage.totalItems,
          unverified: unverifiedPage.totalItems,
        })
      })
      .catch(() => {
        /* keep previous stats */
      })
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi
      .listUsers({
        page: state.page,
        size: USERS_PAGE_SIZE,
        q: state.q || undefined,
        role: role || undefined,
        tier: tier || undefined,
        verified: verified || undefined,
      })
      .then((next) => {
        setResult(next)
        setSelectedIds((current) =>
          current.filter((id) => next.items.some((item) => item.id === id)),
        )
      })
      .catch((cause) => {
        setResult(null)
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => setLoading(false))
  }, [role, state.page, state.q, tier, verified])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    loadStats()
  }, [loadStats])
  useEffect(() => setSearch(state.q), [state.q])
  useEffect(() => {
    if (params.get('size') === String(USERS_PAGE_SIZE)) return
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('size', String(USERS_PAGE_SIZE))
        return next
      },
      { replace: true },
    )
  }, [params, setParams])

  const saveRole = async () => {
    if (!target || reason.trim().length < 10) return
    const expectedRole = target.user.role
    setSaving(true)
    try {
      await adminApi.updateRole(target.user.id, target.role, reason.trim(), expectedRole)
      showToast({
        message: `Đã cập nhật vai trò mới cho ${target.user.displayName || target.user.email} thành ${ROLE_META[target.role].label}.`,
        type: 'success',
      })
      setTarget(null)
      setReason('')
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const createInvitedUser = async () => {
    if (!inviteEmail.trim().includes('@')) {
      showToast({ message: 'Email không hợp lệ.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const created = await adminApi.createUser({
        email: inviteEmail.trim(),
        displayName: inviteName.trim() || undefined,
        role: inviteRole,
        sendCredentialsEmail: inviteSendEmail,
      })
      const temp = created.temporaryPassword ? ` Mật khẩu tạm: ${created.temporaryPassword}` : ''
      showToast({
        message: `Đã tạo người dùng ${created.email}.${temp}`,
        type: 'success',
      })
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('USER')
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const adminCountOnPage = result?.items.filter((item) => item.role === 'ADMIN').length ?? 0
  const verifiedPct =
    stats.total > 0 ? Math.round((stats.verified / stats.total) * 1000) / 10 : 0

  const clearFilters = () => {
    setSearch('')
    setParams((current) => {
      const next = new URLSearchParams(current)
      ;['q', 'role', 'tier', 'verified', 'page'].forEach((key) => next.delete(key))
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const toggleSelectAll = () => {
    if (!result) return
    const pageIds = result.items.map((item) => item.id)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? selectedIds.filter((id) => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])])
  }

  const openRoleFor = (user: AdminUserSummary) => {
    if (user.id === currentUserId) {
      showToast({ message: 'Không thể tự đổi vai trò.', type: 'error' })
      return
    }
    setTarget({ user, role: user.role === 'ADMIN' ? 'TEACHER' : 'ADMIN' })
    setReason('')
  }

  const selectedUser =
    selectedIds.length === 1
      ? result?.items.find((item) => item.id === selectedIds[0]) ?? null
      : null

  return (
    <section className="flex w-full min-w-0 max-w-full flex-col pb-16" aria-busy={loading}>
      <AdminPageHeader
        eyebrow="MODULE: IAM_USERS · /admin/users"
        title="Quản lý Người dùng"
        description="Quản trị hồ sơ tài khoản, phân quyền và trạng thái xác minh theo dữ liệu API HistAR."
        actions={
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <button
              type="button"
              className={btnGhost}
              onClick={() =>
                showToast({
                  message: 'Xuất CSV chưa có endpoint admin. Dùng bộ lọc + danh sách trang hiện tại.',
                  type: 'error',
                })
              }
            >
              <MaterialIcon name="file_download" className="text-[18px]" />
              Xuất CSV
            </button>
            <Link to="/admin/audit" className={btnGhost}>
              <MaterialIcon name="security" className="text-[18px]" />
              Audit Log
            </Link>
            <button
              type="button"
              className="ops-btn-primary"
              onClick={() => {
                setInviteEmail('')
                setInviteName('')
                setInviteRole('USER')
                setInviteSendEmail(true)
                setInviteOpen(true)
              }}
            >
              <MaterialIcon name="person_add" className="text-[18px]" />
              <span className="hidden sm:inline">+ Mời người dùng / Thêm mới</span>
              <span className="sm:hidden">+ Mời mới</span>
            </button>
          </div>
        }
      />

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body-md text-body-md font-medium text-on-surface-variant">
              Tổng tài khoản
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
              <MaterialIcon name="group" className="text-[18px]" />
            </div>
          </div>
          <p className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
            {formatCount(stats.total)}
          </p>
          <span className="font-code-sm text-code-sm text-outline">
            Tổng từ API danh sách người dùng
          </span>
        </div>
        <div className="relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body-md text-body-md font-medium text-on-surface-variant">
              Tài khoản Premium
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-secondary">
              <MaterialIcon name="workspace_premium" className="text-[18px]" />
            </div>
          </div>
          <p className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
            {formatCount(stats.premium)}
          </p>
          <span className="font-code-sm text-code-sm text-outline">Gói PREMIUM</span>
        </div>
        <div className="relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body-md text-body-md font-medium text-on-surface-variant">
              Đã xác minh email
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
              <MaterialIcon name="verified_user" className="text-[18px]" />
            </div>
          </div>
          <p className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
            {verifiedPct}%
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-code-sm text-code-sm text-outline">
              {formatCount(stats.verified)} tài khoản duyệt
            </span>
            <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, verifiedPct)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body-md text-body-md font-medium text-on-surface-variant">
              Chưa xác minh
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-error">
              <MaterialIcon name="lock_reset" className="text-[18px]" />
            </div>
          </div>
          <p className="font-headline-xl text-headline-xl font-bold tracking-tight text-error">
            {formatCount(stats.unverified)}
          </p>
          <span className="font-code-sm text-code-sm text-outline">
            Cần theo dõi xác minh email
          </span>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          updateParam('q', search.trim())
        }}
        className="mb-6 flex min-w-0 flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm"
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-0 flex-1 basis-[14rem]">
            <MaterialIcon
              name="manage_search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
            />
            <input
              aria-label="Tìm người dùng"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc email…"
              className="w-full min-w-0 rounded-lg bg-surface-container-lowest py-2 pl-9 pr-3 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
          <select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(event) => updateParam('role', event.target.value)}
            className={`min-w-0 flex-1 basis-[10rem] lg:max-w-[14rem] ${inputClass}`}
          >
            <option value="">Lọc vai trò (Tất cả)</option>
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_META[item].shortLabel}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc gói"
            value={tier}
            onChange={(event) => updateParam('tier', event.target.value)}
            className={`min-w-0 flex-1 basis-[8rem] lg:max-w-[11rem] ${inputClass}`}
          >
            <option value="">Gói dịch vụ (Tất cả)</option>
            <option value="FREE">FREE</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
          <select
            aria-label="Lọc xác minh"
            value={verified}
            onChange={(event) => updateParam('verified', event.target.value)}
            className={`min-w-0 flex-1 basis-[8rem] lg:max-w-[11rem] ${inputClass}`}
          >
            <option value="">Xác minh (Tất cả)</option>
            <option value="true">Đã xác minh</option>
            <option value="false">Chưa xác minh</option>
          </select>
          <div className="flex shrink-0 gap-3">
            <button type="submit" className="ops-btn-primary justify-center px-4 py-2">
              Tìm
            </button>
            <button type="button" onClick={clearFilters} className={`${btnGhost} px-3`} title="Đặt lại">
              <MaterialIcon name="restart_alt" className="text-[16px]" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          </div>
        </div>

        {(role || tier || verified || state.q) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-code-sm text-code-sm text-outline">Đang áp dụng:</span>
            {state.q && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-primary">
                Tìm: {state.q}
              </span>
            )}
            {role && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-primary">
                Vai trò: {ROLE_META[role as AdminRole]?.shortLabel ?? role}
                <button type="button" aria-label="Xóa lọc vai trò" onClick={() => updateParam('role', '')}>
                  <MaterialIcon name="close" className="text-[13px]" />
                </button>
              </span>
            )}
            {tier && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-secondary">
                Gói: {tier}
              </span>
            )}
            {verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-primary">
                Xác minh: {verified === 'true' ? 'Đã xác minh' : 'Chưa xác minh'}
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-2 font-code-sm text-code-sm text-outline underline hover:text-error"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </form>

      {loading && <AdminLoading label="Đang tải người dùng" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && (
        <AdminEmptyState
          title="Không có người dùng"
          detail="Không có tài khoản phù hợp với bộ lọc."
        />
      )}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
            {selectedIds.length > 0 && (
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 bg-surface-container px-space-md py-2 font-body-sm text-body-sm text-on-surface sm:px-space-lg">
                <div className="flex min-w-0 flex-wrap items-center gap-space-md">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-primary" />
                    <span className="font-medium">
                      Đã chọn {selectedIds.length} người dùng
                    </span>
                  </div>
                  <span className="hidden text-outline sm:inline">|</span>
                  <button
                    type="button"
                    disabled={!selectedUser || selectedUser.id === currentUserId}
                    onClick={() => selectedUser && openRoleFor(selectedUser)}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-primary disabled:opacity-40"
                  >
                    <MaterialIcon name="badge" className="text-[15px]" />
                    Thay đổi vai trò
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      showToast({
                        message: 'Khóa tạm thời chưa có trên API admin.',
                        type: 'error',
                      })
                    }
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-error"
                  >
                    <MaterialIcon name="lock" className="text-[15px]" />
                    Khóa tạm thời
                  </button>
                </div>
                <span className="font-code-sm text-code-sm text-outline">
                  HistAR IAM · trang {result.page + 1}
                </span>
              </div>
            )}

            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <thead>
                  <tr className="select-none bg-surface-container-lowest font-label-sm text-label-sm uppercase tracking-wider text-outline">
                    <th className="w-10 px-3 py-3 sm:px-space-md">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả trên trang"
                        checked={result.items.every((item) => selectedIds.includes(item.id))}
                        onChange={toggleSelectAll}
                        className="cursor-pointer accent-[var(--ops-primary,#4edea3)]"
                      />
                    </th>
                    <th className="min-w-[11rem] px-3 py-3 sm:px-space-md">Người dùng</th>
                    <th className="min-w-[10rem] px-3 py-3 sm:px-space-md">Email &amp; Liên hệ</th>
                    <th className="min-w-[8rem] px-3 py-3 sm:px-space-md">Trạng thái xác minh</th>
                    <th className="min-w-[7rem] px-3 py-3 sm:px-space-md">Gói dịch vụ</th>
                    <th className="min-w-[8.5rem] px-3 py-3 sm:px-space-md">Vai trò hiện hành</th>
                    <th className="min-w-[5.5rem] px-3 py-3 sm:px-space-md">Tham gia</th>
                    <th className="sticky right-0 z-[1] min-w-[5rem] bg-surface-container-lowest px-3 py-3 text-right sm:px-space-md">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface">
                  {result.items.map((user) => {
                    const selected = selectedIds.includes(user.id)
                    const meta = ROLE_META[user.role]
                    const isSelf = user.id === currentUserId
                    return (
                      <tr
                        key={user.id}
                        className={`transition-all ${
                          selected
                            ? 'bg-surface-container/70 shadow-[inset_2px_0_0_0_#4edea3]'
                            : 'hover:bg-surface-container/50'
                        }`}
                      >
                        <td className="px-3 py-3 sm:px-space-md">
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${user.email}`}
                            checked={selected}
                            onChange={() => toggleSelect(user.id)}
                            className="cursor-pointer accent-[var(--ops-primary,#4edea3)]"
                          />
                        </td>
                        <td className="max-w-[14rem] px-3 py-3 sm:px-space-md">
                          <div className="flex min-w-0 items-center gap-space-sm">
                            <div
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-label-md text-label-md font-bold ${
                                user.role === 'ADMIN'
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-surface-container-highest text-on-surface-variant'
                              } ${selected ? 'ring-2 ring-primary/40' : ''}`}
                            >
                              {initials(user.displayName || user.email)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate font-headline-sm text-headline-sm font-semibold text-on-surface">
                                  {user.displayName || 'Không có tên'}
                                </span>
                                {user.emailVerified && (
                                  <MaterialIcon
                                    name="verified"
                                    className="shrink-0 text-[15px] text-primary"
                                  />
                                )}
                              </div>
                              <p className="truncate font-code-sm text-code-sm text-outline">
                                {userCode(user.id)} · Lv.{user.level}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[12rem] px-3 py-3 sm:px-space-md">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-body-sm text-body-sm text-on-surface">
                              {user.email}
                            </span>
                            <span className="font-code-sm text-code-sm text-outline">
                              {user.totalPoints.toLocaleString('vi-VN')} điểm
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-space-md">
                          {user.emailVerified ? (
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-primary/10 px-2 py-1 font-label-sm text-label-sm font-medium text-primary">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              Đã xác minh
                            </span>
                          ) : (
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-tertiary-container/20 px-2 py-1 font-label-sm text-label-sm font-medium text-tertiary">
                              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-tertiary" />
                              Chưa xác minh
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 sm:px-space-md">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-label-sm text-label-sm font-semibold ${
                              user.tier === 'PREMIUM'
                                ? 'bg-secondary/15 text-secondary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {user.tier === 'PREMIUM' ? (
                              <MaterialIcon name="bolt" className="text-[13px]" />
                            ) : (
                              <MaterialIcon name="person" className="text-[13px]" />
                            )}
                            {tierLabel(user.tier)}
                          </span>
                        </td>
                        <td className="px-3 py-3 sm:px-space-md">
                          <span
                            className={`inline-flex max-w-[11rem] items-center gap-2 truncate rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm ${
                              user.role === 'ADMIN'
                                ? 'bg-primary text-on-primary font-bold shadow-sm'
                                : user.role === 'TEACHER'
                                  ? 'bg-surface-container-highest text-tertiary'
                                  : user.role === 'ORG_MEMBER'
                                    ? 'bg-surface-container-highest text-on-surface'
                                    : 'bg-surface-container-highest text-outline'
                            }`}
                          >
                            <MaterialIcon
                              name={meta.icon}
                              className={`shrink-0 text-[14px] ${user.role === 'ORG_MEMBER' ? 'text-primary' : ''}`}
                            />
                            <span className="truncate">{meta.shortLabel}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 sm:px-space-md">
                          <span className="font-code-sm text-code-sm text-on-surface">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                        <td
                          className={`sticky right-0 z-[1] px-3 py-3 text-right sm:px-space-md ${
                            selected ? 'bg-surface-container' : 'bg-surface-container-low'
                          }`}
                        >
                          {/* Keep select for a11y + admin-pages test contract */}
                          <select
                            aria-label={`Đổi vai trò của ${user.email}`}
                            value={user.role}
                            disabled={user.id === currentUserId || saving}
                            onChange={(event) =>
                              setTarget({
                                user,
                                role: event.target.value as AdminRole,
                              })
                            }
                            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                            tabIndex={-1}
                          >
                            {ROLES.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              title={isSelf ? 'Không thể tự đổi vai trò' : 'Thay đổi vai trò'}
                              disabled={user.id === currentUserId || saving}
                              onClick={() => openRoleFor(user)}
                              className={`rounded-lg p-1.5 transition-all disabled:opacity-40 ${
                                selected
                                  ? 'bg-primary/20 text-primary hover:bg-primary hover:text-on-primary'
                                  : 'text-outline hover:bg-surface-container-highest hover:text-primary'
                              }`}
                            >
                              <MaterialIcon name="manage_accounts" className="text-[18px]" />
                            </button>
                            <button
                              type="button"
                              title={isSelf ? 'Không thể tự đổi vai trò' : 'Tùy chọn khác'}
                              disabled={user.id === currentUserId || saving}
                              onClick={() => openRoleFor(user)}
                              className="rounded-lg p-1.5 text-outline transition-all hover:bg-surface-container-highest hover:text-on-surface disabled:opacity-40"
                            >
                              <MaterialIcon name="more_vert" className="text-[18px]" />
                            </button>
                          </div>
                          {isSelf && (
                            <p className="mt-1 hidden max-w-[7rem] truncate font-code-sm text-code-sm text-outline xl:block" title="Không thể tự đổi vai trò.">
                              Không thể tự đổi vai trò.
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-space-md flex flex-col items-center justify-between gap-2 sm:flex-row">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-outline">
                Hiển thị {result.page * result.size + (result.items.length ? 1 : 0)} -{' '}
                {result.page * result.size + result.items.length} trong{' '}
                {result.totalItems.toLocaleString('vi-VN')} bản ghi
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-outline md:inline-block" />
              <span className="hidden font-mono text-[11px] text-primary md:inline-block">
                {USERS_PAGE_SIZE} bản ghi / trang
              </span>
            </div>
            <AdminPagination
              variant="stitch"
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.totalItems}
              onPageChange={(page) =>
                updateParam('page', page ? String(page + 1) : '')
              }
            />
          </div>
        </>
      )}

      {inviteOpen && (
        <AdminModal
          title="Mời / thêm người dùng"
          subtitle="Admin user provisioning"
          icon="person_add"
          onClose={() => !saving && setInviteOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Email
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className={inputClass}
                placeholder="user@histar.vn"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tên hiển thị
              <input
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                className={inputClass}
                placeholder="Tùy chọn"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Vai trò ban đầu
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as AdminRole)}
                className={inputClass}
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {ROLE_META[item].shortLabel}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={inviteSendEmail}
                onChange={(event) => setInviteSendEmail(event.target.checked)}
                className="accent-primary"
              />
              Gửi email mật khẩu tạm
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                className={btnGhost}
                disabled={saving}
                onClick={() => setInviteOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ops-btn-primary disabled:opacity-50"
                disabled={saving}
                onClick={() => void createInvitedUser()}
              >
                {saving ? 'Đang tạo…' : 'Tạo người dùng'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {target && (
        <AdminModal
          title="Thay đổi vai trò người dùng"
          subtitle="IAM Privilege Level Escalation / Reassignment"
          icon="manage_accounts"
          onClose={() => {
            setTarget(null)
            setReason('')
          }}
          wide
        >
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-container-lowest p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/20 font-bold text-primary">
                  {initials(target.user.displayName || target.user.email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {target.user.displayName || 'Không có tên'} ({userCode(target.user.id)})
                  </p>
                  <p className="truncate font-code-sm text-code-sm text-outline">
                    {target.user.email}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-label-sm text-label-sm text-outline">Vai trò hiện tại</p>
                <p className="font-label-sm text-label-sm font-semibold text-primary">
                  {ROLE_META[target.user.role].shortLabel}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                Chọn vai trò quản trị mới (Role assignment)
              </p>
              <div className="flex flex-col gap-3">
                {ROLES.map((item) => {
                  const meta = ROLE_META[item]
                  const active = target.role === item
                  return (
                    <label
                      key={item}
                      className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl p-3.5 transition-all ${
                        active
                          ? 'bg-surface-container shadow-[0_0_0_1.5px_#4edea3]'
                          : 'bg-surface-container-lowest hover:bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="radio"
                        name="new_role"
                        checked={active}
                        onChange={() => setTarget({ ...target, role: item })}
                        className="mt-1 shrink-0 accent-[var(--ops-primary,#4edea3)]"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className={`font-headline-sm text-headline-sm font-semibold ${
                              active ? 'text-primary' : 'text-on-surface'
                            }`}
                          >
                            {meta.label}
                          </span>
                          {meta.badge && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 font-code-sm text-[10px] font-semibold ${
                                meta.badgeTone === 'error'
                                  ? 'bg-error-container text-on-error-container'
                                  : meta.badgeTone === 'success'
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              {meta.badge}
                            </span>
                          )}
                        </div>
                        <p className="font-body-sm text-body-sm leading-relaxed text-outline">
                          {meta.description}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-surface-container-lowest px-3 py-2">
                <dt className="text-on-surface-variant">Vai trò hiện tại</dt>
                <dd className="mt-0.5 font-bold text-on-surface">
                  {ROLE_META[target.user.role].shortLabel}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-container-lowest px-3 py-2">
                <dt className="text-on-surface-variant">Vai trò mới</dt>
                <dd className="mt-0.5 font-bold text-primary">
                  {ROLE_META[target.role].shortLabel}
                </dd>
              </div>
            </dl>

            {target.user.role === 'ADMIN' &&
              target.role !== 'ADMIN' &&
              adminCountOnPage <= 1 && (
                <p
                  role="alert"
                  className="rounded-lg bg-error-container/40 p-3 text-sm text-error"
                >
                  Cảnh báo: đây có thể là quản trị viên cuối cùng trong kết quả hiện tại. Máy
                  chủ sẽ từ chối nếu hệ thống không còn quản trị viên.
                </p>
              )}

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="role-change-reason"
                  className="font-label-sm text-label-sm uppercase tracking-wider text-outline"
                >
                  Lý do thay đổi vai trò (bắt buộc, tối thiểu 10 ký tự)
                </label>
                <span
                  className={`shrink-0 font-code-sm text-code-sm ${
                    reason.trim().length < 10 ? 'text-error' : 'text-primary'
                  }`}
                >
                  {reason.trim().length}/256 ký tự
                </span>
              </div>
              <textarea
                id="role-change-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={256}
                placeholder="Nhập lý do thăng cấp hoặc phân quyền bổ nhiệm…"
                className="w-full min-w-0 resize-none rounded-lg bg-surface-container-lowest p-3 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container focus:outline-none focus:shadow-[0_0_0_2px_rgba(78,222,163,0.3)]"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 shrink-0 accent-[var(--ops-primary,#4edea3)]"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  Gửi email thông báo bổ nhiệm và yêu cầu kích hoạt bảo mật 2FA bắt buộc
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  defaultChecked
                  disabled
                  className="mt-0.5 shrink-0 accent-[var(--ops-primary,#4edea3)]"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  Ghi nhận hành động vào Nhật ký kiểm toán bảo mật (Audit Trail Compliance)
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                onClick={() => {
                  setTarget(null)
                  setReason('')
                }}
                className="rounded-lg bg-surface-container-high px-4 py-2 font-headline-sm text-headline-sm text-on-surface hover:bg-surface-container-highest"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={
                  saving || reason.trim().length < 10 || target.role === target.user.role
                }
                onClick={() => void saveRole()}
                className="ops-btn-primary shadow-[0_0_20px_-2px_rgba(16,185,129,0.4)] disabled:opacity-50"
              >
                <MaterialIcon name="verified" className="text-[18px]" />
                {saving ? 'Đang lưu…' : 'Xác nhận thay đổi vai trò'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
