import { getData, httpClient } from '../../shared/api/httpClient'
import type { OrganizationAnalytics } from '../admin/api'

export type OrgMembership = {
  organizationId: string
  name: string
  orgRole: string
}

export type OrgRosterMember = {
  userId: string
  displayName: string
  email: string
  orgRole: string
  level: number
  totalPoints: number
  questsCompleted: number
}

export type OrgInviteCode = {
  inviteCode: string
  expiresAt: string
  organizationId: string
}

export type JoinOrgResult = {
  organizationId: string
  organizationName: string
  orgRole: string
  platformRole: string
}

export const orgApi = {
  mine: () => getData<OrgMembership[]>(httpClient.get('/api/org/mine')),
  analytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/org/${orgId}/analytics`)),
  roster: (orgId: string) => getData<OrgRosterMember[]>(httpClient.get(`/api/org/${orgId}/roster`)),
  getInviteCode: (orgId: string) => getData<OrgInviteCode>(httpClient.get(`/api/org/${orgId}/invite-code`)),
  generateInviteCode: (orgId: string) => getData<OrgInviteCode>(httpClient.post(`/api/org/${orgId}/invite-code`)),
  join: (inviteCode: string) => getData<JoinOrgResult>(httpClient.post('/api/org/join', { inviteCode })),
  leave: () => getData<void>(httpClient.post('/api/org/leave', { confirm: true })),
}
