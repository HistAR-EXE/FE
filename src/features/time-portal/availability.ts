// src/features/time-portal/availability.ts
// Di tích nào đã có nội dung Cổng thời gian (Dòng thời gian, 3D, Xưa & Nay).
// Di tích khác hiện màn "đang cập nhật" thay vì nội dung của Củ Chi.

import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'

const READY_LOCATIONS = new Set<string>([CU_CHI_LOCATION_ID])

export function hasTimePortalContent(locationId: string | null | undefined): boolean {
  return !!locationId && READY_LOCATIONS.has(locationId)
}
