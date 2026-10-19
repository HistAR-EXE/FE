// src/shared/config/locationSlug.ts
// Đường dẫn dễ đọc cho từng di tích: /time-portal/dia-dao-cu-chi thay cho UUID.
// Trang nhận cả slug lẫn UUID (link cũ, link do BE dựng sẵn) rồi chuyển về dạng slug.

import { HERITAGE_LOCATION_IDS } from './constants'

const SLUG_BY_LOCATION: Record<string, string> = {
  [HERITAGE_LOCATION_IDS.CU_CHI]: 'dia-dao-cu-chi',
  [HERITAGE_LOCATION_IDS.BEN_NHA_RONG]: 'ben-nha-rong',
  [HERITAGE_LOCATION_IDS.CHUA_THIEN_MU]: 'chua-thien-mu',
  [HERITAGE_LOCATION_IDS.CO_DO_HOA_LU]: 'co-do-hoa-lu',
  [HERITAGE_LOCATION_IDS.HOANG_THANH_THANG_LONG]: 'hoang-thanh-thang-long',
  [HERITAGE_LOCATION_IDS.PHO_CO_HOI_AN]: 'pho-co-hoi-an',
  [HERITAGE_LOCATION_IDS.THANH_NHA_HO]: 'thanh-nha-ho',
  [HERITAGE_LOCATION_IDS.VAN_MIEU]: 'van-mieu-quoc-tu-giam',
  [HERITAGE_LOCATION_IDS.DAI_NOI_HUE]: 'dai-noi-hue',
  [HERITAGE_LOCATION_IDS.DEN_HUNG]: 'den-hung',
}

const LOCATION_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_BY_LOCATION).map(([id, slug]) => [slug, id]),
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Slug của di tích; di tích chưa có slug thì trả lại UUID. */
export function locationSlug(locationId: string): string {
  return SLUG_BY_LOCATION[locationId] ?? locationId
}

/** Tham số trên URL (slug hoặc UUID) → UUID. Không nhận ra thì trả null. */
export function resolveLocationParam(param: string | null | undefined): string | null {
  if (!param) return null
  const value = param.trim().toLowerCase()
  if (LOCATION_BY_SLUG[value]) return LOCATION_BY_SLUG[value]
  return UUID_RE.test(value) ? value : null
}

/** URL đang dùng UUID trong khi di tích đã có slug → nên chuyển sang slug. */
export function shouldCanonicalizeLocationParam(param: string | null | undefined): boolean {
  if (!param) return false
  const value = param.trim().toLowerCase()
  return UUID_RE.test(value) && SLUG_BY_LOCATION[value] !== undefined
}

/** Đường dẫn Cổng thời gian của một di tích. */
export function timePortalPath(locationId: string, search?: string | URLSearchParams | Record<string, string>): string {
  const query = search instanceof URLSearchParams ? search.toString() : typeof search === 'string' ? search.replace(/^\?/, '') : search ? new URLSearchParams(search).toString() : ''
  return `/time-portal/${locationSlug(locationId)}${query ? `?${query}` : ''}`
}
