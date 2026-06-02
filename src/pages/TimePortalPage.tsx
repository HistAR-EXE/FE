import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { locationsApi, type PhotoPair } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function TimePortalPage() {
  const { locationId } = useParams<{ locationId?: string }>()
  const [pairs, setPairs] = useState<PhotoPair[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const pair = useMemo(() => pairs[index], [pairs, index])
  const { showToast } = useToast()

  useEffect(() => {
    if (!locationId) return
    const run = async () => {
      try {
        setLoading(true)
        setPairs(await locationsApi.getPhotoPairs(locationId))
      } catch (e) {
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được dữ liệu cổng thời gian.',
          type: 'error',
        })
        setPairs([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [locationId, showToast])

  return (
    <AppLayout activeBorder="left">
      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] relative mt-16">
        <header className="bg-surface/70 backdrop-blur-xl border-b border-outline-variant flex items-center h-16 px-xl z-40">
          <Link to={locationId ? `/explore/${locationId}` : '/explore'} className="text-on-surface-variant hover:text-secondary flex items-center gap-xs">
            <MaterialIcon name="arrow_back" /> Quay lại
          </Link>
          <h1 className="font-headline-lg font-bold text-on-surface ml-md">Cổng thời gian</h1>
        </header>
        <section className="relative flex-1 bg-surface-container-lowest overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,rgba(242,191,80,0.3),transparent_60%)]" />
        {loading && <p>Đang tải ảnh lịch sử...</p>}
        {!locationId && <p className="p-lg text-on-surface-variant">Thiếu locationId. Hãy mở từ màn chi tiết địa điểm.</p>}
        {!pair && !loading && <p className="p-lg text-on-surface-variant">Không có ảnh lịch sử cho địa điểm này.</p>}
        {pair && (
          <>
            <div className="relative h-full">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${pair.currentImage || images.timePortalPresent}')` }} />
              <div
                className="absolute inset-y-0 left-0 w-1/2 border-r border-primary/50 shadow-[0_0_15px_rgba(242,191,80,0.6)]"
                style={{ backgroundImage: `url('${pair.historicalImage || images.timePortalPast}')`, backgroundSize: 'cover', filter: 'sepia(0.6) contrast(1.1) brightness(0.9)' }}
              />
              <div className="absolute top-xl left-xl z-20 max-w-md">
                <h2 className="font-display-lg text-primary">{pair.year ?? '1900'}</h2>
                <p className="text-on-surface-variant text-sm">{pair.caption}</p>
              </div>
              <div className="absolute bottom-xl left-1/2 -translate-x-1/2 z-30 bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-xl">
                {pairs.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`font-title-md ${i === index ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
                  >
                    {p.year ?? `Mốc ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        </section>
      </main>
    </AppLayout>
  )
}

