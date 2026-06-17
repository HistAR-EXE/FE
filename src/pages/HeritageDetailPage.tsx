import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { DetailHeader } from '../components/layout/DetailHeader'
import { locationsApi, type Character, type Location } from '../features/locations/api'
import { questRecordFromSearch, recordQuestStepEngagement } from '../features/gamification/questEngagement'
import { useAuth } from '../shared/auth/useAuth'
import { ApiError } from '../shared/api/contracts'
import { useAppMode } from '../shared/context/useAppMode'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { ProgressSummaryCard } from '../features/gamification/ProgressSummaryCard'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'

const PREVIEW_CHAR_LIMIT = 480

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function buildPreview(description: string): { preview: string; canExpand: boolean } {
  const paragraphs = splitParagraphs(description)
  if (paragraphs.length > 1) {
    return { preview: paragraphs[0], canExpand: true }
  }

  const single = paragraphs[0] ?? description.trim()
  if (single.length <= PREVIEW_CHAR_LIMIT) {
    return { preview: single, canExpand: false }
  }

  const cut = single.slice(0, PREVIEW_CHAR_LIMIT)
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
  const preview = sentenceEnd > 200 ? cut.slice(0, sentenceEnd + 1).trim() : `${cut.trim()}…`
  return { preview, canExpand: true }
}

export function HeritageDetailPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const [searchParams] = useSearchParams()
  const questRecordKey = questRecordFromSearch(searchParams)
  const { isAuthenticated } = useAuth()
  const recordedRef = useRef(false)
  const [location, setLocation] = useState<Location | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [failed, setFailed] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const { showToast } = useToast()
  const { mode } = useAppMode()
  const onlineHighlight = (active: boolean) =>
    active && mode === 'online' ? 'ring-2 ring-secondary/60 border-secondary' : ''

  const descriptionMeta = useMemo(
    () => (location ? buildPreview(location.description) : null),
    [location],
  )

  useEffect(() => {
    if (!locationId) return
    const run = async () => {
      try {
        const [loc, chars] = await Promise.all([
          locationsApi.getById(locationId),
          locationsApi.getCharacters(locationId),
        ])
        setLocation(loc)
        setCharacters(chars)
        setDescriptionExpanded(false)
      } catch (e) {
        setFailed(true)
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được dữ liệu địa điểm.',
          type: 'error',
        })
      }
    }
    run()
  }, [locationId, showToast])

  useEffect(() => {
    if (!locationId || !questRecordKey || !isAuthenticated || recordedRef.current) return
    const timer = window.setTimeout(() => {
      recordedRef.current = true
      void recordQuestStepEngagement(questRecordKey, locationId, 'map')
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [locationId, questRecordKey, isAuthenticated])

  const onExpandDescription = () => {
    setDescriptionExpanded(true)
    if (locationId && questRecordKey && isAuthenticated && !recordedRef.current) {
      recordedRef.current = true
      void recordQuestStepEngagement(questRecordKey, locationId, 'map')
    }
  }

  if (!locationId) return <Navigate to="/explore" replace />

  return (
    <AppLayout
      activeBorder="right"
      topNav={<DetailHeader />}
      mobileBackTo="/explore"
      mobileTitle={location?.name ?? 'Chi tiết di tích'}
    >
      <main className="pt-16 md:pt-20 pb-24 px-safe-area-inset md:px-lg max-w-7xl mx-auto">
        {!location && !failed && <p>Đang tải chi tiết địa điểm...</p>}
        {!location && failed && <p>Không thể hiển thị chi tiết địa điểm.</p>}
        {location && (
          <>
            <div className="mb-md">
              <ProgressSummaryCard locationId={location.id} />
            </div>

            {questRecordKey && (
              <div className="mb-md rounded-xl border border-secondary/40 bg-secondary/10 p-md">
                <p className="text-xs uppercase tracking-wide text-secondary mb-1">Nhiệm vụ · Chương Định vị</p>
                <p className="text-sm text-on-surface">
                  Đọc hồ sơ di tích (≥ 5 giây hoặc bấm &quot;Xem thêm&quot;) để hoàn thành chương này.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg mb-xl">
              <div className="lg:col-span-8 flex flex-col gap-md">
                <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-outline-variant shadow-lg group">
                  <img src={location.coverImage} alt={location.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-lg w-full">
                    <div className="flex gap-2 mb-sm">
                      <span className="px-3 py-1 rounded-full bg-surface-container/80 backdrop-blur-md border border-primary/30 text-primary font-label-sm text-label-sm uppercase tracking-wider">
                        {location.city}
                      </span>
                    </div>
                    <h1 className="font-display-lg text-display-lg text-primary mb-2 inline-block">{location.name}</h1>
                  </div>
                </div>

                <article className="bg-surface-container border border-outline-variant rounded-xl p-lg">
                  <h2 className="font-title-md text-on-surface mb-md flex items-center gap-2">
                    <MaterialIcon name="menu_book" className="text-primary" />
                    Thông tin di tích
                  </h2>
                  <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line space-y-3">
                    {descriptionExpanded ? (
                      <>
                        {location.description.split('\n').map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                        {descriptionMeta?.canExpand && (
                          <button
                            type="button"
                            onClick={() => setDescriptionExpanded(false)}
                            className="text-primary hover:text-primary-fixed-dim font-label-sm text-label-sm transition-colors"
                          >
                            Thu hồi
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <p>{descriptionMeta?.preview}</p>
                        {descriptionMeta?.canExpand && (
                          <button
                            type="button"
                            onClick={onExpandDescription}
                            className="text-primary hover:text-primary-fixed-dim font-label-sm text-label-sm transition-colors"
                          >
                            Xem thêm
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                  <div className="bg-surface-container p-md rounded-lg border border-outline-variant flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary"><MaterialIcon name="history" /></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Niên đại</p><p className="font-title-md text-title-md text-on-surface">Di sản</p></div>
                  </div>
                  <div className="bg-surface-container p-md rounded-lg border border-outline-variant flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary"><MaterialIcon name="map" /></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Vị trí</p><p className="font-title-md text-title-md text-on-surface">{location.city}</p></div>
                  </div>
                  <div className="bg-surface-container p-md rounded-lg border border-outline-variant flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary"><MaterialIcon name="groups" /></div>
                    <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Nhân vật</p><p className="font-title-md text-title-md text-on-surface">{characters.length}</p></div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-md">
                <Link to={`/time-portal/${location.id}`} className={`group relative w-full h-[120px] rounded-xl overflow-hidden bg-surface-container border border-primary/50 hover:border-primary transition-colors flex items-center p-md gap-md ${onlineHighlight(true)}`}>
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary z-10"><MaterialIcon name="motion_photos_on" className="text-4xl" /></div>
                  <div className="z-10 text-left"><h3 className="font-title-md text-title-md text-primary mb-1">Cổng Thời Gian</h3><p className="font-body-md text-body-md text-on-surface-variant">Ảnh xưa và nay</p></div>
                </Link>
                {location.id === CU_CHI_LOCATION_ID && (
                  <Link
                    to={`/time-portal/${location.id}?view=ar`}
                    className={`group relative w-full h-[100px] rounded-xl overflow-hidden bg-surface-container border border-secondary/40 hover:border-secondary transition-colors flex items-center p-md gap-md ${onlineHighlight(true)}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                      <MaterialIcon name="view_in_ar" className="text-2xl" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-title-md text-title-md text-on-surface mb-1 flex items-center gap-2">
                        AR Cổng thời gian
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">Mới</span>
                      </h3>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Mô hình 3D — demo laptop</p>
                    </div>
                  </Link>
                )}
                <Link to={`/tour/360/${location.id}`} className={`group relative w-full h-[100px] rounded-xl overflow-hidden bg-surface-container border border-secondary/30 hover:border-secondary transition-colors flex items-center p-md gap-md ${onlineHighlight(true)}`}>
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary"><MaterialIcon name="view_in_ar" className="text-2xl" /></div>
                  <div className="text-left flex-1"><h3 className="font-title-md text-title-md text-on-surface mb-1">Tour 360°</h3><p className="font-label-sm text-label-sm text-on-surface-variant">Khám phá không gian</p></div>
                </Link>
                <Link to={`/artifacts?locationId=${location.id}`} className={`group relative w-full h-[100px] rounded-xl overflow-hidden bg-surface-container border border-primary/30 hover:border-primary transition-colors flex items-center p-md gap-md ${onlineHighlight(false)}`}>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><MaterialIcon name="history_edu" className="text-2xl" /></div>
                  <div className="text-left flex-1"><h3 className="font-title-md text-title-md text-on-surface mb-1">Cổ vật</h3><p className="font-label-sm text-label-sm text-on-surface-variant">Bộ sưu tập hiện vật di tích</p></div>
                </Link>
                <Link to={`/quests?locationId=${location.id}`} className={`group relative w-full h-[100px] rounded-xl overflow-hidden bg-surface-container border border-outline-variant hover:border-primary/50 transition-colors flex items-center p-md gap-md ${onlineHighlight(false)}`}>
                  <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface"><MaterialIcon name="assignment" className="text-2xl" /></div>
                  <div className="text-left flex-1"><h3 className="font-title-md text-title-md text-on-surface mb-1">Nhiệm vụ</h3><p className="font-label-sm text-label-sm text-on-surface-variant">Xem nhiệm vụ tại địa điểm</p></div>
                </Link>
                <Link to={`/chat/nguyen-du?locationId=${location.id}&characterId=${characters[0]?.id ?? ''}`} className={`group relative w-full h-[100px] rounded-xl overflow-hidden bg-surface-container border border-outline-variant hover:border-secondary/50 transition-colors flex items-center p-md gap-md ${onlineHighlight(true)}`}>
                  <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface"><MaterialIcon name="chat_bubble" className="text-2xl" /></div>
                  <div className="text-left flex-1"><h3 className="font-title-md text-title-md text-on-surface mb-1">Trò chuyện AI</h3><p className="font-label-sm text-label-sm text-on-surface-variant">Hỏi đáp với nhân vật lịch sử</p></div>
                </Link>
              </div>
            </div>
            <div className="mt-md bg-surface-container border border-outline-variant rounded-lg p-md">
              <h3 className="font-semibold mb-xs">Nhân vật khả dụng</h3>
              {characters.length === 0 && <p className="text-sm text-on-surface-variant">Chưa có nhân vật cho địa điểm này.</p>}
              <ul className="space-y-xs">
                {characters.map((character) => (
                  <li key={character.id} className="text-sm text-on-surface-variant">
                    {character.name} ({character.era})
                  </li>
                ))}
              </ul>
            </div>
            <Link to={`/secret/${location.id}`} className="inline-block mt-md text-secondary underline">
              Xem Secret Story
            </Link>
          </>
        )}
      </main>
    </AppLayout>
  )
}
