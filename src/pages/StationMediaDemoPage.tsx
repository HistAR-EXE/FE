// src/pages/StationMediaDemoPage.tsx
// Trang một trạm trong "Hành trình 6 trạm": ảnh thật, thuyết minh đọc to, chương truyện, mini-game trạm.
// Video/soundscape trên R2 chỉ hiện khi tệp thực sự có; chưa có thì ẩn, không báo lỗi.

import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { QuestBackLink } from '../features/gamification/QuestBackLink'
import { getPublishedRoleTemplates } from '../features/heritage-studio/roleTemplates'
import type { HeritageStationCode } from '../features/heritage-studio/types'
import { ReportContentButton } from '../components/feedback/ReportContentModal'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { QuestBackdrop } from '../features/gamification/QuestBackdrop'
import { SoundscapePlayer } from '../features/media/SoundscapePlayer'
import { VerticalVideoPlayer } from '../features/media/VerticalVideoPlayer'
import { getSeededMinigameId, minigameApi, type Minigame } from '../features/minigames/api'
import { stationsApi, type StationInfo } from '../features/stations/api'
import { shortChapterTitle, stationMedia, type StationPhoto } from '../features/stations/stationMedia'
import { stationDisplayName } from '../features/stations/StationNextSteps'
import {
    appendStationContext,
    buildStationCameraPath,
    buildStationHeritagePath,
    buildStationChatPath,
} from '../features/stations/stationRoutes'
import { storyApi, type StoryChapter } from '../features/story/api'
import { useNarration } from '../features/time-portal/timeline/useNarration'
import { emitEvent } from '../lib/pilotEvents'
import { setActiveStationCode } from '../lib/stationSafety'
import { isPilotSiteCode, locationIdFromSiteCode } from '../shared/config/constants'
import { resolveMediaUrl } from '../shared/config/env'

const STATIONS = ['ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06'] as const
const ONSITE_QUEST_BY_SITE: Record<string, string> = { 'cu-chi': '33333333-3333-3333-3333-333333333340' }

function stationMediaPath(site: string, stationCode: string, kind: 'video' | 'audio') {
    return `/media/${site}/${stationCode.toLowerCase()}/${kind}/${kind === 'video' ? 'intro.mp4' : 'ambient.mp3'}`
}

/** Tệp media có thật không (tránh hiện trình phát báo lỗi 404). Trang HTML trả về thay tệp cũng tính là không có. */
function useMediaAvailable(path: string) {
    const [available, setAvailable] = useState(false)
    useEffect(() => {
        let cancelled = false
        setAvailable(false)
        const url = resolveMediaUrl(path)
        if (!url) return
        fetch(url, { method: 'HEAD' })
            .then((response) => {
                const type = response.headers.get('content-type') ?? ''
                if (!cancelled) setAvailable(response.ok && !type.includes('text/html'))
            })
            .catch(() => undefined)
        return () => {
            cancelled = true
        }
    }, [path])
    return available
}

export function StationMediaDemoPage() {
    const { code = 'ST01', siteCode: siteParam } = useParams<{ code: string; siteCode?: string }>()
    const site = isPilotSiteCode(siteParam) ? siteParam.trim().toLowerCase() : 'cu-chi'
    const stationCode = STATIONS.includes(code.toUpperCase() as (typeof STATIONS)[number]) ? code.toUpperCase() : 'ST01'
    const locationId = locationIdFromSiteCode(site)
    const media = stationMedia(site, stationCode)
    const fallbackName = stationDisplayName(stationCode, site)
    const videoPath = stationMediaPath(site, stationCode, 'video')
    const audioPath = stationMediaPath(site, stationCode, 'audio')
    const hasVideo = useMediaAvailable(videoPath)
    const hasAudio = useMediaAvailable(audioPath)
    const [station, setStation] = useState<StationInfo | null>(null)
    const [chapter, setChapter] = useState<StoryChapter | null>(null)
    const [storyLoading, setStoryLoading] = useState(true)
    const [storyError, setStoryError] = useState(false)
    const [viewer, setViewer] = useState<number | null>(null)
    const [stationGame, setStationGame] = useState<Minigame | null>(null)
    const videoEmitted = useRef(false)
    const audioEmitted = useRef(false)
    const narration = useNarration()
    const gameId = getSeededMinigameId(site, stationCode)
    const onsiteQuest = ONSITE_QUEST_BY_SITE[site]
    const backHref = onsiteQuest ? `/quests/${onsiteQuest}` : `/pack-prep?site=${encodeURIComponent(site)}`
    const stationContext = { siteCode: site, stationCode, locationId }
    const chatHref = buildStationChatPath(stationContext)
    const cameraHref = buildStationCameraPath(stationContext)
    const heritageHref = buildStationHeritagePath(stationContext)
    const hasHeritageRoles = getPublishedRoleTemplates(site, stationCode as HeritageStationCode).length > 0
    const name = station?.name ?? fallbackName

    useEffect(() => {
        setActiveStationCode(stationCode)
        videoEmitted.current = false
        audioEmitted.current = false
        setViewer(null)
        setStation(null)
        setChapter(null)
        let cancelled = false
        stationsApi
            .get(site, stationCode)
            .then((info) => !cancelled && setStation(info))
            .catch(() => !cancelled && setStation(null))
        setStoryLoading(true)
        setStoryError(false)
        storyApi
            .chapters(site)
            .then((list) => {
                if (!cancelled) setChapter(list.find((item) => item.stationCode === stationCode) ?? null)
            })
            .catch(() => {
                if (!cancelled) {
                    setChapter(null)
                    setStoryError(true)
                }
            })
            .finally(() => !cancelled && setStoryLoading(false))
        setStationGame(null)
        minigameApi
            .listForStation(site, stationCode)
            .then((list) => !cancelled && setStationGame(list[0] ?? null))
            .catch(() => !cancelled && setStationGame(null))
        return () => {
            cancelled = true
            narration.stop()
        }
        // narration.stop ổn định (useCallback).
    }, [site, stationCode])

    const intro = (station?.blocks ?? [])
        .filter((block) => block.blockType === 'TEXT' && block.body)
        .map((block) => block.body?.trim() ?? '')
        .join('\n\n')
    const unlocked = chapter?.unlocked ?? false
    const narrationText = [`Trạm ${stationCode}. ${name}.`, intro, unlocked && chapter?.synopsis ? chapter.synopsis : '']
        .filter(Boolean)
        .join(' ')
    const gallery: StationPhoto[] = media?.gallery ?? []
    const hero = media?.hero ?? null

    return (
        <AppLayout
            activeBorder="left"
            hideTopNav
            className="min-h-screen !bg-[#DCEBFF] text-[#0F1B33]"
        >
            <QuestBackdrop />
            <div className="relative z-10" data-testid="station-page" data-station={stationCode}>
                <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
                    <QuestBackLink to={backHref} label="Hành trình 6 trạm" ariaLabel="Điều hướng trạm" />
                </div>
                {/* Ảnh lớn của trạm */}
                <section className="relative w-full overflow-hidden rounded-b-[2.5rem] shadow-[0_24px_60px_-18px_rgba(2,117,251,0.55)]">
                    <div className="absolute inset-0 bg-[#0F1B33]">
                        {hero && <img src={hero} alt="" className="h-full w-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0F1B33]/90 via-[#0F1B33]/55 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33]/80 via-transparent to-transparent" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-[#FDC908] via-[#FFF2C3] to-[#FDC908]" />
                    <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-10 md:px-8 md:pb-20 md:pt-16">
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDC908] px-3 py-1 text-[11px] font-black text-[#0F1B33]">
                                <MaterialIcon name="location_on" className="text-sm" /> Trạm {stationCode}
                                {chapter ? ` · Chương ${chapter.chapterNumber}` : ''}
                            </span>
                            {chapter && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white">
                                    <MaterialIcon name={unlocked ? 'lock_open' : 'lock'} className="text-sm" />
                                    {unlocked ? 'Chương đã mở' : chapter.lockReason === 'SEQUENCE' ? 'Mở khi check-in tại trạm' : 'Cần Premium'}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">{name}</h1>
                        {chapter && <p className="mt-2 max-w-2xl text-base font-semibold text-white/85 md:text-lg">{shortChapterTitle(chapter.title)}</p>}
                    </div>
                </section>

                <main className="relative z-20 mx-auto -mt-8 w-full max-w-5xl space-y-6 px-4 pb-16 md:px-8">
                    {/* Chuyển trạm */}
                    <nav aria-label="Các trạm" className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-[#0275FB]/10">
                        {STATIONS.map((st) => (
                            <Link
                                key={st}
                                to={`/sites/${site}/stations/${st}/media`}
                                aria-current={st === stationCode ? 'page' : undefined}
                                className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition-colors ${
                                    st === stationCode ? 'bg-[#0275FB] text-white' : 'text-[#0F1B33] hover:bg-[#F2F7FF]'
                                }`}
                            >
                                <span className={st === stationCode ? 'text-[#FDC908]' : 'text-[#0275FB]'}>{st}</span>
                                <span className="hidden whitespace-nowrap sm:inline">{stationDisplayName(st, site)}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Di động: câu chuyện → mini-game → ảnh. Máy tính: ảnh và câu chuyện bên trái, hành động bên phải. */}
                    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
                            {/* Câu chuyện trạm */}
                            <section id="story" className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0275FB]/10 sm:p-6 order-1 lg:col-start-1 lg:row-start-1" data-testid="station-story">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="flex items-center gap-2 text-lg font-black">
                                        <MaterialIcon name="auto_stories" className="text-[#0275FB]" /> Câu chuyện ở trạm này
                                    </h2>
                                    {narration.supported && narrationText && (
                                        <button
                                            type="button"
                                            onClick={() => (narration.speaking ? narration.stop() : narration.speak(narrationText))}
                                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#FDC908] px-4 text-xs font-black text-[#0F1B33]"
                                        >
                                            <MaterialIcon name={narration.speaking ? 'stop_circle' : 'record_voice_over'} className="text-base" />
                                            {narration.speaking ? 'Dừng đọc' : 'Nghe thuyết minh'}
                                        </button>
                                    )}
                                </div>
                                {intro ? (
                                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 md:text-base">{intro}</p>
                                ) : (
                                    <div className="mt-3 h-14 animate-pulse rounded-xl bg-slate-100" />
                                )}
                                {storyLoading ? (
                                    <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-100" />
                                ) : storyError ? (
                                    <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                                        Không tải được câu chuyện tại trạm. Vui lòng thử lại sau.
                                    </p>
                                ) : chapter ? (
                                    <div className={`mt-4 rounded-2xl p-4 ${unlocked ? 'bg-[#F2F7FF]' : 'bg-slate-50'}`}>
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[#0275FB]">
                                            Chương {chapter.chapterNumber} · {shortChapterTitle(chapter.title)}
                                        </p>
                                        {unlocked && chapter.synopsis ? (
                                            <p className="mt-1 text-sm leading-relaxed text-[#0F1B33]">{chapter.synopsis}</p>
                                        ) : (
                                            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                                                <MaterialIcon name="lock" className="mt-px text-base" />
                                                {chapter.lockReason === 'SEQUENCE'
                                                    ? 'Hãy hoàn thành chương hoặc trạm trước trong hành trình để mở nội dung này.'
                                                    : 'Chương này dành cho Premium hoặc Journey Pass.'}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                                        Trạm chưa có câu chuyện được phát hành.
                                    </p>
                                )}
                            </section>

                            {/* Ảnh thật */}
                            {gallery.length > 0 && (
                                <section aria-labelledby="station-photos" className="order-3 lg:col-start-1 lg:row-start-2">
                                    <h2 id="station-photos" className="mb-3 flex items-center gap-2 text-lg font-black">
                                        <MaterialIcon name="photo_library" className="text-[#0275FB]" /> Hình ảnh
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="station-gallery">
                                        {gallery.map((photo, index) => (
                                            <button
                                                key={photo.src}
                                                type="button"
                                                onClick={() => setViewer(index)}
                                                className={`group relative overflow-hidden rounded-2xl bg-[#0F1B33] text-left ring-1 ring-[#0275FB]/10 ${
                                                    index === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-[4/3]'
                                                }`}
                                            >
                                                <img
                                                    src={photo.src}
                                                    alt={photo.caption}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6 text-[11px] font-bold leading-snug text-white">
                                                    {photo.caption}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                        <aside className="order-2 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                            {(gameId || stationGame) && (
                                <Link
                                    id="minigame"
                                    to={appendStationContext(`/sites/${site}/stations/${stationCode}/game/${stationGame?.id ?? gameId}`, stationContext)}
                                    data-testid="station-game-link"
                                    data-locked={stationGame ? !stationGame.unlocked : undefined}
                                    className={`flex items-center gap-4 rounded-3xl p-5 shadow-[0_16px_36px_-16px_rgba(2,117,251,0.8)] ${
                                        stationGame && !stationGame.unlocked
                                            ? 'bg-white text-[#0F1B33] ring-2 ring-[#FDC908]'
                                            : 'bg-gradient-to-br from-[#0275FB] to-[#3B93FF] text-white'
                                    }`}
                                >
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDC908] text-[#0F1B33]">
                                        <MaterialIcon name={stationGame && !stationGame.unlocked ? 'lock' : 'sports_esports'} className="text-2xl" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-black">Mini-game trạm {stationCode}</span>
                                        <span className={`block text-xs font-semibold ${stationGame && !stationGame.unlocked ? 'text-[#8A6A00]' : 'text-white/80'}`}>
                                            {stationGame && !stationGame.unlocked
                                                ? 'Quét QR tại trạm để mở khoá'
                                                : 'Trả lời nhanh, ghép cặp, sắp xếp… lấy điểm trạm'}
                                        </span>
                                    </span>
                                    <MaterialIcon name="chevron_right" className="text-2xl" />
                                </Link>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Link to={chatHref} className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm font-black shadow-sm ring-1 ring-[#0275FB]/10">
                                    <MaterialIcon name="forum" className="text-2xl text-[#0275FB]" /> Hỏi Chrono về trạm
                                </Link>
                                <Link to={cameraHref} className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm font-black shadow-sm ring-1 ring-[#0275FB]/10">
                                    <MaterialIcon name="photo_camera" className="text-2xl text-[#0275FB]" /> Ảnh kỷ niệm tại trạm
                                </Link>
                                {hasHeritageRoles && (
                                    <Link to={heritageHref} className="col-span-2 flex items-center gap-3 rounded-2xl border border-[#FDC908]/70 bg-[#FFF8DC] p-4 text-sm font-black text-[#6A4B00] shadow-sm">
                                        <MaterialIcon name="auto_awesome" className="text-2xl text-[#B77900]" /> Hóa thân 1968 · {stationCode}
                                    </Link>
                                )}
                                <Link
                                    to={`/scan?locationId=${encodeURIComponent(locationId)}&site=${encodeURIComponent(site)}`}
                                    className="col-span-2 flex items-center gap-3 rounded-2xl bg-[#FFF2C3] p-4 text-sm font-black text-[#5C4500] ring-1 ring-[#FDC908]/60"
                                >
                                    <MaterialIcon name="qr_code_scanner" className="text-2xl" />
                                    <span>
                                        Đang ở di tích? Quét QR tại trạm
                                        <span className="block text-xs font-semibold opacity-80">Check-in để mở chương và tính vào nhiệm vụ Tại di tích</span>
                                    </span>
                                </Link>
                            </div>

                            {(hasVideo || hasAudio) && (
                                <section id="media" className="scroll-mt-24 space-y-4 rounded-3xl bg-[#0F1B33] p-4 text-white">
                                    {hasVideo && (
                                        <div
                                            onPlayCapture={() => {
                                                if (videoEmitted.current) return
                                                videoEmitted.current = true
                                                emitEvent('video_played', { stationCode, payload: { path: videoPath, siteCode: site } })
                                            }}
                                        >
                                            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#FDC908]">Video giới thiệu</p>
                                            <VerticalVideoPlayer data-testid="station-intro-video" src={videoPath} poster={hero} />
                                        </div>
                                    )}
                                    {hasAudio && (
                                        <div
                                            onPlayCapture={() => {
                                                if (audioEmitted.current) return
                                                audioEmitted.current = true
                                                emitEvent('audio_played', { stationCode, payload: { path: audioPath, siteCode: site } })
                                            }}
                                        >
                                            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#FDC908]">Âm thanh trạm</p>
                                            <SoundscapePlayer src={audioPath} />
                                        </div>
                                    )}
                                </section>
                            )}

                            <div className="px-1">
                                <ReportContentButton stationCode={stationCode} context={`station:${site}`} />
                            </div>
                        </aside>
                    </div>
                </main>
            </div>

            {viewer !== null && gallery[viewer] && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={gallery[viewer].caption}
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F1B33]/90 p-4"
                    onClick={() => setViewer(null)}
                >
                    <figure className="relative w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
                        <img src={gallery[viewer].src} alt={gallery[viewer].caption} className="max-h-[78vh] w-full rounded-2xl object-contain" />
                        <figcaption className="mt-3 text-center text-sm font-bold text-white">{gallery[viewer].caption}</figcaption>
                        <div className="mt-3 flex justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setViewer((current) => (current === null ? null : (current - 1 + gallery.length) % gallery.length))}
                                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
                                aria-label="Ảnh trước"
                            >
                                <MaterialIcon name="chevron_left" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewer(null)}
                                className="flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-[#0F1B33]"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewer((current) => (current === null ? null : (current + 1) % gallery.length))}
                                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
                                aria-label="Ảnh sau"
                            >
                                <MaterialIcon name="chevron_right" />
                            </button>
                        </div>
                    </figure>
                </div>
            )}
        </AppLayout>
    )
}
