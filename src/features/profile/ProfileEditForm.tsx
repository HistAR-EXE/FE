import { useState } from 'react'
import { profileApi, type ProfileMe } from './api'
import { useAuth } from '../../shared/auth/useAuth'
import { useToast } from '../../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'

type Props = {
  profile: ProfileMe
  onSaved: (profile: ProfileMe) => void
}

export function ProfileEditForm({ profile, onSaved }: Props) {
  const { updateUser } = useAuth()
  const { showToast } = useToast()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [city, setCity] = useState(profile.city ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await profileApi.updateMe({
        displayName: displayName.trim(),
        city: city.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      })
      updateUser({
        displayName: saved.displayName,
        avatarUrl: saved.avatarUrl,
        email: saved.email,
        role: saved.role,
      })
      onSaved(saved)
      showToast({ message: 'Đã cập nhật hồ sơ', type: 'success' })
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-md space-y-sm border border-outline-variant rounded-xl p-md bg-surface-container-high">
      <h2 className="font-title-md">Chỉnh sửa hồ sơ</h2>
      <label className="block text-sm">
        <span className="text-on-surface-variant">Tên hiển thị</span>
        <input
          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-on-surface-variant">Thành phố</span>
        <input
          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-on-surface-variant">URL ảnh đại diện</span>
        <input
          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="px-md py-sm rounded-lg bg-secondary text-on-secondary font-medium disabled:opacity-60"
      >
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  )
}
