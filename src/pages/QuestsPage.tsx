import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { gamificationApi, type Quest, type QuestProgress } from '../features/gamification/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { isReadyToStart } from '../features/gamification/questProgress'
import { locationsApi } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { appEnv } from '../shared/config/env'

export function QuestsPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const urlLocationId = searchParams.get('locationId') ?? ''
  const [activeLocationId, setActiveLocationId] = useState('')
  const [quests, setQuests] = useState<Quest[]>([])
  const [progresses, setProgresses] = useState<QuestProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all')
  const { showToast } = useToast()

  useEffect(() => {
    const resolveLocation = async () => {
      if (urlLocationId) {
        setActiveLocationId(urlLocationId)
        return
      }
      try {
        const locations = await locationsApi.list()
        setActiveLocationId(locations[0]?.id ?? '')
      } catch {
        setActiveLocationId('')
      }
    }
    resolveLocation()
  }, [urlLocationId])

  const refetchQuests = useCallback(async () => {
    try {
      setLoading(true)
      if (!activeLocationId) {
        setQuests([])
        setProgresses([])
        return
      }
      const list = await gamificationApi.quests(activeLocationId)
      setQuests(list)
      if (isAuthenticated) {
        const mine = await gamificationApi.myQuests(activeLocationId)
        setProgresses(mine)
      } else {
        setProgresses([])
      }
    } catch (e) {
      showToast({
        message: e instanceof ApiError ? e.message : 'Không tải được danh sách nhiệm vụ.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, activeLocationId, showToast])

  useEffect(() => {
    void refetchQuests()
  }, [refetchQuests])

  useEffect(() => {
    if (!isAuthenticated || !activeLocationId) return
    const onDiscoveryRecorded = () => {
      void refetchQuests()
    }
    window.addEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
    return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
  }, [isAuthenticated, activeLocationId, refetchQuests])

  const getStatus = (questId: string) =>
    isAuthenticated ? progresses.find((p) => p.questId === questId)?.status ?? 'not_started' : 'not_started'
  const filteredQuests = quests.filter((q) =>
    statusFilter === 'all'
      ? true
      : statusFilter === 'not_started'
        ? getStatus(q.id) === 'not_started'
        : getStatus(q.id) === statusFilter,
  )
  const progressPct = (status: string, currentStep?: number, stepsTotal?: number) => {
    if (typeof currentStep === 'number' && typeof stepsTotal === 'number' && stepsTotal > 0) {
      return Math.max(0, Math.min(100, Math.round((currentStep / stepsTotal) * 100)))
    }
    return status === 'completed' ? 100 : status === 'in_progress' ? 58 : 12
  }
  const getProgress = (questId: string) => progresses.find((p) => p.questId === questId)

  const handleStartQuest = async (questId: string, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) return
    try {
      const started = await gamificationApi.startQuest(questId)
      setProgresses((prev) => {
        const rest = prev.filter((p) => p.questId !== questId)
        return [...rest, started]
      })
      showToast({ message: 'Bắt đầu nhiệm vụ thành công.', type: 'success' })
    } catch (err) {
      showToast({
        message: err instanceof ApiError ? err.message : 'Không thể bắt đầu nhiệm vụ.',
        type: 'error',
      })
    }
  }

  const questsForDisplay: Array<{
    id: string
    to: string
    title: string
    description: string
    pointsReward: number
    status: string
    image: string
    currentStep?: number
    stepsTotal?: number
    readyToStart?: boolean
  }> = filteredQuests.map((q) => ({
    id: q.id,
    to: `/quests/${q.id}`,
    title: q.title,
    description: q.description,
    pointsReward: q.pointsReward,
    status: getStatus(q.id),
    image: q.coverImage || (q.title.toLowerCase().includes('chùa') ? images.questBiAnChuaCau : images.questDauAnHoangThanh),
    currentStep: getProgress(q.id)?.currentStep,
    stepsTotal: getProgress(q.id)?.stepsTotal ?? q.stepsTotal,
    readyToStart: (() => {
      const progress = getProgress(q.id)
      return progress ? isReadyToStart(progress) : false
    })(),
  }))

  if (appEnv.demoMode && questsForDisplay.length < 2) {
    const seed = [
      {
        id: 'seed-quest-1',
        to: '/explore',
        title: 'Dấu ấn Hoàng Thành',
        description: 'Giải mã các cổ vật được tìm thấy tại khu vực trung tâm để khôi phục dòng thời gian.',
        pointsReward: 500,
        status: 'in_progress',
        image: images.questDauAnHoangThanh,
        currentStep: 2,
        stepsTotal: 4,
      },
      {
        id: 'seed-quest-2',
        to: '/explore',
        title: 'Bí ẩn Chùa Cầu',
        description: 'Tìm kiếm các dấu vết thương mại cổ đại dọc theo bờ sông.',
        pointsReward: 200,
        status: 'not_started',
        image: images.questBiAnChuaCau,
        currentStep: 1,
        stepsTotal: 3,
      },
    ]
    seed.forEach((item) => {
      if (questsForDisplay.length < 2) questsForDisplay.push(item)
    })
  }

  const displayCards = questsForDisplay.map((q, index) => ({
    ...q,
    borderClass: index === 0 ? 'border-primary/30 hover:border-primary/60' : 'border-outline-variant hover:border-secondary/60',
    xpClass: index === 0 ? 'border-primary/50 text-primary' : 'border-outline-variant text-on-surface-variant',
  }))

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-7xl mx-auto w-full">
        <h1 className="text-[46px] leading-[54px] font-bold tracking-[-0.02em] text-primary mb-md [text-shadow:0_0_10px_rgba(242,191,80,0.3)]">Nhiệm vụ</h1>
        {!isAuthenticated && (
          <p className="text-on-surface-variant mb-md">
            Bạn đang xem ở chế độ guest. Đăng nhập để bắt đầu nhiệm vụ và lưu tiến trình.
          </p>
        )}
        <div className="flex flex-wrap gap-md border-b border-surface-container-highest pb-sm mb-lg overflow-x-auto">
          {[
            { id: 'in_progress', label: 'Đang làm' },
            { id: 'completed', label: 'Hoàn thành' },
            { id: 'all', label: 'Tất cả' },
          ].map((item) => (
            <button
              key={`${item.id}-${item.label}`}
              type="button"
              onClick={() => setStatusFilter(item.id as typeof statusFilter)}
              className={`pb-1 px-2 font-title-md transition-colors border-b-2 ${
                statusFilter === item.id ? 'text-secondary border-secondary' : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {loading && <p className="mb-sm text-on-surface-variant">Đang tải nhiệm vụ...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {displayCards.map((q) => (
            <Link
              key={q.id}
              to={q.to}
              className={`block bg-surface-container border rounded-xl overflow-hidden transition-all hover:-translate-y-1 ${q.borderClass}`}
            >
              <div className="h-48 relative">
                <img src={q.image} alt={q.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
                <span className={`absolute right-sm top-sm px-3 py-1 rounded-full border bg-surface-container-high/80 backdrop-blur-md text-xs inline-flex items-center gap-1 ${q.xpClass}`}>
                  <MaterialIcon name="stars" className="text-base" />
                  +{q.pointsReward} XP
                </span>
              </div>
              <div className="p-md relative z-10 -mt-10">
                <div className="flex items-end justify-between gap-sm mb-sm">
                  <h2 className="font-headline-lg text-on-surface leading-tight">{q.title}</h2>
                  <span className="px-2 py-1 rounded bg-surface text-xs text-on-surface-variant">
                    {q.currentStep ?? Math.max(1, Math.round(progressPct(q.status, q.currentStep, q.stepsTotal) / 25))}/{q.stepsTotal ?? 4} bước
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mb-md">{q.description}</p>
                {q.status === 'not_started' && q.readyToStart && (
                  <div className="mb-md rounded-lg border border-secondary/40 bg-secondary/10 p-sm">
                    <p className="text-sm text-on-surface mb-sm">
                      {getProgress(q.id)?.hasCheckinAtLocation
                        ? 'Nhiệm vụ sẵn sàng hoàn thành'
                        : 'Bắt đầu nhiệm vụ và check-in để nhận thưởng'}
                    </p>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={(e) => void handleStartQuest(q.id, e)}
                        className="bg-primary text-on-primary px-sm py-xs rounded-lg text-sm"
                      >
                        Bắt đầu ngay
                      </button>
                    )}
                  </div>
                )}
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${progressPct(q.status, q.currentStep, q.stepsTotal)}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
        {!loading && questsForDisplay.length === 0 && (
          <div className="mt-md text-center py-xl border border-dashed border-outline-variant rounded-xl">
            <MaterialIcon name="assignment" className="text-4xl text-on-surface-variant mb-sm" />
            <p className="text-on-surface-variant">Chưa có nhiệm vụ. Hãy check-in tại di tích để mở nhiệm vụ mới.</p>
            <Link to="/scan" className="inline-flex items-center gap-1 mt-md text-secondary underline">
              Đi tới quét mã <MaterialIcon name="qr_code_scanner" className="text-sm" />
            </Link>
          </div>
        )}
        <section className="mt-xl border border-outline-variant rounded-xl p-md bg-surface-container-low opacity-80">
          <h3 className="font-title-md mb-md flex items-center gap-2 text-on-surface-variant">
            <MaterialIcon name="lock" /> Nhiệm vụ sắp tới
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant">
                <MaterialIcon name="map" className="text-outline text-3xl" />
              </div>
              <div>
              <p className="font-title-md">Mật mã Lăng Tẩm</p>
              <p className="text-sm text-on-surface-variant">Mở khóa khi đạt Cấp 5</p>
              </div>
            </div>
            <Link to="/explore" className="inline-flex items-center gap-1 border border-secondary text-secondary px-md py-sm rounded-lg">
              <MaterialIcon name="explore" className="text-base" /> Xem bản đồ
            </Link>
          </div>
        </section>
      </main>
    </AppLayout>
  )
}

