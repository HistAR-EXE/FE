// src/features/profile/ProfileEditForm.tsx
import { useState } from 'react'
import { profileApi, type ProfileMe } from './api'
import { useAuth } from '../../shared/auth/useAuth'
import { useToast } from '../../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'
import { validateProfileEdit } from './profileState'

type Props = {
  profile: ProfileMe
  onSaved: (profile: ProfileMe) => void
  onCancel?: () => void
}

export function ProfileEditForm({ profile, onSaved, onCancel }: Props) {
  const { updateUser } = useAuth()
  const { showToast } = useToast()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [city, setCity] = useState(profile.city ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const saved = await profileApi.updateMe(validateProfileEdit(displayName, city, avatarUrl))
      updateUser({
        displayName: saved.displayName,
        avatarUrl: saved.avatarUrl,
        email: saved.email,
        role: saved.role,
        tier: saved.tier,
        orgId: saved.orgId,
        orgSubscription: saved.orgSubscription,
        emailVerified: saved.emailVerified,
      })
      onSaved(saved)
      showToast({ message: 'Đã cập nhật hồ sơ', type: 'success' })
    } catch (err) {
      const message = err instanceof Error && !(err.name === 'ApiError') ? err.message : getFriendlyErrorMessage(err, 'quest')
      setError(message)
      showToast({ message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="pf-form mt-md space-y-sm border border-outline-variant rounded-xl p-md bg-surface-container-high">
      <h2 className="font-title-md">Chỉnh sửa hồ sơ</h2>
      <label className="block text-sm">
        <span className="text-on-surface-variant">Tên hiển thị</span>
        <input
          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          autoComplete="nickname"
        />
      </label>
      <label className="block text-sm">
        <span className="text-on-surface-variant">Thành phố</span>
        <input
          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={120}
          autoComplete="address-level2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-on-surface-variant">URL ảnh đại diện</span>
        <input
          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
          maxLength={512}
        />
      </label>
      <p className="pf-footnote text-xs text-on-surface-variant">Tên 2–80 ký tự, thành phố tối đa 120 ký tự. Để trống ảnh/thành phố nếu muốn xoá. Ảnh dùng http(s) hoặc đường dẫn nội bộ hợp lệ.</p>
      {error && <p className="pf-notice error" role="alert">{error}</p>}
      <div className="pf-actions">
      <button
        type="submit"
        disabled={saving}
        className="px-md py-sm rounded-lg bg-secondary text-on-secondary font-medium disabled:opacity-60"
      >
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
      <button type="button" disabled={saving} className="pf-button secondary px-md py-sm border border-outline-variant rounded-lg" onClick={() => {
        setDisplayName(profile.displayName); setCity(profile.city ?? ''); setAvatarUrl(profile.avatarUrl ?? ''); setError(''); onCancel?.()
      }}>Hủy thay đổi</button>
      </div>
    </form>
  )
}
