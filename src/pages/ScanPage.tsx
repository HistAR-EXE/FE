// src/pages/ScanPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import '../features/ar/arExperience.css'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import {
    gamificationApi,
    type CheckinResult,
    type CheckinRequestBody,
} from '../features/gamification/api'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { appEnv } from '../shared/config/env'
import { demoApi } from '../features/demo/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { useAuth } from '../shared/auth/useAuth'
import {
    CU_CHI_LOCATION_ID,
    locationIdFromSiteCode,
    siteCodeFromLocationId,
} from '../shared/config/constants'
import {
    useVisitSessionForLocation,
    useVisitSession,
} from '../features/visit/VisitSessionProvider'
import { buildArUrl } from '../features/ar/arDeepLink'
import { saveSelectedLocationId } from '../features/chat/chatRoute'
import { parseStationQr, type ParsedStationQr } from '../lib/stationQr'
import { emitEvent } from '../lib/pilotEvents'
import { enqueueCheckin, flushOutbox, isOfflineLikeError, listPendingCheckins } from '../lib/offlineOutbox'
import { StationNextSteps } from '../features/stations/StationNextSteps'
import { setActiveStationCode } from '../lib/stationSafety'
import {
    mergeScanHistory,
    type CheckinHistoryItem,
    type PendingStationCheckin,
} from '../features/stations/scanHistory'
import { buildStationPagePath } from '../features/stations/stationRoutes'

const UUID_REGEX =
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i

function extractLocationIdFromQr(value: string): string {
    const raw = value.trim()
    if (!raw) return ''
    if (UUID_REGEX.test(raw) && raw.length === 36) return raw

    const lower = raw.toLowerCase()
    if (lower.startsWith('timelens:location:') || lower.startsWith('timelens:secret:')) {
        const id = raw.split(':').pop()?.trim() ?? ''
        return UUID_REGEX.test(id) ? id : ''
    }

    try {
        const url = new URL(raw)
        const byParam =
            url.searchParams.get('locationId') ||
            url.searchParams.get('location') ||
            url.searchParams.get('id')
        if (byParam && UUID_REGEX.test(byParam)) return byParam
        const byPath = url.pathname.match(UUID_REGEX)
        if (byPath?.[0]) return byPath[0]
    } catch {
        // Not an URL
    }

    const byRegex = raw.match(UUID_REGEX)
    return byRegex?.[0] ?? ''
}

function normalizeQrPayload(value: string, locationId: string): string {
    const raw = value.trim()
    if (!raw || !locationId) return raw
    const lower = raw.toLowerCase()
    if (lower.startsWith('timelens:secret:')) return `timelens:secret:${locationId}`
    return `timelens:location:${locationId}`
}

function packSkipKey(siteCode: string) {
    return `histar_pack_soft_gate_skipped:${siteCode.trim().toLowerCase()}`
}

function isPackLiteLoaded(siteCode: string): boolean {
    try {
        return (
            localStorage.getItem(`histar_pack_lite_loaded:${siteCode}`) === '1' ||
            localStorage.getItem('histar_pack_lite_loaded') === '1'
        )
    } catch {
        return false
    }
}

export function ScanPage() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const targetLocationId = params.get('locationId') ?? ''
    const sessionLocationId = targetLocationId || CU_CHI_LOCATION_ID
    const activeSiteCode = siteCodeFromLocationId(sessionLocationId)
    useVisitSessionForLocation(sessionLocationId, isAuthenticated)
    const { getSessionId } = useVisitSession()
    const visitSessionId = getSessionId(sessionLocationId)

    const [qrCode, setQrCode] = useState(
        targetLocationId ? `timelens:location:${targetLocationId}` : '',
    )
    const [result, setResult] = useState<CheckinResult | null>(null)
    const [lastStationCode, setLastStationCode] = useState<string | null>(null)
    const [geoError, setGeoError] = useState<string | null>(null)
    const [checking, setChecking] = useState(false)
    const [packGateDismissed, setPackGateDismissed] = useState(() => {
        try {
            return (
                sessionStorage.getItem(packSkipKey(activeSiteCode)) === '1' ||
                isPackLiteLoaded(activeSiteCode)
            )
        } catch {
            return false
        }
    })
    const showPackGate = !packGateDismissed && !isPackLiteLoaded(activeSiteCode)

    // States Camera & AR
    const [cameraEnabled, setCameraEnabled] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [historySearch, setHistorySearch] = useState('')
    const [savedHistory, setSavedHistory] = useState<CheckinHistoryItem[]>([])
    const [pendingHistory, setPendingHistory] = useState<PendingStationCheckin[]>([])
    const [recognizedCheckin, setRecognizedCheckin] = useState<PendingStationCheckin | null>(null)
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyError, setHistoryError] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const decodeFrameRef = useRef<number | null>(null)
    const lastDecodedRef = useRef<string>('')
    const lastDecodedAtRef = useRef<number>(0)
    const autoCheckinTimerRef = useRef<number | null>(null)

    const { showToast } = useToast()
    const { applyEngagement } = useUserProgress()
    const parsedLocationId = useMemo(
        () =>
            extractLocationIdFromQr(qrCode) ||
            (parseStationQr(qrCode) ? targetLocationId || CU_CHI_LOCATION_ID : ''),
        [qrCode, targetLocationId],
    )

    const scanHistory = useMemo(
        () => mergeScanHistory(savedHistory, pendingHistory, recognizedCheckin),
        [savedHistory, pendingHistory, recognizedCheckin],
    )

    const refreshHistory = useCallback(async () => {
        setHistoryLoading(true)
        setHistoryError(null)
        try {
            const pendingItems = await listPendingCheckins(sessionLocationId)
            setPendingHistory(
                pendingItems.flatMap((item) => {
                    try {
                        const payload = item.payload
                            ? (JSON.parse(item.payload) as {
                                  locationId?: string
                                  stationCode?: string
                              })
                            : null
                        if (!payload?.locationId || !payload.stationCode) return []
                        return [
                            {
                                clientUuid: item.clientUuid,
                                siteCode: siteCodeFromLocationId(payload.locationId),
                                stationCode: payload.stationCode,
                                locationId: payload.locationId,
                                occurredAt: item.occurredAt,
                            },
                        ]
                    } catch {
                        return []
                    }
                }),
            )
            if (isAuthenticated) {
                setSavedHistory(await gamificationApi.checkinHistory(sessionLocationId))
            } else {
                setSavedHistory([])
            }
        } catch (error) {
            setHistoryError(getFriendlyErrorMessage(error, 'checkin'))
        } finally {
            setHistoryLoading(false)
        }
    }, [isAuthenticated, sessionLocationId])

    useEffect(() => {
        const syncAndRefresh = async () => {
            if (isAuthenticated && typeof navigator !== 'undefined' && navigator.onLine) {
                await flushOutbox()
            }
            await refreshHistory()
        }
        void syncAndRefresh()
        const handleOnline = () => window.setTimeout(() => void syncAndRefresh(), 750)
        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [isAuthenticated, refreshHistory])

    const filteredHistory = useMemo(() => {
        const q = historySearch.trim().toLowerCase()
        if (!q) return scanHistory
        return scanHistory.filter(
            (item) =>
                item.stationName.toLowerCase().includes(q) ||
                item.stationCode.toLowerCase().includes(q),
        )
    }, [scanHistory, historySearch])

    /** QR-first check-in: station QR proves presence; GPS is optional (best-effort, short timeout). */
    const performStationCheckin = useCallback(
        async (station: ParsedStationQr) => {
            const locationId =
                targetLocationId ||
                locationIdFromSiteCode(station.siteCode) ||
                CU_CHI_LOCATION_ID
            const site = station.siteCode || siteCodeFromLocationId(locationId)
            const clientUuid = crypto.randomUUID()
            setRecognizedCheckin({
                clientUuid,
                siteCode: site,
                stationCode: station.stationCode,
                locationId,
                occurredAt: new Date().toISOString(),
            })
            emitEvent('station_arrived', {
                stationCode: station.stationCode,
                payload: { locationId, method: 'QR', siteCode: site },
            })
            setActiveStationCode(station.stationCode)
            setLastStationCode(station.stationCode)

            const position = await new Promise<GeolocationPosition | null>((resolve) => {
                if (!('geolocation' in navigator)) return resolve(null)
                navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
                    enableHighAccuracy: false,
                    timeout: 3000,
                    maximumAge: 60000,
                })
            })
            setGeoError(null)

            const body: CheckinRequestBody = {
                locationId,
                qrPayload: station.payload,
                stationCode: station.stationCode,
                presenceMethod: 'QR',
                clientUuid,
                ...(position
                    ? {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }
                    : {}),
            }

            const queueOffline = async () => {
                if (!station.staticQr) {
                    setRecognizedCheckin(null)
                    showToast({
                        message: 'Mã QR động cần kết nối mạng để xác nhận trước khi hết hạn. Hãy thử lại khi có mạng.',
                        type: 'error',
                    })
                    return
                }
                await enqueueCheckin(station.stationCode, {
                    clientUuid,
                    payload: { ...body },
                })
                emitEvent('checkin_result', {
                    stationCode: station.stationCode,
                    payload: { ok: false, queuedOffline: true, clientUuid },
                })
                showToast({
                    message: 'Đang offline — đã lưu check-in, sẽ tự gửi khi có mạng.',
                    type: 'success',
                })
                setRecognizedCheckin(null)
                await refreshHistory()
            }

            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                await queueOffline()
                return
            }

            try {
                const res = await gamificationApi.checkin(body)
                setResult(res)
                setQrCode(station.payload)
                saveSelectedLocationId(locationId)
                notifyEngagementOutcome(res, showToast, applyEngagement, {
                    locationId,
                    visitSessionId,
                    engagementKind: 'checkin',
                })
                emitEvent('station_completed', {
                    stationCode: station.stationCode,
                    payload: { locationId, clientUuid, gps: Boolean(position) },
                })
                try {
                    const n = Number(
                        sessionStorage.getItem('histar_stations_completed_count') || '0',
                    )
                    sessionStorage.setItem('histar_stations_completed_count', String(n + 1))
                } catch {
                    /* ignore */
                }
                emitEvent('checkin_result', {
                    stationCode: station.stationCode,
                    payload: {
                        ok: true,
                        clientUuid,
                        method: 'QR',
                        gps: Boolean(position),
                    },
                })
                void analyticsApi.recordEvent({
                    locationId,
                    visitSessionId,
                    eventType: 'CHECKIN_SUCCESS',
                    eventKey: station.stationCode,
                    source: 'scan',
                })
                setRecognizedCheckin(null)
                await refreshHistory()
            } catch (e) {
                if (isOfflineLikeError(e)) {
                    await queueOffline()
                    return
                }
                emitEvent('checkin_result', {
                    stationCode: station.stationCode,
                    payload: {
                        ok: false,
                        clientUuid,
                        message: e instanceof Error ? e.message : 'error',
                    },
                })
                setRecognizedCheckin(null)
                throw e
            }
        },
        [targetLocationId, showToast, applyEngagement, visitSessionId, refreshHistory],
    )

    const performCheckin = useCallback(
        async (payload: string) => {
            try {
                setChecking(true)
                const stationQr = parseStationQr(payload)
                if (stationQr) {
                    await performStationCheckin(stationQr)
                    return
                }
                const locationId = extractLocationIdFromQr(payload)
                if (!locationId) {
                    showToast({
                        message: 'Mã chưa hợp lệ. Hãy quét mã hoặc chọn di tích.',
                        type: 'error',
                    })
                    return
                }
                const normalizedQr = normalizeQrPayload(payload, locationId)
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                    })
                }).catch(() => null)

                if (!position) {
                    setGeoError(
                        'Quét QR để check-in — bật GPS để xác minh vị trí tại di tích.',
                    )
                    showToast({
                        message: 'Không lấy được vị trí. Hãy bật GPS và thử lại.',
                        type: 'error',
                    })
                    return
                }
                setGeoError(null)

                const res = await gamificationApi.checkin({
                    locationId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    qrCode: normalizedQr,
                })
                setResult(res)
                setQrCode(normalizedQr)
                saveSelectedLocationId(locationId)
                notifyEngagementOutcome(res, showToast, applyEngagement, {
                    locationId,
                    visitSessionId,
                    engagementKind: 'checkin',
                })
                void analyticsApi.recordEvent({
                    locationId,
                    visitSessionId,
                    eventType: 'CHECKIN_SUCCESS',
                    eventKey: locationId,
                    source: 'scan',
                })
            } catch (e) {
                showToast({
                    message: getFriendlyErrorMessage(e, 'checkin'),
                    type: 'error',
                })
            } finally {
                setChecking(false)
            }
        },
        [showToast, applyEngagement, visitSessionId, performStationCheckin],
    )

    // Camera Scanner
    useEffect(() => {
        const startCamera = async () => {
            if (!cameraEnabled) return
            try {
                setCameraError(null)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false,
                })
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play()
                }
            } catch {
                setCameraError(
                    'Không mở được camera. Hãy kiểm tra quyền camera trên trình duyệt.',
                )
            }
        }
        startCamera()

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const decodeLoop = () => {
            if (!cameraEnabled || !videoRef.current || !ctx) return
            const video = videoRef.current
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                canvas.width = video.videoWidth || 1280
                canvas.height = video.videoHeight || 720
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const jsQrResult = jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height,
                    { inversionAttempts: 'attemptBoth' },
                )

                if (jsQrResult?.data) {
                    const now = Date.now()
                    const samePayload = jsQrResult.data === lastDecodedRef.current
                    if (!samePayload || now - lastDecodedAtRef.current > 4000) {
                        lastDecodedRef.current = jsQrResult.data
                        lastDecodedAtRef.current = now
                        setQrCode(jsQrResult.data)
                        const stationQr = parseStationQr(jsQrResult.data)
                        const locationId = stationQr
                            ? ''
                            : extractLocationIdFromQr(jsQrResult.data)
                        if (stationQr) {
                            setQrCode(stationQr.payload)
                        } else if (locationId) {
                            const normalizedPayload = normalizeQrPayload(
                                jsQrResult.data,
                                locationId,
                            )
                            setQrCode(normalizedPayload)
                        }
                        showToast({
                            message:
                                'Đã nhận diện mã QR. Sẽ tự động check-in sau giây lát...',
                            type: 'success',
                        })
                        if (stationQr) {
                            if (autoCheckinTimerRef.current !== null)
                                window.clearTimeout(autoCheckinTimerRef.current)
                            autoCheckinTimerRef.current = window.setTimeout(() => {
                                void performCheckin(stationQr.payload)
                            }, 600)
                        } else if (locationId) {
                            if (autoCheckinTimerRef.current !== null)
                                window.clearTimeout(autoCheckinTimerRef.current)
                            autoCheckinTimerRef.current = window.setTimeout(() => {
                                void performCheckin(
                                    normalizeQrPayload(jsQrResult.data, locationId),
                                )
                            }, 1000)
                        }
                    }
                }
            }
            decodeFrameRef.current = window.requestAnimationFrame(decodeLoop)
        }

        if (cameraEnabled) {
            decodeFrameRef.current = window.requestAnimationFrame(decodeLoop)
        }

        return () => {
            if (decodeFrameRef.current !== null) {
                window.cancelAnimationFrame(decodeFrameRef.current)
                decodeFrameRef.current = null
            }
            if (autoCheckinTimerRef.current !== null) {
                window.clearTimeout(autoCheckinTimerRef.current)
                autoCheckinTimerRef.current = null
            }
            streamRef.current?.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }
    }, [cameraEnabled, performCheckin, showToast])

    const submitCheckin = () => performCheckin(qrCode)

    // Demo UI only when VITE_DEMO_ENABLED=true — forceDemo / localStorage cannot bypass prod with demo off.
    const showDemoCheckin = appEnv.demoEnabled

    const submitDemoCheckin = async () => {
        if (!showDemoCheckin) return
        const secret = appEnv.demoSecret || 'e2e-demo-secret'
        try {
            await demoApi.demoCheckin({ locationId: parsedLocationId }, secret)
            showToast({ message: 'Demo check-in thành công.', type: 'success' })
        } catch (e) {
            showToast({
                message: getFriendlyErrorMessage(e, 'demoCheckin'),
                type: 'error',
            })
        }
    }

    const toggleCamera = () => {
        setCameraEnabled((s) => !s)
    }

    return (
        <AppLayout
            activeBorder="right"
            className="onsite-scan-shell"
            mobileTitle="Quét trạm Củ Chi"
            mobileBackTo="/ar-experience?view=onsite"
            showCta={false}
        >
            <main className="tl-onsite-scan-page bg-[#f2f7ff] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-[#f2f7ff] to-[#FFFBEB]/60 min-h-screen w-full text-[#0F1B33] font-sans selection:bg-[#FDC908] selection:text-[#0F1B33] pb-24 pt-14 md:pt-0 relative overflow-x-hidden">
                <style>
                    {`
                    .onsite-scan-shell,
                    .onsite-scan-shell > div,
                    .tl-onsite-scan-page {
                        background-color: #f2f7ff !important;
                        color: #0F1B33 !important;
                        max-width: none !important;
                    }
                    .tl-onsite-scan-page {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                        padding-top: 0 !important;
                    }
                    @keyframes tlScanBeam {
                        0%, 100% { top: 12%; opacity: 0.35; }
                        50% { top: 86%; opacity: 1; }
                    }
                    .tl-scan-beam {
                        animation: tlScanBeam 2.8s ease-in-out infinite;
                    }
                    #tl-scan-history-list::-webkit-scrollbar {
                        width: 5px;
                    }
                    #tl-scan-history-list::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    #tl-scan-history-list::-webkit-scrollbar-thumb {
                        background: #CBD5E1;
                        border-radius: 999px;
                    }
                    `}
                </style>

                {/* ========================================================= */}
                {/* HERO BANNER: TRẠM QUÉT DI SẢN THỰC ĐỊA CỦ CHI              */}
                {/* ========================================================= */}
                <header className="relative overflow-hidden bg-gradient-to-br from-[#0353B8] via-[#0275FB] to-[#014296] border-b-4 border-[#FDC908] shadow-[0_18px_45px_rgba(2,117,251,0.25)] py-8 lg:py-10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] pointer-events-none" />
                    <div className="absolute -top-24 right-[10%] w-[420px] h-[420px] bg-[#FDC908]/25 rounded-full blur-[110px] pointer-events-none" />

                    <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 z-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-3.5 max-w-2xl">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                        to="/ar-experience?view=onsite"
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black tracking-wide transition-all backdrop-blur-md"
                                    >
                                        <MaterialIcon
                                            name="arrow_back"
                                            className="text-sm text-[#FDC908]"
                                        />
                                        <span>Trung tâm AR</span>
                                    </Link>

                                    <p className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F1B33]/40 border border-[#FDC908]/60 text-[11px] font-black uppercase tracking-[0.16em] text-[#FFF2C3] backdrop-blur-md">
                                        <span className="w-2 h-2 rounded-full bg-[#FDC908] ring-4 ring-[#FDC908]/25" />
                                        <span>HÀNH TRÌNH TẠI DI TÍCH</span>
                                    </p>
                                </div>

                                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                                    Quét trạm Củ Chi
                                </h1>

                                <p className="text-sm sm:text-base text-blue-50/95 font-medium leading-relaxed">
                                    Quét QR để xác nhận điểm đến và mở câu chuyện tại trạm.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                                <div className="bg-white/12 backdrop-blur-md border border-white/25 p-3.5 rounded-2xl text-left">
                                    <div className="flex items-center justify-between text-[#FFF2C3] text-[10px] font-black uppercase tracking-wider">
                                        <span>Khu di tích</span>
                                        <MaterialIcon
                                            name="place"
                                            className="text-base text-[#FDC908]"
                                        />
                                    </div>
                                    <strong className="block text-base sm:text-lg font-black text-white mt-1">
                                        Địa đạo Củ Chi
                                    </strong>
                                    <small className="text-[11px] text-blue-100/90 font-semibold block">
                                        Mã vùng: {activeSiteCode.toUpperCase()}
                                    </small>
                                </div>

                                <div className="bg-white/12 backdrop-blur-md border border-white/25 p-3.5 rounded-2xl text-left">
                                    <div className="flex items-center justify-between text-[#FFF2C3] text-[10px] font-black uppercase tracking-wider">
                                        <span>Máy quét QR</span>
                                        <MaterialIcon
                                            name="qr_code_scanner"
                                            className="text-base text-[#FDC908]"
                                        />
                                    </div>
                                    <strong className="block text-base sm:text-lg font-black text-white mt-1">
                                        {cameraEnabled ? 'Đang bật' : 'Sẵn sàng'}
                                    </strong>
                                    <small className="text-[11px] text-blue-100/90 font-semibold block">
                                        Tự động nhận diện
                                    </small>
                                </div>

                                <div className="col-span-2 sm:col-span-1 bg-white/12 backdrop-blur-md border border-white/25 p-3.5 rounded-2xl text-left">
                                    <div className="flex items-center justify-between text-[#FFF2C3] text-[10px] font-black uppercase tracking-wider">
                                        <span>Chế độ mạng</span>
                                        <MaterialIcon
                                            name="offline_pin"
                                            className="text-base text-[#FDC908]"
                                        />
                                    </div>
                                    <strong className="block text-base sm:text-lg font-black text-white mt-1">
                                        Hỗ trợ Offline
                                    </strong>
                                    <small className="text-[11px] text-blue-100/90 font-semibold block">
                                        Tự đồng bộ khi có sóng
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ========================================================= */}
                {/* KHÔNG GIAN NỘI DUNG CHÍNH                                  */}
                {/* ========================================================= */}
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6 relative z-10">
                    {/* THÔNG BÁO TẢI GÓI LITE OFFLINE (PACK SOFT GATE) */}
                    {showPackGate && (
                        <div
                            data-testid="pack-soft-gate"
                            className="rounded-[1.8rem] border-2 border-[#FDC908] bg-gradient-to-r from-[#FFFBEB] via-white to-[#EAF3FF] p-5 sm:p-6 shadow-[0_12px_30px_rgba(253,201,8,0.14)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <div className="flex items-start sm:items-center gap-4">
                                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FDC908] to-[#FFD93D] text-[#0F1B33] flex items-center justify-center shrink-0 shadow-md border border-white">
                                    <MaterialIcon
                                        name="download_for_offline"
                                        className="text-2xl text-[#0275FB]"
                                    />
                                </span>
                                <div>
                                    <p className="text-base font-black text-[#0F1B33]">
                                        Tùy chọn: tải gói Lite trước khi vào hầm
                                    </p>
                                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 leading-relaxed">
                                        Gói offline giúp media/FAQ vẫn mở khi sóng yếu; không bắt buộc để quét QR hoặc mở mini-game.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <Link
                                    to={`/pack-prep?site=${encodeURIComponent(activeSiteCode)}`}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 text-[#0F1B33] text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                                >
                                    Tải gói
                                </Link>
                                <button
                                    type="button"
                                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer transition-colors"
                                    onClick={() => {
                                        try {
                                            sessionStorage.setItem(
                                                packSkipKey(activeSiteCode),
                                                '1',
                                            )
                                        } catch {
                                            /* ignore */
                                        }
                                        setPackGateDismissed(true)
                                    }}
                                >
                                    Bỏ qua lần này
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LƯỚI 12 CỘT: BẢNG ĐIỀU KHIỂN MÃ DI SẢN (TRÁI) & BUỒNG QUÉT CAMERA (PHẢI) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                        {/* CỘT TRÁI (4 PHẦN): NHẬP MÃ DI SẢN & LỊCH SỬ QUÉT */}
                        <aside className="lg:col-span-4 bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between overflow-hidden">
                            <div>
                                <div className="p-6 sm:p-7 border-b border-slate-100 bg-gradient-to-b from-[#F8FBFF] to-white">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0275FB] flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#FDC908]" />
                                                <span>Xác thực điểm đến</span>
                                            </p>
                                            <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33] mt-1 tracking-tight">
                                                Nhập Mã Di Sản
                                            </h2>
                                        </div>
                                        <span className="w-11 h-11 rounded-2xl bg-[#EAF3FF] border border-[#0275FB]/20 text-[#0275FB] flex items-center justify-center shrink-0">
                                            <MaterialIcon name="qr_code_2" className="text-2xl" />
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2 leading-relaxed">
                                        Quét QR tại trạm hoặc nhập mã để xác nhận hành trình thực địa.
                                    </p>
                                </div>

                                <div className="p-6 sm:p-7 space-y-4">
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="station-qr-input"
                                            className="block text-[11px] font-black text-[#0275FB] uppercase tracking-wider"
                                        >
                                            Mã di tích
                                        </label>
                                        <input
                                            id="station-qr-input"
                                            value={qrCode}
                                            onChange={(e) => setQrCode(e.target.value)}
                                            placeholder="QR trạm: ST01:<timestamp>:<sig> hoặc timelens:location:<uuid>"
                                            className="w-full rounded-xl bg-[#F4F9FF] border-2 border-[#0275FB]/20 focus:border-[#0275FB] focus:bg-white px-4 py-3 text-xs sm:text-sm font-bold text-[#0F1B33] placeholder:text-slate-400 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={toggleCamera}
                                            className={`w-full px-4 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                                cameraEnabled
                                                    ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                                                    : 'bg-[#F2F7FF] hover:bg-[#EAF3FF] border-[#0275FB]/25 text-[#0275FB]'
                                            }`}
                                        >
                                            <MaterialIcon
                                                name={cameraEnabled ? 'videocam_off' : 'photo_camera'}
                                                className="text-base"
                                            />
                                            <span>{cameraEnabled ? 'Tắt QR' : 'Quét QR'}</span>
                                        </button>

                                        <Link
                                            to="/ar-experience"
                                            className="w-full px-4 py-3 rounded-xl bg-[#FFFBEB] hover:bg-[#FFF2C3] border-2 border-[#FDC908] text-[#0F1B33] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-center"
                                        >
                                            <MaterialIcon
                                                name="view_in_ar"
                                                className="text-base text-[#0275FB]"
                                            />
                                            <span>Khám phá AR</span>
                                        </Link>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={submitCheckin}
                                        disabled={checking}
                                        className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#0275FB] via-[#1A85FF] to-[#015CC8] hover:brightness-110 disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_10px_24px_rgba(2,117,251,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all"
                                    >
                                        <MaterialIcon
                                            name={checking ? 'sync' : 'verified'}
                                            className={`text-lg text-[#FDC908] ${
                                                checking ? 'animate-spin' : ''
                                            }`}
                                        />
                                        <span>
                                            {checking ? 'Đang kiểm tra...' : 'Check-in ngay'}
                                        </span>
                                    </button>

                                    {showDemoCheckin && (
                                        <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDC908] space-y-2">
                                            <span
                                                data-testid="demo-badge"
                                                className="inline-block text-[10px] font-black uppercase tracking-wider text-[#0F1B33] bg-[#FDC908] rounded-md px-2 py-0.5"
                                            >
                                                Demo mode
                                            </span>
                                            <button
                                                type="button"
                                                data-testid="demo-checkin-btn"
                                                onClick={submitDemoCheckin}
                                                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-amber-50 border border-[#FDC908] text-[#0275FB] text-xs font-black uppercase tracking-wider cursor-pointer transition-colors"
                                            >
                                                Demo fallback
                                            </button>
                                        </div>
                                    )}

                                    {geoError && (
                                        <div className="p-3.5 rounded-xl bg-amber-50 border border-[#FDC908] text-xs font-bold text-amber-900 flex items-start gap-2">
                                            <MaterialIcon
                                                name="location_off"
                                                className="text-base text-amber-600 shrink-0 mt-0.5"
                                            />
                                            <span>{geoError}</span>
                                        </div>
                                    )}

                                    {cameraError && (
                                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-start gap-2">
                                            <MaterialIcon
                                                name="error"
                                                className="text-base text-rose-600 shrink-0 mt-0.5"
                                            />
                                            <span>{cameraError}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lịch sử quét */}
                            <div className="border-t border-slate-100 p-6 sm:p-7 bg-[#F8FBFF] flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-black uppercase tracking-wider text-[#0F1B33] flex items-center gap-1.5">
                                        <MaterialIcon
                                            name="history"
                                            className="text-base text-[#0275FB]"
                                        />
                                        <span>Lịch sử quét</span>
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAF3FF] text-[#0275FB] text-[10px] font-black">
                                        {scanHistory.length} mục
                                    </span>
                                </div>

                                <input
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Search nơi đã quét..."
                                    className="w-full rounded-xl bg-white border border-slate-200 focus:border-[#0275FB] px-3.5 py-2 text-xs font-semibold text-[#0F1B33] placeholder:text-slate-400 outline-none mb-3"
                                />

                                {historyError && (
                                    <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                                        <p className="text-xs font-semibold text-rose-700">{historyError}</p>
                                        <button
                                            type="button"
                                            onClick={() => void refreshHistory()}
                                            className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-rose-700"
                                        >
                                            Thử lại
                                        </button>
                                    </div>
                                )}
                                {historyLoading ? (
                                    <div className="flex-1 rounded-2xl border border-slate-200 bg-white/70 p-4 text-center text-xs font-semibold text-slate-500">
                                        Đang tải lịch sử check-in...
                                    </div>
                                ) : filteredHistory.length > 0 ? (
                                    <div
                                        id="tl-scan-history-list"
                                        className="space-y-2 max-h-[210px] overflow-y-auto pr-1"
                                    >
                                        {filteredHistory.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => navigate(buildStationPagePath(item.context))}
                                                className="w-full text-left p-3 rounded-xl border border-slate-200/90 bg-white hover:border-[#0275FB] hover:bg-[#F2F7FF] flex items-center justify-between gap-2 transition-all cursor-pointer group"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs sm:text-sm font-black text-[#0F1B33] truncate group-hover:text-[#0275FB]">
                                                        {item.stationCode} · {item.stationName}
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                        {new Date(item.occurredAt).toLocaleString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                        })}
                                                    </p>
                                                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                                                        item.status === 'SUCCESS'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : item.status === 'PENDING_SYNC'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {item.status === 'SUCCESS'
                                                            ? 'Check-in thành công'
                                                            : item.status === 'PENDING_SYNC'
                                                              ? 'Đang chờ đồng bộ'
                                                              : 'Đã nhận diện QR'}
                                                    </span>
                                                </div>
                                                <MaterialIcon
                                                    name="chevron_right"
                                                    className="text-slate-400 group-hover:text-[#0275FB] shrink-0"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 flex flex-col items-center justify-center text-center">
                                        <MaterialIcon
                                            name="qr_code_scanner"
                                            className="text-2xl text-slate-300 mb-1"
                                        />
                                        <p className="text-xs font-semibold text-slate-400">
                                            Chưa có lịch sử check-in tại địa điểm này.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </aside>

                        {/* CỘT PHẢI (8 PHẦN): BUỒNG QUÉT TÍN HIỆU QR THỰC ĐỊA */}
                        <section className="lg:col-span-8 relative rounded-[2.2rem] overflow-hidden border-2 border-[#FDC908] bg-gradient-to-b from-[#07132C] via-[#0E224D] to-[#033980] shadow-[0_20px_50px_rgba(15,27,51,0.22)] min-h-[380px] lg:min-h-[640px] flex flex-col justify-between">
                            {cameraEnabled ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover opacity-85"
                                />
                            ) : (
                                <img
                                    src={images.scanDrum}
                                    alt="Scan background"
                                    className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity"
                                />
                            )}

                            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#07132C] via-transparent to-[#07132C]/75 pointer-events-none" />

                            <div className="relative z-10 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F1B33]/80 backdrop-blur-md border border-[#FDC908]/60 text-[11px] font-black uppercase tracking-wider text-[#FFF2C3]">
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            cameraEnabled
                                                ? 'bg-emerald-400 animate-ping'
                                                : 'bg-[#FDC908]'
                                        }`}
                                    />
                                    <span>TRẠM QUÉT QUANG HỌC TIMELENS</span>
                                </div>

                                <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold text-blue-100">
                                    Định dạng: QR Trạm Củ Chi & UUID Di tích
                                </span>
                            </div>

                            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                                <div className="relative w-full max-w-[360px] aspect-square rounded-3xl border-2 border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[0_0_50px_rgba(2,117,251,0.3)] flex flex-col items-center justify-center p-6 overflow-hidden">
                                    <div className="absolute top-3 left-3 w-9 h-9 border-t-4 border-l-4 border-[#FDC908] rounded-tl-xl pointer-events-none" />
                                    <div className="absolute top-3 right-3 w-9 h-9 border-t-4 border-r-4 border-[#FDC908] rounded-tr-xl pointer-events-none" />
                                    <div className="absolute bottom-3 left-3 w-9 h-9 border-b-4 border-l-4 border-[#FDC908] rounded-bl-xl pointer-events-none" />
                                    <div className="absolute bottom-3 right-3 w-9 h-9 border-b-4 border-r-4 border-[#FDC908] rounded-br-xl pointer-events-none" />

                                    {cameraEnabled && (
                                        <div className="tl-scan-beam absolute left-4 right-4 h-1 rounded-full bg-gradient-to-r from-transparent via-[#FDC908] to-transparent shadow-[0_0_18px_#FDC908] pointer-events-none" />
                                    )}

                                    {!cameraEnabled && (
                                        <div className="text-center space-y-4 max-w-[250px]">
                                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0275FB] to-[#042A6B] border-2 border-[#FDC908] text-[#FDC908] flex items-center justify-center mx-auto shadow-xl">
                                                <MaterialIcon
                                                    name="qr_code_scanner"
                                                    className="text-4xl"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-black text-white">
                                                    Sẵn sàng quét mã trạm
                                                </h3>
                                                <p className="text-xs font-medium text-blue-100/90 leading-relaxed">
                                                    Đưa bảng mã QR tại trạm di tích vào chính giữa khung ngắm để tự động check-in.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={toggleCamera}
                                                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 text-[#0F1B33] font-black text-xs uppercase tracking-wider shadow-[0_8px_22px_rgba(253,201,8,0.4)] inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                                            >
                                                <MaterialIcon
                                                    name="photo_camera"
                                                    className="text-base text-[#0275FB]"
                                                />
                                                <span>Mở camera quét ngay</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative z-10 p-5 sm:p-6 flex justify-center">
                                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#0F1B33]/90 backdrop-blur-md border-2 border-[#FDC908]/80 shadow-lg">
                                    <span
                                        className={`w-2.5 h-2.5 rounded-full ${
                                            cameraEnabled
                                                ? 'bg-emerald-400 animate-pulse'
                                                : 'bg-[#FDC908]'
                                        }`}
                                    />
                                    <span className="text-xs font-black text-[#FFF2C3] tracking-wide">
                                        {cameraEnabled
                                            ? 'Đang quét tín hiệu QR...'
                                            : 'Bật camera để quét QR tại trạm'}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* ===================================================== */}
                        {/* KHỐI KẾT QUẢ QUÉT & BƯỚC TIẾP THEO TẠI TRẠM           */}
                        {/* ===================================================== */}
                        {result && (
                            <div className="lg:col-span-12 bg-white border-2 border-[#FDC908] rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.1)] space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FDC908] to-[#FDB900] text-[#0F1B33] flex items-center justify-center shadow-md">
                                            <MaterialIcon
                                                name="verified"
                                                className="text-2xl text-[#0275FB]"
                                            />
                                        </span>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-wider text-[#0275FB]">
                                                Xác nhận điểm đến thành công
                                            </p>
                                            <h3 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                                                Kết quả quét
                                            </h3>
                                        </div>
                                    </div>

                                    {lastStationCode && (
                                        <span className="px-4 py-1.5 rounded-full bg-[#FFFBEB] border-2 border-[#FDC908] text-xs font-black text-[#0F1B33]">
                                            Trạm: {lastStationCode}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="rounded-2xl p-4 bg-[#F2F7FF] border border-[#0275FB]/20">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            Khoảng cách
                                        </p>
                                        <p className="text-2xl font-black text-[#0275FB] mt-1">
                                            {result.distanceMeters.toFixed(1)}m
                                        </p>
                                    </div>
                                    <div className="rounded-2xl p-4 bg-[#F2F7FF] border border-[#0275FB]/20">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            Quest hoàn thành
                                        </p>
                                        <p className="text-2xl font-black text-[#0275FB] mt-1">
                                            {result.questsCompleted.length}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl p-4 bg-[#FFFBEB] border border-[#FDC908] col-span-2">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-amber-900/75">
                                            Badge mới
                                        </p>
                                        <p className="text-base sm:text-lg font-black text-[#0F1B33] mt-1">
                                            {result.badgesEarned.map((b) => b.name).join(', ') ||
                                                'Không có'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 items-center pt-1">
                                    {parsedLocationId === CU_CHI_LOCATION_ID && (
                                        <Link
                                            to={buildArUrl({
                                                locationId: CU_CHI_LOCATION_ID,
                                                mode: 'live',
                                            })}
                                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FFFBEB] border-2 border-[#FDC908] text-[#0F1B33] text-xs font-black uppercase tracking-wider hover:bg-[#FFF2C3] transition-all"
                                        >
                                            <span>Khám phá hiện vật AR</span>
                                            <MaterialIcon
                                                name="view_in_ar"
                                                className="text-base text-[#0275FB]"
                                            />
                                        </Link>
                                    )}
                                </div>

                                {lastStationCode && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <StationNextSteps
                                            stationCode={lastStationCode}
                                            siteCode={siteCodeFromLocationId(sessionLocationId)}
                                            locationId={sessionLocationId}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </AppLayout>
    )
}
