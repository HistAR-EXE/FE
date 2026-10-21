// src/pages/SecretStoryPage.tsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { gamificationApi, type SecretStory } from '../features/gamification/api'
import { ApiError } from '../shared/api/contracts'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function SecretStoryPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const targetLocationId = locationId ?? ''
  const [story, setStory] = useState<SecretStory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const { showToast } = useToast()

  const loadStory = useCallback(async () => {
    if (!targetLocationId) {
      setStory(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await gamificationApi.secretStory(targetLocationId)
      setStory(response)
      if (!response.locked) {
        setUnlocked(true)
      }
    } catch (e) {
      setStory(null)
      if (e instanceof ApiError && e.status === 403) {
        setError('Bạn chưa đủ điều kiện để xem câu chuyện này.')
        showToast({ message: 'Khám phá thêm để mở khoá câu chuyện này.', type: 'info' })
      } else {
        setError(getFriendlyErrorMessage(e, 'quest'))
        showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [showToast, targetLocationId])

  useEffect(() => {
     
    loadStory()
  }, [loadStory])

  return (
    <AppLayout
      activeBorder="left"
      topNav={<SimpleTopNav title="Câu chuyện bí mật" />}
      mobileBackTo={targetLocationId ? `/explore/${targetLocationId}` : '/quests'}
      mobileTitle="Câu chuyện bí mật"
    >
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-3xl mx-auto">
        {!targetLocationId && (
          <p className="text-on-surface-variant">Hãy mở câu chuyện bí mật từ trang chi tiết di tích hoặc sau khi hoàn thành nhiệm vụ.</p>
        )}
        {loading && (
          <div className="space-y-md">
            <div className="h-32 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
            <p className="text-on-surface-variant text-sm">Đang tải câu chuyện bí mật...</p>
          </div>
        )}
        {!loading && error && targetLocationId && (
          <section className="rounded-xl border border-error/30 bg-error-container/20 p-md" role="alert">
            <h1 className="font-headline-lg text-on-surface">Không tải được câu chuyện bí mật</h1>
            <p className="mt-sm text-on-surface-variant">{error}</p>
            <button type="button" onClick={loadStory} className="mt-md rounded-lg border border-outline-variant px-md py-sm font-bold">
              Thử lại
            </button>
          </section>
        )}
        {!loading && !error && !story && targetLocationId && (
          <p className="text-on-surface-variant">Địa điểm này chưa có câu chuyện bí mật được phát hành.</p>
        )}
        {story && (
          <section className={`bg-surface-container border border-outline-variant rounded-lg p-md relative overflow-hidden transition-all duration-700 ${story.locked ? 'opacity-90' : ''}`}>
            <h1 className="font-display-lg text-primary mb-sm">{story.title}</h1>
            {story.locked ? (
              <div className="flex flex-col items-center gap-md rounded-lg bg-background/40 p-lg text-center">
                  <MaterialIcon name="lock" className="text-5xl text-on-surface-variant" />
                  <p className="max-w-sm text-on-surface-variant">
                    {story.unlockCondition || 'Hoàn thành ít nhất một nhiệm vụ tại địa điểm để mở câu chuyện bí mật.'}
                  </p>
                  {story.lockReason && <span className="rounded-full bg-surface px-sm py-xs text-xs font-bold">Điều kiện: {story.lockReason}</span>}
                  <Link to={`/scan?locationId=${targetLocationId}`} className="inline-flex items-center gap-1 text-secondary underline">
                    Đi tới quét mã <MaterialIcon name="qr_code_scanner" className="text-sm" />
                  </Link>
              </div>
            ) : (
              <p className={`whitespace-pre-wrap text-on-surface transition-all duration-700 ${unlocked ? 'animate-[fadeIn_0.6s_ease-out]' : ''}`}>
                {story.story}
              </p>
            )}
            <button type="button" onClick={loadStory} className="mt-md px-md py-sm border border-outline-variant rounded hover:border-secondary">
              Tải lại trạng thái
            </button>
          </section>
        )}
      </main>
    </AppLayout>
  )
}

