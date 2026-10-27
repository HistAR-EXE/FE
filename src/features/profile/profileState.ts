export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length ? `${words[0][0]}${words.length > 1 ? words[words.length - 1][0] : ''}`.toLocaleUpperCase('vi-VN') : 'TL'
}

export function safeProfileImage(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.includes('\\') || [...trimmed].some(char => char.charCodeAt(0) <= 32)) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const url = new URL(trimmed)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? trimmed : null
  } catch { return null }
}

export function metricValue<K extends string>(stats: Partial<Record<K, number>> | null | undefined, key: K): number | null {
  const value = stats?.[key]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function stampsForLocation<T extends { locationId: string }>(stamps: T[], locationId: string): T[] {
  return locationId ? stamps.filter(stamp => stamp.locationId === locationId) : stamps
}

export function premiumSources(personalTier: string, organizationPremium: boolean): Array<'personal' | 'organization'> {
  return [...(personalTier === 'PREMIUM' ? ['personal' as const] : []), ...(organizationPremium ? ['organization' as const] : [])]
}

export function validateProfileEdit(displayName: string, city: string, avatarUrl: string) {
  const name = displayName.trim(), town = city.trim(), image = avatarUrl.trim()
  if (name.length < 2 || name.length > 80) throw new Error('Tên hiển thị cần có 2–80 ký tự.')
  if (town.length > 120) throw new Error('Thành phố tối đa 120 ký tự.')
  if (image.length > 512 || (image && !safeProfileImage(image))) throw new Error('Đường dẫn ảnh phải là URL http(s) hoặc đường dẫn /media hợp lệ, tối đa 512 ký tự.')
  return { displayName: name, city: town, avatarUrl: image }
}

export function profileDate(value: string | null | undefined, withTime = false): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Chưa có dữ liệu'
  return new Intl.DateTimeFormat('vi-VN', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value))
}

export function roleLabel(role: string | null | undefined): string {
  return ({ ADMIN: 'Quản trị viên', TEACHER: 'Giáo viên', ORG_MEMBER: 'Thành viên tổ chức', USER: 'Thành viên' } as Record<string, string>)[role || ''] || 'Thành viên'
}
