export type FieldTripStatus = 'DRAFT' | 'PENDING_SITE' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export type SiteConfirmationStatus = 'NOT_REQUIRED' | 'PENDING' | 'CONFIRMED' | 'DECLINED'

export type ParticipationMode = 'INDIVIDUAL' | 'SHARED_DEVICE'

export type FieldTripResponse = {
  id: string
  orgId: string
  siteCode: string
  title: string
  visitStart: string
  visitEnd: string
  questId: string
  campaignId: string
  joinCode: string
  status: FieldTripStatus
  siteConfirmationStatus: SiteConfirmationStatus
  siteNote: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  rowVersion: number
}

export type CreateFieldTripRequest = {
  orgId: string
  siteCode: string
  title: string
  visitStart: string
  visitEnd: string
  questId: string
  campaignId: string
}

export type UpdateFieldTripRequest = {
  title: string
  siteCode: string
  visitStart: string
  visitEnd: string
  questId: string
  campaignId: string
  rowVersion: number
}

export type CreateTripGroupRequest = {
  name: string
  participationMode: ParticipationMode
  declaredSize?: number
}

export type TripGroupPreview = {
  id: string
  name: string
  participationMode: ParticipationMode
  declaredSize: number | null
  memberCount: number
}

export type TripJoinPreview = {
  title: string
  siteCode: string
  visitStart: string
  visitEnd: string
  status: FieldTripStatus
  groups: TripGroupPreview[]
}

export type JoinFieldTripRequest = {
  code: string
  groupId: string
}

export const FIELD_TRIP_STATUS_LABEL: Record<FieldTripStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_SITE: 'Chờ di tích xác nhận',
  CONFIRMED: 'Đã xác nhận',
  ACTIVE: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
}

export const SITE_CONFIRMATION_LABEL: Record<SiteConfirmationStatus, string> = {
  NOT_REQUIRED: 'Không cần xác nhận',
  PENDING: 'Đang chờ',
  CONFIRMED: 'Di tích đã xác nhận',
  DECLINED: 'Di tích từ chối',
}

export function participationLabel(mode: ParticipationMode): string {
  return mode === 'SHARED_DEVICE' ? 'Một thiết bị' : 'Cá nhân'
}

export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString()
}

export function formatVisit(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const NOT_STARTED: FieldTripStatus[] = ['DRAFT', 'PENDING_SITE', 'CONFIRMED']

export function canEditTrip(status: FieldTripStatus): boolean {
  return status === 'DRAFT'
}

export function canStartTrip(trip: Pick<FieldTripResponse, 'status' | 'siteConfirmationStatus'>): boolean {
  if (trip.status === 'CONFIRMED') return true
  return trip.status === 'DRAFT' && trip.siteConfirmationStatus === 'NOT_REQUIRED'
}

export function canRequestConfirmation(status: FieldTripStatus): boolean {
  return status === 'DRAFT'
}

export function canCancelTrip(status: FieldTripStatus): boolean {
  return NOT_STARTED.includes(status)
}

export function canCreateGroup(status: FieldTripStatus): boolean {
  return NOT_STARTED.includes(status)
}
