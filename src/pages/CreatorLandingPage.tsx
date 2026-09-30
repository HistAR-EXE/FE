// C4 — Creator landing /creator/:code
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { getData, httpClient } from '../shared/api/httpClient'
import { emitEvent } from '../lib/pilotEvents'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

type Landing = {
  code: string
  creatorName: string
  headline: string | null
  active: boolean
}

export function CreatorLandingPage() {
  const { code = 'demo' } = useParams<{ code: string }>()
  const [data, setData] = useState<Landing | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = sessionStorage.getItem('histar_session_id') || crypto.randomUUID()
    sessionStorage.setItem('histar_session_id', sessionId)
    try {
      localStorage.setItem('histar_referral_code', code)
    } catch {
      /* ignore */
    }
    emitEvent('landing_visit', { payload: { code, path: `/creator/${code}` } })
    getData<Landing>(httpClient.get(`/api/referral/${encodeURIComponent(code)}`))
      .then(setData)
      .catch((e) => setError(getFriendlyErrorMessage(e, 'quest')))
    void httpClient
      .post(`/api/referral/${encodeURIComponent(code)}/visit`, { sessionId })
      .catch(() => undefined)
  }, [code])

  return (
    <AppLayout>
      <SimpleTopNav title="Creator" />
      <div className="max-w-lg mx-auto p-6 space-y-4 text-center">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {data && (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#fdb438]">Mời từ creator</p>
            <h1 className="text-3xl font-black text-white">{data.creatorName}</h1>
            <p className="text-gray-300">{data.headline || 'Khám phá địa đạo Củ Chi cùng HistAR'}</p>
            <p className="text-xs font-mono text-gray-500">mã: {data.code}</p>
            <Link
              to={`/register?ref=${encodeURIComponent(data.code)}`}
              className="inline-flex px-8 py-3 rounded-xl bg-[#fe951c] text-black font-black text-sm uppercase"
            >
              Bắt đầu hành trình
            </Link>
            <div>
              <Link
                to={`/creator/${encodeURIComponent(data.code)}/stats`}
                className="text-xs font-bold text-gray-400 hover:text-[#fdb438]"
              >
                Xem thống kê mã giới thiệu (30 ngày)
              </Link>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
