// src/pages/PhotoFramePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { viralApi, type PhotoFrame } from '../features/viral/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { useAuth } from '../shared/auth/useAuth'
import { isPremium } from '../shared/auth/types'
import { UpgradePrompt } from '../components/monetization/UpgradePrompt'

export function PhotoFramePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const premium = isPremium(user)
  const [frames, setFrames] = useState<PhotoFrame[]>([])
  const [frameId, setFrameId] = useState('')
  const [variant, setVariant] = useState<'square' | 'story'>('square')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [framesLoading, setFramesLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    viralApi
      .frames()
      .then((data) => {
        setFrames(data)
        if (data[0]) setFrameId(data[0].id)
      })
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' }))
      .finally(() => setFramesLoading(false))
  }, [showToast])

  const selectedFrame = useMemo(() => frames.find((f) => f.id === frameId), [frames, frameId])
  const selectedLocked = selectedFrame?.requiresPremium && !premium
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const submit = async () => {
    if (!file || !frameId || selectedLocked) return
    const maxBytes = 8 * 1024 * 1024
    if (file.size > maxBytes) {
      showToast({ message: 'Ảnh vượt quá 8MB. Vui lòng chọn ảnh nhỏ hơn.', type: 'error' })
      return
    }
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(file.type)) {
      showToast({ message: 'Chỉ hỗ trợ JPEG, PNG hoặc WebP.', type: 'error' })
      return
    }
    setUploading(true)
    try {
      const resized = await resizeImageForUpload(file)
      const creation = await viralApi.uploadCreation({ file: resized, frameId, variant })
      navigate(`/share?creationId=${creation.id}&outputUrl=${encodeURIComponent(creation.outputUrl)}`)
      showToast({ message: 'Tạo ảnh thành công.', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppLayout
      activeBorder="left"
      topNav={<SimpleTopNav title="Khung ảnh di sản" />}
      mobileBackTo="/scan"
      mobileTitle="Khung ảnh"
    >
      <main className="flex-1 mt-14 md:mt-16 p-md md:p-safe-area-inset flex flex-col lg:flex-row gap-md lg:gap-lg overflow-hidden min-h-0">
        <section className="flex-1 min-h-[280px] lg:min-h-0 bg-surface-container-low rounded-xl border border-surface-variant relative flex items-center justify-center overflow-hidden">
          <Link to="/home" className="absolute top-md left-md z-20 inline-flex items-center gap-1 px-sm py-xs rounded-full border border-outline-variant bg-surface/80 text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors">
            <MaterialIcon name="arrow_back" className="text-sm" />
            Trở về
          </Link>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 pointer-events-none" />
          <div className="relative z-10 w-full max-w-2xl aspect-[3/4] p-4 bg-surface rounded-lg border-2 border-outline-variant shadow-[0_0_40px_rgba(242,191,80,0.1)]">
            <div className="w-full h-full border-4 border-primary rounded-sm p-2 relative overflow-hidden">
              <div className="w-full h-full bg-surface-variant relative overflow-hidden">
                <img
                  alt={selectedFrame?.name ?? 'Frame preview'}
                  src={previewUrl || selectedFrame?.imageUrl || images.photoFrameCharacter}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="w-full lg:w-[380px] bg-surface-container border border-outline-variant rounded-xl flex flex-col lg:h-full shadow-lg shrink-0">
          <div className="p-lg border-b border-surface-variant">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Khung Hình Di Sản</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Hóa thân vào dòng chảy lịch sử qua ống kính công nghệ.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-xl">
            {framesLoading && <p className="text-sm text-on-surface-variant">Đang tải khung ảnh...</p>}
            {!framesLoading && frames.length === 0 && (
              <p className="text-sm text-on-surface-variant">Chưa có khung ảnh. Thử lại sau.</p>
            )}
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Nguồn ảnh</h3>
              <p className="text-sm text-on-surface-variant">
                Không dùng được camera? Chọn từ thư viện ảnh bên dưới.
              </p>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
            </div>
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Khung</h3>
              <select value={frameId} onChange={(e) => setFrameId(e.target.value)} className="bg-surface border border-outline-variant rounded-lg px-sm py-sm">
                {frames.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.era}){f.requiresPremium ? ' · Premium' : ''}
                  </option>
                ))}
              </select>
              {selectedLocked && (
                <UpgradePrompt
                  compact
                  message="Khung ảnh này dành cho gói Premium. Nâng cấp để sử dụng toàn bộ theme."
                />
              )}
              <div className="flex gap-sm">
                <button type="button" className={`flex-1 border rounded-lg p-sm ${variant === 'square' ? 'border-primary text-primary bg-surface-variant' : 'border-outline-variant text-on-surface-variant'}`} onClick={() => setVariant('square')}>Vuông 1080×1080</button>
                <button type="button" className={`flex-1 border rounded-lg p-sm ${variant === 'story' ? 'border-primary text-primary bg-surface-variant' : 'border-outline-variant text-on-surface-variant'}`} onClick={() => setVariant('story')}>Dọc 1080×1920</button>
              </div>
            </div>
          </div>
          <div className="p-lg border-t border-surface-variant mt-auto">
            <button onClick={submit} disabled={uploading || !file || selectedLocked} className="w-full bg-primary text-on-primary font-title-md py-4 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <MaterialIcon name="magic_button" />
              {uploading ? 'Đang upload...' : 'Tạo & Chia sẻ'}
            </button>
          </div>
        </aside>
      </main>
    </AppLayout>
  )
}

