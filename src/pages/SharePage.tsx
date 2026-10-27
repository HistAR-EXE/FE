// src/pages/SharePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { viralApi } from '../features/viral/api'
import { analyticsApi } from '../features/analytics/api'
import { formatXpToast, XP_LABELS } from '../shared/ui/xpToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { emitEvent } from '../lib/pilotEvents'
import { downloadBlob, exportStoryImage } from '../lib/heritageImage'
import {
  buildDioramaReturnPath,
  buildStationCameraPath,
  buildStationHeritagePath,
  buildStationPagePath,
  appendHeritageEntrySource,
  readHeritageEntrySource,
  readStationRouteContext,
} from '../features/stations/stationRoutes'
import { stationsApi } from '../features/stations/api'
import { useAuth } from '../shared/auth/useAuth'
import { loadPhotoFrameReturnDraft } from '../lib/photoFrameReturnDraft'

const STORY_FILENAME = 'timelens-heritage-9x16.jpg'
const DEFAULT_SHARE_CAPTION = 'Khám phá di sản Việt cùng TimeLens!'

async function downloadSavedImage(creationId: string, outputUrl: string, kind: string | null, variant: string | null, signal: AbortSignal): Promise<Blob> {
  // Browsers can display a public MinIO image while refusing fetch() without CORS.
  // Saved creations are fetched through our authenticated, owner-scoped API.
  const blob = creationId
    ? await viralApi.downloadCreationImage(creationId, signal)
    : await fetch(outputUrl, { signal }).then((response) => {
      if (!response.ok) throw new Error('heritage_download_http')
      return response.blob()
    })
  if (!blob.size) throw new Error('heritage_download_empty')
  if (kind === 'heritage' && variant === 'story') return new Blob([blob], { type: 'image/jpeg' })
  if (!kind || !variant) {
    const bitmap = await createImageBitmap(blob)
    try {
      if (blob.type === 'image/jpeg' && bitmap.width === 1080 && bitmap.height === 1920) return blob
    } finally { bitmap.close() }
  }
  if (signal.aborted) throw new DOMException('Download cancelled', 'AbortError')
  return exportStoryImage(blob)
}

export function SharePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const creationId = params.get('creationId') ?? ''
  const canUndo = Boolean(creationId && location.state?.freshCreationId === creationId)
  const outputUrl = params.get('outputUrl') ? decodeURIComponent(params.get('outputUrl') as string) : ''
  const stationContext = useMemo(() => readStationRouteContext(params), [params])
  const entrySource = readHeritageEntrySource(params.get('source'))
  const studioPath = useMemo(() => {
    const base = stationContext
      ? params.get('kind') === 'heritage' || params.get('role')
        ? buildStationHeritagePath(stationContext)
        : buildStationCameraPath(stationContext)
      : '/photo-frame'
    const role = params.get('role')
    const withRole = role ? `${base}${base.includes('?') ? '&' : '?'}${new URLSearchParams({ role })}` : base
    return appendHeritageEntrySource(withRole, entrySource)
  }, [stationContext, params, entrySource])
  const [stationName, setStationName] = useState<string | null>(null)
  const [caption, setCaption] = useState(DEFAULT_SHARE_CAPTION)
  const { showToast } = useToast()

  useEffect(() => {
    viralApi.sharePrefill().then((data) => {
      const next = data.caption?.trim()
      setCaption(next && !next.startsWith('${') ? next : DEFAULT_SHARE_CAPTION)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!stationContext) return
    let cancelled = false
    stationsApi
      .get(stationContext.siteCode, stationContext.stationCode)
      .then((station) => !cancelled && setStationName(station.name))
      .catch(() => !cancelled && setStationName(null))
    return () => {
      cancelled = true
    }
  }, [stationContext])

  const [exporting, setExporting] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)

  const onUndo = async () => {
    if (!canUndo || !user?.id || undoing) return
    setUndoing(true)
    setUndoError(null)
    try {
      const draft = await loadPhotoFrameReturnDraft(user.id, creationId)
      if (!draft) {
        setUndoError('Không còn bản chỉnh sửa để hoàn tác. Bạn có thể xóa ảnh trong Hồ sơ.')
        return
      }
      await viralApi.deleteCreation(creationId)
      navigate(studioPath, { replace: true, state: { undoReturnCreationId: creationId } })
    } catch {
      setUndoError('Không thể hoàn tác ảnh vừa lưu. Ảnh vẫn còn trong Hồ sơ; vui lòng thử lại.')
    } finally {
      setUndoing(false)
    }
  }

  const buildStoryFile = async (signal: AbortSignal): Promise<File> => {
    if (!outputUrl) throw new Error('heritage_download_missing_url')
    const blob = await downloadSavedImage(creationId, outputUrl, params.get('kind'), params.get('variant'), signal)
    return new File([blob], STORY_FILENAME, { type: 'image/jpeg' })
  }

  const onDownload = async () => {
    if (!outputUrl) {
      showToast({ message: 'Chưa có ảnh để tải xuống.', type: 'error' })
      return
    }
    setExporting(true)
    setDownloadError(null)
    try {
      const file = await buildStoryFile(new AbortController().signal)
      downloadBlob(file, STORY_FILENAME)
      showToast({ message: 'Đang tải ảnh 9:16...', type: 'info' })
    } catch (error) {
      const message = 'Không tải được ảnh. Kiểm tra kết nối rồi thử lại.'
      console.error('[heritage-share]', 'download', error instanceof Error ? error.name : 'unknown')
      setDownloadError(message)
      showToast({ message, type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const onShare = async () => {
    setExporting(true)
    setDownloadError(null)
    try {
      const file = await buildStoryFile(new AbortController().signal)
      emitEvent('share_initiated', {
        payload: { ...(creationId ? { creationId } : {}), format: '9x16', channel: 'native' },
      })
      if (navigator.share) {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'TimeLens', text: caption })
        } else {
          downloadBlob(file, STORY_FILENAME)
          await navigator.share({ title: 'TimeLens', text: caption, url: outputUrl || window.location.href })
        }
      } else {
        downloadBlob(file, STORY_FILENAME)
      }
      if (creationId) {
        const tracked = await viralApi.recordShare(creationId)
        void analyticsApi.recordEvent({
          eventType: 'SHARE_CREATED',
          eventKey: creationId,
          source: 'share',
        })
        if (tracked.bonusPointsAwarded > 0) {
          showToast(formatXpToast(tracked.bonusPointsAwarded, XP_LABELS.share))
        } else {
          showToast({ message: 'Lượt chia sẻ này đã được ghi nhận trước đó.', type: 'success' })
        }
      } else {
        showToast({ message: 'Chia sẻ thành công.', type: 'success' })
      }
    } catch (error) {
      console.error('[heritage-share]', 'share', error instanceof Error ? error.name : 'unknown')
      showToast({ message: 'Không thể share trực tiếp, hãy tải ảnh rồi đăng thủ công.', type: 'info' })
    } finally {
      setExporting(false)
    }
  }

  const markSharedManually = async () => {
    if (!creationId) {
      showToast({ message: 'Không có creationId để ghi nhận share.', type: 'error' })
      return
    }
    try {
      emitEvent('share_initiated', { payload: { creationId, source: 'share_manual' } })
      const tracked = await viralApi.recordShare(creationId)
      void analyticsApi.recordEvent({
        eventType: 'SHARE_CREATED',
        eventKey: creationId,
        source: 'share_manual',
      })
      if (tracked.bonusPointsAwarded > 0) {
        showToast(formatXpToast(tracked.bonusPointsAwarded, XP_LABELS.share))
      } else {
        showToast({ message: 'Lượt chia sẻ này đã được ghi nhận trước đó.', type: 'success' })
      }
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' })
    }
  }

  const copyText = async (value: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const field = document.createElement('textarea')
        field.value = value
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        try {
          field.select()
          if (!document.execCommand('copy')) throw new Error('clipboard_copy_failed')
        } finally {
          field.remove()
        }
      }
      showToast({ message: `Đã sao chép ${label}.`, type: 'success' })
    } catch {
      showToast({ message: `Không thể sao chép ${label}. Vui lòng thử lại.`, type: 'error' })
    }
  }

  return (
    <AppLayout
      activeBorder="left"
      mobileBackTo={studioPath}
      mobileTitle="Chia sẻ"
    >
      <main className="heritage-shell mt-14 flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 p-3 pb-20 text-[#0F1B33] md:mt-0 md:p-5">
        <div className="flex h-auto w-full max-w-[1200px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#0275FB]/20 bg-white shadow-[0_18px_48px_rgba(2,117,251,0.10)] md:min-h-[700px] md:flex-row">
          <div className="relative flex h-[min(70dvh,680px)] min-h-[320px] w-full min-w-0 items-center justify-center overflow-hidden bg-[#F7FAFF] p-4 md:h-auto md:w-1/2 md:p-6">
            {outputUrl ? (
              <img alt="Ảnh kỷ niệm để chia sẻ" className="block max-h-full max-w-full rounded-xl border border-[#efcc7b]/55 object-contain shadow-[0_20px_50px_rgba(15,27,51,0.15)]" src={outputUrl} />
            ) : (
              <div role="status" className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#0275FB]/35 bg-[#F2F7FF] px-5 text-center">
                <MaterialIcon name="image_not_supported" className="text-5xl text-[#0275FB]" />
                <p className="font-bold">Chưa có ảnh để chia sẻ</p>
                <Link to={studioPath} className="rounded-xl bg-[#0275FB] px-4 py-2 text-sm font-bold text-white">Quay về chọn ảnh</Link>
              </div>
            )}
          </div>
          <div className="flex h-full w-full min-w-0 flex-col overflow-y-auto bg-white p-lg text-[#0F1B33] md:w-1/2 md:p-xl">
            <div className="mb-xl flex flex-wrap items-center gap-3">
              <h1 className="mr-auto font-headline-lg text-[#0F1B33]">Chia sẻ</h1>
              <div className="flex flex-wrap items-center gap-2">
                {canUndo ? (
                  <button type="button" onClick={() => setConfirmUndo(true)} disabled={undoing || exporting} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-amber-400 bg-amber-50 px-4 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60">
                    <MaterialIcon name="undo" className="text-lg" /> Hoàn tác
                  </button>
                ) : (
                  <Link to={studioPath} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-[#0275FB]/25 bg-white px-3 text-sm font-bold text-[#315071] hover:border-[#0275FB] hover:text-[#0275FB]">
                    <MaterialIcon name="arrow_back" className="text-lg" /> Quay về chỉnh ảnh
                  </Link>
                )}
              </div>
            </div>
            {confirmUndo && (
              <div role="alertdialog" aria-label="Xác nhận hoàn tác" className="mb-lg rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-[#0F1B33]">
                <p className="font-bold">Xóa ảnh vừa lưu và quay lại chỉnh sửa?</p>
                <p className="mt-1 text-[#425573]">Ảnh sẽ bị xóa khỏi TimeLens. Bản đã gửi hoặc tải ra ngoài không thể thu hồi.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setConfirmUndo(false)} disabled={undoing} className="rounded-lg border border-[#0275FB]/25 bg-white px-3 py-2 font-semibold">Giữ ảnh</button>
                  <button type="button" onClick={() => void onUndo()} disabled={undoing} className="rounded-lg bg-amber-600 px-3 py-2 font-bold text-white disabled:opacity-60">{undoing ? 'Đang hoàn tác...' : 'Xóa ảnh và quay lại'}</button>
                </div>
              </div>
            )}
            {undoError && <p role="alert" className="mb-lg rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{undoError}</p>}
            <div className="flex-1 flex flex-col gap-xl justify-center">
              <div className="space-y-sm">
                <label className="font-label-sm uppercase tracking-wider text-[#58708D]">Thông điệp</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full resize-none rounded-xl border border-[#0275FB]/25 bg-[#F7FAFF] p-md text-[#0F1B33] outline-none focus:border-[#0275FB] focus:ring-2 focus:ring-[#0275FB]/15" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: 'content_copy', label: 'Sao chép lời nhắn', onClick: () => void copyText(caption, 'lời nhắn') },
                  { icon: 'photo_camera', label: 'Lưu để đăng', onClick: () => void onDownload() },
                  { icon: 'share', label: 'Chia sẻ ảnh', onClick: () => void onShare() },
                  { icon: 'link', label: 'Sao chép liên kết', onClick: () => void copyText(outputUrl, 'liên kết ảnh') },
                ].map((action) => (
                  <button key={action.label} type="button" onClick={action.onClick}
                    disabled={(exporting && ['Lưu để đăng', 'Chia sẻ ảnh'].includes(action.label)) || (!outputUrl && action.label !== 'Sao chép lời nhắn')}
                    className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-[#0275FB]/20 bg-[#E8F1FF] px-2 text-center text-xs font-semibold text-[#315071] hover:border-[#0275FB] hover:bg-[#DCEBFF] disabled:opacity-50">
                    <MaterialIcon name={action.icon} className="text-2xl" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-xl flex flex-wrap gap-sm border-t border-[#0275FB]/15 pt-lg">
              {downloadError && <p role="alert" className="w-full rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{downloadError}</p>}
              {stationContext && (
                <Link
                  to={buildStationPagePath(stationContext)}
                  className="w-full rounded-xl border border-[#0275FB]/30 px-md py-sm text-center font-bold text-[#0275FB] hover:bg-[#E8F1FF]"
                >
                  Về {stationContext.stationCode}{stationName ? ` · ${stationName}` : ''}
                </Link>
              )}
              {entrySource === 'battle-diorama' && (
                <Link
                  to={buildDioramaReturnPath(stationContext?.locationId ?? '')}
                  className="w-full rounded-xl border border-amber-400 px-md py-sm text-center font-bold text-amber-800 hover:bg-amber-50"
                >
                  Về Sa bàn Cedar Falls
                </Link>
              )}
              <button onClick={onShare} disabled={exporting || !outputUrl} className="flex-1 min-w-[140px] bg-[#0275FB] hover:bg-[#015CC8] text-white font-title-md py-md px-lg rounded-xl flex justify-center items-center gap-sm disabled:opacity-60">
                <MaterialIcon name="share" />
                {exporting ? 'Đang xuất ảnh...' : 'Chia sẻ ngay'}
              </button>
              <button onClick={onDownload} disabled={exporting || !outputUrl} type="button" className="inline-flex items-center gap-1 rounded-xl border border-[#0275FB]/25 bg-white px-md py-sm font-semibold text-[#315071] hover:border-[#0275FB] disabled:opacity-60">
                <MaterialIcon name="download" className="text-sm" />
                Tải ảnh 9:16
              </button>
              <button onClick={markSharedManually} type="button" className="rounded-xl border border-[#0275FB]/25 bg-white px-md py-sm font-semibold text-[#315071] hover:border-[#0275FB]">
                Đã chia sẻ
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  )
}

