// Next-step rail after station check-in / onsite hub CTAs (MVBP onsite loop).
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { getSeededMinigameId } from '../minigames/api'
import { buildChatPath } from '../chat/chatRoute'
import { CU_CHI_LOCATION_ID, locationIdFromSiteCode } from '../../shared/config/constants'

const STATION_NAMES: Record<string, Record<string, string>> = {
  'cu-chi': {
    ST01: 'Phòng họp',
    ST02: 'Kho ngầm',
    ST03: 'Giếng hầm & thông gió',
    ST04: 'Quân y',
    ST05: 'Xưởng vũ khí',
    ST06: 'Hầm phòng thủ',
  },
  'hoang-thanh-thang-long': {
    ST01: 'Cổng tiếp nhận Hoàng Diệu',
    ST02: 'Khu khảo cổ 18 Hoàng Diệu',
    ST03: 'Nền Điện Kính Thiên',
    ST04: 'Bảo tàng Hoàng thành',
    ST05: 'Hầm chỉ huy',
    ST06: 'Kỳ đài — Cột cờ',
  },
  'dai-noi-hue': {
    ST01: 'Ngọ Môn',
    ST02: 'Điện Thái Hòa',
    ST03: 'Thế Miếu',
    ST04: 'Cung Kiến Trung',
    ST05: 'Hồ Tịnh Tâm',
    ST06: 'Lối kết hành trình',
  },
}

export function stationDisplayName(code: string, siteCode = 'cu-chi'): string {
  return STATION_NAMES[siteCode]?.[code] ?? STATION_NAMES['cu-chi']?.[code] ?? code
}

type StationNextStepsProps = {
  stationCode: string
  siteCode?: string
  locationId?: string
  compact?: boolean
  className?: string
}

export function StationNextSteps({
  stationCode,
  siteCode = 'cu-chi',
  locationId,
  compact = false,
  className = '',
}: StationNextStepsProps) {
  const site = siteCode.trim().toLowerCase() || 'cu-chi'
  const locId = locationId ?? locationIdFromSiteCode(site) ?? CU_CHI_LOCATION_ID
  const gameId = getSeededMinigameId(site, stationCode)
  const chatBase = buildChatPath({ locationId: locId })
  const chatHref = `${chatBase}${chatBase.includes('?') ? '&' : '?'}station=${encodeURIComponent(stationCode)}&site=${encodeURIComponent(site)}`
  const name = stationDisplayName(stationCode, site)
  const mediaHref = `/sites/${encodeURIComponent(site)}/stations/${encodeURIComponent(stationCode)}/media`
  const gameHref = gameId
    ? `/sites/${encodeURIComponent(site)}/stations/${encodeURIComponent(stationCode)}/game/${gameId}`
    : null

  return (
    <div
      data-testid={`station-next-steps-${stationCode}`}
      data-site={site}
      className={`rounded-2xl border border-[#fe951c]/30 bg-[#161824]/90 p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <MaterialIcon name="route" className="text-[#fe951c]" />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Bước tiếp theo · {stationCode} {name}
        </h3>
      </div>
      {!compact && (
        <p className="text-xs text-gray-400">
          Ưu tiên nghe lời dẫn / soundscape. Đọc chương truyện sau khi check-in để mở mạch tuần tự.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link
          to={mediaHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#388cf1]/15 border border-[#388cf1]/40 text-[#388cf1] text-xs font-bold"
        >
          <MaterialIcon name="movie" className="text-sm" /> Video & soundscape
        </Link>
        {gameHref && (
          <Link
            to={gameHref}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fe951c]/15 border border-[#fe951c]/40 text-[#fdb438] text-xs font-bold"
          >
            <MaterialIcon name="sports_esports" className="text-sm" /> Mini-game
          </Link>
        )}
        <Link
          to={chatHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
        >
          <MaterialIcon name="forum" className="text-sm" /> Chat theo trạm
        </Link>
        <Link
          to={`/home#story-journey-${site}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
        >
          <MaterialIcon name="auto_stories" className="text-sm" /> Đọc chương truyện
        </Link>
        <Link
          to={`/time-portal/${locId}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
        >
          <MaterialIcon name="view_in_ar" className="text-sm" /> Cổng thời gian
        </Link>
        <Link
          to="/photo-frame"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
        >
          <MaterialIcon name="photo_camera" className="text-sm" /> Camera
        </Link>
      </div>
    </div>
  )
}
