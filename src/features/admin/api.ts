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
  status?: string
  ids?: string
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
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | string
  level: number
  totalPoints: number
  createdAt: string
}

export type AdminUserBulkAction = 'SUSPEND' | 'UNSUSPEND' | 'SET_ROLE' | 'SET_TIER'

export type AdminUserBulkResult = {
  succeeded: number
  failed: Array<{ userId: string; message: string }>
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
  organizationId?: string | null
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

export type AdminPaymentOperationResponse = {
  id: string
  channel: string
  orderCode: string
  status: string
  paidAt: string | null
  updatedAt: string
}

export type AdminPaymentQuery = AdminPageQuery & {
  status?: string
  channel?: string
  from?: string
  to?: string
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
  story: string | null
  unlockKey: string
  reliability: string | null
  sortOrder: number
  collectionName: string | null
  rarity: string | null
  sourceUrl: string | null
  imageSource: string | null
  imageLicense: string | null
  factVerified: boolean
  unlockMinigameId: string | null
  rowVersion: number
  deletedAt?: string | null
  deletedBy?: string | null
  deleteReason?: string | null
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
  story?: string | null
  reliability?: string | null
  sortOrder?: number | null
  collectionName?: string | null
  rarity?: string | null
  sourceUrl?: string | null
  imageSource?: string | null
  imageLicense?: string | null
  factVerified?: boolean | null
  unlockMinigameId?: string | null
  rowVersion?: number | null
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

export type NarrativeGateError = {
  code: string
  message: string
  field?: string | null
  destination?: string | null
}

export type NarrativeReadiness = {
  questId: string
  draftVersion: number | null
  ready: boolean
  globalFlagEnabled: boolean
  items: NarrativeReadinessItem[]
  destinations?: NarrativeDestinationReadiness[]
}

export type NarrativeDestinationReadiness = {
  destinationId?: string | null
  destinationName: string
  required: boolean
  isReady: boolean
  checks: NarrativeReadinessItem[]
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

export type AdminQuestCampaign = {
  id: string
  questId: string
  type: string
  title: string
  startsAt: string
  endsAt: string
  enabled: boolean
  pilotStatus: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | string
  releaseDecision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ROLLED_BACK' | string
  releaseNote?: string | null
  releaseDecidedBy?: string | null
  releaseDecidedAt?: string | null
}

export type AdminCampaignGateRequest = {
  pilotStatus: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
  releaseDecision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ROLLED_BACK'
  note?: string | null
}

export type AdminCampaignRollbackRequest = { reason: string }

export type AdminCampaignAudiencePreview = {
  campaignId: string
  questId: string
  campaignType: string
  campaignTitle: string
  campaignEnabled: boolean
  pilotStatus: string
  releaseDecision: string
  organizationId: string
  eligibleStudents: number
  excludedTeachersOrAdmins: number
  excludedUnacceptedMembers: number
  excludedProfileMismatches: number
}

export type AdminCampaignAuditEvent = {
  id: string
  campaignId: string
  action: string
  actorId: string
  occurredAt: string
  rollbackReason?: string | null
  note?: string | null
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

export type AdminPurgeRequest = {
  rowVersion: number
  reason: string
  idempotencyKey?: string
}

export type AdminTrashBulkItem = {
  resourceType: AdminContentType
  id: string
  rowVersion: number
}

export type AdminTrashBulkResult = {
  succeeded: number
  failedCount: number
  failed: Array<{ resourceType: string; id: string; message: string }>
}

export type AdminTrashEmptyResult = {
  purged: number
  failedCount: number
  failed: Array<{ resourceType: string; id: string; message: string }>
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
  eventHash?: string | null
  prevEventHash?: string | null
}

export type AdminAuditIntegrityResult = {
  valid: boolean
  checkedCount: number
  chainTip?: string | null
  expectedTip?: string | null
  brokenEventId?: string | null
  from?: string | null
  to?: string | null
}

export type AdminAuditQuery = AdminPageQuery & {
  entityType?: string
  entityId?: string
  actor?: string
  actorId?: string
  action?: string
  from?: string
  to?: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function auditQueryParams(query: AdminAuditQuery = {}) {
  const entityIdFromQ =
    query.entityId || (query.q && UUID_RE.test(query.q.trim()) ? query.q.trim() : undefined)
  return {
    page: query.page,
    size: query.size,
    entityType: query.entityType || query.type || undefined,
    entityId: entityIdFromQ || undefined,
    actor: query.actor || undefined,
    actorId: query.actorId || undefined,
    action: query.action || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    sort: query.sort || undefined,
  }
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
  openContentReports: number
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
  lastCrmSyncedAt?: string | null
  crmLinkedInquiryCount?: number | null
}

export type OrgContract = {
  id: string
  organizationId: string
  title: string
  contractCode: string
  licenseSeats?: number | null
  planType?: string | null
  status: string
  startsOn?: string | null
  endsOn?: string | null
  documentUrl?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type OrgContractInput = {
  title: string
  contractCode: string
  licenseSeats?: number | null
  planType?: string | null
  status?: string
  startsOn?: string | null
  endsOn?: string | null
  documentUrl?: string | null
  notes?: string | null
}

export type OrgArReport = {
  organizationId: string
  organizationName: string
  from: string
  to: string
  memberCount: number
  checkins: number
  visitSessions: number
  onsiteSessions: number
  discoveries: number
  questCompletions: number
  dailyCheckins: Array<{ day: string; count: number }>
}

export type OrgCrmSyncResult = {
  organizationId: string
  linkedCount: number
  syncedAt: string
  inquiries: Array<{ id: string; siteName: string; contactEmail: string; status: string }>
}

export type OrgArCard = {
  id: string
  organizationId: string
  userId: string
  email: string
  displayName: string
  cardCode: string
  status: string
  issuedAt: string
  revokedAt?: string | null
}

export type OrgArCardIssueResult = {
  issued: number
  skipped: number
  cards: OrgArCard[]
}

export type OrgCertificate = {
  id: string
  organizationId: string
  userId: string
  email: string
  displayName: string
  title: string
  certificateCode: string
  issuedAt: string
}

export type OrgCertificateBulkResult = {
  issued: number
  certificates: OrgCertificate[]
}

export type OrgActivityLog = {
  id: string
  actorId?: string | null
  actorDisplayName?: string | null
  actorName?: string | null
  actorEmail?: string | null
  entityType: string
  entityId?: string | null
  action: string
  reason?: string | null
  occurredAt: string
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
  updateUserStatus: (
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    reason: string,
    expectedStatus: 'ACTIVE' | 'SUSPENDED',
  ) =>
    getData<AdminUserSummary>(
      httpClient.patch(`/api/admin/users/${userId}/status`, { status, reason, expectedStatus }),
    ),
  updateUserTier: (
    userId: string,
    tier: 'FREE' | 'PREMIUM',
    reason: string,
    expectedTier: 'FREE' | 'PREMIUM',
  ) =>
    getData<AdminUserSummary>(
      httpClient.patch(`/api/admin/users/${userId}/tier`, { tier, reason, expectedTier }),
    ),
  forceVerifyUser: (userId: string, reason: string) =>
    getData<AdminUserSummary>(httpClient.post(`/api/admin/users/${userId}/verify`, { reason })),
  resendUserVerification: (userId: string) =>
    getData<{ userId: string; emailed: boolean; debugVerificationToken?: string | null }>(
      httpClient.post(`/api/admin/users/${userId}/resend-verification`),
    ),
  bulkUsers: (body: {
    userIds: string[]
    action: AdminUserBulkAction
    reason?: string
    role?: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN'
    tier?: 'FREE' | 'PREMIUM'
  }) => getData<AdminUserBulkResult>(httpClient.post('/api/admin/users/bulk', body)),
  exportUsersCsv: async (query: AdminUserQuery = {}) => {
    const res = await httpClient.get<Blob>('/api/admin/users/export.csv', {
      params: query,
      responseType: 'blob',
    })
    return res.data
  },

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
  purgeTrashItem: (type: AdminContentType, id: string, body: AdminPurgeRequest) =>
    getData<void>(httpClient.delete(`/api/admin/trash/${type}/${id}`, { data: body })),
  bulkTrash: (body: { action: 'RESTORE' | 'PURGE'; items: AdminTrashBulkItem[]; reason?: string }) =>
    getData<AdminTrashBulkResult>(httpClient.post('/api/admin/trash/bulk', body)),
  emptyTrash: (body: { reason: string; type?: AdminContentType }) =>
    getData<AdminTrashEmptyResult>(httpClient.post('/api/admin/trash/empty', body)),
  listAudit: (query: AdminAuditQuery = {}) =>
    getPageData<AdminAuditEvent>(httpClient.get('/api/admin/audit', {
      params: auditQueryParams(query),
    })).then((page) => ({
      ...page,
      items: page.items.map(normalizeAdminAuditEvent),
    })),

  verifyAuditIntegrity: (query: AdminAuditQuery = {}) =>
    getData<AdminAuditIntegrityResult>(
      httpClient.get('/api/admin/audit/integrity', { params: auditQueryParams(query) }),
    ),

  exportAuditJson: async (query: AdminAuditQuery = {}) => {
    const res = await httpClient.get<Blob>('/api/admin/audit/export.json', {
      params: auditQueryParams(query),
      responseType: 'blob',
    })
    return res.data
  },

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

  listOrgContracts: (orgId: string) =>
    getData<OrgContract[]>(httpClient.get(`/api/admin/organizations/${orgId}/contracts`)),
  createOrgContract: (orgId: string, body: OrgContractInput) =>
    getData<OrgContract>(httpClient.post(`/api/admin/organizations/${orgId}/contracts`, body)),
  updateOrgContract: (orgId: string, contractId: string, body: OrgContractInput) =>
    getData<OrgContract>(httpClient.patch(`/api/admin/organizations/${orgId}/contracts/${contractId}`, body)),
  cancelOrgContract: (orgId: string, contractId: string) =>
    getData<OrgContract>(httpClient.delete(`/api/admin/organizations/${orgId}/contracts/${contractId}`)),

  getOrgArReport: (orgId: string, query: { from?: string; to?: string } = {}) =>
    getData<OrgArReport>(httpClient.get(`/api/admin/organizations/${orgId}/ar-report`, { params: query })),

  listOrgActivityLogs: (orgId: string, query: AdminPageQuery = {}) =>
    getPageData<OrgActivityLog>(
      httpClient.get(`/api/admin/organizations/${orgId}/activity-logs`, {
        params: { page: query.page ?? 0, size: query.size ?? 10 },
      }),
    ),

  syncOrgCrm: (orgId: string) =>
    getData<OrgCrmSyncResult>(httpClient.post(`/api/admin/organizations/${orgId}/sync-crm`)),

  listOrgArCards: (orgId: string) =>
    getData<OrgArCard[]>(httpClient.get(`/api/admin/organizations/${orgId}/ar-cards`)),
  issueOrgArCards: (orgId: string, body?: { userIds?: string[] }) =>
    getData<OrgArCardIssueResult>(httpClient.post(`/api/admin/organizations/${orgId}/ar-cards`, body ?? {})),
  revokeOrgArCard: (orgId: string, cardId: string) =>
    getData<OrgArCard>(httpClient.patch(`/api/admin/organizations/${orgId}/ar-cards/${cardId}`)),

  listOrgCertificates: (orgId: string) =>
    getData<OrgCertificate[]>(httpClient.get(`/api/admin/organizations/${orgId}/certificates`)),
  issueOrgCertificates: (orgId: string, body?: { userIds?: string[]; title?: string }) =>
    getData<OrgCertificateBulkResult>(
      httpClient.post(`/api/admin/organizations/${orgId}/certificates/bulk`, body ?? {}),
    ),
  exportOrgCertificatesCsv: async (orgId: string) => {
    const res = await httpClient.get<Blob>(`/api/admin/organizations/${orgId}/certificates/export.csv`, {
      responseType: 'blob',
    })
    return res.data
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

  listPayments: (query: AdminPaymentQuery = {}) =>
    getPageData<AdminRecentPayment>(httpClient.get('/api/admin/billing/payments', { params: query })),

  markPaymentPaid: (channel: string, id: string, reason: string) =>
    getData<AdminPaymentOperationResponse>(
      httpClient.post(`/api/admin/billing/payments/${channel.toLowerCase()}/${id}/mark-paid`, { reason }),
    ),

  refundPayment: (channel: string, id: string, reason: string) =>
    getData<AdminPaymentOperationResponse>(
      httpClient.post(`/api/admin/billing/payments/${channel.toLowerCase()}/${id}/refund`, { reason }),
    ),

  voidPayment: (channel: string, id: string, reason: string) =>
    getData<AdminPaymentOperationResponse>(
      httpClient.post(`/api/admin/billing/payments/${channel.toLowerCase()}/${id}/void`, { reason }),
    ),

  exportPaymentsCsv: async (query: AdminPaymentQuery = {}) => {
    const res = await httpClient.get<Blob>('/api/admin/billing/payments/export.csv', {
      params: query,
      responseType: 'blob',
    })
    return res.data
  },

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

  /** Toggle AR availability for a location. Ghi audit log server-side. */
  toggleArAvailability: (locationId: string, body: { isArAvailable: boolean; reason: string }) =>
    getData<void>(httpClient.patch(`/api/admin/locations/${locationId}/ar-availability`, body)),

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
  /** Rollback is the reversible Admin action for an active narrative pilot; BE records it as PAUSED. */
  rollbackNarrative: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/rollback`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  resumeNarrative: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/resume`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  publishNarrativeDraft: (questId: string, body: NarrativeRolloutRequest, idempotencyKey: string) =>
    getData<NarrativePilotDetail>(httpClient.post(`/api/admin/narrative-investigations/${questId}/publish-draft`, body, { headers: { 'Idempotency-Key': idempotencyKey } })),
  narrativeAudit: (questId: string) =>
    getListData<AdminAuditEvent>(httpClient.get(`/api/admin/narrative-investigations/${questId}/audit`)),

  updateCampaign: (campaignId: string, body: Record<string, unknown>) =>
    getData<AdminQuestCampaign>(httpClient.put(`/api/quest-campaigns/${campaignId}`, body)),
  publishCampaign: (campaignId: string) =>
    getData<AdminQuestCampaign>(httpClient.post(`/api/quest-campaigns/${campaignId}/publish`)),
  unpublishCampaign: (campaignId: string) =>
    getData<AdminQuestCampaign>(httpClient.post(`/api/quest-campaigns/${campaignId}/unpublish`)),
  updateCampaignGate: (campaignId: string, body: AdminCampaignGateRequest) =>
    getData<AdminQuestCampaign>(httpClient.put(`/api/quest-campaigns/${campaignId}/pilot-gate`, body)),
  listCampaignAudit: (campaignId: string) =>
    getListData<AdminCampaignAuditEvent>(httpClient.get(`/api/quest-campaigns/${campaignId}/audit`)),
  rollbackCampaign: (campaignId: string, body: AdminCampaignRollbackRequest) =>
    getData<AdminQuestCampaign>(httpClient.post(`/api/quest-campaigns/${campaignId}/rollback`, body)),
  previewCampaignAudience: (campaignId: string, organizationId: string) =>
    getData<AdminCampaignAudiencePreview>(httpClient.get(`/api/quest-campaigns/${campaignId}/preview-audience`, {
      params: { orgId: organizationId },
    })),

  dashboardSummary: () =>
    getData<AdminDashboardSummary>(httpClient.get('/api/admin/dashboard')),
}

export type { PageResponse }

function contentPath(type: AdminContentType) {
  if (type === 'DISCOVERY_POINT') return 'discovery-points'
  if (type === 'ARTIFACT') return 'artifacts'
  return 'quests'
}
