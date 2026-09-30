// src/pages/PackPrepPage.tsx
// "Chuẩn bị hành trang": list pack assets from BE and cache them with the Cache API for offline use.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { getData, httpClient } from '../shared/api/httpClient'
import { appEnv } from '../shared/config/env'
import { emitEvent } from '../lib/pilotEvents'
import { isPilotSiteCode } from '../shared/config/constants'
/** Same cache name as the Workbox runtime rule for /media/ in vite.config.ts. */
const MEDIA_CACHE = 'histar-media'
const MANIFEST_KEY = 'histar_pack_manifest_v1'

type PackTier = 'lite' | 'full'

type PackAsset = { path: string; url: string; bytes?: number; required: boolean }

type PackManifest = { tier: PackTier; siteCode: string; generatedAt: string; assets: PackAsset[] }

type AssetState = 'idle' | 'caching' | 'cached' | 'error'

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function loadStoredManifest(tier: PackTier): PackManifest | null {
  try {
    const raw = localStorage.getItem(`${MANIFEST_KEY}:${tier}`)
    return raw ? (JSON.parse(raw) as PackManifest) : null
  } catch {
    return null
  }
}

/** API-served assets (e.g. faq_offline.json) come back as "/api/..." when the BE has no PACK_API_BASE_URL. */
function requestUrl(asset: PackAsset) {
  return asset.url.startsWith('/') ? `${appEnv.apiUrl}${asset.url}` : asset.url
}

async function cacheAsset(cache: Cache, asset: PackAsset) {
  const url = requestUrl(asset)
  const existing = await cache.match(url)
  if (existing) return
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await cache.put(url, res)
  } catch (err) {
    // Cross-origin host without CORS headers: store an opaque response so <img> still works offline.
    if (err instanceof TypeError) {
      const res = await fetch(url, { mode: 'no-cors' })
      await cache.put(url, res)
      return
    }
    throw err
  }
}

export function PackPrepPage() {
  const [params] = useSearchParams()
  const siteFromQuery = params.get('site')
  const SITE_CODE = isPilotSiteCode(siteFromQuery) ? siteFromQuery : 'cu-chi'
  const [tier, setTier] = useState<PackTier>('lite')
  const [manifest, setManifest] = useState<PackManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, AssetState>>({})
  const [running, setRunning] = useState(false)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const cacheSupported = typeof caches !== 'undefined'

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setStates({})
    ;(async () => {
      let next: PackManifest | null = null
      try {
        next = await getData<PackManifest>(httpClient.get(`/api/sites/${SITE_CODE}/pack`, { params: { tier } }))
        localStorage.setItem(`${MANIFEST_KEY}:${SITE_CODE}:${tier}`, JSON.stringify(next))
        localStorage.setItem(`${MANIFEST_KEY}:${tier}`, JSON.stringify(next))
      } catch (e) {
        next = loadStoredManifest(tier)
        if (!next && !cancelled) {
          setError(e instanceof Error && e.message ? e.message : 'Không tải được danh sách hành trang.')
        }
      }
      if (cancelled) return
      setManifest(next)
      if (next && cacheSupported) {
        const cache = await caches.open(MEDIA_CACHE)
        const entries = await Promise.all(
          next.assets.map(async (a) => [a.url, (await cache.match(requestUrl(a))) ? 'cached' : 'idle'] as const),
        )
        if (!cancelled) setStates(Object.fromEntries(entries))
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [tier, cacheSupported, SITE_CODE])

  const cachedCount = useMemo(
    () => manifest?.assets.filter((a) => states[a.url] === 'cached').length ?? 0,
    [manifest, states],
  )
  const total = manifest?.assets.length ?? 0
  const requiredReady =
    !!manifest && manifest.assets.filter((a) => a.required).every((a) => states[a.url] === 'cached')

  const downloadAll = useCallback(async () => {
    if (!manifest || !cacheSupported) return
    setRunning(true)
    const cache = await caches.open(MEDIA_CACHE)
    let cachedOk = 0
    let requiredFailed = 0
    for (const asset of manifest.assets) {
      setStates((s) => ({ ...s, [asset.url]: 'caching' }))
      try {
        await cacheAsset(cache, asset)
        cachedOk += 1
        setStates((s) => ({ ...s, [asset.url]: 'cached' }))
      } catch {
        if (asset.required) requiredFailed += 1
        setStates((s) => ({ ...s, [asset.url]: 'error' }))
      }
    }
    setRunning(false)
    // Pilot KPI: the pack finished downloading (all required assets cached).
    if (requiredFailed === 0) {
      try {
        localStorage.setItem(`histar_pack_lite_loaded:${manifest.siteCode}`, '1')
        localStorage.setItem('histar_pack_lite_loaded', '1')
      } catch {
        /* ignore quota */
      }
      emitEvent('pack_loaded', {
        payload: { tier: manifest.tier, siteCode: manifest.siteCode, cached: cachedOk, total: manifest.assets.length },
      })
    }
  }, [manifest, cacheSupported])

  const percent = total ? Math.round((cachedCount / total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans selection:bg-[#fe951c] selection:text-black">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
        >
          <MaterialIcon name="arrow_back" className="text-base" /> Quay lại
        </Link>

        <header className="mt-6 mb-8">
          <span className="px-3.5 py-1.5 rounded-full bg-[#1a79e5]/20 border border-[#388cf1]/50 text-[#388cf1] text-[10px] font-black uppercase tracking-widest">
            Offline · {SITE_CODE}
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight uppercase">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a79e5] via-[#fff2a1] to-[#fe951c]">
              Chuẩn bị hành trang
            </span>
          </h1>
          <p className="mt-3 text-sm text-gray-300 leading-relaxed max-w-xl">
            Tải trước ảnh và media quan trọng khi còn Wi-Fi để tiếp tục khám phá trong địa đạo, nơi sóng yếu hoặc mất
            kết nối.
          </p>
          <Link
            to={`/sites/${SITE_CODE}/stations/ST01/media`}
            className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#388cf1] hover:text-white transition-colors"
          >
            <MaterialIcon name="movie" className="text-base" /> Thử video 9:16 &amp; soundscape
          </Link>
        </header>

        {!online && (
          <div className="mb-6 rounded-2xl border border-[#fe951c]/40 bg-[#fe951c]/10 px-5 py-3 text-sm font-bold text-[#fdb438] flex items-center gap-3">
            <MaterialIcon name="wifi_off" className="text-xl" /> Bạn đang offline — chỉ xem được gói đã tải.
          </div>
        )}

        {!cacheSupported && (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300">
            Trình duyệt không hỗ trợ Cache API (cần HTTPS hoặc localhost).
          </div>
        )}

        <div className="flex gap-2 p-1.5 bg-[#161b29] rounded-2xl border border-white/5 shadow-inner w-full sm:w-fit mb-6">
          {(['lite', 'full'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              disabled={running}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 ${
                tier === t
                  ? 'bg-gradient-to-r from-[#1a79e5] to-[#388cf1] text-white shadow-[0_0_20px_rgba(56,140,241,0.5)]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'lite' ? 'Gói Lite' : 'Gói Full'}
            </button>
          ))}
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#161824] p-5 md:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tiến độ</p>
              <p className="text-2xl font-black text-[#fdb438]">
                {cachedCount}/{total} <span className="text-xs text-gray-500">tệp</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void downloadAll()}
              disabled={loading || running || !manifest || !cacheSupported || !online}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs uppercase tracking-wider shadow-[0_5px_20px_rgba(254,149,28,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
            >
              <MaterialIcon name={running ? 'sync' : 'download'} className={`text-lg ${running ? 'animate-spin' : ''}`} />
              {running ? 'Đang tải...' : cachedCount === total && total > 0 ? 'Tải lại' : 'Tải hành trang'}
            </button>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-[#1a79e5] to-[#fe951c] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          {loading && (
            <div className="flex justify-center py-10">
              <MaterialIcon name="radar" className="text-4xl text-[#388cf1] animate-spin" />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm font-bold text-red-300 py-6 text-center">{error}</p>
          )}

          {!loading && manifest && (
            <ul className="space-y-3">
              {manifest.assets.map((asset) => {
                const state = states[asset.url] ?? 'idle'
                return (
                  <li
                    key={asset.url}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#0B1120] border border-white/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-200 truncate">{asset.path}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">
                        {asset.required ? 'Bắt buộc' : 'Tuỳ chọn'} · {formatBytes(asset.bytes)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${
                        state === 'cached'
                          ? 'text-emerald-400'
                          : state === 'error'
                            ? 'text-red-400'
                            : state === 'caching'
                              ? 'text-[#388cf1]'
                              : 'text-gray-500'
                      }`}
                    >
                      <MaterialIcon
                        name={
                          state === 'cached'
                            ? 'check_circle'
                            : state === 'error'
                              ? 'error'
                              : state === 'caching'
                                ? 'sync'
                                : 'cloud_download'
                        }
                        className={`text-base ${state === 'caching' ? 'animate-spin' : ''}`}
                      />
                      {state === 'cached' ? 'Đã tải' : state === 'error' ? 'Lỗi' : state === 'caching' ? 'Đang tải' : 'Chưa tải'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {requiredReady && (
            <p className="mt-5 text-xs font-bold text-emerald-400 flex items-center gap-2">
              <MaterialIcon name="verified" className="text-base" /> Sẵn sàng offline cho các tệp bắt buộc.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
