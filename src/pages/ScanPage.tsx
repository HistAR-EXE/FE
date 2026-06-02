import { useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ScanTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { gamificationApi, type CheckinResult } from '../features/gamification/api'
import { appEnv } from '../shared/config/env'
import { demoApi } from '../features/demo/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

function parseQrPayload(value: string) {
  if (/^[0-9a-fA-F-]{36}$/.test(value)) return value
  const parts = value.split(':')
  return parts[2] ?? ''
}

export function ScanPage() {
  const [params] = useSearchParams()
  const targetLocationId = params.get('locationId') ?? ''
  const [qrCode, setQrCode] = useState(targetLocationId ? `timelens:location:${targetLocationId}` : '')
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [scanHistory, setScanHistory] = useState<Array<{ id: string; label: string; time: string; payload: string }>>([])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const decodeFrameRef = useRef<number | null>(null)
  const lastDecodedRef = useRef<string>('')
  const lastDecodedAtRef = useRef<number>(0)
  const { showToast } = useToast()
  const parsedLocationId = useMemo(() => parseQrPayload(qrCode), [qrCode])
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    if (!q) return scanHistory
    return scanHistory.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.payload.toLowerCase().includes(q))
  }, [scanHistory, historySearch])

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
        setCameraError('Không mở được camera. Hãy kiểm tra quyền camera trên trình duyệt.')
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
        const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
        if (result?.data) {
          const now = Date.now()
          const samePayload = result.data === lastDecodedRef.current
          if (!samePayload || now - lastDecodedAtRef.current > 4000) {
            lastDecodedRef.current = result.data
            lastDecodedAtRef.current = now
            setQrCode(result.data)
            const locationId = parseQrPayload(result.data)
            if (locationId) {
              setScanHistory((prev) => [
                {
                  id: locationId,
                  label: `Di tích ${locationId.slice(0, 6).toUpperCase()}`,
                  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  payload: result.data,
                },
                ...prev.filter((x) => !(x.id === locationId && x.payload === result.data)).slice(0, 9),
              ])
            }
            showToast({ message: 'Đã nhận diện QR từ camera.', type: 'success' })
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
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraEnabled, showToast])

  const submitCheckin = async () => {
    try {
      setChecking(true)
      const locationId = parseQrPayload(qrCode)
      if (!locationId) {
        showToast({ message: 'Thiếu locationId. Vui lòng mở check-in từ màn chi tiết địa điểm.', type: 'error' })
        return
      }
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      }).catch(() => null)
      if (!position) {
        setGeoError('Không lấy được GPS hiện tại. Hãy bật quyền vị trí và thử lại.')
        showToast({ message: 'Không lấy được GPS hiện tại.', type: 'error' })
        return
      }
      setGeoError(null)
      const res = await gamificationApi.checkin({
        locationId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        qrCode,
      })
      setResult(res)
      setScanHistory((prev) => [
        {
          id: locationId,
          label: `Di tích ${locationId.slice(0, 6).toUpperCase()}`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          payload: qrCode,
        },
        ...prev.slice(0, 9),
      ])
      showToast({ message: 'Check-in thành công.', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'checkin'), type: 'error' })
    } finally {
      setChecking(false)
    }
  }

  const submitDemoCheckin = async () => {
    if (!appEnv.demoEnabled || !appEnv.demoSecret) return
    try {
      await demoApi.demoCheckin({ locationId: parsedLocationId }, appEnv.demoSecret)
      showToast({ message: 'Demo check-in thành công.', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'demoCheckin'), type: 'error' })
    }
  }

  return (
    <AppLayout activeBorder="right" topNav={<ScanTopNav />}>
      <main className="mt-16 p-lg max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-lg min-h-[650px]">
          <aside className="lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl flex flex-col">
            <div className="p-lg border-b border-outline-variant">
              <h2 className="font-headline-lg text-primary mb-xs">Nhập Mã Di Sản</h2>
              <p className="text-sm text-on-surface-variant">Bạn có thể nhập mã tại điểm tham quan hoặc bật camera để quét mã tự động.</p>
              {!targetLocationId && <p className="mt-xs text-xs text-on-surface-variant">Mẹo: Vào từ trang Nhiệm vụ hoặc Chi tiết địa điểm để hệ thống điền sẵn mã nhanh hơn.</p>}
            </div>
            <div className="p-lg space-y-sm">
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider">Mã di tích</label>
              <input
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="VD: HUE-18 hoặc timelens:location:<ma-dia-diem>"
                className="w-full neo-input rounded-lg px-md py-sm"
              />
              <div className="grid grid-cols-2 gap-sm">
                <button
                  type="button"
                  onClick={() => setCameraEnabled((s) => !s)}
                  className={`w-full px-md py-sm rounded-lg border ${cameraEnabled ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}
                >
                  {cameraEnabled ? 'Tắt camera' : 'Bật camera'}
                </button>
                <button onClick={submitCheckin} disabled={checking} className="w-full bg-primary text-on-primary px-md py-sm rounded-lg disabled:opacity-60">
                {checking ? 'Đang kiểm tra...' : 'Check-in ngay'}
                </button>
              </div>
              {appEnv.demoEnabled && (
                <button onClick={submitDemoCheckin} className="w-full border border-secondary text-secondary px-md py-sm rounded-lg">
                  Demo fallback
                </button>
              )}
              {geoError && <p className="text-xs text-error">{geoError}</p>}
              {cameraError && <p className="text-xs text-error">{cameraError}</p>}
            </div>
            <div className="border-t border-outline-variant p-lg flex-1">
              <div className="flex items-center justify-between mb-sm">
                <h3 className="font-title-md">Lịch sử quét</h3>
                <span className="text-xs text-secondary">Xem tất cả</span>
              </div>
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search nơi đã quét..."
                className="w-full neo-input rounded-lg px-sm py-xs mb-sm"
              />
              <div className="space-y-xs">
                {filteredHistory.length === 0 && (
                  <p className="text-sm text-on-surface-variant">Chưa có lịch sử quét trong phiên này.</p>
                )}
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

          <section className="lg:col-span-8 relative rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low min-h-[620px]">
            {cameraEnabled ? (
              <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
            ) : (
              <img src={images.scanDrum} alt="Scan background" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[72%] h-[52%] border-2 border-secondary/80 rounded-lg shadow-[0_0_30px_rgba(68,219,213,0.2)]" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-8 inline-flex items-center gap-2 px-md py-sm rounded-full bg-surface/80 border border-secondary/40">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-xs text-secondary">{cameraEnabled ? 'Đang quét tín hiệu di sản...' : 'Bật camera để quét như thật'}</span>
            </div>
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
              <Link to={`/secret/${parsedLocationId}`} className="inline-flex items-center gap-1 mt-sm text-secondary underline">
                Xem Secret Story <MaterialIcon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  )
}

