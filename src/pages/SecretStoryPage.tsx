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
      const response = await gamificationApi.secretStory(targetLocationId)
      setStory(response)
      if (!response.locked) {
        setUnlocked(true)
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        showToast({ message: 'Khám phá thêm để mở khoá câu chuyện này.', type: 'info' })
      } else {
        showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [showToast, targetLocationId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        {!loading && !story && targetLocationId && (
          <p className="text-on-surface-variant">Không tải được nội dung. Hãy thử lại sau.</p>
        )}
        {story && (
          <section className={`bg-surface-container border border-outline-variant rounded-lg p-md relative overflow-hidden transition-all duration-700 ${story.locked ? 'opacity-90' : ''}`}>
            <h1 className="font-display-lg text-primary mb-sm">{story.title}</h1>
            {story.locked ? (
              <div className="relative">
                <div className="blur-sm select-none pointer-events-none opacity-60 whitespace-pre-wrap text-on-surface">
                  {story.story || 'Nội dung bí mật đang được bảo vệ...'}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-md bg-background/40 rounded-lg">
                  <MaterialIcon name="lock" className="text-5xl text-on-surface-variant" />
                  <p className="text-on-surface-variant text-center max-w-sm px-md">
                    Khám phá thêm để mở khoá câu chuyện này. Hoàn thành nhiệm vụ và check-in tại di tích.
                  </p>
                  <Link to={`/scan?locationId=${targetLocationId}`} className="inline-flex items-center gap-1 text-secondary underline">
                    Đi tới quét mã <MaterialIcon name="qr_code_scanner" className="text-sm" />
                  </Link>
                </div>
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

