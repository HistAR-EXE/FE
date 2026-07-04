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

export const orgApi = {
  mine: () => getData<OrgMembership[]>(httpClient.get('/api/org/mine')),
  analytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/org/${orgId}/analytics`)),
  roster: (orgId: string) => getData<OrgRosterMember[]>(httpClient.get(`/api/org/${orgId}/roster`)),
}
