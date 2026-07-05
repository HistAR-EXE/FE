export type UserRole = 'USER' | 'ORG_MEMBER' | 'ADMIN' | 'TEACHER'
export type UserTier = 'FREE' | 'PREMIUM'
export type OrgSubscription = 'NONE' | 'ORG_BASIC' | 'ORG_PRO'

export type AuthUser = {
  id: string
  displayName: string
  email: string
  role: UserRole
  tier: UserTier
  orgId: string | null
  orgSubscription: OrgSubscription
  orgName?: string | null
  orgRole?: string | null
  avatarUrl: string | null
}

export function normalizeRole(raw?: string | null): UserRole {
  const r = raw?.replace(/^ROLE_/i, '').trim().toUpperCase()
  if (r === 'ADMIN') return 'ADMIN'
  if (r === 'TEACHER') return 'TEACHER'
  if (r === 'ORG_MEMBER') return 'ORG_MEMBER'
  return 'USER'
}

export function normalizeTier(raw?: string | null): UserTier {
  const t = raw?.trim().toUpperCase()
  return t === 'PREMIUM' ? 'PREMIUM' : 'FREE'
}

export function normalizeOrgSubscription(raw?: string | null): OrgSubscription {
  const v = raw?.trim().toUpperCase()
  if (v === 'ORG_BASIC') return 'ORG_BASIC'
  if (v === 'ORG_PRO') return 'ORG_PRO'
  return 'NONE'
}

const SAFE_REDIRECT_PREFIXES = [
  '/home',
  '/explore',
  '/quests',
  '/artifacts',
  '/profile',
  '/settings',
  '/leaderboard',
  '/time-portal',
  '/tour',
  '/heritage',
  '/chat',
  '/scan',
  '/photo-frame',
  '/teacher',
  '/admin',
  '/characters',
  '/groups',
] as const

export function isSafeRedirect(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false
  return SAFE_REDIRECT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === 'ADMIN'
}

export function isTeacher(user: AuthUser | null | undefined): boolean {
  return user?.role === 'TEACHER' || user?.role === 'ADMIN'
}

export function isOrgMember(user: AuthUser | null | undefined): boolean {
  return user?.role === 'ORG_MEMBER' || isTeacher(user)
}

export function isPremium(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  return user.tier === 'PREMIUM' || user.role === 'ADMIN' || user.role === 'TEACHER'
}

export function getPostLoginRedirect(user: AuthUser, from?: string | null): string {
  if (user.role === 'ADMIN') return '/admin/content'
  if (user.role === 'TEACHER') return '/teacher'
  if (from && from !== '/login' && from !== '/' && from !== '/mode-select' && isSafeRedirect(from)) {
    return from
  }
  return '/mode-select'
}

export function getAlreadyLoggedInRedirect(user: AuthUser): string {
  if (user.role === 'ADMIN') return '/admin/content'
  if (user.role === 'TEACHER') return '/teacher'
  return '/home'
}
