import { validateAvatarFile, validateProfileDetails, type ProfileDetails } from './profileDetails'
import { avatarInitials } from './profileState'
// src/features/profile/ProfileEditForm.tsx
import { useEffect, useState } from 'react'
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
  const [details, setDetails] = useState<ProfileDetails>(() => Object.fromEntries(['fullName','dateOfBirth','gender','phone','bio','school','className','specialty'].map(key => [key, profile[key as keyof ProfileDetails] ?? ''])))
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState(0)
  useEffect(() => {
    if (!avatarFile) return
    const url = URL.createObjectURL(avatarFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])
  const field = (key: keyof ProfileDetails, label: string, maxLength: number, type = 'text', autoComplete?: string) => <label className="block text-sm"><span className="text-on-surface-variant">{label}</span><input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm" type={type} autoComplete={autoComplete} max={type === 'date' ? `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}` : undefined} maxLength={maxLength} value={details[key] ?? ''} onChange={e => setDetails(current => ({...current, [key]: e.target.value}))} /></label>
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...validateProfileEdit(displayName, city, avatarUrl), ...validateProfileDetails(details) }
      if (avatarFile) payload.avatarUrl = (await profileApi.uploadAvatar(avatarFile)).avatarUrl
      const saved = await profileApi.updateMe(payload)
      setAvatarFile(null); setPreview(null)
      setAvatarUrl(saved.avatarUrl ?? '')
      setFileKey(key => key + 1)
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
          disabled={saving}
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
          disabled={saving}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={120}
          autoComplete="address-level2"
        />
      </label>
      <fieldset className="pf-avatar-editor" disabled={saving}>
        <legend>Ảnh đại diện</legend>
        <div className="pf-avatar-editor-row">
          <div className="pf-avatar-preview">{(preview || avatarUrl) ? <img src={preview || avatarUrl} alt="Xem trước ảnh đại diện" /> : <span>{avatarInitials(displayName)}</span>}</div>
          <div><label className="block text-sm"><span>Chọn ảnh từ thiết bị</span><input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            try { validateAvatarFile(file); setAvatarFile(file); setError('') }
            catch (err) { setError((err as Error).message); e.target.value = '' }
          }} /></label><p className="pf-footnote">JPG, PNG hoặc WebP · Tối đa 5 MB. Ảnh được tải lên khi lưu thay đổi.</p>
          {(avatarFile || avatarUrl) && <button className="pf-button secondary" type="button" onClick={() => { setAvatarFile(null); setPreview(null); setAvatarUrl(''); setFileKey(key => key + 1) }}>Xóa ảnh đại diện</button>}</div>
        </div>
      </fieldset>
      <fieldset className="pf-detail-fields" disabled={saving}><legend>Thông tin cá nhân <small>(không bắt buộc)</small></legend>
        {field('fullName', 'Họ và tên', 120, 'text', 'name')}
        {field('dateOfBirth', 'Ngày sinh', 10, 'date', 'bday')}
        <label className="block text-sm"><span>Giới tính</span><select className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm" value={details.gender ?? ''} onChange={e => setDetails(current => ({...current, gender:e.target.value}))}><option value="">Chưa cập nhật</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option><option value="UNDISCLOSED">Không chia sẻ</option></select></label>
        {field('phone', 'Số điện thoại', 25, 'tel', 'tel')}
        <label className="block text-sm pf-detail-wide"><span>Giới thiệu ngắn</span><textarea className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-md py-sm" rows={3} maxLength={1000} value={details.bio ?? ''} onChange={e => setDetails(current => ({...current, bio:e.target.value}))} /><small>{details.bio?.length ?? 0}/1000 ký tự</small></label>
      </fieldset>
      <fieldset className="pf-detail-fields" disabled={saving}><legend>Học tập & công tác <small>(không bắt buộc)</small></legend>
        {field('school', 'Trường / Đơn vị công tác', 200, 'text', 'organization')}
        {profile.role === 'TEACHER' ? field('specialty', 'Chuyên môn giảng dạy', 200) : field('className', 'Khối / Lớp', 80)}
      </fieldset>
      <p className="pf-footnote text-xs text-on-surface-variant">Tên hiển thị cần có 2–80 ký tự. Các thông tin bổ sung là tùy chọn; có thể để trống để xóa.</p>
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
        setDetails(Object.fromEntries(['fullName','dateOfBirth','gender','phone','bio','school','className','specialty'].map(key => [key, profile[key as keyof ProfileDetails] ?? '']))); setAvatarFile(null); setPreview(null); setFileKey(key => key + 1); setDisplayName(profile.displayName); setCity(profile.city ?? ''); setAvatarUrl(profile.avatarUrl ?? ''); setError(''); onCancel?.()
      }}>Hủy thay đổi</button>
      </div>
    </form>
  )
}
