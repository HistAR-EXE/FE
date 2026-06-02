import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { gamificationApi, type SecretStory } from '../features/gamification/api'
import { useToast } from '../shared/ui/toast/useToast'

export function SecretStoryPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const targetLocationId = locationId ?? ''
  const [story, setStory] = useState<SecretStory | null>(null)
  const [loading, setLoading] = useState(true)
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
    } catch {
      showToast({ message: 'Không tải được Secret Story.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast, targetLocationId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStory()
  }, [loadStory])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Secret Story" />}>
      <main className="mt-16 p-lg max-w-3xl mx-auto">
        {!targetLocationId && (
          <p className="text-on-surface-variant">Thiếu locationId. Hãy vào màn hình địa điểm và mở Secret Story từ đó.</p>
        )}
        {loading && <p>Đang tải câu chuyện bí mật...</p>}
        {story && (
          <section className="bg-surface-container border border-outline-variant rounded-lg p-md">
            <h1 className="font-display-lg text-primary mb-sm">{story.title}</h1>
            {story.locked ? (
              <>
                <p className="text-on-surface-variant mb-md">
                  Câu chuyện vẫn đang khóa. Bạn cần hoàn thành quest và quét secret QR để mở khóa.
                </p>
                <Link to={`/scan?locationId=${targetLocationId}`} className="text-secondary underline">
                  Đi tới màn hình quét QR
                </Link>
              </>
            ) : (
              <p className="whitespace-pre-wrap text-on-surface">{story.story}</p>
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

