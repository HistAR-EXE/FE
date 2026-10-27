import { createContext, useContext } from 'react'
import type { OrgBillingStatus, OrgCapabilities, OrgMembership } from './api'

export type TeacherWorkspace = {
  orgId: string
  setOrgId: (value: string) => void
  memberships: OrgMembership[]
  capabilities: OrgCapabilities | null
  billing: OrgBillingStatus | null
  reload: () => void
}

export const TeacherWorkspaceContext = createContext<TeacherWorkspace | null>(null)

export function useTeacherWorkspace() {
  const value = useContext(TeacherWorkspaceContext)
  if (!value) throw new Error('TeacherWorkspace context is required')
  return value
}
