// Next-step rail after station check-in / onsite hub CTAs (MVBP onsite loop).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { getSeededMinigameId } from '../minigames/api'
import { getPublishedRoleTemplates } from '../heritage-studio/roleTemplates'
import type { HeritageStationCode } from '../heritage-studio/types'
import { CU_CHI_LOCATION_ID, locationIdFromSiteCode } from '../../shared/config/constants'
import { stationsApi } from './api'
import {
  appendStationContext,
  buildStationCameraPath,
  buildStationHeritagePath,
  buildStationChatPath,
  buildStationPagePath,
  buildStationStoryPath,
} from './stationRoutes'

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
  const context = { siteCode: site, stationCode, locationId: locId }
  const gameId = getSeededMinigameId(site, stationCode)
  const [name, setName] = useState(() => stationDisplayName(stationCode, site))
  useEffect(() => {
    let cancelled = false
    stationsApi
      .get(site, stationCode)
      .then((station) => !cancelled && setName(station.name))
      .catch(() => !cancelled && setName(stationDisplayName(stationCode, site)))
    return () => {
      cancelled = true
    }
  }, [site, stationCode])
  const chatHref = buildStationChatPath(context)
  const mediaHref = buildStationPagePath(context)
  const hasHeritageRoles = getPublishedRoleTemplates(site, stationCode as HeritageStationCode).length > 0
  const gameHref = gameId
    ? appendStationContext(`/sites/${encodeURIComponent(site)}/stations/${encodeURIComponent(stationCode)}/game/${gameId}`, context)
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
          Mở nội dung, câu chuyện hoặc trò chơi gắn trực tiếp với trạm vừa check-in.
        </p>
      )}
      {/* Vừa quét QR xong: mini-game của trạm vừa mở khoá, cho nó là nút nổi nhất. */}
      {gameHref && (
        <Link
          to={gameHref}
          data-testid={`station-game-cta-${stationCode}`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] p-3 text-black shadow-[0_8px_20px_-8px_rgba(254,149,28,0.9)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/15">
            <MaterialIcon name="lock_open" className="text-xl" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">Đã mở khoá: mini-game trạm {stationCode}</span>
            <span className="block text-[11px] font-bold opacity-80">Chơi ngay để lấy điểm trạm</span>
          </span>
          <MaterialIcon name="chevron_right" className="text-xl" />
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          to={mediaHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#388cf1]/15 border border-[#388cf1]/40 text-[#388cf1] text-xs font-bold"
        >
          <MaterialIcon name="explore" className="text-sm" /> Khám phá trạm {stationCode}
        </Link>
        <Link
          to={chatHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
        >
          <MaterialIcon name="forum" className="text-sm" /> Chat theo trạm
        </Link>
        <Link
          to={buildStationStoryPath(context)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
        >
          <MaterialIcon name="auto_stories" className="text-sm" /> Câu chuyện tại trạm
        </Link>
        <Link
          to={buildStationCameraPath(context)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
        >
          <MaterialIcon name="photo_camera" className="text-sm" /> Ảnh kỷ niệm
        </Link>
        {hasHeritageRoles && (
          <Link
            to={buildStationHeritagePath(context)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs font-bold"
          >
            <MaterialIcon name="auto_awesome" className="text-sm" /> Hóa thân {stationCode}
          </Link>
        )}
      </div>
    </div>
  )
}
