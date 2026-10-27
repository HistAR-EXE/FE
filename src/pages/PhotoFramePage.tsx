// src/pages/PhotoFramePage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { viralApi, type PhotoFrame } from '../features/viral/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useAuth } from '../shared/auth/useAuth'
import { hasPremiumAccess } from '../shared/access/contentAccess'
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
import { stationsApi } from '../features/stations/api'
import {
  appendStationContext,
  appendHeritageEntrySource,
  buildStationPagePath,
  readHeritageEntrySource,
  readStationRouteContext,
} from '../features/stations/stationRoutes'
import type { HeritageStudioHandle, HeritagePreviewState } from '../features/heritage-studio/HeritageStudio'
import { HeritageStudioPanel } from '../features/heritage-studio/HeritageStudioPanel'
import { OriginalPhotoPanel } from '../features/heritage-studio/OriginalPhotoPanel'
import { HeritageRoleArtwork } from '../features/heritage-studio/HeritageRoleArtwork'
import { getPublishedRoleTemplates } from '../features/heritage-studio/roleTemplates'
import { FaceTransformCanvas } from '../features/heritage-studio/FaceTransformCanvas'
import { flushHeritageUploads, queueHeritageUpload } from '../lib/heritageUploadOutbox'
import { readStoredUser } from '../shared/auth/session'
import { isOfflineLikeError } from '../lib/offlineOutbox'
import { loadHeritageDraft, saveHeritageDraft } from '../lib/heritageStudioDraft'
import { loadPhotoFrameReturnDraft, savePhotoFrameReturnDraft } from '../lib/photoFrameReturnDraft'
import type { FacePlacement } from '../features/heritage-studio/facePlacement'
import { initialPlacement } from '../features/heritage-studio/facePlacement'
import type { HeritageStationCode, PublishedHeritageRoleTemplate } from '../features/heritage-studio/types'

export function PhotoFramePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const undoReturnCreationId = typeof location.state?.undoReturnCreationId === 'string' ? location.state.undoReturnCreationId as string : null
  const stationContext = useMemo(() => readStationRouteContext(searchParams), [searchParams])
  const entrySource = readHeritageEntrySource(searchParams.get('source'))
  const requestedMode = searchParams.get('mode')
  const legacyStationHeritageEntry = requestedMode === null && stationContext?.siteCode === 'cu-chi' &&
    /^ST0[1-6]$/.test(stationContext.stationCode)
  const heritageEntry = requestedMode === 'heritage' || (requestedMode !== 'original' && (
    Boolean(searchParams.get('role')) || (entrySource === 'time-portal-3d' && Boolean(stationContext)) || legacyStationHeritageEntry
  ))
  const { user } = useAuth()
  const premium = hasPremiumAccess(user)
  const activeStation = getActiveStationCode()
  const effectiveStation = stationContext?.stationCode ?? activeStation
  const cameraLocked = isCameraLockedForStation(effectiveStation)
  const [frames, setFrames] = useState<PhotoFrame[]>([])
  const [frameId, setFrameId] = useState('')
  const [variant, setVariant] = useState<'square' | 'story'>(() => heritageEntry ? 'story' : 'square')
  const [file, setFile] = useState<File | null>(null)
  const [photoMode, setPhotoMode] = useState<'original' | 'heritage'>(() => heritageEntry ? 'heritage' : 'original')
  const [heritagePreview, setHeritagePreview] = useState<HeritagePreviewState>({ ready: false, error: null })
  const [hasHeritagePreview, setHasHeritagePreview] = useState(false)
  const heritageCanvasRef = useRef<HTMLCanvasElement>(null)
  const heritageStudioRef = useRef<HeritageStudioHandle>(null)
  const updateHeritagePreview = useCallback((state: HeritagePreviewState) => { setHeritagePreview(state); setHasHeritagePreview(state.ready) }, [])
  const updatePortraitFile = useCallback((next: File | null) => {
    setFile(next)
    setHasHeritagePreview(false)
    setHeritagePreview({ ready: false, error: null })
  }, [])
  const [uploading, setUploading] = useState(false)
  const [framesLoading, setFramesLoading] = useState(true)
  const [stationName, setStationName] = useState<string | null>(null)
  const [lowLight, setLowLight] = useState<LowLightOptions>(DEFAULT_LOW_LIGHT)
  const [draftHydratedKey, setDraftHydratedKey] = useState<string | null>(null)
  const [draftError, setDraftError] = useState(false)
  const [restoredPlacement, setRestoredPlacement] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!user?.id) return
    const ownerId = user.id
    const activeOwnerId = () => readStoredUser()?.id ?? null
    void flushHeritageUploads(ownerId, activeOwnerId)
    const onOnline = () => void flushHeritageUploads(ownerId, activeOwnerId)
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user?.id])

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
  const [heritagePlacement, setHeritagePlacement] = useState<FacePlacement | null>(null)
  const draftContextKey = `${stationContext?.siteCode ?? 'cu-chi'}:${stationContext?.stationCode ?? 'standalone'}:${entrySource ?? 'direct'}`
  const ownerDraftKey = user?.id ? `${user.id}:${draftContextKey}` : null
  const previewFile = photoMode === 'original' ? file : null
  const previewUrl = useMemo(() => (previewFile ? URL.createObjectURL(previewFile) : null), [previewFile])
  const stationLabel = stationContext
    ? `${stationContext.stationCode}${stationName ? ` · ${stationName}` : ''}`
    : null
  const pageTitle = photoMode === 'heritage'
    ? `Hóa thân 1968${stationLabel ? ` · ${stationLabel}` : ''}`
    : stationLabel ? `Ảnh kỷ niệm · ${stationLabel}` : 'Ảnh kỷ niệm'
  const returnHref = stationContext
    ? buildStationPagePath(stationContext)
    : searchParams.get('returnTo') || '/profile'
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (heritageEntry && hasHeritageRoles) {
      setPhotoMode('heritage')
      setVariant('story')
    }
  }, [hasHeritageRoles, heritageEntry])

  useEffect(() => {
    const next = heritageRoles.find((role) => role.id === initialHeritageRoleId) ?? null
    setSelectedHeritageRole(next)
    setHeritagePlacement(next ? initialPlacement(null, next) : null)
    setHasHeritagePreview(false)
  }, [heritageRoles, initialHeritageRoleId])

  useEffect(() => {
    if (!ownerDraftKey || !user?.id || undoReturnCreationId) return
    if (requestedMode === 'original') {
      setDraftHydratedKey(ownerDraftKey)
      return
    }
    let cancelled = false
    setDraftHydratedKey(null)
    void loadHeritageDraft(user.id, draftContextKey).then((draft) => {
      if (cancelled) return
      const role = heritageRoles.find((item) => item.id === draft?.roleId)
      if (draft && role) {
        setPhotoMode('heritage')
        setVariant('story')
        setSelectedHeritageRole(role)
        setFile(draft.file)
        setHeritagePlacement(draft.placement)
        setRestoredPlacement(Boolean(draft.placement))
        setLowLight(draft.lowLight)
      }
    }).catch(() => {
      if (!cancelled) setDraftError(true)
    }).finally(() => {
      if (!cancelled) setDraftHydratedKey(ownerDraftKey)
    })
    return () => { cancelled = true }
  }, [ownerDraftKey, user?.id, draftContextKey, heritageRoles, undoReturnCreationId, requestedMode])

  useEffect(() => {
    if (!user?.id || !undoReturnCreationId) return
    let cancelled = false
    void loadPhotoFrameReturnDraft(user.id, undoReturnCreationId).then((draft) => {
      if (cancelled) return
      if (!draft) {
        showToast({ message: 'Không còn bản chỉnh sửa. Hãy chọn ảnh lại.', type: 'info' })
        return
      }
      const role = draft.roleId ? heritageRoles.find((item) => item.id === draft.roleId) ?? null : null
      setPhotoMode(draft.mode === 'heritage' && role ? 'heritage' : 'original')
      setFile(draft.file)
      setFrameId(draft.frameId)
      setVariant(draft.variant)
      setLowLight(draft.lowLight)
      setSelectedHeritageRole(role)
      setHeritagePlacement(draft.placement)
      setRestoredPlacement(Boolean(draft.placement))
      setHasHeritagePreview(false)
      setHeritagePreview({ ready: false, error: null })
      setDraftHydratedKey(ownerDraftKey)
      showToast({ message: 'Đã hoàn tác ảnh vừa lưu. Bạn có thể tiếp tục chỉnh sửa.', type: 'success' })
    }).catch(() => {
      if (!cancelled) showToast({ message: 'Không thể khôi phục bản chỉnh sửa. Hãy chọn ảnh lại.', type: 'error' })
    })
    return () => { cancelled = true }
  }, [user?.id, undoReturnCreationId, heritageRoles, ownerDraftKey, showToast])

  useEffect(() => {
    if (!user?.id || !ownerDraftKey || draftHydratedKey !== ownerDraftKey || photoMode !== 'heritage' || !file || !selectedHeritageRole) return
    const ownerId = user.id
    const timer = window.setTimeout(() => {
      if (readStoredUser()?.id !== ownerId) return
      void saveHeritageDraft(ownerId, {
        contextKey: draftContextKey, file, roleId: selectedHeritageRole.id,
        siteCode: stationContext?.siteCode ?? 'cu-chi', stationCode: stationContext?.stationCode,
        entrySource, placement: heritagePlacement, lowLight, savedAt: Date.now(),
      }).then(() => setDraftError(false)).catch(() => setDraftError(true))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [user?.id, ownerDraftKey, draftHydratedKey, photoMode, file, selectedHeritageRole, draftContextKey, stationContext, entrySource, heritagePlacement, lowLight])

  const submit = async () => {
    if ((photoMode === 'heritage' && !heritagePreview.ready) || (photoMode === 'original' && (!file || selectedLocked))) {
      if (photoMode === 'heritage' && file && !heritagePreview.ready) {
        showToast({ message: 'Hãy tạo ảnh hóa thân trước khi lưu.', type: 'info' })
      }
      return
    }
    setUploading(true)
    let pendingUploadFile: File | null = null
    try {
      const uploadFile = photoMode === 'heritage' ? await heritageStudioRef.current?.exportFullResolution() : file
      if (!uploadFile) throw new Error('heritage_export_unavailable')
      if (uploadFile.size > 8 * 1024 * 1024) {
        showToast({ message: 'Ảnh vượt quá 8MB. Vui lòng chọn ảnh nhỏ hơn.', type: 'error' })
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(uploadFile.type)) {
        showToast({ message: 'Chỉ hỗ trợ JPEG, PNG hoặc WebP.', type: 'error' })
        return
      }
      const enhanced = photoMode === 'heritage'
        ? uploadFile
        : await enhanceCapturedPhoto(uploadFile, lowLight).catch(() => uploadFile)
      const resized = photoMode === 'heritage' ? enhanced : await resizeImageForUpload(enhanced)
      pendingUploadFile = resized
      if (photoMode === 'heritage' && user?.id && file && selectedHeritageRole && readStoredUser()?.id === user.id) {
        await saveHeritageDraft(user.id, {
          contextKey: draftContextKey, file, roleId: selectedHeritageRole.id,
          siteCode: stationContext?.siteCode ?? 'cu-chi', stationCode: stationContext?.stationCode,
          entrySource, placement: heritagePlacement, lowLight, savedAt: Date.now(),
        }).catch(() => setDraftError(true))
      }
      const creation = await viralApi.uploadCreation({
        file: resized,
        frameId: photoMode === 'heritage' ? null : frameId || null,
        variant,
        kind: photoMode,
        siteCode: stationContext?.siteCode,
        stationCode: stationContext?.stationCode,
        roleId: photoMode === 'heritage' ? selectedHeritageRole?.id : undefined,
        era: photoMode === 'heritage' ? 1968 : undefined,
        source: entrySource,
      })
      emitEvent('export_created', {
        stationCode: stationContext?.stationCode,
        payload: { kind: photoMode, roleId: photoMode === 'heritage' ? selectedHeritageRole?.id : undefined, stationCode: stationContext?.stationCode },
      })
      const sharePath = `/share?${new URLSearchParams({
        creationId: creation.id,
        outputUrl: creation.outputUrl,
        kind: photoMode,
        variant,
        ...(photoMode === 'heritage' && selectedHeritageRole ? { role: selectedHeritageRole.id } : {}),
      })}`
      const contextualSharePath = stationContext ? appendStationContext(sharePath, stationContext) : sharePath
      let canUndo = false
      if (user?.id && file && readStoredUser()?.id === user.id) {
        try {
          await savePhotoFrameReturnDraft(user.id, creation.id, {
            file, mode: photoMode, frameId, variant, lowLight,
            roleId: selectedHeritageRole?.id ?? null, placement: heritagePlacement, savedAt: Date.now(),
          })
          canUndo = true
        } catch {
          showToast({ message: 'Ảnh đã lưu nhưng không thể giữ bản chỉnh sửa để hoàn tác.', type: 'info' })
        }
      }
      navigate(appendHeritageEntrySource(contextualSharePath, entrySource), { state: canUndo ? { freshCreationId: creation.id } : null })
      showToast({ message: 'Tạo ảnh thành công.', type: 'success' })
    } catch (e) {
      if (pendingUploadFile && isOfflineLikeError(e)) {
        if (!user?.id) {
          showToast({ message: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại để lưu ảnh.', type: 'error' })
          return
        }
        await queueHeritageUpload(user.id, pendingUploadFile, {
          frameId: photoMode === 'heritage' ? null : frameId || null,
          variant,
          kind: photoMode,
          siteCode: stationContext?.siteCode,
          stationCode: stationContext?.stationCode,
          roleId: photoMode === 'heritage' ? selectedHeritageRole?.id : undefined,
          era: photoMode === 'heritage' ? 1968 : undefined,
          source: entrySource,
        })
        showToast({ message: 'Đã lưu ảnh chờ đồng bộ khi có mạng.', type: 'info' })
        return
      }
      showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppLayout
      activeBorder="left"
      mobileBackTo={returnHref}
      mobileTitle={stationLabel ? `Ảnh · ${stationLabel}` : 'Ảnh kỷ niệm'}
    >
      <main className="heritage-shell photo-frame-workspace mt-14 grid min-w-0 flex-1 items-start gap-4 overflow-x-hidden bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 p-3 text-[#0F1B33] md:mt-0 md:p-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:gap-5">
        <section className="relative flex h-[46dvh] min-h-[260px] min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-[#0275FB]/20 bg-white px-3 pb-20 pt-5 shadow-[0_18px_48px_rgba(2,117,251,0.10)] lg:sticky lg:top-5 lg:h-[calc(100dvh-2.5rem)] lg:min-h-[620px] lg:px-5 lg:pb-24">
          <div className={`relative z-10 mx-auto max-h-full max-w-full overflow-hidden rounded-2xl border border-[#efcc7b]/45 bg-[#17120d] p-1.5 shadow-[0_28px_80px_rgba(0,0,0,0.48)] ${photoMode === 'heritage' || variant === 'story' ? 'aspect-[9/16] h-full w-auto' : 'aspect-square h-full w-auto'}`}>
            <FaceTransformCanvas placement={photoMode === 'heritage' && hasHeritagePreview ? heritagePlacement : null} template={selectedHeritageRole} onChange={setHeritagePlacement}>
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#0d1422]">
              {photoMode === 'heritage' && selectedHeritageRole ? (
                <>
                  {!hasHeritagePreview && <HeritageRoleArtwork template={selectedHeritageRole} eager showFaceGuide className="h-full w-full" />}
                  <canvas ref={heritageCanvasRef} width={540} height={960} aria-label="Xem trước ảnh hóa thân" className={`absolute inset-0 h-full w-full ${hasHeritagePreview ? 'opacity-100' : 'opacity-0'}`} />
                  {heritagePreview.error && <div role="alert" className="absolute inset-x-2 top-1/3 z-10 rounded-xl border border-red-300/50 bg-black/80 p-3 text-center text-sm font-semibold text-white">{heritagePreview.error}</div>}
                </>
              ) : previewUrl ? (
                <>
                  <img
                    alt="Ảnh kỷ niệm đang chỉnh"
                    src={previewUrl}
                    className="h-full w-full object-cover"
                    style={{ filter: buildPreviewFilter(lowLight) }}
                  />
                  {lowLight.tunnelGrade && (
                    <div className="pointer-events-none absolute inset-0" style={{ background: TUNNEL_VIGNETTE_CSS }} />
                  )}
                </>
              ) : (
                <label data-testid="photo-frame-empty-preview" className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-[#0275FB]/35 bg-[#F2F7FF] px-5 text-center text-[#0F1B33] transition-colors hover:bg-[#E8F1FF] focus-within:ring-2 focus-within:ring-[#0275FB]">
                  <MaterialIcon name="add_photo_alternate" className="text-5xl text-[#0275FB]" />
                  <span className="text-base font-bold">Chọn ảnh của bạn để bắt đầu</span>
                  <span className="text-sm text-[#425573]">Ảnh đã chọn sẽ hiện ở đây để bạn xem trước.</span>
                  <span className="rounded-xl bg-[#0275FB] px-4 py-2 text-sm font-bold text-white">Chọn ảnh từ thiết bị</span>
                  <input type="file" accept="image/*" aria-label="Chọn ảnh cho khung kỷ niệm" onChange={(event) => updatePortraitFile(event.target.files?.[0] ?? null)} className="sr-only" />
                </label>
              )}
            </div>
            </FaceTransformCanvas>
          </div>
          <div className="absolute bottom-[4.75rem] left-1/2 z-20 w-max max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-center text-xs font-bold text-white/85 backdrop-blur-md">
            {photoMode === 'heritage' ? 'Xem trước vai hóa thân · 1968' : 'Ảnh kỷ niệm tại trạm'}
          </div>
          <button onClick={submit} disabled={uploading || !(photoMode === 'heritage' ? heritagePreview.ready : file) || (photoMode === 'original' && selectedLocked)} className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-title-md text-on-primary disabled:opacity-60 lg:bottom-5 lg:left-5 lg:right-5">
            <MaterialIcon name="save_alt" />
            {uploading ? 'Đang upload...' : photoMode === 'heritage' ? 'Lưu ảnh hóa thân & Chia sẻ' : 'Lưu ảnh & Chia sẻ'}
          </button>
        </section>

        <aside className="flex w-full min-w-0 flex-col overflow-clip rounded-2xl border border-[#0275FB]/20 bg-white text-[#0F1B33] shadow-[0_18px_48px_rgba(2,117,251,0.10)] lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)]">
          <div className="p-lg border-b border-surface-variant">
            <Link to={returnHref} className="mb-3 hidden w-fit items-center gap-1 rounded-xl border border-outline-variant px-3 py-2 text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary md:inline-flex">
              <MaterialIcon name="arrow_back" className="text-lg" />
              {stationLabel ? `Về ${stationLabel}` : 'Về hành trình'}
            </Link>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{pageTitle}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">{photoMode === 'heritage' ? 'Chọn vai → chọn ảnh → căn chỉnh → lưu.' : 'Chụp hoặc chọn ảnh, điều chỉnh ánh sáng rồi lưu kỷ niệm tại trạm.'}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-xl">
            <div className="flex min-w-0 flex-col gap-md">
              <h3 className="font-title-md">Chế độ ảnh</h3>
              <div className="grid min-w-0 grid-cols-2 gap-sm" role="group" aria-label="Chọn chế độ ảnh">
                <button type="button" onClick={() => { setPhotoMode('original'); setHasHeritagePreview(false); setHeritagePreview({ ready: false, error: null }) }} className={`min-w-0 rounded-xl border p-sm font-bold ${photoMode === 'original' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'}`}>Ảnh gốc</button>
                <button type="button" disabled={!hasHeritageRoles} onClick={() => { setPhotoMode('heritage'); setVariant('story'); setHasHeritagePreview(false); setHeritagePreview({ ready: false, error: null }) }} className={`min-w-0 rounded-xl border p-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${photoMode === 'heritage' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-outline-variant'}`}>Hóa thân 1968</button>
              </div>
              {!hasHeritageRoles && <p className="text-xs text-on-surface-variant">Vai hóa thân của trạm đang được duyệt sử liệu. Ảnh gốc vẫn dùng bình thường.</p>}
            </div>
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
            {photoMode === 'heritage' && <HeritageStudioPanel
              studioRef={heritageStudioRef}
              canvasRef={heritageCanvasRef}
              file={file}
              siteCode={stationContext?.siteCode ?? 'cu-chi'}
              stationCode={heritageStationCode}
              reportStationCode={effectiveStation ?? undefined}
              selectedRole={selectedHeritageRole}
              placement={heritagePlacement}
              lowLight={lowLight}
              cameraLocked={cameraLocked}
              onPreviewStateChange={updateHeritagePreview}
              preservePlacementOnDetection={restoredPlacement}
              onPlacementChange={setHeritagePlacement}
              onFileChange={(next) => { setRestoredPlacement(false); updatePortraitFile(next) }}
              onRoleChange={(template) => {
                setRestoredPlacement(false)
                setSelectedHeritageRole(template)
                setHeritagePlacement(initialPlacement(null, template))
                setHasHeritagePreview(false)
                setHeritagePreview({ ready: false, error: null })
              }}
            />}
            {photoMode === 'heritage' && draftError && <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-on-surface">Bản nháp chưa được lưu trên thiết bị. Bạn vẫn có thể tiếp tục và lưu ảnh.</p>}
            {photoMode === 'original' && <OriginalPhotoPanel
              file={file}
              cameraLocked={cameraLocked}
              onFileChange={updatePortraitFile}
              reportStationCode={effectiveStation ?? undefined}
              framesLoading={framesLoading}
              frames={frames}
              frameId={frameId}
              onFrameChange={setFrameId}
              selectedLocked={selectedLocked}
              variant={variant}
              onVariantChange={setVariant}
            />}
            <div className="flex flex-col gap-md">
              <h3 className="font-title-md">Ánh sáng</h3>
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
          </div>
        </aside>
      </main>
    </AppLayout>
  )
}

