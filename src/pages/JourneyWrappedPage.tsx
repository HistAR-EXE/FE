// C3 — Hồ sơ giao liên (Wrapped)
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type JourneySummary } from '../features/profile/api'
import { emitEvent } from '../lib/pilotEvents'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { getPilotSite, isPilotSiteCode } from '../shared/config/constants'
import { shouldShowB2CPaywall } from '../shared/access/contentAccess'
import { useAuth } from '../shared/auth/useAuth'

export function JourneyWrappedPage() {
  const [params] = useSearchParams()
  const site = isPilotSiteCode(params.get('site')) ? params.get('site')! : 'cu-chi'
  const siteMeta = getPilotSite(site)
  const { user } = useAuth()
  const [data, setData] = useState<JourneySummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    profileApi
      .journeySummary(site)
      .then(setData)
      .catch((e) => setError(getFriendlyErrorMessage(e, 'quest')))
  }, [site])

  const depthM = (data?.stationsVisited ?? 0) * 12
  const referralCode =
    typeof localStorage !== 'undefined' ? localStorage.getItem('histar_referral_code') : null

  const share = async () => {
    emitEvent('share_initiated', { payload: { format: '9x16', channel: 'journey_wrapped' } })
    const refBit = referralCode ? `\nMã giới thiệu: ${referralCode}` : ''
    const text = data
      ? `${data.headline}\n${data.stationsVisited}/${data.totalStations} trạm · ~${depthM}m (minh họa)${refBit}\nhttps://timelens.asia`
      : `HistAR ${siteMeta?.name ?? 'TimeLens'}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Hồ sơ giao liên HistAR', text })
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard?.writeText(text)
    }
  }

  return (
    <AppLayout>
      <SimpleTopNav title="Hồ sơ giao liên" />
      <div className="max-w-md mx-auto p-4 space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!data && !error && <p className="text-gray-400 text-sm">Đang tải…</p>}
        {data && (
          <div className="aspect-[9/16] rounded-[2rem] bg-gradient-to-b from-[#1b1e2c] to-[#0B1120] border border-[#fe951c]/40 p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#fdb438]">
                TimeLens · {siteMeta?.shortTitle ?? site}
              </p>
              <h1 className="text-2xl font-black text-white mt-2">{data.displayName}</h1>
              <p className="text-sm text-gray-300 mt-2">{data.headline}</p>
            </div>
            <div className="space-y-3 text-white">
              <p className="text-4xl font-black text-[#fe951c]">
                {data.stationsVisited}/{data.totalStations}
              </p>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Trạm đã qua</p>
              <p className="text-sm">
                Độ sâu minh họa ≈ <strong>{depthM} m</strong> dưới lòng đất
                <span className="block text-[10px] text-gray-500">(số hư cấu từ số trạm — không phải đo thực)</span>
              </p>
              <p className="text-sm text-gray-300">
                Chương: {data.chaptersCompleted} · Mini-game: {data.minigamesPlayed} · XP: {data.totalPoints}
              </p>
              {data.visitedStationCodes?.length > 0 && (
                <p className="text-[11px] font-mono text-gray-500">{data.visitedStationCodes.join(' · ')}</p>
              )}
            </div>
            <p className="text-[10px] text-gray-500">timelens.asia</p>
            {referralCode && (
              <p className="text-[10px] font-mono text-[#fdb438] mt-1">ref: {referralCode}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void share()}
            className="flex-1 px-4 py-3 rounded-xl bg-[#fe951c] text-black font-black text-xs uppercase"
          >
            Chia sẻ
          </button>
          {shouldShowB2CPaywall(user) && (
            <>
              <Link
                to={`/checkout/b2c?site=${encodeURIComponent(site)}&next=${encodeURIComponent(`/journey-wrapped?site=${site}`)}`}
                className="px-4 py-3 rounded-xl bg-[#388cf1] text-white text-xs font-bold uppercase"
                data-testid="wrapped-upsell-premium"
              >
                Premium tháng
              </Link>
              <Link
                to={`/checkout/b2c?plan=journey_pass&site=${encodeURIComponent(site)}&next=${encodeURIComponent(`/journey-wrapped?site=${site}`)}`}
                className="px-4 py-3 rounded-xl border border-emerald-400/50 text-emerald-300 text-xs font-bold uppercase"
                data-testid="wrapped-upsell-journey-pass"
              >
                Journey Pass
              </Link>
            </>
          )}
          <Link
            to="/creator/demo"
            className="px-4 py-3 rounded-xl border border-white/20 text-white text-xs font-bold uppercase"
          >
            Mã creator
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
