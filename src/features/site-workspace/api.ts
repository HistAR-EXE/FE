import type { FieldTripStatus, SiteConfirmationStatus } from '../field-trips/types'
import { ApiError } from '../../shared/api/contracts'
import { getData, httpClient } from '../../shared/api/httpClient'

export type SiteRole = 'SITE_MANAGER' | 'CONTENT_EDITOR' | 'CONTENT_REVIEWER'
export type ContentKind = 'SITE_PROFILE' | 'STATION'
export type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'
export type ReviewDecision = 'APPROVE' | 'REQUEST_CHANGES'
export type StationBlockType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'HOTSPOT'

export type SiteMembership = {
  siteCode: string
  locationName: string | null
  role: SiteRole
  requiresTripConfirmation: boolean
}

export type SiteMember = {
  userId: string
  role: SiteRole
  active: boolean
}

export type SiteWorkspaceSummary = {
  siteCode: string
  locationName: string | null
  callerRole: SiteRole | null
  requiresTripConfirmation: boolean
  members: SiteMember[] | null
  /** Live location profile copied onto the workspace summary. Prefer these over GET /api/locations. */
  name?: string | null
  description?: string | null
  formattedAddress?: string | null
  coverImage?: string | null
  sources?: string | null
}

export type SiteProfileSnapshot = {
  name: string
  description: string
  formattedAddress: string
  coverImage: string
  sources: string
}

export type StationBlockDraft = {
  blockType: StationBlockType
  title: string
  body: string
  mediaUrl: string
  sortOrder: number
  metaJson?: string | null
}

export type StationSnapshot = {
  stationCode: string
  name: string
  sortOrder: number
  lat: number
  lng: number
  questStepKey: string
  active: boolean
  blocks: StationBlockDraft[]
}

export type ContentVersion = {
  id: string
  siteCode: string
  contentKind: ContentKind
  resourceKey: string
  version: number
  status: ContentStatus
  snapshotJson: string
  revision: number
  createdBy: string | null
  submittedBy: string | null
  reviewedBy: string | null
  publishedBy: string | null
  reviewNote: string | null
}

export type StationBlock = {
  id?: string
  blockType: StationBlockType
  title: string | null
  body: string | null
  mediaUrl: string | null
  sortOrder: number
  metaJson?: string | null
}

export type StationSummary = {
  id: string
  siteCode: string
  code: string
  name: string
  sortOrder: number
  lat: number | null
  lng: number | null
  questStepKey: string | null
  active: boolean
  blocks: StationBlock[]
}

export type StationQr = {
  siteCode: string
  stationCode: string
  timestamp: number
  signature: string
  payload: string
  signed: boolean
  staticQr: boolean
}

export type SiteOperationsSummary = {
  siteCode: string
  from: string
  to: string
  visitCount: number
  checkinsByStation: Array<{ stationCode: string; count: number }>
  questCompletions: number
  contentInteractions: Record<string, number>
}

export type SiteSettings = {
  siteCode: string
  requiresTripConfirmation: boolean
}

/** Schedule only. Student email, name, and photo never belong on this payload. */
export type SiteFieldTripSchedule = {
  id: string
  title: string
  visitStart: string
  visitEnd: string
  status: FieldTripStatus
  siteConfirmationStatus: SiteConfirmationStatus
  groupCount: number
  rowVersion: number
}

export type SiteFieldTripDecision = {
  status: FieldTripStatus
  siteConfirmationStatus: SiteConfirmationStatus
  rowVersion: number
}

const workspace = (siteCode: string) => `/api/site-workspaces/${encodeURIComponent(siteCode)}`

function versionsPath(siteCode: string, kind: ContentKind, resourceKey: string) {
  return `${workspace(siteCode)}/content/${kind}/${encodeURIComponent(resourceKey)}/versions`
}

export function workspaceErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.message.trim()) return error.message
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Không thực hiện được thao tác.'
}

export function errorNamesBlock(message: string): boolean {
  return /block/i.test(message)
}

export const siteWorkspaceApi = {
  mine: () => getData<SiteMembership[]>(httpClient.get('/api/site-workspaces/mine')),
  get: (siteCode: string) => getData<SiteWorkspaceSummary>(httpClient.get(workspace(siteCode))),
  members: (siteCode: string) => getData<SiteMember[]>(httpClient.get(`${workspace(siteCode)}/members`)),
  upsertMember: (siteCode: string, payload: { userId: string; role: SiteRole }) =>
    getData<SiteMember>(httpClient.put(`${workspace(siteCode)}/members`, payload)),
  revokeMember: (siteCode: string, userId: string) =>
    getData<void>(httpClient.delete(`${workspace(siteCode)}/members/${encodeURIComponent(userId)}`)),
  updateSettings: (siteCode: string, requiresTripConfirmation: boolean) =>
    getData<SiteSettings>(httpClient.patch(`${workspace(siteCode)}/settings`, { requiresTripConfirmation })),
  listVersions: (siteCode: string, status?: ContentStatus) =>
    getData<ContentVersion[]>(
      httpClient.get(`${workspace(siteCode)}/content/versions`, { params: status ? { status } : {} }),
    ),
  createDraft: (siteCode: string, kind: ContentKind, resourceKey: string, snapshot: unknown) =>
    getData<ContentVersion>(httpClient.post(versionsPath(siteCode, kind, resourceKey), { snapshot, expectedRevision: null })),
  updateDraft: (
    siteCode: string,
    kind: ContentKind,
    resourceKey: string,
    version: number,
    snapshot: unknown,
    expectedRevision: number,
  ) =>
    getData<ContentVersion>(
      httpClient.patch(`${versionsPath(siteCode, kind, resourceKey)}/${version}`, { snapshot, expectedRevision }),
    ),
  submit: (siteCode: string, kind: ContentKind, resourceKey: string, version: number, expectedRevision: number) =>
    getData<ContentVersion>(
      httpClient.post(`${versionsPath(siteCode, kind, resourceKey)}/${version}/submit`, { expectedRevision }),
    ),
  review: (
    siteCode: string,
    kind: ContentKind,
    resourceKey: string,
    version: number,
    payload: { expectedRevision: number; decision: ReviewDecision; note?: string | null },
  ) => getData<ContentVersion>(httpClient.post(`${versionsPath(siteCode, kind, resourceKey)}/${version}/review`, payload)),
  publish: (siteCode: string, kind: ContentKind, resourceKey: string, version: number, expectedRevision: number) =>
    getData<ContentVersion>(
      httpClient.post(`${versionsPath(siteCode, kind, resourceKey)}/${version}/publish`, { expectedRevision }),
    ),
  rollback: (
    siteCode: string,
    kind: ContentKind,
    resourceKey: string,
    version: number,
    payload: { expectedRevision: number; reason: string },
  ) => getData<ContentVersion>(httpClient.post(`${versionsPath(siteCode, kind, resourceKey)}/${version}/rollback`, payload)),
  stations: (siteCode: string) => getData<StationSummary[]>(httpClient.get(`/api/sites/${encodeURIComponent(siteCode)}/stations`)),
  staticQr: (siteCode: string, stationCode: string) =>
    getData<StationQr>(
      httpClient.get(`${workspace(siteCode)}/stations/${encodeURIComponent(stationCode)}/qr`, { params: { static: true } }),
    ),
  operations: (siteCode: string, from: string, to: string) =>
    getData<SiteOperationsSummary>(httpClient.get(`${workspace(siteCode)}/operations`, { params: { from, to } })),
  listFieldTrips: (siteCode: string) =>
    getData<SiteFieldTripSchedule[]>(httpClient.get(`${workspace(siteCode)}/field-trips`)),
  confirmFieldTrip: (siteCode: string, tripId: string, rowVersion: number) =>
    getData<SiteFieldTripDecision>(httpClient.post(`${workspace(siteCode)}/field-trips/${tripId}/confirm`, { rowVersion })),
  declineFieldTrip: (siteCode: string, tripId: string, rowVersion: number, note: string) =>
    getData<SiteFieldTripDecision>(httpClient.post(`${workspace(siteCode)}/field-trips/${tripId}/decline`, { rowVersion, note })),
}
