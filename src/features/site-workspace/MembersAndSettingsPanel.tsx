import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/useAuth'
import { siteWorkspaceApi, workspaceErrorMessage, type SiteMember, type SiteRole } from './api'
import { invalidateSiteWorkspaceNav } from './useSiteWorkspaceNav'

const ROLE_OPTIONS: Array<{ value: SiteRole; label: string }> = [
  { value: 'CONTENT_EDITOR', label: 'Biên tập viên' },
  { value: 'CONTENT_REVIEWER', label: 'Người duyệt' },
  { value: 'SITE_MANAGER', label: 'Quản lý di tích' },
]

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function roleLabel(role: SiteRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
}

type MembersAndSettingsPanelProps = {
  siteCode: string
  role: SiteRole
  members: SiteMember[]
  requiresTripConfirmation: boolean
  onMembers: (members: SiteMember[]) => void
  onTripConfirmation: (requiresTripConfirmation: boolean) => void
}

export function MembersAndSettingsPanel({
  siteCode,
  role,
  members,
  requiresTripConfirmation,
  onMembers,
  onTripConfirmation,
}: MembersAndSettingsPanelProps) {
  const { user } = useAuth()
  const canManage = role === 'SITE_MANAGER'
  const roleOptions = user?.role === 'ADMIN' ? ROLE_OPTIONS : ROLE_OPTIONS.filter((option) => option.value !== 'SITE_MANAGER')
  const [rows, setRows] = useState(members)
  const [trip, setTrip] = useState(requiresTripConfirmation)
  const [userId, setUserId] = useState('')
  const [nextRole, setNextRole] = useState<SiteRole>('CONTENT_EDITOR')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setRows(members)
  }, [members])

  useEffect(() => {
    setTrip(requiresTripConfirmation)
  }, [requiresTripConfirmation])

  if (!canManage) {
    return <p className="text-sm text-slate-600">Chỉ quản lý di tích mới xem và sửa thành viên.</p>
  }

  const saveMember = async () => {
    const trimmed = userId.trim()
    if (!UUID_PATTERN.test(trimmed)) {
      setError('Mã người dùng không hợp lệ')
      setMessage(null)
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await siteWorkspaceApi.upsertMember(siteCode, { userId: trimmed, role: nextRole })
      invalidateSiteWorkspaceNav()
      const next = [...rows.filter((member) => member.userId !== saved.userId), saved]
      setRows(next)
      onMembers(next)
      setMessage('Đã cập nhật thành viên')
      setUserId('')
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (targetUserId: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await siteWorkspaceApi.revokeMember(siteCode, targetUserId)
      invalidateSiteWorkspaceNav()
      const next = rows.filter((member) => member.userId !== targetUserId)
      setRows(next)
      onMembers(next)
      setMessage('Đã thu hồi thành viên')
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const updateTrip = async (checked: boolean) => {
    setTrip(checked)
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await siteWorkspaceApi.updateSettings(siteCode, checked)
      setTrip(saved.requiresTripConfirmation)
      onTripConfirmation(saved.requiresTripConfirmation)
      setMessage('Đã cập nhật xác nhận chuyến đi')
    } catch (cause: unknown) {
      setTrip(!checked)
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="max-w-3xl space-y-5" aria-label="Thành viên và cài đặt">
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <input type="checkbox" checked={trip} disabled={busy} onChange={(event) => void updateTrip(event.target.checked)} />
        Yêu cầu xác nhận chuyến đi
      </label>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 && <li className="px-3 py-3 text-sm text-slate-600">Chưa có thành viên.</li>}
        {rows.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
            <span className="text-sm text-slate-900">
              <span className="font-semibold">{roleLabel(member.role)}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{member.userId}</span>
            </span>
            <button type="button" className={secondaryButton} disabled={busy} onClick={() => void revoke(member.userId)}>
              Thu hồi
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <label className="block text-sm font-semibold text-slate-800">
          Mã người dùng
          <input
            className={inputClass}
            value={userId}
            disabled={busy}
            autoComplete="off"
            onChange={(event) => setUserId(event.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Vai trò
          <select className={inputClass} value={nextRole} disabled={busy} onChange={(event) => setNextRole(event.target.value as SiteRole)}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={primaryButton} disabled={busy} onClick={() => void saveMember()}>
          Lưu thành viên
        </button>
      </div>
    </section>
  )
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-[#014a9e] focus-visible:ring-2 focus-visible:ring-[#014a9e]/30 disabled:bg-slate-100'
const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-[#014a9e] px-4 py-2 text-sm font-bold text-white hover:bg-[#013874] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'
