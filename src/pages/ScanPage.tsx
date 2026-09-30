// src/pages/ScanPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ScanTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { gamificationApi, type CheckinResult } from '../features/gamification/api'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { appEnv } from '../shared/config/env'
import { demoApi } from '../features/demo/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { useAuth } from '../shared/auth/useAuth'
import { CU_CHI_LOCATION_ID, locationIdFromSiteCode, siteCodeFromLocationId } from '../shared/config/constants'
import { useVisitSessionForLocation, useVisitSession } from '../features/visit/VisitSessionProvider'
import { buildArUrl } from '../features/ar/arDeepLink'
import { saveSelectedLocationId } from '../features/chat/chatRoute'
import { parseStationQr, type ParsedStationQr } from '../lib/stationQr'
import { emitEvent } from '../lib/pilotEvents'
import { enqueueCheckin, isOfflineLikeError } from '../lib/offlineOutbox'
import type { CheckinRequestBody } from '../features/gamification/api'
import { StationNextSteps } from '../features/stations/StationNextSteps'
import { setActiveStationCode } from '../lib/stationSafety'

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i

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
        const byParam = url.searchParams.get('locationId') || url.searchParams.get('location') || url.searchParams.get('id')
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
    const [params] = useSearchParams()
    const targetLocationId = params.get('locationId') ?? ''
    const sessionLocationId = targetLocationId || CU_CHI_LOCATION_ID
    const activeSiteCode = siteCodeFromLocationId(sessionLocationId)
    useVisitSessionForLocation(sessionLocationId, isAuthenticated)
    const { getSessionId } = useVisitSession()
    const visitSessionId = getSessionId(sessionLocationId)

    const [qrCode, setQrCode] = useState(targetLocationId ? `timelens:location:${targetLocationId}` : '')
    const [result, setResult] = useState<CheckinResult | null>(null)
    const [lastStationCode, setLastStationCode] = useState<string | null>(null)
    const [geoError, setGeoError] = useState<string | null>(null)
    const [checking, setChecking] = useState(false)
    const [packGateDismissed, setPackGateDismissed] = useState(() => {
        try {
            return sessionStorage.getItem(packSkipKey(activeSiteCode)) === '1' || isPackLiteLoaded(activeSiteCode)
        } catch {
            return false
        }
    })
    const showPackGate = !packGateDismissed && !isPackLiteLoaded(activeSiteCode)

    // States Camera & AR
    const [cameraEnabled, setCameraEnabled] = useState(false)
    const [arMode, setArMode] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [historySearch, setHistorySearch] = useState('')
    const [scanHistory, setScanHistory] = useState<Array<{ id: string; label: string; time: string; payload: string }>>([])

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const decodeFrameRef = useRef<number | null>(null)
    const lastDecodedRef = useRef<string>('')
    const lastDecodedAtRef = useRef<number>(0)
    const autoCheckinTimerRef = useRef<number | null>(null)

    const { showToast } = useToast()
    const { applyEngagement } = useUserProgress()
    const parsedLocationId = useMemo(
        () => extractLocationIdFromQr(qrCode) || (parseStationQr(qrCode) ? targetLocationId || CU_CHI_LOCATION_ID : ''),
        [qrCode, targetLocationId],
    )

    const filteredHistory = useMemo(() => {
        const q = historySearch.trim().toLowerCase()
        if (!q) return scanHistory
        return scanHistory.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.payload.toLowerCase().includes(q))
    }, [scanHistory, historySearch])

    /** QR-first check-in: station QR proves presence; GPS is optional (best-effort, short timeout). */
    const performStationCheckin = useCallback(
        async (station: ParsedStationQr) => {
            const locationId =
                targetLocationId || locationIdFromSiteCode(station.siteCode) || CU_CHI_LOCATION_ID
            const site = station.siteCode || siteCodeFromLocationId(locationId)
            try {
                const packKey = `histar_pack_manifest_v1:${site}:lite`
                const skipped = sessionStorage.getItem(`histar_pack_skip:${site}`)
                if (!localStorage.getItem(packKey) && !localStorage.getItem('histar_pack_manifest_v1:lite') && !skipped) {
                    const goPack = window.confirm(
                        'Chưa tải gói Lite offline. Mở trang Chuẩn bị hành trang trước khi vào trạm? (Hủy = bỏ qua lần này)',
                    )
                    if (goPack) {
                        window.location.href = `/pack-prep?site=${encodeURIComponent(site)}`
                        return
                    }
                    sessionStorage.setItem(`histar_pack_skip:${site}`, '1')
                }
            } catch {
                /* ignore */
            }
            const clientUuid = crypto.randomUUID()
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
                ...(position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : {}),
            }

            const queueOffline = async () => {
                await enqueueCheckin(station.stationCode, { clientUuid, payload: { ...body } })
                emitEvent('checkin_result', {
                    stationCode: station.stationCode,
                    payload: { ok: false, queuedOffline: true, clientUuid },
                })
                showToast({
                    message: 'Đang offline — đã lưu check-in, sẽ tự gửi khi có mạng.',
                    type: 'success',
                })
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
                    const n = Number(sessionStorage.getItem('histar_stations_completed_count') || '0')
                    sessionStorage.setItem('histar_stations_completed_count', String(n + 1))
                } catch {
                    /* ignore */
                }
                emitEvent('checkin_result', {
                    stationCode: station.stationCode,
                    payload: { ok: true, clientUuid, method: 'QR', gps: Boolean(position) },
                })
                void analyticsApi.recordEvent({
                    locationId,
                    visitSessionId,
                    eventType: 'CHECKIN_SUCCESS',
                    eventKey: station.stationCode,
                    source: 'scan',
                })
                setScanHistory((prev) => [
                    {
                        id: station.stationCode,
                        label: `Trạm ${station.stationCode}`,
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        payload: station.payload,
                    },
                    ...prev.filter((x) => x.payload !== station.payload).slice(0, 9),
                ])
            } catch (e) {
                if (isOfflineLikeError(e)) {
                    await queueOffline()
                    return
                }
                emitEvent('checkin_result', {
                    stationCode: station.stationCode,
                    payload: { ok: false, clientUuid, message: e instanceof Error ? e.message : 'error' },
                })
                throw e
            }
        },
        [targetLocationId, showToast, applyEngagement, visitSessionId],
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
                    showToast({ message: 'Mã chưa hợp lệ. Hãy quét mã hoặc chọn di tích.', type: 'error' })
                    return
                }
                const normalizedQr = normalizeQrPayload(payload, locationId)
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
                }).catch(() => null)

                if (!position) {
                    setGeoError('Quét QR để check-in — bật GPS để xác minh vị trí tại di tích.')
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
                setScanHistory((prev) => [
                    {
                        id: locationId,
                        label: `Di tích ${locationId.slice(0, 6).toUpperCase()}`,
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        payload: normalizedQr,
                    },
                    ...prev.slice(0, 9),
                ])
            } catch (e) {
                showToast({ message: getFriendlyErrorMessage(e, 'checkin'), type: 'error' })
            } finally {
                setChecking(false)
            }
        },
        [showToast, applyEngagement, visitSessionId, performStationCheckin],
    )

    // Lắng nghe tín hiệu từ iFrame AR 3D
    useEffect(() => {
        const handleArMessage = (event: MessageEvent) => {
            if (event.data?.type === 'AR_TARGET_FOUND') {
                showToast({ message: 'Phát hiện hiện vật 3D! Cập nhật tiến trình lịch sử...', type: 'success' })
                performCheckin(`timelens:location:${CU_CHI_LOCATION_ID}`)
            }
        }
        window.addEventListener('message', handleArMessage)
        return () => window.removeEventListener('message', handleArMessage)
    }, [performCheckin, showToast])

    // Camera Scanner
    useEffect(() => {
        const startCamera = async () => {
            if (!cameraEnabled || arMode) return
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
                setCameraError('Không mở được camera. Hãy kiểm tra quyền camera trên trình duyệt.')
            }
        }
        startCamera()

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const decodeLoop = () => {
            if (!cameraEnabled || arMode || !videoRef.current || !ctx) return
            const video = videoRef.current
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                canvas.width = video.videoWidth || 1280
                canvas.height = video.videoHeight || 720
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const jsQrResult = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })

                if (jsQrResult?.data) {
                    const now = Date.now()
                    const samePayload = jsQrResult.data === lastDecodedRef.current
                    if (!samePayload || now - lastDecodedAtRef.current > 4000) {
                        lastDecodedRef.current = jsQrResult.data
                        lastDecodedAtRef.current = now
                        setQrCode(jsQrResult.data)
                        const stationQr = parseStationQr(jsQrResult.data)
                        const locationId = stationQr ? '' : extractLocationIdFromQr(jsQrResult.data)
                        if (stationQr) {
                            setQrCode(stationQr.payload)
                        } else if (locationId) {
                            const normalizedPayload = normalizeQrPayload(jsQrResult.data, locationId)
                            setScanHistory((prev) => [
                                {
                                    id: locationId,
                                    label: `Di tích ${locationId.slice(0, 6).toUpperCase()}`,
                                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                    payload: normalizedPayload,
                                },
                                ...prev.filter((x) => !(x.id === locationId && x.payload === normalizedPayload)).slice(0, 9),
                            ])
                            setQrCode(normalizedPayload)
                        }
                        showToast({ message: 'Đã nhận diện mã QR. Sẽ tự động check-in sau giây lát...', type: 'success' })
                        if (stationQr) {
                            if (autoCheckinTimerRef.current !== null) window.clearTimeout(autoCheckinTimerRef.current)
                            autoCheckinTimerRef.current = window.setTimeout(() => {
                                void performCheckin(stationQr.payload)
                            }, 600)
                        } else if (locationId) {
                            if (autoCheckinTimerRef.current !== null) window.clearTimeout(autoCheckinTimerRef.current)
                            autoCheckinTimerRef.current = window.setTimeout(() => {
                                void performCheckin(normalizeQrPayload(jsQrResult.data, locationId))
                            }, 1000)
                        }
                    }
                }
            }
            decodeFrameRef.current = window.requestAnimationFrame(decodeLoop)
        }

        if (cameraEnabled && !arMode) {
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
    }, [cameraEnabled, arMode, performCheckin, showToast])

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
            showToast({ message: getFriendlyErrorMessage(e, 'demoCheckin'), type: 'error' })
        }
    }

    const toggleCamera = () => {
        setArMode(false)
        setCameraEnabled((s) => !s)
    }

    const toggleArMode = () => {
        setCameraEnabled(false)
        setArMode((s) => !s)
    }

    return (
        <AppLayout activeBorder="right" topNav={<ScanTopNav />} mobileTitle="Quét mã">
            <main className="mt-14 md:mt-16 p-md md:p-lg max-w-6xl mx-auto w-full">
                {showPackGate && (
                    <div
                        data-testid="pack-soft-gate"
                        className="mb-md rounded-xl border border-[#fe951c]/40 bg-[#fe951c]/10 p-md flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#fdb438]">Tải gói Lite trước khi vào hầm?</p>
                            <p className="text-xs text-on-surface-variant mt-1">
                                Gói offline giúp media/FAQ vẫn mở khi sóng yếu. Bạn có thể bỏ qua một lần nếu đi cùng hướng dẫn viên.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <Link
                                to={`/pack-prep?site=${encodeURIComponent(activeSiteCode)}`}
                                className="px-3 py-2 rounded-lg bg-[#fe951c] text-black text-xs font-black uppercase"
                            >
                                Tải gói
                            </Link>
                            <button
                                type="button"
                                className="px-3 py-2 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant"
                                onClick={() => {
                                    try {
                                        sessionStorage.setItem(packSkipKey(activeSiteCode), '1')
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-md lg:gap-lg min-h-0 lg:min-h-[650px]">
                    <aside className="lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl flex flex-col">
                        <div className="p-lg border-b border-outline-variant">
                            <h2 className="font-headline-lg text-primary mb-xs">Nhập Mã Di Sản</h2>
                            <p className="text-sm text-on-surface-variant">Bạn có thể nhập mã tại điểm tham quan, quét QR hoặc sử dụng AR 3D để khám phá hiện vật.</p>
                        </div>
                        <div className="p-lg space-y-sm">
                            <label className="block text-xs text-on-surface-variant uppercase tracking-wider">Mã di tích</label>
                            <input
                                value={qrCode}
                                onChange={(e) => setQrCode(e.target.value)}
                                placeholder="QR trạm: ST01:<timestamp>:<sig> hoặc timelens:location:<uuid>"
                                className="w-full neo-input rounded-lg px-md py-sm"
                            />

                            <div className="grid grid-cols-2 gap-sm">
                                <button
                                    type="button"
                                    onClick={toggleCamera}
                                    className={`w-full px-md py-sm rounded-lg border ${cameraEnabled ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}
                                >
                                    {cameraEnabled ? 'Tắt QR' : 'Quét QR'}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleArMode}
                                    className={`w-full px-md py-sm rounded-lg border font-bold ${arMode ? 'bg-secondary text-background' : 'border-secondary text-secondary'}`}
                                >
                                    {arMode ? 'Đóng AR' : 'Quét AR 3D'}
                                </button>
                            </div>

                            <button onClick={submitCheckin} disabled={checking} className="w-full bg-primary text-on-primary px-md py-sm rounded-lg disabled:opacity-60 mt-1">
                                {checking ? 'Đang kiểm tra...' : 'Check-in ngay'}
                            </button>

                            {showDemoCheckin && (
                                <div className="space-y-1 mt-1">
                                    <span
                                        data-testid="demo-badge"
                                        className="inline-block text-[10px] font-bold uppercase tracking-wider text-secondary border border-secondary/40 rounded px-1.5 py-0.5"
                                    >
                                        Demo mode
                                    </span>
                                    <button
                                        type="button"
                                        data-testid="demo-checkin-btn"
                                        onClick={submitDemoCheckin}
                                        className="w-full border border-secondary text-secondary px-md py-sm rounded-lg"
                                    >
                                        Demo fallback
                                    </button>
                                </div>
                            )}
                            {geoError && <p className="text-xs text-error">{geoError}</p>}
                            {cameraError && <p className="text-xs text-error">{cameraError}</p>}
                        </div>

                        <div className="border-t border-outline-variant p-lg flex-1">
                            <div className="flex items-center justify-between mb-sm">
                                <h3 className="font-title-md">Lịch sử quét</h3>
                            </div>
                            <input
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                placeholder="Search nơi đã quét..."
                                className="w-full neo-input rounded-lg px-sm py-xs mb-sm"
                            />
                            <div className="space-y-xs">
                                {filteredHistory.map((item) => (
                                    <button
                                        key={`${item.id}-${item.time}-${item.payload}`}
                                        type="button"
                                        onClick={() => setQrCode(item.payload)}
                                        className="w-full text-left p-sm rounded-lg border border-outline-variant bg-surface-container-high flex items-center justify-between hover:border-secondary/50 transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm text-on-surface">{item.label}</p>
                                            <p className="text-xs text-on-surface-variant">{item.time} · {item.id.slice(0, 8)}</p>
                                        </div>
                                        <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <section className="lg:col-span-8 relative rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low min-h-[280px] aspect-[4/3] md:aspect-video lg:min-h-[620px] lg:aspect-auto">
                        {arMode ? (
                            <iframe src="/ar.html" className="absolute inset-0 w-full h-full border-none" allow="camera; gyroscope; accelerometer; xr-spatial-tracking" />
                        ) : cameraEnabled ? (
                            <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
                        ) : (
                            <img src={images.scanDrum} alt="Scan background" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        )}

                        {!arMode && (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-[72%] h-[52%] border-2 border-secondary/80 rounded-lg shadow-[0_0_30px_rgba(68,219,213,0.2)]" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-8 inline-flex items-center gap-2 px-md py-sm rounded-full bg-surface/80 border border-secondary/40">
                                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                    <span className="text-xs text-secondary">{cameraEnabled ? 'Đang quét tín hiệu QR...' : 'Bật camera hoặc AR để trải nghiệm'}</span>
                                </div>
                            </>
                        )}
                    </section>

                    {result && (
                        <div className="lg:col-span-12 p-lg border border-outline-variant rounded-xl bg-surface-container">
                            <h3 className="font-title-md mb-sm">Kết quả quét</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                                <div className="bg-surface-container-high rounded-lg p-sm border border-outline-variant">
                                    <p className="text-xs text-on-surface-variant">Khoảng cách</p>
                                    <p className="font-title-md">{result.distanceMeters.toFixed(1)}m</p>
                                </div>
                                <div className="bg-surface-container-high rounded-lg p-sm border border-outline-variant">
                                    <p className="text-xs text-on-surface-variant">Quest hoàn thành</p>
                                    <p className="font-title-md">{result.questsCompleted.length}</p>
                                </div>
                                <div className="bg-surface-container-high rounded-lg p-sm border border-outline-variant col-span-2">
                                    <p className="text-xs text-on-surface-variant">Badge mới</p>
                                    <p className="text-sm">{result.badgesEarned.map((b) => b.name).join(', ') || 'Không có'}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-md mt-sm items-center">
                                <Link to={`/secret/${parsedLocationId}`} className="inline-flex items-center gap-1 text-secondary underline">
                                    Xem Secret Story <MaterialIcon name="arrow_forward" className="text-sm" />
                                </Link>
                                {parsedLocationId === CU_CHI_LOCATION_ID && (
                                    <Link
                                        to={buildArUrl({ locationId: CU_CHI_LOCATION_ID, mode: 'live' })}
                                        className="inline-flex items-center gap-1 text-primary underline"
                                    >
                                        Mở AR Cổng thời gian <MaterialIcon name="view_in_ar" className="text-sm" />
                                    </Link>
                                )}
                            </div>
                            {lastStationCode && (
                                <div className="mt-md">
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
            </main>
        </AppLayout>
    )
}