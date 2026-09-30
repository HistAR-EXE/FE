import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useToast } from '../../shared/ui/toast/useToast'
import { emitEvent } from '../../lib/pilotEvents'
import { getData, httpClient } from '../../shared/api/httpClient'
import { useAuth } from '../../shared/auth/useAuth'

const MIN_MS = 6000
const MAX_MS = 8000

type TranscodeJob = {
  id: string
  status: string
  inputFormat: string
  outputFormat: string
  inputUrl: string | null
  outputUrl: string | null
  errorMessage: string | null
  clientShareWebm: boolean
}

type Props = {
  /** Optional label shown on the trigger button. */
  className?: string
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

async function submitTranscode(blob: Blob): Promise<TranscodeJob | null> {
  const form = new FormData()
  form.append('file', blob, `portal-clip-${Date.now()}.webm`)
  try {
    return await getData<TranscodeJob>(
      httpClient.post('/api/media/transcode', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  } catch {
    return null
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * C2b: records a 6–8s WebM clip of the current portal view via MediaRecorder,
 * then POSTs to the BE transcode stub (FAILED_NO_FFMPEG → share WebM locally).
 */
export function TimePortalClipRecorder({ className }: Props) {
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [busy, setBusy] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lastBlob, setLastBlob] = useState<Blob | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => cleanupStream(), [cleanupStream])

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
    }
    setRecording(false)
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showToast({ message: 'Trình duyệt không hỗ trợ MediaRecorder.', type: 'error' })
      return
    }
    const mime = pickMimeType()
    if (!mime) {
      showToast({ message: 'Trình duyệt không hỗ trợ ghi WebM.', type: 'error' })
      return
    }
    try {
      cleanupStream()
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setLastBlob(null)
      setJobStatus(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        void videoRef.current.play().catch(() => {})
      }
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000 })
      recorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setLastBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        emitEvent('export_created', { payload: { kind: 'portal_clip_webm', durationMs: Date.now() - startedAtRef.current } })
      }
      recorder.start(250)
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current
        setElapsedMs(elapsed)
        if (elapsed >= MAX_MS) stopRecording()
      }, 100)
    } catch {
      showToast({ message: 'Không mở được camera. Cấp quyền rồi thử lại.', type: 'error' })
      cleanupStream()
    }
  }, [cleanupStream, showToast, stopRecording])

  const finishAndUpload = useCallback(async () => {
    if (!lastBlob) return
    if (elapsedMs > 0 && elapsedMs < MIN_MS && recording) {
      showToast({ message: 'Clip cần ít nhất 6 giây.', type: 'info' })
      return
    }
    setBusy(true)
    try {
      if (isAuthenticated) {
        const job = await submitTranscode(lastBlob)
        if (job) {
          setJobStatus(job.status)
          if (job.status === 'FAILED_NO_FFMPEG' || job.clientShareWebm) {
            downloadBlob(lastBlob, `histar-portal-clip-${Date.now()}.webm`)
            showToast({
              message: 'Server không có ffmpeg — đã tải WebM để chia sẻ trực tiếp.',
              type: 'info',
            })
          } else if (job.status === 'COMPLETED' && job.outputUrl) {
            showToast({ message: 'Đã chuyển MP4 thành công.', type: 'success' })
          } else {
            showToast({ message: `Job ${job.status}. Đã tải WebM dự phòng.`, type: 'info' })
            downloadBlob(lastBlob, `histar-portal-clip-${Date.now()}.webm`)
          }
          return
        }
      }
      downloadBlob(lastBlob, `histar-portal-clip-${Date.now()}.webm`)
      showToast({
        message: isAuthenticated ? 'Không gửi được job — đã tải WebM.' : 'Đã tải clip WebM (6–8s).',
        type: 'success',
      })
    } finally {
      setBusy(false)
    }
  }, [lastBlob, elapsedMs, recording, isAuthenticated, showToast])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1 px-4 py-2 rounded-full border border-secondary bg-secondary/10 text-secondary text-sm font-label-sm hover:bg-secondary/20'
        }
        data-testid="portal-clip-recorder-open"
      >
        <MaterialIcon name="videocam" className="text-base" />
        Clip 6–8s
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0B1120] p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-black text-sm uppercase tracking-widest">C2b · Clip cổng thời gian</h2>
              <button
                type="button"
                onClick={() => {
                  stopRecording()
                  cleanupStream()
                  setOpen(false)
                }}
                className="text-gray-400 hover:text-white"
                aria-label="Đóng"
              >
                <MaterialIcon name="close" />
              </button>
            </div>

            <div className="relative aspect-[9/16] max-h-[55vh] mx-auto rounded-2xl overflow-hidden bg-black border border-white/10">
              <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              {previewUrl && !recording && (
                <video src={previewUrl} controls playsInline className="absolute inset-0 w-full h-full object-cover" />
              )}
              {recording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {(elapsedMs / 1000).toFixed(1)}s / 8s
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">
              Ghi 6–8 giây WebM. Server chuyển MP4 nếu có ffmpeg; không thì tải WebM chia sẻ.
            </p>
            {jobStatus && (
              <p className="mt-1 text-center text-[11px] font-mono text-[#fdb438]">Job: {jobStatus}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {!recording && !lastBlob && (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs uppercase tracking-widest"
                >
                  Bắt đầu ghi
                </button>
              )}
              {recording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  disabled={elapsedMs < MIN_MS}
                  className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest disabled:opacity-40"
                >
                  {elapsedMs < MIN_MS ? `Còn ${((MIN_MS - elapsedMs) / 1000).toFixed(1)}s` : 'Dừng & xem lại'}
                </button>
              )}
              {lastBlob && !recording && (
                <>
                  <button
                    type="button"
                    onClick={() => void finishAndUpload()}
                    disabled={busy}
                    className="px-5 py-2.5 rounded-xl bg-[#388cf1] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    {busy ? 'Đang gửi…' : 'Lưu / Transcode'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="px-5 py-2.5 rounded-xl border border-white/20 text-white font-black text-xs uppercase tracking-widest"
                  >
                    Ghi lại
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
