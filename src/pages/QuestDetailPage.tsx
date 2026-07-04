import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { collectionApi } from '../features/collection/api'
import { gamificationApi, type Quest, type QuestProgress } from '../features/gamification/api'
import { locationsApi } from '../features/locations/api'
import { analyticsApi } from '../features/analytics/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import {
  actionIcon,
  getQuestSteps,
  HERITAGE_QUEST_META,
  isStepDone,
  resolveStepImage,
  stepActionLabel,
  stepHref,
} from '../features/gamification/heritageQuestSteps'
import { QuestJourneyPanel } from '../features/gamification/QuestJourneyPanel'
import { isReadyToStart } from '../features/gamification/questProgress'
import { useAuth } from '../shared/auth/useAuth'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useAppMode } from '../shared/context/useAppMode'
import { useToast } from '../shared/ui/toast/useToast'
import { useVisitSession } from '../features/visit/VisitSessionProvider'
import { images } from '../assets/images'

export function QuestDetailPage() {
  const { questId } = useParams<{ questId: string }>()
  const { isAuthenticated } = useAuth()
  const { mode } = useAppMode()
  const [quest, setQuest] = useState<Quest | null>(null)
  const [progress, setProgress] = useState<QuestProgress | null>(null)
  const [stepImages, setStepImages] = useState<Record<string, string>>({})
  const [locationName, setLocationName] = useState('')
  const [loading, setLoading] = useState(false)
  const { getSessionId } = useVisitSession()
  const { showToast } = useToast()

  useEffect(() => {
    if (!questId) return
    gamificationApi.questById(questId).then(setQuest).catch(() => setQuest(null))
  }, [questId])

  useEffect(() => {
    if (!questId || !isAuthenticated) {
      setProgress(null)
      return
    }
    gamificationApi.progress(questId).then(setProgress).catch((e) => {
      setProgress(null)
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    })
  }, [isAuthenticated, questId, showToast])

  const refetchProgress = useCallback(async () => {
    if (!questId || !isAuthenticated) return
    try {
      const next = await gamificationApi.progress(questId)
      setProgress(next)
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    }
  }, [isAuthenticated, questId, showToast])

  const meta = questId ? HERITAGE_QUEST_META[questId] : undefined
  const completionTrigger = progress?.completionTrigger ?? quest?.completionTrigger
  const steps = useMemo(
    () => (questId ? getQuestSteps(questId, completionTrigger) : []),
    [questId, completionTrigger],
  )

  const title = progress?.title ?? quest?.title ?? 'Nhiệm vụ'
  const description = progress?.description ?? quest?.description ?? ''
  const story = progress?.story ?? quest?.story ?? meta?.context ?? ''
  const pointsReward = progress?.pointsReward ?? quest?.pointsReward ?? 100
  const status = progress?.status ?? 'not_started'
  const currentStep = progress?.currentStep ?? 0
  const stepsTotal = progress?.stepsTotal ?? quest?.stepsTotal ?? steps.length
  const heroImage = quest?.coverImage || images.questDetailHero
  const locationId = progress?.locationId ?? quest?.locationId ?? meta?.locationId ?? ''
  const requireOnsiteCheckin =
    progress?.requireOnsiteCheckin ?? quest?.requireOnsiteCheckin ?? quest?.completionTrigger === 'checkin'
  const visitSessionId = locationId ? getSessionId(locationId) : undefined
  const onsiteSiteLabel = locationName || title

  useEffect(() => {
    if (!locationId) {
      setLocationName('')
      return
    }
    locationsApi
      .getById(locationId)
      .then((loc) => setLocationName(loc.name))
      .catch(() => setLocationName(''))
  }, [locationId])

  useEffect(() => {
    if (!locationId) return
    collectionApi
      .catalog(locationId)
      .then((list) => {
        const map: Record<string, string> = {}
        list.forEach((artifact) => {
          map[artifact.unlockKey] = artifact.imageUrl
        })
        setStepImages(map)
      })
      .catch(() => setStepImages({}))
  }, [locationId])

  useEffect(() => {
    if (!questId || !isAuthenticated || status !== 'in_progress') return
    const onDiscoveryRecorded = (event: Event) => {
      const detail = (event as CustomEvent<{ recordKey: string; recorded: boolean }>).detail
      if (!detail?.recorded) return
      const stepIndex = steps.findIndex((step) => step.unlockKey === detail.recordKey)
      if (stepIndex < 0 || stepIndex !== currentStep) return
      const step = steps[stepIndex]
      showToast({
        message: `Chương ${stepIndex + 1} hoàn tất — +${step.xpPartial ?? 0} XP`,
        type: 'success',
      })
      void analyticsApi.recordEvent({
        locationId,
        visitSessionId,
        eventType: 'QUEST_STEP_COMPLETED',
        eventKey: detail.recordKey,
        source: 'quest_detail',
      })
      void refetchProgress()
    }
    window.addEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
    return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
  }, [questId, isAuthenticated, status, steps, currentStep, locationId, visitSessionId, showToast, refetchProgress])

  const firstOpenIndex = steps.findIndex(
    (step, index) =>
      !isStepDone(step, currentStep, index, status, progress?.hasCheckinAtLocation),
  )
  const activeStep = firstOpenIndex >= 0 ? steps[firstOpenIndex] : null
  const activeStepImage = activeStep ? resolveStepImage(activeStep, stepImages) : undefined
  const progressPct =
    stepsTotal > 0 ? Math.min(100, Math.round((currentStep / stepsTotal) * 100)) : 0

  const startQuest = async () => {
    if (!questId) return
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const started = await gamificationApi.startQuest(questId)
      setProgress(started)
      showToast({ message: 'Nhiệm vụ đã bắt đầu — hoàn thành chương 1 để mở khóa tiếp.', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout
      activeBorder="left"
      topNav={<SimpleTopNav title="Chi tiết nhiệm vụ" />}
      mobileBackTo="/quests"
      mobileTitle="Nhiệm vụ"
    >
      <main className="mt-14 md:mt-16 max-w-7xl mx-auto w-full pb-20 md:pb-0">
        <div className="h-60 relative overflow-hidden rounded-b-xl border-b border-outline-variant">
          <img src={heroImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute top-sm left-lg">
            <Link to="/quests" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-secondary">
              <MaterialIcon name="arrow_back" className="text-sm" /> Trở về
            </Link>
          </div>
          {meta && (
            <div className="absolute bottom-md left-lg right-lg flex flex-wrap gap-2">
              <span className="px-xs py-[2px] rounded-full border border-primary/40 bg-primary/10 text-primary text-xs">
                {meta.difficulty} · ~{meta.estimatedMinutes} phút
              </span>
              <span className="px-xs py-[2px] rounded-full border border-outline-variant bg-surface-container/80 text-on-surface-variant text-xs">
                {steps.length} chương
              </span>
            </div>
          )}
        </div>

        <div className="p-lg grid lg:grid-cols-12 gap-lg">
          <section className="lg:col-span-8 space-y-md">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="px-xs py-[2px] rounded-full border border-primary/40 bg-primary/10 text-primary text-xs">
                Nhiệm vụ chính tuyến
              </span>
              {meta && (
                <span className="text-xs text-on-surface-variant flex items-center gap-1">
                  <MaterialIcon name="location_on" className="text-sm text-secondary" />
                  {meta.city}
                </span>
              )}
              {status === 'completed' && (
                <span className="text-xs text-secondary flex items-center gap-1">
                  <MaterialIcon name="check_circle" className="text-sm" /> Hoàn thành
                </span>
              )}
              {status === 'in_progress' && (
                <span className="text-xs text-primary">{progressPct}% · {currentStep}/{stepsTotal}</span>
              )}
              {requireOnsiteCheckin ? (
                <span className="text-xs px-1.5 py-0.5 rounded-full border border-secondary/50 text-secondary inline-flex items-center gap-0.5">
                  <MaterialIcon name="location_on" className="text-sm" /> Cần đến tận nơi
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded-full border border-primary/40 text-primary inline-flex items-center gap-0.5">
                  <MaterialIcon name="museum" className="text-sm" /> Remote-friendly
                </span>
              )}
            </div>

            <h1 className="font-display-lg text-primary">{title}</h1>
            <p className="text-on-surface-variant">{description}</p>

            {story && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-md">
                <h3 className="font-title-md flex items-center gap-2 mb-sm text-primary">
                  <MaterialIcon name="campaign" /> Mission Briefing
                </h3>
                <p className="text-sm text-on-surface leading-relaxed">{story}</p>
                {meta?.missionHook && (
                  <p className="text-xs text-on-surface-variant mt-sm italic">"{meta.missionHook}"</p>
                )}
              </div>
            )}

            {status === 'in_progress' && activeStep && locationId && questId && (
              <div className="rounded-xl border-2 border-secondary/50 bg-secondary/10 p-md">
                <p className="text-xs uppercase tracking-wide text-secondary mb-1">Mục tiêu hiện tại</p>
                <div className="flex gap-sm items-start">
                  {activeStepImage && (
                    <img
                      src={activeStepImage}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover border border-secondary/40 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-title-md flex items-center gap-2">
                      <MaterialIcon name={actionIcon(activeStep.actionType)} className="text-secondary" />
                      {activeStep.title}
                    </p>
                    <p className="text-sm text-on-surface mt-1">{activeStep.objective}</p>
                  </div>
                </div>
                <Link
                  to={stepHref(locationId, activeStep, questId)}
                  className="inline-flex items-center gap-1 mt-md bg-primary text-on-primary px-md py-sm rounded-lg text-sm"
                >
                  {stepActionLabel(activeStep, mode)}
                  <MaterialIcon name="arrow_forward" className="text-sm" />
                </Link>
              </div>
            )}

            {questId && (
              <QuestJourneyPanel
                steps={steps}
                questId={questId}
                locationId={locationId}
                status={status}
                currentStep={currentStep}
                hasCheckin={progress?.hasCheckinAtLocation}
                stepImages={stepImages}
              />
            )}
          </section>

          <aside className="lg:col-span-4 space-y-md">
            <div className="border border-outline-variant rounded-xl p-md bg-surface-container">
              <h3 className="font-title-md flex items-center gap-2 mb-sm">
                <MaterialIcon name="trophy" className="text-primary" /> Phần thưởng
              </h3>
              <div className="grid grid-cols-2 gap-sm">
                <div className="border border-outline-variant rounded-lg p-sm text-center">
                  <p className="text-xs text-on-surface-variant">Kinh nghiệm</p>
                  <p className="font-headline-lg text-primary">+{pointsReward}</p>
                </div>
                <div className="border border-outline-variant rounded-lg p-sm text-center">
                  <p className="text-xs text-on-surface-variant">Danh hiệu</p>
                  <p className="font-title-md text-sm">{meta?.badge ?? 'Người khám phá'}</p>
                </div>
              </div>
              {status === 'in_progress' && (
                <div className="mt-md">
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 text-center">{currentStep}/{stepsTotal} chương</p>
                </div>
              )}
            </div>

            <div className="border border-outline-variant rounded-xl p-md bg-surface-container">
              <h3 className="font-title-md flex items-center gap-2 mb-sm">
                <MaterialIcon name="history_edu" /> Bối cảnh
              </h3>
              <p className="text-sm text-on-surface-variant">{meta?.context ?? description}</p>
              {meta && (
                <Link
                  to={`/explore/${meta.locationId}`}
                  className="inline-flex items-center gap-1 mt-sm text-secondary text-sm underline"
                >
                  Xem hồ sơ di tích <MaterialIcon name="open_in_new" className="text-sm" />
                </Link>
              )}
            </div>

            <div className="border border-outline-variant/60 rounded-xl p-md bg-surface-container-low text-xs text-on-surface-variant">
              <p className="flex items-center gap-1 font-medium text-on-surface mb-1">
                <MaterialIcon name="info" className="text-sm" /> Quy tắc
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Heritage: hiện vật → Time Portal → hiện vật kết (+ check-in onsite thưởng)</li>
                <li>Củ Chi: tour 360° → portal 1948 → check-in GPS</li>
                <li>Mỗi chương ghi tiến độ khi xem đủ trải nghiệm</li>
              </ul>
            </div>
          </aside>
        </div>

        {isAuthenticated && progress && isReadyToStart(progress) && (
          <div className="mx-lg mb-md rounded-xl border border-secondary/40 bg-secondary/10 p-md">
            {requireOnsiteCheckin && (
              <p className="text-secondary text-sm mb-sm flex items-center gap-1">
                <MaterialIcon name="location_on" className="text-sm" />
                Nhiệm vụ này cần bạn có mặt tại <strong>{onsiteSiteLabel}</strong> để hoàn thành.
              </p>
            )}
            <p className="text-on-surface mb-sm">
              {progress.completionTrigger === 'discovery'
                ? 'Ba chương thị giác: hiện vật → Time Portal → hiện vật kết.'
                : progress.hasCheckinAtLocation
                  ? 'Hành trình online xong — sẵn sàng check-in hiện trường.'
                  : 'Bắt đầu tour 360° và Time Portal, sau đó check-in tại Củ Chi.'}
            </p>
            <button
              type="button"
              onClick={startQuest}
              disabled={loading}
              className="bg-primary text-on-primary px-md py-sm rounded-lg disabled:opacity-60"
            >
              {loading ? 'Đang xử lý...' : 'Nhận nhiệm vụ'}
            </button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mx-lg bg-surface-container border border-outline-variant rounded-lg p-md mb-md">
            <p className="text-on-surface-variant">
              Đăng nhập để nhận nhiệm vụ và lưu tiến trình từng chương.
            </p>
            <Link to="/login" className="inline-block mt-sm text-secondary underline">
              Đi tới đăng nhập
            </Link>
          </div>
        )}

        {isAuthenticated && status === 'completed' && completionTrigger === 'discovery' && !progress?.hasCheckinAtLocation && locationId && (
          <div className="mx-lg mb-md rounded-xl border border-secondary/50 bg-secondary/10 p-md">
            <p className="text-on-surface font-medium mb-1 flex items-center gap-1">
              <MaterialIcon name="my_location" className="text-secondary" /> Thưởng onsite còn chờ
            </p>
            <p className="text-sm text-on-surface-variant mb-sm">
              Ba chương online đã xong — ghé di tích và check-in GPS để nhận +25 XP và huy hiệu &quot;Đã đến nơi&quot;.
            </p>
            <Link
              to={`/scan?locationId=${locationId}`}
              className="inline-flex items-center gap-1 bg-secondary text-on-secondary px-md py-sm rounded-lg text-sm"
            >
              Kích hoạt GPS <MaterialIcon name="qr_code_scanner" className="text-sm" />
            </Link>
          </div>
        )}

        {isAuthenticated && status === 'not_started' && (
          <div className="px-lg pb-xl">
            <button
              onClick={startQuest}
              disabled={loading}
              className="bg-primary text-on-primary px-md py-sm rounded-lg disabled:opacity-60"
            >
              {loading ? 'Đang xử lý...' : 'Nhận nhiệm vụ'}
            </button>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
