import { getData, httpClient } from '../../shared/api/httpClient'

export type GroupSummary = {
  id: string
  name: string
  code: string
  expiresAt: string
  memberCount: number
  orgId?: string | null
  questId?: string | null
}

export type GroupMember = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export type GroupDetail = {
  id: string
  name: string
  code: string
  members: GroupMember[]
}

export type GroupMemberQuestProgress = {
  userId: string
  displayName: string
  status: string
  currentStep: number
  stepsTotal: number
  progressPercent: number
}

export type GroupQuestProgress = {
  questId: string
  questTitle: string
  members: GroupMemberQuestProgress[]
}

export type GroupProgress = {
  quests: GroupQuestProgress[]
}

export const groupApi = {
  mine: () => getData<GroupSummary[]>(httpClient.get('/api/groups/mine')),
  create: (name: string) => getData<GroupSummary>(httpClient.post('/api/groups', { name })),
  join: (code: string) => getData<GroupSummary>(httpClient.post('/api/groups/join', { code })),
  assignQuest: (groupId: string, questId: string) =>
    getData<GroupSummary>(httpClient.post(`/api/groups/${groupId}/assign-quest`, { questId })),
  detail: (groupId: string) => getData<GroupDetail>(httpClient.get(`/api/groups/${groupId}`)),
  progress: (groupId: string) => getData<GroupProgress>(httpClient.get(`/api/groups/${groupId}/progress`)),
}
