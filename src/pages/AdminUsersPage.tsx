import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import {
  adminApi,
  type AdminDemoAccount,
  type AdminDemoDataset,
  type AdminDemoEnvironmentStatus,
  type AdminUserSummary,
  type PageResponse,
} from '../features/admin/api'
import { parseAdminListState } from '../features/admin/state'
import { DEMO_STOP_CONFIRMATION, getDemoStopBlock } from '../features/admin/demoEnvironmentState'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useAuth } from '../shared/auth/useAuth'
import { appEnv } from '../shared/config/env'
import { useToast } from '../shared/ui/toast/useToast'

type AdminRole = 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN'
type AccountStatus = 'ACTIVE' | 'SUSPENDED'
type UserTier = 'FREE' | 'PREMIUM'
type RoleTarget = { user: AdminUserSummary; role: AdminRole }
type StatusTarget = { user: AdminUserSummary; status: AccountStatus }
type TierTarget = { user: AdminUserSummary; tier: UserTier }
type VerifyTarget = { user: AdminUserSummary }
type BulkKind = 'SUSPEND' | 'UNSUSPEND' | 'SET_ROLE' | 'SET_TIER'

function accountStatusOf(user: AdminUserSummary): AccountStatus {
  return user.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
}

function tierOf(user: AdminUserSummary): UserTier {
  return user.tier === 'PREMIUM' ? 'PREMIUM' : 'FREE'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Keep the user directory dense enough for routine administration. */
const USERS_PAGE_SIZE = 10

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
    label: 'Chuyên gia / Giáo viên',
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
  if (tier === 'FREE') return 'Miễn phí'
  return tier
}

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams()
  const state = parseAdminListState(params)
  const role = params.get('role') ?? ''
  const tier = params.get('tier') ?? ''
  const verified = params.get('verified') ?? ''
  const statusFilter = params.get('status') ?? ''
  const [search, setSearch] = useState(state.q)
  const [result, setResult] = useState<PageResponse<AdminUserSummary> | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    premium: 0,
    verified: 0,
    unverified: 0,
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [demoDataset, setDemoDataset] = useState<AdminDemoDataset | null>(null)
  const [demoEnvironment, setDemoEnvironment] = useState<AdminDemoEnvironmentStatus | null>(null)
  const [demoStopOpen, setDemoStopOpen] = useState(false)
  const [demoStopConfirmation, setDemoStopConfirmation] = useState('')
  const [demoAccountToDelete, setDemoAccountToDelete] = useState<AdminDemoAccount | 'ALL' | null>(null)
  const [demoReason, setDemoReason] = useState('')
  const [target, setTarget] = useState<RoleTarget | null>(null)
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)
  const [tierTarget, setTierTarget] = useState<TierTarget | null>(null)
  const [verifyTarget, setVerifyTarget] = useState<VerifyTarget | null>(null)
  const [bulkKind, setBulkKind] = useState<BulkKind | null>(null)
  const [bulkRole, setBulkRole] = useState<AdminRole>('TEACHER')
  const [bulkTier, setBulkTier] = useState<UserTier>('PREMIUM')
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

  const loadDemoDataset = useCallback(() => {
    adminApi.previewDemoDataset().then(setDemoDataset).catch(() => setDemoDataset(null))
  }, [])

  const loadDemoEnvironment = useCallback(() => {
    if (appEnv.demoMode) return
    adminApi.getDemoEnvironment().then(setDemoEnvironment).catch(() => setDemoEnvironment(null))
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
        status: statusFilter || undefined,
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
  }, [role, state.page, state.q, statusFilter, tier, verified])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    loadStats()
  }, [loadStats])
  useEffect(() => {
    loadDemoDataset()
  }, [loadDemoDataset])
  useEffect(() => {
    loadDemoEnvironment()
  }, [loadDemoEnvironment])
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

  const purgeDemoDataset = async () => {
    if (!demoAccountToDelete || demoReason.trim().length < 10) return
    setSaving(true)
    try {
      const result = await adminApi.purgeDemoDataset({
        userId: demoAccountToDelete === 'ALL' ? null : demoAccountToDelete.id,
        reason: demoReason.trim(),
      })
      showToast({
        message: `Đã xóa ${result.deletedAccounts} tài khoản demo và ${result.deletedRows} bản ghi liên quan.`,
        type: 'success',
      })
      setDemoAccountToDelete(null)
      setDemoReason('')
      loadDemoDataset()
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const openDemoAdmin = async () => {
    setSaving(true)
    setError('')
    try {
      const session = await adminApi.createDemoAdminSession()
      window.location.assign(session.url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tạo phiên quản trị demo.')
      setSaving(false)
    }
  }

  const startDemoEnvironment = async () => {
    setSaving(true)
    try {
      const status = await adminApi.startDemoEnvironment()
      setDemoEnvironment(status)
      showToast({ message: 'Môi trường demo đã sẵn sàng.', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const stopDemoEnvironment = async () => {
    if (!demoEnvironment) return
    const blocked = getDemoStopBlock(demoEnvironment, demoStopConfirmation)
    if (blocked) {
      showToast({ message: blocked, type: 'error' })
      return
    }

    setSaving(true)
    try {
      const latest = await adminApi.getDemoEnvironment()
      setDemoEnvironment(latest)
      const latestBlock = getDemoStopBlock(latest, demoStopConfirmation)
      if (latestBlock) {
        showToast({ message: latestBlock, type: 'error' })
        return
      }
      const status = await adminApi.stopDemoEnvironment(demoStopConfirmation)
      setDemoEnvironment(status)
      setDemoStopOpen(false)
      setDemoStopConfirmation('')
      showToast({ message: 'Đã tắt môi trường demo. Dữ liệu demo vẫn được giữ nguyên.', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
      loadDemoEnvironment()
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
      ;['q', 'role', 'tier', 'verified', 'status', 'page'].forEach((key) => next.delete(key))
      return next
    })
  }

  const exportCsv = async (ids?: string[]) => {
    setSaving(true)
    try {
      const blob = await adminApi.exportUsersCsv(
        ids?.length
          ? { ids: ids.join(',') }
          : {
              q: state.q || undefined,
              role: role || undefined,
              tier: tier || undefined,
              verified: verified || undefined,
              status: statusFilter || undefined,
            },
      )
      downloadBlob(blob, 'admin-users.csv')
      showToast({ message: 'Đã xuất CSV người dùng.', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveStatus = async () => {
    if (!statusTarget || reason.trim().length < 10) return
    setSaving(true)
    try {
      await adminApi.updateUserStatus(
        statusTarget.user.id,
        statusTarget.status,
        reason.trim(),
        accountStatusOf(statusTarget.user),
      )
      showToast({
        message:
          statusTarget.status === 'SUSPENDED'
            ? `Đã khóa tạm ${statusTarget.user.email}.`
            : `Đã mở khóa ${statusTarget.user.email}.`,
        type: 'success',
      })
      setStatusTarget(null)
      setReason('')
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveTier = async () => {
    if (!tierTarget || reason.trim().length < 10) return
    setSaving(true)
    try {
      await adminApi.updateUserTier(
        tierTarget.user.id,
        tierTarget.tier,
        reason.trim(),
        tierOf(tierTarget.user),
      )
      showToast({
        message: `Đã đổi gói ${tierTarget.user.email} → ${tierTarget.tier}.`,
        type: 'success',
      })
      setTierTarget(null)
      setReason('')
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveForceVerify = async () => {
    if (!verifyTarget || reason.trim().length < 10) return
    setSaving(true)
    try {
      await adminApi.forceVerifyUser(verifyTarget.user.id, reason.trim())
      showToast({ message: `Đã xác minh email cho ${verifyTarget.user.email}.`, type: 'success' })
      setVerifyTarget(null)
      setReason('')
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const resendVerification = async (user: AdminUserSummary) => {
    setSaving(true)
    try {
      const resultResend = await adminApi.resendUserVerification(user.id)
      const debug = resultResend.debugVerificationToken
        ? ` Token debug: ${resultResend.debugVerificationToken}`
        : ''
      showToast({
        message: resultResend.emailed
          ? `Đã gửi lại email xác thực tới ${user.email}.`
          : `Đã tạo lại liên kết xác thực.${debug}`,
        type: 'success',
      })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const runBulk = async () => {
    if (!bulkKind || selectedIds.length === 0 || reason.trim().length < 10) return
    setSaving(true)
    try {
      const resultBulk = await adminApi.bulkUsers({
        userIds: selectedIds,
        action: bulkKind,
        reason: reason.trim(),
        role: bulkKind === 'SET_ROLE' ? bulkRole : undefined,
        tier: bulkKind === 'SET_TIER' ? bulkTier : undefined,
      })
      const failHint =
        resultBulk.failed.length > 0
          ? ` · lỗi ${resultBulk.failed.length}: ${resultBulk.failed[0]?.message ?? ''}`
          : ''
      showToast({
        message: `Bulk xong: ${resultBulk.succeeded} thành công${failHint}`,
        type: resultBulk.failed.length ? 'error' : 'success',
      })
      setBulkKind(null)
      setReason('')
      setSelectedIds([])
      load()
      loadStats()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const openStatusFor = (user: AdminUserSummary, status: AccountStatus) => {
    if (user.id === currentUserId && status === 'SUSPENDED') {
      showToast({ message: 'Không thể khóa tạm chính mình.', type: 'error' })
      return
    }
    setStatusTarget({ user, status })
    setReason('')
  }

  const openTierFor = (user: AdminUserSummary) => {
    setTierTarget({ user, tier: tierOf(user) === 'PREMIUM' ? 'FREE' : 'PREMIUM' })
    setReason('')
  }

  const openVerifyFor = (user: AdminUserSummary) => {
    setVerifyTarget({ user })
    setReason('')
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
    <section className="admin-page admin-users-page flex w-full min-w-0 max-w-full flex-col pb-16" aria-busy={loading}>
      <AdminPageHeader
        eyebrow="KHÁCH HÀNG & DOANH THU / TÀI KHOẢN"
        title="Quản lý Người dùng"
        description="Quản trị hồ sơ tài khoản, phân quyền và trạng thái xác minh theo dữ liệu API HistAR."
        actions={
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <button
              type="button"
              className={`${btnGhost} users-header-action users-header-action--export`}
              disabled={saving}
              onClick={() => void exportCsv()}
            >
              <MaterialIcon name="file_download" className="text-[18px]" />
              Xuất CSV
            </button>
            <Link
              to={
                selectedUser
                  ? `/admin/audit?entityType=USER&entityId=${encodeURIComponent(selectedUser.id)}`
                  : '/admin/audit'
              }
              className={`${btnGhost} users-header-action users-header-action--audit`}
            >
              <MaterialIcon name="security" className="text-[18px]" />
              Nhật ký kiểm toán
            </Link>
            <button
              type="button"
              className="ops-btn-primary users-header-action users-header-action--invite"
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
        <div className="users-stat-card relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm" data-tone="blue">
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
        <div className="users-stat-card relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm" data-tone="teal">
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
        <div className="users-stat-card relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm" data-tone="violet">
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
        <div className="users-stat-card relative flex min-h-[7.5rem] flex-col justify-between gap-3 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm" data-tone="coral">
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

      {!appEnv.demoMode && (
        <section className="users-demo-panel mb-6 overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-low shadow-sm">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${demoEnvironment?.enabled ? 'bg-primary-container text-primary' : 'bg-surface-container-highest text-outline'}`}>
                <MaterialIcon name={demoEnvironment?.enabled ? 'science' : 'power_settings_new'} className="text-[20px]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-headline-md text-headline-md font-bold text-on-surface">Môi trường demo riêng</p>
                  <span className={`rounded-full px-2 py-0.5 font-code-sm text-code-sm ${demoEnvironment?.enabled ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-outline'}`}>
                    {demoEnvironment ? (demoEnvironment.enabled ? 'ĐANG BẬT' : 'ĐÃ TẮT') : 'CHƯA KẾT NỐI'}
                  </span>
                </div>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {demoEnvironment?.enabled
                    ? `${demoEnvironment.activeUsers} người hoạt động trong 5 phút gần nhất. Dữ liệu hoàn toàn tách khỏi production.`
                    : 'Chỉ khởi động khi cần trình diễn; tắt môi trường không xóa dữ liệu demo.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={loadDemoEnvironment} className={btnGhost}>
                <MaterialIcon name="refresh" className="text-[18px]" />
                Làm mới
              </button>
              {demoEnvironment?.enabled ? (
                <>
                  <button type="button" disabled={saving} onClick={() => void openDemoAdmin()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-headline-sm text-on-primary disabled:opacity-50">
                    <MaterialIcon name="open_in_new" className="text-[18px]" />
                    Mở quản trị demo (15 phút)
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setDemoStopConfirmation('')
                      setDemoStopOpen(true)
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 font-headline-sm text-on-error disabled:opacity-50"
                  >
                    <MaterialIcon name="power_settings_new" className="text-[18px]" />
                    Tắt môi trường demo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={saving || !demoEnvironment}
                  onClick={() => void startDemoEnvironment()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-headline-sm text-on-primary disabled:opacity-50"
                >
                  <MaterialIcon name="play_arrow" className="text-[18px]" />
                  {saving ? 'Đang khởi động…' : 'Bật môi trường demo'}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {demoDataset && demoDataset.enabled && (
        <section className="users-demo-data mb-6 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-amber-500/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">Dữ liệu demo</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {demoDataset.accountCount} tài khoản · {demoDataset.operationalRowCount} bản ghi vận hành. Chỉ tồn tại trong môi trường demo.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 font-headline-sm text-on-error disabled:opacity-50"
              disabled={saving || demoDataset.accountCount === 0}
              onClick={() => {
                setDemoAccountToDelete('ALL')
                setDemoReason('')
              }}
            >
              <MaterialIcon name="delete_sweep" className="text-[18px]" />
              Xóa toàn bộ bộ demo
            </button>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-3">
            {demoDataset.accounts.map((account) => (
              <div key={account.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-container-lowest p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-headline-sm font-bold">
                  {initials(account.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-headline-sm font-semibold text-on-surface">{account.displayName}</p>
                  <p className="truncate font-code-sm text-outline">{account.role} · {account.tier} · {account.points} điểm</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-error hover:bg-error-container"
                  aria-label={`Xóa tài khoản demo ${account.displayName}`}
                  onClick={() => {
                    setDemoAccountToDelete(account)
                    setDemoReason('')
                  }}
                >
                  <MaterialIcon name="delete" className="text-[18px]" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          updateParam('q', search.trim())
        }}
        className="users-filter-panel mb-6 flex min-w-0 flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 shadow-sm"
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
          <select
            aria-label="Lọc trạng thái tài khoản"
            value={statusFilter}
            onChange={(event) => updateParam('status', event.target.value)}
            className={`min-w-0 flex-1 basis-[8rem] lg:max-w-[11rem] ${inputClass}`}
          >
            <option value="">Trạng thái (Tất cả)</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="SUSPENDED">SUSPENDED</option>
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

        {(role || tier || verified || statusFilter || state.q) && (
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
            {statusFilter && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-error">
                Trạng thái: {statusFilter}
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
          <div className="users-table-panel flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
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
                    Vai trò (1)
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBulkKind('SET_ROLE')
                      setReason('')
                    }}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-primary disabled:opacity-40"
                  >
                    <MaterialIcon name="groups" className="text-[15px]" />
                    Bulk vai trò
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBulkKind('SET_TIER')
                      setReason('')
                    }}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-secondary disabled:opacity-40"
                  >
                    <MaterialIcon name="workspace_premium" className="text-[15px]" />
                    Bulk gói
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBulkKind('SUSPEND')
                      setReason('')
                    }}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-error disabled:opacity-40"
                  >
                    <MaterialIcon name="lock" className="text-[15px]" />
                    Khóa tạm
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBulkKind('UNSUSPEND')
                      setReason('')
                    }}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-primary disabled:opacity-40"
                  >
                    <MaterialIcon name="lock_open" className="text-[15px]" />
                    Mở khóa
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void exportCsv(selectedIds)}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-primary disabled:opacity-40"
                  >
                    <MaterialIcon name="file_download" className="text-[15px]" />
                    Xuất chọn
                  </button>
                </div>
                <span className="font-code-sm text-code-sm text-outline">
                  HistAR IAM · trang {result.page + 1}
                </span>
              </div>
            )}

            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="admin-users-table w-full min-w-[94rem] table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-12" /><col className="w-[15rem]" /><col className="w-[18rem]" />
                  <col className="w-[10rem]" /><col className="w-[8rem]" /><col className="w-[9rem]" />
                  <col className="w-[11rem]" /><col className="w-[8rem]" /><col className="w-[15rem]" />
                </colgroup>
                <thead>
                  <tr className="users-table-head select-none bg-surface-container-lowest font-label-sm text-label-sm uppercase tracking-wider text-outline">
                    <th className="w-10 px-3 py-3 sm:px-space-md">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả trên trang"
                        checked={result.items.every((item) => selectedIds.includes(item.id))}
                        onChange={toggleSelectAll}
                        className="cursor-pointer accent-[var(--ops-primary,#0159bd)]"
                      />
                    </th>
                    <th className="min-w-[11rem] px-3 py-3 sm:px-space-md">Người dùng</th>
                    <th className="min-w-[10rem] px-3 py-3 sm:px-space-md">Email &amp; Liên hệ</th>
                    <th className="px-3 py-3 text-center sm:px-space-md">Xác minh</th>
                    <th className="px-3 py-3 text-center sm:px-space-md">Tài khoản</th>
                    <th className="px-3 py-3 text-center sm:px-space-md">Gói dịch vụ</th>
                    <th className="px-3 py-3 text-center sm:px-space-md">Vai trò</th>
                    <th className="px-3 py-3 text-center sm:px-space-md">Ngày tham gia</th>
                    <th className="sticky right-0 z-[1] bg-surface-container-lowest px-3 py-3 text-center sm:px-space-md">
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
                        className={`users-table-row transition-all ${
                          selected
                            ? 'bg-surface-container/70 shadow-[inset_2px_0_0_0_#0275fb]'
                            : 'hover:bg-surface-container/50'
                        }`}
                      >
                        <td className="px-3 py-3 sm:px-space-md">
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${user.email}`}
                            checked={selected}
                            onChange={() => toggleSelect(user.id)}
                            className="cursor-pointer accent-[var(--ops-primary,#0159bd)]"
                          />
                        </td>
                        <td className="overflow-hidden px-3 py-3 sm:px-space-md">
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
                                <span className="truncate font-body-md text-body-md font-semibold text-on-surface" title={user.displayName || undefined}>
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
                        <td className="overflow-hidden px-3 py-3 sm:px-space-md">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-body-sm text-body-sm text-on-surface" title={user.email}>
                              {user.email}
                            </span>
                            <span className="font-code-sm text-code-sm text-outline">
                              {user.totalPoints.toLocaleString('vi-VN')} điểm
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center sm:px-space-md">
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
                        <td className="px-3 py-3 text-center sm:px-space-md">
                          {accountStatusOf(user) === 'SUSPENDED' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-1 font-label-sm text-label-sm font-semibold text-error">
                              Tạm khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-label-sm text-label-sm font-semibold text-primary">
                              Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center sm:px-space-md">
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
                        <td className="px-3 py-3 text-center sm:px-space-md">
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
                        <td className="whitespace-nowrap px-3 py-3 text-center sm:px-space-md">
                          <span className="font-code-sm text-code-sm text-on-surface">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                        <td
                          className={`sticky right-0 z-[1] px-3 py-3 text-center sm:px-space-md ${
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
                          <div className="admin-table-actions">
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
                              title="Đổi gói FREE/PREMIUM"
                              disabled={saving}
                              onClick={() => openTierFor(user)}
                              className="rounded-lg p-1.5 text-outline transition-all hover:bg-surface-container-highest hover:text-secondary disabled:opacity-40"
                            >
                              <MaterialIcon name="workspace_premium" className="text-[18px]" />
                            </button>
                            <button
                              type="button"
                              title={
                                accountStatusOf(user) === 'SUSPENDED' ? 'Mở khóa tài khoản' : 'Khóa tạm thời'
                              }
                              disabled={saving || (isSelf && accountStatusOf(user) === 'ACTIVE')}
                              onClick={() =>
                                openStatusFor(
                                  user,
                                  accountStatusOf(user) === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                                )
                              }
                              className="rounded-lg p-1.5 text-outline transition-all hover:bg-surface-container-highest hover:text-error disabled:opacity-40"
                            >
                              <MaterialIcon
                                name={accountStatusOf(user) === 'SUSPENDED' ? 'lock_open' : 'lock'}
                                className="text-[18px]"
                              />
                            </button>
                            {!user.emailVerified && (
                              <>
                                <button
                                  type="button"
                                  title="Xác minh email ngay"
                                  disabled={saving}
                                  onClick={() => openVerifyFor(user)}
                                  className="rounded-lg p-1.5 text-outline transition-all hover:bg-surface-container-highest hover:text-primary disabled:opacity-40"
                                >
                                  <MaterialIcon name="verified_user" className="text-[18px]" />
                                </button>
                                <button
                                  type="button"
                                  title="Gửi lại email xác thực"
                                  disabled={saving}
                                  onClick={() => void resendVerification(user)}
                                  className="rounded-lg p-1.5 text-outline transition-all hover:bg-surface-container-highest hover:text-primary disabled:opacity-40"
                                >
                                  <MaterialIcon name="forward_to_inbox" className="text-[18px]" />
                                </button>
                              </>
                            )}
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
                          ? 'bg-surface-container shadow-[0_0_0_1.5px_#0275fb]'
                          : 'bg-surface-container-lowest hover:bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="radio"
                        name="new_role"
                        checked={active}
                        onChange={() => setTarget({ ...target, role: item })}
                        className="mt-1 shrink-0 accent-[var(--ops-primary,#0159bd)]"
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
                className="w-full min-w-0 resize-none rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 shrink-0 accent-[var(--ops-primary,#0159bd)]"
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
                  className="mt-0.5 shrink-0 accent-[var(--ops-primary,#0159bd)]"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  Ghi nhận hành động vào Nhật ký kiểm toán
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
                className="ops-btn-primary disabled:opacity-50"
              >
                <MaterialIcon name="verified" className="text-[18px]" />
                {saving ? 'Đang lưu…' : 'Xác nhận thay đổi vai trò'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {statusTarget && (
        <AdminModal
          title={statusTarget.status === 'SUSPENDED' ? 'Khóa tạm thời tài khoản' : 'Mở khóa tài khoản'}
          subtitle={statusTarget.user.email}
          icon={statusTarget.status === 'SUSPENDED' ? 'lock' : 'lock_open'}
          onClose={() => {
            setStatusTarget(null)
            setReason('')
          }}
        >
          <div className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Trạng thái mới: <strong>{statusTarget.status}</strong>
            </p>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Lý do (tối thiểu 10 ký tự)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setStatusTarget(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="ops-btn-primary disabled:opacity-50"
                disabled={saving || reason.trim().length < 10}
                onClick={() => void saveStatus()}
              >
                {saving ? 'Đang lưu…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {tierTarget && (
        <AdminModal
          title="Đổi gói dịch vụ"
          subtitle={tierTarget.user.email}
          icon="workspace_premium"
          onClose={() => {
            setTierTarget(null)
            setReason('')
          }}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Gói mới
              <select
                value={tierTarget.tier}
                onChange={(event) =>
                  setTierTarget({ ...tierTarget, tier: event.target.value as UserTier })
                }
                className={inputClass}
              >
                <option value="FREE">FREE</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Lý do (tối thiểu 10 ký tự)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setTierTarget(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="ops-btn-primary disabled:opacity-50"
                disabled={saving || reason.trim().length < 10 || tierTarget.tier === tierOf(tierTarget.user)}
                onClick={() => void saveTier()}
              >
                {saving ? 'Đang lưu…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {verifyTarget && (
        <AdminModal
          title="Xác minh email ngay"
          subtitle={verifyTarget.user.email}
          icon="verified_user"
          onClose={() => {
            setVerifyTarget(null)
            setReason('')
          }}
        >
          <div className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Đánh dấu email đã xác minh mà không cần người dùng bấm link.
            </p>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Lý do (tối thiểu 10 ký tự)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setVerifyTarget(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="ops-btn-primary disabled:opacity-50"
                disabled={saving || reason.trim().length < 10}
                onClick={() => void saveForceVerify()}
              >
                {saving ? 'Đang lưu…' : 'Xác minh'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {bulkKind && (
        <AdminModal
          title={`Bulk: ${bulkKind}`}
          subtitle={`${selectedIds.length} người dùng đã chọn`}
          icon="groups"
          onClose={() => {
            setBulkKind(null)
            setReason('')
          }}
        >
          <div className="flex flex-col gap-4">
            {bulkKind === 'SET_ROLE' && (
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Vai trò áp dụng
                <select
                  value={bulkRole}
                  onChange={(event) => setBulkRole(event.target.value as AdminRole)}
                  className={inputClass}
                >
                  {ROLES.map((item) => (
                    <option key={item} value={item}>
                      {ROLE_META[item].shortLabel}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {bulkKind === 'SET_TIER' && (
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Gói áp dụng
                <select
                  value={bulkTier}
                  onChange={(event) => setBulkTier(event.target.value as UserTier)}
                  className={inputClass}
                >
                  <option value="FREE">FREE</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Lý do (tối thiểu 10 ký tự)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setBulkKind(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="ops-btn-primary disabled:opacity-50"
                disabled={saving || reason.trim().length < 10}
                onClick={() => void runBulk()}
              >
                {saving ? 'Đang chạy…' : 'Chạy bulk'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {demoStopOpen && demoEnvironment && (
        <AdminModal
          title="Tắt môi trường demo"
          subtitle="Dữ liệu demo được giữ nguyên để bật lại sau"
          icon="power_settings_new"
          onClose={() => {
            setDemoStopOpen(false)
            setDemoStopConfirmation('')
          }}
        >
          <div className="flex flex-col gap-4">
            <div className={`rounded-lg p-3 font-body-sm text-body-sm ${demoEnvironment.activeUsers > 0 ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {demoEnvironment.activeUsers > 0
                ? `Chưa thể tắt: còn ${demoEnvironment.activeUsers} người hoạt động trong 5 phút gần nhất. Hãy chờ họ kết thúc rồi bấm Làm mới.`
                : 'Không phát hiện người dùng đang hoạt động. Hệ thống sẽ kiểm tra lại một lần nữa trước khi tắt.'}
            </div>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Nhập chính xác {DEMO_STOP_CONFIRMATION} để xác nhận
              <input
                value={demoStopConfirmation}
                onChange={(event) => setDemoStopConfirmation(event.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={btnGhost} disabled={saving} onClick={loadDemoEnvironment}>
                Làm mới người hoạt động
              </button>
              <button
                type="button"
                className="rounded-lg bg-error px-4 py-2 font-headline-sm text-on-error disabled:opacity-50"
                disabled={saving || getDemoStopBlock(demoEnvironment, demoStopConfirmation) !== null}
                onClick={() => void stopDemoEnvironment()}
              >
                {saving ? 'Đang tắt…' : 'Xác nhận tắt demo'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {demoAccountToDelete && (
        <AdminModal
          title={demoAccountToDelete === 'ALL' ? 'Xóa toàn bộ bộ demo' : 'Xóa tài khoản demo'}
          subtitle={demoAccountToDelete === 'ALL' ? 'Đúng 10 tài khoản và dữ liệu phát sinh' : demoAccountToDelete.email}
          icon="delete_forever"
          onClose={() => {
            setDemoAccountToDelete(null)
            setDemoReason('')
          }}
        >
          <div className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Thao tác chỉ xóa danh tính đã đăng ký trong bộ demo, thu hồi phiên và dữ liệu phát sinh. Admin thật và nội dung Củ Chi nền được giữ nguyên.
            </p>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Lý do (tối thiểu 10 ký tự)
              <textarea
                value={demoReason}
                onChange={(event) => setDemoReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setDemoAccountToDelete(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="rounded-lg bg-error px-4 py-2 font-headline-sm text-on-error disabled:opacity-50"
                disabled={saving || demoReason.trim().length < 10}
                onClick={() => void purgeDemoDataset()}
              >
                {saving ? 'Đang xóa…' : 'Xác nhận xóa dữ liệu demo'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
