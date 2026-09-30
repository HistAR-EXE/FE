// src/pages/SharePage.tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { viralApi } from '../features/viral/api'
import { analyticsApi } from '../features/analytics/api'
import { formatXpToast, XP_LABELS } from '../shared/ui/xpToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { emitEvent } from '../lib/pilotEvents'
import { downloadBlob, exportStoryImage } from '../lib/heritageImage'

const STORY_FILENAME = 'timelens-heritage-9x16.jpg'

export function SharePage() {
  const [params] = useSearchParams()
  const creationId = params.get('creationId') ?? ''
  const outputUrl = params.get('outputUrl') ? decodeURIComponent(params.get('outputUrl') as string) : ''
  const [caption, setCaption] = useState('Khám phá di sản Việt cùng TimeLens!')
  const { showToast } = useToast()

  useEffect(() => {
    viralApi.sharePrefill().then((data) => setCaption(data.caption))
  }, [])

  const [exporting, setExporting] = useState(false)

  /** Render 1080x1920 (9:16) JPEG with "timelens.asia" watermark; null if canvas export fails (e.g. CORS). */
  const buildStoryFile = async (): Promise<File | null> => {
    if (!outputUrl) return null
    try {
      const blob = await exportStoryImage(outputUrl)
      return new File([blob], STORY_FILENAME, { type: 'image/jpeg' })
    } catch {
      return null
    }
  }

  const downloadOriginal = () => {
    const link = document.createElement('a')
    link.href = outputUrl
    link.download = 'timelens-heritage.jpg'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }

  const onDownload = async () => {
    if (!outputUrl) {
      showToast({ message: 'Chưa có ảnh để tải xuống.', type: 'error' })
      return
    }
    setExporting(true)
    try {
      const file = await buildStoryFile()
      if (file) {
        downloadBlob(file, STORY_FILENAME)
        showToast({ message: 'Đang tải ảnh 9:16 có watermark...', type: 'info' })
      } else {
        downloadOriginal()
        showToast({ message: 'Không xuất được ảnh 9:16, đang tải ảnh gốc.', type: 'info' })
      }
    } finally {
      setExporting(false)
    }
  }

  const onShare = async () => {
    setExporting(true)
    try {
      const file = await buildStoryFile()
      emitEvent('share_initiated', {
        payload: { ...(creationId ? { creationId } : {}), format: file ? '9x16' : 'original', channel: 'native' },
      })
      if (navigator.share) {
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'TimeLens', text: caption })
        } else {
          if (file) downloadBlob(file, STORY_FILENAME)
          await navigator.share({ title: 'TimeLens', text: caption, url: outputUrl || window.location.href })
        }
      } else if (file) {
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
    } catch {
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

  return (
    <AppLayout
      activeBorder="left"
      topNav={<SimpleTopNav title="Chia sẻ" />}
      mobileBackTo="/photo-frame"
      mobileTitle="Chia sẻ"
    >
      <main className="bg-background text-on-background min-h-screen flex items-center justify-center p-md lg:p-xl relative overflow-hidden mt-14 md:mt-16 pb-20 md:pb-0">
        <div className="relative z-10 w-full max-w-[1200px] bg-surface-container/60 backdrop-blur-2xl border border-outline-variant/30 rounded-[24px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[700px]">
          <div className="w-full md:w-3/5 h-[400px] md:h-full relative overflow-hidden group">
            <img alt="Generated Heritage Character" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={outputUrl || images.shareCharacter} />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute bottom-lg left-lg flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"><MaterialIcon name="timelapse" className="text-on-primary" /></div>
              <div>
                <h2 className="font-headline-lg text-primary tracking-widest uppercase">TimeLens</h2>
                <p className="font-label-sm text-on-surface-variant">Hành trình di sản</p>
              </div>
            </div>
          </div>
          <div className="w-full md:w-2/5 flex flex-col p-lg md:p-xl h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-xl">
              <h1 className="font-headline-lg text-on-surface">Chia sẻ</h1>
            </div>
            <div className="flex-1 flex flex-col gap-xl justify-center">
              <div className="space-y-sm">
                <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Thông điệp</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-md text-on-surface focus:border-secondary outline-none resize-none" rows={4} />
              </div>
              <div className="grid grid-cols-4 gap-md">
                {['music_note', 'photo_camera', 'public', 'link'].map((icon) => (
                  <button key={icon} type="button" className="flex flex-col items-center gap-sm group">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center group-hover:bg-surface-variant transition-all">
                      <MaterialIcon name={icon} className="text-[28px] text-on-surface" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-xl pt-lg border-t border-outline-variant/30 flex flex-wrap gap-sm">
              <button onClick={onShare} disabled={exporting} className="flex-1 min-w-[140px] bg-primary hover:bg-primary-container text-on-primary font-title-md py-md px-lg rounded-xl flex justify-center items-center gap-sm disabled:opacity-60">
                <MaterialIcon name="share" />
                {exporting ? 'Đang xuất ảnh...' : 'Chia sẻ ngay'}
              </button>
              <button onClick={onDownload} disabled={exporting} type="button" className="border border-outline-variant px-md py-sm rounded-xl inline-flex items-center gap-1 disabled:opacity-60">
                <MaterialIcon name="download" className="text-sm" />
                Tải ảnh 9:16
              </button>
              <button onClick={markSharedManually} type="button" className="border border-outline-variant px-md py-sm rounded-xl">
                Đã chia sẻ
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  )
}

