// src/features/time-portal/xuaNay/XuaNayView.tsx
// "Xưa & Nay" — kéo thanh trượt trên một cặp ảnh cùng góc chụp:
// trái là tranh tái hiện 1968, phải là ảnh hiện trạng tại di tích.

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
} from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import {
    XUA_NAY,
    XUA_NAY_ART_NOTE,
    XUA_NAY_PHOTO_CREDIT,
    XUA_NAY_SPOTS,
    type XuaNaySpotId,
} from './xuaNayData'

type Props = {
    audioNotice?: ReactNode
    spot: XuaNaySpotId
    onSpotChange: (spot: XuaNaySpotId) => void
    onBack: () => void
    /** Người dùng đã tự kéo so sánh tại điểm này và ở lại đủ lâu (ghi nhận bước nhiệm vụ). */
    onSpotViewed?: (spot: XuaNaySpotId) => void
}

/** Thời gian ở lại một điểm sau khi tự kéo, để tính là đã xem (ms). */
const VIEWED_AFTER_MS = 4000
const XUA = '#FDC908'
const XUA_INK = '#8a5700'
const NAY = '#0275FB'

function reducedMotion() {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
}

export function XuaNayView({ audioNotice, spot, onSpotChange, onBack, onSpotViewed }: Props) {
    const data = XUA_NAY[spot]
    const stageRef = useRef<HTMLDivElement>(null)
    const frameRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState(50)
    const [dragging, setDragging] = useState(false)
    /** Người xem đã tự kéo — không chạy gợi ý nữa. */
    const touched = useRef(false)
    const anim = useRef(0)
    /** Điểm mà người xem đã tự tương tác (kéo / phím / nút). */
    const [engagedSpot, setEngagedSpot] = useState<XuaNaySpotId | null>(null)
    const reportedSpots = useRef(new Set<XuaNaySpotId>())
    const onSpotViewedRef = useRef(onSpotViewed)

    useEffect(() => {
        onSpotViewedRef.current = onSpotViewed
    }, [onSpotViewed])

    // Đã tự tương tác và ở lại điểm đó ≥ VIEWED_AFTER_MS → báo đã xem (mỗi điểm một lần).
    useEffect(() => {
        if (engagedSpot !== spot || reportedSpots.current.has(spot)) return
        const t = window.setTimeout(() => {
            reportedSpots.current.add(spot)
            onSpotViewedRef.current?.(spot)
        }, VIEWED_AFTER_MS)
        return () => window.clearTimeout(t)
    }, [engagedSpot, spot])

    const stopHint = useCallback(() => {
        cancelAnimationFrame(anim.current)
        anim.current = 0
    }, [])

    // Gợi ý thao tác: thanh trượt lướt qua lại một lần khi mở điểm mới
    useEffect(() => {
        setPos(50)
        if (reducedMotion() || touched.current) return
        const keys = [50, 74, 26, 50]
        const seg = 650
        let start = 0
        const tick = (t: number) => {
            if (!start) start = t + 500
            const e = Math.max(0, t - start)
            const i = Math.min(keys.length - 2, Math.floor(e / seg))
            const u = Math.min(1, (e - i * seg) / seg)
            const k = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
            setPos(keys[i] + (keys[i + 1] - keys[i]) * k)
            if (e < seg * (keys.length - 1)) anim.current = requestAnimationFrame(tick)
        }
        anim.current = requestAnimationFrame(tick)
        return stopHint
    }, [spot, stopHint])

    // Tải trước ảnh các điểm khác
    useEffect(() => {
        XUA_NAY_SPOTS.forEach((id) => {
            const s = XUA_NAY[id]
            ;[s.xua.src, s.nay.src].forEach((src) => {
                const img = new Image()
                img.src = src
            })
        })
    }, [])

    const posFromEvent = (clientX: number) => {
        const r = frameRef.current?.getBoundingClientRect()
        if (!r || !r.width) return pos
        return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))
    }

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        stopHint()
        touched.current = true
        setEngagedSpot(spot)
        setDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        setPos(posFromEvent(e.clientX))
    }
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (dragging) setPos(posFromEvent(e.clientX))
    }
    const endDrag = () => setDragging(false)

    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 20 : 5
        let next: number | null = null
        if (e.key === 'ArrowLeft') next = pos - step
        else if (e.key === 'ArrowRight') next = pos + step
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = 100
        if (next === null) return
        e.preventDefault()
        stopHint()
        touched.current = true
        setEngagedSpot(spot)
        setPos(Math.max(0, Math.min(100, next)))
    }

    const snap = (v: number) => {
        stopHint()
        touched.current = true
        setEngagedSpot(spot)
        setPos(v)
    }

    const idx = XUA_NAY_SPOTS.indexOf(spot)
    const go = (d: number) =>
        onSpotChange(XUA_NAY_SPOTS[(idx + d + XUA_NAY_SPOTS.length) % XUA_NAY_SPOTS.length])

    return (
        <div className="xua-nay-view flex h-full min-h-0 w-full flex-col bg-[#f2f7ff] text-[#0F1B33] font-sans selection:bg-[#FDC908] selection:text-[#0F1B33]">
            <style>
                {`
        .xua-nay-view .tp-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .xua-nay-view .tp-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .xua-nay-view .tp-scroll::-webkit-scrollbar-thumb {
          background: rgba(2, 117, 251, 0.22);
          border-radius: 999px;
        }
        .xua-nay-view .tp-scroll::-webkit-scrollbar-button {
          display: none;
        }
        `}
            </style>

            {/* =================================================================== */}
            {/* THANH TIÊU ĐỀ HOÀNG GIA (ROYAL COMMAND HEADER)                      */}
            {/* =================================================================== */}
            <header className="relative flex shrink-0 flex-wrap items-center gap-3 border-b-[3px] border-[#FDC908] bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] px-4 py-3 text-white shadow-[0_10px_28px_rgba(2,117,251,0.22)] sm:px-6">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Quay lại Dòng thời gian"
                    title="Quay lại Dòng thời gian"
                    className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3.5 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md transition-all hover:bg-white hover:text-[#0275FB] cursor-pointer"
                >
                    <MaterialIcon name="arrow_back" className="text-base text-[#FDC908]" />
                    <span className="hidden sm:inline">Dòng thời gian</span>
                </button>

                <span
                    className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-br from-[#FFF2C3] via-[#FDC908] to-[#FDB900] text-[#0F1B33] shadow-md sm:flex"
                    aria-hidden="true"
                >
          <MaterialIcon name="compare" className="text-2xl text-[#0275FB]" />
        </span>

                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FFF2C3]">
                        Cổng Thời Gian · Xưa &amp; Nay
                    </p>
                    <h1 className="truncate text-base font-black leading-tight text-white sm:text-xl">
                        {data.name}
                    </h1>
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-[#0F1B33]/35 p-1 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 cursor-pointer"
                        aria-label="Điểm trước"
                    >
                        <MaterialIcon name="chevron_left" className="text-xl text-[#FDC908]" />
                    </button>
                    <span className="w-9 text-center text-xs tabular-nums font-black text-[#FFF2C3]">
            {idx + 1}/{XUA_NAY_SPOTS.length}
          </span>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 cursor-pointer"
                        aria-label="Điểm sau"
                    >
                        <MaterialIcon name="chevron_right" className="text-xl text-[#FDC908]" />
                    </button>
                </div>
              {audioNotice}
      </header>

            {/* =================================================================== */}
            {/* BỐ CỤC CHÍNH: KHUNG ẢNH TRÀN VIỀN (TRÁI) & THÔNG TIN ĐIỂM (PHẢI)    */}
            {/* =================================================================== */}
            <div className="tp-scroll grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1 lg:content-stretch lg:gap-5 lg:overflow-hidden lg:p-5">
                {/* CỘT TRÁI: KHUNG SO SÁNH MỞ RỘNG TOÀN DIỆN TÍCH (KHÔNG CÒN KHOẢNG TRỐNG) */}
                <section className="flex min-w-0 flex-col rounded-[26px] border-2 border-[#0275FB]/15 bg-white p-2.5 sm:p-3.5 shadow-[0_16px_42px_rgba(2,117,251,0.08)] lg:min-h-0">
                    {/* Thanh tiêu đề nhỏ gọn kết hợp nút chuyển nhanh */}
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#FDC908] ring-4 ring-[#FFF2C3]" />
                            <p className="text-xs sm:text-sm font-black text-[#0F1B33]">
                                Một góc nhìn, hai thời kỳ
                            </p>
                            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-[#F2F7FF] border border-[#0275FB]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0275FB]">
                <MaterialIcon name="swipe" className="text-sm" />
                Kéo thanh chia để khám phá
              </span>
                        </div>

                        {/* 3 Nút chuyển nhanh bố trí ngay trên thanh điều khiển để nhường 100% chiều cao cho ảnh */}
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => snap(100)}
                                aria-label="Xem 1968"
                                aria-pressed={pos >= 99}
                                className="flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-black transition-all cursor-pointer"
                                style={
                                    pos >= 99
                                        ? { background: XUA, borderColor: XUA, color: '#0F1B33' }
                                        : { borderColor: '#f1d680', color: XUA_INK, background: '#fffaf0' }
                                }
                            >
                                <MaterialIcon name="history" className="text-sm" />
                                <span className="sm:hidden">1968</span>
                                <span className="hidden sm:inline">Xem 1968</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => snap(50)}
                                aria-label="Chia đôi ảnh"
                                aria-pressed={Math.abs(pos - 50) < 1}
                                className={`flex min-h-[34px] items-center gap-1 rounded-full border px-3 text-xs font-black transition-all cursor-pointer ${
                                    Math.abs(pos - 50) < 1
                                        ? 'border-[#0275FB] bg-[#EAF3FF] text-[#0275FB]'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-[#F2F7FF]'
                                }`}
                            >
                                <MaterialIcon name="compare" className="text-sm text-[#0275FB]" />
                                <span>Chia đôi</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => snap(0)}
                                aria-label="Xem hiện nay"
                                aria-pressed={pos <= 1}
                                className="flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-black transition-all cursor-pointer"
                                style={
                                    pos <= 1
                                        ? { background: NAY, borderColor: NAY, color: '#fff' }
                                        : { borderColor: '#b6d2f5', color: NAY, background: '#f2f7ff' }
                                }
                            >
                                <MaterialIcon name="photo_camera" className="text-sm" />
                                <span className="sm:hidden">Hiện nay</span>
                                <span className="hidden sm:inline">Xem hiện nay</span>
                            </button>
                        </div>
                    </div>

                    {/* Vùng hiển thị ảnh tràn 100% chiều rộng và chiều cao khung */}
                    <div
                        ref={stageRef}
                        className="relative flex w-full flex-1 flex-col items-stretch justify-center min-h-[320px] sm:min-h-[440px] lg:min-h-0"
                    >
                        <div
                            ref={frameRef}
                            key={spot}
                            className="relative w-full h-full flex-1 min-h-[320px] sm:min-h-[440px] lg:min-h-0 touch-none select-none overflow-hidden rounded-[20px] bg-[#07132C] shadow-[0_14px_35px_rgba(15,27,51,0.2)] border-2 border-[#FDC908]/85"
                            style={{
                                animation: 'tp-fade-in 450ms ease-out both',
                                cursor: dragging ? 'grabbing' : 'ew-resize',
                            }}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                        >
                            <img
                                src={data.nay.src}
                                alt={`${data.name} hiện nay`}
                                className="absolute inset-0 h-full w-full object-cover object-center"
                                draggable={false}
                            />
                            <img
                                src={data.xua.src}
                                alt={`${data.name} năm 1968 — tranh tái hiện`}
                                className="absolute inset-0 h-full w-full object-cover object-center"
                                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
                                draggable={false}
                            />

                            {/* Nhãn hai bên */}
                            <span
                                className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0F1B33] shadow-md transition-opacity sm:left-4 sm:top-4 sm:text-xs"
                                style={{ background: XUA, opacity: pos > 12 ? 1 : 0 }}
                            >
                1968 · Tái hiện
              </span>
                            <span
                                className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md transition-opacity sm:right-4 sm:top-4 sm:text-xs"
                                style={{ background: NAY, opacity: pos < 88 ? 1 : 0 }}
                            >
                Hiện nay
              </span>

                            {/* Đường kẻ dọc & Tay kéo trung tâm */}
                            <div
                                className="pointer-events-none absolute inset-y-0 -ml-px w-[3px] bg-gradient-to-b from-[#FDC908] via-white to-[#FDC908] shadow-[0_0_14px_rgba(0,0,0,0.75)]"
                                style={{ left: `${pos}%` }}
                            />
                            <div
                                className="pointer-events-none absolute inset-y-0"
                                style={{ left: `${Math.min(96, Math.max(4, pos))}%` }}
                            >
                                <div
                                    role="slider"
                                    tabIndex={0}
                                    aria-label="Kéo để so sánh xưa và nay"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(pos)}
                                    aria-valuetext={`${Math.round(pos)}% tranh 1968`}
                                    onKeyDown={onKey}
                                    className="pointer-events-auto absolute left-0 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#FDC908] bg-[#0275FB] text-white shadow-[0_4px_18px_rgba(15,27,51,0.5)] outline-none transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-[#FDC908]"
                                >
                                    <MaterialIcon name="compare_arrows" className="text-2xl text-[#FDC908]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CỘT PHẢI: THUYẾT MINH ĐỐI CHIẾU & DANH SÁCH 5 ĐIỂM DI TÍCH */}
                <aside className="tp-scroll flex min-w-0 flex-col gap-3.5 lg:min-h-0 lg:overflow-y-auto pr-0.5">
                    {/* Thẻ thuyết minh 2 thời kỳ */}
                    <div
                        key={spot}
                        className="rounded-[24px] border-2 border-[#0275FB]/15 bg-white p-4 sm:p-5 shadow-[0_12px_30px_rgba(2,117,251,0.07)] space-y-3.5"
                        style={{ animation: 'tp-enter 380ms ease-out both' }}
                    >
                        <div className="rounded-2xl bg-[#FFFBEB] border border-[#FDC908]/70 border-l-4 border-l-[#FDC908] p-3.5">
                            <p
                                className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                style={{ color: XUA_INK }}
                            >
                                <MaterialIcon name="history_edu" className="text-sm text-[#0275FB]" />
                                <span>1968 · Tranh tái hiện</span>
                            </p>
                            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-[#0F1B33]">
                                {data.xua.text}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 border-l-4 border-l-[#0275FB] p-3.5">
                            <p
                                className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                style={{ color: NAY }}
                            >
                                <MaterialIcon name="photo_camera" className="text-sm text-[#0275FB]" />
                                <span>Hiện nay</span>
                            </p>
                            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-[#0F1B33]">
                                {data.nay.text}
                            </p>
                        </div>

                        <p className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-slate-500 pt-1">
                            <MaterialIcon name="info" className="mt-0.5 text-sm text-[#0275FB] shrink-0" />
                            <span>
                {XUA_NAY_ART_NOTE} {XUA_NAY_PHOTO_CREDIT}.
              </span>
                        </p>
                    </div>

                    {/* Danh sách 5 điểm Xưa & Nay */}
                    <nav
                        aria-label="Các điểm Xưa & Nay"
                        className="order-first rounded-[24px] border-2 border-[#0275FB]/15 bg-white p-4 shadow-[0_12px_30px_rgba(2,117,251,0.06)] lg:order-none"
                    >
                        <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0F1B33]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#0275FB]">
                <MaterialIcon name="location_on" className="text-base" />
              </span>
                            <span>Khám phá 5 điểm tại di tích</span>
                        </h2>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                            {XUA_NAY_SPOTS.map((id) => {
                                const s = XUA_NAY[id]
                                const active = id === spot
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => onSpotChange(id)}
                                        aria-label={s.name}
                                        aria-current={active ? 'true' : undefined}
                                        className={`group flex min-w-0 items-center gap-2.5 rounded-2xl border-2 p-2 text-left transition-all cursor-pointer lg:gap-3 ${
                                            active
                                                ? 'border-[#FDC908] bg-gradient-to-r from-[#FFFBEB] via-white to-[#F2F7FF] shadow-sm'
                                                : 'border-slate-100 bg-[#F8FAFC] hover:border-[#0275FB]/40 hover:bg-white'
                                        }`}
                                    >
                    <span className="relative block aspect-[4/3] w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 sm:w-14 lg:w-20">
                      <img
                          src={s.nay.src}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          draggable={false}
                      />
                      <img
                          src={s.xua.src}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ clipPath: 'inset(0 50% 0 0)' }}
                          loading="lazy"
                          draggable={false}
                      />
                    </span>

                                        <span
                                            className={`min-w-0 flex-1 text-xs leading-snug sm:text-[13px] lg:text-sm ${
                                                active
                                                    ? 'font-black text-[#0F1B33]'
                                                    : 'font-bold text-slate-600 group-hover:text-[#0275FB]'
                                            }`}
                                        >
                      <span className="hidden lg:inline">{s.name}</span>
                      <span className="lg:hidden">{s.short}</span>
                    </span>

                                        <MaterialIcon
                                            name={active ? 'check_circle' : 'chevron_right'}
                                            className={`hidden lg:inline text-lg shrink-0 ${
                                                active ? 'text-[#0275FB]' : 'text-slate-300 group-hover:text-[#0275FB]'
                                            }`}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </nav>
                </aside>
            </div>
        </div>
    )
}