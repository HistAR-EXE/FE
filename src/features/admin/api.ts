import { getData, getListData, getPageData, httpClient } from '../../shared/api/httpClient'
import type { PageResponse } from '../../shared/api/contracts'

export type AdminContentType = 'DISCOVERY_POINT' | 'ARTIFACT' | 'QUEST'
export type DeleteReasonPreset = 'Sai nguồn' | 'Lỗi kỹ thuật' | 'Trùng nội dung' | 'Yêu cầu pháp lý' | 'Khác'

export type AdminPageQuery = {
  page?: number
  size?: number
  q?: string
  type?: string
  sort?: string
}

export type AdminUserSummary = {
  id: string
  email: string
  displayName: string
  role: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN'
  tier?: 'FREE' | 'PREMIUM' | string
  emailVerified?: boolean
  level: number
  totalPoints: number
  createdAt: string
}

export type AdminOrganizationSummary = {
  id: string
  name: string
  orgType?: string
  planType?: string
  plan?: string
  memberCount?: number
}

export type AdminB2b2cInquiry = {
  id: string
  siteName: string
  contactName: string
  contactEmail: string
  contactPhone: string | null
  packageType: string
  message: string | null
  status: string
  createdAt: string
  interestSiteCode?: string | null
  contactedAt?: string | null
  adminNotes?: string | null
}

export type AdminRecentPayment = {
  id: string
  orderCode: string
  amountVnd: number
  status: string
  payerEmail?: string | null
  createdAt: string
  channel?: string | null
  /** BE AdminRecentB2cPaymentItem fields */
  amount?: number
  userEmail?: string | null
  transferContent?: string | null
  /** UNDERPAID: total received so far */
  receivedAmount?: number
}

export type ReferralStatsItem = {
  code: string
  creatorName: string
  active: boolean
  visits: number | null
  uniqueSessions: number | null
  uniqueUsers: number | null
  lastVisitAt: string | null
  suppressed?: boolean
}

export type PilotKpi = {
  sessionStart: number
  stationArrived: number
  shareInitiated: number
  checkinsLast7Days: number
  sessionEnd: number
  stationCompleted: number
  exportCreated: number
  packLoaded: number
  checkinResult: number
  npsSubmitted: number
  landingVisit: number
  paywallShown: number
  purchaseSuccess: number
  byEventType: Record<string, number>
  suppressed?: boolean
}

export type AdminDiscoveryPoint = {
  id: string
  locationId: string
  name: string
  mapXPct: number | null
  mapYPct: number | null
  yaw?: number | null
  pitch?: number | null
  unlockKey: string
  sortOrder: number
  rowVersion: number
}

export type AdminArtifact = {
  id: string
  locationId: string
  name: string
  imageUrl: string | null
  description: string | null
  unlockKey: string
  reliability: string | null
  sortOrder: number
  rowVersion: number
}

export type AdminQuest = {
  id: string
  locationId: string
  title: string
  description: string | null
  story: string | null
  pointsReward: number
  requiredOrder: number
  completionTrigger?: string | null
  requireOnsiteCheckin?: boolean
  stepsTotal?: number | null
  coverImage?: string | null
  stepDiscoveryKeys?: string | null
  rowVersion: number
}

export type AdminDiscoveryPointInput = {
  locationId: string
  name: string
  unlockKey: string
  mapXPct?: number | null
  mapYPct?: number | null
  yaw?: number | null
  pitch?: number | null
  sortOrder?: number | null
}

export type AdminArtifactInput = {
  locationId: string
  name: string
  unlockKey: string
  imageUrl?: string | null
  description?: string | null
  reliability?: string | null
  sortOrder?: number | null
}

export type AdminQuestInput = {
  locationId: string
  title: string
  description?: string | null
  story?: string | null
  pointsReward?: number | null
  requiredOrder?: number | null
  completionTrigger?: string | null
  requireOnsiteCheckin?: boolean | null
  stepsTotal?: number | null
  coverImage?: string | null
  stepDiscoveryKeys?: string | null
}

export type NarrativeReviewStatus = 'DRAFT' | 'APPROVED' | 'REJECTED'
export type NarrativeRolloutState = 'NOT_RELEASED' | 'ACTIVE' | 'PAUSED'
export type NarrativeNodeType = 'TOUR_360_OBSERVATION' | 'AI_INTERVIEW' | 'SOURCE_COMPARISON' | 'EVIDENCE' | 'OUTCOME'

export type NarrativeChoiceAdmin = { code: string; targetNodeCode: string }
export type NarrativeNodeAdmin = {
  code: string
  type: NarrativeNodeType
  choices: NarrativeChoiceAdmin[]
  title?: string | null
  prompt?: string | null
  actionHref?: string | null
  minimumEvidence?: number | null
  observationChecklist?: string[]
  sourceIds?: string[]
  factLabel?: string | null
  evidenceKey?: string | null
  linkedMinigameId?: string | null
  rewardXp?: number | null
}
export type NarrativeSourceAdmin = {
  sourceId: string
  version: string
  locale: string
  citation: string
  url?: string | null
  path?: string | null
}
export type NarrativeGraphAdmin = {
  startNodeCode: string
  nodes: NarrativeNodeAdmin[]
  evidenceNodeCodes: string[]
  outcomeNodeCodes: string[]
  sources: NarrativeSourceAdmin[]
}

export type NarrativeVersionAdmin = {
  version: number
  revision: number
  rowVersion: number
  lifecycle?: 'DRAFT' | 'PUBLISHED' | string
  reviewStatus: NarrativeReviewStatus | string
  approvedLocales: string[]
  reviewedBy?: string | null
  reviewedAt?: string | null
  graph: NarrativeGraphAdmin
  runtimeRewardFixed?: boolean
  runtimeRewardXp?: number | null
}

export type NarrativePilotAdmin = {
  questId: string
  questTitle: string
  investigationId: string
  locationId?: string | null
  locationName?: string | null
  reviewStatus: NarrativeReviewStatus | string
  rolloutState: NarrativeRolloutState | string
  publishedVersion: number | null
  draftVersion: number | null
  draftReviewStatus?: NarrativeReviewStatus | string | null
  rowVersion: number
  globalFlagEnabled: boolean
}

export type NarrativePilotDetail = NarrativePilotAdmin & {
  published: NarrativeVersionAdmin | null
  draft: NarrativeVersionAdmin | null
  versions?: NarrativeVersionAdmin[]
}

export type NarrativeReadinessItem = {
  code: string
  passed: boolean
  message: string
  nodeCode?: string | null
  field?: string | null
}

export type NarrativeReadiness = {
  questId: string
  draftVersion: number | null
  ready: boolean
  globalFlagEnabled: boolean
  items: NarrativeReadinessItem[]
}

export type NarrativeReview = {
  id?: string
  investigationId: string
  version: number
  revision: number
  decision: 'APPROVED' | 'REJECTED' | string
  approvedLocales: string[]
  reviewedBy: string
  reviewedAt: string
  note: string | null
}

export type NarrativeDraft = NarrativeVersionAdmin

export type NarrativeReviewRequest = {
  version: number
  revision: number
  decision: 'APPROVED' | 'REJECTED'
  approvedLocales: string[]
  note: string
}

export type NarrativeRolloutRequest = {
  version: number
  rowVersion: number
  reasonPreset?: DeleteReasonPreset
  reasonDetail?: string | null
}

export type PoiUnlockRateItem = {
  unlockKey: string
  name: string
  unlockCount: number | null
  unlockRatePct: number | null
  suppressed?: boolean
}

export type QuestFunnelItem = {
  questId: string
  title: string
  started: number | null
  completed: number | null
  completionRatePct: number | null
  completionRule?: string
  suppressed?: boolean
}

export type JourneyDropOffItem = {
  poiName: string
  unlockKey: string
  sessionCount: number | null
  dropOffPct: number | null
  suppressed?: boolean
}

export type PoiHeatmapItem = {
  unlockKey: string
  name: string
  visitCount: number | null
  unlockCount: number | null
  avgDwellMs: number | null
  dropOffHotspot: boolean
  suppressed?: boolean
}

export type OnlineOfflineConversion = {
  usersWithDiscovery: number | null
  usersWithCheckin: number | null
  usersDiscoveryThenCheckin: number | null
  conversionRatePct: number | null
  suppressed?: boolean
}

export type SessionQualityMetrics = {
  avgDurationMinutes: number | null
  avgDiscoveriesPerSession: number | null
  suppressed?: boolean
}

export type AdminAnalyticsOverview = {
  locationId: string
  poiUnlockRates: PoiUnlockRateItem[]
  questFunnel: QuestFunnelItem[]
  onlineToOnsite: OnlineOfflineConversion
  journeyDropOff: JourneyDropOffItem[]
  poiHeatmap: PoiHeatmapItem[]
  sessionQuality: SessionQualityMetrics
  questCompletedCount?: number
  journeyNote: string
  privacyThreshold?: number
  questCompletedSuppressed?: boolean
}

export type AdminDeleteImpact = {
  resourceType: AdminContentType
  resourceId: string
  deletable: boolean
  blockers: AdminDeleteImpactItem[]
  warnings: AdminDeleteImpactItem[]
}

export type AdminDeleteImpactItem = {
  code: string
  count: number
  message: string
}

export type AdminDeleteRequest = {
  reasonPreset: DeleteReasonPreset
  reasonDetail?: string | null
  rowVersion: number
  idempotencyKey: string
}

export type AdminRestoreRequest = {
  rowVersion: number
  idempotencyKey: string
}

export type AdminTrashItem = {
  resourceType: AdminContentType
  id: string
  locationId?: string | null
  name: string
  deletedBy: string
  deleteReason: string
  deletedAt: string
  rowVersion: number
}

export type AdminAuditEvent = {
  id: string
  actorId: string
  actorName?: string | null
  entityType: string
  entityId: string
  action: string
  oldRowVersion?: number | null
  newRowVersion?: number | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
  occurredAt: string
}

export type AdminDashboardSummary = {
  activePilots: number
  draftCount: number
  reviewPendingCount: number
  trashCount: number
  contentReportsLast30Days: number
}

export type OrganizationAnalytics = {
  organizationId: string
  name: string
  orgType: string
  memberCount: number
  completionRatePct: number
  fullTourRatePct: number
  note: string
}

export type AdminBillingSettings = {
  b2cPremiumPriceVnd: number
  chatFreeDailyLimit: number
  orgVolumeDiscountPercent: number
  orgVolumeDiscountMinLicenses: number
  bankCode: string
  accountNumber: string
  accountName: string
  qrTemplate: string
  qrShowInfo: boolean
  updatedAt: string | null
}

export type AdminStationBlock = {
  id: string
  blockType: string
  title: string | null
  body: string | null
  mediaUrl: string | null
  sortOrder: number
  metaJson: string | null
}

export type AdminStation = {
  id: string
  siteCode: string
  code: string
  name: string
  sortOrder: number
  lat: number | null
  lng: number | null
  questStepKey: string | null
  active: boolean
  blocks: AdminStationBlock[]
}

export type AdminContentReport = {
  id: string
  stationCode: string | null
  sessionId: string | null
  payload: string
  occurredAt: string
  statusHint: 'NEW' | 'REVIEWED' | string
}

export type AdminStationImportItem = {
  code: string
  name: string
  sortOrder?: number
  lat?: number | null
  lng?: number | null
  questStepKey?: string | null
  active?: boolean
  blocks?: Array<{
    blockType: string
    title?: string | null
    body?: string | null
    mediaUrl?: string | null
    sortOrder?: number
    metaJson?: string | null
  }>
}

export type AdminStationQrToken = {
  stationCode: string
  timestamp: number
  signature: string
  payload: string
  signed: boolean
}

export const adminApi = {
  listUsers: (page = 0, size = 20) =>
    getPageData<AdminUserSummary>(httpClient.get('/api/admin/users', { params: { page, size } })),
  updateRole: (userId: string, role: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN') =>
    getData<AdminUserSummary>(httpClient.patch(`/api/admin/users/${userId}/role`, { role })),

  listDiscoveryPoints: (locationId?: string) =>
    getData<AdminDiscoveryPoint[]>(
      httpClient.get('/api/admin/discovery-points', { params: locationId ? { locationId } : {} }),
    ),
  listDiscoveryPointsPage: (locationId: string | undefined, query: AdminPageQuery = {}) =>
    getPageData<AdminDiscoveryPoint>(httpClient.get('/api/admin/discovery-points', {
      params: { locationId, page: query.page ?? 0, size: query.size ?? 20, q: query.q, sort: query.sort },
    })),
  listArtifacts: (locationId?: string) =>
    getData<AdminArtifact[]>(
      httpClient.get('/api/admin/artifacts', { params: locationId ? { locationId } : {} }),
    ),
  listArtifactsPage: (locationId: string | undefined, query: AdminPageQuery = {}) =>
    getPageData<AdminArtifact>(httpClient.get('/api/admin/artifacts', {
      params: { locationId, page: query.page ?? 0, size: query.size ?? 20, q: query.q, sort: query.sort },
    })),
  listQuests: (locationId?: string) =>
    getData<AdminQuest[]>(httpClient.get('/api/admin/quests', { params: locationId ? { locationId } : {} })),
  listQuestsPage: (locationId: string | undefined, query: AdminPageQuery = {}) =>
    getPageData<AdminQuest>(httpClient.get('/api/admin/quests', {
      params: { locationId, page: query.page ?? 0, size: query.size ?? 20, q: query.q, sort: query.sort },
    })),

  createDiscoveryPoint: (body: AdminDiscoveryPointInput) =>
    getData<AdminDiscoveryPoint>(httpClient.post('/api/admin/discovery-points', body)),
  updateDiscoveryPoint: (id: string, body: AdminDiscoveryPointInput, rowVersion: number) =>
    getData<AdminDiscoveryPoint>(httpClient.patch(`/api/admin/discovery-points/${id}`, { ...body, rowVersion })),

  createArtifact: (body: AdminArtifactInput) =>
    getData<AdminArtifact>(httpClient.post('/api/admin/artifacts', body)),
  updateArtifact: (id: string, body: AdminArtifactInput, rowVersion: number) =>
    getData<AdminArtifact>(httpClient.patch(`/api/admin/artifacts/${id}`, { ...body, rowVersion })),

  createQuest: (body: AdminQuestInput) =>
    getData<AdminQuest>(httpClient.post('/api/admin/quests', body)),
  updateQuest: (id: string, body: AdminQuestInput, rowVersion: number) =>
    getData<AdminQuest>(httpClient.patch(`/api/admin/quests/${id}`, { ...body, rowVersion })),

  deleteImpact: (type: AdminContentType, id: string) =>
    getData<AdminDeleteImpact>(httpClient.get(`/api/admin/${contentPath(type)}/${id}/delete-impact`)),
  softDeleteContent: (type: AdminContentType, id: string, body: AdminDeleteRequest) =>
    getData<void>(httpClient.delete(`/api/admin/${contentPath(type)}/${id}`, { data: body })),
  restoreContent: (type: AdminContentType, id: string, body: AdminRestoreRequest) =>
    getData<void>(httpClient.post(`/api/admin/${contentPath(type)}/${id}/restore`, body)),
  listTrash: (query: AdminPageQuery = {}) =>
    getPageData<AdminTrashItem>(httpClient.get('/api/admin/trash', {
      params: {
        page: query.page,
        size: query.size,
        type: query.type || undefined,
        search: query.q || undefined,
        sort: query.sort || undefined,
      },
    })),
  listAudit: (query: AdminPageQuery & { entityType?: string; entityId?: string; actorId?: string; action?: string; from?: string; to?: string } = {}) =>
    getPageData<AdminAuditEvent>(httpClient.get('/api/admin/audit', {
      params: {
        page: query.page,
        size: query.size,
        entityType: query.entityType || query.type || undefined,
        entityId: query.entityId || query.q || undefined,
        actorId: query.actorId || undefined,
        action: query.action || undefined,
        from: query.from || undefined,
        to: query.to || undefined,
        sort: query.sort || undefined,
      },
    })),

  analyticsOverview: (locationId: string) =>
    getData<AdminAnalyticsOverview>(
      httpClient.get('/api/admin/analytics/overview', { params: { locationId } }),
    ),

  organizationAnalytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/admin/organizations/${orgId}/analytics`)),

  listOrganizations: () =>
    getData<AdminOrganizationSummary[]>(httpClient.get('/api/admin/organizations')),

  listB2b2cInquiries: () =>
    getData<AdminB2b2cInquiry[]>(httpClient.get('/api/admin/b2b2c-inquiries')),

  updateB2b2cInquiryStatus: (id: string, status: string, adminNotes?: string | null) =>
    getData<AdminB2b2cInquiry>(
      httpClient.patch(`/api/admin/b2b2c-inquiries/${id}`, { status, adminNotes }),
    ),

  listRecentPayments: (limit = 20) =>
    getData<AdminRecentPayment[]>(
      httpClient.get('/api/admin/billing/payments/recent', { params: { limit } }),
    ),

  listPaymentsByStatus: (status: string, limit = 50) =>
    getData<AdminRecentPayment[]>(
      httpClient.get('/api/admin/billing/payments', { params: { status, limit } }),
    ),

  pilotKpi: () => getData<PilotKpi>(httpClient.get('/api/admin/analytics/pilot-kpi')),

  listContentReports: (days = 30, limit = 50) =>
    getData<AdminContentReport[]>(
      httpClient.get('/api/admin/content-reports', { params: { days, limit } }),
    ),

  referralStats: (days = 30) =>
    getListData<ReferralStatsItem>(httpClient.get('/api/admin/referral/stats', { params: { days } })),

  listStations: (siteCode = 'cu-chi') =>
    getListData<AdminStation>(httpClient.get(`/api/sites/${encodeURIComponent(siteCode)}/stations`)),

  importStations: (siteCode: string, body: AdminStationImportItem[]) =>
    getListData<AdminStation>(
      httpClient.post(`/api/admin/sites/${encodeURIComponent(siteCode)}/stations/import`, body),
    ),

  stationQrToken: (code: string, siteCode = 'cu-chi', staticQr = true) =>
    getData<AdminStationQrToken>(
      httpClient.get(`/api/admin/stations/${encodeURIComponent(code)}/qr-token`, {
        params: { siteCode, static: staticQr },
      }),
    ),

  getBillingSettings: () =>
    getData<AdminBillingSettings>(httpClient.get('/api/admin/billing/settings')),
  updateBillingSettings: (body: {
    b2cPremiumPriceVnd?: number
    chatFreeDailyLimit?: number
    orgVolumeDiscountPercent?: number
    orgVolumeDiscountMinLicenses?: number
  }) =>
    getData<AdminBillingSettings>(httpClient.patch('/api/admin/billing/settings', body)),

  eraCount: (locationId: string) =>
    getData<{ eraCount: number; sufficient: boolean }>(
      httpClient.get(`/api/admin/locations/${locationId}/era-count`),
    ),

  listNarrativePilots: (query: { page?: number; size?: number; q?: string; reviewStatus?: string; rolloutState?: string; sort?: string } = {}) =>
    getPageData<NarrativePilotAdmin>(httpClient.get('/api/admin/narrative-investigations', { params: query })),
  narrativeDetail: (questId: string) =>
    getData<NarrativePilotDetail>(httpClient.get(`/api/admin/narrative-investigations/${questId}`)),
  narrativeReadiness: (questId: string, draftVersion?: number | null) =>
    getData<NarrativeReadiness>(httpClient.get(`/api/admin/narrative-investigations/${questId}/readiness`, {
      params: draftVersion == null ? {} : { draftVersion },
    })),
  createNarrativeDraft: (questId: string, body: { rowVersion: number }) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/drafts`, body)),
  updateNarrativeDraft: (questId: string, draftVersion: number, body: { rowVersion: number; graph: NarrativeGraphAdmin }) =>
    getData<NarrativePilotDetail>(httpClient.patch(`/api/admin/narrative-investigations/${questId}/drafts/${draftVersion}`, body)),
  reviewNarrative: (questId: string, body: NarrativeReviewRequest) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/reviews`, body)),
  enableNarrative: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/enable`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  pauseNarrative: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/pause`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  resumeNarrative: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/resume`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  publishNarrativeDraft: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/publish-draft`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  narrativeAudit: (questId: string) =>
    getListData<AdminAuditEvent>(httpClient.get(`/api/admin/narrative-investigations/${questId}/audit`)),

  dashboardSummary: () =>
    getData<AdminDashboardSummary>(httpClient.get('/api/admin/dashboard')),
}

export type { PageResponse }

function contentPath(type: AdminContentType) {
  if (type === 'DISCOVERY_POINT') return 'discovery-points'
  if (type === 'ARTIFACT') return 'artifacts'
  return 'quests'
}
