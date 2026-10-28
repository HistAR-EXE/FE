// src/features/gamification/ArtifactViewerModal.tsx
// Khung xem hiện vật cho bước nhiệm vụ "xem hiện vật". Xem ≥ 3 giây thì ghi nhận bước.
// BE chỉ nhận khóa artifact: khi nó là bước "xem hiện vật" của một nhiệm vụ Online (DirectDiscoveryPolicy).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useAuth } from '../../shared/auth/useAuth'
import { useAppMode } from '../../shared/context/useAppMode'
import { useUserProgress } from '../../shared/context/UserProgressProvider'
import { SmartImage } from '../../shared/ui/SmartImage'
import { useToast } from '../../shared/ui/toast/useToast'
import { collectionApi, type Artifact } from '../collection/api'
import { recordDiscoveryEngagement } from './discoveryRouting'
import { notifyEngagementOutcome } from './handleEngagement'
import type { QuestV2Step } from './questsV2Api'

const VIEW_SECONDS = 3

type Props = {
    step: QuestV2Step
    locationId: string
    onClose: () => void
}

type RecordState = 'idle' | 'counting' | 'saving' | 'done' | 'failed'

export function ArtifactViewerModal({ step, locationId, onClose }: Props) {
    const { isAuthenticated } = useAuth()
    const { mode } = useAppMode()
    const online = mode === 'online'
    const { applyEngagement } = useUserProgress()
    const { showToast } = useToast()
    const [artifact, setArtifact] = useState<Artifact | null>(null)
    const [loading, setLoading] = useState(true)
    const [recordState, setRecordState] = useState<RecordState>(step.state === 'DONE' ? 'done' : 'idle')
    const [secondsLeft, setSecondsLeft] = useState(VIEW_SECONDS)
    const closeRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        collectionApi
            .catalog(locationId)
            .then((list) => {
                if (!cancelled) setArtifact(list.find((item) => item.unlockKey === step.key) ?? null)
            })
            .catch(() => {
                if (!cancelled) setArtifact(null)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [locationId, step.key])

    useEffect(() => {
        closeRef.current?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    // Đếm ngược khi khung đang mở và đã tải xong; xong thì ghi nhận một lần.
    useEffect(() => {
        if (loading || !artifact || !isAuthenticated || !online || recordState === 'done' || recordState === 'saving') return
        setRecordState('counting')
        let left = VIEW_SECONDS
        setSecondsLeft(left)
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return
            left -= 1
            setSecondsLeft(left)
            if (left > 0) return
            window.clearInterval(timer)
            setRecordState('saving')
            void recordDiscoveryEngagement({
                recordKey: step.key,
                locationId,
                source: 'artifact',
                onSuccess: (response) => {
                    setRecordState('done')
                    notifyEngagementOutcome(response, showToast, applyEngagement, { locationId })
                },
                onError: () => setRecordState('failed'),
            }).then((response) => {
                // null = đang ở chế độ offline hoặc chưa đăng nhập: không ghi được.
                if (response === null) setRecordState((current) => (current === 'saving' ? 'failed' : current))
            })
        }, 1000)
        return () => window.clearInterval(timer)
        // recordState cố ý không nằm trong deps: chỉ bắt đầu đếm một lần sau khi tải xong.
    }, [loading, artifact, isAuthenticated, online, locationId, step.key])

    const title = artifact?.name ?? step.title
    const image = artifact?.imageUrl || step.previewImage || undefined
    const credit = [artifact?.imageSource, artifact?.imageLicense].filter(Boolean).join(' · ')
    const story = artifact?.story?.trim() || ''
    const summary = (artifact?.description || step.objective || step.description || '').trim()
    // Nhiều hiện vật có mô tả là đoạn đầu (cắt ngắn) của câu chuyện → chỉ hiện câu chuyện.
    const summaryRepeatsStory = !!story && !!summary && story.startsWith(summary.replace(/…$/, '').trim().slice(0, 40))

    // Portal ra body để nằm trên thanh điều hướng di động và các lớp của AppLayout.
    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0F1B33]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`Hiện vật: ${title}`}
            onClick={onClose}
        >
            <div
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="relative aspect-[4/3] w-full shrink-0 bg-[#DCEBFF] sm:aspect-[16/10]">
                    {image ? (
                        <SmartImage src={image} fallback={step.previewImage ?? undefined} alt={title} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[#0275FB]">
                            <MaterialIcon name="museum" className="text-6xl" />
                        </div>
                    )}
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0F1B33] shadow-lg hover:bg-white"
                    >
                        <MaterialIcon name="close" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#0275FB]">
                        {artifact?.collectionName || 'Hiện vật'}
                    </p>
                    <h2 className="mt-1 text-2xl font-black leading-tight text-[#0F1B33]">{title}</h2>
                    {loading && <p className="mt-3 text-sm text-slate-500">Đang tải hiện vật…</p>}
                    {!loading && (
                        <>
                            {summary && !summaryRepeatsStory && <p className="mt-3 text-sm leading-relaxed text-slate-700">{summary}</p>}
                            {story && <p className="mt-3 text-sm leading-relaxed text-slate-700">{story}</p>}
                            {credit && <p className="mt-4 text-[11px] text-slate-400">Ảnh: {credit}</p>}
                        </>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-[#F2F7FF] px-5 py-3 sm:px-6">
                    {!loading && !artifact
                        ? <p role="alert" className="text-xs font-bold text-red-600">Không tải được hiện vật của bước này. Vui lòng thử lại sau.</p>
                        : <RecordStatus state={recordState} secondsLeft={secondsLeft} isAuthenticated={isAuthenticated} online={online} />}
                </div>
            </div>
        </div>,
        document.body,
    )
}

function RecordStatus({
    state,
    secondsLeft,
    isAuthenticated,
    online,
}: {
    state: RecordState
    secondsLeft: number
    isAuthenticated: boolean
    online: boolean
}) {
    if (!isAuthenticated) {
        return <p className="text-xs font-bold text-slate-500">Đăng nhập để bước này được tính vào nhiệm vụ.</p>
    }
    if (!online && state !== 'done') {
        return <p className="text-xs font-bold text-slate-500">Bạn đang ở chế độ Offline. Chuyển sang Online để bước này được tính.</p>
    }
    if (state === 'done') {
        return (
            <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
                <MaterialIcon name="check_circle" className="text-lg" /> Đã ghi nhận bước này
            </p>
        )
    }
    if (state === 'failed') {
        return <p className="text-xs font-bold text-red-600">Chưa ghi nhận được. Kiểm tra kết nối rồi mở lại hiện vật.</p>
    }
    return (
        <p className="flex items-center gap-2 text-xs font-bold text-[#0275FB]" aria-live="polite">
            <MaterialIcon name="hourglass_top" className="text-base" />
            {state === 'saving' ? 'Đang ghi nhận…' : `Xem thêm ${Math.max(secondsLeft, 0)} giây để ghi nhận bước`}
        </p>
    )
}
