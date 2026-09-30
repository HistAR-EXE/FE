// C4 — Creator self-serve stats (non-PII).
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { getData, httpClient } from '../shared/api/httpClient'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

type Stats = {
  code: string
  creatorName: string
  visits30d: number
  uniqueUsers30d: number
}

export function CreatorStatsPage() {
  const { code = 'demo' } = useParams<{ code: string }>()
  const [data, setData] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getData<Stats>(httpClient.get(`/api/referral/${encodeURIComponent(code)}/stats`, { params: { days: 30 } }))
      .then(setData)
      .catch((e) => setError(getFriendlyErrorMessage(e, 'quest')))
  }, [code])

  return (
    <AppLayout>
      <SimpleTopNav title="Creator stats" />
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <Link to={`/creator/${code}`} className="text-xs font-bold text-[#388cf1]">
          ← Landing
        </Link>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {data && (
          <>
            <h1 className="text-2xl font-black text-white">{data.creatorName}</h1>
            <p className="text-xs font-mono text-gray-500">mã: {data.code} · 30 ngày</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#161824] p-4">
                <p className="text-[10px] uppercase text-gray-500">Landing visits</p>
                <p className="text-2xl font-black text-[#fdb438]">{data.visits30d}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#161824] p-4">
                <p className="text-[10px] uppercase text-gray-500">Unique users</p>
                <p className="text-2xl font-black text-white">{data.uniqueUsers30d}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Hashtag gợi ý (CMO): #TimeLensCuChi #MotNgayDuoiLongDat — xác nhận với BQL trước khi dùng ngày lễ.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  )
}
