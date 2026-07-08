export type UserRole = 'USER' | 'ORG_MEMBER' | 'ADMIN' | 'TEACHER'
export type UserTier = 'FREE' | 'PREMIUM'
export type OrgSubscription = 'NONE' | 'MICRO' | 'STANDARD' | 'PREMIUM' | 'ORG_BASIC' | 'ORG_PRO'

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
  emailVerified?: boolean
  provider?: 'local' | 'google' | string | null
}

export function needsEmailVerification(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.provider === 'google') return false
  if (user.emailVerified === true) return false
  // Right after confirm, storage is updated before React state commits — avoid redirect loops.
  if (typeof window !== 'undefined' && localStorage.getItem('timelens_email_verified') === '1') {
    return false
  }
  return true
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
  if (v === 'MICRO' || v === 'ORG_BASIC') return 'MICRO'
  if (v === 'STANDARD' || v === 'ORG_PRO') return 'STANDARD'
  if (v === 'PREMIUM') return 'PREMIUM'
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
  '/pricing',
  '/checkout',
  '/join',
  '/admin',
  '/characters',
  '/groups',
  '/mode-select',
  '/verify-email/pending',
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
  if (needsEmailVerification(user)) return '/verify-email/pending'
  if (user.role === 'ADMIN') return '/admin/content'
  if (user.role === 'TEACHER') return '/teacher'
  if (from && from !== '/login' && from !== '/' && from !== '/mode-select' && from !== '/verify-email/pending' && isSafeRedirect(from)) {
    return from
  }
  return '/mode-select'
}

export function getAlreadyLoggedInRedirect(user: AuthUser): string {
  if (needsEmailVerification(user)) return '/verify-email/pending'
  if (user.role === 'ADMIN') return '/admin/content'
  if (user.role === 'TEACHER') return '/teacher'
  return '/home'
}
