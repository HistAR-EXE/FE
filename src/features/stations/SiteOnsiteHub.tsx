// Generic onsite hub: pack → scan → story (per pilot site).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { StoryJourneyPanel } from '../story/StoryJourneyPanel'
import {
  CU_CHI_LOCATION_ID,
  getPilotSite,
  locationIdFromSiteCode,
  type PilotSiteCode,
} from '../../shared/config/constants'
import { appEnv } from '../../shared/config/env'

/** Matches PackPrepPage constants. */
const MEDIA_CACHE = 'histar-media-v2'
const MANIFEST_KEY = 'histar_pack_manifest_v1'

type PackAsset = { url: string; required: boolean }
type PackManifest = { assets: PackAsset[] }

type CacheStatus = { pct: number; total: number; cached: number }

function requestUrl(asset: PackAsset): string {
  return asset.url.startsWith('/') ? `${appEnv.apiUrl}${asset.url}` : asset.url
}

function usePackCacheStatus(siteCode: string): CacheStatus {
  const [status, setStatus] = useState<CacheStatus>({ pct: 0, total: 0, cached: 0 })

  useEffect(() => {
    if (typeof caches === 'undefined') return
    let cancelled = false
    ;(async () => {
      try {
        const raw =
          localStorage.getItem(`${MANIFEST_KEY}:${siteCode}:lite`) ??
          localStorage.getItem(`${MANIFEST_KEY}:lite`)
        if (!raw) return
        const manifest: PackManifest = JSON.parse(raw)
        const assets = manifest.assets ?? []
        if (!assets.length) return
        const cache = await caches.open(MEDIA_CACHE)
        let cached = 0
        await Promise.all(
          assets.map(async (a) => {
            const hit = await cache.match(requestUrl(a))
            if (hit) cached += 1
          }),
        )
        if (!cancelled) setStatus({ pct: Math.round((cached / assets.length) * 100), total: assets.length, cached })
      } catch {
        // Cache API unavailable (private browsing, non-HTTPS) — ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [siteCode])

  return status
}

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
  const cacheStatus = usePackCacheStatus(code)

  const packLabel =
    cacheStatus.total === 0
      ? 'Tải về'
      : cacheStatus.pct === 100
        ? '✅ Sẵn offline'
        : `${cacheStatus.pct}% đã tải`

  const packSubLabel =
    cacheStatus.total === 0
      ? 'Gói Lite / Full offline'
      : cacheStatus.pct === 100
        ? `${cacheStatus.cached}/${cacheStatus.total} tệp`
        : `${cacheStatus.cached}/${cacheStatus.total} tệp đã lưu`

  const tile = 'flex flex-col gap-1 rounded-2xl bg-white p-4 ring-1 ring-[#0275FB]/10 transition hover:-translate-y-0.5 hover:ring-[#0275FB]/40'

  return (
    <section data-testid="site-onsite-hub" data-site={code} className={`space-y-6 ${className}`}>
      <div className="rounded-3xl bg-gradient-to-br from-[#F2F7FF] to-[#FFF8DC] p-5 ring-1 ring-[#0275FB]/10 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0275FB] text-white shadow-[0_4px_0_#0159C2]">
            <MaterialIcon name="explore" className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0F1B33]">
              {title}
              {region ? <span className="text-sm font-bold text-slate-500"> · Miền {region}</span> : null}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Một địa điểm – 6 trạm – một mạch truyện. Tải gói trước khi vào; quét QR tại trạm để mở chương.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to={`/pack-prep?site=${encodeURIComponent(code)}`} className={tile}>
            <MaterialIcon
              name={cacheStatus.pct === 100 ? 'offline_pin' : 'download'}
              className={`text-2xl ${cacheStatus.pct === 100 ? 'text-emerald-500' : 'text-[#0275FB]'}`}
            />
            <p className="mt-1 text-xs font-black text-[#0F1B33]">{packLabel}</p>
            <p className="text-[10px] font-semibold text-slate-500">{packSubLabel}</p>
          </Link>
          <Link to={`/scan?locationId=${encodeURIComponent(resolvedLocationId)}&site=${encodeURIComponent(code)}`} className={tile}>
            <MaterialIcon name="qr_code_scanner" className="text-2xl text-emerald-500" />
            <p className="mt-1 text-xs font-black text-[#0F1B33]">Quét QR trạm</p>
            <p className="text-[10px] font-semibold text-slate-500">Check-in hiện diện</p>
          </Link>
          <Link to={`/sites/${encodeURIComponent(code)}/stations/ST01/media`} className={tile}>
            <MaterialIcon name="photo_library" className="text-2xl text-[#F5A800]" />
            <p className="mt-1 text-xs font-black text-[#0F1B33]">Xem trước 6 trạm</p>
            <p className="text-[10px] font-semibold text-slate-500">Ảnh thật & thuyết minh</p>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/mode-select" className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#0275FB] hover:underline">
            <MaterialIcon name="swap_horiz" className="text-sm" /> Chọn chế độ Onsite
          </Link>
          <Link to={`/pricing?site=${encodeURIComponent(code)}`} className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#8A6A00] hover:underline">
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
