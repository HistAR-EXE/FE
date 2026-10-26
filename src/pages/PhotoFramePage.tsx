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
import { HeritageRoleArtwork } from '../features/heritage-studio/HeritageRoleArtwork'
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
  const [photoMode, setPhotoMode] = useState<'original' | 'heritage'>(() => searchParams.get('role') ? 'heritage' : 'original')
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
  const heritageRoles = useMemo(
    () => getPublishedRoleTemplates(stationContext?.siteCode ?? 'cu-chi', heritageStationCode),
    [heritageStationCode, stationContext?.siteCode],
  )
  const hasHeritageRoles = heritageRoles.length > 0
  const initialHeritageRoleId = searchParams.get('role')
  const [selectedHeritageRole, setSelectedHeritageRole] = useState<PublishedHeritageRoleTemplate | null>(null)
  const previewFile = photoMode === 'heritage' && heritageComposite ? heritageComposite : file
  const previewUrl = useMemo(() => (previewFile ? URL.createObjectURL(previewFile) : null), [previewFile])
  const stationHero = stationContext
    ? stationMedia(stationContext.siteCode, stationContext.stationCode)?.hero
    : null
  const stationLabel = stationContext
    ? `${stationContext.stationCode}${stationName ? ` · ${stationName}` : ''}`
    : null
  const pageTitle = photoMode === 'heritage'
    ? `Hóa thân 1968${stationLabel ? ` · ${stationLabel}` : ''}`
    : stationLabel ? `Ảnh kỷ niệm · ${stationLabel}` : 'Ảnh kỷ niệm'
  const returnHref = stationContext
    ? buildStationPagePath(stationContext)
    : '/pack-prep?site=cu-chi'
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (initialHeritageRoleId && hasHeritageRoles) setPhotoMode('heritage')
  }, [hasHeritageRoles, initialHeritageRoleId])

  useEffect(() => {
    const next = heritageRoles.find((role) => role.id === initialHeritageRoleId) ?? heritageRoles[0] ?? null
    setSelectedHeritageRole(next)
  }, [heritageRoles, initialHeritageRoleId])

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
      topNav={<SimpleTopNav title={pageTitle} backTo={returnHref} backLabel={stationLabel ? `Về ${stationLabel}` : 'Về hành trình'} />}
      mobileBackTo={returnHref}
      mobileTitle={stationLabel ? `Ảnh · ${stationLabel}` : 'Ảnh kỷ niệm'}
    >
      <main className="mt-14 grid min-w-0 flex-1 items-start gap-4 p-3 md:mt-16 md:p-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-5">
        <section className="relative flex min-h-[460px] min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d3ab58]/25 bg-[radial-gradient(circle_at_50%_18%,#263650_0%,#121b2c_46%,#09101c_100%)] px-3 pb-5 pt-20 shadow-[0_24px_70px_rgba(0,0,0,0.25)] lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:min-h-[620px] lg:p-5">
          <Link to={returnHref} className="absolute top-md left-md z-20 inline-flex items-center gap-1 px-sm py-xs rounded-full border border-outline-variant bg-surface/80 text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors">
            <MaterialIcon name="arrow_back" className="text-sm" />
            {stationLabel ? `Về ${stationLabel}` : 'Về hành trình'}
          </Link>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035)_0%,transparent_38%),radial-gradient(circle_at_50%_100%,rgba(207,158,63,0.12),transparent_40%)]" />
          <div className={`relative z-10 mx-auto overflow-hidden rounded-2xl border border-[#efcc7b]/45 bg-[#17120d] p-1.5 shadow-[0_28px_80px_rgba(0,0,0,0.48)] ${photoMode === 'heritage' && !heritageComposite ? 'aspect-[9/16] w-full max-w-[420px] lg:h-full lg:max-h-[calc(100dvh-9rem)] lg:w-auto' : variant === 'story' ? 'aspect-[9/16] w-full max-w-[420px] lg:h-full lg:max-h-[calc(100dvh-9rem)] lg:w-auto' : 'aspect-square w-full max-w-[min(72vh,720px)]'}`}>
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#0d1422]">
              {photoMode === 'heritage' && !heritageComposite && selectedHeritageRole ? (
                <HeritageRoleArtwork template={selectedHeritageRole} eager showFaceGuide className="h-full w-full" />
              ) : (
                <>
                  <img
                    alt={previewUrl ? 'Ảnh kỷ niệm đang chỉnh' : stationLabel ? `Ảnh ${stationLabel}` : 'Ảnh kỷ niệm'}
                    src={previewUrl || stationHero || images.photoFrameCharacter}
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                    style={previewUrl && !heritageComposite ? { filter: buildPreviewFilter(lowLight) } : undefined}
                  />
                  {previewUrl && !heritageComposite && lowLight.tunnelGrade && (
                    <div className="pointer-events-none absolute inset-0" style={{ background: TUNNEL_VIGNETTE_CSS }} />
                  )}
                </>
              )}
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-black/55 px-4 py-2 text-xs font-bold text-white/85 backdrop-blur-md">
            {photoMode === 'heritage' ? 'Xem trước vai hóa thân · 1968' : 'Ảnh kỷ niệm tại trạm'}
          </div>
        </section>

        <aside className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d3ab58]/25 bg-surface-container shadow-[0_20px_55px_rgba(0,0,0,0.22)] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]">
          <div className="p-lg border-b border-surface-variant">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{pageTitle}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">{photoMode === 'heritage' ? 'Chọn ảnh chân dung để ghép khuôn mặt vào nhân vật lịch sử. Bản xem trước cập nhật tự động.' : 'Chụp hoặc chọn ảnh, điều chỉnh ánh sáng rồi lưu kỷ niệm tại trạm.'}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-xl">
            {photoMode === 'original' && framesLoading && <p className="text-sm text-on-surface-variant">Đang tải khung ảnh...</p>}
            {photoMode === 'original' && !framesLoading && frames.length === 0 && (
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
              {photoMode === 'heritage' && file && (
                <p className="rounded-lg border border-[#d9ae58]/30 bg-[#d9ae58]/10 px-3 py-2 text-xs leading-relaxed text-[#efd28f]">
                  Đã nhận ảnh chân dung. TimeLens đang xử lý ngay trên thiết bị; ảnh gốc chưa được tải lên máy chủ.
                </p>
              )}
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
                <button type="button" onClick={() => setPhotoMode('original')} className={`rounded-xl border p-sm font-bold ${photoMode === 'original' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'}`}>Ảnh gốc</button>
                <button type="button" disabled={!hasHeritageRoles} onClick={() => setPhotoMode('heritage')} className={`rounded-xl border p-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${photoMode === 'heritage' ? 'border-[#d9ae58] bg-[#d9ae58]/10 text-[#edc975]' : 'border-outline-variant'}`}>Hóa thân 1968</button>
              </div>
              {!hasHeritageRoles && (
                <p className="text-xs text-on-surface-variant">Vai hóa thân của trạm đang được duyệt sử liệu. Ảnh gốc vẫn dùng bình thường.</p>
              )}
              {photoMode === 'heritage' && (
                <>
                  <div className="rounded-xl border border-outline-variant bg-surface p-md">
                    <h3 className="font-title-md">Ánh sáng khuôn mặt</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">Chỉ điều chỉnh khuôn mặt được ghép để hòa với ánh sáng trong hầm.</p>
                    <label className="mt-3 flex flex-col gap-1 text-sm text-on-surface-variant">
                      <span className="flex justify-between">
                        <span>Tăng sáng</span>
                        <span>{Math.round(lowLight.boost * 100)}%</span>
                      </span>
                      <input type="range" min={0} max={100} value={Math.round(lowLight.boost * 100)} onChange={(e) => setLowLight((s) => ({ ...s, boost: Number(e.target.value) / 100 }))} aria-label="Tăng sáng khuôn mặt" />
                    </label>
                    <label className="mt-3 flex items-center gap-sm text-sm text-on-surface">
                      <input type="checkbox" checked={lowLight.tunnelGrade} onChange={(e) => setLowLight((s) => ({ ...s, tunnelGrade: e.target.checked }))} />
                      Hòa màu ánh đèn hầm
                    </label>
                  </div>
                  <HeritageStudio
                    file={file}
                    siteCode={stationContext?.siteCode ?? 'cu-chi'}
                    stationCode={heritageStationCode}
                    initialRoleId={initialHeritageRoleId}
                    variant={variant}
                    lowLight={lowLight}
                    onComposite={(composite: File, _template: PublishedHeritageRoleTemplate) => {
                      setHeritageComposite(composite)
                    }}
                    onRoleChange={(template) => {
                      setSelectedHeritageRole(template)
                      setHeritageComposite(null)
                    }}
                  />
                </>
              )}
            </div>
            {photoMode === 'original' && <div className="flex flex-col gap-md">
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
            </div>}
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Khung</h3>
              {photoMode === 'original' ? <select value={frameId} onChange={(e) => setFrameId(e.target.value)} className="bg-surface border border-outline-variant rounded-lg px-sm py-sm">
                  <option value="">Không dùng khung</option>
                  {frames.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.era}){f.requiresPremium ? ' · Premium' : ''}
                    </option>
                  ))}
                </select> : <p className="text-sm text-on-surface-variant">Vai diễn đã gồm bối cảnh và trang phục lịch sử; khuôn mặt của bạn sẽ được ghép vào vùng trống trên nhân vật.</p>}
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
              {uploading ? 'Đang upload...' : photoMode === 'heritage' ? 'Lưu ảnh hóa thân & Chia sẻ' : 'Tạo & Chia sẻ'}
            </button>
          </div>
        </aside>
      </main>
    </AppLayout>
  )
}

