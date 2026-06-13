import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { gamificationApi, type QuestProgress } from '../features/gamification/api'
import { isReadyToStart } from '../features/gamification/questProgress'
import { useAuth } from '../shared/auth/useAuth'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'

export function QuestDetailPage() {
  const { questId } = useParams<{ questId: string }>()
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<QuestProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!questId) return
    if (!isAuthenticated) return
    gamificationApi.progress(questId).then(setProgress).catch((e) => {
      setProgress(null)
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    })
  }, [isAuthenticated, questId, showToast])

  const startQuest = async () => {
    if (!questId) return
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const started = await gamificationApi.startQuest(questId)
      setProgress(started)
      showToast({ message: 'Bắt đầu nhiệm vụ thành công.', type: 'success' })
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
          <img src={images.questDetailHero} alt="Quest detail" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute top-sm left-lg">
            <Link to="/quests" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-secondary"><MaterialIcon name="arrow_back" className="text-sm" /> Trở về</Link>
          </div>
        </div>
        <div className="p-lg grid lg:grid-cols-12 gap-lg">
          <section className="lg:col-span-8">
            <div className="flex items-center gap-sm mb-sm">
              <span className="px-xs py-[2px] rounded-full border border-primary/40 bg-primary/10 text-primary text-xs">Nhiệm vụ chính tuyến</span>
              <span className="text-xs text-on-surface-variant">Thừa Thiên Huế</span>
            </div>
            <h1 className="font-display-lg text-primary mt-sm mb-sm">{progress?.title ?? 'Bí ẩn Đại Nội'}</h1>
            <p className="text-on-surface-variant mb-md">{progress?.description ?? 'Giải mã những mật thư bị lãng quên trong Hoàng Thành.'}</p>

            <div className="border border-outline-variant rounded-xl p-md bg-surface-container">
              <h3 className="font-title-md mb-sm flex items-center gap-2"><MaterialIcon name="route" /> Hành trình</h3>
              <div className="space-y-md">
                <div className="border border-secondary/40 bg-secondary/10 rounded-lg p-sm">
                  <p className="font-title-md">Điện Thái Hòa <span className="text-xs text-secondary ml-sm">{progress?.status === 'completed' ? 'Hoàn tất' : progress?.status === 'in_progress' ? 'Đang thực hiện' : 'Đang mở'}</span></p>
                  <p className="text-sm text-on-surface-variant">Tiến vào trung tâm quyền lực của triều Nguyễn.</p>
                  <Link to={progress?.locationId ? `/scan?locationId=${progress.locationId}` : '/explore'} className="inline-flex items-center gap-1 mt-sm border border-secondary text-secondary px-md py-xs rounded-full">
                    Kích hoạt GPS <MaterialIcon name="my_location" className="text-sm" />
                  </Link>
                </div>
                <div className="opacity-70">
                  <p className="font-title-md flex items-center gap-2"><MaterialIcon name="lock" className="text-on-surface-variant" /> Hộp Cửu Đỉnh</p>
                  <p className="text-sm text-on-surface-variant">Hoàn thành bước trước để mở khóa.</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-md">
            <div className="border border-outline-variant rounded-xl p-md bg-surface-container">
              <h3 className="font-title-md flex items-center gap-2 mb-sm"><MaterialIcon name="trophy" className="text-primary" /> Phần thưởng</h3>
              <div className="grid grid-cols-2 gap-sm">
                <div className="border border-outline-variant rounded-lg p-sm text-center">
                  <p className="text-xs text-on-surface-variant">Kinh nghiệm</p>
                  <p className="font-headline-lg text-primary">+{progress?.pointsReward ?? 500}</p>
                </div>
                <div className="border border-outline-variant rounded-lg p-sm text-center">
                  <p className="text-xs text-on-surface-variant">Danh hiệu</p>
                  <p className="font-title-md">Sứ giả thời gian</p>
                </div>
              </div>
            </div>
            <div className="border border-outline-variant rounded-xl p-md bg-surface-container">
              <h3 className="font-title-md flex items-center gap-2 mb-sm"><MaterialIcon name="history_edu" /> Bối cảnh lịch sử</h3>
              <p className="text-sm text-on-surface-variant">Nhiệm vụ xây dựng bạn đọc cổ vật theo văn hóa triều đình và kiến trúc cung đình.</p>
            </div>
          </aside>
        </div>
        {isAuthenticated
          && progress
          && isReadyToStart(progress) && (
          <div className="mx-lg mb-md rounded-xl border border-secondary/40 bg-secondary/10 p-md">
            <p className="text-on-surface mb-sm">
              {progress.hasCheckinAtLocation
                ? 'Nhiệm vụ sẵn sàng hoàn thành'
                : 'Bắt đầu nhiệm vụ và check-in để nhận thưởng'}
            </p>
            <button
              type="button"
              onClick={startQuest}
              disabled={loading}
              className="bg-primary text-on-primary px-md py-sm rounded-lg disabled:opacity-60"
            >
              {loading ? 'Đang xử lý...' : 'Bắt đầu ngay'}
            </button>
          </div>
        )}
        {!isAuthenticated && (
          <div className="bg-surface-container border border-outline-variant rounded-lg p-md mb-md">
            <p className="text-on-surface-variant">
              Bạn đang ở chế độ guest. Đăng nhập để bắt đầu và lưu tiến trình nhiệm vụ.
            </p>
            <Link to="/login" className="inline-block mt-sm text-secondary underline">
              Đi tới đăng nhập
            </Link>
          </div>
        )}
        <div className="px-lg pb-xl flex flex-wrap gap-sm">
          <button
            onClick={startQuest}
            disabled={loading || !isAuthenticated || progress?.status === 'completed'}
            className="bg-primary text-on-primary px-md py-sm rounded-lg disabled:opacity-60"
          >
            {loading ? 'Đang xử lý...' : 'Bắt đầu nhiệm vụ'}
          </button>
          {isAuthenticated && (
            <Link
              to={progress?.locationId ? `/scan?locationId=${progress.locationId}` : '/explore'}
              className="inline-flex items-center gap-1 border border-outline-variant px-md py-sm rounded-lg hover:border-secondary"
            >
              Mở màn hình check-in <MaterialIcon name="arrow_forward" className="text-sm" />
            </Link>
          )}
        </div>
      </main>
    </AppLayout>
  )
}

