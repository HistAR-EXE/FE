// Generic onsite hub: pack → scan → story → wrapped (per pilot site).
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { StoryJourneyPanel } from '../story/StoryJourneyPanel'
import {
  CU_CHI_LOCATION_ID,
  getPilotSite,
  locationIdFromSiteCode,
  type PilotSiteCode,
} from '../../shared/config/constants'

type SiteOnsiteHubProps = {
  siteCode?: PilotSiteCode | string
  locationId?: string
  showStory?: boolean
  className?: string
}

export function SiteOnsiteHub({
  siteCode = 'cu-chi',
  locationId,
  showStory = true,
  className = '',
}: SiteOnsiteHubProps) {
  const site = getPilotSite(siteCode)
  const resolvedLocationId = locationId ?? locationIdFromSiteCode(siteCode) ?? CU_CHI_LOCATION_ID
  const code = (site?.siteCode ?? siteCode) as string
  const title = site?.name ?? 'Hành trình onsite'
  const region = site?.region ?? ''

  return (
    <section data-testid="site-onsite-hub" data-site={code} className={`space-y-6 ${className}`}>
      <div className="rounded-3xl border border-[#fe951c]/25 bg-gradient-to-br from-[#161824] to-[#0f1015] p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#fe951c]/15 border border-[#fdb438]/40 flex items-center justify-center shrink-0">
            <MaterialIcon name="explore" className="text-[#fdb438] text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {title}
              {region ? <span className="text-sm font-bold text-gray-400"> · Miền {region}</span> : null}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Một địa điểm – 6 trạm – một mạch truyện. Tải gói trước khi vào; quét QR tại trạm để mở chương.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to={`/pack-prep?site=${encodeURIComponent(code)}`}
            className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-[#388cf1]/50 transition-colors"
          >
            <MaterialIcon name="download" className="text-[#388cf1] text-2xl" />
            <p className="mt-2 text-xs font-black text-white">Chuẩn bị hành trang</p>
            <p className="text-[10px] text-gray-500">Gói Lite / Full offline</p>
          </Link>
          <Link
            to={`/scan?locationId=${encodeURIComponent(resolvedLocationId)}&site=${encodeURIComponent(code)}`}
            className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-emerald-400/50 transition-colors"
          >
            <MaterialIcon name="qr_code_scanner" className="text-emerald-400 text-2xl" />
            <p className="mt-2 text-xs font-black text-white">Quét QR trạm</p>
            <p className="text-[10px] text-gray-500">Check-in hiện diện</p>
          </Link>
          <Link
            to={`/explore/${resolvedLocationId}`}
            className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-[#fe951c]/50 transition-colors"
          >
            <MaterialIcon name="map" className="text-[#fe951c] text-2xl" />
            <p className="mt-2 text-xs font-black text-white">Chi tiết di tích</p>
            <p className="text-[10px] text-gray-500">Tour & trải nghiệm</p>
          </Link>
          <Link
            to={`/journey-wrapped?site=${encodeURIComponent(code)}`}
            className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-400/50 transition-colors"
          >
            <MaterialIcon name="auto_awesome" className="text-purple-300 text-2xl" />
            <p className="mt-2 text-xs font-black text-white">Hồ sơ giao liên</p>
            <p className="text-[10px] text-gray-500">Wrapped 9:16</p>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/mode-select"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#fdb438] hover:text-white"
          >
            <MaterialIcon name="swap_horiz" className="text-sm" /> Chọn chế độ Onsite
          </Link>
          <Link
            to="/squad"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-white"
          >
            <MaterialIcon name="groups" className="text-sm" /> Tiểu đội
          </Link>
          <Link
            to={`/pricing?site=${encodeURIComponent(code)}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-white"
          >
            <MaterialIcon name="payments" className="text-sm" /> Journey Pass / Premium
          </Link>
        </div>
      </div>

      {showStory && <StoryJourneyPanel siteCode={code} />}
    </section>
  )
}

/** @deprecated Prefer SiteOnsiteHub — kept for existing imports. */
export function CuChiOnsiteHub(props: Omit<SiteOnsiteHubProps, 'siteCode' | 'locationId'>) {
  return <SiteOnsiteHub siteCode="cu-chi" locationId={CU_CHI_LOCATION_ID} {...props} />
}
