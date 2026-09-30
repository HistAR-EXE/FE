import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { SoundscapePlayer } from '../features/media/SoundscapePlayer'
import { VerticalVideoPlayer } from '../features/media/VerticalVideoPlayer'
import { getSeededMinigameId } from '../features/minigames/api'
import { StationNextSteps, stationDisplayName } from '../features/stations/StationNextSteps'
import { resolveMediaUrl } from '../shared/config/env'
import { emitEvent } from '../lib/pilotEvents'
import { setActiveStationCode } from '../lib/stationSafety'
import { ReportContentButton } from '../components/feedback/ReportContentModal'
import { isPilotSiteCode } from '../shared/config/constants'

const STATIONS = ['ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06'] as const

const DEFAULT_VIDEO = 'intro.mp4'
const DEFAULT_AUDIO = 'ambient.mp3'

function stationMediaPath(site: string, stationCode: string, kind: 'video' | 'audio', file: string) {
  const folder = kind === 'video' ? 'video' : 'audio'
  return `/media/${site}/${stationCode.toLowerCase()}/${folder}/${file}`
}

export function StationMediaDemoPage() {
  const { code = 'ST01', siteCode: siteParam } = useParams<{ code: string; siteCode?: string }>()
  const site = isPilotSiteCode(siteParam) ? siteParam : 'cu-chi'
  const stationCode = STATIONS.includes(code as (typeof STATIONS)[number]) ? code : 'ST01'
  const videoPath = stationMediaPath(site, stationCode, 'video', DEFAULT_VIDEO)
  const audioPath = stationMediaPath(site, stationCode, 'audio', DEFAULT_AUDIO)
  const videoUrl = resolveMediaUrl(videoPath)
  const audioUrl = resolveMediaUrl(audioPath)
  const videoEmitted = useRef(false)
  const audioEmitted = useRef(false)
  const [mediaMissing, setMediaMissing] = useState(false)
  const gameId = getSeededMinigameId(site, stationCode)

  useEffect(() => {
    setActiveStationCode(stationCode)
    setMediaMissing(false)
    videoEmitted.current = false
    audioEmitted.current = false
  }, [stationCode, site])

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans selection:bg-[#fe951c] selection:text-black">
      <div className="max-w-lg mx-auto px-4 md:px-8 py-8 md:py-12">
        <Link
          to={`/pack-prep?site=${encodeURIComponent(site)}`}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
        >
          <MaterialIcon name="arrow_back" className="text-base" /> Hành trang offline
        </Link>

        <header className="mt-6 mb-8">
          <span className="px-3.5 py-1.5 rounded-full bg-[#fe951c]/10 border border-[#fe951c]/40 text-[#fdb438] text-[10px] font-black uppercase tracking-widest">
            B2 · B3 · {site}
          </span>
          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight uppercase">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fe951c] via-[#fff2a1] to-[#1a79e5]">
              {stationCode} · {stationDisplayName(stationCode, site)}
            </span>
          </h1>
          <p className="mt-3 text-sm text-gray-300 leading-relaxed">
            Video dọc 9:16 và soundscape theo trạm. Đường dẫn: <code className="text-[10px] text-gray-500">{videoPath}</code>
          </p>
          {mediaMissing && (
            <p
              data-testid="media-missing-banner"
              className="mt-3 text-xs font-bold text-amber-300 border border-amber-400/40 bg-amber-500/10 rounded-xl px-3 py-2"
            >
              Đang cập nhật nội dung media — tệp R2 chưa sẵn hoặc lỗi tải. Báo CPO / thử lại sau.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {STATIONS.map((st) => (
              <Link
                key={st}
                to={`/sites/${site}/stations/${st}/media`}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                  st === stationCode
                    ? 'border-[#fe951c] text-[#fdb438] bg-[#fe951c]/10'
                    : 'border-white/10 text-gray-400'
                }`}
              >
                {st}
              </Link>
            ))}
          </div>
        </header>

        <section className="space-y-8">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
              <MaterialIcon name="movie" className="text-[#388cf1]" /> Video giới thiệu
            </h2>
            <div
              onPlayCapture={() => {
                if (videoEmitted.current) return
                videoEmitted.current = true
                emitEvent('video_played', {
                  stationCode,
                  payload: { path: videoPath, siteCode: site, url: videoUrl },
                })
              }}
              onErrorCapture={() => setMediaMissing(true)}
            >
              <VerticalVideoPlayer
                data-testid="station-intro-video"
                src={videoPath}
                poster={`/media/${site}/map/hero.jpg`}
              />
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
              <MaterialIcon name="graphic_eq" className="text-[#fe951c]" /> Soundscape
            </h2>
            <div
              onPlayCapture={() => {
                if (audioEmitted.current) return
                audioEmitted.current = true
                emitEvent('audio_played', {
                  stationCode,
                  payload: { path: audioPath, siteCode: site, url: audioUrl },
                })
              }}
            >
              <SoundscapePlayer src={audioPath} />
            </div>
          </div>

          {gameId && (
            <Link
              to={`/sites/${site}/stations/${stationCode}/game/${gameId}`}
              className="flex items-center gap-3 p-4 rounded-2xl border border-[#fe951c]/30 bg-[#fe951c]/5"
            >
              <MaterialIcon name="sports_esports" className="text-[#fdb438] text-2xl" />
              <div>
                <p className="text-sm font-black text-white">Mini-game trạm {stationCode}</p>
                <p className="text-[10px] text-gray-400">Chơi ngay sau khi xem media</p>
              </div>
            </Link>
          )}

          <StationNextSteps stationCode={stationCode} siteCode={site} />
          <ReportContentButton stationCode={stationCode} context={`media:${site}`} />
        </section>
      </div>
    </div>
  )
}
