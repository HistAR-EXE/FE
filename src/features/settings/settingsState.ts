import type { ProfileMe } from '../profile/api'
export function settingsUserPatch(p: Pick<ProfileMe, 'displayName'|'email'|'avatarUrl'|'role'|'tier'|'orgId'|'orgName'|'orgRole'|'orgSubscription'|'emailVerified'>) {
  return { displayName:p.displayName,email:p.email,avatarUrl:p.avatarUrl,role:p.role,tier:p.tier,orgId:p.orgId,orgName:p.orgName,orgRole:p.orgRole,orgSubscription:p.orgSubscription,emailVerified:p.emailVerified }
}
export function canAutoJoin(a: { enabled:boolean; userId:string; code:string; loaded:boolean; orgId:string|null; busy:boolean; attempted:string|null }) {
  return !!(a.enabled && a.userId && a.code.trim() && a.loaded && !a.orgId && !a.busy && a.attempted !== `${a.userId}:${a.code.trim()}`)
}
export function canUseOrganizationGroups(plan:string, active:boolean) { return active && ['STANDARD','PREMIUM'].includes(plan) }
export function personalAccessLabel(tier:string|null) { return tier === null ? 'Chưa tải được quyền cá nhân' : tier === 'PREMIUM' ? 'Premium cá nhân' : 'Miễn phí' }
