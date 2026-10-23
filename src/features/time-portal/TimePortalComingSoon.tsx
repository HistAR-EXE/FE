// src/features/time-portal/TimePortalComingSoon.tsx
// Màn chờ cho di tích chưa có nội dung Cổng thời gian, hoặc đường dẫn không đúng.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { timePortalPath } from '../../shared/config/locationSlug'
import { locationsApi } from '../locations/api'

type Props = {
  /** null = đường dẫn không trỏ tới di tích nào. */
  locationId: string | null
}

export function TimePortalComingSoon({ locationId }: Props) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!locationId) return
    let cancelled = false
    locationsApi
      .getById(locationId)
      .then((loc) => {
        if (!cancelled) setName(loc.name)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [locationId])

  const notFound = !locationId

  return (
    <div className="flex flex-1 items-center justify-center bg-neutral-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
          <MaterialIcon name={notFound ? 'travel_explore' : 'hourglass_top'} className="text-3xl" />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Cổng thời gian</p>
        <h1 className="mt-1 text-2xl font-bold">{notFound ? 'Không tìm thấy di tích' : 'Đang được cập nhật'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {notFound
            ? 'Đường dẫn này không trỏ tới di tích nào. Bạn có thể mở Cổng thời gian tại Địa đạo Củ Chi.'
            : `Đội ngũ TimeLens đang biên soạn tư liệu và hình ảnh cho ${name || 'di tích này'}. Trong lúc chờ, bạn có thể khám phá di tích hoặc trải nghiệm Cổng thời gian tại Địa đạo Củ Chi.`}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {!notFound && (
            <Link
              to="/explore"
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/20 px-5 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              <MaterialIcon name="arrow_back" className="text-base" />
              Về trang Khám phá
            </Link>
          )}
          <Link
            to={timePortalPath(CU_CHI_LOCATION_ID)}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-amber-300 px-5 text-sm font-semibold text-black hover:bg-amber-200"
          >
            <MaterialIcon name="history" className="text-base" />
            Cổng thời gian Củ Chi
          </Link>
        </div>
      </div>
    </div>
  )
}
