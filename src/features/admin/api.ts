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

export type AdminUserQuery = AdminPageQuery & {
  role?: string
  tier?: string
  verified?: string
}

export type AdminOrganizationQuery = AdminPageQuery & {
  plan?: string
  status?: string
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
  status?: string | null
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
  questCompletedCount?: number | null
  journeyNote: string
  privacyThreshold?: number
  questCompletedSuppressed?: boolean
  activeUsers?: number | null
  eventCount?: number | null
  activitySuppressed?: boolean
  referralUsers?: number | null
  referralSuppressed?: boolean
}

export type ActivitySeriesPoint = {
  bucketStart: string
  activeUsers: number | null
  eventCount: number | null
  suppressed: boolean
}

export type ActivitySeries = {
  locationId: string | null
  range: string
  bucket: string
  privacyThreshold: number
  series: ActivitySeriesPoint[]
}

export type ActivityHeatmapCell = {
  dayIndex: number
  slotIndex: number
  activeUsers: number | null
  eventCount: number | null
  intensity: number
  suppressed: boolean
}

export type ActivityHeatmap = {
  locationId: string | null
  range: string
  privacyThreshold: number
  dayLabels: string[]
  slotLabels: string[]
  cells: ActivityHeatmapCell[]
  peakMorningLabel: string
  peakAfternoonLabel: string
  daysWithData: number
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
  deletedByName?: string | null
  deleteReason: string
  deletedAt: string
  rowVersion: number
}

export type AdminAuditEvent = {
  id: string
  actorId: string
  /** Prefer FE name; BE may send actorDisplayName */
  actorName?: string | null
  actorDisplayName?: string | null
  /** Prefer FE name; BE may send actorEmail (already masked) */
  actorEmailMasked?: string | null
  actorEmail?: string | null
  entityType: string
  entityId: string
  action: string
  oldRowVersion?: number | null
  newRowVersion?: number | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  occurredAt: string
}

export function normalizeAdminAuditEvent(event: AdminAuditEvent): AdminAuditEvent {
  const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : null
  const before =
    event.before ??
    (metadata && typeof metadata.before === 'object' && metadata.before
      ? (metadata.before as Record<string, unknown>)
      : null)
  const after =
    event.after ??
    (metadata && typeof metadata.after === 'object' && metadata.after
      ? (metadata.after as Record<string, unknown>)
      : null)
  return {
    ...event,
    actorName: event.actorName ?? event.actorDisplayName ?? null,
    actorEmailMasked: event.actorEmailMasked ?? event.actorEmail ?? null,
    before,
    after,
    metadata,
  }
}

export type AdminDashboardSummary = {
  activePilots: number
  draftCount: number
  reviewPendingCount: number
  trashCount: number
  contentReportsLast30Days: number
}

export type AdminRevenueMonth = {
  month: string
  b2cRevenueVnd: number
  b2bRevenueVnd: number
}

export type AdminPlanRevenue = {
  plan: string
  description?: string | null
  revenueVnd: number
}

export type AdminBillingOverview = {
  actualRevenueMonthVnd: number
  previousMonthRevenueVnd?: number | null
  monthOverMonthPct: number | null
  estimatedMrrVnd: number
  estimatedArrVnd: number
  revenueCoveragePct: number | null
  activePaidSubscriptions: number
  updatedAt: string
  monthlyRevenue: AdminRevenueMonth[]
  planRevenue: AdminPlanRevenue[]
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

export type AdminOrganizationInput = {
  name: string
  planType?: string
  contactEmail?: string
  status?: string
  opsNote?: string
}

export type AdminOrgInvite = {
  inviteCode: string
  expiresAt: string | null
  organizationId: string
  inviteUrl: string
}

export type AdminOrgMemberResult = {
  userId: string
  email: string
  displayName: string
  accountCreated: boolean
  credentialsEmailed: boolean
  temporaryPassword?: string | null
}

export type AdminRosterImportResult = {
  created: number
  enrolled: number
  skipped: number
  errors: string[]
}

export type AdminCreateUserInput = {
  email: string
  displayName?: string
  role?: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN'
  sendCredentialsEmail?: boolean
}

export type AdminCreateUserResult = {
  id: string
  email: string
  displayName: string
  role: string
  accountCreated: boolean
  credentialsEmailed: boolean
  temporaryPassword?: string | null
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
  id?: string
  eventId: string
  stationCode: string | null
  sessionId: string | null
  payload: string
  occurredAt: string
  status: 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED' | 'REVIEWED' | string
  statusHint?: 'NEW' | 'REVIEWED' | string
  adminNote?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  rowVersion: number
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
  listUsers: (query: AdminUserQuery | number = {}, legacySize = 20) => {
    const params = typeof query === 'number' ? { page: query, size: legacySize } : query
    return getPageData<AdminUserSummary>(httpClient.get('/api/admin/users', { params }))
  },
  createUser: (body: AdminCreateUserInput) =>
    getData<AdminCreateUserResult>(httpClient.post('/api/admin/users', body)),
  updateRole: (userId: string, role: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN', reason: string, expectedRole: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN') =>
    getData<AdminUserSummary>(httpClient.patch(`/api/admin/users/${userId}/role`, { role, reason, expectedRole })),

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
  listAudit: (query: AdminPageQuery & { entityType?: string; entityId?: string; actor?: string; actorId?: string; action?: string; from?: string; to?: string } = {}) =>
    getPageData<AdminAuditEvent>(httpClient.get('/api/admin/audit', {
      params: {
        page: query.page,
        size: query.size,
        entityType: query.entityType || query.type || undefined,
        entityId: query.entityId || query.q || undefined,
        actor: query.actor || query.actorId || undefined,
        action: query.action || undefined,
        from: query.from || undefined,
        to: query.to || undefined,
        sort: query.sort || undefined,
      },
    })).then((page) => ({
      ...page,
      items: page.items.map(normalizeAdminAuditEvent),
    })),

  analyticsOverview: (locationId: string, range?: string) =>
    getData<AdminAnalyticsOverview>(
      httpClient.get('/api/admin/analytics/overview', { params: { locationId, range } }),
    ),

  analyticsActivitySeries: (locationId: string, range?: string, bucket: 'DAY' | 'WEEK' = 'DAY') =>
    getData<ActivitySeries>(
      httpClient.get('/api/admin/analytics/activity-series', {
        params: { locationId, range, bucket },
      }),
    ),

  analyticsActivityHeatmap: (locationId: string, range?: string) =>
    getData<ActivityHeatmap>(
      httpClient.get('/api/admin/analytics/activity-heatmap', { params: { locationId, range } }),
    ),

  organizationAnalytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/admin/organizations/${orgId}/analytics`)),

  listOrganizations: (query: AdminOrganizationQuery = {}) =>
    getPageData<AdminOrganizationSummary>(httpClient.get('/api/admin/organizations', { params: query })),

  createOrganization: (body: AdminOrganizationInput) =>
    getData<AdminOrganizationSummary>(httpClient.post('/api/admin/organizations', body)),

  updateOrganization: (orgId: string, body: Partial<AdminOrganizationInput>) =>
    getData<AdminOrganizationSummary>(httpClient.patch(`/api/admin/organizations/${orgId}`, body)),

  generateOrgInvite: (orgId: string) =>
    getData<AdminOrgInvite>(httpClient.post(`/api/admin/organizations/${orgId}/invite-code`)),

  addOrgMember: (
    orgId: string,
    body: { email: string; displayName?: string; sendCredentialsEmail?: boolean },
  ) => getData<AdminOrgMemberResult>(httpClient.post(`/api/admin/organizations/${orgId}/members`, body)),

  exportOrgRosterCsv: async (orgId: string) => {
    const res = await httpClient.get<Blob>(`/api/admin/organizations/${orgId}/roster/export.csv`, {
      responseType: 'blob',
    })
    return res.data
  },

  importOrgRosterCsv: (orgId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return getData<AdminRosterImportResult>(
      httpClient.post(`/api/admin/organizations/${orgId}/roster/import`, form),
    )
  },


  listB2b2cInquiries: (query: AdminPageQuery & { status?: string } = {}) =>
    getPageData<AdminB2b2cInquiry>(httpClient.get('/api/admin/b2b2c-inquiries', { params: query })),

  createB2b2cInquiry: (body: {
    siteName: string
    contactName: string
    contactEmail: string
    contactPhone?: string | null
    packageType: string
    message?: string | null
    adminNotes?: string | null
    interestSiteCode?: string | null
    status?: string | null
  }) => getData<AdminB2b2cInquiry>(httpClient.post('/api/admin/b2b2c-inquiries', body)),

  updateB2b2cInquiryStatus: (id: string, status: string, adminNotes?: string | null) =>
    getData<AdminB2b2cInquiry>(
      httpClient.patch(`/api/admin/b2b2c-inquiries/${id}`, { status, adminNotes }),
    ),

  createB2bInvoice: (body: {
    orgName?: string | null
    planType: string
    contactEmail?: string | null
    organizationId?: string | null
    licenseCount?: number | null
  }) =>
    getData<{
      orderCode: string
      amountVnd: number
      status: string
      planType: string
      orgName: string
      qrUrl?: string | null
      expiresAt?: string | null
      licenseCount?: number
    }>(httpClient.post('/api/admin/billing/invoices', body)),

  listRecentPayments: (limit = 20) =>
    getData<AdminRecentPayment[]>(
      httpClient.get('/api/admin/billing/payments/recent', { params: { limit } }),
    ),

  listPaymentsByStatus: (status: string, limit = 50) =>
    getData<AdminRecentPayment[]>(
      httpClient.get('/api/admin/billing/payments', { params: { status, limit } }),
    ),

  listPayments: (query: AdminPageQuery & { status?: string; channel?: string; from?: string; to?: string } = {}) =>
    getPageData<AdminRecentPayment>(httpClient.get('/api/admin/billing/payments', { params: query })),

  billingOverview: async (months = 12) => {
    const data = await getData<Partial<AdminBillingOverview>>(
      httpClient.get('/api/admin/billing/overview', { params: { months } }),
    )
    if (!Array.isArray(data.monthlyRevenue) || !Array.isArray(data.planRevenue) ||
      typeof data.actualRevenueMonthVnd !== 'number' || typeof data.estimatedMrrVnd !== 'number' ||
      typeof data.estimatedArrVnd !== 'number' || typeof data.activePaidSubscriptions !== 'number' ||
      typeof data.updatedAt !== 'string') {
      throw new Error('Máy chủ chưa cung cấp dữ liệu tổng quan doanh thu đã phê duyệt.')
    }
    return data as AdminBillingOverview
  },

  pilotKpi: () => getData<PilotKpi>(httpClient.get('/api/admin/analytics/pilot-kpi')),

  listContentReports: (query: AdminPageQuery & { status?: string; from?: string; to?: string } = {}) =>
    getPageData<AdminContentReport>(httpClient.get('/api/admin/content-reports', { params: query })),
  updateContentReport: (eventId: string, body: { status: string; adminNote?: string | null; rowVersion: number }) =>
    getData<AdminContentReport>(httpClient.patch(`/api/admin/content-reports/${eventId}`, body)),

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

  listNarrativePilots: (query: { page?: number; size?: number; q?: string; reviewStatus?: string; rolloutState?: string; locationId?: string; sort?: string } = {}) =>
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
