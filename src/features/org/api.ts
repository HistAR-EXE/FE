import { getData, httpClient } from '../../shared/api/httpClient'
import type { OrganizationAnalytics } from '../admin/api'

export type OrgMembership = {
  organizationId: string
  name: string
  orgRole: string
}

export type OrgQuestProgressItem = {
  questId: string
  title: string
  completionPct: number
}

export type OrgRosterMember = {
  userId: string
  displayName: string
  email: string
  orgRole: string
  level: number
  totalPoints: number
  questsCompleted: number
  questProgress?: OrgQuestProgressItem[]
}

export type OrgInviteCode = {
  inviteCode: string
  expiresAt: string
  organizationId: string
  inviteUrl?: string
}

export type OrgBillingStatus = {
  organizationId: string
  orgName: string
  planType: string
  endDate: string | null
  isActive: boolean
  aiQueriesUsed: number
  aiQueriesLimit: number | null
  quotaResetsOn: string | null
  verifiedAccounts: number
  maxVerifiedAccounts: number
  accountLimitReached: boolean
  ccuCurrent: number
  maxCcu: number
  ccuLimitReached: boolean
  daysUntilExpiry: number
}

export type JoinOrgResult = {
  organizationId: string
  organizationName: string
  orgRole: string
  platformRole: string
}

export type ProvisionStudentResult = {
  userId: string
  email: string
  displayName: string
  accountCreated: boolean
  credentialsEmailed: boolean
  temporaryPassword?: string | null
}

export const orgApi = {
  mine: () => getData<OrgMembership[]>(httpClient.get('/api/org/mine')),
  analytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/org/${orgId}/analytics`)),
  roster: (orgId: string) => getData<OrgRosterMember[]>(httpClient.get(`/api/org/${orgId}/roster`)),
  getInviteCode: (orgId: string) => getData<OrgInviteCode>(httpClient.get(`/api/org/${orgId}/invite-code`)),
  generateInviteCode: (orgId: string) => getData<OrgInviteCode>(httpClient.post(`/api/org/${orgId}/invite-code`)),
  dashboardStats: (orgId: string) =>
    getData<OrgBillingStatus>(httpClient.get(`/api/org/${orgId}/dashboard-stats`)),
  myOrg: () => getData<OrgBillingStatus>(httpClient.get('/api/org/me')),
  quota: () => getData<OrgBillingStatus>(httpClient.get('/api/org/quota')),
  join: (inviteCode: string) => getData<JoinOrgResult>(httpClient.post('/api/org/join', { inviteCode })),
  sendInviteEmail: (orgId: string, payload: { studentEmail: string; studentName?: string }) =>
    getData<void>(httpClient.post(`/api/org/${orgId}/invite-email`, payload)),
  provisionStudent: (
    orgId: string,
    payload: { email: string; displayName?: string; sendCredentialsEmail?: boolean },
  ) => getData<ProvisionStudentResult>(httpClient.post(`/api/org/${orgId}/students/provision`, payload)),
  leave: () => getData<void>(httpClient.post('/api/org/leave', { confirm: true })),
  removeMember: (userId: string) => getData<void>(httpClient.delete(`/api/org/members/${userId}`)),
}
