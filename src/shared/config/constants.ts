// src/shared/config/constants.ts
/** Demo location UUID — Củ Chi (BE seed). */
export const CU_CHI_LOCATION_ID = '11111111-1111-1111-1111-111111111111'

/** Heritage sites from Dataset docx (BE seed 2026-06-19). */
export const HERITAGE_LOCATION_IDS = {
  CU_CHI: CU_CHI_LOCATION_ID,
  BEN_NHA_RONG: '22222222-2222-2222-2222-222222222201',
  CHUA_THIEN_MU: '22222222-2222-2222-2222-222222222202',
  CO_DO_HOA_LU: '22222222-2222-2222-2222-222222222203',
  HOANG_THANH_THANG_LONG: '22222222-2222-2222-2222-222222222204',
  PHO_CO_HOI_AN: '22222222-2222-2222-2222-222222222205',
  THANH_NHA_HO: '22222222-2222-2222-2222-222222222206',
  VAN_MIEU: '22222222-2222-2222-2222-222222222207',
  DAI_NOI_HUE: '22222222-2222-2222-2222-222222222208',
  DEN_HUNG: '22222222-2222-2222-2222-222222222209',
} as const

export const DEFAULT_ARTIFACTS_LOCATION_ID = CU_CHI_LOCATION_ID

export type PilotSiteCode = 'cu-chi' | 'hoang-thanh-thang-long' | 'dai-noi-hue'

export type PilotSite = {
  siteCode: PilotSiteCode
  locationId: string
  name: string
  region: 'Nam' | 'Bắc' | 'Trung'
  shortTitle: string
}

/** Three MVBP onsite pilots — one per region. */
export const PILOT_SITES: readonly PilotSite[] = [
  {
    siteCode: 'cu-chi',
    locationId: CU_CHI_LOCATION_ID,
    name: 'Địa đạo Củ Chi',
    region: 'Nam',
    shortTitle: 'Củ Chi · 6 trạm',
  },
  {
    siteCode: 'hoang-thanh-thang-long',
    locationId: HERITAGE_LOCATION_IDS.HOANG_THANH_THANG_LONG,
    name: 'Hoàng thành Thăng Long',
    region: 'Bắc',
    shortTitle: 'Thăng Long · 6 trạm',
  },
  {
    siteCode: 'dai-noi-hue',
    locationId: HERITAGE_LOCATION_IDS.DAI_NOI_HUE,
    name: 'Đại Nội Huế',
    region: 'Trung',
    shortTitle: 'Đại Nội · 6 trạm',
  },
] as const

const BY_SITE = Object.fromEntries(PILOT_SITES.map((s) => [s.siteCode, s])) as Record<PilotSiteCode, PilotSite>
const BY_LOCATION = Object.fromEntries(PILOT_SITES.map((s) => [s.locationId, s])) as Record<string, PilotSite>

export function getPilotSites(): readonly PilotSite[] {
  return PILOT_SITES
}

export function getPilotSite(siteCode: string | null | undefined): PilotSite | undefined {
  if (!siteCode) return undefined
  return BY_SITE[siteCode.trim().toLowerCase() as PilotSiteCode]
}

export function locationIdFromSiteCode(siteCode: string | null | undefined): string {
  return getPilotSite(siteCode)?.locationId ?? CU_CHI_LOCATION_ID
}

export function siteCodeFromLocationId(locationId: string | null | undefined): PilotSiteCode {
  if (!locationId) return 'cu-chi'
  return (BY_LOCATION[locationId]?.siteCode ?? 'cu-chi') as PilotSiteCode
}

export function isPilotSiteCode(value: string | null | undefined): value is PilotSiteCode {
  return Boolean(value && BY_SITE[value.trim().toLowerCase() as PilotSiteCode])
}
