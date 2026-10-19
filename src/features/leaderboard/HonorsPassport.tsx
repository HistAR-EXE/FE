// src/features/leaderboard/HonorsPassport.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useAuth } from '../../shared/auth/useAuth'
import { HERITAGE_BADGES } from '../explore/heritageBadges'
import { type ExplorerPassport } from './extrasApi'
import {
    PASSPORT_SLOGANS,
    buildPassportMrzLines,
    generatePassportNumber,
    getExplorerLevelTitle,
    renderPassport,
    type PassportOptions,
} from './passportImage'
import { formatXp } from './format'
import { usePassportEmail } from './usePassportEmail'
import fallbackMascotImg from '../../assets/mascot.png'

const TIMELENS_ICON_URL = '/brand/icon-512.png'
const HISTAR_LOGO_URL = '/brand/logo_2.png'

type ExplorerPassportWithMeta = ExplorerPassport & {
    avatarUrl?: string | null
    email?: string | null
}

function ChronoPassportEmblem({ className = 'w-20 h-20' }: { className?: string }) {
    const [srcIdx, setSrcIdx] = useState(0)
    const sources = ['/mascot/mascot-4.png', '/mascot-4.png', fallbackMascotImg]

    return (
        <img
            src={sources[srcIdx] ?? fallbackMascotImg}
            alt="Chrono TimeLens"
            onError={() => {
                if (srcIdx < sources.length - 1) {
                    setSrcIdx((prev) => prev + 1)
                }
            }}
            className={`${className} object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] select-none`}
        />
    )
}

function PassportEditor({
                            initial,
                            owner,
                            onClose,
                        }: {
    initial: ExplorerPassport
    owner: string
    onClose: () => void
}) {
    const { user } = useAuth()
    const dialog = useRef<HTMLDialogElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const request = useRef(0)
    const [facts] = useState<ExplorerPassportWithMeta>(initial)

    const resolvedAvatarUrl =
        facts.avatarUrl ?? user?.avatarUrl ?? fallbackMascotImg
    const resolvedEmail =
        facts.email ?? user?.email ?? ''
    const email = usePassportEmail(owner)

    const [options, setOptions] = useState<PassportOptions>({
        name: true,
        xp: true,
        level: true,
        badges: true,
        selectedBadges: initial.heritageBadges.slice(0, 3).map((badge) => badge.id),
        slogan: PASSPORT_SLOGANS[0],
        avatarUrl: resolvedAvatarUrl,
        email: resolvedEmail,
    })
    const [prepared, setPrepared] = useState<{ blob: Blob; url: string; requestId: string } | null>(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        const element = dialog.current
        const focused =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        const overflow = document.body.style.overflow
        element?.showModal()
        document.body.style.overflow = 'hidden'
        return () => {
            request.current++
            element?.close()
            document.body.style.overflow = overflow
            focused?.focus()
        }
    }, [])

    useEffect(
        () => () => {
            if (prepared) URL.revokeObjectURL(prepared.url)
        },
        [prepared]
    )

    // Kết xuất tệp ảnh dựa trực tiếp trên giao diện xem trước bên trái
    const buildOfficialBlob = useCallback(
        async (currentOptions: PassportOptions) => {
            const version = ++request.current
            setBusy(true)
            setMessage('')
            try {
                const blob = await renderPassport(
                    facts,
                    {
                        ...currentOptions,
                        avatarUrl: resolvedAvatarUrl,
                        email: resolvedEmail,
                    },
                    previewRef.current
                )
                if (request.current !== version) return null
                const nextPrepared = {
                    blob,
                    url: URL.createObjectURL(blob),
                    requestId: crypto.randomUUID(),
                }
                setPrepared(nextPrepared)
                return nextPrepared
            } catch {
                if (request.current === version) {
                    setMessage(
                        'Chưa xuất được tệp ảnh. Vui lòng kiểm tra kết nối và thử lại.'
                    )
                }
                return null
            } finally {
                if (request.current === version) setBusy(false)
            }
        },
        [facts, resolvedAvatarUrl, resolvedEmail]
    )

    useEffect(() => {
        void buildOfficialBlob(options)
    }, [options, buildOfficialBlob])

    const change = (next: PassportOptions) => {
        if (email.sending) return
        setOptions(next)
        setPrepared(null)
        setMessage('')
        email.clearFeedback()
    }

    const filename = `timelens-dau-an-${facts.generatedAt.slice(0, 10)}.png`

    const handleDownload = () => {
        if (!prepared) return
        const link = document.createElement('a')
        link.href = prepared.url
        link.download = filename
        link.click()
    }

    const handleSendEmail = () => {
        if (!prepared || busy || email.sending || !email.canSend) return
        void email.send(prepared.blob, prepared.requestId)
    }

    const visibleBadges = HERITAGE_BADGES.filter((badge) =>
        facts.heritageBadges.some((earned) => earned.id === badge.id)
    )
    const activePreviewBadges = visibleBadges.filter((b) =>
        options.selectedBadges.includes(b.id)
    )

    const passportNo = generatePassportNumber(facts.userId, facts.generatedAt)
    const [mrz1, mrz2] = buildPassportMrzLines(facts.displayName, passportNo, options.name)
    const parsedGeneratedDate = Date.parse(facts.generatedAt)
    const issueDate = new Date(
        Number.isNaN(parsedGeneratedDate) ? '2026-01-01T00:00:00.000Z' : parsedGeneratedDate
    ).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })

    return (
        <dialog
            ref={dialog}
            className="tl-passport-modal m-auto rounded-[2.2rem] border-4 border-[#FDC908] bg-white p-0 max-w-5xl w-[96%] shadow-[0_30px_90px_rgba(2,117,251,0.45)] text-[#0F1B33] backdrop:bg-[#0F1B33]/85 backdrop:backdrop-blur-md overflow-hidden"
            aria-labelledby="passport-editor-title"
            onCancel={(event) => {
                event.preventDefault()
                onClose()
            }}
        >
            <style>
                {`
                .tl-passport-modal {
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #0F1B33 !important;
                    max-height: 94dvh;
                    max-width: min(1100px, 96vw);
                }
                .tl-passport-modal[open] {
                    display: flex;
                    flex-direction: column;
                }
                .tl-passport-modal > .tl-passport-modal-header,
                .tl-passport-modal > footer {
                    flex-shrink: 0;
                }
                .tl-passport-modal-body {
                    min-height: 0;
                    max-height: none;
                    flex: 1 1 auto;
                }
                .tl-passport-modal-header {
                    background: linear-gradient(90deg, #042A6B 0%, #0275FB 52%, #022359 100%) !important;
                    color: #ffffff !important;
                }
                .tl-passport-modal-header h2 {
                    color: #ffffff !important;
                }
                .tl-passport-quote {
                    color: #0F1B33 !important;
                    background: linear-gradient(90deg, #FFFBEB 0%, #FFFFFF 65%, #F2F7FF 100%) !important;
                }
                `}
            </style>

            {/* HEADER STUDIO HỘ CHIẾU DI SẢN */}
            <div className="tl-passport-modal-header px-6 sm:px-8 py-4 border-b-4 border-[#FDC908] flex items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-4">
                    <img
                        src={TIMELENS_ICON_URL}
                        alt="TimeLens"
                        className="h-16 sm:h-20 w-auto object-contain shrink-0 drop-shadow-lg"
                    />
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] text-[#FFF2C3] flex items-center gap-1.5">
                            <MaterialIcon name="auto_awesome" className="text-sm text-[#FDC908]" />
                            <span>Ghi dấu của riêng bạn · TimeLens by HistAR Team</span>
                        </p>
                        <h2
                            id="passport-editor-title"
                            className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight drop-shadow-xs"
                        >
                            Hộ chiếu nhà thám hiểm
                        </h2>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Đóng hộ chiếu"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                        <MaterialIcon name="close" className="text-xl" />
                    </button>
                </div>
            </div>

            {/* BODY 2 CỘT CÂN ĐỐI CHIỀU CAO */}
            <div className="tl-passport-modal-body p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-y-auto custom-scrollbar bg-[#F4F9FF]">

                {/* CỘT TRÁI (6 PHẦN): BẢN HỘ CHIẾU CHÍNH THỨC */}
                <div className="lg:col-span-6 flex flex-col justify-between gap-2.5">
                    <div
                        ref={previewRef}
                        className="flex-1 rounded-[1.8rem] bg-gradient-to-b from-[#07132C] via-[#0E224D] to-[#033980] p-3 sm:p-4 border-2 border-[#FDC908] shadow-[0_16px_40px_rgba(15,27,51,0.28)] flex flex-col justify-center"
                    >
                        <div className="rounded-[1.4rem] overflow-hidden border-2 border-[#FDC908]/85 bg-[#FCFBF7] text-[#0F1B33] shadow-inner flex flex-col justify-between h-full">
                            {/* Đỉnh Hộ chiếu */}
                            <div className="bg-gradient-to-r from-[#042A6B] via-[#0262D6] to-[#022359] px-5 py-4 text-white border-b-2 border-[#FDC908]">
                                <div className="flex items-center justify-between gap-2">
                                    <img
                                        src={HISTAR_LOGO_URL}
                                        alt="HistAR"
                                        data-passport-role="histar-logo"
                                        className="h-9 sm:h-11 w-auto object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]"
                                    />
                                    <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FFF2C3] to-[#FDC908] text-[#0F1B33] text-[11px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm">
                                        e-Passport · {passportNo}
                                    </span>
                                </div>
                                <div className="text-center mt-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFF2C3]">
                                        TimeLens · Cộng Hòa Di Sản Số
                                    </p>
                                    <p className="text-xl sm:text-2xl font-black text-[#FDC908] tracking-tight leading-tight mt-1">
                                        HỘ CHIẾU DI SẢN ĐẤT THÉP
                                    </p>
                                    <p className="text-[11px] font-bold text-blue-100 mt-0.5">
                                        Khu Di Tích Quốc Gia Đặc Biệt Địa Đạo Củ Chi
                                    </p>
                                </div>
                            </div>

                            {/* Ruột Hộ chiếu */}
                            <div className="p-3.5 sm:p-5 space-y-3 bg-[radial-gradient(#0275FB_0.65px,transparent_0.65px)] [background-size:16px_16px] bg-[#FCFBF7] flex-1 flex flex-col justify-between">
                                <div className="w-full flex flex-col justify-between space-y-2.5">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 border-b border-slate-200 pb-1.5">
                                        <span>LOẠI: P · HERITAGE</span>
                                        <span className="text-[#0275FB]">MÃ QUỐC GIA: VNM · CỦ CHI</span>
                                    </div>

                                    {/* Avatar người dùng + Họ tên + Email + Dấu mộc đỏ thương hiệu */}
                                    <div className="flex items-center justify-between gap-3 py-1">
                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#0275FB] ring-2 ring-[#FDC908]/60 overflow-hidden shrink-0 bg-white shadow-sm">
                                                <img
                                                    src={options.name ? resolvedAvatarUrl : fallbackMascotImg}
                                                    alt="Avatar"
                                                    data-passport-role="avatar"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        e.currentTarget.src = fallbackMascotImg
                                                    }}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-[#0275FB] block">
                                                    HỌ VÀ TÊN NHÀ THÁM HIỂM / EXPLORER FULL NAME
                                                </span>
                                                <h3 className="text-lg sm:text-xl font-black text-[#0F1B33] truncate leading-tight mt-0.5">
                                                    {options.name
                                                        ? facts.displayName
                                                        : 'Một nhà thám hiểm TimeLens'}
                                                </h3>
                                                <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                                                    {options.name ? resolvedEmail : 'Thông tin cá nhân đã ẩn'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Con dấu mộc đỏ thương hiệu TimeLens × HistAR */}
                                        <div className="w-20 h-20 rounded-full border-2 border-rose-600/90 bg-rose-50/60 flex flex-col items-center justify-center text-center p-1 -rotate-12 shrink-0 select-none shadow-2xs relative">
                                            <div className="absolute inset-1 rounded-full border border-dashed border-rose-600/75 pointer-events-none" />
                                            <span className="text-[5.5px] font-black text-rose-700 tracking-tighter leading-none">
                                                ★ TIMELENS × HISTAR ★
                                            </span>
                                            <span className="text-[6.5px] font-black text-rose-800 leading-tight mt-0.5">
                                                ĐỊA ĐẠO CỦ CHI
                                            </span>
                                            <span className="px-1.5 py-0.5 my-0.5 rounded bg-rose-700 text-[#FFFBEB] text-[5.5px] font-black uppercase leading-none">
                                                ĐÃ XÁC THỰC DI SẢN
                                            </span>
                                            <span className="text-[5.5px] font-mono font-bold text-rose-800 leading-none">
                                                {issueDate}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                                        <div className="p-2.5 rounded-xl bg-[#F2F7FF] border border-[#0275FB]/20">
                                            <span className="text-[8px] font-black uppercase text-slate-400 block">
                                                TÍCH LŨY XP
                                            </span>
                                            <b className="text-sm font-black text-[#0275FB] block mt-0.5">
                                                {options.xp
                                                    ? `${formatXp(facts.totalPoints)} XP`
                                                    : 'Đã bảo mật'}
                                            </b>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDC908]">
                                            <span className="text-[8px] font-black uppercase text-amber-800/75 block">
                                                CẤP BẬC
                                            </span>
                                            <b className="text-xs font-black text-[#0F1B33] block leading-tight mt-0.5">
                                                {options.level
                                                    ? `Cấp ${facts.level} · ${getExplorerLevelTitle(facts.level, facts.levelName)}`
                                                    : 'Sứ giả Di sản'}
                                            </b>
                                        </div>
                                    </div>
                                </div>

                                {/* Câu Tuyên Ngôn Cá Nhân */}
                                <blockquote className="tl-passport-quote px-4 py-2.5 rounded-xl border-l-4 border-[#0275FB] border border-[#FDC908]/70 text-xs sm:text-[13px] font-black italic leading-snug shadow-2xs">
                                    “{options.slogan}”
                                </blockquote>

                                {/* Dải Huy hiệu 3 Cột Ngang + Con dấu Củ Chi */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-[#0275FB]">
                                            THỊ THỰC HUY HIỆU ĐẤT THÉP ({options.badges ? activePreviewBadges.length : 0}/3)
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-[8px] font-black text-rose-700 uppercase">
                                            ★ Củ Chi 250km · {issueDate}
                                        </span>
                                    </div>

                                    {options.badges && activePreviewBadges.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {activePreviewBadges.map((b) => (
                                                <div
                                                    key={b.id}
                                                    className="p-2 rounded-xl bg-white border border-[#FDC908] shadow-2xs flex flex-col items-center text-center gap-1"
                                                >
                                                    <img
                                                        src={b.image}
                                                        alt=""
                                                        data-passport-badge={b.id}
                                                        className="w-8 h-8 object-contain shrink-0"
                                                    />
                                                    <span className="text-[9px] font-black text-[#0F1B33] leading-tight line-clamp-2">
                                                        {b.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                                            <span className="text-[11px] font-semibold text-slate-600">
                                                Hộ chiếu đã sẵn sàng để tải về máy hoặc nhận qua email.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Dải mã MRZ chuẩn quốc tế */}
                                <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] border border-slate-300 font-mono text-[9px] sm:text-[10px] font-bold text-[#0F1B33] leading-snug select-all space-y-1">
                                    <div className="flex justify-between w-full">
                                        {mrz1.split('').map((ch, idx) => (
                                            <span key={`m1-${idx}`}>{ch}</span>
                                        ))}
                                    </div>
                                    <div className="flex justify-between w-full">
                                        {mrz2.split('').map((ch, idx) => (
                                            <span key={`m2-${idx}`}>{ch}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI (6 PHẦN): BẢNG ĐIỀU KHIỂN CÁ NHÂN HÓA */}
                <div className="lg:col-span-6 flex flex-col justify-between bg-white rounded-[1.8rem] border-2 border-[#0275FB]/15 p-5 sm:p-6 shadow-sm space-y-4">
                    <fieldset disabled={email.sending} className="space-y-4">
                        <legend className="text-[13px] sm:text-sm font-black uppercase tracking-wider text-[#0275FB] flex items-center gap-2 mb-3">
                            <MaterialIcon name="tune" className="text-[18px]" />
                            <span>Bạn quyết định điều được chia sẻ</span>
                        </legend>

                        {/* 4 Ô Checkbox */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(
                                [
                                    { key: 'name', label: 'Hiển thị tên của tôi' },
                                    { key: 'xp', label: 'Hiển thị tổng XP' },
                                    { key: 'level', label: 'Hiển thị cấp độ' },
                                    { key: 'badges', label: 'Hiển thị huy hiệu' },
                                ] as const
                            ).map((item) => {
                                const checked = options[item.key]
                                return (
                                    <label
                                        key={item.key}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                                            checked
                                                ? 'bg-[#EAF3FF] border-[#0275FB] text-[#0F1B33]'
                                                : 'bg-[#F8FAFC] border-slate-200 text-slate-600 hover:border-[#0275FB]/40'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                                change({ ...options, [item.key]: event.target.checked })
                                            }
                                            className="w-4 h-4 accent-[#0275FB] rounded cursor-pointer shrink-0"
                                        />
                                        <span className="text-xs sm:text-[13px] font-bold">{item.label}</span>
                                    </label>
                                )
                            })}
                        </div>

                        {/* Chọn câu tuyên ngôn */}
                        <label className="block space-y-2">
                            <span className="text-xs font-black uppercase tracking-wider text-[#0F1B33] flex items-center justify-between">
                                <span>Câu tuyên ngôn của bạn</span>
                                <span className="text-[10px] font-bold text-[#0275FB]">
                                    {PASSPORT_SLOGANS.length} thông điệp truyền cảm hứng
                                </span>
                            </span>
                            <select
                                value={options.slogan}
                                onChange={(event) =>
                                    change({ ...options, slogan: event.target.value })
                                }
                                className="w-full p-3.5 rounded-xl bg-[#F8FAFC] border-2 border-slate-200 focus:border-[#0275FB] focus:bg-white focus:outline-none text-xs sm:text-[13px] font-bold text-[#0F1B33] cursor-pointer"
                            >
                                {PASSPORT_SLOGANS.map((slogan) => (
                                    <option key={slogan} value={slogan}>
                                        {slogan}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Chọn tối đa 3 Huy hiệu Củ Chi */}
                        {options.badges && (
                            <fieldset className="p-4 rounded-2xl bg-[#F8FAFC] border-2 border-[#0275FB]/15 space-y-3">
                                <legend className="px-2 text-[11px] font-black uppercase tracking-wider text-[#0275FB]">
                                    Huy hiệu Củ Chi tiêu biểu · Chọn tối đa 3
                                </legend>
                                {visibleBadges.length ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[175px] overflow-y-auto custom-scrollbar pr-1.5">
                                        {visibleBadges.map((badge) => {
                                            const isSelected = options.selectedBadges.includes(badge.id)
                                            const isDisabled =
                                                !isSelected && options.selectedBadges.length >= 3
                                            return (
                                                <label
                                                    key={badge.id}
                                                    className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                                        isSelected
                                                            ? 'bg-[#FFFBEB] border-[#FDC908] shadow-2xs cursor-pointer'
                                                            : isDisabled
                                                                ? 'bg-slate-100/70 border-slate-200 opacity-50 cursor-not-allowed'
                                                                : 'bg-white border-slate-200 hover:border-[#0275FB]/40 cursor-pointer'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={(event) =>
                                                            change({
                                                                ...options,
                                                                selectedBadges: event.target.checked
                                                                    ? [...options.selectedBadges, badge.id]
                                                                    : options.selectedBadges.filter(
                                                                        (id) => id !== badge.id
                                                                    ),
                                                            })
                                                        }
                                                        className="w-4 h-4 accent-[#0275FB] shrink-0"
                                                    />
                                                    <img
                                                        src={badge.image}
                                                        alt=""
                                                        className="w-8 h-8 object-contain shrink-0"
                                                    />
                                                    <span className="text-xs font-black text-[#0F1B33] leading-tight">
                                                        {badge.name}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs font-semibold text-slate-500 py-2">
                                        Huy hiệu đầu tiên đang chờ bạn trên hành trình khám phá.
                                    </p>
                                )}
                            </fieldset>
                        )}
                    </fieldset>

                    {/* Thông tin bản xuất chính thức & Trạng thái Email */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div
                            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 shadow-inner"
                            data-testid="passport-export-facts"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <b className="font-black text-[13px]">
                                    {options.name ? facts.displayName : 'Đã ẩn tên trên ảnh'}
                                </b>
                                {options.xp && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-bold">
                                        {formatXp(facts.totalPoints)} XP
                                    </span>
                                )}
                                {options.level && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-bold">
                                        Cấp {facts.level}
                                    </span>
                                )}
                                {options.badges && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-bold">
                                        {facts.badgeCount} huy hiệu
                                    </span>
                                )}
                            </div>
                            <small className="text-[11px] font-semibold text-emerald-700">
                                Bản chính thức · {issueDate}
                            </small>
                        </div>

                        <div
                            data-testid="passport-email-recipient"
                            className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-relaxed text-slate-700"
                        >
                            {email.loading ? (
                                'Đang kiểm tra email tài khoản…'
                            ) : !email.status ? (
                                'Chưa kiểm tra được email. Bạn vẫn có thể tải ảnh về máy.'
                            ) : !email.status.verified ? (
                                'Bạn cần xác minh email tài khoản để nhận hộ chiếu.'
                            ) : !email.status.available ? (
                                'Chức năng email chưa sẵn sàng. Bạn vẫn có thể tải ảnh về máy.'
                            ) : (
                                <>
                                    Gửi về <b className="break-all">{email.status.email}</b>
                                    <br />
                                    <small>
                                        Còn {email.status.remainingToday}/3 lượt trong 24 giờ. Không gửi tới địa chỉ khác.
                                    </small>
                                </>
                            )}
                        </div>

                        {message && (
                            <p
                                className="p-3 rounded-xl bg-amber-50 border border-[#FDC908] text-xs font-bold text-[#0F1B33] text-center"
                                role="status"
                            >
                                {message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* FOOTER TẢI ẢNH PNG & NHẬN QUA EMAIL TRỰC TIẾP */}
            <footer className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                    <MaterialIcon
                        name="verified"
                        className="text-lg text-emerald-600"
                    />
                    <span
                        data-testid={email.feedback ? 'passport-email-feedback' : undefined}
                        role={email.feedback ? 'status' : undefined}
                    >
                        {email.feedback ||
                            (busy
                                ? 'Đang đồng bộ hộ chiếu chính thức…'
                                : prepared
                                    ? 'Ảnh hộ chiếu đã sẵn sàng để tải về máy hoặc nhận qua email.'
                                    : 'Chưa tạo được ảnh hộ chiếu. Vui lòng đóng và mở lại để thử lại.')}
                    </span>
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-[#0275FB] hover:bg-[#015CC8] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                        type="button"
                        disabled={!prepared || busy}
                        aria-label="Tải ảnh về máy"
                        onClick={handleDownload}
                    >
                        <MaterialIcon name="download" className="text-base" />
                        <span>Tải ảnh về máy</span>
                    </button>
                    <button
                        className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 disabled:opacity-40 text-[#0F1B33] font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                        type="button"
                        disabled={!prepared || busy || email.sending || !email.canSend}
                        aria-label={
                            email.sending
                                ? 'Đang gửi email…'
                                : email.cooldown
                                    ? `Gửi lại sau ${email.cooldown}s`
                                    : 'Nhận qua email'
                        }
                        onClick={handleSendEmail}
                    >
                        <MaterialIcon name="mail" className="text-base text-[#0275FB]" />
                        <span>
                            {email.sending
                                ? 'Đang gửi email…'
                                : email.cooldown
                                    ? `Gửi lại sau ${email.cooldown}s`
                                    : 'Nhận qua email'}
                        </span>
                    </button>
                </div>
            </footer>
        </dialog>
    )
}

export function HonorsPassport({
                                   data,
                                   loading,
                                   onRetry,
                                   owner,
                               }: {
    data: ExplorerPassport | null
    loading: boolean
    onRetry: () => void
    owner: string
}) {
    const [open, setOpen] = useState(false)

    if (!data) {
        return (
            <section
                className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between space-y-4"
                data-testid={loading ? 'honors-passport-loading' : 'honors-passport-error'}
            >
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center shrink-0">
                        <MaterialIcon name="travel_explore" className="text-2xl" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33]">
                        Hộ chiếu nhà thám hiểm
                    </h2>
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    {loading
                        ? 'Đang mở dấu ấn cá nhân…'
                        : 'Chưa tải được hộ chiếu. Dữ liệu thành tích của bạn vẫn được giữ nguyên.'}
                </p>
                {!loading && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="self-start px-5 py-3 rounded-xl bg-[#0275FB] hover:bg-[#015CC8] text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                        Tải lại hộ chiếu
                    </button>
                )}
            </section>
        )
    }

    const passportNo = generatePassportNumber(data.userId, data.generatedAt)

    return (
        <section
            className="honors-surface-card bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col justify-between space-y-6"
            data-testid="honors-passport"
        >
            <div className="space-y-6">
                {/* Tiêu đề Khối Hộ Chiếu */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white flex items-center justify-center shadow-md shrink-0">
                            <MaterialIcon name="travel_explore" className="text-2xl text-[#FDC908]" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] text-[#0275FB]">
                                Mang theo điều đáng tự hào
                            </p>
                            <h2 className="text-xl sm:text-2xl font-black text-[#0F1B33] mt-0.5 truncate">
                                Hộ chiếu nhà thám hiểm
                            </h2>
                        </div>
                    </div>
                </div>

                {/* THẺ BÌA HỘ CHIẾU DI SẢN 3D BÊN NGOÀI */}
                <div
                    onClick={() => setOpen(true)}
                    className="group relative rounded-[2rem] bg-gradient-to-br from-[#042A6B] via-[#0262D6] to-[#01357A] text-white p-6 border-2 border-[#FDC908] shadow-[0_16px_38px_rgba(2,117,251,0.24)] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5"
                >
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border-2 border-dashed border-[#FDC908]/35 pointer-events-none" />
                    <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#0275FB]/40 rounded-full blur-3xl pointer-events-none" />

                    {/* Dòng trên cùng: Logo HistAR to rõ không đóng khung & Nhãn E-Passport */}
                    <div className="relative z-10 flex items-center justify-between gap-2 pb-4 border-b border-white/15">
                        <img
                            src={HISTAR_LOGO_URL}
                            alt="HistAR"
                            className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]"
                        />
                        <span className="px-3 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDC908] text-[10px] sm:text-[11px] font-black uppercase text-[#0F1B33] whitespace-nowrap shrink-0 shadow-xs">
                            E-PASSPORT · {passportNo}
                        </span>
                    </div>

                    {/* Giữa: Thông tin chủ sở hữu hộ chiếu & Chrono */}
                    <div className="relative z-10 flex items-center justify-between gap-4 py-4">
                        <div className="w-full space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200/90 block">
                                TIMELENS · CỘNG HÒA DI SẢN SỐ
                            </span>
                            <b className="text-xl sm:text-2xl font-black text-[#FDC908] block truncate group-hover:text-white transition-colors pb-0.5">
                                HỘ CHIẾU DI SẢN ĐẤT THÉP
                            </b>
                            <p className="text-[13px] font-bold text-white">
                                Khu Di Tích Quốc Gia Đặc Biệt Địa Đạo Củ Chi
                            </p>
                        </div>

                        {/* Hình Chrono bay lượn ở thẻ ngoài */}
                        <div className="relative shrink-0 hidden sm:block">
                            <div className="absolute inset-0 rounded-full bg-[#FDC908]/25 blur-xl pointer-events-none" />
                            <ChronoPassportEmblem className="w-20 h-20 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                        </div>
                    </div>

                    {/* Hàng chữ đáy */}
                    <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                        <small className="text-xs font-semibold text-blue-100">
                            Khám phá di sản. Tiếp nối tri thức.
                        </small>
                        <span className="text-[11px] font-mono font-black text-[#FDC908] uppercase whitespace-nowrap">
                            11°08&apos;N 106°27&apos;E
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <button
                    type="button"
                    aria-label="Thiết kế Hộ chiếu của bạn"
                    onClick={() => setOpen(true)}
                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 text-[#0F1B33] font-black text-[13px] sm:text-sm uppercase tracking-wider shadow-[0_8px_22px_rgba(253,201,8,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2.5 hover:scale-[1.01]"
                >
                    <MaterialIcon name="workspace_premium" className="text-xl text-[#0275FB]" />
                    <span>Thiết kế Hộ chiếu của bạn</span>
                </button>
            </div>

            {open && (
                <PassportEditor
                    initial={data}
                    owner={owner}
                    onClose={() => setOpen(false)}
                />
            )}
        </section>
    )
}
