export type ProfileDetails = {
  fullName?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  phone?: string | null
  bio?: string | null
  school?: string | null
  className?: string | null
  specialty?: string | null
}
export function validateAvatarFile(file: { type: string; size: number }) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.')
  if (file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error('Ảnh phải có dung lượng lớn hơn 0 và tối đa 5 MB.')
}
export function validateProfileDetails(details: ProfileDetails) {
  const result = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value?.trim() ?? ''])) as Record<keyof ProfileDetails, string>
  for (const [key, limit] of Object.entries({fullName:120, phone:25, bio:1000, school:200, className:80, specialty:200})) {
    if ((result[key as keyof ProfileDetails]?.length ?? 0) > limit) throw new Error(`Thông tin vượt quá ${limit} ký tự.`)
  }
  if (result.phone && !/^[+0-9][0-9 ()-]{6,24}$/.test(result.phone)) throw new Error('Số điện thoại không hợp lệ (7–25 ký tự).')
  if (result.gender && !['MALE','FEMALE','OTHER','UNDISCLOSED'].includes(result.gender)) throw new Error('Giới tính không hợp lệ.')
  if (result.dateOfBirth) {
    const date = new Date(`${result.dateOfBirth}T00:00:00`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.dateOfBirth) || Number.isNaN(date.getTime()) || `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` !== result.dateOfBirth || date > new Date()) throw new Error('Ngày sinh phải hợp lệ và không nằm trong tương lai.')
  }
  return result
}
