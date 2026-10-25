// src/pages/PhotoFramePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { viralApi, type PhotoFrame } from '../features/viral/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { useAuth } from '../shared/auth/useAuth'
import { hasPremiumAccess } from '../shared/access/contentAccess'
import { UpgradePrompt } from '../components/monetization/UpgradePrompt'
import { resizeImageForUpload } from '../shared/utils/resizeImage'
import {
  buildPreviewFilter,
  DEFAULT_LOW_LIGHT,
  enhanceCapturedPhoto,
  TUNNEL_VIGNETTE_CSS,
  type LowLightOptions,
} from '../lib/heritageImage'
import { emitEvent } from '../lib/pilotEvents'
import { getActiveStationCode, isCameraLockedForStation } from '../lib/stationSafety'
import { ReportContentButton } from '../components/feedback/ReportContentModal'
import { stationsApi } from '../features/stations/api'
import { stationMedia } from '../features/stations/stationMedia'
import {
  appendStationContext,
  appendHeritageEntrySource,
  buildStationPagePath,
  readHeritageEntrySource,
  readStationRouteContext,
} from '../features/stations/stationRoutes'
import { HeritageStudio } from '../features/heritage-studio/HeritageStudio'
import { getPublishedRoleTemplates } from '../features/heritage-studio/roleTemplates'
import type { HeritageStationCode, PublishedHeritageRoleTemplate } from '../features/heritage-studio/types'

export function PhotoFramePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const stationContext = useMemo(() => readStationRouteContext(searchParams), [searchParams])
  const entrySource = readHeritageEntrySource(searchParams.get('source'))
  const { user } = useAuth()
  const premium = hasPremiumAccess(user)
  const activeStation = getActiveStationCode()
  const effectiveStation = stationContext?.stationCode ?? activeStation
  const cameraLocked = isCameraLockedForStation(effectiveStation)
  const [frames, setFrames] = useState<PhotoFrame[]>([])
  const [frameId, setFrameId] = useState('')
  const [variant, setVariant] = useState<'square' | 'story'>('square')
  const [file, setFile] = useState<File | null>(null)
  const [photoMode, setPhotoMode] = useState<'original' | 'heritage'>('original')
  const [heritageComposite, setHeritageComposite] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [framesLoading, setFramesLoading] = useState(true)
  const [stationName, setStationName] = useState<string | null>(null)
  const [lowLight, setLowLight] = useState<LowLightOptions>(DEFAULT_LOW_LIGHT)
  const { showToast } = useToast()

  useEffect(() => {
    viralApi
      .frames()
      .then(setFrames)
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' }))
      .finally(() => setFramesLoading(false))
  }, [showToast])

  useEffect(() => {
    if (!stationContext) {
      setStationName(null)
      return
    }
    let cancelled = false
    stationsApi
      .get(stationContext.siteCode, stationContext.stationCode)
      .then((station) => !cancelled && setStationName(station.name))
      .catch(() => !cancelled && setStationName(null))
    return () => {
      cancelled = true
    }
  }, [stationContext])

  useEffect(() => {
    if (!cameraLocked) {
      emitEvent('camera_opened', { stationCode: effectiveStation ?? undefined, payload: { page: 'photo_frame' } })
    }
  }, [cameraLocked, effectiveStation])

  const selectedFrame = useMemo(() => frames.find((f) => f.id === frameId), [frames, frameId])
  const selectedLocked = selectedFrame?.requiresPremium && !premium
  const heritageStationCode = stationContext && /^ST0[1-6]$/.test(stationContext.stationCode)
    ? stationContext.stationCode as HeritageStationCode
    : undefined
  const hasHeritageRoles = getPublishedRoleTemplates(stationContext?.siteCode ?? 'cu-chi', heritageStationCode).length > 0
  const initialHeritageRoleId = searchParams.get('role')
  const previewFile = photoMode === 'heritage' && heritageComposite ? heritageComposite : file
  const previewUrl = useMemo(() => (previewFile ? URL.createObjectURL(previewFile) : null), [previewFile])
  const stationHero = stationContext
    ? stationMedia(stationContext.siteCode, stationContext.stationCode)?.hero
    : null
  const stationLabel = stationContext
    ? `${stationContext.stationCode}${stationName ? ` · ${stationName}` : ''}`
    : null
  const returnHref = stationContext
    ? buildStationPagePath(stationContext)
    : '/pack-prep?site=cu-chi'
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (initialHeritageRoleId && hasHeritageRoles) setPhotoMode('heritage')
  }, [hasHeritageRoles, initialHeritageRoleId])

  const submit = async () => {
    const uploadFile = photoMode === 'heritage' ? heritageComposite : file
    if (!uploadFile || (photoMode === 'original' && selectedLocked)) {
      if (photoMode === 'heritage' && file && !heritageComposite) {
        showToast({ message: 'Hãy tạo ảnh hóa thân trước khi lưu.', type: 'info' })
      }
      return
    }
    const maxBytes = 8 * 1024 * 1024
    if (uploadFile.size > maxBytes) {
      showToast({ message: 'Ảnh vượt quá 8MB. Vui lòng chọn ảnh nhỏ hơn.', type: 'error' })
      return
    }
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(uploadFile.type)) {
      showToast({ message: 'Chỉ hỗ trợ JPEG, PNG hoặc WebP.', type: 'error' })
      return
    }
    setUploading(true)
    try {
      const enhanced = photoMode === 'heritage'
        ? uploadFile
        : await enhanceCapturedPhoto(uploadFile, lowLight).catch(() => uploadFile)
      const resized = await resizeImageForUpload(enhanced)
      const creation = await viralApi.uploadCreation({
        file: resized,
        frameId: photoMode === 'heritage' ? null : frameId || null,
        variant,
      })
      const sharePath = `/share?creationId=${creation.id}&outputUrl=${encodeURIComponent(creation.outputUrl)}`
      const contextualSharePath = stationContext ? appendStationContext(sharePath, stationContext) : sharePath
      navigate(appendHeritageEntrySource(contextualSharePath, entrySource))
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
      topNav={<SimpleTopNav title={stationLabel ? `Ảnh kỷ niệm · ${stationLabel}` : 'Ảnh kỷ niệm'} backTo={returnHref} backLabel={stationLabel ? `Về ${stationLabel}` : 'Về hành trình'} />}
      mobileBackTo={returnHref}
      mobileTitle={stationLabel ? `Ảnh · ${stationLabel}` : 'Ảnh kỷ niệm'}
    >
      <main className="flex-1 mt-14 md:mt-16 p-md md:p-safe-area-inset flex flex-col lg:flex-row gap-md lg:gap-lg overflow-hidden min-h-0">
        <section className="flex-1 min-h-[280px] lg:min-h-0 bg-surface-container-low rounded-xl border border-surface-variant relative flex items-center justify-center overflow-hidden">
          <Link to={returnHref} className="absolute top-md left-md z-20 inline-flex items-center gap-1 px-sm py-xs rounded-full border border-outline-variant bg-surface/80 text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors">
            <MaterialIcon name="arrow_back" className="text-sm" />
            {stationLabel ? `Về ${stationLabel}` : 'Về hành trình'}
          </Link>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 pointer-events-none" />
          <div className="relative z-10 w-full max-w-2xl aspect-[3/4] p-4 bg-surface rounded-lg border-2 border-outline-variant shadow-[0_0_40px_rgba(242,191,80,0.1)]">
            <div className="w-full h-full border-4 border-primary rounded-sm p-2 relative overflow-hidden">
              <div className="w-full h-full bg-surface-variant relative overflow-hidden">
                <img
                  alt={previewUrl ? 'Ảnh kỷ niệm đang chỉnh' : stationLabel ? `Ảnh ${stationLabel}` : 'Ảnh kỷ niệm'}
                  src={previewUrl || stationHero || images.photoFrameCharacter}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  style={previewUrl && !heritageComposite ? { filter: buildPreviewFilter(lowLight) } : undefined}
                />
                {previewUrl && !heritageComposite && lowLight.tunnelGrade && (
                  <div className="absolute inset-0 pointer-events-none" style={{ background: TUNNEL_VIGNETTE_CSS }} />
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="w-full lg:w-[380px] bg-surface-container border border-outline-variant rounded-xl flex flex-col lg:h-full shadow-lg shrink-0">
          <div className="p-lg border-b border-surface-variant">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{stationLabel ? `Ảnh kỷ niệm · ${stationLabel}` : 'Ảnh kỷ niệm'}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Chụp hoặc chọn ảnh, điều chỉnh ánh sáng rồi lưu kỷ niệm tại trạm.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-xl">
            {framesLoading && <p className="text-sm text-on-surface-variant">Đang tải khung ảnh...</p>}
            {!framesLoading && frames.length === 0 && (
              <p className="text-sm text-on-surface-variant">Chưa có khung ảnh. Thử lại sau.</p>
            )}
            {cameraLocked && (
              <div
                data-testid="camera-locked-banner"
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-md text-sm text-amber-100"
              >
                <p className="font-bold flex items-center gap-2">
                  <MaterialIcon name="warning" className="text-base" /> Camera tạm khóa tại trạm {effectiveStation}
                </p>
                <p className="mt-1 text-amber-100/80">
                  Cất điện thoại khi đi trong hầm hẹp / khu tưởng niệm. Ưu tiên nghe lời dẫn. Bạn vẫn có thể chọn ảnh từ thư viện (không selfie lên server mặc định).
                </p>
              </div>
            )}
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Nguồn ảnh</h3>
              <p className="text-sm text-on-surface-variant">
                {cameraLocked
                  ? 'Camera live bị khóa — chọn ảnh từ thư viện nếu cần.'
                  : 'Không dùng được camera? Chọn từ thư viện ảnh bên dưới.'}
              </p>
              <input
                type="file"
                accept="image/*"
                capture={cameraLocked ? undefined : 'environment'}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setHeritageComposite(null)
                }}
                className="w-full text-sm"
              />
              {!cameraLocked && (
                <div className="flex items-start gap-sm rounded-lg border border-outline-variant bg-surface p-sm text-sm text-on-surface-variant" role="note">
                  <MaterialIcon name="flashlight_on" className="text-base text-primary shrink-0" />
                  <p>
                    Nơi thiếu sáng (địa đạo, hầm)? Bật đèn pin của điện thoại hoặc nút flash trong ứng dụng camera, giữ máy thật vững rồi chụp.
                    Có thể tăng sáng bên dưới nếu ảnh vẫn tối.
                  </p>
                </div>
              )}
              <ReportContentButton stationCode={effectiveStation ?? undefined} context="photo_frame" />
            </div>
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Chế độ ảnh</h3>
              <div className="grid grid-cols-2 gap-sm" role="group" aria-label="Chọn chế độ ảnh">
                <button type="button" onClick={() => setPhotoMode('original')} className={`rounded-lg border p-sm ${photoMode === 'original' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'}`}>Ảnh gốc</button>
                <button type="button" disabled={!hasHeritageRoles} onClick={() => setPhotoMode('heritage')} className={`rounded-lg border p-sm disabled:cursor-not-allowed disabled:opacity-50 ${photoMode === 'heritage' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'}`}>Hóa thân 1968</button>
              </div>
              {!hasHeritageRoles && (
                <p className="text-xs text-on-surface-variant">Vai hóa thân của trạm đang được duyệt sử liệu. Ảnh gốc vẫn dùng bình thường.</p>
              )}
              {photoMode === 'heritage' && (
                <HeritageStudio
                  file={file}
                  siteCode={stationContext?.siteCode ?? 'cu-chi'}
                  stationCode={heritageStationCode}
                  initialRoleId={initialHeritageRoleId}
                  variant={variant}
                  lowLight={lowLight}
                  onComposite={(composite: File, _template: PublishedHeritageRoleTemplate) => {
                    setHeritageComposite(composite)
                    showToast({ message: 'Đã dựng ảnh hóa thân trên thiết bị.', type: 'success' })
                  }}
                />
              )}
            </div>
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Chế độ thiếu sáng</h3>
              <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
                <span className="flex justify-between">
                  <span>Tăng sáng (đường cong gamma)</span>
                  <span>{Math.round(lowLight.boost * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(lowLight.boost * 100)}
                  onChange={(e) => setLowLight((s) => ({ ...s, boost: Number(e.target.value) / 100 }))}
                  aria-label="Tăng sáng"
                />
              </label>
              <label className="flex items-center gap-sm text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={lowLight.tunnelGrade}
                  onChange={(e) => setLowLight((s) => ({ ...s, tunnelGrade: e.target.checked }))}
                />
                Ánh sáng địa đạo (ấm, giảm bão hòa, tối viền)
              </label>
            </div>
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Khung</h3>
              {photoMode === 'original' ? <select value={frameId} onChange={(e) => setFrameId(e.target.value)} className="bg-surface border border-outline-variant rounded-lg px-sm py-sm">
                  <option value="">Không dùng khung</option>
                  {frames.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.era}){f.requiresPremium ? ' · Premium' : ''}
                    </option>
                  ))}
                </select> : <p className="text-sm text-on-surface-variant">Ảnh hóa thân dùng lớp bối cảnh lịch sử đã duyệt, không chồng thêm khung ảnh.</p>}
              {photoMode === 'original' && selectedLocked && (
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
            <button onClick={submit} disabled={uploading || !(photoMode === 'heritage' ? heritageComposite : file) || (photoMode === 'original' && selectedLocked)} className="w-full bg-primary text-on-primary font-title-md py-4 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <MaterialIcon name="magic_button" />
              {uploading ? 'Đang upload...' : 'Tạo & Chia sẻ'}
            </button>
          </div>
        </aside>
      </main>
    </AppLayout>
  )
}

