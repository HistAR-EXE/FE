import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { gamificationApi, type Quest, type QuestProgress } from '../features/gamification/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { HERITAGE_QUEST_META } from '../features/gamification/heritageQuestSteps'
import { isReadyToStart } from '../features/gamification/questProgress'
import { locationsApi, type Location } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { isLocationLocked } from '../features/explore/locationUnlock'
import { appEnv } from '../shared/config/env'

export function QuestsPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const urlLocationId = searchParams.get('locationId') ?? ''
  const [locations, setLocations] = useState<Location[]>([])
  const [activeLocationId, setActiveLocationId] = useState('')
  const [quests, setQuests] = useState<Quest[]>([])
  const [progresses, setProgresses] = useState<QuestProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all')
  const { showToast } = useToast()

  useEffect(() => {
    locationsApi.list({ size: 50 }).then(setLocations).catch(() => setLocations([]))
  }, [])

  useEffect(() => {
    if (urlLocationId) {
      setActiveLocationId(urlLocationId)
      return
    }
    setActiveLocationId('all')
  }, [urlLocationId])

  const refetchQuests = useCallback(async () => {
    try {
      setLoading(true)
      if (!activeLocationId) {
        setQuests([])
        setProgresses([])
        return
      }
      const list = await gamificationApi.quests(activeLocationId === 'all' ? undefined : activeLocationId)
      setQuests(list)
      if (isAuthenticated) {
        const mine = await gamificationApi.myQuests(activeLocationId === 'all' ? undefined : activeLocationId)
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

  const statusCounts = useMemo(() => {
    const counts = { all: quests.length, not_started: 0, in_progress: 0, completed: 0 }
    quests.forEach((q) => {
      const s = getStatus(q.id)
      if (s === 'not_started') counts.not_started += 1
      else if (s === 'in_progress') counts.in_progress += 1
      else if (s === 'completed') counts.completed += 1
    })
    return counts
  }, [quests, progresses, isAuthenticated])

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
      setStatusFilter('in_progress')
      void refetchQuests()
    } catch (err) {
      showToast({
        message: err instanceof ApiError ? err.message : 'Không thể bắt đầu nhiệm vụ.',
        type: 'error',
      })
    }
  }

  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations])

  const questsForDisplay: Array<{
    id: string
    to: string
    title: string
    description: string
    missionHook: string
    city: string
    difficulty: string
    estimatedMinutes: number
    pointsReward: number
    status: string
    image: string
    currentStep?: number
    stepsTotal?: number
    readyToStart?: boolean
    completionTrigger?: string | null
    requireOnsiteCheckin?: boolean
    locationLocked?: boolean
  }> = filteredQuests.map((q) => {
    const meta = HERITAGE_QUEST_META[q.id]
    const progress = getProgress(q.id)
    const loc = locationById.get(q.locationId)
    return {
      id: q.id,
      to: `/quests/${q.id}`,
      title: q.title,
      description: q.description,
      missionHook: meta?.missionHook ?? q.description,
      city: meta?.city ?? '',
      difficulty: meta?.difficulty ?? 'trung bình',
      estimatedMinutes: meta?.estimatedMinutes ?? 15,
      pointsReward: q.pointsReward,
      status: getStatus(q.id),
      image: q.coverImage || images.questDauAnHoangThanh,
      currentStep: progress?.currentStep,
      stepsTotal: progress?.stepsTotal ?? q.stepsTotal,
      readyToStart: (() => {
        if (progress) return isReadyToStart(progress)
        return q.completionTrigger === 'discovery'
      })(),
      completionTrigger: q.completionTrigger,
      requireOnsiteCheckin: progress?.requireOnsiteCheckin ?? q.requireOnsiteCheckin ?? q.completionTrigger === 'checkin',
      locationLocked: loc ? isLocationLocked(loc) : false,
    }
  })

  if (appEnv.demoMode && questsForDisplay.length === 0) {
    const seed = [
      {
        id: 'seed-quest-1',
        to: '/explore',
        title: 'Dấu ấn Hoàng Thành',
        description: 'Giải mã các tầng lịch sử tại trung tâm Thăng Long.',
        missionHook: 'Khai quật 13 thế kỷ quyền lực — từng chương một.',
        city: 'Hà Nội',
        difficulty: 'trung bình',
        estimatedMinutes: 15,
        pointsReward: 500,
        status: 'in_progress',
        image: images.questDauAnHoangThanh,
        currentStep: 2,
        stepsTotal: 3,
      },
      {
        id: 'seed-quest-2',
        to: '/explore',
        title: 'Bí ẩn Chùa Cầu',
        description: 'Hành trình thương nhân phố cổ Hội An.',
        missionHook: 'Tìm dấu vết giao thoa trên sông Thu Bồn.',
        city: 'Quảng Nam',
        difficulty: 'dễ',
        estimatedMinutes: 12,
        pointsReward: 200,
        status: 'not_started',
        image: images.questBiAnChuaCau,
        currentStep: 0,
        stepsTotal: 3,
      },
    ]
    seed.forEach((item) => {
      questsForDisplay.push(item)
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
        <h1 className="text-[46px] leading-[54px] font-bold tracking-[-0.02em] text-primary mb-sm [text-shadow:0_0_10px_rgba(242,191,80,0.3)]">Nhiệm vụ</h1>
        <p className="text-on-surface-variant mb-md max-w-2xl">
          Hành trình hybrid thị giác — online: hiện vật, Time Portal, tour 360°. Offline: check-in onsite nhận thưởng +25 XP.
        </p>
        {!isAuthenticated && (
          <p className="text-on-surface-variant mb-md">
            Bạn đang xem ở chế độ guest. Đăng nhập để nhận nhiệm vụ và lưu tiến trình.
          </p>
        )}
        <div className="flex flex-wrap gap-sm mb-md overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveLocationId('all')}
            className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap ${
              activeLocationId === 'all'
                ? 'border-primary text-primary bg-primary/10'
                : 'border-outline-variant text-on-surface-variant hover:border-secondary'
            }`}
          >
            Tất cả di tích
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setActiveLocationId(loc.id)}
              className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap ${
                activeLocationId === loc.id
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-outline-variant text-on-surface-variant hover:border-secondary'
              }`}
            >
              {loc.city} · {loc.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-md border-b border-surface-container-highest pb-sm mb-lg overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả', count: statusCounts.all },
            { id: 'not_started', label: 'Chưa bắt đầu', count: statusCounts.not_started },
            { id: 'in_progress', label: 'Đang làm', count: statusCounts.in_progress },
            { id: 'completed', label: 'Hoàn thành', count: statusCounts.completed },
          ].map((item) => (
            <button
              key={`${item.id}-${item.label}`}
              type="button"
              onClick={() => setStatusFilter(item.id as typeof statusFilter)}
              className={`pb-1 px-2 font-title-md transition-colors border-b-2 flex items-center gap-1.5 ${
                statusFilter === item.id ? 'text-secondary border-secondary' : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              {item.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                statusFilter === item.id ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
        {loading && <p className="mb-sm text-on-surface-variant">Đang tải nhiệm vụ...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {displayCards.map((q) =>
            q.locationLocked ? (
              <div
                key={q.id}
                className="block bg-surface-container border border-outline-variant rounded-xl overflow-hidden opacity-60 cursor-not-allowed"
                title="Hoàn thành quest trước để mở khoá di tích này"
              >
                <div className="h-48 relative grayscale">
                  <img src={q.image} alt={q.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-3xl">🔒</div>
                </div>
                <div className="p-md">
                  <h2 className="font-headline-lg text-on-surface-variant">{q.title}</h2>
                  <p className="text-xs text-on-surface-variant mt-sm">Hoàn thành nhiệm vụ Củ Chi để mở khoá</p>
                </div>
              </div>
            ) : (
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
                <div className="flex items-center gap-2 mb-xs flex-wrap">
                  {q.city && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-0.5">
                      <MaterialIcon name="location_on" className="text-sm" /> {q.city}
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded-full border border-outline-variant text-on-surface-variant">
                    {q.difficulty} · ~{q.estimatedMinutes} phút
                  </span>
                  {q.requireOnsiteCheckin ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full border border-secondary/50 text-secondary inline-flex items-center gap-0.5">
                      <MaterialIcon name="location_on" className="text-sm" /> Cần đến tận nơi
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full border border-primary/40 text-primary inline-flex items-center gap-0.5">
                      <MaterialIcon name="museum" className="text-sm" /> Remote-friendly
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between gap-sm mb-sm">
                  <h2 className="font-headline-lg text-on-surface leading-tight">{q.title}</h2>
                  <span className="px-2 py-1 rounded bg-surface text-xs text-on-surface-variant whitespace-nowrap">
                    {q.currentStep ?? 0}/{q.stepsTotal ?? 3} chương
                  </span>
                </div>
                <p className="text-sm text-primary/90 mb-1 line-clamp-2">{q.missionHook}</p>
                <p className="text-sm text-on-surface-variant mb-md line-clamp-2">{q.description}</p>
                {q.status === 'in_progress' && (
                  <p className="text-xs text-secondary mb-sm inline-flex items-center gap-1">
                    <MaterialIcon name="pending" className="text-sm" /> Đang thực hiện
                  </p>
                )}
                {q.status === 'completed' && (
                  <p className="text-xs text-primary mb-sm inline-flex items-center gap-1">
                    <MaterialIcon name="check_circle" className="text-sm" /> Đã hoàn thành
                  </p>
                )}
                {q.status === 'not_started' && (q.readyToStart || q.completionTrigger === 'discovery') && (
                  <div className="mb-md rounded-lg border border-secondary/40 bg-secondary/10 p-sm">
                    <p className="text-sm text-on-surface mb-sm">
                      {q.completionTrigger === 'discovery'
                        ? 'Bắt đầu và mở từng hiện vật trong tủ sưu tập.'
                        : getProgress(q.id)?.hasCheckinAtLocation
                          ? 'Sẵn sàng check-in hiện trường Củ Chi'
                          : 'Tour 360° + Time Portal, sau đó check-in tại địa đạo'}
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
            ),
          )}
        </div>
        {!loading && questsForDisplay.length === 0 && (
          <div className="mt-md text-center py-xl border border-dashed border-outline-variant rounded-xl">
            <MaterialIcon name="assignment" className="text-4xl text-on-surface-variant mb-sm" />
            <p className="text-on-surface-variant">
              {statusFilter === 'in_progress'
                ? 'Bạn chưa có nhiệm vụ đang làm. Chọn tab "Chưa bắt đầu" hoặc "Tất cả" để bắt đầu.'
                : statusFilter === 'completed'
                  ? 'Chưa hoàn thành nhiệm vụ nào. Hoàn tất từng chương để nhận XP và danh hiệu.'
                  : statusFilter === 'not_started'
                    ? 'Tất cả nhiệm vụ đã được bắt đầu hoặc hoàn thành.'
                    : 'Chưa có nhiệm vụ cho bộ lọc này.'}
            </p>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="inline-flex items-center gap-1 mt-md text-secondary underline"
              >
                Xem tất cả nhiệm vụ
              </button>
            )}
            {statusFilter === 'in_progress' && (
              <Link to="/quests" className="inline-flex items-center gap-1 mt-md ml-md text-secondary underline">
                Mở nhiệm vụ đang làm <MaterialIcon name="assignment" className="text-sm" />
              </Link>
            )}
          </div>
        )}
        <section className="mt-xl border border-outline-variant rounded-xl p-md bg-surface-container-low opacity-80">
          <h3 className="font-title-md mb-md flex items-center gap-2 text-on-surface-variant">
            <MaterialIcon name="lock" /> Nhiệm vụ sắp tới
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant">
                <MaterialIcon name="groups" className="text-outline text-3xl" />
              </div>
              <div>
                <p className="font-title-md">Nhiệm vụ nhóm & AR onsite</p>
                <p className="text-sm text-on-surface-variant">Sắp ra mắt — khám phá theo nhóm tại di tích</p>
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

