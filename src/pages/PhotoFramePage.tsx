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
import { LOCAL_PHOTO_FRAMES, isLocalPhotoFrame } from '../features/photo-flow/localPhotoFrames'
import { exportOriginalPhoto } from '../features/photo-flow/originalPhoto'
import { photoUploadError } from '../features/photo-flow/photoUpload'
import { resolveMediaUrl } from '../shared/config/env'
import {
    DEFAULT_LOW_LIGHT,
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
import { PhotoSharePanel } from '../features/photo-flow/PhotoSharePanel'
import { photoFlowPath, photoFlowStage } from '../features/photo-flow/photoFlow'
import '../features/profile/profile.css'
import '../features/photo-flow/photo-flow.css'
import '../features/photo-flow/photo-studio.css'
import type {
    HeritageStudioHandle,
    HeritagePreviewState,
} from '../features/heritage-studio/HeritageStudio'
import { HeritageStudioPanel } from '../features/heritage-studio/HeritageStudioPanel'
import { OriginalPhotoPanel } from '../features/heritage-studio/OriginalPhotoPanel'
import { HeritageRoleArtwork } from '../features/heritage-studio/HeritageRoleArtwork'
import { getPublishedRoleTemplates } from '../features/heritage-studio/roleTemplates'
import { FaceTransformCanvas } from '../features/heritage-studio/FaceTransformCanvas'
import {
    flushHeritageUploads,
    queueHeritageUpload,
} from '../lib/heritageUploadOutbox'
import { readStoredUser } from '../shared/auth/session'
import { isOfflineLikeError } from '../lib/offlineOutbox'
import { loadHeritageDraft, saveHeritageDraft } from '../lib/heritageStudioDraft'
import {
    loadPhotoFrameReturnDraft,
    savePhotoFrameReturnDraft,
} from '../lib/photoFrameReturnDraft'
import type { FacePlacement } from '../features/heritage-studio/facePlacement'
import { initialPlacement } from '../features/heritage-studio/facePlacement'
import type {
    HeritageStationCode,
    PublishedHeritageRoleTemplate,
} from '../features/heritage-studio/types'

const PHOTO_FLOW_THEME_CSS = `
  .photo-flow-workspace .ph-shell {
    font-family: 'Be Vietnam Pro', sans-serif;
    color: #0f1b33;
  }

  /* Thanh cuộn mảnh chuẩn thương hiệu */
  .photo-flow-workspace ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .photo-flow-workspace ::-webkit-scrollbar-track {
    background: transparent;
  }
  .photo-flow-workspace ::-webkit-scrollbar-thumb {
    background: rgba(2, 117, 251, 0.22);
    border-radius: 999px;
  }
  .photo-flow-workspace ::-webkit-scrollbar-thumb:hover {
    background: rgba(2, 117, 251, 0.45);
  }

  /* Thanh 3 bước tiến trình (.ph-steps) */
  .photo-flow-workspace .ph-steps {
    list-style: none;
    padding: 10px;
    margin: 0 0 24px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    border-radius: 24px;
    background: #ffffff;
    border: 2px solid rgba(2, 117, 251, 0.16);
    box-shadow: 0 14px 34px rgba(2, 117, 251, 0.06);
  }

  .photo-flow-workspace .ph-steps li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 16px;
    background: #f8fbff;
    border: 1.5px solid transparent;
    transition: all 0.2s ease;
  }

  .photo-flow-workspace .ph-steps li > span {
    width: 36px;
    height: 36px;
    min-width: 36px;
    flex-shrink: 0;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: Montserrat, sans-serif;
    font-size: 14px;
    font-weight: 900;
    background: #e2e8f0;
    color: #475569;
  }

  .photo-flow-workspace .ph-steps li strong {
    display: block;
    font-family: Montserrat, 'Be Vietnam Pro', sans-serif;
    font-size: 14px;
    font-weight: 900;
    color: #0f1b33;
    line-height: 1.25;
  }

  .photo-flow-workspace .ph-steps li small {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: #64748b;
    margin-top: 2px;
  }

  .photo-flow-workspace .ph-steps li.is-current {
    background: linear-gradient(135deg, #0353b8 0%, #0275fb 60%, #014296 100%);
    border-color: #fdc908;
    box-shadow: 0 10px 24px rgba(2, 117, 251, 0.24);
  }

  .photo-flow-workspace .ph-steps li.is-current > span {
    background: linear-gradient(135deg, #fff2c3 0%, #fdc908 100%);
    color: #0f1b33;
    border: 1.5px solid #ffffff;
  }

  .photo-flow-workspace .ph-steps li.is-current strong {
    color: #ffffff;
  }

  .photo-flow-workspace .ph-steps li.is-current small {
    color: #dbeafe;
  }

  .photo-flow-workspace .ph-steps li.is-done {
    background: #f0fdf4;
    border-color: #86efac;
  }

  .photo-flow-workspace .ph-steps li.is-done > span {
    background: #10b981;
    color: #ffffff;
  }

  @media (max-width: 760px) {
    .photo-flow-workspace .ph-steps {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
`

export function PhotoFramePage() {
    const { user } = useAuth()
    const [params] = useSearchParams(),
        location = useLocation(),
        navigate = useNavigate()
    const [reviewing, setReviewing] = useState(false)
    const stage = photoFlowStage(params)
    const activeStep =
        stage === 'create' ? (reviewing ? 1 : 0) : stage === 'review' ? 1 : 2
    const labels = ['Tạo ảnh', 'Xem lại & lưu', 'Tải & chia sẻ']

    return (
        <AppLayout
            hideTopNav
            mobileTitle="Ảnh & chia sẻ"
            className="profile-workspace photo-flow-workspace"
        >
            <style>{PHOTO_FLOW_THEME_CSS}</style>
            <div className="pf-main ph-shell">
                <header className="pf-page-heading">
                    <div>
                        <span className="pf-kicker">TIMELENS / XƯỞNG KHOẢNH KHẮC</span>
                        <h1>
                            Ảnh &amp; chia sẻ<span>.</span>
                        </h1>
                        <p>Một bức ảnh của bạn. Một câu chuyện di sản để kể.</p>
                    </div>
                    <Link className="pf-button secondary" to="/profile">
                        Ảnh đã lưu <MaterialIcon name="photo_library" />
                    </Link>
                </header>

                <ol
                    className="ph-steps"
                    aria-label="Tiến trình tạo và chia sẻ ảnh"
                >
                    {labels.map((label, index) => (
                        <li
                            key={label}
                            className={
                                index === activeStep
                                    ? 'is-current'
                                    : index < activeStep
                                        ? 'is-done'
                                        : ''
                            }
                            aria-current={index === activeStep ? 'step' : undefined}
                        >
              <span>
                {index < activeStep ? (
                    <MaterialIcon name="check" />
                ) : (
                    index + 1
                )}
              </span>
                            <div>
                                <strong>{label}</strong>
                                <small>
                                    {index === 0
                                        ? 'Ảnh gốc hoặc Heritage'
                                        : index === 1
                                            ? 'Kiểm tra thành phẩm'
                                            : 'Lưu giữ và lan tỏa'}
                                </small>
                            </div>
                        </li>
                    ))}
                </ol>

                {stage === 'create' ? (
                    <PhotoFrameEditor
                        key={user?.id ?? "guest"}
                        reviewing={reviewing}
                        onReviewChange={setReviewing}
                    />
                ) : (
                    <PhotoSharePanel
                        creationId={params.get('creationId') || ''}
                        stage={stage}
                        onContinue={() =>
                            navigate(photoFlowPath(params, 'share'), {
                                replace: true,
                                state: location.state,
                            })
                        }
                    />
                )}
            </div>
        </AppLayout>
    )
}

function PhotoFrameEditor({
                              reviewing,
                              onReviewChange,
                          }: {
    reviewing: boolean
    onReviewChange: (value: boolean) => void
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const undoReturnCreationId =
        typeof location.state?.undoReturnCreationId === 'string'
            ? (location.state.undoReturnCreationId as string)
            : null
    const stationContext = useMemo(
        () => readStationRouteContext(searchParams),
        [searchParams],
    )
    const entrySource = readHeritageEntrySource(searchParams.get('source'))
    const requestedMode = searchParams.get('mode')
    const legacyStationHeritageEntry =
        requestedMode === null &&
        stationContext?.siteCode === 'cu-chi' &&
        /^ST0[1-6]$/.test(stationContext.stationCode)
    const heritageEntry =
        requestedMode === 'heritage' ||
        (requestedMode !== 'original' &&
            (Boolean(searchParams.get('role')) ||
                (entrySource === 'time-portal-3d' && Boolean(stationContext)) ||
                legacyStationHeritageEntry))
    const { user } = useAuth()
    const premium = hasPremiumAccess(user)
    const activeStation = getActiveStationCode()
    const effectiveStation = stationContext?.stationCode ?? activeStation
    const cameraLocked = isCameraLockedForStation(effectiveStation)
    const [frames, setFrames] = useState<PhotoFrame[]>([])
    const [frameId, setFrameId] = useState('')
    const [originalOptions, setOriginalOptions] = useState({ zoom: 1, offsetX: 0, offsetY: 0, removeBackground: false })
    const photoDrag = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
    const [variant, setVariant] = useState<'square' | 'story'>(() =>
        heritageEntry ? 'story' : 'square',
    )
    const [file, setFile] = useState<File | null>(null)
    const [queued, setQueued] = useState(false)
    const [photoMode, setPhotoMode] = useState<'original' | 'heritage'>(() =>
        heritageEntry ? 'heritage' : 'original',
    )
    const [heritagePreview, setHeritagePreview] = useState<HeritagePreviewState>({
        ready: false,
        error: null,
    })
    const [hasHeritagePreview, setHasHeritagePreview] = useState(false)
    const heritageCanvasRef = useRef<HTMLCanvasElement>(null)
    const heritageStudioRef = useRef<HeritageStudioHandle>(null)
    const updateHeritagePreview = useCallback((state: HeritagePreviewState) => {
        setHeritagePreview(state)
        setHasHeritagePreview(state.ready)
    }, [])
    const [photoInputError, setPhotoInputError] = useState('')
    const [draggingPhoto, setDraggingPhoto] = useState(false)
    const updatePortraitFile = useCallback((next: File | null) => {
        if (!next) return
        const error = photoUploadError(next)
        if (error) { setPhotoInputError(error); return }
        setPhotoInputError('')
        setFile(next)
        setOriginalOptions({ zoom: 1, offsetX: 0, offsetY: 0, removeBackground: false })
        setQueued(false)
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
            .then(items => setFrames([...LOCAL_PHOTO_FRAMES, ...items]))
            .catch(() => setFrames([...LOCAL_PHOTO_FRAMES]))
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
            emitEvent('camera_opened', {
                stationCode: effectiveStation ?? undefined,
                payload: { page: 'photo_frame' },
            })
        }
    }, [cameraLocked, effectiveStation])

    const selectedFrame = useMemo(
        () => frames.find((f) => f.id === frameId),
        [frames, frameId],
    )
    const selectedLocked = selectedFrame?.requiresPremium && !premium
    const heritageStationCode =
        stationContext && /^ST0[1-6]$/.test(stationContext.stationCode)
            ? (stationContext.stationCode as HeritageStationCode)
            : undefined
    const heritageRoles = useMemo(
        () =>
            getPublishedRoleTemplates(
                stationContext?.siteCode ?? 'cu-chi',
                heritageStationCode,
            ),
        [heritageStationCode, stationContext?.siteCode],
    )
    const hasHeritageRoles = heritageRoles.length > 0
    const initialHeritageRoleId = searchParams.get('role')
    const [selectedHeritageRole, setSelectedHeritageRole] =
        useState<PublishedHeritageRoleTemplate | null>(null)
    const [heritagePlacement, setHeritagePlacement] =
        useState<FacePlacement | null>(null)
    const draftContextKey = `${stationContext?.siteCode ?? 'cu-chi'}:${
        stationContext?.stationCode ?? 'standalone'
    }:${entrySource ?? 'direct'}`
    const ownerDraftKey = user?.id ? `${user.id}:${draftContextKey}` : null
    const [originalPhoto, setOriginalPhoto] = useState<File | null>(null)
    const [originalError, setOriginalError] = useState('')

    useEffect(() => {
        let active = true
        setOriginalPhoto(null)
        setOriginalError('')
        if (photoMode !== 'original' || !file) return
        if (frameId && (!selectedFrame || !selectedFrame.imageUrl?.trim())) {
            setOriginalError('Khung ảnh không còn khả dụng. Hãy chọn lại khung.')
            return
        }
        void exportOriginalPhoto(
            file,
            variant,
            lowLight,
            selectedFrame ? (isLocalPhotoFrame(selectedFrame.id) ? selectedFrame.imageUrl : resolveMediaUrl(selectedFrame.imageUrl)) : undefined,
            originalOptions,
        )
            .then((output) => {
                if (active) setOriginalPhoto(output)
            })
            .catch((error) => {
                if (active)
                    setOriginalError(
                        error instanceof Error
                            ? error.message
                            : 'Chưa tạo được ảnh thành phẩm.',
                    )
            })
        return () => {
            active = false
        }
    }, [file, photoMode, variant, lowLight, selectedFrame, frameId, originalOptions])

    const previewFile = photoMode === 'original' ? originalPhoto : null
    const previewUrl = useMemo(
        () => (previewFile ? URL.createObjectURL(previewFile) : null),
        [previewFile],
    )
    const stationLabel = stationContext
        ? `${stationContext.stationCode}${stationName ? ` · ${stationName}` : ''}`
        : null
    const pageTitle =
        photoMode === 'heritage'
            ? `Hóa thân 1968${stationLabel ? ` · ${stationLabel}` : ''}`
            : stationLabel
                ? `Ảnh kỷ niệm · ${stationLabel}`
                : 'Ảnh kỷ niệm'
    const returnHref = stationContext
        ? buildStationPagePath(stationContext)
        : searchParams.get('returnTo') || '/profile'

    useEffect(
        () => () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        },
        [previewUrl],
    )

    useEffect(() => {
        if (heritageEntry && hasHeritageRoles) {
            setPhotoMode('heritage')
            setVariant('story')
        }
    }, [hasHeritageRoles, heritageEntry])

    useEffect(() => {
        const next =
            heritageRoles.find((role) => role.id === initialHeritageRoleId) ?? null
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
        void loadHeritageDraft(user.id, draftContextKey)
            .then((draft) => {
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
            })
            .catch(() => {
                if (!cancelled) setDraftError(true)
            })
            .finally(() => {
                if (!cancelled) setDraftHydratedKey(ownerDraftKey)
            })
        return () => {
            cancelled = true
        }
    }, [
        ownerDraftKey,
        user?.id,
        draftContextKey,
        heritageRoles,
        undoReturnCreationId,
        requestedMode,
    ])

    useEffect(() => {
        if (!user?.id || !undoReturnCreationId) return
        let cancelled = false
        void loadPhotoFrameReturnDraft(user.id, undoReturnCreationId)
            .then((draft) => {
                if (cancelled) return
                if (!draft) {
                    showToast({
                        message: 'Không còn bản chỉnh sửa. Hãy chọn ảnh lại.',
                        type: 'info',
                    })
                    return
                }
                const role = draft.roleId
                    ? heritageRoles.find((item) => item.id === draft.roleId) ?? null
                    : null
                setPhotoMode(draft.mode === 'heritage' && role ? 'heritage' : 'original')
                setFile(draft.file)
                setFrameId(draft.frameId)
                setOriginalOptions(draft.originalOptions ?? { zoom: 1, offsetX: 0, offsetY: 0, removeBackground: false })
                setVariant(draft.variant)
                setLowLight(draft.lowLight)
                setSelectedHeritageRole(role)
                setHeritagePlacement(draft.placement)
                setRestoredPlacement(Boolean(draft.placement))
                setHasHeritagePreview(false)
                setHeritagePreview({ ready: false, error: null })
                setDraftHydratedKey(ownerDraftKey)
                showToast({
                    message: 'Đã khôi phục bản chỉnh sửa. Ảnh đã lưu được giữ nguyên.',
                    type: 'success',
                })
            })
            .catch(() => {
                if (!cancelled)
                    showToast({
                        message: 'Không thể khôi phục bản chỉnh sửa. Hãy chọn ảnh lại.',
                        type: 'error',
                    })
            })
        return () => {
            cancelled = true
        }
    }, [user?.id, undoReturnCreationId, heritageRoles, ownerDraftKey, showToast])

    useEffect(() => {
        if (
            !user?.id ||
            !ownerDraftKey ||
            draftHydratedKey !== ownerDraftKey ||
            photoMode !== 'heritage' ||
            !file ||
            !selectedHeritageRole
        )
            return
        const ownerId = user.id
        const timer = window.setTimeout(() => {
            if (readStoredUser()?.id !== ownerId) return
            void saveHeritageDraft(ownerId, {
                contextKey: draftContextKey,
                file,
                roleId: selectedHeritageRole.id,
                siteCode: stationContext?.siteCode ?? 'cu-chi',
                stationCode: stationContext?.stationCode,
                entrySource,
                placement: heritagePlacement,
                lowLight,
                savedAt: Date.now(),
            })
                .then(() => setDraftError(false))
                .catch(() => setDraftError(true))
        }, 350)
        return () => window.clearTimeout(timer)
    }, [
        user?.id,
        ownerDraftKey,
        draftHydratedKey,
        photoMode,
        file,
        selectedHeritageRole,
        draftContextKey,
        stationContext,
        entrySource,
        heritagePlacement,
        lowLight,
    ])

    const submit = async () => {
        if (
            (photoMode === 'heritage' && !heritagePreview.ready) ||
            (photoMode === 'original' && (!originalPhoto || selectedLocked))
        ) {
            if (photoMode === 'heritage' && file && !heritagePreview.ready) {
                showToast({
                    message: 'Hãy tạo ảnh hóa thân trước khi lưu.',
                    type: 'info',
                })
            }
            return
        }
        const submitOwner = user?.id
        const assertSubmitOwner = () => {
            if (!submitOwner || readStoredUser()?.id !== submitOwner) throw new Error('Phiên tài khoản đã thay đổi. Vui lòng mở lại trình chỉnh ảnh.')
        }
        setUploading(true)
        let pendingUploadFile: File | null = null
        try {
            assertSubmitOwner()
            const uploadFile =
                photoMode === 'heritage'
                    ? await heritageStudioRef.current?.exportFullResolution()
                    : originalPhoto
            if (!uploadFile) throw new Error('heritage_export_unavailable')
            if (uploadFile.size > 8 * 1024 * 1024) {
                showToast({
                    message: 'Ảnh vượt quá 8MB. Vui lòng chọn ảnh nhỏ hơn.',
                    type: 'error',
                })
                return
            }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(uploadFile.type)) {
                showToast({
                    message: 'Chỉ hỗ trợ JPEG, PNG hoặc WebP.',
                    type: 'error',
                })
                return
            }
            const resized = uploadFile
            pendingUploadFile = resized
            if (
                photoMode === 'heritage' &&
                user?.id &&
                file &&
                selectedHeritageRole &&
                readStoredUser()?.id === user.id
            ) {
                await saveHeritageDraft(user.id, {
                    contextKey: draftContextKey,
                    file,
                    roleId: selectedHeritageRole.id,
                    siteCode: stationContext?.siteCode ?? 'cu-chi',
                    stationCode: stationContext?.stationCode,
                    entrySource,
                    placement: heritagePlacement,
                    lowLight,
                    savedAt: Date.now(),
                }).catch(() => setDraftError(true))
            }
            assertSubmitOwner()
            const creation = await viralApi.uploadCreation({
                file: resized,
                frameId: photoMode === 'heritage' || isLocalPhotoFrame(frameId) ? null : frameId || null,
                variant,
                kind: photoMode,
                siteCode: stationContext?.siteCode,
                stationCode: stationContext?.stationCode,
                roleId: photoMode === 'heritage' ? selectedHeritageRole?.id : undefined,
                era: photoMode === 'heritage' ? 1968 : undefined,
                source: entrySource,
            })
            assertSubmitOwner()
            emitEvent('export_created', {
                stationCode: stationContext?.stationCode,
                payload: {
                    kind: photoMode,
                    roleId: photoMode === 'heritage' ? selectedHeritageRole?.id : undefined,
                    stationCode: stationContext?.stationCode,
                },
            })
            const sharePath = `/photo-frame?${new URLSearchParams({
                creationId: creation.id,
                step: 'share',
                kind: photoMode,
                variant,
                ...(photoMode === 'heritage' && selectedHeritageRole
                    ? { role: selectedHeritageRole.id }
                    : {}),
            })}`
            const contextualSharePath = stationContext
                ? appendStationContext(sharePath, stationContext)
                : sharePath
            let canUndo = false
            if (user?.id && file && readStoredUser()?.id === user.id) {
                try {
                    await savePhotoFrameReturnDraft(user.id, creation.id, {
                        file,
                        mode: photoMode,
                        frameId,
                        originalOptions,
                        variant,
                        lowLight,
                        roleId: selectedHeritageRole?.id ?? null,
                        placement: heritagePlacement,
                        savedAt: Date.now(),
                    })
                    canUndo = true
                } catch {
                    showToast({
                        message:
                            'Ảnh đã lưu nhưng không thể giữ bản chỉnh sửa để hoàn tác.',
                        type: 'info',
                    })
                }
            }
            assertSubmitOwner()
            onReviewChange(false)
            navigate(appendHeritageEntrySource(contextualSharePath, entrySource), {
                state: canUndo ? { freshCreationId: creation.id } : null,
            })
            showToast({ message: 'Tạo ảnh thành công.', type: 'success' })
        } catch (e) {
            if (pendingUploadFile && isOfflineLikeError(e) && submitOwner === readStoredUser()?.id) {
                if (!user?.id) {
                    showToast({
                        message:
                            'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại để lưu ảnh.',
                        type: 'error',
                    })
                    return
                }
                await queueHeritageUpload(user.id, pendingUploadFile, {
                    frameId: photoMode === 'heritage' || isLocalPhotoFrame(frameId) ? null : frameId || null,
                    variant,
                    kind: photoMode,
                    siteCode: stationContext?.siteCode,
                    stationCode: stationContext?.stationCode,
                    roleId: photoMode === 'heritage' ? selectedHeritageRole?.id : undefined,
                    era: photoMode === 'heritage' ? 1968 : undefined,
                    source: entrySource,
                })
                setQueued(true)
                showToast({
                    message: 'Đã lưu ảnh chờ đồng bộ khi có mạng.',
                    type: 'info',
                })
                return
            }
            showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' })
        } finally {
            setUploading(false)
        }
    }

    return (
        <main
            data-photo-stage={reviewing ? 'review' : 'create'}
            className="heritage-shell photo-frame-workspace grid min-w-0 flex-1 items-start gap-5 overflow-x-hidden rounded-[28px] bg-transparent p-0 text-[#0F1B33] lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:gap-6"
        >
            {/* =================================================================== */}
            {/* SÂN KHẤU XEM TRƯỚC ẢNH (PREVIEW STAGE)                              */}
            {/* =================================================================== */}
            <section
                data-dragging={draggingPhoto || undefined}
                onDragOver={(event) => { event.preventDefault(); if (!reviewing && !uploading && !queued) setDraggingPhoto(true) }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingPhoto(false) }}
                onDrop={(event) => { event.preventDefault(); setDraggingPhoto(false); if (!reviewing && !uploading && !queued) updatePortraitFile(event.dataTransfer.files[0] ?? null) }}
                className="ph-live-stage relative flex h-[50dvh] min-h-[340px] min-w-0 items-center justify-center overflow-hidden rounded-[28px] border-2 border-[#0275FB]/20 bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FF] px-4 pb-24 pt-6 shadow-[0_18px_48px_rgba(2,117,251,0.08)] lg:sticky lg:top-5 lg:h-[calc(100dvh-2.5rem)] lg:min-h-[640px] lg:px-6 lg:pb-24">
                <div className="ph-stage-heading"><span><MaterialIcon name="visibility" /> XEM TRƯỚC</span><span>{photoMode === 'heritage' || variant === 'story' ? 'Dọc · 9:16' : 'Vuông · 1:1'}</span></div>
                {draggingPhoto && <div className="ph-drop-overlay"><MaterialIcon name="add_photo_alternate" /><strong>Thả ảnh vào đây để bắt đầu</strong></div>}
                {photoInputError && <p className="ph-upload-error" role="alert">{photoInputError}</p>}
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07]"
                    aria-hidden="true"
                />

                <div
                    className={`relative z-10 mx-auto max-h-full max-w-full overflow-hidden rounded-[24px] border-[3px] border-[#FDC908] bg-[#07132C] p-1.5 shadow-[0_24px_60px_rgba(15,27,51,0.28)] ${
                        photoMode === 'heritage' || variant === 'story'
                            ? 'aspect-[9/16] h-full w-auto'
                            : 'aspect-square h-full w-auto'
                    }`}
                >
                    <FaceTransformCanvas
                        placement={
                            photoMode === 'heritage' && hasHeritagePreview
                                ? heritagePlacement
                                : null
                        }
                        template={selectedHeritageRole}
                        onChange={setHeritagePlacement}
                    >
                        <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-[#0d1422]"
                                    onPointerDown={event => {
                                        if (photoMode !== 'original' || !file) return
                                        event.currentTarget.setPointerCapture(event.pointerId)
                                        photoDrag.current = { x: event.clientX, y: event.clientY, offsetX: originalOptions.offsetX, offsetY: originalOptions.offsetY }
                                    }}
                                    onPointerMove={event => {
                                        const drag = photoDrag.current
                                        if (!drag) return
                                        const bounds = event.currentTarget.getBoundingClientRect()
                                        setOriginalOptions(value => ({ ...value, offsetX: Math.max(-1, Math.min(1, drag.offsetX + 2 * (event.clientX - drag.x) / bounds.width)), offsetY: Math.max(-1, Math.min(1, drag.offsetY + 2 * (event.clientY - drag.y) / bounds.height)) }))
                                    }}
                                    onPointerUp={() => { photoDrag.current = null }}
                                    onPointerCancel={() => { photoDrag.current = null }}>
                            {photoMode === 'heritage' && selectedHeritageRole ? (
                                <>
                                    {!hasHeritagePreview && (
                                        <HeritageRoleArtwork
                                            template={selectedHeritageRole}
                                            eager
                                            showFaceGuide
                                            className="h-full w-full"
                                        />
                                    )}
                                    <canvas
                                        ref={heritageCanvasRef}
                                        width={540}
                                        height={960}
                                        aria-label="Xem trước ảnh hóa thân"
                                        className={`absolute inset-0 h-full w-full ${
                                            hasHeritagePreview ? 'opacity-100' : 'opacity-0'
                                        }`}
                                    />
                                    {heritagePreview.error && (
                                        <div
                                            role="alert"
                                            className="absolute inset-x-3 top-1/3 z-10 rounded-2xl border border-red-300/60 bg-[#0F1B33]/90 p-3.5 text-center text-xs sm:text-sm font-bold text-white shadow-xl"
                                        >
                                            {heritagePreview.error}
                                        </div>
                                    )}
                                </>
                            ) : previewUrl ? (
                                <img
                                    alt="Ảnh kỷ niệm đang chỉnh"
                                    src={previewUrl}
                                    draggable={false}
                                    className="h-full w-full object-contain touch-none cursor-move"

                                />
                            ) : file && !originalError ? (
                                <div className="flex h-full items-center justify-center p-6 text-center font-bold text-white" role="status">{originalOptions.removeBackground ? 'Đang tách nền và lồng ảnh vào khung…' : 'Đang tạo ảnh xem trước…'}</div>
                            ) : (
                                <label
                                    data-testid="photo-frame-empty-preview"
                                    className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-[#0275FB]/35 bg-gradient-to-b from-[#F8FBFF] to-[#EAF3FF] px-4 py-6 text-center text-[#0F1B33] transition-all hover:border-[#0275FB] hover:bg-[#E4F0FF] focus-within:ring-2 focus-within:ring-[#0275FB]"
                                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#FDC908] bg-white text-[#0275FB] shadow-md">
                    <MaterialIcon
                        name="add_photo_alternate"
                        className="text-3xl text-[#0275FB]"
                    />
                  </span>
                                    <span className="text-sm sm:text-base font-black leading-snug text-[#0F1B33]">
                    Chọn ảnh của bạn để bắt đầu
                  </span>
                                    <span className="text-xs font-medium leading-relaxed text-[#475569] max-w-[220px]">
                    Chọn hoặc kéo thả ảnh vào đây. JPG, PNG, WebP · tối đa 20 MB.
                  </span>
                                    <span className="mt-1 inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/40 bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(2,117,251,0.3)] transition-transform hover:scale-[1.02]">
                    Chọn ảnh từ thiết bị
                  </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        aria-label="Chọn ảnh cho khung kỷ niệm"
                                        onChange={(event) =>
                                            updatePortraitFile(event.target.files?.[0] ?? null)
                                        }
                                        className="sr-only"
                                    />
                                </label>
                            )}
                        </div>
                    </FaceTransformCanvas>
                </div>

                {photoMode === 'original' && file && !originalPhoto && (
                    <p
                        role={originalError ? 'alert' : 'status'}
                        className="absolute inset-x-4 top-4 z-30 rounded-2xl border border-[#0275FB]/20 bg-white/95 p-3 text-center text-xs sm:text-sm font-bold text-[#0F1B33] shadow-lg backdrop-blur-md"
                    >
                        {originalError || 'Đang chuẩn bị ảnh thành phẩm…'}
                    </p>
                )}

                <div className="absolute bottom-[4.75rem] left-1/2 z-20 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full border border-[#FDC908]/75 bg-[#0F1B33]/85 px-3.5 py-1 text-center text-[11px] font-black uppercase tracking-wider text-[#FFF2C3] shadow-md backdrop-blur-md" role="status">
                    {photoMode === 'heritage'
                        ? '✦ Xem trước vai hóa thân · 1968'
                        : !file ? '✦ Chọn ảnh để mở bước xem lại' : '✦ Ảnh kỷ niệm của bạn'}
                </div>

                <button
                    type="button"
                    aria-label={queued ? 'Đã lưu chờ đồng bộ' : 'Xem lại ảnh'}
                    onClick={() => onReviewChange(true)}
                    style={{ display: reviewing ? 'none' : undefined }}
                    disabled={
                        uploading ||
                        queued ||
                        !(photoMode === 'heritage'
                            ? heritagePreview.ready
                            : originalPhoto) ||
                        (photoMode === 'original' && selectedLocked)
                    }
                    className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-center gap-2 rounded-2xl border-2 border-[#FDC908] bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_12px_28px_rgba(2,117,251,0.3)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 lg:bottom-4 lg:left-5 lg:right-5 cursor-pointer"
                >
                    <MaterialIcon name="save_alt" className="text-[#FDC908]" />
                    <span>{queued ? 'Đã lưu chờ đồng bộ' : 'Xem lại ảnh'}</span>
                </button>
            </section>

            {/* =================================================================== */}
            {/* BẢNG ĐIỀU KHIỂN CHỈNH SỬA (STUDIO CONTROL PANEL)                     */}
            {/* =================================================================== */}
            <aside
                style={{ display: reviewing ? 'none' : undefined }}
                className="flex w-full min-w-0 flex-col overflow-clip rounded-[28px] border-2 border-[#0275FB]/20 bg-white text-[#0F1B33] shadow-[0_18px_48px_rgba(2,117,251,0.08)] lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)]"
            >
                {/* Header Bảng điều khiển */}
                <div className="border-b border-slate-200/80 bg-gradient-to-r from-[#F2F7FF] via-white to-[#FFFBEB] p-5 sm:p-6">
                    <Link
                        to={returnHref}
                        className="mb-3 hidden w-fit items-center gap-1.5 rounded-full border border-[#0275FB]/25 bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#0275FB] shadow-2xs transition-all hover:border-[#0275FB] hover:bg-[#EAF3FF] md:inline-flex"
                    >
                        <MaterialIcon name="arrow_back" className="text-base" />
                        <span>{stationLabel ? `Về ${stationLabel}` : 'Về hành trình'}</span>
                    </Link>
                    <h2 className="font-['Montserrat'] text-xl sm:text-2xl font-black tracking-tight text-[#0F1B33]">
                        {pageTitle}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm font-medium text-[#475569]">
                        {photoMode === 'heritage'
                            ? 'Chọn vai → chọn ảnh → căn chỉnh → lưu.'
                            : 'Chụp hoặc chọn ảnh, điều chỉnh ánh sáng rồi lưu kỷ niệm tại trạm.'}
                    </p>
                </div>

                {/* Nội dung cuộn bên trong Bảng điều khiển */}
                <div className="ph-controls-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6" tabIndex={0} role="region" aria-label="Chọn ảnh và điều chỉnh ảnh">
                    {/* Chế độ ảnh */}
                    <div className="flex min-w-0 flex-col gap-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#0275FB]">
                            Chế độ ảnh
                        </h3>
                        <div
                            className="grid min-w-0 grid-cols-2 gap-2.5"
                            role="group"
                            aria-label="Chọn chế độ ảnh"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setPhotoMode('original')
                                    setHasHeritagePreview(false)
                                    setHeritagePreview({ ready: false, error: null })
                                }}
                                aria-pressed={photoMode === 'original'}
                                aria-label="Ảnh gốc"
                                className={`min-w-0 rounded-2xl border-2 px-4 py-3 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                    photoMode === 'original'
                                        ? 'border-[#0275FB] bg-[#EAF3FF] text-[#0275FB] shadow-xs'
                                        : 'border-slate-200 bg-[#F8FAFC] text-[#475569] hover:border-[#0275FB]/40 hover:bg-white'
                                }`}
                            >
                                <MaterialIcon name="photo_camera" className="ph-mode-icon" /> Ảnh gốc
                                <small className="ph-mode-hint">Giữ trọn khoảnh khắc</small>
                            </button>
                            <button
                                type="button"
                                disabled={!hasHeritageRoles}
                                aria-pressed={photoMode === 'heritage'}
                                aria-label="Hóa thân 1968"
                                onClick={() => {
                                    setPhotoMode('heritage')
                                    setVariant('story')
                                    setHasHeritagePreview(false)
                                    setHeritagePreview({ ready: false, error: null })
                                }}
                                className={`min-w-0 rounded-2xl border-2 px-4 py-3 text-xs sm:text-sm font-black transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                    photoMode === 'heritage'
                                        ? 'border-[#FDC908] bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] text-[#92400E] shadow-xs'
                                        : 'border-slate-200 bg-[#F8FAFC] text-[#475569] hover:border-[#FDC908] hover:bg-white'
                                }`}
                            >
                                <MaterialIcon name="auto_awesome" className="ph-mode-icon" /> Hóa thân 1968
                                <small className="ph-mode-hint">Thử một vai di sản</small>
                            </button>
                        </div>
                        {!hasHeritageRoles && (
                            <p className="text-xs font-medium text-slate-500">
                                Vai hóa thân của trạm đang được duyệt sử liệu. Ảnh gốc vẫn dùng
                                bình thường.
                            </p>
                        )}
                    </div>

                    {cameraLocked && (
                        <div
                            data-testid="camera-locked-banner"
                            className="rounded-2xl border-2 border-[#FDC908] bg-[#FFFBEB] p-4 text-xs sm:text-sm text-[#92400E]"
                        >
                            <p className="flex items-center gap-2 font-black text-[#0F1B33]">
                                <MaterialIcon
                                    name="warning"
                                    className="text-lg text-[#D97706]"
                                />{' '}
                                Camera tạm khóa tại trạm {effectiveStation}
                            </p>
                            <p className="mt-1 font-medium leading-relaxed text-[#78350F]">
                                Cất điện thoại khi đi trong hầm hẹp / khu tưởng niệm. Ưu tiên
                                nghe lời dẫn. Bạn vẫn có thể chọn ảnh từ thư viện (không selfie
                                lên server mặc định).
                            </p>
                        </div>
                    )}

                    {photoMode === 'heritage' && (
                        <HeritageStudioPanel
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
                            onFileChange={(next) => {
                                setRestoredPlacement(false)
                                updatePortraitFile(next)
                            }}
                            onRoleChange={(template) => {
                                setRestoredPlacement(false)
                                setSelectedHeritageRole(template)
                                setHeritagePlacement(initialPlacement(null, template))
                                setHasHeritagePreview(false)
                                setHeritagePreview({ ready: false, error: null })
                            }}
                        />
                    )}

                    {photoMode === 'heritage' && draftError && (
                        <p
                            role="alert"
                            className="rounded-2xl border border-[#FDC908] bg-[#FFFBEB] p-3.5 text-xs sm:text-sm font-semibold text-[#92400E]"
                        >
                            Bản nháp chưa được lưu trên thiết bị. Bạn vẫn có thể tiếp tục và
                            lưu ảnh.
                        </p>
                    )}

                    {photoMode === 'original' && (
                        <OriginalPhotoPanel
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
                            options={originalOptions}
                            onOptionsChange={setOriginalOptions}
                        />
                    )}

                    {/* Khối tinh chỉnh Ánh sáng */}
                    <div className="flex flex-col gap-3.5 rounded-2xl border border-[#0275FB]/15 bg-[#F8FBFF] p-4">
                        <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black uppercase tracking-wider text-[#0275FB]">
                            Ánh sáng
                        </h3><button type="button" className="ph-reset-light" onClick={() => setLowLight({ ...DEFAULT_LOW_LIGHT })}>Đặt lại</button></div>
                        <label className="flex flex-col gap-2 text-xs sm:text-sm font-semibold text-[#334155]">
              <span className="flex items-center justify-between">
                <span>Tăng sáng ảnh</span>
                <span className="rounded-full bg-[#EAF3FF] px-2.5 py-0.5 text-xs font-black text-[#0275FB]">
                  {Math.round(lowLight.boost * 100)}%
                </span>
              </span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round(lowLight.boost * 100)}
                                onChange={(e) =>
                                    setLowLight((s) => ({
                                        ...s,
                                        boost: Number(e.target.value) / 100,
                                    }))
                                }
                                aria-label="Tăng sáng"
                                className="h-2 w-full cursor-pointer accent-[#0275FB]"
                            />
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5 text-xs sm:text-sm font-bold text-[#0F1B33]">
                            <input
                                type="checkbox"
                                checked={lowLight.tunnelGrade}
                                onChange={(e) =>
                                    setLowLight((s) => ({ ...s, tunnelGrade: e.target.checked }))
                                }
                                className="h-4 w-4 rounded accent-[#0275FB]"
                            />
                            <span>Ánh sáng địa đạo (ấm, giảm bão hòa, tối viền)</span>
                        </label>
                    </div>
                </div>
            </aside>

            {/* =================================================================== */}
            {/* BƯỚC 2: KIỂM TRA THÀNH PHẨM TRƯỚC KHI LƯU                          */}
            {/* =================================================================== */}
            {reviewing && (
                <section className="pf-card ph-editor-review space-y-4">
                    <span className="pf-kicker">BƯỚC 2 / KIỂM TRA THÀNH PHẨM</span>
                    <h2>Xem lại trước khi lưu</h2>
                    <p>
                        Đây là ảnh sẽ được lưu vào tài khoản và dùng để chia sẻ. Bạn có thể
                        quay lại tinh chỉnh trước khi tiếp tục.
                    </p>
                    <div className="ph-review-facts flex items-start gap-3 rounded-2xl border border-[#0275FB]/20 bg-[#F2F7FF] p-4">
                        <MaterialIcon
                            name="verified_user"
                            className="text-xl text-[#0275FB] shrink-0"
                        />
                        <p className="!m-0 text-xs sm:text-sm font-semibold text-[#0F1B33]">
                            Chỉ ảnh thành phẩm được tải lên. Bản nháp chỉnh sửa được giữ riêng
                            trên trình duyệt của bạn.
                        </p>
                    </div>
                    <p className="pf-footnote">
                        {photoMode === 'heritage'
                            ? 'Ảnh nhập vai Heritage · Dọc 9:16'
                            : variant === 'square'
                                ? 'Ảnh kỷ niệm · Vuông 1:1'
                                : 'Ảnh kỷ niệm · Dọc 9:16'}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="button"
                            aria-label="Lưu ảnh & tiếp tục"
                            className="pf-button ph-primary"
                            disabled={uploading || queued}
                            onClick={() => void submit()}
                        >
                            {queued
                                ? 'Đã lưu chờ đồng bộ'
                                : uploading
                                    ? 'Đang lưu ảnh…'
                                    : 'Lưu ảnh & tiếp tục'}
                            <MaterialIcon name="arrow_forward" />
                        </button>
                        <button
                            type="button"
                            className="pf-button secondary ph-primary"
                            disabled={uploading}
                            onClick={() => onReviewChange(false)}
                        >
                            Tiếp tục chỉnh sửa
                        </button>
                    </div>
                    {queued && (
                        <p className="pf-notice" role="status">
                            Ảnh đang chờ đồng bộ khi kết nối trở lại. Bạn không cần lưu lại
                            lần nữa.
                        </p>
                    )}
                </section>
            )}
        </main>
    )
}
