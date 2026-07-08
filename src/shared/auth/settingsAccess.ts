import type { UserRole, UserTier } from './types'

export type SettingsSection = 'profile' | 'classroom' | 'teacher' | 'premium' | 'logout'

export function getSettingsSections(
  role: UserRole,
  _tier: UserTier,
  orgId: string | null,
): SettingsSection[] {
  const sections: SettingsSection[] = ['profile']

  if (role === 'USER' || role === 'ORG_MEMBER') {
    sections.push('classroom')
    if (!orgId) {
      sections.push('premium')
    }
  }

  if (role === 'TEACHER') {
    sections.push('teacher')
  }

  sections.push('logout')
  return sections
}
